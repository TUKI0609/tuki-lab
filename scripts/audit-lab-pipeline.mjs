import fs from "node:fs/promises";

const base = new URL("../content/", import.meta.url);
async function records(file) {
  const value = JSON.parse(await fs.readFile(new URL(file, base), "utf8"));
  if (!Array.isArray(value)) throw new Error(`${file} must contain a JSON array`);
  return value;
}

const [candidates, posts, devlog] = await Promise.all([
  records("lab-candidates.json"),
  records("lab-posts.json"),
  records("devlog.json")
]);
const warnings = [];
const errors = [];
const byCandidate = new Map();
const linkedPosts = new Map();
const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };

for (const post of posts) {
  if (post.originCandidateId) {
    const linked = linkedPosts.get(post.originCandidateId) || [];
    linked.push(post);
    linkedPosts.set(post.originCandidateId, linked);
  } else {
    warnings.push(`LAB article ${post.slug || post.id || "(unknown)"} has no originCandidateId; review manually`);
  }
}

for (const candidate of candidates) {
  if (!candidate.id || byCandidate.has(candidate.id)) {
    errors.push(`Missing or duplicate candidate id: ${candidate.id || "(empty)"}`);
    continue;
  }
  byCandidate.set(candidate.id, candidate);
  if (!Object.hasOwn(counts, candidate.status)) {
    errors.push(`Unknown status for ${candidate.id}: ${candidate.status}`);
  } else counts[candidate.status]++;
  if (!Array.isArray(candidate.evidence) || candidate.evidenceCount !== candidate.evidence.length) {
    errors.push(`Evidence count mismatch: ${candidate.id}`);
  } else if (candidate.evidence.some(item => !item.url || !item.publishedAt)) {
    errors.push(`Missing evidence URL/date: ${candidate.id}`);
  }
  if (candidate.status === "APPROVED" && !linkedPosts.has(candidate.id)) {
    warnings.push(`Approved candidate ${candidate.id} has no explicitly linked LAB article; do not infer publication status`);
  }
  if (candidate.status === "REJECTED" && candidate.needsApproval) {
    warnings.push(`Rejected candidate ${candidate.id} still has needsApproval=true`);
  }
}
for (const [id] of linkedPosts) {
  if (!byCandidate.has(id)) warnings.push(`LAB article references missing candidate: ${id}`);
}

console.log(JSON.stringify({
  candidateCount: candidates.length,
  statuses: counts,
  labPostCount: posts.length,
  devlogCount: devlog.length,
  warnings,
  errors
}, null, 2));
if (errors.length) process.exitCode = 1;
// Read-only audit. Never approve a candidate or write a live article.
