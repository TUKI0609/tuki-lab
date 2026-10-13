# LUTRATIDE SURVIVORS W41 · 최종 병합 전 검토

**상태: 원고 승인 완료 / PR 브랜치에 게시 데이터 준비 완료 / main 병합 승인 대기**  
**후보:** `lab-lutratide-survivors-2026-W41`  
**제안 slug:** `lutratide-evolution-growth-difference-2026-w41`  
**승인 기록:** 2026-10-13 (한국 시간), 채팅에서 W41 원고 승인. 이는 **main 병합·실제 공개 승인과 별개**입니다.

## 이 PR 브랜치에서만 준비된 게시 데이터

1. `content/lab-posts.json`: W41 원고 추가. `publishedAt: 2026-10-13`은 **예정일**이며 실제 병합일이 달라지면 병합 전에 조정해야 합니다.
2. `content/devlog.json`: 관련 제작 기록 ID 29 추가, `originCandidateId` 연결.
3. `content/lab-candidates.json`: W41만 `APPROVED`, `needsApproval:false`, `approvedAt`·`publishedSlug`를 저장.
4. `js/lab-project-evidence.js`, `js/lab-article.js`, `css/style.css`: W41의 `showProjectEvidence` 플래그가 참일 때만 기존 프로젝트 화면 3개를 보여줌. 기존 공개 LAB 글에는 영향이 없어야 합니다.

기존 정식 글 3건, 다른 PENDING 후보(W39/W40), 기존 devlog 기록은 그대로 유지합니다. 공개 홈페이지는 `main`만 배포하므로 이 PR을 병합하기 전에는 새로운 W41 글이 표시되지 않습니다.

## 독창성·중복 확인

- 기존 정식 글 3건은 MOMO 출시, CRYPTO SAGA 리빌딩, Verse8 실사용 관련입니다. W41의 성장/진화 개선 기록은 별도 주제입니다.
- 제안 slug는 기존 글과 중복되지 않으며 W41 근거 URL은 기존 LAB 글의 `sources`에서 사용하지 않았습니다.
- 유튜브 제작 영상의 원본을 무단 다운로드하거나 그대로 복제하지 않았으며, 블로그 본문 복제도 하지 않았습니다.
- `content/projects.json`에 등록된 프로젝트와 기존 게임 플레이 URL을 사용했습니다.

## 이미지 3개: 추가 비용 없이 기존 스크린샷 재사용

기존 에셋 `assets/projects/evidence/tuki-project-evidence.webp`는 3열 × 4행 스프라이트 시트입니다. W41의 프로젝트 데이터에 이미 연결된 3개의 실제 게임 화면을 표시합니다.

1. 성장 선택 화면 (row 2, col 0), 관련 영상 W39
2. 전투 플레이 화면 (row 2, col 1), 관련 영상 W40
3. 스킬 이펙트 (row 2, col 2), 관련 영상 W41

원본 이미지는 현재 프로젝트가 이미 공개해 두었던 자료입니다. 화면이 모두 W41 직후에 촬영되었다거나 성장 이전/이후를 동일 조건으로 비교한 증거라고 주장하지 않습니다. 이미지마다 이 사실을 알리는 공통 고지와 설명, 출처 링크를 표시합니다.

## 영상·실제 기능 검증 범위

W41 영상 자체의 상세 동작과 실제 게임 플레이의 개선 수치를 독립적인 재생·테스트로 확인한 것은 아닙니다. 루트라의 연계 공격과 루나의 표식 중심 전투 설명은 이미 승인된 **개선 방향·제작 목표**로 서술했으며 실제 출시 기능의 확정된 구현 정도로 과장하지 않았습니다.

## 병합 전 필수 조건

- [x] 특정 W41 검토용 원고에 대한 사용자 승인
- [x] 게시물·devlog·후보 상태를 같은 PR 브랜치에 준비
- [x] 기존 공개 글의 중복 및 원본 근거 URL 확인
- [ ] GitHub Actions의 기존 LAB 게시 데이터 검증과 이미지 브라우저 미리보기 검증 통과
- [ ] 최종 병합 직전 출시 일자 및 `main` 브랜치 충돌 여부 확인
- [ ] **사용자로부터 PR #4의 `main` 병합 및 실제 공개에 대한 별도의 명시적 승인**

최종 승인 전까지 PR #4는 Draft 상태로 유지하고 병합/게시를 실행하지 않습니다.
