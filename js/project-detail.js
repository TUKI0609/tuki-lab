import {
  loadJson, initI18n, t, localizeProject, renderNav, renderProjectVisual, renderProjectLinks,
  renderLabPosts, renderActivityList, hydrateAssets, setYear
} from "./core.js";

const base = "../../";

async function boot() {
  await initI18n(base);

  const id = new URLSearchParams(location.search).get("id");
  const [site, projects, posts, activity] = await Promise.all([
    loadJson(base + "content/site.json"),
    loadJson(base + "content/projects.json"),
    loadJson(base + "content/lab-posts.json"),
    loadJson(base + "content/activity.json")
  ]);

  renderNav(site, base);
  setYear();

  const rawProject = projects.find(item => item.id === id);
  const root = document.querySelector("#project-detail-root");

  if (!rawProject) {
    document.title = `${t("project.notFoundTitle")} · TUKI WORLD`;
    root.innerHTML = `
      <section class="page-hero wrap">
        <p class="eyebrow">${t("project.notFoundEyebrow")}</p>
        <h1>${t("project.notFoundTitle")}</h1>
        <p>${t("project.notFoundDesc")}</p>
      </section>
    `;
    return;
  }

  const project = localizeProject(rawProject);
  document.title = `${project.name} · TUKI WORLD`;
  const projectPosts = posts.filter(post => post.project === project.id);
  const projectActivity = activity.filter(item => item.project === project.id);

  root.innerHTML = `
    <section class="project-detail-hero wrap">
      <div class="project-detail-copy">
        <div class="card-top">
          <span class="tag">${project.routeLabel} · ${project.typeLabel}</span>
          <span class="status">${project.statusLabel}</span>
        </div>
        <div class="availability">${project.availabilityLabel}</div>
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
        <span>${t("project.currentFocus")}</span>
        <h2>${t("project.currentFocus")}</h2>
        <p>${project.currentFocus}</p>
      </article>
      <article>
        <span>${t("project.status")}</span>
        <h2>${project.statusLabel}</h2>
        <p>${project.availabilityLabel}</p>
      </article>
    </section>

    <section class="section wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${t("project.logs")}</p>
          <h2>${t("project.logsTitle")}</h2>
        </div>
        <p>${t("project.logsDesc")}</p>
      </div>
      <div id="project-lab-posts" class="lab-post-grid"></div>
    </section>

    <section class="section wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">${t("project.related")}</p>
          <h2>${t("project.relatedTitle")}</h2>
        </div>
        <p>${t("project.relatedDesc")}</p>
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
  document.querySelector("#project-detail-root").innerHTML = `<div class="wrap"><p class="error">${t("common.loadingError","내용을 불러오지 못했습니다.")}</p></div>`;
});
