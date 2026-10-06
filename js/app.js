async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(path + " 불러오기 실패");
  return response.json();
}

function renderProjects(projects) {
  const root = document.querySelector("#project-grid");
  root.innerHTML = projects.map(project => `
    <article class="card">
      <div class="card-top">
        <span class="tag">${project.type}</span>
        <span class="status">${project.status}</span>
      </div>
      <h3>${project.name}</h3>
      <p>${project.description}</p>
      <div class="meta">${project.focus}</div>
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

async function boot() {
  document.querySelector("#year").textContent = new Date().getFullYear();
  try {
    const [projects, logs] = await Promise.all([
      loadJson("content/projects.json"),
      loadJson("content/devlog.json")
    ]);
    renderProjects(projects);
    renderDevlog(logs);
  } catch (error) {
    document.querySelector("#project-grid").innerHTML = '<p class="error">프로젝트 정보를 불러오지 못했습니다.</p>';
    document.querySelector("#devlog-list").innerHTML = '<p class="error">개발 기록을 불러오지 못했습니다.</p>';
    console.error(error);
  }
}

boot();