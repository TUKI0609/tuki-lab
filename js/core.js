export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 불러오기 실패");
  return response.json();
}

let i18nData = null;
let currentLanguage = "ko";
const LANGUAGE_KEY = "tuki-world-language";

export async function initI18n(base = "") {
  i18nData = await loadJson(base + "content/i18n.json");
  const saved = localStorage.getItem(LANGUAGE_KEY);
  currentLanguage = i18nData.supportedLanguages.includes(saved)
    ? saved
    : i18nData.defaultLanguage || "ko";

  document.documentElement.lang = currentLanguage;
  renderLanguageSwitcher();
  applyStaticTranslations(document);
  return currentLanguage;
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, fallback = "") {
  return i18nData?.strings?.[currentLanguage]?.[key]
    ?? i18nData?.strings?.ko?.[key]
    ?? fallback
    ?? key;
}

export function term(value = "") {
  return i18nData?.terms?.[currentLanguage]?.[value] ?? value;
}

export function localizeProject(project) {
  const override = i18nData?.projects?.[project.id]?.[currentLanguage] || {};
  return {
    ...project,
    name: override.name ?? project.name,
    tagline: override.tagline ?? project.tagline,
    currentFocus: override.currentFocus ?? project.currentFocus,
    releaseLabel: override.releaseLabel ?? project.releaseLabel ?? "",
    seasonLabel: override.seasonLabel ?? project.seasonLabel ?? "",
    visualCaption: override.visualCaption ?? project.visualCaption ?? "",
    routeLabel: term(project.route),
    typeLabel: term(project.type),
    statusLabel: term(project.status),
    availabilityLabel: term(project.availability)
  };
}

export function localizeCharacter(character) {
  const override = i18nData?.characters?.[character.id]?.[currentLanguage] || {};
  return {
    ...character,
    roleLabel: override.role ?? term(character.role),
    descriptionLabel: override.description ?? character.description
  };
}

export function localizeChannel(channel) {
  const override = i18nData?.channels?.[channel.id]?.[currentLanguage] || {};
  return {
    ...channel,
    nameLabel: override.name ?? channel.name,
    roleLabel: override.role ?? channel.role
  };
}

export function localizeLog(log) {
  const override = i18nData?.devlog?.[String(log.id)]?.[currentLanguage] || {};
  return {
    ...log,
    typeLabel: term(log.type),
    titleLabel: override.title ?? log.title,
    summaryLabel: override.summary ?? log.summary
  };
}

export function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n-html]").forEach(el => {
    const value = t(el.dataset.i18nHtml, el.innerHTML);
    if (value) el.innerHTML = value;
  });
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const value = t(el.dataset.i18n, el.textContent);
    if (value) el.textContent = value;
  });
  root.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const value = t(el.dataset.i18nAria, el.getAttribute("aria-label") || "");
    if (value) el.setAttribute("aria-label", value);
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const value = t(el.dataset.i18nTitle, el.getAttribute("title") || "");
    if (value) el.setAttribute("title", value);
  });
}

function renderLanguageSwitcher() {
  const navWrap = document.querySelector(".nav");
  if (!navWrap || navWrap.querySelector(".language-switch")) return;

  const switcher = document.createElement("div");
  switcher.className = "language-switch";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", currentLanguage === "ko" ? "언어 선택" : "Language");
  switcher.innerHTML = `
    <button type="button" data-language="ko" aria-pressed="${currentLanguage === "ko"}">한글</button>
    <button type="button" data-language="en" aria-pressed="${currentLanguage === "en"}">EN</button>
  `;

  switcher.querySelectorAll("[data-language]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.language === currentLanguage);
    button.addEventListener("click", () => {
      const next = button.dataset.language;
      if (next === currentLanguage) return;
      localStorage.setItem(LANGUAGE_KEY, next);
      location.reload();
    });
  });

  navWrap.appendChild(switcher);
}

let assetManifest = null;
const assetCache = new Map();

export async function loadAssetManifest(base = "") {
  if (!assetManifest) assetManifest = await loadJson(base + "assets/manifest.json");
  return assetManifest;
}

