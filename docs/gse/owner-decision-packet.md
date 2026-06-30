# GSE — Owner Decision Packet

**Prepared:** 2026-06-29 · Repo C:/Users/Garrett/Sports · branch `claude/gse-no-claim-waitlist`
(clean, off current `main`; 4 commits pushed earlier at Level 2A + 8 more local-only;
**12 ahead / 0 behind** origin/main).
**Purpose:** one page that tells Garrett exactly what's done locally, what's not
public, and which decisions only he can make.

## 1. What is locally committed (and nothing more)

- The full no-claim waitlist + hardening, across 12 commits on `claude/gse-no-claim-waitlist`
  (the original 4 were pushed at Level 2A; the latest 8 are **local-only, not pushed**):
  page/form/route, file store (+write lock), **PR3 DB-store logic** (injected delegate,
  tested; **no schema/migration**), no-op analytics, honeypot + submit-timing anti-bot,
  full a11y, no-claim CI over copy + **50 content posts** + page + emails + research briefs,
  backtest drift guard, and all planning docs.
- Validation green throughout: typecheck 0, lint 0, waitlist 49/49, guardrails 6/6.
- **Local commits on a feature branch. Not pushed beyond the earlier Level-2A push. Not
  deployed. No schema migration applied.**

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

## 7. PR-open prep (ready)

`docs/gse/pr-open-prep.md` is a ready-to-use PR package (title, paste-ready body, gh
command + web URL, pre-merge checklist, do-NOT-merge-to-prod warnings). **Note:** the
remote branch is 9 commits behind local — a COMPLETE PR needs an owner-approved
**re-push** (`git push origin claude/gse-no-claim-waitlist`) first; this agent did not
push. Opening the PR / its preview is Level-2A; **merging to `main` is a production
deploy (Level 3) and is not approved.**

## 8. PR3 build artifacts (prepared; gated)

`docs/gse/pr3-build-artifacts.md` holds the complete ready-to-apply PR3 package (exact
`WaitlistLead` model, canonical migration SQL, delegate wiring, sacred invariants, a
10-step owner-run dry-run sim, rollback/retry). The permission gate blocked editing the
canonical `schema.prisma` without approval, so nothing was staged. **To let the agent
stage Artifacts 1+3 on a local branch (still no migrate / no push), the phrase is:**
**"approve PR3 schema build — local only, no migrate, no push."** The owner alone runs
`prisma migrate dev` against a verified-local DB, and any push/deploy.

## 9. PR3 formal safety layer (LEVEL 1; added 2026-06-29)

`docs/gse/pr3-tlaps-runbook.md` adds a TLA+ model of the 10-step runbook with the six
sacred invariants encoded as safety properties, plus a TLAPS proof (`Spec => []SacredInv`)
in `docs/gse/formal/PR3Waitlist.tla`. The identical transition relation was exhaustively
re-verified by `docs/gse/formal/pr3_runbook_check.py` — **21 reachable states, 8/8
invariants hold, exit 0 (GREEN)**. This pass re-verified parity against current source
(**gate intact**: no `WaitlistLead` in `schema.prisma`; `selectWaitlistStore` db-branch
still commented) and added **artifacts only** — no schema, no migrate, no push, no other
lane. The go-phrase in §8 is unchanged.
