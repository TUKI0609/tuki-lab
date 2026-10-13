// Pure, read-only validation of TUKI LAB candidates and draft/publication data.
const TYPES = new Set(["BUILD LOG", "EXPERIMENT", "FIX", "RELEASE", "POSTMORTEM", "DECISION"]);
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
const validTimestamp = value => typeof value === "string" && !Number.isNaN(Date.parse(value));
const present = value => typeof value === "string" && value.trim().length > 0;
const isWebURL = value => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && Boolean(url.hostname);
  } catch { return false; }
};
const unchanged = (oldValue, newValue) => JSON.stringify(oldValue) === JSON.stringify(newValue);

export function reviewQueue(candidates, posts) {
  const used = new Set(posts.flatMap(p => (p.sources || []).map(s => s.url)));
  return candidates.filter(c => c.status === "PENDING").map(c => ({
    id: c.id, project: c.project, type: c.suggestedType,
    suggestedTitle: c.suggestedTitle,
    evidenceCount: c.evidence?.length || 0,
    evidence: (c.evidence || []).map(e => ({ title: e.title, url: e.url, publishedAt: e.publishedAt })),
    warning: (c.evidence || []).some(e => used.has(e.url))
      ? "At least one source URL is already used in a published LAB article; inspect for duplication."
      : null
  }));
}

export function checkDraft(draft, candidates, posts) {
  const errors = [];
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) return ["Draft must be a JSON object."];
  const c = candidates.find(x => x.id === draft.originCandidateId);
  if (!c) errors.push("originCandidateId must match an existing candidate.");
  else if (c.status !== "PENDING") errors.push("Draft preparation is limited to PENDING candidates.");
  if (!present(draft.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug || ""))
    errors.push("slug must be unique lowercase kebab-case.");
  if (posts.some(p => p.slug === draft.slug)) errors.push("slug is already published.");
  if (c && draft.project !== c.project) errors.push("Draft project differs from candidate.");
  if (!TYPES.has(draft.type)) errors.push("Unknown LAB article type.");
  if (!present(draft.title) || !present(draft.summary)) errors.push("Title and summary are required.");
  if (!Array.isArray(draft.sections) || !draft.sections.length ||
      draft.sections.some(s => !present(s.heading) || !Array.isArray(s.paragraphs) ||
        !s.paragraphs.length || s.paragraphs.some(p => !present(p)))) errors.push("At least one complete section is required.");
  if (!Array.isArray(draft.sources) || !draft.sources.length ||
      draft.sources.some(s => !present(s.label) || !present(s.title) || !isWebURL(s.url)))
    errors.push("At least one source with title, label, and HTTP(S) URL is required.");
  const evidence = new Set((c?.evidence || []).map(x => x.url));
  if (c && !draft.sources?.some(s => evidence.has(s.url)))
    errors.push("Draft must directly cite at least one candidate evidence URL.");
  const used = new Set(posts.flatMap(p => (p.sources || []).map(s => s.url)));
  if (c && (c.evidence || []).some(e => used.has(e.url)))
    errors.push("Candidate evidence is already used by a published article; review manually before creating another.");
  return errors;
}

export function checkPublicationChange(before, after) {
  const errors = [];
  for (const name of ["candidates", "posts", "devlog"]) {
    if (!Array.isArray(before?.[name]) || !Array.isArray(after?.[name]))
      return ["Baseline and proposed candidates, posts, and devlog must all be arrays."];
  }
  const posts0 = before.posts, posts1 = after.posts;
  const candidates0 = new Map(before.candidates.map(c => [c.id, c]));
  const candidates1 = new Map(after.candidates.map(c => [c.id, c]));
  const oldPosts = new Map(posts0.map(p => [p.slug, p]));
  const newPosts = posts1.filter(p => !oldPosts.has(p.slug));
  const slugs = posts1.map(p => p.slug);
  if (new Set(slugs).size !== slugs.length) errors.push("Duplicate published LAB slug.");
  if (new Set(after.candidates.map(c => c.id)).size !== after.candidates.length)
    errors.push("Duplicate candidate id.");
  const logIds = after.devlog.map(x => String(x.id));
  if (new Set(logIds).size !== logIds.length) errors.push("Duplicate devlog id.");
  for (const prior of posts0) {
    const current = posts1.find(p => p.slug === prior.slug);
    if (!current || !unchanged(prior, current))
      errors.push("Existing published article was modified or deleted: " + prior.slug + ". Use a separate editorial review.");
  }
  for (const prior of before.devlog) {
    const current = after.devlog.find(l => l.id === prior.id);
    if (!current || !unchanged(prior, current))
      errors.push("Existing devlog was modified or deleted: " + prior.id + ".");
  }
  for (const prior of before.candidates) {
    if (!candidates1.has(prior.id)) errors.push("Candidate history was removed: " + prior.id + ".");
  }
  const baselineLogIds = new Set(before.devlog.map(x => String(x.id)));
  const addedLogs = after.devlog.filter(x => !baselineLogIds.has(String(x.id)));
  const priorMaxId = Math.max(0, ...before.devlog.map(x => Number(x.id) || 0));
  const publicationIds = new Set();
  for (const post of newPosts) {
    const id = post.originCandidateId;
    const c = candidates1.get(id);
    const old = candidates0.get(id);
    if (!present(id) || !c || !old || old.status !== "PENDING") {
      errors.push("New article must refer to a previously PENDING candidate: " + (post.slug || "(missing slug)"));
      continue;
    }
    if (publicationIds.has(id)) errors.push("Two new articles target the same candidate: " + id);
    publicationIds.add(id);
    if (c.status !== "APPROVED" || c.needsApproval !== false || !validTimestamp(c.approvedAt) ||
        c.publishedSlug !== post.slug)
      errors.push("Candidate must be APPROVED with approvedAt and matching publishedSlug: " + id);
    if (post.project !== c.project) errors.push("Project mismatch: " + id);
    if (!validDate(post.publishedAt)) errors.push("Published article needs YYYY-MM-DD publishedAt: " + id);
    if (checkDraft({ ...post }, [{ ...c, status:"PENDING" }], posts0).length)
      errors.push("Article draft schema/evidence validation failed: " + id);
    if (posts0.some(p => p.originCandidateId === id)) errors.push("Candidate is already published: " + id);
    const matchingLogs = addedLogs.filter(log => log.originCandidateId === id);
    if (matchingLogs.length !== 1 || !matchingLogs.every(log =>
      Number.isSafeInteger(log.id) && log.id > priorMaxId &&
      log.project === c.project && validDate(log.date) &&
      TYPES.has(log.type) && present(log.title) && present(log.summary)))
      errors.push("Exactly one valid new devlog record must accompany article: " + id);
  }
  for (const c of after.candidates) {
    const prev = candidates0.get(c.id);
    if (prev?.status === "PENDING" && c.status === "APPROVED" && !publicationIds.has(c.id))
      errors.push("Newly approved candidate has no newly published article: " + c.id);
  }
  for (const log of addedLogs) {
    if (!publicationIds.has(log.originCandidateId))
      errors.push("New devlog entry lacks a matching new LAB article: " + log.id);
  }
  if (newPosts.length !== publicationIds.size)
    errors.push("New posts must each map to one distinct approved candidate.");
  return errors;
}
