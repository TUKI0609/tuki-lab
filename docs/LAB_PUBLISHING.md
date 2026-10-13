# TUKI LAB Publishing Workflow v1

## What changes after approval

A PENDING candidate does not appear as a full TUKI LAB article.

When the user explicitly approves a candidate, ChatGPT should:

1. Read the candidate and every evidence item.
2. Write a concise original TUKI LAB article.
3. Add the article to `content/lab-posts.json`.
4. Add a matching summary entry to `content/devlog.json`.
5. Mark the candidate `APPROVED`.
6. Save `approvedAt` and the resulting article slug.
7. Redeploy the site through the normal GitHub Pages flow.

## Article schema

```json
{
  "id": "lab-momo-2026-W40",
  "slug": "momo-character-eating-build",
  "project": "momo",
  "type": "BUILD LOG",
  "title": "MOMO · 캐릭터가 드디어 밥을 먹기 시작했다",
  "summary": "한두 문장 요약",
  "publishedAt": "2026-10-06",
  "originCandidateId": "lab-momo-2026-W40",
  "sections": [
    {
      "heading": "무엇을 바꿨나",
      "paragraphs": ["본문"]
    }
  ],
  "sources": [
    {
      "label": "YouTube",
      "title": "근거 콘텐츠 제목",
      "url": "https://..."
    }
  ]
}
```

## Editorial rules

- Never copy an external post in full.
- The LAB article must add context: why it mattered, what changed, what was learned, what comes next.
- A source link remains attached to the article.
- Generic third-party game/news posts are never promoted.
- Approval is explicit. "진행하자" to build the system is not approval of a specific candidate.

## Chat commands

Examples:

- `LAB 후보 보여줘`
- `MOMO 후보 승인`
- `LUTRATIDE W40 후보 제목을 바꿔서 승인`
- `AEVOWAKE 후보는 반려`

ChatGPT should resolve the candidate, show ambiguity when necessary, then mutate GitHub only after clear approval.

## LAB approval gate v1.1: prepare privately, publish only after explicit approval

The CLI added by the TUKI operations automation project is **read-only**:

```sh
node scripts/lab-review.mjs queue
node scripts/lab-review.mjs check-draft /outside-repository/my-lab-draft.json
```

It reads `content/lab-candidates.json` and `content/lab-posts.json`, lists PENDING candidates,
and verifies that a draft has a distinct slug, plausible sections, and at least one URL from the
specific candidate's evidence. It never approves, writes, or publishes anything.

Keep unpublished draft text out of this **public repository and public PRs** until the author
explicitly authorizes sharing that draft. Temporary drafts should stay in an untracked local
location, a private user file, or the chat while being reviewed.

### Required two-stage human approval

1. **Editorial review**: identify the precise candidate ID, inspect the original evidence,
   make a new and original draft, inspect duplication and factual accuracy. The user must
   explicitly identify the candidate and approve moving that specific draft to the PR stage.
2. **Public release**: submit a separate publication PR with a complete LAB article,
   one matching devlog record, and updated candidate status `APPROVED` with `approvedAt`,
   `publishedSlug`, and `needsApproval:false`.
   The user must explicitly approve merging the final reviewed publication PR.
   Generic commands such as "계속 진행" or "진행하자" are **not** approval to publish.

The publication checker runs for PRs targeting `main`:

```sh
LAB_BASE_SHA=<40-character base commit SHA> node scripts/lab-review.mjs validate-publication
```

It verifies (a) no existing public LAB post/devlog is silently rewritten;
(b) each new post originates from a previously PENDING candidate;
(c) the proposed candidate has matching approval state and publication slug;
(d) draft fields are complete, candidate evidence is referenced and not already used by another public LAB post;
(e) exactly one new development record is linked to each new article.

**Important**: a passing automated check proves structural consistency, **not** that the user
gave approval. Human review and branch-protection settings remain necessary. The validator
runs on PRs; it cannot prevent someone with write permissions from bypassing PRs and
pushing directly to `main`. Configure the repository's branch protection / rulesets to
require PR review and the `Validate LAB pipeline` check if stronger enforcement is desired.
Never grant publication automation secrets or permission to push unreviewed posts.

Preexisting published articles (3 at first audit) lack `originCandidateId` and are treated as
historical exceptions; the script does not retroactively guess their matching candidates.
The previously approved MOMO candidate may share a YouTube evidence link with an existing article.
Manual confirmation is needed before adding an archival link.

Existing RSS synchronization and PR #2's Pages verification are separate from this publishing process.
No paid API, auto-posting, YouTube scraping, or X scraping is added here.
