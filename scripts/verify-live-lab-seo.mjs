import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const site = "https://tuki0609.github.io/tuki-lab/";
const cache = process.env.GITHUB_RUN_ID || String(Date.now());
const localPosts=JSON.parse(await readFile(new URL("../content/lab-posts.json",import.meta.url),"utf8"));
const request = async (path) => {
  const url=new URL(path,site);
  url.searchParams.set("_verify",cache);
  const response=await fetch(url,{headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(25000)});
  assert.equal(response.status,200,"HTTP "+response.status+" at "+url.href);
  return response.text();
};
const [home,css,sitemap,labIndex]=await Promise.all([request(""),request("css/style.css"),request("sitemap.xml"),request("lab/")]);
assert.match(home,/id="home-featured-lab"/);
assert.match(home,/href="\.\/lab\/posts\/lutratide-evolution-growth-difference-2026-w41\/"/);
assert.match(home,/src="js\/app\.js"/);
assert.match(css,/\.lab-article-head h1\s*\{[^}]*font-size:\s*clamp\(2rem,\s*4\.1vw,\s*3\.35rem\)/);
assert.match(labIndex,/id="published-lab"/);
assert.match(sitemap,/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
const results=[];
for(const post of localPosts){
  const path="lab/posts/"+post.slug+"/";
  const actual=await request(path);
  const expected=await readFile(new URL("../"+path+"index.html",import.meta.url),"utf8");
  assert.equal(actual,expected,"Live article mismatch: "+post.slug);
  const url=new URL(path,site).href;
  assert(actual.includes('<link rel="canonical" href="'+url+'">'));
  assert(actual.includes('name="robots" content="index,follow,max-image-preview:large"'));
  assert(actual.includes('application/ld+json'));
  assert(actual.includes("<h1>"));
  assert(sitemap.includes("<loc>"+url+"</loc>"));
  results.push({url,title:post.title,indexable:true});
}
const legacy=await request("lab/article/?slug=lutratide-evolution-growth-difference-2026-w41");
assert.match(legacy,/<meta name="robots" content="noindex,follow"/);
const imagePaths=["w39","w40","w41"].map(w=>"assets/projects/lutratide-survivors/"+w+"-video-thumbnail.svg");
for(const path of imagePaths){
  const data=await request(path);
  assert.match(data,/data:image\/jpeg;base64,\/9j\//);
}
console.log(JSON.stringify({homeFeatured:true,titleReduced:true,legacyNoindex:true,pages:results,gameImages:imagePaths.length},null,2));
console.log("PASS: Live homepage, title CSS, four HTML posts and sitemap are deployed.");
