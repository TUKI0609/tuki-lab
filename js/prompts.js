import {loadJson,initI18n,renderNav,setYear,getLanguage} from "./core.js";

const BASE="../";
const collection=document.querySelector("#prompt-grid");
const counter=document.querySelector("#prompt-count");
const status=document.querySelector("#prompt-status");
const filters=document.querySelector("#prompt-categories");
const search=document.querySelector("#prompt-search");
const categories=new Map([
  ["all","전체"],["image","이미지"],["video","영상"],
  ["writing","글쓰기"],["game","게임 제작"]
]);
let prompts=[];
let selected="all";
let searchTerm="";
let statusTimeout;

function element(name,className,content){
  const el=document.createElement(name);
  if(className)el.className=className;
  if(content!==undefined)el.textContent=String(content);
  return el;
}
function announce(message){
  status.textContent=message;
  clearTimeout(statusTimeout);
  statusTimeout=setTimeout(()=>{status.textContent="";},3500);
}

async function copyPrompt(prompt,button){
  const original=button.textContent;
  try{
    if(navigator.clipboard?.writeText && window.isSecureContext){
      await navigator.clipboard.writeText(prompt);
    }else{
      const field=document.createElement("textarea");
      field.value=prompt;
      field.setAttribute("aria-hidden","true");
      field.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(field);
      field.focus();
      field.select();
      const copied=document.execCommand("copy");
      field.remove();
      if(!copied)throw new Error("Clipboard permission unavailable");
    }
    button.textContent="복사 완료 ✓";
    button.dataset.copied="true";
    announce("프롬프트가 복사됐어요. 필요한 부분만 바꿔서 사용하세요.");
    setTimeout(()=>{button.textContent=original;delete button.dataset.copied;},2300);
  }catch{
    announce("자동 복사를 사용할 수 없어요. '프롬프트 펼치기'에서 직접 선택해 복사해 주세요.");
    button.closest(".prompt-card")?.querySelector("details")?.setAttribute("open","");
  }
}
function previewFor(item){
  const box=element("div","prompt-preview");
  const preview=item.preview;
  if(preview?.type==="image" && /^assets\/[a-z0-9/_-]+\.(svg|png|jpe?g|webp)$/i.test(preview.src)){
    const image=document.createElement("img");
    image.src=new URL("../"+preview.src,import.meta.url).href;
    image.alt=preview.label || item.title+"의 참고 이미지";
    image.loading="lazy";
    image.decoding="async";
    box.appendChild(image);
  }else if(preview?.type==="text"){
    const sample=element("div","prompt-text-sample");
    for(const line of (preview.lines||[])){
      sample.appendChild(element("p","",line));
    }
    box.appendChild(sample);
  }
  box.appendChild(element("span","prompt-preview-stamp",preview?.type==="text"?"구성 미리보기":"이미지 미리보기"));
  return box;
}

