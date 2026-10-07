import fs from "node:fs/promises";
import crypto from "node:crypto";

const ACTIVITY_PATH = new URL("../content/activity.json", import.meta.url);
const PROJECTS_PATH = new URL("../content/projects.json", import.meta.url);
const CANDIDATES_PATH = new URL("../content/lab-candidates.json", import.meta.url);

async function readJson(url, fallback) {
  try { return JSON.parse(await fs.readFile(url, "utf8")); }
  catch { return fallback; }
}

const stableHash = value =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);

function isoWeek(value) {
  const date = new Date(value);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function suggestType(items) {
  const text = items.map(x => `${x.title} ${x.summary || ""}`).join(" ").toLowerCase();
  if (/(중단|실패|폐기|접었|포기|왜 안|postmortem)/i.test(text)) return "POSTMORTEM";
  if (/(오류|버그|고쳤|수정|fix|복구|깨지|문제 해결)/i.test(text)) return "FIX";
  if (/(출시|런칭|공개|release|배포|오픈)/i.test(text)) return "RELEASE";
  if (/(결정|바꿨|방향|선택|기준|구조)/i.test(text)) return "DECISION";
  return "BUILD LOG";
}

function suggestTitle(project, items, type) {
  const count = items.length;
  const suffix = {
    "FIX":"수정 기록",
    "RELEASE":"공개 기록",
    "POSTMORTEM":"회고",
    "DECISION":"설계 결정",
    "BUILD LOG":"제작 업데이트"
  }[type] || "제작 업데이트";

  if (count === 1) {
    const sourceTitle = items[0].title.replace(/#[^\s]+/g, "").trim();
    return `${project.name} · ${sourceTitle}`.slice(0, 90);
  }
  return `${project.name} · 최근 ${count}개 활동을 묶은 ${suffix}`;
}

function buildSummary(project, items, type) {
  const sources = [...new Set(items.map(x => x.sourceLabel))].join(" · ");
  return `${project.name}와 연결된 최근 활동 ${items.length}건을 하나의 ${type} 후보로 묶었습니다. 출처: ${sources}. 승인 전에는 TUKI LAB에 공개되지 않습니다.`;
}

const activity = await readJson(ACTIVITY_PATH, []);
const projects = await readJson(PROJECTS_PATH, []);
const previous = await readJson(CANDIDATES_PATH, []);
const projectMap = new Map(projects.map(p => [p.id, p]));
const previousById = new Map(previous.map(c => [c.id, c]));

const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
const grouped = new Map();

for (const item of activity) {
  if (!item.project || !projectMap.has(item.project)) continue;
  const ts = new Date(item.publishedAt).getTime();
  if (!Number.isFinite(ts) || ts < cutoff) continue;

  const bucket = `${item.project}:${isoWeek(item.publishedAt)}`;
  if (!grouped.has(bucket)) grouped.set(bucket, []);
  grouped.get(bucket).push(item);
}

const candidates = [];

for (const [bucket, items] of grouped.entries()) {
  items.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const projectId = items[0].project;
  const project = projectMap.get(projectId);
  const week = bucket.split(":")[1];
  const id = `lab-${projectId}-${week}`;
  const prev = previousById.get(id);
  const type = suggestType(items);
  const evidence = items.map(item => ({
    activityId:item.id,
    source:item.source,
    sourceLabel:item.sourceLabel,
    title:item.title,
    url:item.url,
    publishedAt:item.publishedAt
  }));

  const candidate = {
    id,
    project:projectId,
    projectName:project.name,
    period:week,
    status:prev?.status || "PENDING",
    needsApproval:prev?.status === "APPROVED" ? false : true,
    suggestedType:type,
    suggestedTitle:suggestTitle(project, items, type),
    suggestedSummary:buildSummary(project, items, type),
    confidence:Math.min(98, 70 + Math.max(0, items.length - 1) * 8),
    evidenceCount:items.length,
    evidence,
    evidenceHash:stableHash(evidence.map(e => e.activityId).sort().join("|")),
    generatedAt:prev?.generatedAt || new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    approvedAt:prev?.approvedAt || null,
    rejectedAt:prev?.rejectedAt || null
  };

  candidates.push(candidate);
}

candidates.sort((a,b) => {
  const ad = a.evidence[0]?.publishedAt || "";
  const bd = b.evidence[0]?.publishedAt || "";
  return new Date(bd) - new Date(ad);
});

await fs.writeFile(CANDIDATES_PATH, JSON.stringify(candidates, null, 2) + "\n");
console.log(`[lab-candidates] generated ${candidates.length} candidates`);
