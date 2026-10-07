import {
  loadJson, initI18n, t, renderNav, renderProjectGrid, renderLabList,
  renderChannels, renderActivityList, renderLabPosts, hydrateAssets, setYear
} from "./core.js";

async function boot() {
  const page = document.body.dataset.page;
  const base = "../";

  await initI18n(base);
  const site = await loadJson(base + "content/site.json");
  renderNav(site, base);
  const pageTitleKeys = {
    projects: "page.projectsTitle",
    activity: "page.activityTitle",
    lab: "page.labTitle",
    about: "page.aboutTitle"
  };
  if (pageTitleKeys[page]) document.title = t(pageTitleKeys[page], document.title);
  setYear();

  if (page === "projects") {
    const [projects, activity] = await Promise.all([
      loadJson(base + "content/projects.json"),
      loadJson(base + "content/activity.json")
    ]);
    renderProjectGrid(projects, "#all-projects", base);

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
