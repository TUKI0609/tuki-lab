# LUTRATIDE SURVIVORS · W41 게시 전 검수 기록

**단계: REVIEW ONLY / 최종 공개 승인 대기**  
**후보:** `lab-lutratide-survivors-2026-W41`  
**검토용 slug:** `lutratide-evolution-growth-difference-2026-w41`

## 원고 본문

이 PR의 검토 원문은 [lutratide-w41.lab-draft.json](./lutratide-w41.lab-draft.json)에 있습니다.
현재는 `review/` 아래에서만 보관하며, 사이트가 로딩하는
`content/lab-posts.json`, `content/devlog.json`,
`content/lab-candidates.json`을 수정하지 않았습니다.

## 기존 게시물 및 중복 점검

- `content/lab-posts.json` 기존 게시물 **3건**: MOMO 출시, CRYPTO SAGA 리빌딩, Verse8 실사용. 본 W41 주제와 직접 중복되지 않습니다.
- 제안 slug는 기존 게시물의 slug와 다릅니다.
- W41의 YouTube 근거 URL `https://www.youtube.com/shorts/BrBawuxsBy0`는 기존 LAB 게시물의 `sources`에 없습니다.
- 동일 LUTRATIDE 프로젝트에 W39(이전 제작), W40(몬스터 수정) 대기 후보가 별도로 있습니다. 이들을 합치거나 대리 승인하지 않습니다.
- 원고는 영상이나 외부 글을 전문 복제하지 않은 **자체 작성 요약·제작 관점**입니다.

## 출처 검증 범위와 남은 검수

**저장소의 확인 가능한 사실**
1. `content/lab-candidates.json`의 W41 후보에 유튜브 쇼츠 ID, 제목, 게시 시각이 기록되어 있습니다.
2. `content/projects.json`에 LUTRATIDE SURVIVORS의 공식 플레이 링크와 브라우저 자동 공격·이동 중심 게임 설명이 있습니다.
3. 기존 원고 및 개발기록에서 성장 선택, 진화 체감, 캐릭터 구분, 후반 긴장감의 개선 필요성을 확인했습니다.

**독립 검증 한계**
- 이 작업 환경에서는 YouTube 쇼츠 페이지 및 외부 플레이 사이트를 직접 열어 영상/게임 화면을 재생하거나 기능을 실험할 수 없었습니다.
- 따라서 실제 구현 완성 여부, 피해량과 성능 개선 수치, 캐릭터별 정확한 스킬 동작을 객관적으로 확인했다고 주장하지 않습니다.
- 루트라의 연계 공격/루나의 표식은 **제작자가 원고에 기재한 설계 목표**입니다. 사이트 공개 전 실제 빌드와 영상에 맞는지 최종 점검해야 합니다.

## 게시 승인 경계

**이번 Draft PR 생성은 실제 LAB 게시 승인이나 홈페이지 공개 승인이 아닙니다.**

1. 사용자에게 원고와 출처 검증 한계를 보여줍니다.
2. 사용자가 최종 원고/게시를 명시적으로 승인하면, 이 PR에만 다음 3개 파일의 게시 변경을 추가합니다.
   - `content/lab-posts.json`: 본문 및 `originCandidateId`, 공개 일자
   - `content/devlog.json`: 새 고유 ID와 해당 원고 연결
   - `content/lab-candidates.json`: W41에 한해 `APPROVED`, `approvedAt`, `publishedSlug`, `needsApproval:false`
3. 게시 전 CI의 `Validate LAB pipeline` 검사 성공과 새 내용에 대한 최종 사용자 병합 승인을 모두 확인합니다.
4. 승인 없는 자동 병합, 자동 발행, API 호출, 다른 후보 상태 변경을 금지합니다.

**게시 전 체크리스트:** [ ] 영상/게임 표현 최종 검수  [ ] 원고 승인  [ ] 게시 데이터 3종 반영  [ ] CI 성공  [ ] PR 병합 최종 승인
