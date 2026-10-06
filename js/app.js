import {
  loadJson, renderNav, renderProjectLinks,
  renderChannels, renderCharacters, assetUrl, hydrateAssets, setYear
} from "./core.js";

function formatActivityDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function shortProjectLabel(name = "") {
  if (name === "LUTRATIDE SURVIVORS") return "LUTRATIDE";
  return name;
}

async function boot() {
  try {
    const [site, projects, logs, channels, characters, activity, candidates] = await Promise.all([
      loadJson("content/site.json"),
      loadJson("content/projects.json"),
      loadJson("content/devlog.json"),
      loadJson("content/channels.json"),
      loadJson("content/characters.json"),
      loadJson("content/activity.json"),
      loadJson("content/lab-candidates.json")
    ]);

    document.querySelectorAll("[data-site-name]").forEach(el => el.textContent = site.name);

    renderNav(site, "");
    renderChannels(channels);
    renderCharacters(characters);

    const visualMap = new Map();
    await Promise.all(projects.map(async project => {
      const urls = await Promise.all((project.visuals || []).map(key => assetUrl(key, "")));
      visualMap.set(project.id, urls);
    }));

    const pendingCandidates = candidates.filter(item => item.status === "PENDING");
    const projectMap = new Map(projects.map(project => [project.id, project]));
    const latestLinkedActivity = activity.find(item => item.project && projectMap.has(item.project));
    const latestActivity = activity[0] || null;
    const currentProject = latestLinkedActivity ? projectMap.get(latestLinkedActivity.project) : projects[0];

    const projectCount = document.querySelector("#hero-project-count");
    const candidateCount = document.querySelector("#hero-candidate-count");
    if (projectCount) projectCount.textContent = projects.length;
    if (candidateCount) candidateCount.textContent = pendingCandidates.length;

    const bannerProject = document.querySelector("#live-banner-project");
    const bannerText = document.querySelector("#live-banner-text");
    if (bannerProject) bannerProject.textContent = currentProject ? currentProject.name : "TUKI WORLD";
    if (bannerText) bannerText.textContent = latestActivity ? latestActivity.title : "새 활동을 기다리는 중";

    const nowProject = document.querySelector("#tuki-now-project");
    const nowFocus = document.querySelector("#tuki-now-focus");
    const nowActivity = document.querySelector("#tuki-now-activity");
    const nowCandidates = document.querySelector("#tuki-now-candidates");
    if (currentProject && nowProject) {
      nowProject.textContent = currentProject.name;
      nowProject.href = `./projects/detail/?id=${encodeURIComponent(currentProject.id)}`;
    }
    if (currentProject && nowFocus) nowFocus.textContent = currentProject.currentFocus;
    if (nowActivity) nowActivity.textContent = activity.length;
    if (nowCandidates) nowCandidates.textContent = pendingCandidates.length;

    const panel = document.querySelector("#tuki-now");
    document.querySelector("#tuki-now-toggle")?.addEventListener("click", () => panel?.classList.add("is-collapsed"));
    document.querySelector("#tuki-now-restore")?.addEventListener("click", () => panel?.classList.remove("is-collapsed"));

    let heroProjectIndex = Math.max(0, projects.findIndex(project => project.id === currentProject?.id));

    function projectImagesMarkup(project, className = "") {
      const urls = visualMap.get(project.id) || [];
      const duo = urls.length > 1 ? " is-duo" : "";
      return `<div class="${className}${duo}">
        ${urls.map((url, index) => `<img src="${url}" alt="${project.name} 대표 이미지 ${index + 1}" />`).join("")}
      </div>`;
    }

    function renderHeroProject() {
      const project = projects[heroProjectIndex];
      if (!project) return;

      const count = document.querySelector("#hero-showcase-count");
      const images = document.querySelector("#hero-showcase-images");
      const status = document.querySelector("#hero-showcase-status");
      const route = document.querySelector("#hero-showcase-route");
      const platform = document.querySelector("#hero-showcase-platform");
      const name = document.querySelector("#hero-showcase-name");
      const tagline = document.querySelector("#hero-showcase-tagline");
      const detail = document.querySelector("#hero-showcase-detail");
      const focus = document.querySelector("#hero-showcase-focus");

      if (count) count.textContent = `${String(heroProjectIndex + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
      if (images) images.innerHTML = (visualMap.get(project.id) || [])
        .map((url, index) => `<img src="${url}" alt="${project.name} 대표 이미지 ${index + 1}" />`).join("");
      images?.classList.toggle("is-duo", (visualMap.get(project.id) || []).length > 1);
      images?.setAttribute("data-project", project.id);
      if (status) status.textContent = project.status;
      if (route) route.textContent = `${project.route} · ${project.type}`;
      if (platform) platform.textContent = project.platform;
      if (name) name.textContent = project.name;
      if (tagline) tagline.textContent = project.tagline;
      if (detail) detail.href = `./projects/detail/?id=${encodeURIComponent(project.id)}`;
      if (focus) focus.textContent = project.currentFocus;
    }

    document.querySelector("#hero-project-prev")?.addEventListener("click", () => {
      heroProjectIndex = (heroProjectIndex - 1 + projects.length) % projects.length;
      renderHeroProject();
    });
    document.querySelector("#hero-project-next")?.addEventListener("click", () => {
      heroProjectIndex = (heroProjectIndex + 1) % projects.length;
      renderHeroProject();
    });
    renderHeroProject();

    const pickerTabs = document.querySelector("#project-picker-tabs");
    const projectStage = document.querySelector("#project-stage");
    let selectedProjectId = currentProject?.id || projects[0]?.id;

    function renderProjectStage(projectId) {
      const project = projectMap.get(projectId) || projects[0];
      if (!project || !projectStage) return;
      selectedProjectId = project.id;

      [...pickerTabs?.querySelectorAll("[data-project-pick]") || []].forEach(button => {
        const active = button.dataset.projectPick === project.id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });

      const externalLinks = project.links?.length
        ? renderProjectLinks(project.links)
        : '<span class="project-wait">NOT YET PUBLIC</span>';

      projectStage.innerHTML = `
        <div class="project-stage-visual stage-${project.id}">
          <span class="project-stage-index">SELECTED / ${String(projects.findIndex(p => p.id === project.id) + 1).padStart(2, "0")}</span>
          ${projectImagesMarkup(project, "stage-images")}
          <span class="project-stage-mark">TRY AGAIN</span>
        </div>
        <div class="project-stage-copy">
          <div class="project-stage-meta">
            <span>${project.route} · ${project.type}</span>
            <b>${project.status}</b>
          </div>
          <h3>${project.name}</h3>
          <p class="project-stage-tagline">${project.tagline}</p>
          <div class="project-stage-focus">
            <span>NOW FIXING</span>
            <strong>${project.currentFocus}</strong>
          </div>
          <div class="project-stage-actions">
            <a class="project-stage-primary" href="./projects/detail/?id=${encodeURIComponent(project.id)}">DETAILS ↗</a>
            ${externalLinks}
          </div>
        </div>
      `;
    }

    if (pickerTabs) {
      pickerTabs.innerHTML = projects.map(project => `
        <button type="button" role="tab" aria-selected="false" data-project-pick="${project.id}">
          <span>${project.route}</span>
          <strong>${shortProjectLabel(project.name)}</strong>
        </button>
      `).join("");

      pickerTabs.querySelectorAll("[data-project-pick]").forEach(button => {
        button.addEventListener("click", () => renderProjectStage(button.dataset.projectPick));
      });
      renderProjectStage(selectedProjectId);
    }

    const activityRoot = document.querySelector("#activity-list");
    if (activityRoot) {
      activityRoot.innerHTML = activity.slice(0, 5).map((item, index) => `
        <a class="signal-row" href="${item.url}" target="_blank" rel="noopener noreferrer">
          <div class="signal-index">
            <i></i>
            <span>${String(index + 1).padStart(2, "0")}</span>
          </div>
          <div class="signal-main">
            <div class="signal-meta"><span>${item.sourceLabel}</span><time>${formatActivityDate(item.publishedAt)}</time></div>
            <strong>${item.title}</strong>
          </div>
          <span class="signal-arrow">↗</span>
        </a>
      `).join("");
    }

    const labRoot = document.querySelector("#devlog-list");
    if (labRoot) {
      labRoot.innerHTML = logs.slice(0, 5).map((log, index) => `
        <article class="build-note note-${(index % 3) + 1}">
          <div class="build-note-top">
            <span>${log.type}</span>
            <time>${log.date}</time>
          </div>
          <strong>${log.title}</strong>
          ${log.summary ? `<p>${log.summary}</p>` : ""}
          <b aria-hidden="true">${String(log.id).padStart(3, "0")}</b>
        </article>
      `).join("");
    }

    const tabProjectCount = document.querySelector("#tab-project-count");
    const tabActivityCount = document.querySelector("#tab-activity-count");
    const tabLabCount = document.querySelector("#tab-lab-count");
    if (tabProjectCount) tabProjectCount.textContent = projects.length;
    if (tabActivityCount) tabActivityCount.textContent = activity.length;
    if (tabLabCount) tabLabCount.textContent = logs.length;

    const tabButtons = [...document.querySelectorAll("[data-world-tab]")];
    const tabPanels = [...document.querySelectorAll("[data-world-panel]")];

    function openWorldTab(name, { scroll = false } = {}) {
      tabButtons.forEach(button => {
        const active = button.dataset.worldTab === name;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      tabPanels.forEach(tabPanel => {
        const active = tabPanel.dataset.worldPanel === name;
        tabPanel.classList.toggle("is-active", active);
        tabPanel.hidden = !active;
      });
      if (scroll) document.querySelector("#deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    tabButtons.forEach(button => {
      button.addEventListener("click", () => openWorldTab(button.dataset.worldTab));
    });
    document.querySelectorAll("[data-open-tab]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        openWorldTab(link.dataset.openTab, { scroll: true });
      });
    });

    const sectionTargets = ["top", "deck", "channels"]
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const dockLinks = [...document.querySelectorAll("[data-dock-section]")];
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        dockLinks.forEach(link => {
          link.classList.toggle("is-active", link.dataset.dockSection === visible.target.id);
        });
      }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.2, 0.5] });
      sectionTargets.forEach(section => observer.observe(section));
    }

    await hydrateAssets(document, "");
    setYear();
  } catch (error) {
    console.error(error);
    document.body.classList.add("load-error");
  }
}

boot();
