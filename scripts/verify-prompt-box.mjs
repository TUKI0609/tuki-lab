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
  await until(()=>read("document.querySelectorAll('.prompt-card').length===5"),"five cards");
  const initial=await read("({cards:document.querySelectorAll('.prompt-card').length,nav:document.querySelectorAll('#main-nav a').length,copyButtons:document.querySelectorAll('.prompt-card-copy').length,consent:!!document.querySelector('.tuki-privacy-banner'),tracking:document.querySelectorAll('script[src*=\"googletagmanager.com\"]').length})");
  assert.deepEqual(initial,{cards:5,nav:5,copyButtons:5,consent:true,tracking:0});
  try{
    await until(()=>read("[...document.querySelectorAll('.prompt-preview img')].every(i=>i.complete&&i.naturalWidth>0)"),"preview image loading");
  }catch(error){
    const images=await read("[...document.querySelectorAll('.prompt-preview img')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth,height:i.naturalHeight}))");
    console.error("Image decode diagnostics:",JSON.stringify(images));
    throw error;
  }
  const expectedImages=(await(await fetch("http://127.0.0.1:8765/content/prompts.json")).json()).prompts.filter(p=>p.preview.type==="image").length;
  assert.equal(await read("document.querySelectorAll('.prompt-preview img').length"),expectedImages);
  assert.equal(await read("[...document.querySelectorAll('.prompt-preview-note')].filter(p=>p.textContent.includes('아닙니다')||p.textContent.includes('실제')).length>=2"),true);
  console.log("PASS: five cards, "+expectedImages+" decoded previews, honest source notes, consent-first setup");
  await read("document.querySelector('[data-category=\"video\"]').click()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),2);
  await read("document.querySelector('[data-category=\"all\"]').click()");
  await read("(()=>{const e=document.querySelector('#prompt-search');e.value='북마크';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),1);
  assert.equal(await read("document.querySelector('.prompt-card').id"),"bookmark-x-post");
  await read("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.__copied=s}}})");
  await read("document.querySelector('.prompt-card-copy').click()");
  await until(()=>read("typeof window.__copied==='string'"),"clipboard copy");
  const copied=await read("({length:window.__copied.length,contents:window.__copied.includes('주제:'),feedback:document.querySelector('.prompt-card-copy').textContent,status:document.querySelector('#prompt-status').textContent})");
  assert(copied.length>300&&copied.contents&&copied.feedback.includes("복사 완료")&&copied.status.includes("복사"));
  console.log("PASS: category filter, search, full text clipboard and visible feedback");
  await read("document.querySelector('.prompt-card-permalink').click()");
  await until(()=>read("window.__copied?.includes('/prompts/#bookmark-x-post')"),"per-prompt link copy");
  assert(await read("window.__copied.startsWith('http://127.0.0.1:8765/prompts/#bookmark-x-post')"));
  console.log("PASS: one-click copy of exact X-shareable prompt URL");
  await browse("http://127.0.0.1:8765/prompts/#pixel-guild-card");
  await until(()=>read("document.querySelector('#pixel-guild-card')?.classList.contains('prompt-card-highlight')"),"deep link");
  console.log("PASS: direct deep-link to one individual prompt");

  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-card-copy').disabled"),true);
  await read("(()=>{const i=document.querySelector('#guild-x-handle');i.value='bad handle!';i.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-card-copy').disabled"),true);
  await read("(()=>{const i=document.querySelector('#guild-x-handle');i.value='Ty_Tuki0609';i.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-card-copy').disabled"),false);
  await read("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.__copied=s}}})");
  for(const lang of ["ko","en","ja"]){
    await read("document.querySelector('#pixel-guild-card [data-card-language="+JSON.stringify(lang)+"]').click()");
    assert.equal(await read("document.querySelector('#pixel-guild-card').lang"),lang);
    assert.equal(await read("document.querySelector('#pixel-guild-card [data-card-language="+JSON.stringify(lang)+"]').getAttribute('aria-pressed')"),"true");
    await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
    await until(()=>read("window.__copied?.includes('CARD LANGUAGE: "+lang.toUpperCase()+"')"),"language copy "+lang);
    assert(await read("window.__copied.includes('X HANDLE: @Ty_Tuki0609')"));
    assert(await read("window.__copied.includes('Never invent X posts')"));
  }
  console.log("PASS: invalid handles blocked, browser-localized RPG card and three generated language variants");

  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await nap(330);
  const mob=await read("(()=>{const n=[...document.querySelectorAll('#main-nav a')];return {width:innerWidth,doc:document.documentElement.scrollWidth,visible:n.filter(x=>getComputedStyle(x).display!=='none').length,right:n.at(-1).getBoundingClientRect().right}})()");
  assert.equal(mob.width,390);
  assert(mob.doc<=392,"Horizontal overflow: "+JSON.stringify(mob));
  assert.equal(mob.visible,5);
  assert(mob.right<=392,"Last nav item clipped: "+JSON.stringify(mob));
  console.log("PASS: responsive 390px screen with all five tabs reachable and no overflow");
  console.log(JSON.stringify({cards:5,categories:5,search:"PASS",copy:"PASS",deepLink:"PASS",mobile:"PASS",images:"PASS",consent:"PASS"}));
}finally{
  try{ws?.close()}catch{}
  chrome.kill("SIGTERM");
  await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:160});
}
