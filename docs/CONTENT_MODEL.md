# TUKI WORLD Content Model v1.0

## projects.json

Each project should follow a shared shape.

```json
{
  "id": "momo",
  "name": "MOMO",
  "type": "GAME",
  "route": "PLAY",
  "status": "IN DEVELOPMENT",
  "availability": "NOT YET PUBLIC",
  "platform": "Verse8",
  "tagline": "기억하고 반응하며 함께 생활하는 Companion Pet.",
  "currentFocus": "공개 전 UX와 실제 플레이 QA",
  "visual": {
    "cover": "assets/projects/momo/cover.webp",
    "character": "assets/projects/momo/momo.png"
  },
  "links": [],
  "characters": ["momo"],
  "labTags": ["momo"]
}
```

## devlog.json

```json
{
  "id": 1,
  "date": "2026-10-06",
  "type": "BUILD LOG",
  "project": "momo",
  "title": "Companion Record 구조 정리",
  "summary": "기록 화면과 저장 흐름을 정리했다."
}
```

Allowed types:
- BUILD LOG
- EXPERIMENT
- FIX
- RELEASE
- POSTMORTEM
- DECISION

## channels.json

```json
{
  "id": "youtube",
  "name": "YouTube",
  "role": "개발 변화와 플레이 영상",
  "url": "https://..."
}
```

## site.json

Recommended global fields:

```json
{
  "name": "TUKI WORLD",
  "tagline": "만들고, 망해보고, 다시 고칩니다.",
  "routes": ["PLAY", "READ", "WATCH", "BUILD"],
  "primaryAccent": "mint"
}
```

## Rules

- The home page reads project state from structured data.
- Project titles are canonical and must not be replaced by character names.
- Public links must be verified.
- Deprecated visuals must not remain in approved asset paths.
- A project can be DISCONTINUED and still remain visible in TUKI LAB.
