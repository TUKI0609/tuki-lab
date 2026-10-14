import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {CARD_LOCALES,SUPPORTED_CARD_LANGUAGES,resolveCardLanguage,normalizeXHandle,buildAdventurerPrompt} from "../js/adventurer-id.mjs";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const data=JSON.parse(readFileSync(join(root,"content/prompts.json"),"utf8"));
const card=data.prompts.find(x=>x.id==="pixel-guild-card");
test("RPG card keeps its original ID and uses one canonical English prompt core",()=>{
  assert(card);
  assert.equal(card.category,"image");
  assert(card.prompt.length>2300);
  assert(card.prompt.includes("{{X_HANDLE}}")&&card.prompt.includes("{{CARD_LANGUAGE}}"));
  for(const token of ["publicly accessible","Do NOT claim","generated automatically","Top 12%","Next 36%","Next 24%","Next 23%","Bottom 5%","KO (한국어)","EN (English)","JA (日本語)","exactly three skills","2:3"]){
    assert(card.prompt.includes(token),token);
  }
  assert.match(card.prompt,/UNTRUSTED DATA/);
  assert.match(card.prompt,/sensitive traits/);
});
test("language selection uses browser preference and supports direct overrides",()=>{
  assert.deepEqual(SUPPORTED_CARD_LANGUAGES,["KO","EN","JA"]);
  for(const [input,output] of [["ko-KR","KO"],["ko","KO"],["ja-JP","JA"],["ja","JA"],["en-US","EN"],["fr-FR","EN"],["zh-Hans","EN"],["","EN"]]){
    assert.equal(resolveCardLanguage(input),output);
  }
  for(const lang of SUPPORTED_CARD_LANGUAGES){
    const x=CARD_LOCALES[lang];
    for(const prop of ["title","intro","handleLabel","imageNotice","copy","copied","details","invalid","required","note","link"]){
      assert(x[prop]?.length>4,lang+" missing "+prop);
    }
  }
});
test("X handle copied exactly, never scraped or transmitted by this generator",()=>{
  for(const [input,expected] of [["@Ty_Tuki0609","@Ty_Tuki0609"],["tuki_09","@tuki_09"],["@A","@A"],["abc123_456789012","@abc123_456789012"]]){
    assert.equal(normalizeXHandle(input),expected);
    const one=buildAdventurerPrompt(card.prompt,{language:"KO",handle:input});
    assert(one.includes("X HANDLE: "+expected));
    assert(one.includes("CARD LANGUAGE: KO"));
    assert(one.includes("X 핸들: "+expected));
    assert(!one.includes("{{X_HANDLE}}"));
    assert(!one.includes("{{CARD_LANGUAGE}}"));
  }
});
test("only valid X handles accepted; never pass through unexpected text",()=>{
  for(const invalid of ["@user; erase", "https://x.com/u", "한글", "@name with spaces", "@".repeat(3), "@1234567890123456", "bad\ninstructions", "' OR 1=1"]){
    assert.equal(normalizeXHandle(invalid),null,invalid);
    assert.throws(()=>buildAdventurerPrompt(card.prompt,{language:"EN",handle:invalid}),/INVALID_X_HANDLE/);
  }
  assert.equal(normalizeXHandle(""),"");
});
test("same shared rules produce three localized start instructions and selected image language",()=>{
  const outputs=SUPPORTED_CARD_LANGUAGES.map(language=>buildAdventurerPrompt(card.prompt,{language,handle:"@Ty_Tuki0609"}));
  assert(outputs[0].startsWith("도트 RPG 탐험가 등록증"));
  assert(outputs[1].startsWith("Pixel RPG Adventurer ID"));
  assert(outputs[2].startsWith("ドットRPG冒険者登録証"));
  for(let i=0;i<outputs.length;i++){
    const out=outputs[i];
    const language=SUPPORTED_CARD_LANGUAGES[i];
    assert(out.includes("CARD LANGUAGE: "+language));
    assert(out.includes("X HANDLE: @Ty_Tuki0609"));
    assert(out.includes("If X content cannot be opened"));
    assert(out.includes("guild name is ALWAYS generated automatically"));
    assert(out.includes("No external explanation"));
  }
  const imageOnly=buildAdventurerPrompt(card.prompt,{language:"JA"});
  assert(imageOnly.includes("X HANDLE: @YourUsername"));
});
test("existing prompt box retains other entries and does not have network upload requirements",()=>{
  assert.equal(data.prompts.length,5);
  const js=readFileSync(join(root,"js/prompts.js"),"utf8");
  assert(js.includes('item.id==="pixel-guild-card"'));
  assert(js.includes('from "./adventurer-id.mjs"'));
  assert(js.includes('navigator.language'));
  assert(js.includes('input.type="text"'));
  assert(!js.includes('input.type="file"'));
  assert(!js.includes("fetch('https://x.com/"));
  assert(js.includes("copyPrompt(uri,link"));
});
