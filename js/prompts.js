import {loadJson,initI18n,renderNav,setYear} from "./core.js";
import {GUILD_UI,detectGuildLanguage,normalizeXHandle,buildGuildPrompt} from "./guild-card.mjs";
import {PAGE_UI} from "./prompt-page-l10n.mjs";

const BASE="../";
const collection=document.querySelector("#prompt-grid");
const counter=document.querySelector("#prompt-count");
const status=document.querySelector("#prompt-status");
const filters=document.querySelector("#prompt-categories");
const search=document.querySelector("#prompt-search");
const categories=new Set(["all","image","video","writing","game"]);
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
    button.textContent=kind.startsWith("guild") ? GUILD_UI[guildLanguage].copied : PAGE_UI[guildLanguage].copied;
    button.dataset.copied="true";
    announce(kind==="guild" ? GUILD_UI[guildLanguage].copySuccess : kind==="guild-url" ? GUILD_UI[guildLanguage].linkCopied : kind==="url" ? PAGE_UI[guildLanguage].linkSuccess : PAGE_UI[guildLanguage].copySuccess);
    setTimeout(()=>{button.textContent=kind.startsWith("guild") ? (kind==="guild-url" ? GUILD_UI[guildLanguage].link : GUILD_UI[guildLanguage].copy) : kind==="url" ? PAGE_UI[guildLanguage].link : PAGE_UI[guildLanguage].copy;delete button.dataset.copied;},2300);
  }catch{
    if(kind==="url"||kind==="guild-url"){
      announce(kind==="guild-url" ? GUILD_UI[guildLanguage].linkFail : PAGE_UI[guildLanguage].linkFail);
      const uri=new URL(prompt);
      location.hash=uri.hash;
    }else{
      announce(kind==="guild" ? GUILD_UI[guildLanguage].copyFail : PAGE_UI[guildLanguage].copyFail);
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
    image.alt=(guildLanguage==="ko" ? preview.label : (guildLanguage==="ja" ? "参考画像" : "Reference image"))+": "+(item.id==="pixel-guild-card" ? GUILD_UI[guildLanguage].title : PAGE_UI[guildLanguage].cardLabels[item.id]?.[0] || item.title);
    image.loading="lazy";
    image.decoding="async";
    box.appendChild(image);
  }else if(preview?.type==="text"){
    const sample=element("div","prompt-text-sample");
    const lines = guildLanguage==="en" ? ["An X post worth saving","• A specific insight","• Why it matters","• What to try next"] : guildLanguage==="ja" ? ["保存したくなるX投稿","・具体的な発見","・役立つ理由","・次に試すこと"] : preview.lines||[];
    for(const line of lines){
      sample.appendChild(element("p","",line));
    }
    box.appendChild(sample);
  }
  box.appendChild(element("span","prompt-preview-stamp",preview?.type==="text"?PAGE_UI[guildLanguage].previewText:PAGE_UI[guildLanguage].previewImage));
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
    button.addEventListener("click",()=>setPromptLanguage(lang,true));
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
  const ui=PAGE_UI[guildLanguage];
  const localized=ui.cardLabels[item.id];
  meta.appendChild(element("span","prompt-card-category",ui.categories[item.category]||item.category));
  const tool=element("span","prompt-card-tool",localized?.[2]||item.tool);
  meta.appendChild(tool);
  body.appendChild(meta);
  const title=element("h3","",localized?.[0]||item.title);
  const description=element("p","prompt-card-summary",localized?.[1]||item.summary);
  const note=element("p","prompt-preview-note",localized?.[3]||item.preview.note);
  body.append(title,description,note);
  if(item.preview.sourceUrl && /^https:\/\/(www\.)?youtube\.com\//.test(item.preview.sourceUrl)){
    const source=element("a","prompt-preview-source",guildLanguage==="ko"?(item.preview.sourceLabel||"제작 영상 보기 ↗"):(guildLanguage==="ja"?"制作動画を見る ↗":"Watch published video ↗"));
    source.href=item.preview.sourceUrl;
    source.target="_blank";
    source.rel="noopener noreferrer";
    body.appendChild(source);
  }
  const tags=element("div","prompt-card-tags");
  for(const tag of (item.id==="pixel-guild-card"?ui.guildTags:localized?.[4]||item.tags||[])){
    tags.appendChild(element("span","",tag));
  }
  body.appendChild(tags);

  const actions=element("div","prompt-card-actions");
  const copy=element("button","prompt-card-copy",ui.copy);
  copy.type="button";
  copy.setAttribute("aria-label",ui.copy+": "+title.textContent);
  copy.addEventListener("click",()=>{
    if(item.id==="pixel-guild-card"){
      if(!normalizeXHandle(guildHandle))return;
      copyPrompt(buildGuildPrompt(item.prompt,guildHandle,guildLanguage),copy,"guild");
    }else copyPrompt(item.prompt,copy);
  });
  actions.appendChild(copy);
  const link=element("button","prompt-card-permalink",ui.link);
  link.type="button";
  link.title=ui.link;
  link.setAttribute("aria-label",ui.link+": "+title.textContent);
  link.addEventListener("click",()=>{
    const uri=new URL("#"+item.id,location.href).href;
    copyPrompt(uri,link,item.id==="pixel-guild-card" ? "guild-url" : "url");
  });
  actions.appendChild(link);
  body.appendChild(actions);

  const details=document.createElement("details");
  details.className="prompt-card-details";
  const summary=element("summary","",ui.details);
  details.appendChild(summary);
  const code=element("pre","prompt-card-full");
  code.appendChild(element("code","",item.prompt));
  details.appendChild(code);
  if(item.id!=="pixel-guild-card"&&ui.untranslated){
    details.appendChild(element("p","prompt-original-language-note",ui.untranslated));
  }
  if(item.id==="pixel-guild-card"){
    const stamp=preview.querySelector(".prompt-preview-stamp");
    body.insertBefore(guildControls(item,card,copy,link,details,code,title,description,tool,note,stamp),actions);
  }
  body.appendChild(details);

  card.appendChild(body);
  return card;
}


