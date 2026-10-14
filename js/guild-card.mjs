// Card-specific localization. Independent of TUKI WORLD's global ko/en navigation.
export const GUILD_LANGUAGES = ["ko", "en", "ja"];
export const GUILD_UI = {
  ko: {
    title: "도트 RPG 탐험가 등록증",
    summary: "프로필 이미지 1장과 X 핸들로 나만의 판타지 직업·칭호·스킬을 만드는 등록증.",
    tool: "이미지 생성 AI",
    note: "CRYPTO SAGA 콘셉트 참고 이미지입니다. 이 프롬프트의 실제 생성 결과물은 아닙니다.",
    previewLabel: "이미지 미리보기",
    heading: "내 X 활동이 이세계 직업이 된다면?",
    intro: "X 핸들을 입력하고 카드 언어를 고르세요. 나머지 판타지 설정은 AI가 창작합니다.",
    handle: "X 핸들",
    placeholder: "@YourUsername",
    language: "등록증 언어",
    image: "프로필 이미지 1장을 AI 대화창에 직접 첨부하세요. 이 사이트에서는 이미지를 업로드받지 않습니다.",
    browsing: "AI가 공개 X 활동을 확인할 수 없으면 게시글을 추측하지 않고 첨부 이미지 중심으로 만듭니다.",
    invalid: "X 핸들을 확인해 주세요. 예: @YourUsername",
    ready: "복사 준비 완료",
    copy: "맞춤 프롬프트 복사",
    copied: "복사 완료 ✓",
    link: "공유 링크 복사",
    linkCopied: "등록증 페이지 링크가 복사됐어요.",
    linkFail: "링크 복사가 제한됐어요. 주소창에서 직접 복사해 주세요.",
    details: "생성 프롬프트 확인하기",
    preview: "X 핸들을 입력하면 복사할 프롬프트가 표시됩니다.",
    copySuccess: "맞춤 프롬프트가 복사됐어요. 이미지 1장과 함께 AI에 붙여넣으세요.",
    copyFail: "자동 복사가 제한됐어요. 아래 프롬프트를 펼쳐 직접 복사해 주세요."
  },
  en: {
    title: "Pixel RPG Adventurer ID",
    summary: "Turn one profile image and your X handle into a fantasy class, title and three skills.",
    tool: "AI image generator",
    note: "CRYPTO SAGA concept artwork, not an actual result of this prompt.",
    previewLabel: "Image preview",
    heading: "What if your X activity became an RPG class?",
    intro: "Enter your X handle and select the card language. AI invents the fantasy details.",
    handle: "X handle",
    placeholder: "@YourUsername",
    language: "Card language",
    image: "Attach one profile image directly in your AI chat. This site does not accept image uploads.",
    browsing: "If AI cannot verify public X activity, it must not guess posts and will use your image instead.",
    invalid: "Enter a valid X handle, for example @YourUsername.",
    ready: "Ready to copy",
    copy: "Copy custom prompt",
    copied: "Copied ✓",
    link: "Copy share link",
    linkCopied: "Card page link copied.",
    linkFail: "Unable to copy the link automatically. Copy it from the address bar.",
    details: "View generated prompt",
    preview: "Enter an X handle to preview the prompt that will be copied.",
    copySuccess: "Prompt copied. Paste it into an AI chat and attach one profile image.",
    copyFail: "Automatic copying is unavailable. Open the prompt below and copy it manually."
  },
  ja: {
    title: "ドットRPG冒険者登録証",
    summary: "プロフィール画像1枚とXハンドルから、ファンタジーの職業・称号・スキルを生成。",
    tool: "AI画像生成",
    note: "CRYPTO SAGAのコンセプト画像です。このプロンプトの実際の生成結果ではありません。",
    previewLabel: "画像プレビュー",
    heading: "Xでの活動が異世界の職業になったら？",
    intro: "Xハンドルを入力し、登録証の言語を選択してください。設定はAIが創作します。",
    handle: "Xハンドル",
    placeholder: "@YourUsername",
    language: "登録証の言語",
    image: "プロフィール画像1枚はAIチャットに直接添付してください。このサイトにはアップロードしません。",
    browsing: "AIが公開X投稿を確認できない場合、投稿内容を推測せず画像を基に創作します。",
    invalid: "正しいXハンドルを入力してください（例：@YourUsername）。",
    ready: "コピーできます",
    copy: "カスタムプロンプトをコピー",
    copied: "コピー済み ✓",
    link: "共有リンクをコピー",
    linkCopied: "登録証ページのリンクをコピーしました。",
    linkFail: "リンクを自動でコピーできません。アドレスバーからコピーしてください。",
    details: "生成プロンプトを確認",
    preview: "Xハンドルを入力すると、コピーされるプロンプトが表示されます。",
    copySuccess: "コピーしました。AIチャットに貼り付け、画像を1枚添付してください。",
    copyFail: "自動コピーできません。下のプロンプトを開いて手動でコピーしてください。"
  }
};

export function detectGuildLanguage(languages = []) {
  const candidates = Array.isArray(languages) ? languages : [languages];
  for (const entry of candidates) {
    const lang = String(entry || "").toLowerCase().split("-")[0];
    if (GUILD_LANGUAGES.includes(lang)) return lang;
  }
  return "en";
}

export function normalizeXHandle(input) {
  const raw = String(input ?? "").trim();
  const candidate = raw.startsWith("@") ? raw.slice(1) : raw;
  return /^[A-Za-z0-9_]{1,15}$/.test(candidate) ? "@" + candidate : "";
}

export function buildGuildPrompt(corePrompt, input, language) {
  const handle = normalizeXHandle(input);
  if (!handle) throw new Error("Valid X handle required");
  if (!GUILD_LANGUAGES.includes(language)) throw new Error("Unsupported card language");
  const langName = {ko:"한국어", en:"English", ja:"日本語"}[language];
  return [
    "START HERE / USER INPUT",
    "PROFILE IMAGE: [Attach ONE profile image to this AI conversation; it is not uploaded to TUKI WORLD.]",
    "X HANDLE: " + handle,
    "CARD LANGUAGE: " + language.toUpperCase() + " (" + langName + ")",
    "",
    "Use CARD LANGUAGE for EVERY visible label and fictional name on the image. X post language does not override this setting.",
    "",
    corePrompt
  ].join("\n");
}
