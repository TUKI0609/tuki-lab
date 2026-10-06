import {
  loadJson, renderNav, renderProjectGrid, renderLabList,
  renderChannels, renderCharacters, renderActivityList, hydrateAssets, setYear
} from "./core.js";

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
    document.querySelectorAll("[data-site-tagline]").forEach(el => el.textContent = site.tagline);
    document.querySelectorAll("[data-site-description]").forEach(el => el.textContent = site.description);

    renderNav(site, "");
    renderProjectGrid(projects);
    renderLabList(logs, "#devlog-list", 4);
    renderChannels(channels);
    renderCharacters(characters);
    renderActivityList(activity, "#activity-list", 4);

    const pendingCandidates = candidates.filter(item => item.status === "PENDING");
    const projectMap = new Map(projects.map(project => [project.id, project]));
    const latestLinkedActivity = activity.find(item => item.project && projectMap.has(item.project));
    const latestActivity = activity[0] || null;
    const currentProject = latestLinkedActivity ? projectMap.get(latestLinkedActivity.project) : projects[0];

    const projectCount = document.querySelector("#hero-project-count");
    const candidateCount = document.querySelector("#hero-candidate-count");
    if (projectCount) projectCount.textContent = projects.length;
    if (candidateCount) candidateCount.textContent = pendingCandidates.length;

    const nodeRoot = document.querySelector("#hero-project-nodes");
    if (nodeRoot) {
      nodeRoot.innerHTML = projects.slice(0, 3).map((project, index) => `
        <a class="project-node node-${index + 1}" href="./projects/detail/?id=${encodeURIComponent(project.id)}">
          <span class="node-pulse"></span>
          <small>${project.route}</small>
          <strong>${project.name}</strong>
          <em>${project.status}</em>
        </a>
      `).join("");
    }

    const latestSignal = document.querySelector("#hero-latest-signal");
    const latestSource = document.querySelector("#hero-latest-source");
    if (latestActivity) {
      if (latestSignal) latestSignal.textContent = latestActivity.title;
      if (latestSource) latestSource.textContent = `${latestActivity.sourceLabel} · ${latestActivity.kind}`;
    }

    const bannerProject = document.querySelector("#live-banner-project");
    const bannerText = document.querySelector("#live-banner-text");
    if (bannerProject) bannerProject.textContent = currentProject ? currentProject.name : "TUKI WORLD";
    if (bannerText) {
      bannerText.textContent = latestActivity
        ? latestActivity.title
        : "새 활동을 기다리는 중";
    }

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
    const panelToggle = document.querySelector("#tuki-now-toggle");
    const panelRestore = document.querySelector("#tuki-now-restore");
    panelToggle?.addEventListener("click", () => panel?.classList.add("is-collapsed"));
    panelRestore?.addEventListener("click", () => panel?.classList.remove("is-collapsed"));

    const sectionTargets = ["top", "activity", "lab", "channels"]
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
      tabPanels.forEach(panel => {
        const active = panel.dataset.worldPanel === name;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
      if (scroll) document.querySelector("#deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    tabButtons.forEach(button => {
      button.addEventListener("click", () => openWorldTab(button.dataset.worldTab));
    });

    document.querySelectorAll("[data-open-tab]").forEach(link => {
      link.addEventListener("click", event => {
        const name = link.dataset.openTab;
        if (!name) return;
        event.preventDefault();
        openWorldTab(name, { scroll: true });
      });
    });

    const routeRoot = document.querySelector("#route-grid");
    if (routeRoot) {
      routeRoot.innerHTML = site.routes.map(route => `
        <a class="route-card ${route.id}" href="${route.target}">
          <span class="route-kicker">${route.label}</span>
          <strong>${route.title}</strong>
          <p>${route.description}</p>
          <span class="route-arrow">→</span>
        </a>
      `).join("");
    }

    await hydrateAssets(document, "");
    setYear();
  } catch (error) {
    console.error(error);
    document.body.classList.add("load-error");
  }
}
boot();
