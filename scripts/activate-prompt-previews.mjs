#!/usr/bin/env node
// Activate only files whose bytes are actually in this draft branch.
// Usage:
//   node scripts/activate-prompt-previews.mjs --check    # read-only, check current refs
//   node scripts/activate-prompt-previews.mjs --strict   # fail if any candidate missing/invalid
//   node scripts/activate-prompt-previews.mjs --write    # only after all 4 binaries uploaded
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"assets/prompts/results/preview-manifest.json"),"utf8"));
const jsonPath=path.join(root,"content/prompts.json");
const collection=JSON.parse(fs.readFileSync(jsonPath,"utf8"));
const modes=new Set(["--check","--strict","--write"]);
const mode=process.argv[2]||"--check";
assert(modes.has(mode),"Use --check, --strict, or --write");
// V1's historical upload job contains illustrative UI mockups and must not
// overwrite v2's real-creator-result gallery, even if these files later appear.
if(mode==="--write" && collection.version>=2){
  throw new Error("Historical preview migration cannot overwrite result-first v2 gallery. Review and edit content/prompts.json explicitly.");
}
assert(manifest.files.length===4);
let found=0,missing=[];
for (const entry of manifest.files){
  const file=path.join(root,"assets/prompts/results",entry.filename);
  const item=collection.prompts.find(p=>p.id===entry.id);
  assert(item,"Unknown target: "+entry.id);
  assert(/^[-a-z0-9]+\.webp$/.test(entry.filename),"Non-WebP filename: "+entry.filename);
  if(!fs.existsSync(file)){
    missing.push(entry.filename);
    assert(item.preview.src!=="assets/prompts/results/"+entry.filename,
      "Broken card: points at missing candidate "+entry.filename);
    continue;
  }
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.toString("ascii",0,4),"RIFF","Invalid WebP container: "+entry.filename);
  assert.equal(bytes.toString("ascii",8,12),"WEBP","Invalid WebP signature: "+entry.filename);
  assert.equal(bytes.length,entry.bytes,"Unexpected WebP size: "+entry.filename);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),entry.sha256,
    "Image content differs from reviewed source: "+entry.filename);
  found++;
}
if(mode==="--strict"||mode==="--write"){
  assert.equal(found,manifest.files.length,
    "Upload selected binary assets to PR branch first: "+missing.join(", "));
}
if(mode==="--write"){
  for(const entry of manifest.files){
    const item=collection.prompts.find(p=>p.id===entry.id);
    item.preview={
      type:"image",
      src:"assets/prompts/results/"+entry.filename,
      label:entry.label,
      note:entry.note
    };
  }
  fs.writeFileSync(jsonPath,JSON.stringify(collection,null,2)+"\n");
  console.log("ACTIVATED: 4 reviewed previews. Commit updated content/prompts.json to this feature branch only.");
}else{
  console.log("PR11 preview audit: "+found+"/4 reviewed binaries uploaded, "+missing.length+" awaiting upload.");
  for(const name of missing)console.log("PENDING: "+name);
  console.log("Existing public-safe previews remain unchanged until activation.");
}
