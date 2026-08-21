# Session status & founder decisions — 2026-08-21 (gym-session, autonomous)

One-screen summary of what I shipped, what's ready for your click, and what I deliberately left
for you. Every code change is validated (tests + typecheck) before push; nothing founder-gated was
touched unilaterally.

## ✅ Shipped (validated, pushed, draft PRs)

| PR | What | State |
|---|---|---|
| **#446** | ESPN scoreboard fetch now sends explicit `limit=1000` — busy dates (CFB Saturdays, multi-league soccer) were silently truncating the free schedule seed, dropping games before settlement ever saw them. | data-ingestion **296/296 tests green**, tsc 0. Draft, subscribed. |

## 🟢 Ready for your merge click (verified green, I don't merge to main)

- **#442 (ledger guard)** — already merged; `main` is green.
- **#441 (build-worker segfault fix)** — **its Build and Test checks are both green** on the merge
  with main. The segfault fix works. Its *only* red is the pre-existing **T12 import-boundary** guard
  (below), which is red on every PR because it's red on `main`. Once T12 lands, #441 is fully green.

## 🔑 T12 — the one red blocking green CI everywhere (OWNER DECISION)

The `AI transport import boundary` guard reports **8 violations on `main`** (so on every PR).
**#433 already fixes 4** (moved provider error classes to `provider-errors.ts`). The remaining **4**
were explicitly deferred by the prior pass as "needs an owner decision," and I verified why that's
correct rather than override it in the **sealed control-plane** while you're out:

1. **3 config predicates** — `jynx.ts` imports `isBedrockConfigured` / `isVertexConfigured` /
   `isAzureFoundryConfigured` from `providers/*`. `bedrock`/`azure` predicates are pure env checks
   (move trivially), but `vertexConfig` pulls `parseServiceAccountJson` from `providers/google-oauth`.
   A clean relocation therefore has to move/split **google-oauth too**, which drags in its **test file**
   and a **genesis-kernel evidence manifest** (`packages/genesis-kernel/src/repo-evidence.ts:72`).
   The predicates are also used by the allowlisted `ai-control-plane/dispatch.ts`, and routing through
   `provider-dispatch` is genuinely circular (`provider-dispatch.ts:13` imports from `jynx`).
2. **1 endpoint literal** — `scripts/ops/smoke-free-lane.mjs:58` (`api.cerebras.ai/...`) needs a
   **new** entry in the guard's `OPERATOR_SCRIPT_ALLOWLIST` (it is NOT already in `claude-api-usage.mjs`,
   so it's a fresh policy exemption, not mirroring an existing one).

**Recommendation:** approve the relocation approach (extract `*Config` + `is*Configured` + a moved
`google-oauth` into a boundary-safe `provider-config.ts`, re-export from providers for byte-identical
API — the same pattern #433 used for errors; update the genesis-kernel manifest path; add the smoke
script to `OPERATOR_SCRIPT_ALLOWLIST`). It's **behavior-preserving by construction**. Give the word and
I'll execute it in one focused PR (superseding #433) gated on the full guardrail suite + provider tests
+ build. I did not do it unsupervised because it edits the sealed control-plane, guard policy, and an
evidence manifest.

## 📊 Data sourcing — "stop fighting The Odds API" (see coverage doc for full detail)

- **Soccer: SOLVED, free.** `football-data.co.uk` = free CSVs with **real closing columns**
  (Bet365/**Pinnacle close**/Max/Avg + closing O/U + Asian handicap), 2021/22–2025/26, ~22–25 leagues,
  no login/contract. Removes The Odds API for the entire soccer leg. Register `approved_public_logged_off`
  (facts + timestamps + attribution only; don't mirror the CSVs).
- **US majors (MLB/NFL/NBA/NHL): no free closing-line source exists** — every "free" one traces to the
  excluded SBR ($5,000 ToS). This is a **licensed-vendor decision, now settled.** Trial **SportsGameOdds**
  (published commercial terms, free tier, built-in settlement) as the diversification target off The
  Odds API.
- **Register-now list** (football-data.co.uk, Retrosheet, footballcsv, schochastics, openfootball,
  martj42, OpenLigaDB-with-caveat) is prepared in the coverage doc but **NOT applied** — rights changes
  carry the SBR-error history, so they want your eyes. **⚠ Verify the MoneyPuck registry entry:** it was
  flagged "already cleared" but is **non-commercial → a hard blocker.**

## 🧮 Math (frozen-spec, OWNER-GATED — pointer only)

The GitHub research (see `edge/2026-08-21-github-coverage-final.md`) confirmed the four MVE math fixes
are now **consensus**, with **one correction that changes the build: NHL should use Poisson, not NB2**
(NHL goal dispersion ≈1.01 over 52,540 team-matches). These are changes to the frozen pre-registration
spec — **yours to approve before any freeze/fire.** Not touched.

## Deliberately NOT touched (founder-gated)

MVE fire (one-shot, irreversible) · the frozen math spec / NHL reclassification · sealed `.github`
(watchdog `"ok"`→`"healthy"`, the `needs: test` gate) · the exposed Neon prod string (**still needs
rotation**) · `source-rights-registry.ts` classifications.

## Optional next: one more DATASET pass (teed up, not run on Opus)

A single orchestrated GitHub pass (awesome-list transitive crawl + GHCR release-assets like boxball's
Retrosheet Parquet + gist/dependents sweep) would extend **soccer/settlement breadth only** — it will
NOT close US closing lines (that's settled as licensed-vendor). Bounded upside; queued for a cheaper
model per your standing preference.
