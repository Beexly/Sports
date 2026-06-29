# GSE — Owner Decision Packet

**Prepared:** 2026-06-29 · Repo C:/Users/Garrett/Sports · branch `codex/galaxy-dynasty-studio-rescue-v2`.
**Purpose:** one page that tells Garrett exactly what's done locally, what's not
public, and which decisions only he can make.

## 1. What is locally committed (and nothing more)

- Commit `3cf92cf5` — `feat(gse): add local no-claim waitlist` (22 files, +1807/−1).
- A second local commit (pending this run) adds the PR3/release/content **planning
  docs** under `docs/gse/` — markdown only, no code/behavior change.
- Both are **local commits on a feature branch. Not pushed. Not deployed.**

## 2. What is NOT public (current reality)

- `/waitlist` is `noindex` and unlinked; reachable only on a local dev server.
- Nothing is pushed to any remote (branch is 1+ commits ahead of origin, local-only).
- No deploy, no public URL, no Stripe, no email send, no analytics vendor.
- Lead storage is a **local file** under gitignored `.gse-local/` — not a database,
  not production storage.

## 3. Gates that remain (each owner-only)

| # | Gate | What it unlocks | Risk |
|---|---|---|---|
| 1 | Approve `WaitlistLead` migration | durable DB storage | schema/DB change leads deploy |
| 2 | Approve analytics provider | real funnel metrics | privacy/PII, vendor DPA |
| 3 | Approve removing `noindex` + nav | discoverable page | public exposure |
| 4 | Approve deploy / push | live `/waitlist` | the big one — external |
| 5 | Approve email send | confirmation/follow-up | external messaging |

## 4. Next decisions (pick any; each is independent)

- **Decision A:** advance storage to the DB (gates 1, then 2-bundled durable write)?
  Recommended path if you want leads to survive serverless restarts.
- **Decision B:** keep everything local and dark until you have first traffic plans?
  Zero-risk hold; the committed branch is a stable checkpoint.
- **Decision C:** approve a manual content push (drafts in `content-to-lead-plan.md`)
  — you post, no agent auto-posts.

## 5. Do-NOT-approve list (would cross a global gate; do not request casually)

- Pushing/deploying `/waitlist` without the release-gate checklist (`release-gate-plan.md`).
- Any pricing, Stripe, checkout, sportsbook, or affiliate wiring.
- Any sports performance / win-rate / ROI / accuracy / edge / profit claim.
- Auto-sending email or auto-posting content.
- Importing the local `.gse-local/` lead file into anything external.

## 6. Recommended next action

Hold at the committed local checkpoint (Decision B) unless you want durable storage —
in which case approve gate 1 and I'll build the migration in a local PR3 branch and
stop before deploy. Everything needed to decide is in `pr3-durable-storage-plan.md`,
`pr3-analytics-provider-plan.md`, and `release-gate-plan.md`.
