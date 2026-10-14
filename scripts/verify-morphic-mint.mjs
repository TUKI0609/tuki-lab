import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
const nap=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),"morphic-mint-qa-"));
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
  const base="http://127.0.0.1:8765";
  const pages=["/","/projects/","/prompts/","/lab/","/about/","/activity/"];
  for(const pathname of pages){
    const url=base+pathname;
    await browse(url);
    await until(()=>read("getComputedStyle(document.body).backgroundColor==='rgb(0, 0, 0)'"),pathname+" mint styles");
    const state=await read("(()=>{const body=document.body,head=document.querySelector('.site-header'),style=document.querySelector('link[href$=\"morphic-mint.css\"]');return {body:body.classList.contains('morphic-mint-site'),background:getComputedStyle(body).backgroundColor,styleLoaded:!!style&&!!style.sheet,nav:document.querySelectorAll('#main-nav a').length,headerBg:getComputedStyle(head).backgroundColor,tracking:document.querySelectorAll('script[src*=\"googletagmanager.com\"]').length,overflow:document.documentElement.scrollWidth>innerWidth+2}})()");
    assert.equal(state.body,true,pathname+" opted into new theme");
    assert.equal(state.styleLoaded,true,pathname+" CSS loaded");
    assert.equal(state.background,"rgb(0, 0, 0)");
    assert.equal(state.nav,5,pathname+" navigation preserved");
    assert.equal(state.tracking,0,pathname+" GA4 before visitor opt-in");
    assert.equal(state.overflow,false,pathname+" horizontal overflow");
    console.log("PASS desktop "+pathname+" mint theme, five nav links and no unauthorized GA4");
  }
  await browse(base+"/");
  await until(()=>read("document.querySelector('#hero-project-next')&&document.querySelector('#hero-showcase-count')?.textContent?.trim()"),"hero carousel ready");
  const hero=await read("({title:getComputedStyle(document.querySelector('.hero-title span')).color,accent:getComputedStyle(document.querySelector('.hero-actions .btn.primary')).backgroundColor,initial:document.querySelector('#hero-showcase-count').textContent.trim(),next:!!document.querySelector('#hero-project-next')})");
  assert.equal(hero.title,"rgb(153, 153, 153)","Two-tone Morphic headline");
  assert.equal(hero.accent,"rgb(124, 229, 190)","A mint CTA");
  assert(hero.next,"Existing carousel still present");
  await read("document.querySelector('#hero-project-next').click()");
  await until(()=>read("document.querySelector('#hero-showcase-count').textContent.trim()!=="+JSON.stringify(hero.initial)),"existing project carousel next");
  await until(()=>read("document.querySelector('#home-project-shortcuts a')!=null"),"project shortcuts");
  console.log("PASS real homepage hero, mint CTA, carousel switch and project shortcuts");
  await browse(base+"/prompts/");
  await until(()=>read("document.querySelectorAll('.prompt-card').length>=3"),"prompt cards");
  await until(()=>read("[...document.querySelectorAll('.prompt-preview img')].every(i=>i.complete&&i.naturalWidth>0)"),"original prompt previews");
  assert.equal(await read("getComputedStyle(document.querySelector('.prompt-card-copy')).backgroundColor"),"rgb(124, 229, 190)");
  await read("document.querySelector('[data-category=\"image\"]').click()");
  assert.equal(await read("document.querySelectorAll('.prompt-card').length"),1,"Filter still works");
  console.log("PASS unchanged prompt JS filtering, real local images and new button style");
  await command("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const pathname of pages){
    await browse(base+pathname);
    const m=await read("(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,nav:[...document.querySelectorAll('#main-nav a')].filter(e=>getComputedStyle(e).display!=='none').length}))()");
    assert.equal(m.width,390);
    assert(m.doc<=392,"390px horizontal overflow "+pathname+" "+JSON.stringify(m));
    assert.equal(m.nav,5,pathname+" all navigation destinations visible");
    console.log("PASS 390px mobile "+pathname+" no overflow, five tabs visible");
  }
  console.log(JSON.stringify({A_mint:"PASS",siteRoutes:6,desktop:"PASS",mobile390:"PASS",carousel:"PASS",filters:"PASS",consentNoTracking:"PASS"}));
}finally{
  try{ws?.close()}catch{}
  chrome.kill("SIGTERM");
  await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:160});
}
