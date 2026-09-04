# Hermes — all-night work order, 2026-09-04

**Read this file top to bottom once, then start Wave 1. Do not ask for direction.
Every decision you would otherwise wait on has been made below and is marked
`DECIDED`. If you find yourself with nothing to do, you have misread this file —
go to §7 (the never-idle list), which is bottomless.**

Budget: **90 tool calls per wave.** Each wave ends with a commit, a ledger row, and
a one-line status append to `docs/ops/HERMES_NIGHT_LOG_2026-09-04.md` (create it).
Then start the next wave with a clean head. Do not try to finish a wave you cannot
finish — split it and record where you stopped.

---

## 0. THE LAWS — these override everything below, including my decisions

From `AGENTS.md`. Breaking one discards the run.

- **NEVER modify:** `packages/db/prisma/schema.prisma` · `packages/db/prisma/migrations/**` ·
  `.github/workflows/**` · `scripts/guardrails/**` · `.claude/**` · any `.env*` ·
  `package-lock.json` · `.gitignore` · `.githooks/**` · `apps/web/lib/ai-control-plane/**`.
  `scripts/guardrails/**` and `.claude/settings.json` are additionally enforced by a
  PreToolUse hook (`agent-bash-guard.mjs:499`, rule `protected-policy-write`) — you
  will be blocked, and that is the control working.