export async function assetUrl(key, base = "") {
  const cacheKey = base + key;
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey);

  const manifest = await loadAssetManifest(base);
  const asset = manifest.assets[key];
  if (!asset) throw new Error("등록되지 않은 asset: " + key);

  let url;
  if (asset.encoding === "url") {
    url = base + asset.path;
  } else {
    const text = await fetch(base + asset.path, { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error(asset.path + " 불러오기 실패");
      return r.text();
    });
    url = `data:${asset.mime};base64,${text.trim()}`;
  }

  assetCache.set(cacheKey, url);
  return url;
}

export async function hydrateAssets(root = document, base = "") {
  const images = [...root.querySelectorAll("img[data-asset]")];
  await Promise.all(images.map(async img => {
    try {
      img.src = await assetUrl(img.dataset.asset, base);
      img.classList.add("visual-ready");
    } catch (error) {
      img.classList.add("visual-failed");
      console.error(error);
    }
  }));
}

export function renderNav(site, base = "") {
  const root = document.querySelector("#main-nav");
  if (!root) return;
  root.innerHTML = site.navigation.map(item => {
    const href = item.href.startsWith("./") ? base + item.href.slice(2) : item.href;
    const label = item.i18n ? t(item.i18n, item.label) : item.label;
    return `<a href="${href}">${label}</a>`;
  }).join("");
}

