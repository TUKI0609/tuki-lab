import fs from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
function escapeHtml(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function safeUrl(src){try{const u=new URL(src);return (u.protocol==="https:"||u.protocol==="http:")?escapeHtml(u.href):"#"}catch{return "#"}}
function renderDoc(post,projects){
const slug=post.slug;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error("Invalid slug "+slug);
const root="https://tuki0609.github.io/tuki-lab/",url=root+"lab/posts/"+slug+"/",title=post.title+" | TUKI LAB",desc=post.summary||"게임·AI 창작 과정의 실제 제작 기록";
const project=projects.find(p=>p.id===post.project);const images=post.showProjectEvidence?["w39","w40","w41"]:[];const projectLink=project?`<a href="../../../projects/${escapeHtml(project.id)}/">${escapeHtml(project.name)}</a>`:"";
const gallery=images.length?`<section class="lab-article-evidence" aria-label="관련 제작 영상 썸네일"><h2>게임 제작 과정의 영상 미리보기</h2><p class="lab-evidence-note">기존에 공개한 제작 영상 3편의 썸네일입니다. 직접 캡처한 진화 전후 비교 화면이 아니며 W41 기능·성능 향상의 증거는 아닙니다.</p><div class="lab-evidence-grid">${images.map((w,i)=>`<figure class="lab-evidence-card"><div class="lab-evidence-picture"><img src="../../../assets/projects/lutratide-survivors/${w}-video-thumbnail.svg" alt="${escapeHtml(["성장 선택 화면 관련 제작 영상 썸네일","전투 플레이 관련 제작 영상 썸네일","스킬 이펙트 관련 제작 영상 썸네일"][i])}" width="480" height="360" loading="${i===0?"eager":"lazy"}"></div><figcaption><strong>${escapeHtml(["성장 선택 화면","전투 플레이 화면","스킬 이펙트"][i])}</strong></figcaption></figure>`).join("")}</div></section>`:"";
const picture=images.length?root+"assets/projects/lutratide-survivors/w41-video-thumbnail.svg":root+"assets/seo/og-momo.png";
const ld=JSON.stringify({"@context":"https://schema.org","@type":"BlogPosting",headline:post.title,description:desc,inLanguage:"ko",datePublished:post.publishedAt,dateModified:post.publishedAt,author:{"@type":"Person",name:"TUKI"},mainEntityOfPage:{"@type":"WebPage","@id":url},url}).replace(/</g,"\\u003c");
return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="TUKI WORLD">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${picture}">
  <meta property="article:published_time" content="${post.publishedAt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(desc)}">
  <script type="application/ld+json">${ld}</script>
  <link rel="stylesheet" href="../../../css/style.css">
</head>
<body data-page="lab-article" class="lab-article-static">
<header class="site-header"><div class="wrap nav"><a class="brand" href="../../../"><span>TUKI WORLD</span><small>TUKI LAB</small></a><nav id="main-nav" aria-label="주요 메뉴"><a href="../../../">홈</a><a href="../../../projects/">프로젝트</a><a href="../../">제작실</a><a href="../../../about/">소개</a></nav></div></header>
<main><article class="lab-article wrap">
  <header class="lab-article-head"><div class="lab-article-labels"><span>${escapeHtml(post.type||"BUILD LOG")}</span>${projectLink}</div><h1>${escapeHtml(post.title)}</h1><p class="lab-article-summary">${escapeHtml(desc)}</p><div class="lab-article-date"><time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(post.publishedAt)}</time></div><a href="../../" class="lab-static-back">← 모든 제작 기록</a></header>
  <div class="lab-article-body">${(post.sections||[]).map(section=>`<section><h2>${escapeHtml(section.heading)}</h2>${(section.paragraphs||[]).map(p=>`<p>${escapeHtml(p)}</p>`).join("")}</section>`).join("")}</div>
  ${gallery}
  <aside class="lab-sources"><p class="eyebrow">REFERENCE</p><h2>관련 자료 및 출처</h2><div class="lab-source-list">${(post.sources||[]).map(s=>`<a class="lab-static-source" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(s.label||"출처")}</span><strong>${escapeHtml(s.title||s.url)}</strong><b>↗</b></a>`).join("")}</div></aside>
</article></main>
<footer><div class="wrap footer-inner"><strong>TUKI WORLD</strong><span>© 2026 TUKI.</span></div></footer>
</body></html>
`}
function renderSitemap(sitemap,posts){
 let xml=sitemap.replace(/<url>\s*<loc>https:\/\/tuki0609\.github\.io\/tuki-lab\/lab\/posts\/[^<]+<\/loc>[\s\S]*?<\/url>\s*/g,"");
 const latest=posts.reduce((acc,p)=>p.publishedAt>acc?p.publishedAt:acc,"2026-10-07");
 for(const path of ["/","/lab/"]) {
  const url="https://tuki0609.github.io/tuki-lab"+path;
  xml=xml.replace(`<loc>${url}</loc><lastmod>2026-10-07</lastmod>`,`<loc>${url}</loc><lastmod>${latest}</lastmod>`);
 }
 const added=[...posts].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).map(p=>`  <url><loc>https://tuki0609.github.io/tuki-lab/lab/posts/${p.slug}/</loc><lastmod>${p.publishedAt}</lastmod></url>`).join("\n");
 return xml.replace("</urlset>",added+"\n</urlset>");
}
const posts = JSON.parse(await fs.readFile(join(root,"content/lab-posts.json"),"utf8"));
const projects = JSON.parse(await fs.readFile(join(root,"content/projects.json"),"utf8"));
const check = process.argv.includes("--check");
const expected = [];
for (const post of posts) expected.push([join(root,"lab/posts",post.slug,"index.html"),renderDoc(post,projects)]);
// On regeneration, preserve the manually maintained base sitemap entries.
const sitemapPath = join(root,"sitemap.xml");
expected.push([sitemapPath, renderSitemap(await fs.readFile(sitemapPath,"utf8"),posts)]);
for (const [path,html] of expected) {
  if (check) {
    const actual=await fs.readFile(path,"utf8");
    if(actual!==html)throw new Error("Static LAB SEO output outdated: "+path);
  } else {
    await fs.mkdir(dirname(path),{recursive:true});
    await fs.writeFile(path,html,"utf8");
  }
}
console.log((check?"PASS: ":"WROTE: ")+posts.length+" static LAB article pages and sitemap.");
