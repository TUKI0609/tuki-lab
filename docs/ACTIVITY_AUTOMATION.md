# TUKI WORLD Activity Automation v1

## Goal

TUKI WORLD should follow TUKI's normal publishing activity without requiring the home page to be edited by hand.

The first automation layer is intentionally simple:

external public post/video
→ public feed collector
→ content/activity.json
→ TUKI WORLD Latest Activity
→ GitHub Pages redeploy

## Current adapters

### Naver Blog · AI / 제작
Automatic via public Naver RSS.

### Naver Blog · 게임
Automatic via public Naver RSS.

### YouTube
Best-effort automatic detection.
The sync script attempts to resolve the channel ID from the public handle page and then reads the official uploads feed.
If this becomes unreliable, store the canonical channel ID in automation/sources.json.

### X
Not automatically ingested yet.
Official/API-backed access or Metricool should be connected before enabling it.
Do not scrape login-protected or unstable X pages.

## Activity is not TUKI LAB

Activity is a stream of public actions:
- new blog post
- new video
- social post
- release

TUKI LAB is curated history:
- meaningful build log
- important fix
- decision
- experiment
- postmortem

Do not promote every activity item into TUKI LAB.

## Future AI layer

A later classification step can decide:
- related project
- PLAY / READ / WATCH / BUILD
- importance
- whether several activities form one LAB entry
- whether project status/currentFocus should change

Until that layer is connected, feed ingestion stays deterministic and conservative.

## Schedule

The GitHub Action checks public feeds every three hours.
It only commits when content/activity.json actually changes.

No API passwords or private project credentials are required for the current RSS/feed adapters.


## Editorial gate v2

The collector now has three layers:

- `content/activity-all.json` — raw collected activity with editorial decisions
- `content/activity.json` — public, curated activity shown on TUKI WORLD
- `content/activity-review.json` — ambiguous items for later AI or human review

Rules live in `automation/editorial-rules.json`.

### Important policy

Generic third-party game news, coupon/event posts, sports results, and unrelated game guides are collected only as raw feed data and are not shown publicly by default.

The game-information blog is allowed into TUKI WORLD when the post is about:
- TUKI's own game/project
- a direct review or retrospective of a TUKI-made game
- a maker/development post clearly tied to TUKI's work

This keeps TUKI WORLD as a creator ecosystem instead of turning it into a mirror of every external post.

### Project attribution

Known project keywords automatically attach activity to:
- MOMO
- LUTRATIDE SURVIVORS
- AEVOWAKE

Items with uncertain relevance go to the review queue rather than being published automatically.
