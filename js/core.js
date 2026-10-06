export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 불러오기 실패");
  return response.json();
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
    return `<a href="${href}">${item.label}</a>`;
  }).join("");
}

export function renderProjectLinks(links = []) {
  if (!links.length) return '<span class="project-wait">NOT YET PUBLIC</span>';
  return links.map(link => `<a class="project-link" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join("");
}

export function renderProjectVisual(project) {
  const visuals = project.visuals || [];
  if (!visuals.length) return "";
  const cls = visuals.length > 1 ? "project-visual duo" : "project-visual";
  return `<div class="${cls} project-visual-${project.id}">
    ${visuals.map((visual, i) => `<img data-asset="${visual}" alt="${project.name} 대표 이미지 ${i + 1}" />`).join("")}
  </div>`;
}

export function projectCard(project, base = "") {
  return `
    <article class="card project-card project-card-${project.id}" id="${project.id}">
      ${renderProjectVisual(project)}
      <div class="card-body">
        <div class="card-top">
          <span class="tag">${project.route} · ${project.type}</span>
          <span class="status">${project.status}</span>
        </div>
        <div class="availability">${project.availability}</div>
        <h3>${project.name}</h3>
        <p>${project.tagline}</p>
        <div class="project-origin">${project.platform}</div>
        <div class="meta">${project.currentFocus}</div>
        <div class="project-links">
          <a class="project-link secondary" href="${base}projects/detail/?id=${encodeURIComponent(project.id)}">DETAILS →</a>
          ${renderProjectLinks(project.links)}
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
    root.innerHTML = '<p class="lab-post-empty">아직 승인된 정식 LAB 글이 없습니다. 후보 승인 후 이곳에 쌓입니다.</p>';
    return;
  }

  root.innerHTML = list.map(post => `
    <a class="lab-post-card" href="${base}lab/article/?slug=${encodeURIComponent(post.slug)}">
      <div class="lab-post-meta">
        <span>${post.type}</span>
        <span>${post.project ? post.project.toUpperCase() : "TUKI"}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.summary || ""}</p>
      <div class="lab-post-foot">
        <time datetime="${post.publishedAt}">${post.publishedAt}</time>
        <span>읽기 →</span>
      </div>
    </a>
  `).join("");
}

export function renderLabList(logs, rootSelector = "#devlog-list", limit = null) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const items = limit ? logs.slice(0, limit) : logs;
  root.innerHTML = items.map(log => `
    <article class="log-item">
      <span class="log-type">${log.type}</span>
      <div>
        <strong class="log-title">${log.title}</strong>
        ${log.summary ? `<p>${log.summary}</p>` : ""}
      </div>
      <time class="log-date" datetime="${log.date}">${log.date}</time>
    </article>
  `).join("");
}


export function renderActivityList(items, rootSelector = "#activity-list", limit = null) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) {
    root.innerHTML = '<p class="activity-empty">아직 자동 수집된 활동이 없습니다. 첫 동기화 후 여기에 표시됩니다.</p>';
    return;
  }
  root.innerHTML = list.map(item => {
    const date = new Date(item.publishedAt);
    const dateText = Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat("ko-KR", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(date);
    return `
      <a class="activity-item source-${item.source}" href="${item.url}" target="_blank" rel="noopener noreferrer">
        <div class="activity-meta">
          <span class="activity-source">${item.sourceLabel}</span>
          <span class="activity-kind">${item.kind}</span>
          <span class="activity-route">${item.route || ""}</span>
        </div>
        <strong>${item.title}</strong>
        ${item.summary ? `<p>${item.summary}</p>` : ""}
        <div class="activity-foot">
          <time datetime="${item.publishedAt}">${dateText}</time>
          <span>원문 보기 ↗</span>
        </div>
      </a>
    `;
  }).join("");
}

export function renderChannels(channels, rootSelector = "#channel-list") {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.innerHTML = channels.map(channel => `
    <a class="channel-row" href="${channel.url}" target="_blank" rel="noopener noreferrer">
      <strong>${channel.name}</strong>
      <span>${channel.role}</span>
      <b aria-hidden="true">↗</b>
    </a>
  `).join("");
}

export function renderCharacters(characters, rootSelector = "#character-grid") {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.innerHTML = characters.map(character => {
    const visuals = character.visuals || [];
    const mediaClass = visuals.length > 1 ? "character-media duo-media" : "character-media";
    return `
      <article class="character-card">
        <div class="${mediaClass}">
          ${visuals.map(v => `<img data-asset="${v}" alt="${character.name}" />`).join("")}
        </div>
        <div>
          <span>${character.role}</span>
          <h3>${character.name}</h3>
          <p>${character.description}</p>
        </div>
      </article>
    `;
  }).join("");
}

export function setYear() {
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}