function cardFor(item){
  const card=element("article","prompt-card");
  card.id=item.id;
  card.dataset.category=item.category;
  const preview=previewFor(item);
  card.appendChild(preview);
  const body=element("div","prompt-card-body");
  const meta=element("div","prompt-card-meta");
  meta.appendChild(element("span","prompt-card-category",categories.get(item.category)||item.category));
  meta.appendChild(element("span","prompt-card-tool",item.tool));
  body.appendChild(meta);
  body.appendChild(element("h3","",item.title));
  body.appendChild(element("p","prompt-card-summary",item.summary));
  body.appendChild(element("p","prompt-preview-note",item.preview.note));
  if(item.preview.sourceUrl && /^https:\/\/(www\.)?youtube\.com\//.test(item.preview.sourceUrl)){
    const source=element("a","prompt-preview-source",item.preview.sourceLabel||"제작 영상 보기 ↗");
    source.href=item.preview.sourceUrl;
    source.target="_blank";
    source.rel="noopener noreferrer";
    body.appendChild(source);
  }
  const tags=element("div","prompt-card-tags");
  for(const tag of item.tags||[]){
    tags.appendChild(element("span","",tag));
  }
  body.appendChild(tags);

  const actions=element("div","prompt-card-actions");
  const copy=element("button","prompt-card-copy","프롬프트 복사");
  copy.type="button";
  copy.setAttribute("aria-label",item.title+" 프롬프트 복사");
  copy.addEventListener("click",()=>copyPrompt(item.prompt,copy));
  actions.appendChild(copy);
  const link=element("a","prompt-card-permalink","링크 공유 ↗");
  link.href="#"+item.id;
  link.title="이 프롬프트의 주소로 이동";
  link.addEventListener("click",()=>{
    const absolute=new URL(link.getAttribute("href"),location.href).href;
    // Clicking the anchor stays on-site; the address may be shared on X.
    announce("주소창의 링크를 공유하면 이 프롬프트로 바로 연결돼요.");
    history.replaceState(null,"",absolute);
  });
  actions.appendChild(link);
  body.appendChild(actions);

  const details=document.createElement("details");
  details.className="prompt-card-details";
  const summary=element("summary","","프롬프트 내용 확인하기");
  details.appendChild(summary);
  const code=element("pre","prompt-card-full");
  code.appendChild(element("code","",item.prompt));
  details.appendChild(code);
  body.appendChild(details);

  card.appendChild(body);
  return card;
}

function render(){
  const matching=prompts.filter(item=>{
    const inCategory=selected==="all"||item.category===selected;
    const searchable=[item.title,item.summary,item.category,item.tool,...(item.tags||[])].join(" ").toLocaleLowerCase();
    return inCategory&&searchable.includes(searchTerm);
  });
  const fragment=document.createDocumentFragment();
  matching.forEach(item=>fragment.appendChild(cardFor(item)));
  collection.replaceChildren(fragment);
  if(!matching.length){
    collection.appendChild(element("p","prompt-empty","찾는 프롬프트가 없어요. 다른 검색어 또는 분야를 선택해 주세요."));
  }
  counter.textContent="모두 "+prompts.length+"개 · 현재 "+matching.length+"개 표시";
  filters.querySelectorAll("[data-category]").forEach(button=>{
    const active=button.dataset.category===selected;
    button.setAttribute("aria-pressed",String(active));
    button.classList.toggle("is-active",active);
  });
}
function scrollToDeepLink(){
  const target=decodeURIComponent(location.hash.slice(1));
  if(target&&prompts.some(p=>p.id===target)){
    if(selected!=="all"||searchTerm){
      selected="all";searchTerm="";search.value="";render();
    }
    const card=document.getElementById(target);
    card?.scrollIntoView({block:"start"});
    if(card)card.classList.add("prompt-card-highlight");
  }
}
async function boot(){
  await initI18n(BASE);
  const site=await loadJson(BASE+"content/site.json");
  renderNav(site,BASE);
  setYear();
  const nav=document.querySelector('#main-nav a[href$="/prompts/"]');
  if(nav)nav.setAttribute("aria-current","page");

  const data=await loadJson(BASE+"content/prompts.json");
  if(!data||!Array.isArray(data.prompts))throw new Error("Prompt collection unavailable");
  prompts=data.prompts.filter(item=>item&&/^[a-z0-9-]+$/.test(item.id)&&categories.has(item.category)&&typeof item.prompt==="string");
  filters.addEventListener("click",event=>{
    const btn=event.target.closest("button[data-category]");
    if(!btn||!filters.contains(btn))return;
    selected=btn.dataset.category;
    render();
  });
  search.addEventListener("input",()=>{searchTerm=search.value.trim().toLocaleLowerCase();render();});
  window.addEventListener("hashchange",scrollToDeepLink);
  render();
  scrollToDeepLink();
}
boot().catch(error=>{
  console.error("Prompt box load failed",error);
  collection.replaceChildren(element("p","prompt-empty","프롬프트를 불러오지 못했어요. 잠시 후 새로고침해 주세요."));
  counter.textContent="일시적으로 불러올 수 없습니다.";
});
