# TUKI LAB Candidate Workflow v1

## Purpose

External activity should not become a TUKI LAB entry automatically.

The workflow is:

public activity
→ editorial gate
→ project attribution
→ weekly project cluster
→ LAB candidate
→ approval
→ TUKI LAB

## Candidate queue

Candidates are stored in:

`content/lab-candidates.json`

They are not rendered on the public website.

Each candidate contains:
- project
- suggested LAB type
- suggested title
- suggested summary
- confidence
- evidence links
- approval status

## Approval states

- PENDING
- APPROVED
- REJECTED

The generator preserves an existing candidate's status when it runs again.

## Current grouping rule

Only public activity already attributed to a known TUKI project is eligible.

Known project activity is grouped by project and ISO week.

This intentionally avoids creating LAB entries from generic AI tips or third-party game news.

## Recommended approval interaction

The user can ask ChatGPT:

- "LAB 후보 보여줘"
- "MOMO 후보 승인"
- "이 후보 제목을 바꿔서 승인"

On approval, ChatGPT should:
1. read the candidate evidence,
2. create or update the appropriate `content/devlog.json` entry,
3. mark the candidate APPROVED,
4. preserve the evidence URLs,
5. redeploy TUKI WORLD.

The approval step is intentionally human-controlled.
