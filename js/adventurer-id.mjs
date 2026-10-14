/**
 * The user's handle and selected language affect ONLY the local copyable
 * prompt. This module does not upload a photo, query X or store user data.
 */
export const SUPPORTED_CARD_LANGUAGES=["KO","EN","JA"];

export const CARD_LOCALES={
  KO:{
    htmlLang:"ko",
    title:"도트 RPG 탐험가 등록증",
    summary:"X 공개 활동을 판타지 직업과 고유 스킬로 재해석해 나만의 도트 등록증을 만드세요.",
    intro:"나의 X 활동이 이세계 직업이 된다면?",
    languageLabel:"등록증 언어",
    handleLabel:"X 핸들",
    handlePlaceholder:"@YourUsername",
    imageNotice:"프로필 이미지는 홈페이지에 올리지 않습니다. 복사한 프롬프트와 함께 생성 AI 채팅에 이미지 1장을 첨부하세요.",
    copy:"내 등록증 프롬프트 복사",
    copied:"복사 완료 ✓",
    success:"선택한 언어와 X 핸들을 반영한 프롬프트가 복사됐어요.",
    link:"링크 복사",
    linkCopied:"공유 링크가 복사됐어요.",
    details:"프롬프트 확인하기",
    required:"먼저 X 핸들을 입력하세요.",
    invalid:"X 핸들은 영문·숫자·밑줄(_) 1~15자여야 해요.",
    step1:"프로필 이미지 1장을 생성 AI에 첨부하세요.",
    step2:"아래 X 핸들로 공개 활동을 확인할 수 있는 경우에만 분석하세요.",
    step3:"등록증 안의 모든 문구는 자연스러운 한국어로 작성하세요.",
    note:"X 공개 활동을 읽을 수 없다면 확인했다고 말하지 말고 이미지와 핸들만으로 판타지 캐릭터를 창작하세요."
  },
  EN:{
    htmlLang:"en",
    title:"Pixel RPG Adventurer ID",
    summary:"Turn verifiable public X activity into a fictional class and skills, inspired by your profile image.",
    intro:"What if your X activity became a fantasy RPG class?",
    languageLabel:"Card language",
    handleLabel:"X handle",
    handlePlaceholder:"@YourUsername",
    imageNotice:"Do not upload a photo to this website. Attach ONE profile image to your AI chat after copying the prompt.",
    copy:"Copy my Adventurer ID prompt",
    copied:"Copied ✓",
    success:"Your prompt with the selected language and X handle is copied.",
    link:"Copy link",
    linkCopied:"Shareable card link copied.",
    details:"View full prompt",
    required:"Enter your X handle first.",
    invalid:"Use 1–15 letters, numbers or underscores (_) for your X handle.",
    step1:"Attach one profile image to your AI chat.",
    step2:"Analyze public X activity only when it can actually be accessed and verified for this handle.",
    step3:"Write all text inside the adventurer card in natural English.",
    note:"If X data cannot be accessed, never pretend to have analyzed it. Use only the image and handle as creative inspiration."
  },
  JA:{
    htmlLang:"ja",
    title:"ドットRPG冒険者登録証",
    summary:"公開されたXの活動を架空の職業やスキルに変え、プロフィール画像から冒険者を作成します。",
    intro:"Xでの活動が異世界の職業になったら？",
    languageLabel:"登録証の言語",
    handleLabel:"Xのユーザー名",
    handlePlaceholder:"@YourUsername",
    imageNotice:"このサイトに画像はアップロードしません。プロンプトをコピーして、生成AIのチャットにプロフィール画像を1枚添付してください。",
    copy:"冒険者登録証のプロンプトをコピー",
    copied:"コピー完了 ✓",
    success:"言語とXのユーザー名を反映したプロンプトをコピーしました。",
    link:"リンクをコピー",
    linkCopied:"共有リンクをコピーしました。",
    details:"プロンプト全文を見る",
    required:"先にXのユーザー名を入力してください。",
    invalid:"Xのユーザー名は英数字とアンダースコア（_）で1〜15文字以内にしてください。",
    step1:"生成AIのチャットにプロフィール画像を1枚添付してください。",
    step2:"指定されたXの公開情報を実際に確認できる場合にのみ分析してください。",
    step3:"登録証のすべての文字は自然な日本語にしてください。",
    note:"Xを確認できない場合、分析したふりをせず、画像とユーザー名から架空の冒険者を創作してください。"
  }
};

export function normalizeXHandle(raw){
  const value=String(raw??"").trim();
  if(!value)return "";
  if(!/^@?[A-Za-z0-9_]{1,15}$/.test(value))return null;
  return value.startsWith("@")?value:"@"+value;
}

export function resolveCardLanguage(raw){
  const first=String(raw||"").trim().toLowerCase();
  if(first==="ko"||first.startsWith("ko-"))return "KO";
  if(first==="ja"||first.startsWith("ja-"))return "JA";
  return "EN";
}

export function buildAdventurerPrompt(core,{language="EN",handle=""}={}){
  const lang=SUPPORTED_CARD_LANGUAGES.includes(language)?language:"EN";
  const t=CARD_LOCALES[lang];
  const valid=normalizeXHandle(handle);
  if(valid===null)throw new Error("INVALID_X_HANDLE");
  const displayHandle=valid || "@YourUsername";
  const start=[
    t.title,
    "",
    t.intro,
    "1. "+t.step1,
    "2. "+t.step2,
    "3. "+t.step3,
    "",
    t.handleLabel+": "+displayHandle,
    t.languageLabel+": "+lang,
    t.note,
    "",
    "---",
    ""
  ].join("\n");
  if(!core.includes("{{X_HANDLE}}")||!core.includes("{{CARD_LANGUAGE}}")){
    throw new Error("ADVENTURER_TEMPLATE_MISSING_INPUTS");
  }
  const instructions=core
    .replaceAll("{{X_HANDLE}}",displayHandle)
    .replaceAll("{{CARD_LANGUAGE}}",lang);
  return start+instructions;
}
