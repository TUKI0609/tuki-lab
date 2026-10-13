# TUKI 운영 자동화 v1 · 1단계 감사 및 승인 경계

확인일: 2026-10-13 · 대상: `TUKI0609/tuki-lab`

## 1. 현재 구축되어 있는 것

- `.github/workflows/sync-activity.yml`: RSS를 3시간 간격으로 조회하고 변경된 activity 및 LAB 후보를 저장한다. `tuki-world-bot`의 `Sync public activity` 커밋이 2026-10-13에 관찰되었다. 개별 GitHub Actions 실행의 최종 성공 상태를 확인한 것은 아니다.
- `scripts/sync-activity.mjs`: 활성 네이버 RSS에서 게시물 메타데이터를 받아 편집 정책으로 분류한다. 외부 게시물 전문을 복제하지 않는다.
- `automation/sources.json`: 네이버 AI/제작 블로그(`ty_free`)와 게임 블로그(`abb7664`) RSS를 사용한다. YouTube 및 X 수집은 공식 인증 방식 검증 전까지 중단되어 있다. 다른 네이버 블로그를 추가하는 일은 별도 승인 후 진행한다.
- `scripts/build-lab-candidates.mjs`: 프로젝트별·ISO 주차별로 LAB 후보를 생성한다. 후보를 자동 승인하거나 게시하지 않는다.
- 점검 당시 `content/lab-candidates.json`: 후보 4건 (PENDING 3, APPROVED 1, REJECTED 0).
- 점검 당시 `content/lab-posts.json`: 게시물 3건. 게시물에서 `originCandidateId`를 찾지 못해 승인 후보와의 연결을 기계적으로 검증할 수 없다. 과거 콘텐츠와 후보를 제목만으로 임의 매칭하거나 자동 수정하지 않는다.

## 2. 이번 PR에서 해결하는 최소 안전 문제

1. **브랜치 경계**: RSS 동기화 및 `main`에 쓰기 권한이 있는 작업은 `main` 브랜치에서만 실행. 기능 브랜치의 변경으로 생산 사이트가 우회 변경되지 않게 한다.
2. **불필요한 커밋 방지**: 동일한 후보 증거·상태는 `updatedAt`이 바뀌지 않아 정기 동기화 시 불필요한 파일 변경을 줄인다.
3. **승인 이력 보존**: 최근 45일의 후보 생성 대상에서 빠진 기존 승인·반려·대기 기록도 자동 삭제하지 않는다. `REJECTED`는 승인 대기로 되돌리지 않는다.
4. **읽기 전용 감사**: `node scripts/audit-lab-pipeline.mjs`로 후보 상태, 증거 개수, 승인 후보와 게시물의 명시적 연결을 점검한다. 게시물과 연결되지 않은 과거 승인 기록은 경고만 출력한다.
5. **추가 비용 없음**: Node.js 내장 기능과 GitHub Actions만 사용. OpenAI API 또는 새 유료 서비스 호출 없음.

검증 명령:

```bash
node --test tests/lab-candidates.test.mjs
node scripts/audit-lab-pipeline.mjs
```

새 PR 전용 검증 워크플로는 `contents: read` 권한만 사용하며 사이트를 배포하거나 `main`에 커밋하지 않는다.

## 3. LAB 후보 → 승인 → 게시의 최소 운영 절차

1. **검토 요청(읽기 전용)**: 사용자가 `LAB 후보 보여줘`라고 하면 PENDING 3건의 제목, 근거 링크, 관련 프로젝트, 추천 유형 및 미확인 사항을 보여준다.
2. **원고 준비(게시 전)**: 한 후보를 선택하면 `content/lab-posts.json` 형식으로 고유 본문 초안을 준비한다. 본문은 증거의 단순 복제가 아니라 프로젝트 변경 사항·문제 해결·교훈을 설명한다. 초안은 별도 브랜치/PR로 검토한다.
3. **명시적 승인**: 사용자가 해당 후보와 최종 원고를 특정해 공개 승인하기 전에는 `APPROVED`로 바꾸거나 `main`에 병합하지 않는다. `originCandidateId`로 후보와 게시물 간 정확한 관계를 기록한다.
4. **원자적 게시 변경**: 게시를 승인받으면 하나의 PR에서 `lab-posts.json`의 본문, `devlog.json`의 요약, `lab-candidates.json`의 `APPROVED`·`approvedAt`·발행 slug를 함께 검토한다. 중복 slug/ID 검사, 근거 URL 및 공개 권리 검수를 통과해야 한다.
5. **공개 단계**: PR 병합은 실제 GitHub Pages 공개를 유발할 수 있으므로 별도 명시적 사용자 승인 후에만 수행한다. 승인 전에는 PR을 draft 상태로 유지한다.
6. **사후 검증**: 공개 후 본문 경로·근거 링크·중복 게시 여부를 확인한다. 실패 시 원인을 보고하고 사용자 승인 없이 다른 글을 대신 공개하지 않는다.

## 4. 다음 단계로 남기는 일

- 기존 APPROVED 모모 후보와 이미 공개된 본문의 관계를 **수동 대조**한다. 별도 승인 없이 오래된 글의 `originCandidateId`를 추측해서 추가하지 않는다.
- 승인한 새 후보를 일관된 slug·원고·개발기록으로 작성하는 별도 보조 명령/스크립트는 위 승인 경계가 확정된 다음에 구현한다.
- 후보 자동 수집을 넘어 *자동 공개*하는 기능은 이번 단계에 포함하지 않는다.
- 정기 GitHub Actions 성공 로그, GitHub Pages 실제 상태, 보호 규칙 등을 추가 검증한다. 봇 커밋 기록만으로 전체 성공을 단정하지 않는다.
