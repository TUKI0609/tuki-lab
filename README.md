# TUKI WORLD

AI와 함께 직접 만들고, 실패하고, 고쳐가며 공개하는 TUKI의 제작 허브.

## Public structure

- `/` — Home
- `/projects/` — Active projects
- `/lab/` — Build logs, fixes, experiments, postmortems, decisions
- `/about/` — TUKI WORLD identity and official channels

## Data

- `content/site.json`
- `content/projects.json`
- `content/characters.json`
- `content/devlog.json`
- `content/lab-posts.json`
- `content/lab-candidates.json`
- `content/activity.json`
- `content/channels.json`

## Approved assets

- `assets/manifest.json`
- `assets/brand/`
- `assets/projects/`

## Rules

Public site code, public assets, public links, and public summaries only.

Do not commit API keys, tokens, passwords, private source code, .env secrets, or private Verse8/GitLab credentials.

See:
- `docs/TUKI_WORLD_FOUNDATION.md`
- `docs/CONTENT_MODEL.md`


## Content automation

Public feeds are collected into Activity, filtered through editorial rules, attributed to projects, and grouped into TUKI LAB candidates. Full LAB articles require explicit approval.

See:
- `docs/ACTIVITY_AUTOMATION.md`
- `docs/LAB_CANDIDATES.md`
- `docs/LAB_PUBLISHING.md`
