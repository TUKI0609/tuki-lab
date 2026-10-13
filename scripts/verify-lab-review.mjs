// Read-only validation for a proposed, still-unpublished LAB article.
// Candidate status is checked against the target branch, not a PR's proposed approval edits.
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { checkDraft } from "./lab-approval-core.mjs";

const relative = process.argv[2];
if (!relative || !/^review\/[a-zA-Z0-9._-]+\.json$/.test(relative)) {
  console.error("Usage: node scripts/verify-lab-review.mjs review/<name>.json");
  process.exit(2);
}
const baseSha = process.env.LAB_BASE_SHA;
const loadBaseline = async filename => {
  if (baseSha) {
    if (!/^[a-f0-9]{40}$/i.test(baseSha)) throw new Error("Invalid LAB_BASE_SHA");
    return JSON.parse(execFileSync("git",["show",baseSha+":content/"+filename],{
      encoding:"utf8",maxBuffer:3*1024*1024
    }));
  }
  return JSON.parse(await fs.readFile(new URL("../content/"+filename,import.meta.url),"utf8"));
};
try {
  const [payload, candidates, posts] = await Promise.all([
    fs.readFile(new URL("../"+relative,import.meta.url),"utf8").then(JSON.parse),
    loadBaseline("lab-candidates.json"),
    loadBaseline("lab-posts.json")
  ]);
  const priorCandidate = candidates.find(c => c.id === payload.originCandidateId);
  let errors;
  if (priorCandidate?.status === "APPROVED") {
    // A published draft must still be traceable and identical to the released
    // article. Do not misclassify every later CSS/media fix as duplicate content.
    const official = posts.find(post =>
      post.slug === payload.slug && post.originCandidateId === payload.originCandidateId);
    errors = official ? [] : ["Approved candidate has no matching published article."];
    const fields = ["originCandidateId","slug","project","type","title","summary","sections","sources"];
    if (official) for (const key of fields) {
      if (JSON.stringify(official[key]) !== JSON.stringify(payload[key]))
        errors.push("Published article differs from reviewed draft: " + key);
    }
  } else {
    errors = checkDraft(payload,candidates,posts);
  }
  console.log(JSON.stringify({
    reviewedCandidate:payload.originCandidateId,
    proposedSlug:payload.slug,
    dataSource:"target-branch baseline",
    schemaValid:errors.length===0,
    errors,
    notice: priorCandidate?.status === "APPROVED"
      ? "Previously published review draft was compared against its live LAB article."
      : "Draft preview only. This does not approve or publish a LAB article."
  },null,2));
  if(errors.length)process.exitCode=1;
} catch(error) {
  console.error("Review validation failed:",error.message);
  process.exitCode=1;
}
