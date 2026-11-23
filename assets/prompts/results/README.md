# CURRENT v2: actual creator results gallery (2026-10-14)

**This folder now contains two REAL, previous creator outputs**, not generic placeholder art:

- `guild-actual-output.avif`: actual earlier CRYPTO SAGA personal guild card created by TUKI (190 × 285 thumbnail). This is NOT the exact output of the public general-purpose prompt.
- `video-hailuo-real-frame.avif`: frame from TUKI's earlier real Hailuo AI video (~6.6 seconds), rather than the exact new 10-second prompt.
- Game category uses `assets/projects/lutratide-survivors/w41-video-thumbnail.svg`, a verified actual video thumbnail.

These two AVIF files are **low-resolution, browser-ready previews**, intentionally optimized to avoid bloating the static site. Full-resolution original files remain in creator working assets, not published by this PR.

Published content and source records: `content/prompts.json` (`visibility: "published"`) and `published-results.json`.
Two old cards (X writing and mobile layout) remain archived, not deleted. The archived original WebP upgrade plan that follows is **historical** and is NOT approved for the current site. In particular `scripts/activate-prompt-previews.mjs --write` must never overwrite the vetted media before a new editorial review.

---

## 1차 실제 연결 준비 (2026-10-14)

**선별된 파일 4개가 체크섬과 함께 확정되었으며** 업로드만 남았습니다.
이 문서와 `preview-manifest.json`은 PR #11의 feature 브랜치에 반영됐습니다.
※ 이미지 바이너리는 아직 GitHub 브랜치에 없습니다. 기존 카드의 실제 파일 경로는 바꾸지 않았습니다.

### 업로드 대상 (압축 파일 해제 후 이미지 4개만)

| GitHub 업로드 경로 | 설명 |
| --- | --- |
| `assets/prompts/results/guild-actual-output.webp` | 2026-10-09에 만든 TUKI 개인화 CRYPTO SAGA 등록증 **실제 결과물**. 카드 안에 공개 X 핸들이 있음 |
| `assets/prompts/results/video-hailuo-real-frame.webp` | Hailuo에서 실제 생성한 약 6.6초 영상의 **프레임**. 현재 10초 범용 프롬프트 그대로의 결과물은 아님 |
| `assets/prompts/results/bookmark-x-post-result.webp` | **생성형 목업**. 실제 X 게시물 캡처가 아님 |
| `assets/prompts/results/mobile-game-screen-example.webp` | **생성형 목업**. 실제 게임의 오류/수정 검증 스크린샷이 아님 |

준비된 자료는 `tuki-prompt-box-pr11-upload-ready.zip`에 모았습니다. ZIP을 GitHub에 그대로 업로드하지 말고 압축을 풀어서 4개의 .webp 파일만 올리세요.

### GitHub 웹 업로드