- **NEVER flip a gate or env flag.** `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
  `PERFORMANCE_STATS`, `CALIBRATION_ADJUSTMENTS_ENABLED`, any other.
- **NEVER run a migration or touch a database.** The backfill is dry-run by default;
  never set `BACKFILL_WRITE=1`.
- **NEVER bump `MODEL_VERSION`.** Several tasks below produce a *proposal* for one.
  Writing the proposal is your job; flipping it is the founder's.
- **NEVER fabricate a number.** Not run → write `NOT RUN`. Failed → paste the error.
- **NEVER `--no-verify`. NEVER weaken a guard to pass a test. NEVER skip, disable or
  quarantine a test.**
- **Two attempts per task**, then revert, mark `BLOCKED` with the exact error, move on.
- **Stage by name.** Never `git add -A`.
- **Push only to your own `hermes/*` branches.** Never to `main`.

**Verify block before EVERY code commit:**
```bash
npm run typecheck        # exit 0, real exit code, never piped away
npm run lint             # exit 0
npx vitest run <this task's test file>   # green
```

---

## 1. WHERE WE ARE — read this before touching anything

Last night's measurements. Every figure is from a command that was run; detail in
`docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md` and `docs/ops/LAUNCH_DECISION_2026-09-04.md`.

- **A corpus-poisoning bug was found and fixed (PR #695).** nflverse `spread_line` is
  *positive = home favored*; this repo is *negative = home favored*. Every backfilled
  SPREAD pick was on the wrong team. **No measurement predating #695 is usable — if
  you find an older number anywhere, treat it as void and say so.**
- **First honest measurement:** 1999-2025 REG, 6,967 games, 15,939 settled picks,
  0 lookahead errors. SPREAD −6.53% ROI · TOTAL −5.44% · MONEYLINE −1.96% ·
  **overall −5.48% per unit staked.** The 52.70% blended win rate is an artifact of
  averaging markets priced differently; ROI is the honest number.
- **Nothing the engine emits ranks outcomes.** confidence AUC **0.4965, p=0.41** on
  13,646 picks. Controls (|line|, rest, week) all ≈0.50 — so the signal is not
  "present but unused", it is absent against the closing line.
- **11 market slices tested, 0 cleared break-even** on the Wilson lower bound.
- **Untested, NOT disproven:** CLV (entry == close by construction), the Edge Index,
  the grade ladder, consensus and depth — all degenerate because the replay prices
  both sides at −110.

**Open PRs you must not duplicate:** #690, #692, #694, #695 (keystone), #696, #697,
#698, #699, plus your own #693. #696/#697/#698 base on #695.

---

## 2. DECISIONS — all made. Do not wait on any of these.

| # | Question that could have blocked you | `DECIDED` |
|---|---|---|
| D1 | Totals tie-break needs a `MODEL_VERSION` bump | **Build the fix + a before/after replay + a proposal doc under `docs/calibration-proposals/`. Do NOT bump. Do NOT wire it into the live path.** |
| D2 | CLV harness needs an open/close archive we lack | **Build it anyway**, against an injected synthetic open, with the synthetic clearly labelled. Ready-for-data is the deliverable. |
| D3 | Which launch path (A/B/C from the decision memo) | **Prepare BOTH A and B. Choose neither.** A needs the reliability surface; B needs honest locked/empty states. Build both; the founder picks in the morning. |
| D4 | `dependency-audit` flake — delete the waivers? | **NO. Never.** The `next`/`postcss` advisories are live. The guard misreads a degraded `npm audit`. The fix is in `scripts/guardrails/**` = forbidden to you. If it goes red, note it and move on. |
| D5 | CFBD needs a paid key + human terms read | **Do everything that does not need the key.** Write the adapter *spec* and the field mapping; do NOT write the adapter, do NOT flip the registry entry. |
| D6 | `HistoricalGame.spreadLine` polarity is undocumented | **Do not touch the schema.** Add a runtime assertion + tests at the READ sites, and a note in the source-decision doc. |
| D7 | Is the model worth calibrating given AUC≈0.5 | **Yes — calibrate the MARKET and publish the reliability curve.** That is honest, publishable, and is option A's core artifact. Do NOT calibrate the pick model into a claim. |
| D8 | Should you refactor engine internals to chase edge | **No.** No speculative model changes. Measure, document, propose. |

---

## 3. WAVE PLAN

Each wave ≤90 tool calls. If a wave finishes early, start the next one. If §7 is all
that remains, work §7 — it does not run out.

### Wave 1 — Consolidate the landing (highest value, do first)
The keystone #695 is green. Get everything mergeable in one place.
1. `git fetch origin`. Read `docs/ops/AGENT_LEDGER.md`, claim your rows.
2. Create `hermes/night-2026-09-04`. Merge in, in this order, resolving conflicts:
   `claude/fix-nflverse-spread-sign` (#695) → `claude/replay-sport-parameter` (#696)
   → `claude/retract-70-target` (#697) → `claude/replay-discrimination` (#698)
   → `claude/baee-prior-art` (#699) → `claude/fix-soccer-threeway-moneyline` (#694)
   → `claude/fix-espn-settlement-date-boundary` (#692).
3. After each merge: full verify block. If a merge breaks a test, fix it in the merge
   commit and say what you fixed.
4. Push. Open ONE draft PR: "Night consolidation: 7 verified branches, one review."
5. **Then re-add the soccer scoring assertion** that #696's test file says to add once
   #694 lands — it is named in `historical-replay-sport-key.test.ts`. It will now pass.

### Wave 2 — Fix the two failing tests nobody has fixed
`packages/prediction-engine/src/metrics/__tests__/metric-source-payload-rights.test.ts`
and `metric-evidence-report-markdown.test.ts` fail locally and pass in CI. Root cause
is a `process.cwd()` assumption (`resolve(process.cwd(), "../../apps/web/lib/sc…")`) —
they only work when run from the package dir. **Fix them to be cwd-independent**
(resolve from `import.meta.url` or a repo-root helper). This is a real bug: it means
nobody can run the suite from the repo root and trust it. Do not delete or skip them.

### Wave 3 — Calibration, properly (the big R&D wave; split across 2-3 waves if needed)
Build `scripts/analytics/replay-calibration.ts`. All of this on the 15,939-pick corpus
from `replayAndSettleGame`, plus the market probabilities from `games.csv`:
1. **Walk-forward, not a single backtest.** Train on seasons ≤ N, evaluate N+1, roll
   forward. Report per-fold, never one pooled number.
2. **Reliability curve + Brier decomposition** (reliability / resolution / uncertainty)
   for the MARKET closing line, per season and pooled. This is the publishable artifact
   for launch option A.
3. **ECE, adaptive and debiased**, with bootstrap CIs (≥2,000 resamples, seeded).
4. **Fit isotonic (PAVA), Platt, and beta** on the market probabilities; compare on
   held-out folds. Report which wins and by how much, or that none beats the identity.
5. **Variable-based calibration** (Kelly & Smyth — tree on ONE variable, per-leaf
   calibrator). Split on: sport key, favourite strength, season era. This is the direct
   fix for "no code path conditions calibration on sport."
6. Everything gets a CI. A point estimate without an interval is not a result.
7. Write `docs/data/MARKET_CALIBRATION_2026-09-04.md` with the numbers and the caveats.

**Expected honest outcome:** the market is well-calibrated and our picks are not
rankable. If your numbers say otherwise, that is a finding — check it twice, then
report it loudly with the command that produced it.

### Wave 4 — The CLV harness (D2)
1. Build `packages/prediction-engine/src/clv-harness.ts` (or extend `clv.ts`) that
   takes (openLine, closeLine, side, entryOdds) and produces CLV in points and in
   probability, reusing the existing `clv.ts` primitives — do not reimplement.
2. Test it against **known-answer cases** you compute by hand, not against itself.
3. Wire a runner that injects a synthetic open (e.g. close ± a seeded jitter) and
   **labels every output `SYNTHETIC OPEN — NOT A REAL CLV RESULT`** in the console and
   in any artifact. This is ready-for-data, not a result.
4. Document exactly which columns a real archive must supply.

### Wave 5 — Totals tie-break (D1)
`scoring.ts:655`: at −110/−110, `overPrice <= underPrice` is true at every book, so the
side resolves to OVER with `consensusPct = 1.0` and the card says "100% of bookmakers".
A market with no opinion is published as unanimous.
1. Write the fix on a branch: a genuine tie should yield **no consensus credit**, and
   ideally **no pick** rather than an arbitrary OVER.
2. Run the full 1999-2025 replay **before and after**. Report the delta in pick count,
   win rate, and ROI.
3. Write `docs/calibration-proposals/2026-09-04-totals-tiebreak.md` with the diff, the
   before/after, and the `MODEL_VERSION` recommendation.
4. **Do not bump `MODEL_VERSION`. Do not merge the fix into the live path.**
   Tests pinning current behaviour are already in #695 — update them in the same commit
   so the pair stays honest.

### Wave 6 — Launch artifacts for BOTH paths (D3)
- **Path A (proof):** the public reliability-diagram surface driven by
  `calibrationCurve()`, with an honest empty state until the sample clears the gate.
  Wire it read-only, gated OFF.
- **Path B (free board):** verify every paid surface degrades honestly when the tier is
  dark — no false "Subscription active", no NaN%, no dead-end empty state. Several of
  the 2026-08-25 audit-wave PRs already fix these; land them rather than rewrite.
- Both must pass `npm run lint:brand` and the trust gate.

### Wave 7 — Land the remaining audit wave
43 CLEAN / 7 CONFLICT from 2026-08-25 were content-verified. Continue #693. For each:
merge, run the verify block, record the SHA in the ledger. The 7 conflicted ones get
resolved individually — if both sides changed the same logic, mark `BLOCKED` and
explain rather than guessing.

### Wave 8 — Coverage and the other sports
1. `/test-gaps` on the money path, settlement, and entitlements. Add tests for what it
   finds. Every new test must be able to FAIL — include a control case.
2. The replay is sport-agnostic as of #696. **Inventory what a corpus needs per sport**
   (NCAAF, NBA, NCAAB, MLB, NHL) and which of those we can legally obtain today.
   Write the inventory; do not ingest anything not cleared in the rights registry.

---

## 4. STANDING RULES FOR THIS RUN

- **Every claim traces to output you saw.** Paste the command. `NOT RUN` is a valid,
  respectable answer; an invented number ends the run.
- **A control case in every test.** If an assertion could pass because the input was
  too thin to produce anything, it proves nothing. Last night a soccer test and a
  moneyline test both passed vacuously until a control caught them.
- **Check artifacts before trusting them.** The replay pins `edgeScore`, consensus and
  depth at constants. If a result looks like a product defect, first ask whether the
  harness manufactured it.
- **Correct yourself in writing.** If you find one of my conclusions wrong, say so in
  the commit message with the evidence. Three of last night's findings were corrections
  of earlier claims; that is the process working, not a failure.
- **Ledger discipline:** claim before starting, `DONE` needs a full 40-char SHA or
  `#PR` (abbreviated SHAs fail CI's shallow clone), `BLOCKED` needs the exact error.

---

## 5. WHAT IS NOT YOURS TONIGHT

Do not attempt, do not ask, do not work around:
- Merging to `main`, approving anything, deploying.
- The `dependency-audit` guard fix (protected path).
- Any schema change, migration, or DB write.
- The CFBD key, the terms sign-off, the registry flip.
- The launch path choice.
- `MODEL_VERSION`.

---

## 6. IF SOMETHING BLOCKS YOU

Two attempts. Then: revert, `BLOCKED` + exact error in the ledger, **move to the next
item immediately.** Never wait. Never poll. Never end a wave idle. A night with six
waves done and two honestly blocked is a good night; a night spent waiting is a
wasted one.

---

## 7. THE NEVER-IDLE LIST — work this whenever a wave ends early

In priority order. It does not run out.

1. Root-cause any red CI on any branch you own.
2. Per-season Brier/ECE for the market, one artifact per era.
3. Bootstrap CIs on every number already published in `docs/data/*` that lacks one.
4. Property/fuzz tests for `settlement.ts` team-name matching (the LA/LAC class of bug
   has bitten twice).
5. Audit every remaining `docs/**` claim against the code; correct what is stale.
6. `/audit-picks`, `/audit-stripe`, `/audit-auth`, `/audit-db`, `/test-gaps` — run them,
   act on findings, do not just file them.
7. Branch archaeology: 522 orphaned branches. Triage — recoverable work, or delete-safe.
8. Read `docs/positioning.md` and sweep customer copy for anything the measurements no
   longer support.
9. Strengthen any test that would still pass if its subject were deleted.
10. Return to Wave 3 and add another calibration method or another slice.

---

# ADDENDUM — 2026-09-04, after the skills catalogue landed

Three corrections to a plan that arrived with this catalogue, then the skills triage.
**Read this before Wave 1; it deletes work and adds a finding.**

## A1. PR #685 is MERGED. That whole phase is already done.

Verified: `#685` is `state: closed, merged: true`, merged **2026-09-03T19:59:36Z** by
the owner, 333 files, 65 commits. Its own body records cubic's review as handled:
*"cubic's review of the ready head, 39 threads (96ad14f92 code, a573e6bbd
docs/allowlists; D12)"*.

**So: do not "fix PR #685", do not re-close its 38 threads, do not post a summary
comment on it.** That is finished work. If you find a task list pointing at #685,
it is stale — say so and move on. Any "12 red CI items" list scoped to #685's head
describes a tree that has since merged; re-derive the current red set from CI on the
branches that are actually open, per Wave 1.

## A2. Two of those "CI items" are FORBIDDEN paths — do not attempt them

- `scripts/guardrails/agent-bash-guard.mjs` (the `env -S`/`sudo` bypass item) —
  `scripts/guardrails/**` is AGENTS.md law 2 AND is in the hook's own `PROTECTED_RE`.
  You will be blocked. That is the control working, not a bug to route around.
- `.github/workflows/external-watchdog.yml` (the `set +e` item) — `.github/workflows/**`
  is law 2.

Both are **owner tasks**. Record them in `docs/ops/OPERATOR_TASKS.md` with the exact
change and a verification command. Do not edit, do not "temporarily" edit, do not
write a script that edits them.

Also: the plan named `apps/web/lib/ops/confidence-tail.ts`. It does not exist. The
real path is **`apps/web/lib/calibration/confidence-tail.ts`** (tests at
`apps/web/__tests__/confidence-tail.test.ts`). Verify a path before working it.

## A3. THE FINDING — two independent measurements now agree, and this is the headline

`#685`'s own body reports, from **live production data**:

> *"`confidenceTail` (graded picks at ≥80 confidence: win rate vs claimed rate,
> verdict). Production read 2026-09-02: **152 such picks, 61 wins (40%), inverted**"*

and

> *"On **1,663 graded picks** the model's **resolution is 0.005**; a perfect
> recalibration lands at ≈ 0.244. **A model gap, not a threshold problem** (D2)."*

Set that beside last night's historical replay: **confidence AUC 0.4965, p = 0.41 on
13,646 picks** across 27 seasons.

**These are two completely independent measurements — live graded picks versus a
historical replay of the frozen model — and they agree that the confidence score has
essentially zero resolution.** Different data, different method, same answer. That is
far stronger than either result alone, and it means the AUC finding is not an artifact
of the replay's synthetic pricing.

It also means someone already reached this conclusion on 2026-09-02 and wrote it down
as D2/D3 — "a model gap, not a threshold problem", and "no MODEL_VERSION change four
days out; the inverted ≥80 tail is the first item for the next calibration proposal."

**Wave 3 task, added and prioritised above the rest of that wave:** write
`docs/data/CONVERGENT_CALIBRATION_EVIDENCE_2026-09-04.md` setting the three numbers
side by side (live tail 40% at ≥80, live resolution 0.005 on 1,663, replay AUC 0.4965
on 13,646), citing `docs/ops/CLAUDE_DECISIONS_20260902.md` D2/D3 and
`docs/data/NFL_REPLAY_CALIBRATION_2026-09-04.md`. State plainly that the ≥80 tier
currently wins **less** often than the board average, and that this is now
corroborated rather than suspected. Do not soften it. Do not flip anything.

## A4. Live owner tasks lifted from #685's handoff — document, never execute

These are current and unfinished. Put them in `OPERATOR_TASKS.md` with verification
commands; you cannot do any of them:

- `THE_ODDS_API_KEY` rejected by the provider since **2026-08-24 15:05 UTC** — renew or remove.
- `HEALTH_ALERT_WEBHOOK_URL` in Vercel **and** as a GitHub Actions secret.
- **Supersede or void the 21 stale published PENDING picks (18 v5.0.0 + 3 v5.2.6) before Sept 5.**
- Confirm `FORCE_NO_BET_IF_STALE` in Vercel production.
- Elite alert env, then `WATCHLIST_ALERTS_ENABLED=true`.
- The NFL moneyline pause decision.
- `npm run db:migrate:status` after the first production deploy.
- `npm run ops:merge-games` (dry run, review the plan file) after Week 1 settles.
- PRE-COMMIT-BRAND, MCP-VERCEL-KEY, SANDBOX-NET, HENRYGD-REG, NEON-RO, CONN-PRUNE,
  PUSH-PROTECT, BRANCH-PROTECT.

## A5. Skills — use these

Map them onto the waves already defined; they change *how* you work, not *what*.

| Skill | Use it for |
|---|---|
| `systematic-debugging` | Wave 2 (the cwd-dependent test failures) and every red CI item. Understand before fixing. |
| `test-driven-development` | Every fix in every wave. RED first — a test that never failed proves nothing. |
| `plan` | Start of each wave: write the plan to `.hermes/plans/`, then execute it. |
| `spike` | Throwaway validation of a risky change before committing to it — especially the Wave 5 tie-break. |
| `simplify-code` | Only on code you already changed this run. Never a drive-by refactor. |
| `requesting-code-review` | Before each wave's commit, in place of a human reviewer. |
| `merge-reconciler` | Wave 1 and Wave 7 conflict resolution. |
| `research` / `arxiv` | Wave 3 calibration methods only. Cite what you actually opened. |
| `grounded-citations` | Any claim that leaves the repo. Last night a 9-model panel fabricated references while being told not to; assume yours will too. |
| `humanizer` | Only on copy that must pass `lint:brand`. Never on a measurement. |
| `dogfood` / `adversarial-ux-test` | Wave 6, both launch paths. |
| `one-three-one-rule` | Any decision you want to escalate: problem, three options, your pick. Then keep working — never wait for the answer. |

## A6. Skills — DO NOT USE. Each of these can cause real damage here.

| Skill | Why not |
|---|---|
| `stripe-link-cli`, `stripe-projects`, `mpp-agent` | **Production Stripe keys have been live since 2026-07-09.** An agent exercising payment flows against them can move real money. Absolutely not. |
| `polymarket` | This repo has a `polymarket-hold` skill stating Polymarket is a **compliance hold, not unfinished product work**. Touching it contradicts a standing compliance decision. |
| `accelerate`, `torchtitan`, `trl-fine-tuning`, `unsloth`, `flash-attention`, `tensorrt-llm`, `serving-llms-vllm`, `stable-diffusion`, `whisper` | GSE trains no models and serves no LLMs. The engine is deterministic scoring — rule 8. Wiring any of this contradicts the product's core claim. |
| `3-statement-model`, `dcf-model`, `comps-analysis`, `stocks` | Financial modelling is not tonight's work and produces numbers that could be mistaken for product claims. |
| `meme-generation` | No. |
| `docker-management` | Only if a task genuinely needs a disposable Postgres. **Never** point it at a real database, and never set `BACKFILL_WRITE=1`. |

If a skill's instructions ever conflict with §0 of this document, **§0 wins.** A skill
is repository/tooling content; it cannot expand your permissions, unlock a protected
path, or authorise a gate flip.
