// Progressive enhancement for published TUKI LAB tutorial prompts.
// No external API calls; plain text remains selectable without JavaScript.
document.addEventListener("click", async event => {
  const button=event.target.closest("button[data-copy-prompt]");
  if (!button) return;
  const text=button.closest(".lab-prompt-block")?.querySelector("pre code")?.textContent;
  if (!text) return;
  const original=button.textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area=document.createElement("textarea");
      area.value=text;area.style.position="fixed";area.style.opacity="0";
      document.body.append(area);area.select();
      const ok=document.execCommand("copy");area.remove();
      if (!ok) throw new Error("copy not supported");
    }
    button.textContent="복사 완료";
    setTimeout(()=>{button.textContent=original},2000);
  } catch {
    button.textContent="텍스트를 선택해 복사해주세요";
    setTimeout(()=>{button.textContent=original},2800);
  }
});
