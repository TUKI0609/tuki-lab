import {
  loadJson, renderNav, renderProjectGrid, renderLabList,
  renderChannels, renderCharacters, renderActivityList, hydrateAssets, setYear
} from "./core.js";

async function boot() {
  try {
    const [site, projects, logs, channels, characters, activity] = await Promise.all([
      loadJson("content/site.json"),
      loadJson("content/projects.json"),
      loadJson("content/devlog.json"),
      loadJson("content/channels.json"),
      loadJson("content/characters.json"),
      loadJson("content/activity.json")
    ]);

    document.querySelectorAll("[data-site-name]").forEach(el => el.textContent = site.name);
    document.querySelectorAll("[data-site-tagline]").forEach(el => el.textContent = site.tagline);
    document.querySelectorAll("[data-site-description]").forEach(el => el.textContent = site.description);

    renderNav(site, "");
    renderProjectGrid(projects);
    renderLabList(logs, "#devlog-list", 5);
    renderChannels(channels);
    renderCharacters(characters);
    renderActivityList(activity, "#activity-list", 6);

    const routeRoot = document.querySelector("#route-grid");
    routeRoot.innerHTML = site.routes.map(route => `
      <a class="route-card ${route.id}" href="${route.target}">
        <span class="route-kicker">${route.label}</span>
        <strong>${route.title}</strong>
        <p>${route.description}</p>
        <span class="route-arrow">→</span>
      </a>
    `).join("");

    await hydrateAssets(document, "");
    setYear();
  } catch (error) {
    console.error(error);
    document.body.classList.add("load-error");
  }
}
boot();