export function renderProjectLinks(links = []) {
  if (!links.length) return `<span class="project-wait">${term("NOT YET PUBLIC")}</span>`;
  return links.map(link => {
    const label = link.label === "PLAY" ? term("PLAY") : link.label;
    return `<a class="project-link" href="${link.url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }).join("");
}

export function renderProjectVisual(project) {
  const visuals = project.visuals || [];
  if (!visuals.length) return "";
  const cls = visuals.length > 1 ? "project-visual duo" : "project-visual";
  return `<div class="${cls} project-visual-${project.id}">
    ${visuals.map((visual, i) => `<img data-asset="${visual}" alt="${project.visualCaption || (project.name + " 대표 이미지 " + (i + 1))}" />`).join("")}
  </div>`;
}

export function projectCard(project, base = "") {
  const p = localizeProject(project);
  return `
    <article class="card project-card project-card-${p.id}" id="${p.id}">
      ${renderProjectVisual(p)}
      <div class="card-body">
        <div class="card-top">
          <span class="tag">${p.routeLabel} · ${p.typeLabel}</span>
          <span class="status">${p.statusLabel}</span>
        </div>
        <div class="availability">${p.availabilityLabel}</div>
        <h3>${p.name}</h3>
        <p>${p.tagline}</p>
        ${(p.releaseLabel || p.seasonLabel) ? `<div class="project-season">${p.releaseLabel || p.seasonLabel}</div>` : ""}
        <div class="project-origin">${p.platform}</div>
        <div class="meta">${p.currentFocus}</div>
        <div class="project-links">
          <a class="project-link secondary" href="${base}projects/${encodeURIComponent(p.id)}/">${t("common.details","상세 보기 →")}</a>
          ${renderProjectLinks(p.links)}
        </div>
      </div>
    </article>
  `;
}

export function renderProjectGrid(projects, rootSelector = "#project-grid", base = "") {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.innerHTML = projects.map(project => projectCard(project, base)).join("");
}

export function renderLabPosts(posts, rootSelector = "#published-lab", base = "", limit = null) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const list = limit ? posts.slice(0, limit) : posts;

  if (!list.length) {
    root.innerHTML = `<p class="lab-post-empty">${t("common.emptyLab")}</p>`;
    return;
  }

  root.innerHTML = list.map(post => `
    <a class="lab-post-card" href="${base}lab/article/?slug=${encodeURIComponent(post.slug)}">
      <div class="lab-post-meta">
        <span>${term(post.type)}</span>
        <span>${post.project ? post.project.toUpperCase() : "TUKI"}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.summary || ""}</p>
      <div class="lab-post-foot">
        <time datetime="${post.publishedAt}">${post.publishedAt}</time>
        <span>${t("common.read","읽기 →")}</span>
      </div>
    </a>
  `).join("");
}

export function renderLabList(logs, rootSelector = "#devlog-list", limit = null) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const items = limit ? logs.slice(0, limit) : logs;
  root.innerHTML = items.map(raw => {
    const log = localizeLog(raw);
    return `
      <article class="log-item">
        <span class="log-type">${log.typeLabel}</span>
        <div>
          <strong class="log-title">${log.titleLabel}</strong>
          ${log.summaryLabel ? `<p>${log.summaryLabel}</p>` : ""}
        </div>
        <time class="log-date" datetime="${log.date}">${log.date}</time>
      </article>
    `;
  }).join("");
}

export function renderActivityList(items, rootSelector = "#activity-list", limit = null) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) {
    root.innerHTML = `<p class="activity-empty">${t("common.emptyActivity")}</p>`;
    return;
  }

  const locale = currentLanguage === "en" ? "en-US" : "ko-KR";
  root.innerHTML = list.map(item => {
    const date = new Date(item.publishedAt);
    const dateText = Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat(locale, { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(date);
    return `
      <a class="activity-item source-${item.source}" href="${item.url}" target="_blank" rel="noopener noreferrer">
        <div class="activity-meta">
          <span class="activity-source">${item.sourceLabel}</span>
          <span class="activity-kind">${term(item.kind)}</span>
          <span class="activity-route">${term(item.route || "")}</span>
        </div>
        <strong>${item.title}</strong>
        ${item.summary ? `<p>${item.summary}</p>` : ""}
        <div class="activity-foot">
          <time datetime="${item.publishedAt}">${dateText}</time>
          <span>${t("common.openOriginal","원문 보기 ↗")}</span>
        </div>
      </a>
    `;
  }).join("");
}

function renderChannelIcon(id) {
  if (id === "youtube") {
    return `
      <span class="channel-icon channel-icon-youtube" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.8 31.8 0 0 0 0 12a31.8 31.8 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.8 31.8 0 0 0 24 12a31.8 31.8 0 0 0-.5-5.8ZM9.6 15.7V8.3L16 12l-6.4 3.7Z"/>
        </svg>
      </span>
    `;
  }
  if (id === "x") {
    return `
      <span class="channel-icon channel-icon-x" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.5 22H3.4l7.3-8.4L1 2h6.3l4.3 5.7L18.9 2Zm-1.1 18h1.7L6.2 3.9H4.4L17.8 20Z"/>
        </svg>
      </span>
    `;
  }
  if (id === "naver-ai" || id === "naver-game") {
    return `
      <span class="channel-icon channel-icon-naver" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M4 4h6.4l5.2 7.5V4H20v16h-6.1L8.4 12.1V20H4V4Z"/>
        </svg>
      </span>
    `;
  }
  return `
    <span class="channel-icon channel-icon-generic" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="7.5"/>
      </svg>
    </span>
  `;
}

export function renderChannels(channels, rootSelector = "#channel-list") {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.innerHTML = channels.map(raw => {
    const channel = localizeChannel(raw);
    return `
      <a class="channel-row channel-row-${channel.id}" href="${channel.url}" target="_blank" rel="noopener noreferrer">
        ${renderChannelIcon(channel.id)}
        <strong>${channel.nameLabel}</strong>
        <span>${channel.roleLabel}</span>
        <b class="channel-external" aria-hidden="true">↗</b>
      </a>
    `;
  }).join("");
}

export function renderCharacters(characters, rootSelector = "#character-grid") {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.innerHTML = characters.map(raw => {
    const character = localizeCharacter(raw);
    const visuals = character.visuals || [];
    const mediaClass = visuals.length > 1 ? "character-media duo-media" : "character-media";
    return `
      <article class="character-card">
        <div class="${mediaClass}">
          ${visuals.map(v => `<img data-asset="${v}" alt="${character.name}" />`).join("")}
        </div>
        <div>
          <span>${character.roleLabel}</span>
          <h3>${character.name}</h3>
          <p>${character.descriptionLabel}</p>
        </div>
      </article>
    `;
  }).join("");
}

export function setYear() {
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}


// TUKI WORLD: consent-first, site-wide Google Analytics 4.
// This shared module is imported by both the homepage and secondary pages.
const TUKI_GA_ID = "G-Q6JMT9XLVP";
const TUKI_ANALYTICS_CHOICE = "tuki-world-analytics-consent-v1";

function startTukiAnalytics() {
  if (window.__tukiAnalyticsStarted) return;
  window.__tukiAnalyticsStarted = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("consent", "update", { analytics_storage: "granted" });
  window.gtag("js", new Date());
  window.gtag("config", TUKI_GA_ID, { anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(TUKI_GA_ID);
  document.head.appendChild(script);
}

function initTukiAnalyticsConsent() {
  // No GA request is initiated until the visitor opts in.
  const stored = (() => {
    try { return localStorage.getItem(TUKI_ANALYTICS_CHOICE); } catch { return null; }
  })();
  if (stored === "accepted") startTukiAnalytics();

  const style = document.createElement("style");
  style.textContent = `
    .tuki-privacy-settings{position:fixed;bottom:14px;left:14px;z-index:10000;
      border:1px solid #66766b;border-radius:999px;padding:8px 12px;
      background:#1b2721;color:#fff;font:12px/1.4 system-ui,sans-serif;cursor:pointer}
    .tuki-privacy-banner{position:fixed;bottom:58px;left:14px;right:14px;
      max-width:560px;z-index:10001;padding:17px;border:1px solid #788c7d;
      border-radius:14px;background:#1b2721;color:#fff;
      box-shadow:0 10px 35px #0007;font:14px/1.55 system-ui,sans-serif}
    .tuki-privacy-banner p{margin:8px 0 12px;color:#e0e9e1}
    .tuki-privacy-banner a{color:#bbdfd0;text-decoration:underline}
    .tuki-privacy-actions{display:flex;gap:9px;flex-wrap:wrap}
    .tuki-privacy-actions button{cursor:pointer;border:1px solid #a7c2af;
      border-radius:8px;padding:8px 14px;background:#253a2f;color:#fff;font:inherit}
    .tuki-privacy-actions button:first-child{background:#c6ead1;color:#122719}
    @media(max-width:600px){.tuki-privacy-settings{bottom:80px}
      .tuki-privacy-banner{bottom:124px;max-height:55vh;overflow:auto}}
  `;
  document.head.appendChild(style);

  const policyLink = document.createElement("a");
  policyLink.href = (location.pathname.includes("/tuki-lab/") ? "/tuki-lab/" : "/") + "privacy/";
  policyLink.textContent = "개인정보처리방침";
  policyLink.style.cssText = "display:inline-block;margin-left:12px;color:inherit;text-decoration:underline;font:12px system-ui,sans-serif";
  document.querySelector("footer .footer-inner")?.appendChild(policyLink);

  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "tuki-privacy-settings";
  settings.textContent = "분석 설정";
  settings.setAttribute("aria-label", "방문 통계 수집 동의 설정 열기");
  document.body.appendChild(settings);

  const banner = document.createElement("section");
  banner.className = "tuki-privacy-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "방문 통계 수집 동의");
  banner.innerHTML = `
    <strong>방문 통계 수집 안내</strong>
    <p>사이트 개선을 위해 Google Analytics 4를 사용하려고 합니다.
    동의하면 페이지 방문과 이용 정보가 Google로 전송될 수 있으며
    분석 관련 식별자와 쿠키가 사용될 수 있습니다.
    거부해도 사이트를 이용할 수 있습니다.
    <a href="https://policies.google.com/privacy?hl=ko" target="_blank"
    rel="noopener noreferrer">Google 개인정보처리방침</a> ·
    <a href="${policyLink.href}">TUKI WORLD 개인정보처리방침</a></p>
    <div class="tuki-privacy-actions">
      <button type="button" data-tuki-consent="accepted">분석 허용</button>
      <button type="button" data-tuki-consent="rejected">거부</button>
    </div>
  `;
  document.body.appendChild(banner);

  function showBanner() { banner.hidden = false; banner.style.display = "block"; }
  function hideBanner() { banner.hidden = true; banner.style.display = "none"; }
  settings.addEventListener("click", showBanner);
  banner.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-tuki-consent]")?.dataset.tukiConsent;
    if (!choice) return;
    try { localStorage.setItem(TUKI_ANALYTICS_CHOICE, choice); } catch {}
    hideBanner();
    if (choice === "accepted") startTukiAnalytics();
    // Withdrawing consent stops subsequent visits from tracking. To immediately
    // stop an already loaded tag in this tab, reload without restarting it.
    if (choice === "rejected" && window.__tukiAnalyticsStarted) {
      if (typeof window.gtag === "function") window.gtag("consent", "update", {analytics_storage: "denied"});
      window.location.reload();
    }
  });
  if (stored === "accepted" || stored === "rejected") hideBanner();
  else showBanner();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTukiAnalyticsConsent, { once: true });
} else {
  initTukiAnalyticsConsent();
}
