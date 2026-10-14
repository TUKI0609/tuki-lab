import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";

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
  assert.match(js,/copyPrompt\(uri,link,"url"\)/);
  assert.doesNotMatch(js,/googletagmanager\.com|gtag\(/);
});
