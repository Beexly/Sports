# Agent coordination — read this FIRST, before any other doc

**Who this is for:** any coding agent (Grok Build CLI, Claude Code, or otherwise) picking up work on
this repo. It tells you the current lay of the land and, critically, **how not to stall.**

**Last updated:** 2026-08-21 21:20Z, after the merge queue was cleared.

---

## 1. THE RULE THAT MATTERS MOST: never block on a merge

You do **not** have merge authority and you do **not** need it. There is a Claude session with
GitHub write access that reviews and merges PRs on a recurring loop (~45 min), and it wakes
automatically when you push to a PR it is watching.

**So: push a branch, open a PR, and immediately start the NEXT item.** Do not wait for the merge.
Do not end your run saying "blocked on owner merge" — that is a stall, and there is no way to wake
you back up. If something genuinely cannot proceed, say so **in the PR body** and *keep building
something else from the queue.*

**The asymmetry to understand:** Claude can see your pushes; **you cannot see Claude's.** You have no
inbox. So always `git fetch origin main` and re-read this file at the start of a run — that is the
only way you learn what changed.

---

## 2. Current state (verified on `main` @ `a060f57d`)

**`main` is GREEN. The merge queue is EMPTY. Nothing is gated on a merge button.**

Merged 2026-08-21:

| PR | What | SHA |
|---|---|---|
| #447 | **T12 AI-transport import boundary — 8 violations → 0.** The repo-wide CI red is GONE. | `e742a1af` |
| #446 | ESPN `limit=1000` on all three scoreboard fetchers, incl. the live settlement path | `2da6f4e0` |
| #441 | build-segfault / placeholder `DATABASE_URL` stub | `e7dd6222` |
| #445 | master handoff + build specs | `3fa20887` |
| #448 | **de-vig oracle + Parlay MRI v1 (Grok's work — merged, verified, thank you)** | `4455c96f` |
| #449 | handoff state refresh | `a060f57d` |

Verified on `main`: import-boundary guard **0 violations** (2138 files) · `espn-scores.ts` carries
`limit=1000` · prediction-engine **2399 tests pass** · `tsc` exit 0.

**If you are holding a note that says "merge #446 first" or "T12 is a CI blocker" — that note is
STALE. Both are done.**

---

## 3. What to build next (from `docs/ops/2026-08-21-MASTER-HANDOFF.md` §1)

Work top-down. Each is independent enough to start without the others.

1. **Age gate** — no DOB field exists on the `User` model (verified: zero hits in
   `packages/db/prisma/schema.prisma`). Needs a DOB field + **server-side** 21+ verification at
   signup and at subscription checkout. It is the launch blocker for all paid acquisition.
   ⚠️ `prisma/schema.prisma` + `migrations/**` are normally **sealed** — build the app-side logic and
   validation, and if a migration is genuinely required, **flag it in the PR body** rather than
   stalling.
2. **T11 settlement backfill** — spec:
   `git show origin/claude/overnight-2026-08-21:docs/ops/2026-08-21-settlement-backfill-spec.md`.
   Still unbuilt (`settle-sport.ts:184` is still `getScores(sport.key, 2)`).
   - `daysFrom` 2 → 3 at `settle-sport.ts:184` and `:187` (The Odds API documents max 3, so this is legal)
   - free-source backfill lane for picks older than the paid window + a health metric that reflects it
   - **DROP spec step B.4** (auto-VOID >14-day picks): there is no generic VOID path to reuse — the only
     one (`free-settlement.ts:292-306`) requires positive postponement evidence. Keep PENDING-with-flag.
   - **Also gate** the dated ESPN fetch loop at `multi-source-scores.ts:130-141` — it has no
     `checkClearance` call, unlike the undated paths.
   - Free-source only. No live DB in tests. Deployment is the founder's.
3. **Calibration CI layer** — gates the PROVEN milestone. Clopper-Pearson interval on the headline
   number, per-bin bands, quantile binning, full population including voids, version pinning.
   Publishing a bare "58% win rate" at n≈100 is an FTC overclaim risk.

---

## 4. Hard constraints (non-negotiable, apply to every agent)

- **Never** push directly to `main`. Branch + PR only.
- **Never** touch `.github/**` (sealed), and treat `prisma/schema.prisma` + `migrations/**` as sealed
  unless the founder has said otherwise — flag, don't force.
- **Never** run the MVE (one-shot, irreversible, founder-gated).
- **Never** weaken a guard, loosen a tolerance, or `.skip` a test to get green.
- **Real exit codes.** Don't pipe a check through `tail` in a way that masks failure.
- Rights posture: every new data source goes through the Clearance Engine with a RightsSnapshot, and
  rights are judged by the **source's ToS**, never a wrapper repo's license.
- Verify claims against primary sources. This project's own research has a measured **~37% defect
  rate** in unverified assertions — see the handoff's tagging system (VERIFIED / ANALYST / COUNSEL).

---

## 5. Handoff protocol between agents

- **Starting a run:** `git fetch origin main` → re-read this file → `git log --oneline -10 origin/main`.
- **Finishing a slice:** push the branch, open a PR with real exit codes in the body, then **start the
  next queue item in the same run** if you have budget.
- **Leaving a message for the other agent:** put it in the PR body, or append to this file under a
  dated heading. Both are read on every cycle.
- **Never** assume the other agent knows what you did — the only shared state is the repo.
