// Read-only production smoke test for PR #9. Chrome blocks GA outbound traffic,
// so simulated opt-ins never add real analytics events.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const site="https://tuki0609.github.io/tuki-lab/";
const slugs=["lutratide-evolution-growth-difference-2026-w41","momo-public-launch-2026-10-07","crypto-saga-battle-rebuild-2026-10","verse8-hands-on-2026-10"];
const projects=["crypto-saga","momo","lutratide-survivors","aevowake"];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),"tuki-production-test-"));
const bin=process.env.CHROME_BIN||"/usr/bin/google-chrome";
const chrome=spawn(bin,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--disable-background-networking","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
let socket;const pending=new Map();let nextId=1;
function cmd(method,params={}){
  const id=nextId++;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout: "+method));},12000);
    pending.set(id,{resolve,reject,timeout});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const result=await cmd("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error("Browser script failed: "+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
}
async function waitFor(getter,label,ms=28000){
  const deadline=Date.now()+ms;let lastError;
  while(Date.now()<deadline){
    try{const result=await getter();if(result)return result;}catch(e){lastError=e;}
    await pause(230);
  }
  throw Error("Timed out "+label+" "+String(lastError?.message||""));
}
async function navigate(path){
  const url=new URL(path,site);url.searchParams.set("_audit",process.env.GITHUB_RUN_ID||"manual");
  await cmd("Page.navigate",{url:url.href});
  await waitFor(()=>evaluate("location.pathname==="+JSON.stringify(url.pathname)+" && document.readyState==='complete'"),"navigating "+url.pathname);
}
async function viewport(width,height){
  await cmd("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<600});
}
const auditState="({stored:localStorage.getItem('tuki-world-analytics-consent-v1'),scripts:document.querySelectorAll('script[src*=\"googletagmanager.com/gtag/js\"]').length,started:!!window.__tukiAnalyticsStarted,hasBanner:!!document.querySelector('.tuki-privacy-banner'),hasAccept:!!document.querySelector('[data-tuki-consent=\"accepted\"]'),hasReject:!!document.querySelector('[data-tuki-consent=\"rejected\"]'),hasPrivacy:!!document.querySelector('footer a[href*=\"/privacy/\"]')})";
try{
  let port;
  for(let i=0;i<100;i++){
    try{port=Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]);if(port)break;}catch{}
    if(chrome.exitCode!==null)throw Error("Chrome exited "+chrome.exitCode);
    await pause(150);
  }
  assert(port,"Chrome debugger did not start");
  const tabs=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
  const page=tabs.find(x=>x.type==="page");
  assert(page?.webSocketDebuggerUrl,"No CDP page target");
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{
    const data=JSON.parse(event.data),task=pending.get(data.id);
    if(!task)return;
    clearTimeout(task.timeout);pending.delete(data.id);
    data.error?task.reject(Error(data.error.message)):task.resolve(data.result);
  };
  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Network.enable");
  await cmd("Network.setBlockedURLs",{urls:["*googletagmanager.com*","*google-analytics.com*","*analytics.google.com*"]});
  await viewport(1280,900);

  for(let i=0;i<slugs.length;i++){
    if(i>0)await evaluate("localStorage.removeItem('tuki-world-analytics-consent-v1')");
    await navigate("lab/posts/"+slugs[i]+"/");
    await waitFor(()=>evaluate("!!document.querySelector('.tuki-privacy-banner')"),"consent banner on "+slugs[i]);
    const state=await evaluate(auditState);
    assert.deepEqual(state,{stored:null,scripts:0,started:false,hasBanner:true,hasAccept:true,hasReject:true,hasPrivacy:true},"Pre-consent rule violation on "+slugs[i]);
    console.log("PASS LAB "+slugs[i]+": visible consent options, no GA script or analytics before consent");
    if(i===0){
      await evaluate("document.querySelector('[data-tuki-consent=\"accepted\"]').click()");
      await waitFor(async()=>((await evaluate(auditState)).scripts===1),"GA4 opted-in tag");
      const accepted=await evaluate(auditState);
      assert.equal(accepted.stored,"accepted");
      assert.equal(accepted.scripts,1);
      assert.equal(accepted.started,true);
      console.log("PASS opt-in: GA tag added exactly once; outbound tracking blocked");
    }
    if(i===1){
      await evaluate("document.querySelector('[data-tuki-consent=\"rejected\"]').click()");
      const rejected=await evaluate(auditState);
      assert.equal(rejected.stored,"rejected");
      assert.equal(rejected.scripts,0);
      assert.equal(rejected.started,false);
      await cmd("Page.reload",{ignoreCache:true});
      await waitFor(async()=>((await evaluate("document.readyState==='complete'"))),"rejected reload");
      const persisted=await evaluate(auditState);
      assert.equal(persisted.stored,"rejected");
      assert.equal(persisted.scripts,0);
      console.log("PASS opt-out: denied choice persists on reload, no GA tag");
    }
  }

  let successes=0;
  for(const [device,width,height] of [["desktop",1280,900],["mobile",390,844]]){
    await viewport(width,height);
    for(const project of projects){
      await navigate("projects/"+project+"/");
      const evidence=await waitFor(async()=>{
        const x=await evaluate("(() => {const images=[...document.querySelectorAll('.project-evidence-image img')]; return {length:images.length,ready:images.map(i=>i.dataset.loaded==='true'&&i.naturalWidth>0),urls:images.map(i=>i.currentSrc),text:document.body.innerText};})()");
        if(x.length!==3||!x.ready.every(Boolean))return null;
        return x;
      },project+" "+device+" decoded images");
      assert.equal(evidence.length,3);
      assert(evidence.urls.every(s=>s.startsWith(site)),"Evidence image not served from own site");
      assert(!evidence.urls.some(s=>s.includes("tuki-project-evidence.webp")),"Old broken sprite in use");
      const label=project==="lutratide-survivors"?"제작 영상 썸네일":"프로젝트 대표 이미지 · 실제 화면 아님";
      assert(evidence.text.includes(label),"Evidence caption mislabels provenance on "+project);
      successes+=evidence.length;
      console.log("PASS "+project+" "+device+": 3 decoded, locally hosted, accurately labeled images");
    }
  }
  assert.equal(successes,24);
  console.log(JSON.stringify({labPages:4,consentBeforeTracking:true,acceptFlow:"pass",rejectFlow:"pass",uniqueImages:12,renderedDecodedImagesAcrossDesktopMobile:24,result:"PASS"},null,2));
}finally{
  try{socket?.close();}catch{}
  chrome.kill("SIGTERM");
  await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:150});
}