1. [feature 브랜치](https://github.com/TUKI0609/tuki-lab/tree/feat/tuki-prompt-box-20261014/assets/prompts/results)에서 **브랜치가 `feat/tuki-prompt-box-20261014`인지 확인**합니다. `main`에서 업로드하면 즉시 공개되므로 안 됩니다.
2. `assets/prompts/results` 폴더의 **Add file → Upload files**를 클릭합니다.
3. 위 4개 WebP 파일을 드래그하고, 커밋 대상을 **feature 브랜치**로 지정합니다.
4. 업로드 후 이 폴더에 정확히 4개 WebP가 표시되는지 확인합니다. (README와 manifest 외에)
5. 같은 브랜치의 로컬 작업 복제본에서 `node scripts/activate-prompt-previews.mjs --strict`로 4개 원본의 WebP 헤더·바이트 크기·SHA-256를 검사한 후, `--write`로 카드의 `src`, `label`, `note`를 변경해 커밋합니다. 이를 위해 다른 파일을 변경할 필요가 없습니다. 이 작업은 나중에 ChatGPT에 재요청할 수 있습니다.
6. `Validate TUKI PROMPT BOX staging`, LAB·W41 회귀 GitHub Actions를 재실행해 통과 여부를 확인합니다.

**포함 파일 출처는 중요합니다.** '실제 생성 결과', '기존 영상의 한 프레임', '설명용 이미지'의 차이를 없애지 마세요.

---

# TUKI PROMPT BOX · 미리보기 후보 검증 (2026-10-14)

이 폴더의 실제 미디어 파일은 **아직 feature 브랜치에 업로드되지 않았습니다.**
따라서 아래의 파일명을 `content/prompts.json`에서 즉시 참조하지 마세요.
이미지 404 방지를 위해 현재 카드의 검증된 로컬 참고 이미지를 유지합니다.

## 기존 자료 확인 결과

| 카드 ID | 발견된 기존 미디어 | 분류 | 사이트에 연결할 때의 정확한 문구 |
| --- | --- | --- | --- |
| `pixel-guild-card` | `guild-actual-output.webp` (2026-10-09, 원본: `크립토사가 이세계 탐험가 등록증.png`) | **기존 개인화 v1.0 프롬프트의 실제 생성 결과** | "TUKI가 직접 생성한 등록증 예시. 현재 범용 템플릿과 문구·입력 자료가 달라 동일 결과를 보장하지 않습니다." |
| `consistent-character-video` | `video-hailuo-real-frame.webp` (~6.6초 Hailuo AI 영상에서 추출) / `video-zcre-real-frame.webp` (~11.1초 ZCRE 영상에서 추출) | **과거 실제 AI 생성 영상의 캡처** | "이전에 제작한 영상 프레임. 공개된 10초 범용 프롬프트와 정확히 같은 입력/길이는 아닙니다." |
| `gameplay-update-short` | 이미 저장소에 있는 `assets/projects/lutratide-survivors/w41-video-thumbnail.svg` | **실제 공개 제작 쇼츠 썸네일** | 현재 문구 유지: "공개한 제작 영상의 썸네일. 아래 프롬프트로 동일하게 제작된 결과는 아닙니다." |
| `bookmark-x-post` | `bookmark-x-post-result.webp` | **이미지 생성 AI로 만든 글 구성 목업** | "게시물 구성 예시용 이미지. 실제 X에 발행한 글 캡처나 검증된 성과가 아닙니다." |
| `mobile-game-screen` | `mobile-game-screen-example.webp` | **이미지 생성 AI로 만든 PC/모바일 수정 방향 목업** | "진단·수정 방향을 표현한 일러스트. 실제 코드 수정 전후 스크린샷이 아닙니다." |

추가로 `pixel-guild-card-result.webp`는 사용자가 이전에 준비한 **범용 샘플 등록증 목업**입니다. 이 파일보다 `guild-actual-output.webp`가 실제 제작 이력의 근거가 더 명확합니다.

## 파일 준비 현황
- 별도 검토용 다운로드 ZIP: `tuki-prompt-box-preview-candidates-v2.zip` (대화 산출물, 사이트 업로드 전)
- 원본 4개 이미지와 영상 3개를 ChatGPT 파일 라이브러리에서 확인했습니다. ZIP에는 사용 가능한 최적화 WebP 6개와 `README.md`를 포함합니다.
- `guild-actual-output.webp`에는 TUKI의 공개 X 핸들과 자체 창작 등록 정보가 표시됩니다. **브랜치에 업로드하기 전 공개 범위를 검토**하세요.
- 영상은 6.6초/11.1초 기존 실험물로 **새로운 10초 공통 프롬프트를 그대로 실행한 결과가 아닙니다**. 동일 입력으로 10초 결과물을 확보하기 전에는 이 사실을 감추지 마세요.

## 실제 연결 단계
1. 필요한 후보만 선택하여 GitHub **feature 브랜치** `feat/tuki-prompt-box-20261014`의 이 폴더 `assets/prompts/results/`에 이미지 **바이너리 그대로 업로드**합니다. `main`에 올리면 즉시 공개되므로 금지.
2. 경로에 파일이 실재함을 확인하고 `content/prompts.json`에서 해당 카드의 `preview.src`, `preview.label`, `preview.note`를 정확히 수정합니다.
3. 영상은 영상 파일 자체를 호스팅할 수 있을 때 `video` 미리보기 UI를 검토하고, 그렇지 않으면 **실제 동영상 캡처 이미지**로만 표시합니다. 링크는 검증된 실제 공개 URL에만 연결합니다.
4. `node --test tests/*.test.mjs`, `node scripts/build-lab-search-pages.mjs --check`, 기존 GitHub Actions 4개 검증 후 PC·모바일의 미디어 로딩과 전체 텍스트 복사를 다시 확인합니다.
5. 사용자 최종 승인 이전에 PR을 준비 완료/병합하거나 TUKI WORLD에 배포하지 않습니다.

## 부족한 실제 동일 프롬프트 결과물 제작 계획
- 10초 영상: 현재 `consistent-character-video`의 정확한 프롬프트와 공개 가능한 **단일 입력 이미지 1장**을 고정, 같은 모델·길이 10초로 1회 생성. 같은 얼굴·의상·팔다리, 시작/종료 장면의 공간 연속성을 검수. MP4 + 첫/중간/마지막 프레임을 보관하고 도구/날짜를 기록.
- 게임 업데이트 쇼츠: 실제 변경 기능 하나를 정하고, 원본 게임 플레이 소스와 (가능할 경우) 이전 버전 영상을 제공. 없는 비교 장면은 만들어내지 않고 **실제 10초 게임 장면**으로 제작, 컷별 사실 검수.
- 정보형 X 글: 같은 프롬프트로 실제 공개용 원고를 작성하고 출처 확인 뒤 게시한 **실제 게시물 링크/캡처**를 확보. 임의 수치나 조회수를 만들지 않기.
- PC/모바일 화면: `390×844`과 `1280×800`에서 실제 같은 게임의 수정 전/후를 캡처하고 테스트 기록 확보. 일러스트 목업과 혼동하지 않도록 분리.

원칙: **실제 생성물 ≠ 참고 아트 ≠ 제작 중 목업 ≠ 실제 코드 수정 증거**.
