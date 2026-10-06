import {
  loadJson, renderNav, setYear
} from "./core.js";

const base = "../../";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function boot() {
  const slug = new URLSearchParams(location.search).get("slug");
  const [site, posts, projects] = await Promise.all([
    loadJson(base + "content/site.json"),
    loadJson(base + "content/lab-posts.json"),
    loadJson(base + "content/projects.json")
  ]);

  renderNav(site, base);
  setYear();

  const root = document.querySelector("#lab-article");
  const post = posts.find(item => item.slug === slug);

  if (!post) {
    document.title = "LAB 글을 찾을 수 없음 · TUKI WORLD";
    root.innerHTML = `
      <section class="lab-article-missing">
        <p class="eyebrow">TUKI LAB</p>
        <h1>이 기록은 아직 없습니다.</h1>
        <p>승인되지 않았거나 주소가 잘못된 LAB 글입니다.</p>
        <a class="text-link" href="../">TUKI LAB으로 돌아가기 →</a>
      </section>
    `;
    return;
  }

  const project = projects.find(item => item.id === post.project);
  document.title = `${post.title} · TUKI LAB`;

  root.innerHTML = `
    <header class="lab-article-head">
      <div class="lab-article-labels">
        <span>${post.type}</span>
        ${project ? `<a href="${base}projects/detail/?id=${encodeURIComponent(project.id)}">${project.name}</a>` : ""}
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="lab-article-summary">${escapeHtml(post.summary || "")}</p>
      <div class="lab-article-date">${post.publishedAt}</div>
    </header>

    <div class="lab-article-body">
      ${(post.sections || []).map(section => `
        <section>
          <h2>${escapeHtml(section.heading || "")}</h2>
          ${(section.paragraphs || []).map(p => `<p>${escapeHtml(p)}</p>`).join("")}
        </section>
      `).join("")}
    </div>

    <aside class="lab-sources">
      <p class="eyebrow">SOURCE TRAIL</p>
      <h2>이 기록의 바깥 흔적.</h2>
      <div class="lab-source-list">
        ${(post.sources || []).map(source => `
          <a href="${source.url}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(source.label || "SOURCE")}</span>
            <strong>${escapeHtml(source.title || source.url)}</strong>
            <b>↗</b>
          </a>
        `).join("") || '<p class="lab-post-empty">연결된 외부 자료가 없습니다.</p>'}
      </div>
    </aside>
  `;
}

boot().catch(error => {
  console.error(error);
  document.querySelector("#lab-article").innerHTML = '<p class="error">LAB 글을 불러오지 못했습니다.</p>';
});
