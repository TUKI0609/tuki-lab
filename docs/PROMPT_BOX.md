# TUKI PROMPT BOX · 실제 결과물 중심의 공개 프롬프트 보관함

## 목적
TUKI LAB은 제작·검수 기록, TUKI PROMPT BOX는 실제 TUKI의 이미지·영상·게임 제작 사례를 먼저 보여주고 **해당 분야의 재사용 가능한 프롬프트를 복사하는** 도구형 보관함입니다.

공개 주소: `/prompts/`. X 공유용 개별 링크는 `/prompts/#<prompt-id>`. 기존 링크를 최대한 유지합니다.

## 분류와 출판 정책
- 분야: `image`, `video`, `game`. 필터 UI는 **전체 / 이미지 / 영상 / 게임**.
- `content/prompts.json`의 `visibility: "published"`이고 `preview.evidence`가 명시된 항목만 실제 카드로 노출합니다.
- `visibility: "draft"`는 JSON에 기록을 보존하지만 일반 방문자에게 보이지 않습니다. **공개 3개, 보관 2개**.
- 이전 `bookmark-x-post`는 실제 공개 게시물과 성과 확인 전까지 보관.
- 이전 `mobile-game-screen`은 같은 게임의 실제 수정 전후 캡처가 없으므로 보관. AI가 그린 가상 비교를 수정 완료 스크린샷처럼 제시하면 안 됩니다.
- 게임 업데이트 쇼츠는 게임 개발 사례로 `game`에 분류했습니다. 영상 카테고리는 일반 이미지→영상 프롬프트입니다.

## 실제 결과 미리보기 기준
- 등록증: `assets/prompts/results/guild-actual-output.avif`, 이전에 실제 제작한 개인화 CRYPTO SAGA 등록증의 최적화 미리보기. **이번 범용 프롬프트를 정확히 실행한 결과는 아니며** 입력 인물과 문구에 따라 달라집니다.
- 캐릭터 영상: `assets/prompts/results/video-hailuo-real-frame.avif`, 실제 과거 Hailuo AI 영상(~6.6초)에서 나온 프레임. **이번 10초 프롬프트 그대로 제작한 영상은 아닙니다.**
- 게임 쇼츠: `assets/projects/lutratide-survivors/w41-video-thumbnail.svg`, 실제 제작 영상을 기반으로 한 W41 공개 쇼츠 썸네일. 일반화한 복사 프롬프트의 1:1 출력물은 아닙니다.

원본의 성격을 구분하기 위한 `preview.evidence` 값: `prior-creation`, `published-creator-video`.
출처/파일 기록: `assets/prompts/results/published-results.json`.
이미지들은 프리뷰용으로 최적화되어 있습니다. 나중에 고해상도 실제 결과물이 준비되면 **실제 파일의 출처를 검증한 다음** 교체합니다.

**중요:** 참고 아트, 단순한 분위기 삽화, 합성으로 그린 UI 목업을 검증된 실제 창작 결과나 코드 수정 증거로 위장하지 않습니다. 실제 제작물이더라도 현재 공개된 범용 템플릿과 다른 입력으로 만든 과거 작품이면 그 사실을 하단 설명에 남겨야 합니다.

## 데이터 모델
`content/prompts.json`의 `prompts`:
- `id`: URL 앵커. 발행한 뒤 함부로 변경하지 않기
- `category`: 이미지/영상/게임 분야, `visibility`: 공개/보관
- `title`, `summary`, `tool`, `tags`: 카드 제목 및 검색
- `prompt`: 복사 시 전체 텍스트. `[대괄호 입력값]`은 사용자별 변경 필요
- `preview.type`, `preview.src`, `preview.label`, `preview.note`, `preview.evidence`: 미리보기 원본, 사실관계 및 표시 문구
- 실제 공개 자료인 경우에만 `sourceUrl` 및 `sourceLabel` 제공

## QA
1. `node --test tests/*.test.mjs`
2. `node scripts/build-lab-search-pages.mjs --check`
3. `node --check js/prompts.js`
4. Chrome: 3개 실제 로컬 이미지의 다운로드/디코딩, 필터 4개, 검색, 보관 카드 미노출, 프롬프트 전체 복사, 개별 링크 복사, 직접 링크
5. 390px 모바일: 상단 5개 홈페이지 메뉴, 가로 오버플로 없음
6. 기존 동의 관리 `js/core.js` 재사용. 방문자 분석 동의 전에 GA4 추적 금지
7. GitHub Actions `Validate TUKI PROMPT BOX staging` 통과 및 LAB 정적 글 회귀 확인

## 공개 정책
모든 변경은 Draft PR을 먼저 만들고 테스트 후 사용자 최종 승인 **이후에만** `main` 병합/배포합니다. 이전 결과로 인한 저작권 문제, 개인 이름·핸들 공개 가능 여부, 생성물 출처 및 실제 공개 URL을 검토합니다. 기존 RSS/YouTube/X와 사이트의 동의 방식은 변경하지 않습니다.
