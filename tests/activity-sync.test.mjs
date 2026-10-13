import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const original = fileURLToPath(new URL("../scripts/sync-activity.mjs", import.meta.url));
const cached = [
  { id:"old-ai", source:"naver-ai", sourceLabel:"AI", title:"내가 직접 만든 게임", summary:"제작 글", url:"https://blog.naver.com/a/1", publishedAt:"2026-10-09T00:00:00Z", detectedAt:"2026-10-09T01:00:00Z", manual:false },
  { id:"old-game", source:"naver-game", sourceLabel:"Game", title:"old news", summary:"", url:"https://blog.naver.com/b/2", publishedAt:"2026-10-09T00:00:00Z", detectedAt:"2026-10-09T01:00:00Z", manual:false }
];

function makeFixture({ raw = cached, scenario = "one-fails" } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "tuki-rss-test-"));
  for (const folder of ["scripts", "content", "automation"]) mkdirSync(path.join(root, folder));
  copyFileSync(original, path.join(root, "scripts/sync-activity.mjs"));
  writeFileSync(path.join(root, "automation/sources.json"), JSON.stringify({ sources: [
    { id:"naver-ai", label:"AI", kind:"naver-rss", url:"https://mock.invalid/ai", enabled:true },
    { id:"naver-game", label:"Game", kind:"naver-rss", url:"https://mock.invalid/game", enabled:true }
  ] }));
  writeFileSync(path.join(root, "automation/editorial-rules.json"), JSON.stringify({
    projects: [], brandKeywords: [], sourcePolicies: { "naver-ai": {default:"include"}, "naver-game": {default:"include"} }
  }));
  writeFileSync(path.join(root, "content/activity-all.json"), typeof raw === "string" ? raw : JSON.stringify(raw));
  writeFileSync(path.join(root, "content/activity.json"), JSON.stringify(Array.isArray(raw) ? raw : []));
  writeFileSync(path.join(root, "content/activity-review.json"), "[]");
  const bootstrap = [
    'globalThis.fetch = async (url) => {',
    '  const ai = String(url).includes("/ai");',
    '  if (process.argv[2] === "all-fail" || (process.argv[2] === "one-fails" && ai)) throw new Error("mock network failure");',
    '  const xml = "<rss><channel><item><title>new post</title><link>https://blog.naver.com/new/3</link><description>new summary</description><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>";',
    '  return { ok: true, status: 200, statusText: "OK", text: async () => xml };',
    '};',
    'await import("./scripts/sync-activity.mjs");'
  ].join("\n");
  writeFileSync(path.join(root, "start.mjs"), bootstrap);
  return {
    root, run() { return spawnSync(process.execPath, [path.join(root, "start.mjs"), scenario], { cwd:root, encoding:"utf8" }); },
    read(name) { return JSON.parse(readFileSync(path.join(root, "content", name), "utf8")); },
    cleanup() { rmSync(root, { recursive:true, force:true }); }
  };
}

test("A failed RSS source preserves its cached posts while healthy sources update", () => {
  const f=makeFixture();
  try {
    const r=f.run();
    assert.equal(r.status,0,r.stderr);
    const current=f.read("activity-all.json");
    assert(current.some(x => x.id==="old-ai"),"cached post lost");
    assert(current.some(x => x.url==="https://blog.naver.com/new/3"),"new post missing");
    assert(!current.some(x => x.id==="old-game"),"old source snapshot not replaced");
  } finally { f.cleanup(); }
});

test("All RSS sources failing retain the previous activity history", () => {
  const f=makeFixture({scenario:"all-fail"});
  try {
    const r=f.run();
    assert.equal(r.status,0,r.stderr);
    assert.deepEqual(f.read("activity-all.json").map(x=>x.id).sort(),["old-ai","old-game"].sort());
    assert.match(r.stderr,/preserving cached items/);
  } finally { f.cleanup(); }
});

test("Malformed cache is not silently overwritten", () => {
  const f=makeFixture({raw:"{not-valid-json"});
  try {
    const r=f.run();
    assert.notEqual(r.status,0);
    assert.equal(readFileSync(path.join(f.root,"content/activity-all.json"),"utf8"),"{not-valid-json");
  } finally { f.cleanup(); }
});
