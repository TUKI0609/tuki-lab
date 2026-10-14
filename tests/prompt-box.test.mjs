import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {GUILD_UI,detectGuildLanguage,normalizeXHandle,buildGuildPrompt} from "../js/guild-card.mjs";
import {PAGE_UI} from "../js/prompt-page-l10n.mjs";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const data=JSON.parse(read("content/prompts.json"));
const site=JSON.parse(read("content/site.json"));
const i18n=JSON.parse(read("content/i18n.json"));

test("five curated templates have copyable text, unique URLs and honest previews",()=>{
  assert(data.prompts.length>=5);
  const ids=new Set();
  const categories=new Set(data.categories.map(x=>x.id));
  for(const p of data.prompts){
    assert.match(p.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert(!ids.has(p.id),"Duplicate prompt "+p.id);
    ids.add(p.id);
    assert(categories.has(p.category),"Unrecognized category "+p.category);
    assert(p.title.length>6 && p.summary.length>12);
    assert(!p.summary.includes("\n"),"Summary should be one line");
    assert(p.prompt.length>300 && p.prompt.includes("["),"Full usable prompt and customizable fields required");
    assert(p.preview && p.preview.note.length>20);
    if(p.preview.type==="image"){
      assert.match(p.preview.src,/^assets\/[a-z0-9/_-]+\.(?:svg|png|webp|jpg|jpeg)$/i);
      assert(existsSync(resolve(root,p.preview.src)),"Missing local first-party image "+p.preview.src);
      assert(/참고|실제|썸네일/.test(p.preview.note),"Clearly disclose preview provenance");
    }else{
      assert.equal(p.preview.type,"text");
      assert(Array.isArray(p.preview.lines) && p.preview.lines.length>0);
    }
    if(p.preview.sourceUrl) assert(p.preview.sourceUrl.startsWith("https://www.youtube.com/shorts/"));
  }
});
test("media upgrade staging cannot link nonexistent images and records verifiable provenance",()=>{
  const manifest=JSON.parse(read("assets/prompts/results/preview-manifest.json"));
  assert.equal(manifest.files.length,4);
  const ids=new Set();
  for(const item of manifest.files){
    assert(!ids.has(item.id));
    ids.add(item.id);
    assert.match(item.sha256,/^[a-f0-9]{64}$/);
    assert.match(item.filename,/^[a-z0-9-]+\.webp$/);
    assert(["prior_real_result","real_prior_video_frame","illustrative_ai_mockup"].includes(item.kind));
    assert(item.note.length>30 && item.label.length>10);
    const existing=data.prompts.find(p=>p.id===item.id);
    assert(existing,"Unknown prompt ID "+item.id);
    assert(!existing.preview.src?.includes("assets/prompts/results/") ||
      existsSync(resolve(root,existing.preview.src)), "Missing candidate referenced by live card");
  }
});
test("new navigation is linked from the home and all existing LAB pages",()=>{
  assert(site.navigation.some(x=>x.href==="./prompts/"&&x.i18n==="nav.prompts"));
  assert.equal(i18n.strings.ko["nav.prompts"],"프롬프트");
  assert.equal(i18n.strings.en["nav.prompts"],"Prompts");
  assert.match(read("index.html"),/href="\.\/prompts\/" data-i18n="hero\.prompts"/);
  assert.match(read("sitemap.xml"),/https:\/\/tuki0609\.github\.io\/tuki-lab\/prompts\/<\/loc>/);
  const posts=JSON.parse(read("content/lab-posts.json"));
  assert.equal(posts.length,4);
  for(const p of posts){
    assert.match(read("lab/posts/"+p.slug+"/index.html"),/href="\.\.\/\.\.\/\.\.\/prompts\/"/);
  }
  assert.match(read("scripts/build-lab-search-pages.mjs"),/href="\.\.\/\.\.\/\.\.\/prompts\/"/);
});
test("prompt page retains existing GA4 consent, canonical and semantic controls",()=>{
  const html=read("prompts/index.html");
  const js=read("js/prompts.js");
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/rel="canonical" href="https:\/\/tuki0609\.github\.io\/tuki-lab\/prompts\/"/);
  assert.match(html,/src="\.\.\/js\/prompts\.js"/);
  assert.match(html,/id="prompt-categories"/);
  assert.match(html,/id="prompt-search" type="search"/);
  assert.match(html,/id="prompt-grid"/);
  assert.match(html,/id="prompt-status" role="status"/);
  assert.match(js,/from "\.\/core\.js"/);
  assert.match(js,/navigator\.clipboard\?\.writeText/);
  assert.match(js,/document\.execCommand\("copy"\)/);
  assert.match(js,/scrollToDeepLink/);
  assert.match(js,/copyPrompt\(uri,link,item\.id==="pixel-guild-card"/);
  assert.match(js,/"guild-url" : "url"/);
  assert.doesNotMatch(js,/googletagmanager\.com|gtag\(/);
});


test("RPG card uses one safe core prompt with independently selected KO EN JA",()=>{
  const guild=data.prompts.find(p=>p.id==="pixel-guild-card");
  assert(guild && guild.prompt.includes("PUBLIC X ACTIVITY"));
  assert.match(guild.prompt,/Never invent X posts/);
  assert.match(guild.prompt,/guild name must be generated automatically/i);
  assert.match(guild.prompt,/exactly THREE/);
  assert.equal(detectGuildLanguage(["ko-KR","en-US"]),"ko");
  assert.equal(detectGuildLanguage(["ja-JP","ko-KR"]),"ja");
  assert.equal(detectGuildLanguage(["de-DE"]),"en");
  assert.equal(normalizeXHandle(" Ty_Tuki0609 "),"@Ty_Tuki0609");
  assert.equal(normalizeXHandle("@Ty_Tuki0609"),"@Ty_Tuki0609");
  assert.equal(normalizeXHandle("@bad-handle"),"");
  assert.equal(normalizeXHandle("@thishandleistoolong"),"");
  assert.equal(normalizeXHandle(""),"");
  const intro=["ko","en","ja"].map(lang=>{
    const text=buildGuildPrompt(guild.prompt,"Ty_Tuki0609",lang);
    assert(text.includes("X HANDLE: @Ty_Tuki0609"));
    assert(text.includes("CARD LANGUAGE: "+lang.toUpperCase()));
    assert(text.includes("X post language does not override"));
    assert(text.includes("Do not infer sensitive personal attributes"));
    assert(GUILD_UI[lang].heading && GUILD_UI[lang].image && GUILD_UI[lang].linkCopied);
    return text;
  });
  assert.equal(new Set(intro).size,3);
  assert.throws(()=>buildGuildPrompt(guild.prompt,"bad handle","en"));
  assert.throws(()=>buildGuildPrompt(guild.prompt,"@good","fr"));
  const ui=read("js/prompts.js");
  assert.match(ui,/from "\.\/guild-card\.mjs"/);
  assert.match(ui,/guildControls\(item,card,copy,link,details,code/);
  assert.match(ui,/copy\.disabled=!handle/);
  assert.match(ui,/setPromptLanguage\(lang,true\)/);
  assert.match(ui,/setPromptLanguage\(next,focusGuild=false\)/);
  assert.match(ui,/setupPageLanguageSelector\(\)/);
  assert.match(read("css/prompts.css"),/\.prompt-guild-languages/);
});


test("PROMPT BOX's entry path and all visible labels are localized",()=>{
  for(const lang of ["ko","en","ja"]){
    const ui=PAGE_UI[lang];
    assert.equal(ui.nav.length,5);
    assert(ui.heroLead.length>20);
    assert(ui.jump.length>4);
    assert.equal(Object.keys(ui.categories).length,5);
    assert.equal(Object.keys(ui.cardLabels).length,4);
    for(const p of data.prompts.filter(p=>p.id!=="pixel-guild-card")){
      const labels=ui.cardLabels[p.id];
      assert(labels && labels.length===5);
      assert(labels[0].length>4&&labels[1].length>10&&labels[3].length>10);
    }
    assert.equal(ui.guildTags.length,4);
  }
  assert.match(read("prompts/index.html"),/class="prompt-box-jump" href="#pixel-guild-card"/);
  const js=read("js/prompts.js");
  assert.match(js,/document\.documentElement\.lang=guildLanguage/);
  assert.match(js,/setPromptLanguage\(lang,true\)/);
  assert.match(js,/renderNav\(site,BASE\)/);
});
