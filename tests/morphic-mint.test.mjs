import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const pages=["index.html","projects/index.html","prompts/index.html","lab/index.html","about/index.html","activity/index.html"];
const css=read("css/morphic-mint.css");
test("only explicitly opted-in top-level pages gain Morphic A styling; scripts untouched",()=>{
  for(const path of pages){
    const html=read(path);
    const relative=path==="index.html"?"css/morphic-mint.css":"../css/morphic-mint.css";
    assert(html.includes('href="'+relative+'"'),path+" does not import mint stylesheet");
    assert.match(html,/<body[^>]*class="[^"]*\bmorphic-mint-site\b/);
  }
  assert.equal(read("content/site.json").includes('"nav.prompts"'),true,"Original site navigation remains");
});
test("Morphic A uses mint, dark neutrals, two-tone headings and accessible interactive states",()=>{
  assert.match(css,/--accent:\s*#7ce5be/);
  assert.match(css,/background:\s*#000\s*!important/);
  assert.match(css,/\.hero-title span/);
  assert.match(css,/\.morphic-mint-site \:is\(a,button,input,summary\):focus-visible/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/@import|https?:\/\/|font-face|tracking|gtag\(/i);
});
test("consent-first and dynamic features remain wired through existing scripts",()=>{
  const homepage=read("index.html"),prompts=read("prompts/index.html");
  assert.match(homepage,/id="hero-project-next"/);
  assert.match(homepage,/id="home-project-shortcuts"/);
  assert.match(homepage,/src="js\/app\.js"/);
  assert.match(prompts,/id="prompt-categories"/);
  assert.match(prompts,/id="prompt-grid"/);
  assert.match(prompts,/src="\.\.\/js\/prompts\.js"/);
  assert.match(read("js/prompts.js"),/from "\.\/core\.js"/);
});
