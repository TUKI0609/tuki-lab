import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const site = "https://tuki0609.github.io/tuki-lab/";
const expected = JSON.parse(await readFile(new URL("../content/activity.json", import.meta.url), "utf8"));
const names = ["id", "title", "url", "source", "publishedAt"];
const signature = item => Object.fromEntries(names.map(key => [key, item[key] ?? null]));

async function getLive(relativePath) {
  // Cache-busting query parameter: we want the published content, not a stale CDN response.
  const url = new URL(relativePath, site);
  url.searchParams.set("_tuki_verify", process.env.GITHUB_RUN_ID || String(Date.now()));
  const response = await fetch(url, {
    headers: { "Accept": "*/*", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(25000)
  });
  assert.equal(response.status, 200, `Expected HTTP 200 from ${relativePath}; got ${response.status}`);
  return response.text();
}

const [homepage, timelinePage, liveJson, homeJs, timelineJs] = await Promise.all([
  getLive(""),
  getLive("activity/"),
  getLive("content/activity.json"),
  getLive("js/app.js"),
  getLive("js/secondary.js")
]);

assert.match(homepage, /src=["']js\/app\.js["']/i, "Homepage module not found");
assert.match(homepage, /href=["']\.\/activity\/["']/i, "Homepage activity link not found");
assert.match(timelinePage, /id=["']all-activity["']/i, "Activity-list root not found");
assert.match(timelinePage, /src=["']\.\.\/js\/secondary\.js["']/i, "Activity module not found");
assert.match(homeJs, /loadJson\(["']content\/activity\.json["']\)/, "Homepage activity data import not found");
assert.match(timelineJs, /loadJson\(base\s*\+\s*["']content\/activity\.json["']\)/, "Activity page data import not found");

const actual = JSON.parse(liveJson);
assert(Array.isArray(actual), "Live activity.json is not a JSON list");
const localItems = expected.map(signature);
const liveItems = actual.map(signature);
console.log(JSON.stringify({
  site,
  localCount: localItems.length,
  publishedCount: liveItems.length,
  latestLocal: localItems[0] || null,
  latestPublished: liveItems[0] || null,
  pageHttpChecks: ["home", "activity", "content/activity.json", "js/app.js", "js/secondary.js"]
}, null, 2));
assert.deepEqual(liveItems, localItems,
  "Published activity differs from the repository checkout. Check Pages deploy status or CDN delay.");
console.log("PASS: Published TUKI WORLD activity data matches the checked-out repository and both pages load the activity JSON.");
