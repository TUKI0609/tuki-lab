import test from "node:test";
import assert from "node:assert/strict";
import { reviewQueue, checkDraft, checkPublicationChange } from "../scripts/lab-approval-core.mjs";

const candidate = () => ({
  id:"lab-lutratide-survivors-2026-W41",
  project:"lutratide-survivors",
  status:"PENDING", needsApproval:true,
  evidence:[{url:"https://www.youtube.com/shorts/BrBawuxsBy0",publishedAt:"2026-10-05T15:47:08Z"}],
  evidenceCount:1, suggestedTitle:"LUTRATIDE 제작 업데이트", suggestedType:"BUILD LOG"
});
const draft = () => ({
  slug:"lutratide-evolution-build",
  originCandidateId:"lab-lutratide-survivors-2026-W41",
  project:"lutratide-survivors",
  type:"BUILD LOG", title:"게임 진화 시스템의 변화", summary:"실제 제작 변화와 검증 기록",
  publishedAt:"2026-10-13",
  sections:[{heading:"변화한 부분", paragraphs:["완성된 변경사항과 검증 결과를 기록했다."]}],
  sources:[{label:"YouTube",title:"제작 영상",url:"https://www.youtube.com/shorts/BrBawuxsBy0"}]
});
const historicalPost = () => ({
  slug:"old-article",project:"momo",type:"RELEASE",title:"이전 기록",summary:"기존 글",
  publishedAt:"2026-10-07",sections:[{heading:"배경",paragraphs:["본문"]}],sources:[{label:"Verse8",title:"모모",url:"https://example.org/momo"}]
});
const historicalLog = () => ({id:28,project:"momo",type:"BUILD LOG",date:"2026-10-07",title:"기존 기록",summary:"기존 요약"});
const prior = () => ({
  candidates:[candidate()],posts:[historicalPost()],devlog:[historicalLog()]
});
const approved = () => {
  const c = candidate();
  return {...c,status:"APPROVED",needsApproval:false,approvedAt:"2026-10-13T12:00:00Z",publishedSlug:draft().slug};
};
const future = () => ({
  candidates:[approved()],posts:[historicalPost(),draft()],
  devlog:[historicalLog(),{
    id:29,project:"lutratide-survivors",originCandidateId:candidate().id,
    type:"BUILD LOG",date:"2026-10-13",title:"진화 기록",summary:"이번 수정 검증"
  }]
});

test("queue lists only pending candidates and does not mutate status", () => {
  const c = candidate();
  const out = reviewQueue([c,{...c,id:"approved",status:"APPROVED"}],[historicalPost()]);
  assert.equal(out.length,1);
  assert.equal(out[0].id,c.id);
  assert.equal(c.status,"PENDING");
});
test("valid draft has evidence and no duplicate", () => {
  assert.deepEqual(checkDraft(draft(),[candidate()],[historicalPost()]),[]);
});
test("reject a draft missing candidate evidence or using a published slug", () => {
  const d=draft();
  d.slug="old-article";
  d.sources=[{label:"other",title:"other",url:"https://example.org/other"}];
  assert(checkDraft(d,[candidate()],[historicalPost()]).length>=2);
});
test("reject a draft for already approved candidate", () => {
  assert(checkDraft(draft(),[approved()],[historicalPost()]).length>0);
});
test("properly linked, approved new article and devlog pass publication gate", () => {
  assert.deepEqual(checkPublicationChange(prior(),future()),[]);
});
test("publishing a pending candidate is rejected", () => {
  const f=future();f.candidates=[candidate()];
  assert(checkPublicationChange(prior(),f).length>0);
});
test("approving without a new linked publication is rejected", () => {
  const f=prior();f.candidates=[approved()];
  assert(checkPublicationChange(prior(),f).length>0);
});
test("publishing without a new devlog is rejected", () => {
  const f=future();f.devlog=[historicalLog()];
  assert(checkPublicationChange(prior(),f).length>0);
});
test("editing a prior published post is rejected", () => {
  const f=future();f.posts[0].summary="changed old content";
  assert(checkPublicationChange(prior(),f).length>0);
});
test("two articles cannot publish the same candidate", () => {
  const f=future();f.posts.push({...draft(),slug:"duplicate-second-article"});
  assert(checkPublicationChange(prior(),f).length>0);
});
test("new article cannot omit originCandidateId", () => {
  const f=future();delete f.posts[1].originCandidateId;
  assert(checkPublicationChange(prior(),f).length>0);
});
test("duplicate devlog id is rejected", () => {
  const f=future();f.devlog[1].id=28;
  assert(checkPublicationChange(prior(),f).length>0);
});
test("existing approved unlinked articles remain grandfathered", () => {
  const b=prior();b.candidates.push({...approved(),id:"lab-momo-2026-W40"});
  const f=JSON.parse(JSON.stringify(b));
  assert.deepEqual(checkPublicationChange(b,f),[]);
});
