import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=path.resolve(new URL("../",import.meta.url).pathname);
const contentOf=file=>fs.readFileSync(path.join(root,file),"utf8");
const posts=JSON.parse(contentOf("content/lab-posts.json"));
const projects=JSON.parse(contentOf("content/projects.json"));

test("four published static LAB posts import the common consent module once",()=>{
  assert.equal(posts.length,4);
  for(const post of posts){
    const html=contentOf("lab/posts/"+post.slug+"/index.html");
    assert.equal((html.match(/<script type="module" src="\.\.\/\.\.\/\.\.\/js\/core\.js"><\/script>/g)||[]).length,1,post.slug);
    assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.match(html,/<a href="\.\.\/\.\.\/" class="lab-static-back">/);
    assert.match(html,/<link rel="canonical"/);
    assert.doesNotMatch(html,/googletagmanager\.com|gtag\(/);
  }
});

test("GA4 behavior is still sourced from the shared consent-first module",()=>{
  const code=contentOf("js/core.js");
  assert.match(code,/const TUKI_GA_ID = "G-Q6JMT9XLVP"/);
  assert.match(code,/const TUKI_ANALYTICS_CHOICE = "tuki-world-analytics-consent-v1"/);
  assert.match(code,/if \(stored === "accepted"\) startTukiAnalytics\(\)/);
  assert.match(code,/data-tuki-consent="accepted"/);
  assert.match(code,/data-tuki-consent="rejected"/);
  assert.match(code,/if \(choice === "accepted"\) startTukiAnalytics\(\)/);
  assert.match(code,/analytics_storage: "denied"/);
  assert.match(code,/window\.gtag\("config", TUKI_GA_ID/);
});

test("future LAB build command retains consent on every generated static article",()=>{
  const generator=contentOf("scripts/build-lab-search-pages.mjs");
  assert.match(generator,/<script type="module" src="\.\.\/\.\.\/\.\.\/js\/core\.js"><\/script>/);
});

test("project evidence maps honest local image provenance rather than invalid sprite",()=>{
  const js=contentOf("js/project-detail.js");
  const css=contentOf("css/style.css");
  assert.equal(projects.filter(p=>p.evidence?.length).length,4);
  assert.match(js,/const verifiedVideoThumbnails/);
  assert.match(js,/const artworkForProject/);
  assert.match(js,/프로젝트 대표 이미지 · 실제 화면 아님/);
  assert.match(js,/제작 영상 썸네일/);
  assert.match(js,/img\.dataset\.loaded/);
  assert.doesNotMatch(js,/--evidence-x|--evidence-y/);
  assert.doesNotMatch(css,/background-image: url\("\.\.\/assets\/projects\/evidence\/tuki-project-evidence\.webp"\)/);
  for (const image of [
    "assets/projects/lutratide-survivors/w39-video-thumbnail.svg",
    "assets/projects/lutratide-survivors/w40-video-thumbnail.svg",
    "assets/projects/lutratide-survivors/w41-video-thumbnail.svg",
    "assets/projects/crypto-saga/preview.svg",
    "assets/brand/tuki/world-momo.svg",
    "assets/brand/tuki/world-aevowake.svg"
  ]) {
    const s=contentOf(image);
    assert.match(s,/<svg[\s>]/,image);
    assert(s.length>500,image);
  }
});
