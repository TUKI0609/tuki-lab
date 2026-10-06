import fs from "node:fs/promises";
import crypto from "node:crypto";

const SOURCES_PATH = new URL("../automation/sources.json", import.meta.url);
const RULES_PATH = new URL("../automation/editorial-rules.json", import.meta.url);
const RAW_PATH = new URL("../content/activity-all.json", import.meta.url);
const ACTIVITY_PATH = new URL("../content/activity.json", import.meta.url);
const REVIEW_PATH = new URL("../content/activity-review.json", import.meta.url);
const USER_AGENT = "TUKI-WORLD-ActivitySync/2.0 (+https://github.com/TUKI0609/tuki-lab)";

const decodeXml = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'");

const stripHtml = (value = "") => decodeXml(value)
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeXml(m[1]).trim() : "";
};

const attr = (xml, tagName, attrName) => {
  const re = new RegExp(`<${tagName}\\b[^>]*\\b${attrName}=["']([^"']+)["'][^>]*>`, "i");
  return xml.match(re)?.[1] || "";
};

const stableId = url => crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
const haystack = item => `${item.title || ""} ${item.summary || ""}`.toLowerCase();
const includesAny = (text, phrases = []) => phrases.some(p => text.includes(String(p).toLowerCase()));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept": "application/xml,text/xml,text/html;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} · ${url}`);
  return res.text();
}

function normalizeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function naverItems(xml, source) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
  return blocks.slice(0, 12).map(item => {
    const url = tag(item, "link");
    const title = stripHtml(tag(item, "title"));
    const summary = stripHtml(tag(item, "description")).slice(0, 180);
    const publishedAt = normalizeDate(tag(item, "pubDate"));
    if (!url || !title) return null;
    return {
      id: stableId(url),
      source: source.id,
      sourceLabel: source.label,
      kind: "POST",
      route: source.route,
      project: source.project ?? null,
      title,
      summary,
      url,
      publishedAt,
      detectedAt: new Date().toISOString(),
      manual: false
    };
  }).filter(Boolean);
}

function youtubeItems(xml, source) {
  const blocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
  return blocks.slice(0, 12).map(entry => {
    const url = attr(entry, "link", "href");
    const title = stripHtml(tag(entry, "title"));
    const publishedAt = normalizeDate(tag(entry, "published") || tag(entry, "updated"));
    if (!url || !title) return null;
    return {
      id: stableId(url),
      source: source.id,
      sourceLabel: source.label,
      kind: "VIDEO",
      route: source.route,
      project: source.project ?? null,
      title,
      summary: "",
      url,
      publishedAt,
      detectedAt: new Date().toISOString(),
      manual: false
    };
  }).filter(Boolean);
}

async function resolveYoutubeChannelId(source) {
  if (source.channelId) return source.channelId;
  const page = await fetchText(`https://www.youtube.com/@${source.handle}/videos`);
  const patterns = [
    /"externalId":"(UC[^"]+)"/,
    /"channelId":"(UC[^"]+)"/,
    /youtube\.com\/channel\/(UC[\w-]+)/
  ];
  for (const re of patterns) {
    const id = page.match(re)?.[1];
    if (id) return id;
  }
  throw new Error("YouTube channel ID를 공개 페이지에서 찾지 못했습니다.");
}

async function readJson(url, fallback) {
  try { return JSON.parse(await fs.readFile(url, "utf8")); }
  catch { return fallback; }
}

function classify(item, rules) {
  if (item.manual === true) {
    return { ...item, editorial: { decision:"include", reason:"manual", score:100 } };
  }

  const text = haystack(item);

  for (const project of rules.projects || []) {
    if (includesAny(text, project.keywords)) {
      return {
        ...item,
        project: project.id,
        editorial: { decision:"include", reason:`project:${project.id}`, score:100 }
      };
    }
  }

  if (includesAny(text, rules.brandKeywords)) {
    return { ...item, editorial: { decision:"include", reason:"tuki-brand", score:95 } };
  }

  const policy = rules.sourcePolicies?.[item.source] || { default:"exclude" };

  if (includesAny(text, policy.includeMakerPhrases)) {
    return { ...item, editorial: { decision:"include", reason:"maker-content", score:80 } };
  }

  if (includesAny(text, policy.reviewPhrases)) {
    return { ...item, editorial: { decision:"review", reason:"possible-maker-content", score:50 } };
  }

  return {
    ...item,
    editorial: {
      decision: policy.default === "include" ? "include" : policy.default === "review" ? "review" : "exclude",
      reason: `source-default:${policy.default || "exclude"}`,
      score: policy.default === "include" ? 60 : policy.default === "review" ? 30 : 0
    }
  };
}

const config = await readJson(SOURCES_PATH, { sources: [] });
const rules = await readJson(RULES_PATH, { projects:[], brandKeywords:[], sourcePolicies:{} });
const existingRaw = await readJson(RAW_PATH, []);
const incoming = [];

for (const source of config.sources.filter(s => s.enabled)) {
  try {
    if (source.kind === "naver-rss") {
      incoming.push(...naverItems(await fetchText(source.url), source));
    } else if (source.kind === "youtube-handle") {
      const channelId = await resolveYoutubeChannelId(source);
      const feed = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
      incoming.push(...youtubeItems(feed, source));
    }
  } catch (error) {
    console.warn(`[activity-sync] ${source.id}: ${error.message}`);
  }
}

const manual = existingRaw.filter(item => item.manual === true);
const previousByUrl = new Map(existingRaw.map(item => [item.url, item]));
const mergedByUrl = new Map();

for (const item of [...manual, ...incoming]) {
  const previous = previousByUrl.get(item.url);
  mergedByUrl.set(item.url, previous ? {
    ...item,
    detectedAt: previous.detectedAt || item.detectedAt
  } : item);
}

const raw = [...mergedByUrl.values()]
  .sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, 80);

const classified = raw.map(item => classify(item, rules));
const visible = classified
  .filter(item => item.editorial.decision === "include")
  .slice(0, 60);
const review = classified
  .filter(item => item.editorial.decision === "review")
  .slice(0, 60);

await Promise.all([
  fs.writeFile(RAW_PATH, JSON.stringify(classified, null, 2) + "\n"),
  fs.writeFile(ACTIVITY_PATH, JSON.stringify(visible, null, 2) + "\n"),
  fs.writeFile(REVIEW_PATH, JSON.stringify(review, null, 2) + "\n")
]);

console.log(`[activity-sync] raw=${classified.length} visible=${visible.length} review=${review.length} fetched=${incoming.length}`);
