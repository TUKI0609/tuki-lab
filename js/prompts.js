import {loadJson,initI18n,renderNav,setYear} from "./core.js";
import {GUILD_UI,detectGuildLanguage,normalizeXHandle,buildGuildPrompt} from "./guild-card.mjs";

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
let guildHandle="";
let guildLanguage=detectGuildLanguage(navigator.languages || [navigator.language]);

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

async function copyPrompt(prompt,button,kind="prompt"){
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
    button.textContent=kind.startsWith("guild") ? GUILD_UI[guildLanguage].copied : "복사 완료 ✓";
    button.dataset.copied="true";
    announce(kind==="guild" ? GUILD_UI[guildLanguage].copySuccess : kind==="guild-url" ? GUILD_UI[guildLanguage].linkCopied : kind==="url" ? "공유 링크가 복사됐어요. X 게시물에 붙여넣어 보세요." : "프롬프트가 복사됐어요. 필요한 부분만 바꿔서 사용하세요.");
    setTimeout(()=>{button.textContent=kind.startsWith("guild") ? (kind==="guild-url" ? GUILD_UI[guildLanguage].link : GUILD_UI[guildLanguage].copy) : original;delete button.dataset.copied;},2300);
  }catch{
    if(kind==="url"||kind==="guild-url"){
      announce(kind==="guild-url" ? GUILD_UI[guildLanguage].linkFail : "자동 링크 복사가 제한됐어요. 주소창의 링크를 직접 복사해 주세요.");
      const uri=new URL(prompt);
      location.hash=uri.hash;
    }else{
      announce(kind==="guild" ? GUILD_UI[guildLanguage].copyFail : "자동 복사를 사용할 수 없어요. 프롬프트 내용 확인하기에서 직접 선택해 복사해 주세요.");
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

function guildControls(item,card,copy,link,details,code,title,description,tool,note,stamp){
  const panel=element("div","prompt-guild-controls");
  const headline=element("h4","prompt-guild-heading");
  const intro=element("p","prompt-guild-intro");
  panel.append(headline,intro);
  const handleLabel=element("label","prompt-guild-label");
  const input=element("input","prompt-guild-input");
  input.id="guild-x-handle";
  input.type="text";
  input.autocomplete="off";
  input.spellcheck=false;
  input.maxLength=16;
  input.value=guildHandle;
  handleLabel.htmlFor=input.id;
  panel.append(handleLabel,input);
  const validation=element("p","prompt-guild-validation");
  validation.setAttribute("aria-live","polite");
  panel.appendChild(validation);
  const languageLabel=element("p","prompt-guild-label");
  const languages=element("div","prompt-guild-languages");
  languages.setAttribute("role","group");
  const buttons=new Map();
  for(const [lang,label] of [["ko","한국어"],["en","English"],["ja","日本語"]]){
    const button=element("button","",label);
    button.type="button";
    button.dataset.cardLanguage=lang;
    button.addEventListener("click",()=>{
      guildLanguage=lang;
      refresh();
    });
    languages.appendChild(button);
    buttons.set(lang,button);
  }
  panel.append(languageLabel,languages);
  const imageHint=element("p","prompt-guild-hint");
  const browseHint=element("p","prompt-guild-hint");
  panel.append(imageHint,browseHint);

  function refresh(){
    const ui=GUILD_UI[guildLanguage];
    const handle=normalizeXHandle(guildHandle);
    card.lang=guildLanguage;
    title.textContent=ui.title;
    description.textContent=ui.summary;
    tool.textContent=ui.tool;
    note.textContent=ui.note;
    if(stamp)stamp.textContent=ui.previewLabel;
    headline.textContent=ui.heading;
    intro.textContent=ui.intro;
    handleLabel.textContent=ui.handle;
    input.placeholder=ui.placeholder;
    input.setAttribute("aria-label",ui.handle);
    languageLabel.textContent=ui.language;
    languages.setAttribute("aria-label",ui.language);
    for(const [lang,button] of buttons){
      button.setAttribute("aria-pressed",String(lang===guildLanguage));
      button.classList.toggle("is-active",lang===guildLanguage);
    }
    imageHint.textContent=ui.image;
    browseHint.textContent=ui.browsing;
    validation.textContent=handle ? ui.ready : guildHandle.trim() ? ui.invalid : "";
    validation.classList.toggle("is-error",!!guildHandle.trim()&&!handle);
    copy.disabled=!handle;
    copy.textContent=ui.copy;
    copy.setAttribute("aria-label",ui.copy);
    link.textContent=ui.link;
    link.setAttribute("aria-label",ui.link);
    details.querySelector("summary").textContent=ui.details;
    code.textContent=handle ? buildGuildPrompt(item.prompt,guildHandle,guildLanguage) : ui.preview;
  }
  input.addEventListener("input",()=>{
    guildHandle=input.value;
    refresh();
  });
  refresh();
  return panel;
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
  const tool=element("span","prompt-card-tool",item.tool);
  meta.appendChild(tool);
  body.appendChild(meta);
  const title=element("h3","",item.title);
  const description=element("p","prompt-card-summary",item.summary);
  const note=element("p","prompt-preview-note",item.preview.note);
  body.append(title,description,note);
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
  copy.addEventListener("click",()=>{
    if(item.id==="pixel-guild-card"){
      if(!normalizeXHandle(guildHandle))return;
      copyPrompt(buildGuildPrompt(item.prompt,guildHandle,guildLanguage),copy,"guild");
    }else copyPrompt(item.prompt,copy);
  });
  actions.appendChild(copy);
  const link=element("button","prompt-card-permalink","링크 복사");
  link.type="button";
  link.title="X에 공유할 수 있는 이 프롬프트만의 링크 복사";
  link.setAttribute("aria-label",item.title+" 공유 링크 복사");
  link.addEventListener("click",()=>{
    const uri=new URL("#"+item.id,location.href).href;
    copyPrompt(uri,link,item.id==="pixel-guild-card" ? "guild-url" : "url");
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
  if(item.id==="pixel-guild-card"){
    const stamp=preview.querySelector(".prompt-preview-stamp");
    body.insertBefore(guildControls(item,card,copy,link,details,code,title,description,tool,note,stamp),actions);
  }
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
