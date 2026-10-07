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

function setupRevealMotion() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [
    document.querySelector(".ethos-ribbon"),
    document.querySelector(".core-platform"),
    document.querySelector(".overview-head"),
    document.querySelector(".recent-changes"),
    document.querySelector(".world-snapshot")
  ].filter(Boolean);

  targets.forEach((el, index) => {
    el.classList.add("reveal-unit");
    el.style.setProperty("--reveal-delay", `${Math.min(index * 70, 210)}ms`);
  });

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });

  targets.forEach(el => observer.observe(el));
}

function setupPointerMotion(showcase) {
  if (!showcase) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (reduced || coarse) return;

  const visual = showcase.querySelector(".showcase-visual");
  const ambient = document.querySelector("#ambient-cursor");
  let raf = 0;
  let latestEvent = null;

  const applyPointer = () => {
    raf = 0;
    const event = latestEvent;
    if (!event) return;

    if (ambient) {
      ambient.style.setProperty("--cursor-x", `${event.clientX}px`);
      ambient.style.setProperty("--cursor-y", `${event.clientY}px`);
      ambient.classList.add("is-active");
    }

    if (!visual) return;
    const rect = visual.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    const tiltY = (x - .5) * 2.4;
    const tiltX = (.5 - y) * 2.0;
    visual.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    visual.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    visual.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
    visual.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
  };

  window.addEventListener("pointermove", event => {
    latestEvent = event;
    if (!raf) raf = requestAnimationFrame(applyPointer);
  }, { passive: true });

  showcase.addEventListener("pointerleave", () => {
    visual?.style.setProperty("--tilt-x", "0deg");
    visual?.style.setProperty("--tilt-y", "0deg");
    visual?.style.setProperty("--spot-x", "50%");
    visual?.style.setProperty("--spot-y", "45%");
  });

  document.addEventListener("mouseleave", () => {
    ambient?.classList.remove("is-active");
  });
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
    const activityProjectRaw = latestLinkedActivity ? projectMap.get(latestLinkedActivity.project) : null;
    const currentProjectRaw = projectMap.get(site.featuredProjectId) || activityProjectRaw || projects[0];
    const currentProject = currentProjectRaw ? localizeProject(currentProjectRaw) : null;
    const latestActivity = activity[0] || null;
    const latestVerse8Post = activity.find(item =>
      item.source === "naver-ai" &&
      /verse\s*8/i.test((item.title || "") + " " + (item.summary || ""))
    );
    if (latestVerse8Post) {
      document.querySelectorAll("[data-verse8-blog-link]").forEach(link => {
        link.href = latestVerse8Post.url;
      });
      document.querySelectorAll("[data-verse8-blog-title]").forEach(el => {
        el.textContent = latestVerse8Post.title;
      });
    }

    const bannerProject = document.querySelector("#live-banner-project");
    const bannerText = document.querySelector("#live-banner-text");
    if (bannerProject) bannerProject.textContent = activityProjectRaw?.name || "TUKI WORLD";
    if (bannerText) bannerText.textContent = latestActivity?.title || (language === "en" ? "Waiting for new activity" : "새 활동을 기다리는 중");

    let heroProjectIndex = Math.max(0, projects.findIndex(project => project.id === currentProject?.id));
    let projectAnimating = false;
    const showcase = document.querySelector(".hero-v4-showcase");

    function renderHeroProject() {
      const rawProject = projects[heroProjectIndex];
      if (!rawProject) return;
      const project = localizeProject(rawProject);
      const urls = visualMap.get(project.id) || [];

      document.body.dataset.activeProject = project.id;

      const count = document.querySelector("#hero-showcase-count");
      const images = document.querySelector("#hero-showcase-images");
      const status = document.querySelector("#hero-showcase-status");
      const route = document.querySelector("#hero-showcase-route");
      const platform = document.querySelector("#hero-showcase-platform");
      const name = document.querySelector("#hero-showcase-name");
      const tagline = document.querySelector("#hero-showcase-tagline");
      const detail = document.querySelector("#hero-showcase-detail");
      const focus = document.querySelector("#hero-showcase-focus");
      const seasonNote = document.querySelector("#hero-showcase-season");
      if (seasonNote) {
        seasonNote.textContent = project.releaseLabel || project.seasonLabel || "";
        seasonNote.hidden = !(project.releaseLabel || project.seasonLabel);
      }
      const mood = document.querySelector("#world-theme-mood");
      if (mood) {
        const moodKey = "worldTheme." + project.id;
        mood.textContent = t(moodKey, "");
      }

      if (count) count.textContent = `${String(heroProjectIndex + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
      if (images) {
        images.innerHTML = urls
          .map((url, index) => `<img src="${url}" alt="${project.visualCaption || (project.name + " 대표 이미지 " + (index + 1))}" />`)
          .join("");
        images.classList.toggle("is-duo", urls.length > 1);
        images.setAttribute("data-project", project.id);
      }
      if (status) status.textContent = project.statusLabel;
      if (route) route.textContent = `${project.routeLabel} · ${project.typeLabel}`;
      if (platform) platform.textContent = project.platform;
      if (name) name.textContent = project.name;
      if (tagline) tagline.textContent = project.tagline;
      if (detail) detail.href = `./projects/${encodeURIComponent(project.id)}/`;
      if (focus) focus.textContent = project.currentFocus;
    }

    function changeHeroProject(direction) {
      if (!projects.length || projectAnimating) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || !showcase) {
        heroProjectIndex = direction === "next"
          ? (heroProjectIndex + 1) % projects.length
          : (heroProjectIndex - 1 + projects.length) % projects.length;
        renderHeroProject();
        return;
      }

      projectAnimating = true;
      showcase.classList.remove("is-project-enter", "is-next", "is-prev");
      showcase.classList.add(direction === "next" ? "is-next" : "is-prev", "is-project-exit");

      window.setTimeout(() => {
        heroProjectIndex = direction === "next"
          ? (heroProjectIndex + 1) % projects.length
          : (heroProjectIndex - 1 + projects.length) % projects.length;
        renderHeroProject();

        showcase.classList.remove("is-project-exit");
        showcase.classList.add("is-project-enter");

        window.setTimeout(() => {
          showcase.classList.remove("is-project-enter", "is-next", "is-prev");
          projectAnimating = false;
        }, 420);
      }, 145);
    }

    document.querySelector("#hero-project-prev")?.addEventListener("click", () => changeHeroProject("prev"));
    document.querySelector("#hero-project-next")?.addEventListener("click", () => changeHeroProject("next"));
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
          <a href="./projects/${encodeURIComponent(project.id)}/">
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

    setupPointerMotion(showcase);
    setupRevealMotion();
    setYear();
  } catch (error) {
    console.error(error);
    document.body.classList.add("load-error");
  }
}

boot();
