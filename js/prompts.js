import {loadJson,initI18n,renderNav,setYear,getLanguage} from "./core.js";
import {CARD_LOCALES,normalizeXHandle,resolveCardLanguage,buildAdventurerPrompt} from "./adventurer-id.mjs";

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
const adventurerState={language:resolveCardLanguage(navigator.language),handle:""};

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

async function copyPrompt(prompt,button,kind="prompt",language=null){
  const locale=language&&CARD_LOCALES[language];
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
    button.textContent=locale?.copied || "복사 완료 ✓";
    button.dataset.copied="true";
    announce(kind==="url" ? (locale?.linkCopied||"공유 링크가 복사됐어요. X 게시물에 붙여넣어 보세요.") : (locale?.success||"프롬프트가 복사됐어요. 필요한 부분만 바꿔서 사용하세요."));
    setTimeout(()=>{button.textContent=original;delete button.dataset.copied;},2300);
  }catch{
    if(kind==="url"){
      announce("자동 링크 복사가 제한됐어요. 주소창의 링크를 직접 복사해 주세요.");
      const uri=new URL(prompt);
      location.hash=uri.hash;
    }else{
      announce("자동 복사를 사용할 수 없어요. '프롬프트 내용 확인하기'에서 직접 선택해 복사해 주세요.");
      button.closest(".prompt-card")?.querySelector("details")?.setAttribute("open","");
    }
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

  // Only the Adventurer ID card accepts a handle. The image is attached
  // later in the AI chat, never transmitted or stored by this website.
  const isAdventurer=item.id==="pixel-guild-card";
  let cardPrompt=item.prompt;
  let refreshAdventurer=()=>{};
  let updateDetails=()=>{};
  let handleFeedback;
  if(isAdventurer){
    const panel=element("section","prompt-adventurer-form");
    panel.setAttribute("aria-label","Adventurer ID / 冒険者登録証 / 탐험가 등록증");

    const intro=element("p","prompt-adventurer-intro");
    panel.appendChild(intro);

    const langLabel=element("span","prompt-adventurer-label");
    langLabel.id="adventurer-language-label";
    panel.appendChild(langLabel);

    const langTabs=element("div","prompt-adventurer-languages");
    langTabs.setAttribute("role","group");
    langTabs.setAttribute("aria-labelledby",langLabel.id);
    const langButtons=new Map();
    for(const [lang,display] of [["KO","한국어"],["EN","English"],["JA","日本語"]]){
      const btn=element("button","",display);
      btn.type="button";
      btn.dataset.lang=lang;
      btn.setAttribute("aria-pressed",String(lang===adventurerState.language));
      btn.addEventListener("click",()=>{
        adventurerState.language=lang;
        refreshAdventurer(updateDetails);
      });
      langButtons.set(lang,btn);
      langTabs.appendChild(btn);
    }
    panel.appendChild(langTabs);

    const handleLabel=element("label","prompt-adventurer-label");
    const handleId="adventurer-x-handle";
    handleLabel.htmlFor=handleId;
    panel.appendChild(handleLabel);

    const input=element("input","prompt-adventurer-handle");
    input.id=handleId;
    input.type="text";
    input.autocomplete="off";
    input.spellcheck=false;
    input.maxLength=16; // Optional @ plus the 15-character maximum X username.
    input.value=adventurerState.handle;
    panel.appendChild(input);

    handleFeedback=element("p","prompt-adventurer-feedback");
    handleFeedback.setAttribute("role","status");
    handleFeedback.setAttribute("aria-live","polite");
    panel.appendChild(handleFeedback);

    const imageNotice=element("p","prompt-adventurer-photo-note");
    panel.appendChild(imageNotice);

    const localizedSummary=body.querySelector(".prompt-card-summary");
    const localizedTitle=body.querySelector("h3");

    refreshAdventurer=(updateCode)=>{
      const t=CARD_LOCALES[adventurerState.language];
      panel.lang=t.htmlLang;
      localizedTitle.textContent=t.title;
      localizedSummary.textContent=t.summary;
      intro.textContent=t.intro;
      langLabel.textContent=t.languageLabel;
      handleLabel.textContent=t.handleLabel;
      input.placeholder=t.handlePlaceholder;
      input.setAttribute("aria-label",t.handleLabel);
      imageNotice.textContent=t.imageNotice;
      for(const [lang,btn] of langButtons){
        btn.setAttribute("aria-pressed",String(lang===adventurerState.language));
        btn.classList.toggle("is-active",lang===adventurerState.language);
      }
      const value=normalizeXHandle(adventurerState.handle);
      handleFeedback.textContent=value===null?t.invalid:"";
      input.setAttribute("aria-invalid",String(value===null));
      cardPrompt=buildAdventurerPrompt(item.prompt,{
        language:adventurerState.language,
        handle: value===null?"":adventurerState.handle
      });
      if(typeof updateCode==="function")updateCode(cardPrompt,t);
    };
    input.addEventListener("input",()=>{
      adventurerState.handle=input.value;
      refreshAdventurer(updateDetails);
    });
    body.appendChild(panel);
  }

  const actions=element("div","prompt-card-actions");
  const copy=element("button","prompt-card-copy","프롬프트 복사");
  copy.type="button";
  copy.setAttribute("aria-label",item.title+" 프롬프트 복사");
  copy.addEventListener("click",()=>{
    if(isAdventurer){
      const t=CARD_LOCALES[adventurerState.language];
      const handle=normalizeXHandle(adventurerState.handle);
      if(!handle){
        handleFeedback.textContent=handle===null?t.invalid:t.required;
        const input=body.querySelector(".prompt-adventurer-handle");
        input?.focus();
        announce(handle===null?t.invalid:t.required);
        return;
      }
    }
    copyPrompt(cardPrompt,copy,"prompt",isAdventurer?adventurerState.language:null);
  });
  actions.appendChild(copy);
  const link=element("button","prompt-card-permalink","링크 복사");
  link.type="button";
  link.title="X에 공유할 수 있는 이 프롬프트만의 링크 복사";
  link.setAttribute("aria-label",item.title+" 공유 링크 복사");
  link.addEventListener("click",()=>{
    const uri=new URL("#"+item.id,location.href).href;
    copyPrompt(uri,link,"url",isAdventurer?adventurerState.language:null);
  });
  actions.appendChild(link);
  body.appendChild(actions);

  const details=document.createElement("details");
  details.className="prompt-card-details";
  const summary=element("summary","","프롬프트 내용 확인하기");
  details.appendChild(summary);
  const code=element("pre","prompt-card-full");
  const codeText=element("code","",cardPrompt);
  code.appendChild(codeText);
  details.appendChild(code);
  body.appendChild(details);
  if(isAdventurer){
    const title=body.querySelector("h3");
    updateDetails=(prompt,t)=>{
      codeText.textContent=prompt;
      summary.textContent=t.details;
      copy.textContent=t.copy;
      copy.setAttribute("aria-label",t.copy);
      copy.lang=t.htmlLang;
      link.textContent=t.link;
      link.lang=t.htmlLang;
      link.setAttribute("aria-label",t.link);
      title.lang=t.htmlLang;
    };
    // Keep the input listener's closure updated after the details controls exist.
    refreshAdventurer(updateDetails);
  }

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
