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
