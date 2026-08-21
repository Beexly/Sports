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

### ✅ THE CRITICAL PATH IS COMPLETE (2026-08-21 22:25Z)

Every buildable item on handoff §1 is merged. Do **not** rebuild these:

| Item | PR | SHA |
|---|---|---|
| 1. Age gate (server-side 21+ at checkout) | #452 | `f75d43b4` |
| 2. T11 settlement backfill + daysFrom=3 + dated ESPN clearance | #451 | `cd9f467b` |
| 5. MoneyPuck rights downgrade (route dark) | #453 | `bead91ec` |
| 6. Calibration CI layer (Clopper-Pearson) | #454 | `efe25f2f` |
| 7. De-vig oracle + Parlay MRI v1 | #448 | `4455c96f` |
| — regression repair after #454 | #456 | `eb212632` |

`main` is green: **11493 tests passing, 0 failing**, `tsc` exit 0, import-boundary guard 0 violations.

⚠️ **Post-merge lesson — run the FULL suite, not just your PR's tests.** #454 passed its own tests but
broke two others on `main`: it tripped the `no-fake-percentages` brand-safety tripwire (a literal
`95%` beside win-rate context) and shifted a positional `mockDb` sequence by inserting a `VOID`
`pick.count`. Both were caught only by running the whole `apps/web` suite after merge. Do the same.

### Next buildable items (handoff §4 develop queue)

Ranked. Take the top unclaimed one; announce it in your PR title so we don't collide.

1. **B2B v1 API tier scoping** [VERIFIED leak, S] — `/api/v1/signals` and `/api/v1/probabilities`
   filter on `isPublished`/`isBootstrap`/`modelVersion` only, with **no tier filter**, then emit
   `modelConfidence`/`pModel` unconditionally — Pro-gated confidence on ALL picks, under one shared
   static key. Add per-key scopes or a tier filter.
2. **Durable rate limiting on public routes** [S] — `lib/api/rate-limit.ts` is an in-memory
   per-process token bucket (its own docstring admits it); a Postgres-backed limiter already exists
   for B2B. Swap it in and handle `x-forwarded-for` via a trusted proxy.
3. **NB2 dispersion property test** [S] — research-only. Monte-Carlo assert `Var = μ + μ²/φ` and that
   empirical VMR lands ≈2.15 at league mean. This is the test that would have caught `φ=12`.
4. **Per-sport dispersion estimator** [M] — offline `estimate-phi.ts` (method-of-moments, floored) over
   settled `TeamGameLog`. Makes NHL fall to Poisson automatically instead of by hardcoded assumption.
5. **Clearance-surface hardening** [M] — ClubElo remains ungated. Kalshi is now
   `permission_required` + `checkClearance` (2026-08-21).
6. **Clean-source registry batch** [S] — the license-verified open sources in handoff §5.
7. **Watchdog contract test + workflow schedule-literal lint** [S each] — the `.github/**` line edits
   are founder-only (sealed), but **the tests are yours to write**.

### ⛔ BLOCKED — clearance gap on live pick inputs (needs founder verification)

`packages/ingestion-pipeline/src/build-independent-fair-values.ts` is on the
**live pick path** (`generate-signal-slate.ts:144`) via `independentFairValue`.

Kalshi is no longer ungated. ClubElo still is (`tryClubEloFairValue`). Do **not**
register ClubElo as denied on the absence of a license — wait for the maintainer
reply (A4). Why: SBR was wrongly marked *approved* on thin evidence; marking
ClubElo *denied* on equally thin evidence is the same error with the opposite sign.

- **Kalshi — VERIFIED 2026-08-21 (Grok, local PDF).** Live file
  `https://assets.kalshi.com/Kalshi-Developer-Agreement.pdf` (HTTP 200, 125,685 bytes,
  `Last-Modified: Thu, 09 Nov 2023`, Developer Agreement v1.1). HTML at
  `kalshi.com/developer-agreement` is behind a Vercel 429 checkpoint; the PDF is the
  governing text. §3: "Use of Kalshi APIs is expressly limited to facilitating a
  members own trading on the Exchange; all other usages are disallowed and may result
  in account suspension." §3.1: collecting/caching/aggregating/storing API data except
  for own trading, and sharing with third parties, requires "prior written
  authorization from Kalshi." Registered `kalshi` as `permission_required` and gated
  both live call sites (`build-independent-fair-values.ts` KalshiClient.getFairValue
  and `quote-plane` `kalshi-trade-api.ts`) with `checkClearance`; denial returns null /
  `[]` on the existing soft-fail path. Unlock is written authorization from KalshiEx
  LLC covering commercial derived-analytics use — not Exchange membership alone.
- **ClubElo** — no terms/license found anywhere on the site. Absence of a stated license
  is **not a grant**, but it is also not a documented prohibition.

**Founder decision required, in this order:**
1. ~~Confirm Kalshi's data terms.~~ **DONE 2026-08-21.** PDF verified; registered
   `permission_required` and gated. Remaining OWNER_GATE: email KalshiEx LLC for
   written commercial authorization if we want this signal back.
2. Email ClubElo's maintainer (Lars Schiefler) for terms. Until answered, treat as
   undetermined.
3. ClubElo gate: once status is settled, add `checkClearance` inside
   `tryClubEloFairValue` and return `null` on denial — the soft-fail path already exists.

**Interim posture:** Kalshi is fail-closed pending written authorization. ClubElo
remains documented-ungated until the maintainer replies. Do not treat silence as a grant.

### Founder-gated (do NOT attempt)
Stripe scope-clarification letter · `CRYPTO_PAYMENTS_ENABLED` rail · PROVEN flag flip
(`PUBLIC_PICKS_ENABLED` + `CANONICAL_HISTORY_ENABLED`) · MoneyPuck permission email · Neon prod
string rotation · `User.dateOfBirth` Prisma migration · running the MVE.

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

---

## 2026-08-21 21:30Z — Grok loop note

- **#448 merged.** De-vig oracle + Parlay MRI is on `main` (`4455c96f`).
- **#451 ready for review** (`grok/t11-settlement-backfill`): T11 daysFrom=3 + free-source stale backfill + dated ESPN clearance. Vertex unused-import lint fix included so CI can go green. First live drain is OWNER_GATE.
- **This branch (`grok/age-gate-21`):** item 1 age gate, app-side only. Checkout refuses missing/invalid/under-21 DOB *before* Stripe. No Prisma field yet — persistence is OWNER_GATE (schema sealed). Google signup still cannot collect DOB without a User column.
- Next after this: calibration CI layer, or MoneyPuck registry downgrade (no schema).
