# TUKI WORLD Foundation v1.0

## 1. Purpose

TUKI WORLD is the public hub for TUKI's projects, experiments, original IP, games, and creator logs.

The site has four jobs only:

1. Explain what TUKI makes.
2. Let visitors immediately play, read, watch, or inspect the build process.
3. Show the real status of each project without exaggeration.
4. Preserve experiments, including failures and discontinued work, as public creative history.

TUKI WORLD is not a source-code repository, a giant portfolio dump, or a news portal.

---

## 2. Core Brand Structure

### TUKI WORLD
The public-facing world and entry point.

### TUKI LAB
The workshop inside TUKI WORLD.
It contains build logs, experiments, postmortems, failures, lessons, and technical notes.

### Project Worlds
Each active project has its own identity and visual language while remaining inside TUKI WORLD.

Current examples:
- MOMO
- LUTRATIDE SURVIVORS
- AEVOWAKE

---

## 3. Primary Navigation

Keep the top navigation compact.

- HOME
- PROJECTS
- LAB
- ABOUT

PLAY / READ / WATCH / BUILD are not top-level pages.
They are discovery routes on the home page.

### Discovery routes
- PLAY: playable games
- READ: novels and original IP
- WATCH: YouTube, Shorts, visual progress
- BUILD: development logs and experiments

This keeps the navigation simple while allowing visitors to enter by intent.

---

## 4. Home Page Architecture

The home page should use this order.

### 01 Hero
Goal: explain TUKI WORLD in 3 seconds.

Contains:
- TUKI WORLD identity
- one-line promise
- TUKI mascot as global guide
- primary CTA: Explore Projects
- secondary CTA: Start Here

Do not place multiple project images in the hero.

### 02 Start Here
Goal: explain the system to a first-time visitor.

Three short answers:
- What is this?
- What can I do here?
- Where are the projects actually published or built?

### 03 Explore
PLAY / READ / WATCH / BUILD.

This section routes people by intent, not by project name.

### 04 Current Projects
Only active or publicly relevant projects.

Each project card must contain:
- official visual
- project name
- category
- current state
- one-sentence concept
- current focus
- primary action

Avoid long explanations.

### 05 Characters & Guides
Show only characters that help visitors understand the ecosystem.

Rules:
- TUKI = global guide
- project characters = local guides
- characters are not decorative stickers
- do not repeat the same character excessively

### 06 Latest from TUKI LAB
3 to 5 recent entries maximum.

### 07 Channels
YouTube, X, Naver Blog, and other official destinations.

### 08 Footer
Compact identity, navigation, copyright, and social links.

---

## 5. Project Detail Page Template

Every active project should eventually use the same information architecture.

### Header
- official project visual
- title
- short concept
- status
- main CTA

### What is it?
2 to 4 short paragraphs maximum.

### Current Build
Show what is actually implemented today.

### What makes it different?
3 key reasons only.

### Progress
Use milestones, not vague percentages.

Example:
- Core Loop
- Persistence
- Mobile QA
- Public Release

### Latest Changes
Pull recent TUKI LAB entries associated with the project.

### Links
Only verified public destinations.

### Characters
Only when characters are relevant.

---

## 6. Project Status Vocabulary

Use a controlled vocabulary.

- CONCEPT
- PROTOTYPE
- IN DEVELOPMENT
- EARLY RELEASE
- LIVE
- ON HOLD
- DISCONTINUED

Never use vague labels such as "almost finished" or arbitrary percentages.

A public project card should also state availability:

- PLAYABLE
- READING AVAILABLE
- NOT YET PUBLIC

---

## 7. Character System

### TUKI
Role: global guide and creator mascot.

Use:
- hero
- Start Here
- About
- empty states
- occasional Lab prompts

Do not use:
- every card
- every section
- project-specific story areas

### MOMO
Role: guide for the MOMO project.

### LUNA
Role: playable character inside LUTRATIDE SURVIVORS.
LUNA is not the game title.

### AEVOWAKE
Use canonical characters only.
Do not reuse deprecated or incorrect character imagery.
Mira must follow the current non-human Anchor Creature canon.

---

## 8. Visual System

### Base
- dark neutral background
- high-contrast white typography
- mint TUKI accent
- project-specific accents allowed inside project cards/pages

### Color hierarchy
Global accent:
- Mint

Supporting accents:
- Warm yellow
- Violet
- Blue

Project colors must never replace the global site identity in navigation.

### Typography
Use a clean Korean/Latin sans-serif stack.

Hierarchy:
- Display: strong and compact
- H2: large section heading
- H3: card/project title
- Body: readable, calm
- Metadata: small uppercase or letter-spaced

Avoid too many font sizes.

### Spacing
Use an 8px spacing system.

Preferred spacing values:
- 8
- 16
- 24
- 32
- 48
- 64
- 96

### Radius
- small UI: 10 to 14px
- cards: 20 to 24px
- hero/feature panels: 28 to 32px

### Project card image ratio
Prefer 16:10 or 4:3.
Do not use random image heights.

### Image rules
- one official primary visual per project
- transparent character art where appropriate
- no text embedded in character art
- titles and labels remain HTML text
- avoid collage unless the content itself requires comparison

---

## 9. Content Tone

TUKI WORLD should sound like a maker, not a corporation.

Good:
- what was built
- what failed
- what changed
- what is public now
- what is still rough

Avoid:
- exaggerated launch language
- fake completeness
- marketing jargon
- overly long technical explanations on the home page

---

## 10. TUKI LAB Content Types

Every Lab entry belongs to one type.

- BUILD LOG
- EXPERIMENT
- FIX
- RELEASE
- POSTMORTEM
- DECISION

Example:
AI webtoon attempt stopped after episode 1 -> POSTMORTEM.

This makes failures part of the system instead of hiding them.

---

## 11. Repository Boundaries

The public tuki-lab repository contains only:
- public website code
- public images
- public metadata
- public links
- public development summaries

Never store:
- API keys
- access tokens
- passwords
- .env secrets
- private source code
- private Verse8/GitLab credentials
- unpublished confidential documents

Game source repositories remain separate.

---

## 12. Asset Structure

Recommended structure:

assets/
  brand/
    tuki/
  projects/
    momo/
    lutratide-survivors/
    aevowake/
  ui/
  social/

Each project folder should eventually contain:
- cover
- character
- thumbnail
- optional screenshots

Do not mix temporary candidates with approved assets.

---

## 13. Content Data Model

Site content should be data-driven where possible.

Core public data files:
- content/projects.json
- content/devlog.json
- content/channels.json
- content/site.json

Project pages should eventually load shared structured data rather than duplicating text in HTML.

---

## 14. Update Workflow

### Project update
1. Development happens in the original project environment.
2. A meaningful milestone is reached.
3. TUKI LAB receives a short factual update.
4. Project status/current focus is updated if necessary.
5. TUKI WORLD redeploys.

Do not update the homepage for every tiny code change.

### Visual update
1. Select an official asset.
2. Move it to the approved asset folder.
3. Update the asset manifest.
4. Replace globally.

Do not patch individual pages with random image versions.

---

## 15. Foundation Rule

Before adding new major content, ask:

Does this improve navigation, project understanding, identity, or maintenance?

If not, it probably does not belong on the site yet.

The current site should be treated as a prototype until this foundation is implemented consistently.
