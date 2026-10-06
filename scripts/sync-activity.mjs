import fs from "node:fs/promises";
import crypto from "node:crypto";

const SOURCES_PATH = new URL("../automation/sources.json", import.meta.url);
const ACTIVITY_PATH = new URL("../content/activity.json", import.meta.url);
const USER_AGENT = "TUKI-WORLD-ActivitySync/1.0 (+https://github.com/TUKI0609/tuki-lab)";

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

const config = await readJson(SOURCES_PATH, { sources: [] });
const existing = await readJson(ACTIVITY_PATH, []);
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

const manual = existing.filter(item => item.manual === true);
const previousByUrl = new Map(existing.map(item => [item.url, item]));
const mergedByUrl = new Map();

for (const item of [...manual, ...incoming]) {
  const previous = previousByUrl.get(item.url);
  mergedByUrl.set(item.url, previous ? {
    ...item,
    detectedAt: previous.detectedAt || item.detectedAt
  } : item);
}

const merged = [...mergedByUrl.values()]
  .sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  .slice(0, 60);

await fs.writeFile(ACTIVITY_PATH, JSON.stringify(merged, null, 2) + "\n");
console.log(`[activity-sync] wrote ${merged.length} activities (${incoming.length} fetched)`);