function applyPageLanguage(){
  const ui=PAGE_UI[guildLanguage];
  document.documentElement.lang=guildLanguage;
  document.title=(guildLanguage==="ko"?"이미지·영상·글쓰기·게임 제작 프롬프트":guildLanguage==="en"?"AI prompts for images, video, writing and games":"画像・動画・文章・ゲーム制作のAIプロンプト")+" | TUKI PROMPT BOX";
  const description=document.querySelector('meta[name="description"]');
  if(description)description.content=ui.heroLead;
  document.querySelectorAll("#main-nav a").forEach((a,i)=>{if(ui.nav[i])a.textContent=ui.nav[i];});
  const text=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
  text(".prompt-box-tagline",ui.heroTagline);
  text(".prompt-box-lead",ui.heroLead);
  document.querySelectorAll(".prompt-box-meta span").forEach((el,i)=>{if(ui.heroMeta[i])el.textContent=ui.heroMeta[i];});
  text(".prompt-box-heading h2",ui.collectionTitle);
  text(".prompt-box-heading > p",ui.collectionInfo);
  text(".prompt-box-loading",ui.loading);
  text(".prompt-box-guide h2",ui.guideTitle);
  const guide=document.querySelectorAll(".prompt-box-guide p:not(.eyebrow)");
  if(guide[0])guide[0].textContent=ui.guideOne;
  if(guide[1])guide[1].textContent=ui.guideTwo;
  const jump=document.querySelector(".prompt-box-jump");
  if(jump)jump.textContent=ui.jump;
  search.placeholder=ui.searchPlaceholder;
  search.setAttribute("aria-label",ui.searchLabel);
  filters.setAttribute("aria-label",ui.categoryLabel);
  filters.querySelectorAll("[data-category]").forEach(button=>button.textContent=ui.categories[button.dataset.category]);
  document.querySelectorAll(".language-switch [data-language]").forEach(button=>{
    const active=button.dataset.language===guildLanguage;
    button.classList.toggle("is-active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  document.querySelector(".language-switch")?.setAttribute("aria-label",ui.categoryLabel==="Choose prompt category"?"Language":"언어 / Language / 言語");
}

function setPromptLanguage(next,focusGuild=false){
  if(!PAGE_UI[next]||next===guildLanguage)return;
  guildLanguage=next;
  applyPageLanguage();
  render();
  if(focusGuild)document.querySelector("#guild-x-handle")?.scrollIntoView({block:"center"});
}

function setupPageLanguageSelector(){
  const switcher=document.querySelector(".language-switch");
  if(!switcher)return;
  const buttons=[["ko","한국어"],["en","English"],["ja","日本語"]].map(([lang,label])=>{
    const button=element("button","",label);
    button.type="button";
    button.dataset.language=lang;
    button.addEventListener("click",()=>setPromptLanguage(lang));
    return button;
  });
  switcher.replaceChildren(...buttons);
  switcher.setAttribute("role","group");
}

function render(){
  const matching=prompts.filter(item=>{
    const inCategory=selected==="all"||item.category===selected;
    const searchable=[item.title,item.summary,item.category,item.tool,...(item.tags||[]),...Object.values(PAGE_UI).flatMap(ui=>[ui.cardLabels[item.id]?.[0],ui.cardLabels[item.id]?.[1],...(ui.cardLabels[item.id]?.[4]||[])]),...Object.values(GUILD_UI).map(ui=>ui.title)].filter(Boolean).join(" ").toLocaleLowerCase();
    return inCategory&&searchable.includes(searchTerm);
  });
  const fragment=document.createDocumentFragment();
  matching.forEach(item=>fragment.appendChild(cardFor(item)));
  collection.replaceChildren(fragment);
  if(!matching.length){
    collection.appendChild(element("p","prompt-empty",PAGE_UI[guildLanguage].empty));
  }
  counter.textContent=PAGE_UI[guildLanguage].count(prompts.length,matching.length);
  filters.querySelectorAll("[data-category]").forEach(button=>{
    button.textContent=PAGE_UI[guildLanguage].categories[button.dataset.category]||button.textContent;
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

  setupPageLanguageSelector();
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
  applyPageLanguage();
  render();
  scrollToDeepLink();
}
boot().catch(error=>{
  console.error("Prompt box load failed",error);
  collection.replaceChildren(element("p","prompt-empty",PAGE_UI[guildLanguage].failLoad));
  counter.textContent=PAGE_UI[guildLanguage].failCount;
});
