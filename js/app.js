import {
  loadJson, initI18n, getLanguage, t, term, localizeProject, localizeLog,
  renderNav, assetUrl, setYear
} from "./core.js";

function formatActivityDate(value, language = "ko") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function formatLogDate(value, language = "ko") {
  const date = new Date(value + "T12:00:00");
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", {
    month: "short", day: "numeric"
  }).format(date);
}

async function boot() {
  try {
    await initI18n("");
    const language = getLanguage();

    const [site, projects, logs, activity, candidates] = await Promise.all([
      loadJson("content/site.json"),
      loadJson("content/projects.json"),
      loadJson("content/devlog.json"),
      loadJson("content/activity.json"),
      loadJson("content/lab-candidates.json")
    ]);

    document.querySelectorAll("[data-site-name]").forEach(el => el.textContent = site.name);
    renderNav(site, "");

    const visualMap = new Map();
    await Promise.all(projects.map(async project => {
      const urls = await Promise.all((project.visuals || []).map(key => assetUrl(key, "")));
      visualMap.set(project.id, urls);
    }));

    const pendingCandidates = candidates.filter(item => item.status === "PENDING");
    const projectMap = new Map(projects.map(project => [project.id, project]));
    const latestLinkedActivity = activity.find(item => item.project && projectMap.has(item.project));
    const currentProjectRaw = latestLinkedActivity ? projectMap.get(latestLinkedActivity.project) : projects[0];
    const currentProject = currentProjectRaw ? localizeProject(currentProjectRaw) : null;
    const latestActivity = activity[0] || null;

    const bannerProject = document.querySelector("#live-banner-project");
    const bannerText = document.querySelector("#live-banner-text");
    if (bannerProject) bannerProject.textContent = currentProject?.name || "TUKI WORLD";
    if (bannerText) bannerText.textContent = latestActivity?.title || (language === "en" ? "Waiting for new activity" : "새 활동을 기다리는 중");

    let heroProjectIndex = Math.max(0, projects.findIndex(project => project.id === currentProject?.id));

    function renderHeroProject() {
      const rawProject = projects[heroProjectIndex];
      if (!rawProject) return;
      const project = localizeProject(rawProject);
      const urls = visualMap.get(project.id) || [];

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
      if (images) {
        images.innerHTML = urls
          .map((url, index) => `<img src="${url}" alt="${project.name} 대표 이미지 ${index + 1}" />`)
          .join("");
        images.classList.toggle("is-duo", urls.length > 1);
        images.setAttribute("data-project", project.id);
      }
      if (status) status.textContent = project.statusLabel;
      if (route) route.textContent = `${project.routeLabel} · ${project.typeLabel}`;
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

    const projectCount = document.querySelector("#snapshot-project-count");
    const activityCount = document.querySelector("#snapshot-activity-count");
    const queueCount = document.querySelector("#snapshot-queue-count");
    if (projectCount) projectCount.textContent = projects.length;
    if (activityCount) activityCount.textContent = activity.length;
    if (queueCount) queueCount.textContent = pendingCandidates.length;

    const shortcuts = document.querySelector("#home-project-shortcuts");
    if (shortcuts) {
      shortcuts.innerHTML = projects.map(raw => {
        const project = localizeProject(raw);
        return `
          <a href="./projects/detail/?id=${encodeURIComponent(project.id)}">
            <span>${term(project.route)}</span>
            <strong>${project.name}</strong>
            <em>${project.statusLabel}</em>
          </a>
        `;
      }).join("");
    }

    const changeRoot = document.querySelector("#home-change-list");
    if (changeRoot) {
      const activityItems = activity.slice(0, 6).map(item => ({
        kind: "activity",
        sortDate: new Date(item.publishedAt).getTime(),
        label: term(item.kind),
        meta: item.sourceLabel,
        date: formatActivityDate(item.publishedAt, language),
        title: item.title,
        href: item.url,
        external: true
      }));

      const logItems = logs.slice(0, 6).map(rawLog => {
        const log = localizeLog(rawLog);
        return {
          kind: "log",
          sortDate: new Date(log.date + "T12:00:00").getTime(),
          label: log.typeLabel,
          meta: "TUKI LAB",
          date: formatLogDate(log.date, language),
          title: log.titleLabel,
          href: "./lab/",
          external: false
        };
      });

      const merged = [...activityItems, ...logItems]
        .sort((a, b) => b.sortDate - a.sortDate)
        .slice(0, 6);

      changeRoot.innerHTML = merged.map((item, index) => `
        <a class="change-row ${item.kind}" href="${item.href}" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>
          <span class="change-order">${String(index + 1).padStart(2, "0")}</span>
          <div class="change-copy">
            <div class="change-meta">
              <span>${item.label}</span>
              <b>${item.meta}</b>
              <time>${item.date}</time>
            </div>
            <strong>${item.title}</strong>
          </div>
          <span class="change-arrow">↗</span>
        </a>
      `).join("");
    }

    setYear();
  } catch (error) {
    console.error(error);
    document.body.classList.add("load-error");
  }
}

boot();
