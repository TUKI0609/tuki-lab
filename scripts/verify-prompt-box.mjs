import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),"prompt-qa-"));
const chrome=spawn(process.env.CHROME_BIN||"/usr/bin/google-chrome",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--disable-background-networking","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
let ws,seq=0;const pending=new Map();
function command(method,params={}){
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout "+method));},12000);
    pending.set(id,{resolve,reject,timeout});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function read(js){
  const r=await command("Runtime.evaluate",{expression:js,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error("JS Error: "+JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function until(fn,label){
  const end=Date.now()+26000;
  while(Date.now()<end){try{const r=await fn();if(r)return r}catch{}await nap(210)}
  throw Error("Timeout: "+label);
}
async function browse(url){
  await command("Page.navigate",{url});
  await until(()=>read("location.href.startsWith("+JSON.stringify(url)+")&&document.readyState==='complete'"),"navigation "+url);
}
try{
  let port;
  for(let i=0;i<100;i++){
    try{port=Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]);if(port)break}catch{}
    if(chrome.exitCode!==null)throw Error("Chrome exited: "+chrome.exitCode);
    await nap(130);
  }
  assert(port);
  const tabs=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
  ws=new WebSocket(tabs.find(x=>x.type==="page").webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=e=>{
    const d=JSON.parse(e.data),r=pending.get(d.id);
    if(!r)return;
    clearTimeout(r.timeout);pending.delete(d.id);
    d.error?r.reject(Error(d.error.message)):r.resolve(d.result);
  };
  await command("Page.enable");await command("Runtime.enable");await command("Network.enable");
  await command("Network.setBlockedURLs",{urls:["*googletagmanager.com*","*google-analytics.com*","*analytics.google.com*"]});
  await command("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await browse("http://127.0.0.1:8765/prompts/");
  await until(()=>read("document.querySelectorAll('.prompt-card').length===3"),"three published cards");
  const initial=await read("({cards:document.querySelectorAll('.prompt-card').length,nav:document.querySelectorAll('#main-nav a').length,copyButtons:document.querySelectorAll('.prompt-card-copy').length,consent:!!document.querySelector('.tuki-privacy-banner'),tracking:document.querySelectorAll('script[src*=\"googletagmanager.com\"]').length})");
  assert.deepEqual(initial,{cards:3,nav:5,copyButtons:3,consent:true,tracking:0});
  await until(()=>read("[...document.querySelectorAll('.prompt-preview img')].length===3&&[...document.querySelectorAll('.prompt-preview img')].every(i=>i.complete&&i.naturalWidth>0)"),"all three creator result previews to load");
  assert.equal(await read("[...document.querySelectorAll('.prompt-preview-note')].filter(p=>p.textContent.includes('실제')).length"),3);
  const resultPaths=await read("[...document.querySelectorAll('.prompt-preview img')].map(x=>new URL(x.currentSrc).pathname)");
  assert(resultPaths.some(s=>s.includes("guild-actual-output.avif")));
  assert(resultPaths.some(s=>s.includes("video-hailuo-real-frame.avif")));
  assert(resultPaths.some(s=>s.includes("w41-video-thumbnail.svg")));
  console.log("PASS: 3 actual creator-result previews decoded, no reference art or premature GA4 script");

  const ids={image:"pixel-guild-card",video:"consistent-character-video",game:"gameplay-update-short"};
  for(const [category,id] of Object.entries(ids)){
    await read("document.querySelector('[data-category=\""+category+"\"]').click()");
    assert.equal(await read("document.querySelectorAll('.prompt-card').length"),1);
    assert.equal(await read("document.querySelector('.prompt-card').id"),id);
    console.log("PASS category "+category+" shows only "+id);
  }
  await read("document.querySelector('[data-category=\"all\"]').click()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),3);
  assert.equal(await read("document.querySelectorAll('#prompt-categories button').length"),4);

  await read("(()=>{const e=document.querySelector('#prompt-search');e.value='북마크';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),0,"Archived writing is visible");
  await read("(()=>{const e=document.querySelector('#prompt-search');e.value='탐험가';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),1);
  assert.equal(await read("document.querySelector('.prompt-card').id"),"pixel-guild-card");
  await read("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.__copied=s}}})");
  await read("document.querySelector('.prompt-card-copy').click()");
  await until(()=>read("typeof window.__copied==='string'"),"clipboard copy");
  const copied=await read("({length:window.__copied.length,contents:window.__copied.includes('프로필 사진'),feedback:document.querySelector('.prompt-card-copy').textContent,status:document.querySelector('#prompt-status').textContent})");
  assert(copied.length>300&&copied.contents&&copied.feedback.includes("복사 완료")&&copied.status.includes("복사"));
  await read("document.querySelector('.prompt-card-permalink').click()");
  await until(()=>read("window.__copied?.includes('/prompts/#pixel-guild-card')"),"share link copy");
  assert(await read("window.__copied.startsWith('http://127.0.0.1:8765/prompts/#pixel-guild-card')"));
  console.log("PASS: archive hidden, search, full prompt copy and direct-link copy");

  await browse("http://127.0.0.1:8765/prompts/#consistent-character-video");
  await until(()=>read("document.querySelector('#consistent-character-video')?.classList.contains('prompt-card-highlight')"),"deep link");
  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await nap(330);
  const mob=await read("(()=>{const n=[...document.querySelectorAll('#main-nav a')];return {width:innerWidth,doc:document.documentElement.scrollWidth,visible:n.filter(x=>getComputedStyle(x).display!=='none').length,right:n.at(-1).getBoundingClientRect().right}})()");
  assert.equal(mob.width,390);
  assert(mob.doc<=392,"Horizontal overflow: "+JSON.stringify(mob));
  assert.equal(mob.visible,5);
  assert(mob.right<=392,"Last nav item clipped: "+JSON.stringify(mob));
  console.log("PASS: 390px mobile, five top navigation entries, no overflow");
  console.log(JSON.stringify({publicCards:3,categories:["all","image","video","game"],decodedImages:3,archivedCards:2,copy:"PASS",deepLink:"PASS",mobile:"PASS",consent:"PASS"}));
}finally{
  try{ws?.close()}catch{}
  chrome.kill("SIGTERM");
  await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:160});
}
