// Optional LAB article gallery. Reuses the project's already published,
 // first-party gameplay evidence sprite sheet; it does not fetch new media.
const localeText = value => typeof value === "string" ? value : (value?.ko || value?.en || "");
const trustedSource = value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
};

export function renderLabProjectEvidence(articleRoot, post, project) {
  if (!post?.showProjectEvidence || !Array.isArray(project?.evidence)) return 0;
  const items = project.evidence.filter(item =>
    Number.isInteger(item.sprite?.row) && item.sprite.row >= 0 && item.sprite.row <= 3 &&
    Number.isInteger(item.sprite?.col) && item.sprite.col >= 0 && item.sprite.col <= 2
  ).slice(0, 3);
  const body = articleRoot.querySelector(".lab-article-body");
  if (!body || !items.length) return 0;

  const section = document.createElement("section");
  section.className = "lab-article-evidence";
  const heading = document.createElement("h2");
  heading.textContent = "게임 제작 과정의 실제 화면";
  const note = document.createElement("p");
  note.className = "lab-evidence-note";
  note.textContent = "기존 프로젝트에 등록된 플레이 참고 화면입니다. 모든 화면이 W41 개선 이후 촬영된 것은 아니며, 진화 전후 비교 결과를 증명하는 자료는 아닙니다.";
  const gallery = document.createElement("div");
  gallery.className = "lab-evidence-grid";
  for (const item of items) {
    const title = localeText(item.title) || "게임 화면";
    const noteText = localeText(item.note);
    const figure = document.createElement("figure");
    figure.className = "lab-evidence-card";
    const picture = document.createElement("div");
    picture.className = "project-evidence-image";
    picture.setAttribute("role", "img");
    picture.setAttribute("aria-label", title);
    picture.style.setProperty("--evidence-x", `${item.sprite.col * 50}%`);
    picture.style.setProperty("--evidence-y", `${(item.sprite.row / 3) * 100}%`);
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
      link.textContent = "관련 제작 기록 ↗";
      caption.append(link);
    }
    figure.append(picture, caption);
    gallery.append(figure);
  }
  section.append(heading, note, gallery);
  body.insertAdjacentElement("afterend", section);
  return items.length;
}
