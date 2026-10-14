import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),"adventurer-id-qa-"));
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
  await browse("http://127.0.0.1:8765/prompts/#pixel-guild-card");
  await until(()=>read("document.querySelectorAll('.prompt-card').length===5"),"all five prompt cards");
  await until(()=>read("document.querySelector('.prompt-adventurer-languages button')!=null"),"localized controls");
  assert.equal(await read("document.querySelectorAll('.prompt-adventurer-form').length"),1);
  assert.equal(await read("document.querySelectorAll('.prompt-adventurer-languages button').length"),3);
  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-adventurer-handle')?.value"),"");
  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-card-details code').textContent.includes('@YourUsername')"),true);
  await read("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async s=>{window.__copied=s}}})");
  await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
  await until(()=>read("document.querySelector('.prompt-adventurer-feedback').textContent.length>0"),"missing handle warning");
  assert.equal(await read("window.__copied===undefined"),true,"Never silently copy placeholder when handle absent");
  console.log("PASS: only explorer card has local handle form; missing handle cannot be copied");

  await read("(()=>{const e=document.querySelector('.prompt-adventurer-handle');e.value='@Ty_Tuki0609';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await read("document.querySelector('.prompt-adventurer-languages [data-lang=\"KO\"]').click()");
  await until(()=>read("document.querySelector('.prompt-adventurer-languages [data-lang=\"KO\"]').getAttribute('aria-pressed')==='true'"),"KO selected");
  assert.equal(await read("document.querySelector('#pixel-guild-card h3').textContent"),"도트 RPG 탐험가 등록증");
  assert.equal(await read("document.querySelector('#pixel-guild-card .prompt-card-details code').textContent.includes('CARD LANGUAGE: KO')"),true);
  await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
  await until(()=>read("window.__copied?.includes('CARD LANGUAGE: KO')"),"KO prompt copied");
  assert(await read("window.__copied.includes('X HANDLE: @Ty_Tuki0609')"));
  assert(await read("window.__copied.includes('Do NOT claim')"));
  console.log("PASS: KO interface and generated prompt with exact supplied X handle");

  await read("document.querySelector('.prompt-adventurer-languages [data-lang=\"EN\"]').click()");
  assert.equal(await read("document.querySelector('#pixel-guild-card h3').textContent"),"Pixel RPG Adventurer ID");
  await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
  await until(()=>read("window.__copied?.includes('CARD LANGUAGE: EN')"),"EN prompt copied");
  assert(await read("window.__copied.includes('X HANDLE: @Ty_Tuki0609')"));
  console.log("PASS: English UI changes copied prompt language independently of handle");

  await read("document.querySelector('.prompt-adventurer-languages [data-lang=\"JA\"]').click()");
  assert.equal(await read("document.querySelector('#pixel-guild-card h3').textContent"),"ドットRPG冒険者登録証");
  assert(await read("document.querySelector('.prompt-adventurer-photo-note').textContent.includes('生成AI')"));
  await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
  await until(()=>read("window.__copied?.includes('CARD LANGUAGE: JA')"),"JA prompt copied");
  assert(await read("window.__copied.includes('X HANDLE: @Ty_Tuki0609')"));
  console.log("PASS: JA interface, localized notices and full prompt copy");

  await read("(()=>{const e=document.querySelector('.prompt-adventurer-handle');e.value='@user; unexpected';e.dispatchEvent(new Event('input',{bubbles:true}))})()");
  assert.equal(await read("document.querySelector('.prompt-adventurer-handle').getAttribute('aria-invalid')"),"true");
  await read("window.__copied='UNCHANGED'");
  await read("document.querySelector('#pixel-guild-card .prompt-card-copy').click()");
  assert.equal(await read("window.__copied"),"UNCHANGED","Invalid handle accidentally copied");
  console.log("PASS: invalid X handle blocked without network access");
  
  await read("document.querySelector('[data-category=\"video\"]').click()");
  assert.equal(await read("document.querySelectorAll('.prompt-adventurer-form').length"),0);
  await read("document.querySelector('[data-category=\"all\"]').click()");
  await until(()=>read("document.querySelectorAll('.prompt-adventurer-form').length===1"),"form rerender");
  assert.equal(await read("document.querySelector('.prompt-adventurer-languages [data-lang=\"JA\"]').getAttribute('aria-pressed')"),"true");
  console.log("PASS: other cards unaffected and selection survives filtering");

  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browse("http://127.0.0.1:8765/prompts/#pixel-guild-card");
  await until(()=>read("document.querySelector('.prompt-adventurer-languages')!=null"),"mobile form");
  const m=await read("(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,nav:[...document.querySelectorAll('#main-nav a')].filter(e=>getComputedStyle(e).display!=='none').length,languages:[...document.querySelectorAll('.prompt-adventurer-languages button')].filter(e=>e.getBoundingClientRect().width>15).length}))()");
  assert.equal(m.width,390);
  assert(m.doc<=392,"mobile layout overflow "+JSON.stringify(m));
  assert.equal(m.nav,5);
  assert.equal(m.languages,3);
  console.log("PASS: 390px three-language form, five nav links and no horizontal overflow");
  console.log(JSON.stringify({adventurer:"PASS",languages:["KO","EN","JA"],inputValidation:"PASS",otherCards:"PASS",mobile:"PASS"}));
}finally{
  try{ws?.close()}catch{}
  chrome.kill("SIGTERM");
  await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:160});
}
