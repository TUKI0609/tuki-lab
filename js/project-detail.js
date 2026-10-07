import {
  loadJson, initI18n, t, localizeProject, renderNav, renderProjectVisual, renderProjectLinks,
  renderLabPosts, renderActivityList, hydrateAssets, setYear
} from "./core.js";

const base = "../../";

async function boot() {
  await initI18n(base);

  const queryId = new URLSearchParams(location.search).get("id");
  const staticId = document.body.dataset.projectId || "";
  if (!staticId && queryId && location.pathname.includes("/projects/detail/")) {
    location.replace(`${base}projects/${encodeURIComponent(queryId)}/`);
    return;
  }
  const id = staticId || queryId;
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
  const canonicalUrl = `https://tuki0609.github.io/tuki-lab/projects/${encodeURIComponent(project.id)}/`;
  const description = project.tagline + (project.currentFocus ? ` 현재 작업: ${project.currentFocus}` : "");
  const setMeta = (selector, value, attr = "content") => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', description);
  setMeta('meta[name="robots"]', "index,follow,max-image-preview:large");
  setMeta('meta[property="og:title"]', document.title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[name="twitter:title"]', document.title);
  setMeta('meta[name="twitter:description"]', description);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = canonicalUrl;
  const projectPosts = posts.filter(post => post.project === project.id);
  const projectActivity = activity.filter(item => item.project === project.id);


  const historyMarkup = project.history?.length ? `
    <section class="section wrap project-history-section" aria-label="${t("project.historyEyebrow")}">
      <div class="section-head project-history-intro">
        <div>
          <p class="eyebrow">${t("project.historyEyebrow")}</p>
          <h2>${t("project.historyTitle")}</h2>
        </div>
        <p>${t("project.historyDesc")}</p>
      </div>
      <div class="project-history-list">
        ${project.history.map(entry => {
          const lang = document.documentElement.lang === "en" ? "en" : "ko";
          const title = entry.title?.[lang] || entry.title?.ko || "";
          const summary = entry.summary?.[lang] || entry.summary?.ko || "";
          const labels = entry.highlights?.[lang] || entry.highlights?.ko || [];
          const dateLabel = entry.dateLabel?.[lang] || entry.dateLabel?.ko || "";
          const stage = entry.stage?.[lang] || entry.stage?.ko || "";
          const credit = entry.attribution?.[lang] || entry.attribution?.ko || "";
          const link = entry.source?.url;
          return `
            <article class="project-history-entry">
              <div class="project-history-date">
                ${entry.date ? `<time datetime="${entry.date}">${dateLabel}</time>` : `<span>${dateLabel}</span>`}
                <span class="project-history-marker" aria-hidden="true"></span>
              </div>
              <div class="project-history-copy">
                <span class="project-history-stage">${stage}</span>
                <h3>${title}</h3>
                <p>${summary}</p>
                <div class="project-history-highlights">
                  ${labels.map(label => `<span>${label}</span>`).join("")}
                </div>
                ${credit ? `<p class="project-history-credit">${credit}</p>` : ""}
                ${link ? `<a class="project-history-link" href="${link}" target="_blank" rel="noopener noreferrer">${entry.source.label} · ${t("project.historySource")}</a>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  ` : "";

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
        ${(project.releaseLabel || project.seasonLabel) ? `<div class="project-season project-season-detail">${project.releaseLabel || project.seasonLabel}</div>` : ""}
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

    ${historyMarkup}

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
