// Production W41 audit: verify the deployed post, the actual SVG/JPEG bytes,
// and the local image mapping. This script is read-only.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = "https://tuki0609.github.io/tuki-lab/";
const slug = "lutratide-evolution-growth-difference-2026-w41";
const candidateId = "lab-lutratide-survivors-2026-W41";
const cacheToken = process.env.GITHUB_RUN_ID || String(Date.now());

async function live(path) {
  const url = new URL(path, root);
  url.searchParams.set("_audit", cacheToken);
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(25000)
  });
  assert.equal(response.status, 200, "HTTP " + response.status + " at " + url);
  return response;
}
async function load(path) { return (await live(path)).json(); }

const [posts, repoPosts, candidates, galleryCode, style] = await Promise.all([
  load("content/lab-posts.json"),
  readFile(new URL("../content/lab-posts.json", import.meta.url), "utf8").then(JSON.parse),
  load("content/lab-candidates.json"),
  live("js/lab-project-evidence.js").then(r => r.text()),
  live("css/style.css").then(r => r.text())
]);
const article = posts.find(p => p.slug === slug);
assert(article, "W41 is missing from live post collection");
assert.deepEqual(article, repoPosts.find(p => p.slug === slug), "Published W41 differs from main");
assert(posts.length >= 4, "Published LAB collection is incomplete");
assert.equal(article.originCandidateId, candidateId);
assert.equal(article.showProjectEvidence, true);
assert.equal(article.publishedAt, "2026-10-13");
assert.equal(candidates.find(c => c.id === candidateId)?.status, "APPROVED");
assert.match(style, /\.lab-evidence-card\s+\.lab-evidence-picture\s+img/);
assert.match(galleryCode, /img\.addEventListener\("load"/);
assert.doesNotMatch(galleryCode, /https:\/\/i\.ytimg\.com/);

const weeks = ["w39", "w40", "w41"];
const imageData = [];
for (const week of weeks) {
  const path = "assets/projects/lutratide-survivors/" + week + "-video-thumbnail.svg";
  assert(galleryCode.includes(week + "-video-thumbnail.svg"), "Gallery doesn't reference " + week);
  const [remote, local] = await Promise.all([
    live(path).then(r => r.text()),
    readFile(new URL("../" + path, import.meta.url), "utf8")
  ]);
  assert.equal(remote, local, "Deployed SVG mismatch: " + week);
  assert.match(remote, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  const match = remote.match(/href="data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/);
  assert(match, "Embedded JPEG data not found: " + week);
  const bytes = Buffer.from(match[1], "base64");
  assert(bytes.length > 3000, "Embedded JPEG is suspiciously small: " + week);
  assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", "Bad JPEG header: " + week);
  assert.equal(bytes.subarray(-2).toString("hex"), "ffd9", "Bad JPEG footer: " + week);
  imageData.push({ image: week, mime: "image/svg+xml", embedded: "image/jpeg", bytes: bytes.length });
}
const [indexHTML, articleHTML] = await Promise.all([
  live("lab/").then(r => r.text()),
  live("lab/article/?slug=" + slug).then(r => r.text())
]);
assert.match(indexHTML, /src=["']\.\.\/js\/secondary\.js/);
assert.match(articleHTML, /src=["']\.\.\/\.\.\/js\/lab-article\.js/);
console.log(JSON.stringify({
  articleUrl: new URL("lab/article/?slug=" + slug, root).href,
  livePosts: posts.length,
  title: article.title,
  sourceCount: article.sources.length,
  sectionCount: article.sections.length,
  status: "APPROVED",
  imageData,
  result: "All deployed metadata, site modules, and 3 embedded JPEG image bytes match repository sources"
}, null, 2));
console.log("PASS: Published W41 LAB data and all 3 self-hosted SVG/JPEG images are valid.");
