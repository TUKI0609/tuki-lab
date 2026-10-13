// Operator utility: read-only queue and draft checks.
// This tool never edits activity, LAB articles, approval statuses, or devlogs.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { reviewQueue, checkDraft, checkPublicationChange } from "./lab-approval-core.mjs";

const base = new URL("../content/", import.meta.url);
const read = async p => JSON.parse(await fs.readFile(new URL(p, base), "utf8"));
const readState = async () => ({
  candidates: await read("lab-candidates.json"),
  posts: await read("lab-posts.json"),
  devlog: await read("devlog.json")
});
const action = process.argv[2] || "queue";

async function main() {
  const state = await readState();
  if (action === "queue") {
    const queue = reviewQueue(state.candidates, state.posts);
    console.log(JSON.stringify({
      pending: queue.length,
      candidates: queue,
      notice: "Review only. No candidate has been approved or published."
    }, null, 2));
    return;
  }
  if (action === "check-draft") {
    const filename = process.argv[3];
    if (!filename) throw new Error("Usage: node scripts/lab-review.mjs check-draft /path/to/draft.json");
    const draft = JSON.parse(await fs.readFile(filename, "utf8"));
    const errors = checkDraft(draft, state.candidates, state.posts);
    console.log(JSON.stringify({
      valid: errors.length === 0,
      originCandidateId: draft.originCandidateId,
      errors,
      notice: "This is a private editorial preview check, NOT user approval or publication."
    }, null, 2));
    if (errors.length) process.exitCode = 1;
    return;
  }
  if (action === "validate-publication") {
    // Only a PR with an actual baseline commit can run publication validation.
    const sha = process.env.LAB_BASE_SHA;
    if (!/^[a-f0-9]{40}$/i.test(sha || "")) throw new Error("LAB_BASE_SHA must be the target branch's 40-character commit SHA.");
    const prior = {};
    for (const [key, filename] of [
      ["candidates", "lab-candidates.json"],
      ["posts", "lab-posts.json"],
      ["devlog", "devlog.json"]
    ]) {
      prior[key] = JSON.parse(execFileSync("git", ["show", sha + ":content/" + filename], {
        encoding: "utf8", maxBuffer: 3 * 1024 * 1024
      }));
    }
    const errors = checkPublicationChange(prior, state);
    console.log(JSON.stringify({
      valid: errors.length === 0,
      changedPublicationCount: state.posts.filter(p => !prior.posts.some(q => q.slug === p.slug)).length,
      errors,
      notice: "Data consistency validation only. Explicit user approval must be documented outside this command before merge."
    }, null, 2));
    if (errors.length) process.exitCode = 1;
    return;
  }
  throw new Error("Unknown command. Use queue, check-draft, or validate-publication.");
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
