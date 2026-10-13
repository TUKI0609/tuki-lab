// Read-only audit of published W41 LAB article and project screenshot sprite.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = "https://tuki0609.github.io/tuki-lab/";
const slug = "lutratide-evolution-growth-difference-2026-w41";
const candidateId = "lab-lutratide-survivors-2026-W41";
const token = process.env.GITHUB_RUN_ID || Date.now().toString();

async function live(path) {
  const url = new URL(path, root);
  url.searchParams.set("_verify", token);
  const result = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(25000)
  });
  assert.equal(result.status, 200, "HTTP " + result.status + " from " + url);
  return result;
}
async function json(path) { return (await live(path)).json(); }

const [published, localPosts, candidates, css, sprite] = await Promise.all([
  json("content/lab-posts.json"),
  readFile(new URL("../content/lab-posts.json", import.meta.url), "utf8").then(JSON.parse),
  json("content/lab-candidates.json"),
  live("css/style.css").then(r => r.text()),
  live("assets/projects/evidence/tuki-project-evidence.webp").then(r => r.arrayBuffer())
]);
const post = published.find(p => p.slug === slug);
const localPost = localPosts.find(p => p.slug === slug);
assert(post && localPost, "W41 LAB article not found");
assert.deepEqual(post, localPost, "Published W41 article differs from main");
assert.equal(published.length, 4, "Expected four live LAB articles");
assert.equal(post.originCandidateId, candidateId);
assert.equal(post.showProjectEvidence, true);
assert.equal(post.publishedAt, "2026-10-13");
assert.equal(candidates.find(c => c.id === candidateId)?.status, "APPROVED");
assert.match(css, /\.project-evidence-image\s*\{[\s\S]*?background-image:\s*url\(["']?\.\.\/assets\/projects\/evidence\/tuki-project-evidence\.webp/);
const bytes = new Uint8Array(sprite);
assert(bytes.length > 3000, "Sprite is missing or empty");
const signature = (from, to) => String.fromCharCode(...bytes.slice(from, to));
assert.equal(signature(0, 4), "RIFF");
assert.equal(signature(8, 12), "WEBP");
const [labIndex, articleHTML] = await Promise.all([
  live("lab/").then(r => r.text()),
  live("lab/article/?slug=" + slug).then(r => r.text())
]);
assert.match(labIndex, /src=["']\.\.\/js\/secondary\.js/);
assert.match(articleHTML, /src=["']\.\.\/\.\.\/js\/lab-article\.js/);
console.log(JSON.stringify({
  publicURL: new URL("lab/article/?slug=" + slug, root).href,
  totalPublished: published.length,
  title: post.title,
  date: post.publishedAt,
  candidateStatus: "APPROVED",
  sections: post.sections.length,
  imageSpriteBytes: bytes.length,
  sourceCount: post.sources.length,
  tests: "Live JSON matches main; project sprite is served as WebP; page routes exist"
}, null, 2));
console.log("PASS: W41 article, approval, CSS and actual game-image sprite are live.");
