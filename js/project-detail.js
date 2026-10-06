import {
  loadJson, renderNav, renderProjectVisual, renderProjectLinks,
  renderLabPosts, renderActivityList, hydrateAssets, setYear
} from "./core.js";

const base = "../../";

async function boot() {
  const id = new URLSearchParams(location.search).get("id");
  const [site, projects, posts, activity] = await Promise.all([
    loadJson(base + "content/site.json"),
    loadJson(base + "content/projects.json"),
    loadJson(base + "content/lab-posts.json"),
    loadJson(base + "content/activity.json")
  ]);

  renderNav(site, base);
  setYear();

  const project = projects.find(item => item.id === id);
  const root = document.querySelector("#project-detail-root");

  if (!project) {
    document.title = "프로젝트를 찾을 수 없음 · TUKI WORLD";
    root.innerHTML = `
      <section class="page-hero wrap">
        <p class="eyebrow">PROJECT</p>
        <h1>프로젝트를 찾을 수 없습니다.</h1>
        <p>주소를 다시 확인해주세요.</p>
      </section>
    `;
    return;
  }

  document.title = `${project.name} · TUKI WORLD`;
  const projectPosts = posts.filter(post => post.project === project.id);
  const projectActivity = activity.filter(item => item.project === project.id);

  root.innerHTML = `
    <section class="project-detail-hero wrap">
      <div class="project-detail-copy">
        <div class="card-top">
          <span class="tag">${project.route} · ${project.type}</span>
          <span class="status">${project.status}</span>
        </div>
        <div class="availability">${project.availability}</div>
        <h1>${project.name}</h1>
        <p>${project.tagline}</p>
        <div class="project-origin">${project.platform}</div>
        <div class="project-detail-actions">${renderProjectLinks(project.links)}</div>
      </div>
      <div class="project-detail-visual">
        ${renderProjectVisual(project)}
      </div>
    </section>

    <section class="section wrap project-facts">
      <article>
        <span>CURRENT FOCUS</span>
        <h2>지금 어디를 고치고 있나.</h2>
        <p>${project.currentFocus}</p>
      </article>
      <article>
        <span>STATUS</span>
        <h2>${project.status}</h2>
        <p>${project.availability}</p>
      </article>
    </section>

    <section class="section wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">TUKI LAB</p>
          <h2>이 프로젝트의 정식 제작 기록.</h2>
        </div>
        <p>승인된 기록만 여기에 연결됩니다.</p>
      </div>
      <div id="project-lab-posts" class="lab-post-grid"></div>
    </section>

    <section class="section wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">RELATED ACTIVITY</p>
          <h2>밖에서 이어진 최근 활동.</h2>
        </div>
        <p>블로그와 영상에서 이 프로젝트와 자동 연결된 흔적입니다.</p>
      </div>
      <div id="project-activity" class="activity-grid"></div>
    </section>
  `;

  renderLabPosts(projectPosts, "#project-lab-posts", base);
  renderActivityList(projectActivity, "#project-activity", 6);
  await hydrateAssets(document, base);
}

boot().catch(error => {
  console.error(error);
  document.querySelector("#project-detail-root").innerHTML = '<div class="wrap"><p class="error">프로젝트 정보를 불러오지 못했습니다.</p></div>';
});
