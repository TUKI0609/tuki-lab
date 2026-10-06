import {
  loadJson, renderNav, renderProjectGrid, renderLabList,
  renderChannels, renderActivityList, renderLabPosts, hydrateAssets, setYear
} from "./core.js";

async function boot() {
  const page = document.body.dataset.page;
  const base = "../";

  const site = await loadJson(base + "content/site.json");
  renderNav(site, base);
  setYear();

  if (page === "projects") {
    const projects = await loadJson(base + "content/projects.json");
    renderProjectGrid(projects, "#all-projects", base);
    await hydrateAssets(document, base);
  }

  if (page === "lab") {
    const [posts, logs] = await Promise.all([
      loadJson(base + "content/lab-posts.json"),
      loadJson(base + "content/devlog.json")
    ]);
    renderLabPosts(posts, "#published-lab", base);
    renderLabList(logs, "#all-logs");
  }

  if (page === "activity") {
    const activity = await loadJson(base + "content/activity.json");
    renderActivityList(activity, "#all-activity");
  }

  if (page === "about") {
    const channels = await loadJson(base + "content/channels.json");
    renderChannels(channels, "#about-channels");
    await hydrateAssets(document, base);
  }
}

boot().catch(error => {
  console.error(error);
  document.body.classList.add("load-error");
});
