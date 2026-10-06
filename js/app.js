async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 불러오기 실패");
  return response.json();
}

const visualCache = new Map();
const visualMime = {
  tuki: "image/png",
  momo: "image/png"
};

async function visualDataUrl(key) {
  if (!visualCache.has(key)) {
    visualCache.set(key, fetch(`assets/visuals/${key}.b64`, { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error(key + " visual 불러오기 실패");
        return r.text();
      })
      .then(data => `data:${visualMime[key] || "image/webp"};base64,${data.trim()}`));
  }
  return visualCache.get(key);
}

async function hydrateVisuals() {
  const images = [...document.querySelectorAll("img[data-visual]")];
  await Promise.all(images.map(async img => {
    try {
      img.src = await visualDataUrl(img.dataset.visual);
      img.classList.add("visual-ready");
    } catch (error) {
      img.closest(".project-visual, .character-media, .guide-orbit")?.classList.add("visual-failed");
      console.error(error);
    }
  }));
}

function renderProjectLinks(links = []) {
  if (!links.length) return '<span class="project-wait">공개 링크 준비 중</span>';
  return links.map(link => `<a class="project-link" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join("");
}

function renderProjectVisual(project) {
  const visuals = project.visuals || [];
  if (!visuals.length) return "";
  const cls = visuals.length > 1 ? "project-visual duo" : "project-visual";
  return `<div class="${cls} project-visual-${project.slug}">
    ${visuals.map((visual, i) => `<img data-visual="${visual}" alt="${project.name} 대표 이미지 ${i + 1}" />`).join("")}
  </div>`;
}

function renderProjects(projects) {
  const root = document.querySelector("#project-grid");
  root.innerHTML = projects.map(project => `
    <article class="card project-card project-card-${project.slug}">
      ${renderProjectVisual(project)}
      <div class="card-body">
        <div class="card-top">
          <span class="tag">${project.type}</span>
          <span class="status">${project.status}</span>
        </div>
        <h3>${project.name}</h3>
        <p>${project.description}</p>
        <div class="project-origin">${project.origin}</div>
        <div class="meta">${project.focus}</div>
        <div class="project-links">${renderProjectLinks(project.links)}</div>
      </div>
    </article>
  `).join("");
}

function renderDevlog(logs) {
  const root = document.querySelector("#devlog-list");
  root.innerHTML = logs.map(log => `
    <article class="log-item">
      <span class="log-no">#${String(log.id).padStart(3, "0")}</span>
      <span class="log-title">${log.title}</span>
      <time class="log-date" datetime="${log.date}">${log.date}</time>
    </article>
  `).join("");
}

function renderChannels(channels) {
  const root = document.querySelector("#channel-list");
  root.innerHTML = channels.map(channel => `
    <a class="channel-row" href="${channel.url}" target="_blank" rel="noopener noreferrer">
      <strong>${channel.name}</strong><span>${channel.description}</span><b aria-hidden="true">↗</b>
    </a>
  `).join("");
}

async function boot() {
  document.querySelector("#year").textContent = new Date().getFullYear();
  try {
    const [projects, logs, channels] = await Promise.all([
      loadJson("content/projects.json"),
      loadJson("content/devlog.json"),
      loadJson("content/channels.json")
    ]);
    renderProjects(projects);
    renderDevlog(logs);
    renderChannels(channels);
    await hydrateVisuals();
  } catch (error) {
    document.querySelector("#project-grid").innerHTML = '<p class="error">프로젝트 정보를 불러오지 못했습니다.</p>';
    document.querySelector("#devlog-list").innerHTML = '<p class="error">개발 기록을 불러오지 못했습니다.</p>';
    const channelRoot = document.querySelector("#channel-list");
    if (channelRoot) channelRoot.innerHTML = '<p class="error">채널 정보를 불러오지 못했습니다.</p>';
    console.error(error);
  }
}

boot();