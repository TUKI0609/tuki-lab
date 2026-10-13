import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoScript = fileURLToPath(new URL("../scripts/build-lab-candidates.mjs", import.meta.url));
const read = file => JSON.parse(readFileSync(file, "utf8"));

function fixture(previous = []) {
  const root = mkdtempSync(path.join(os.tmpdir(), "tuki-lab-test-"));
  mkdirSync(path.join(root, "scripts"));
  mkdirSync(path.join(root, "content"));
  copyFileSync(repoScript, path.join(root, "scripts/build-lab-candidates.mjs"));
  const file = name => path.join(root, "content", name);
  writeFileSync(file("projects.json"), JSON.stringify([{ id: "momo", name: "MOMO" }]));
  writeFileSync(file("activity.json"), JSON.stringify([{
    id: "new-post-1", source: "naver-ai", sourceLabel: "Naver Blog",
    title: "모모 게임 제작 업데이트", url: "https://example.test/momo",
    project: "momo", publishedAt: new Date().toISOString()
  }]));
  writeFileSync(file("lab-candidates.json"), JSON.stringify(previous));
  return {
    file,
    run() {
      const result = spawnSync(process.execPath, [path.join(root, "scripts/build-lab-candidates.mjs")], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    },
    cleanup() { rmSync(root, { recursive: true, force: true }); }
  };
}

test("Repeated runs leave an unchanged candidate file byte-for-byte identical", () => {
  const f = fixture();
  try {
    f.run();
    const first = readFileSync(f.file("lab-candidates.json"), "utf8");
    f.run();
    assert.equal(readFileSync(f.file("lab-candidates.json"), "utf8"), first);
  } finally { f.cleanup(); }
});

test("Approved historical candidate remains when no longer in current activity window", () => {
  const historical = {
    id: "lab-momo-2020-W01", project: "momo", projectName: "MOMO",
    period: "2020-W01", status: "APPROVED", needsApproval: false,
    evidence: [{ url: "https://example.test/old", publishedAt: "2020-01-01T00:00:00Z" }],
    evidenceCount: 1, approvedAt: "2020-01-02T00:00:00Z",
    updatedAt: "2020-01-02T00:00:00Z"
  };
  const f = fixture([historical]);
  try {
    f.run();
    const candidates = read(f.file("lab-candidates.json"));
    const archived = candidates.find(x => x.id === historical.id);
    assert.deepEqual(archived, historical);
  } finally { f.cleanup(); }
});

test("A rejected candidate remains rejected without being put back into approval queue", () => {
  const f = fixture();
  try {
    f.run();
    const saved = read(f.file("lab-candidates.json"));
    saved[0].status = "REJECTED";
    saved[0].needsApproval = false;
    saved[0].rejectedAt = new Date().toISOString();
    writeFileSync(f.file("lab-candidates.json"), JSON.stringify(saved));
    f.run();
    const result = read(f.file("lab-candidates.json"));
    assert.equal(result[0].status, "REJECTED");
    assert.equal(result[0].needsApproval, false);
    assert.equal(result[0].rejectedAt, saved[0].rejectedAt);
  } finally { f.cleanup(); }
});
