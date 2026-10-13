// Optional LAB gallery: use actual thumbnails of the creator's own, linked
// gameplay Shorts. The JPEG thumbnails are embedded in first-party local SVGs.
// Never present these as before/after gameplay comparisons.
const localeText = value => typeof value === "string" ? value : (value?.ko || value?.en || "");
const trustedSource = value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
};
const videoThumbnail = link => {
  try {
    const url = new URL(link);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname) || url.protocol !== "https:") return null;
    const match = url.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})\/?$/);
    const localThumbnails = {
      PrqgIoBEZoE: "w39-video-thumbnail.svg",
      elhXFK08t7E: "w40-video-thumbnail.svg",
      BrBawuxsBy0: "w41-video-thumbnail.svg"
    };
    return match && localThumbnails[match[1]]
      ? "../../assets/projects/lutratide-survivors/" + localThumbnails[match[1]]
      : null;
  } catch { return null; }
};

export function renderLabProjectEvidence(articleRoot, post, project) {
  if (!post?.showProjectEvidence || !Array.isArray(project?.evidence)) return 0;
  const items = project.evidence.filter(item => videoThumbnail(item.source?.url)).slice(0, 3);
  const body = articleRoot.querySelector(".lab-article-body");
  if (!body || !items.length) return 0;

  const section = document.createElement("section");
  section.className = "lab-article-evidence";
  const heading = document.createElement("h2");
  heading.textContent = "게임 제작 과정의 영상 미리보기";
  const note = document.createElement("p");
  note.className = "lab-evidence-note";
  note.textContent = "본 이미지는 기존에 공개한 제작 영상 3편의 썸네일입니다. 직접 캡처한 진화 전후 비교 화면이 아니며, W41의 기능·성능 향상을 증명하는 자료도 아닙니다.";
  const gallery = document.createElement("div");
  gallery.className = "lab-evidence-grid";
  for (const item of items) {
    const title = localeText(item.title) || "게임 제작 기록";
    const noteText = localeText(item.note);
    const figure = document.createElement("figure");
    figure.className = "lab-evidence-card";
    const media = document.createElement("div");
    media.className = "lab-evidence-picture";
    const img = document.createElement("img");
    img.alt = title + " 관련 제작 영상 썸네일";
    img.loading = "eager";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("load", () => { img.dataset.loaded = "true"; });
    img.addEventListener("error", () => { img.dataset.loaded = "error"; });
    img.src = videoThumbnail(item.source?.url);
    media.appendChild(img);
    const caption = document.createElement("figcaption");
    const strong = document.createElement("strong");
    strong.textContent = title;
    caption.append(strong);
    if (noteText) {
      const detail = document.createElement("p");
      detail.textContent = noteText;
      caption.append(detail);
    }
    const source = trustedSource(item.source?.url);
    if (source) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "원본 제작 영상 ↗";
      caption.append(link);
    }
    figure.append(media, caption);
    gallery.append(figure);
  }
  section.append(heading, note, gallery);
  body.insertAdjacentElement("afterend", section);
  return items.length;
}
