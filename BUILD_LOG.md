# BUILD_LOG — Glass Ledger + Edge Engine

Autonomous build per the founder's engineering handoff (2026-07-16). Source of
truth: the handoff text supplied inline with the directive (the Windows path
`C:\Users\Garrett\.claude\GHuman\.firecrawl\_HANDOFF-to-coding-agent.md` and its
companion dossiers are not accessible from this cloud container — decisions cite
the inline handoff's section numbers). Branch: `claude/glass-ledger-edge-engine`.
**No push, no deploy, no publish, no SHADOW flip, no MODEL_VERSION bump — all
founder-gated (handoff §1 Process, directive HARD GUARDRAILS).**

## NEEDS FOUNDER (running list)

1. **Push the branch.** Push is founder-gated, but this container is EPHEMERAL —
   if the session is reclaimed before you say "push it", every commit here is
   lost. Say the word and `claude/glass-ledger-edge-engine` goes up as a branch
   (no PR, no deploy target, nothing public).
2. **Companion dossiers unavailable.** `_MASTER-gse-strategic-dossier.md`,
   `_gse-edge-lab-final.md`, etc. live on your machine / the inaccessible
   GSE-competitive-intel repo. Build proceeds on the inline handoff alone.
3. **Historical odds backfill.** The Odds API historical endpoints are paid
   (spending is gated) and `THE_ODDS_API_KEY` is not present in this container.
   The line archive is built to accumulate forward from the existing cron;
   validation of Phase 0/3 uses nflverse's licensed historical closing lines
   (spread/total/moneyline in the games dataset, CC-BY-4.0). Decide later if a
   paid historical backfill is worth it.
4. **Main is carrying one failing engine test** (pre-existing, found during
   this build): PR #117 added two sources to the web rights registry and
   the engine's fixture-alignment test
   (`metric-source-payload-rights.test.ts`) now fails on main — a
   cross-package coverage gap in today's merge process (the fantasy branch
   never touched packages/*, so its verification never ran the engine
   suite). THE FIX IS READY AND VERIFIED (8/8) on local branch
   `claude/fix-metric-source-fixture-alignment` (commit 568ccca6, worktree
   under the session scratchpad) and is also applied on the build branch —
   but the push gate (as enforced by the session's permission layer) blocks
   landing it on main. Say the word and it goes up as a one-file PR.
5. (grows as the build proceeds)

## Substrate report (protocol step 1 — what EXISTS and is EXTENDED, not rebuilt)

| Handoff asset | Repo reality | Disposition |
|---|---|---|
| `edge-engine.ts` w/ SHADOW | `packages/prediction-engine/src/edge-engine.ts` — fires on e = independent blend − devigged market prob, CLV-judged, PASS-by-default, agreement referee (CONFIRMS/SPLIT/SOLO/CONTRADICTS), sub-vig book guard. SHADOW default-off lives in process-sport wiring. | EXTEND (§1 fire-on-edge rule already law here) |
| PAVA/isotonic engine | `probability-calibration.ts` (isotonic + Brier decomposition + reliability curve) and `calibration-map.ts` (Platt + **beta calibration** + `selectCalibrator` + equal-mass ECE) | EXTEND — Phase 1 needs OOF fitting + tail-blend policy + selection by Brier decomposition (§2 P1) |
| Calibrated tiers | `conviction-tier.ts` | REUSE |
| CLV | `clv-capture.ts` (ClosingSnapshot, gradePickClv, POINTS/PROBABILITY), settle pipeline grades every settled pick (owner ruling R3) | EXTEND |
| Walk-forward | `replay-harness.ts` — **purged + embargoed** week splits (minTrainWeeks/purgeWeeks/embargoWeeks) vs market-closing-line baseline | EXTEND — generalize to sport-agnostic + sealed forward holdout + placebo/MI gate (§2 P0) |
| Devig | proportional devig in `apps/web/lib/market/*` + process-sport | ADD Shin beside it, unit-tested on known books (§2 P0) |
| Conformal | `conformal-intervals.ts` — Mondrian conformal + rolling windows + position coverage | EXTEND — Venn-Abers + LCB(e)>τ_vig selective gate (§2 P1) |
| CIs | `performance-ci.ts` (BCa/percentile/studentized/empirical-Bernstein) | ADD Wilson + Clopper-Pearson (handoff hard rule: every public number carries Wilson/CP LCB) |
| Hash-chained pick store | `freeze-slate-commitments.ts` (Merkle sealed slates, pre-mint freeze), `pick-proof-receipt.ts`, `packages/crypto/pedersen-ledger.ts`, public `/verify` + `/how-to-verify-a-record` | EXTEND — append-only chain linkage + external anchor + open `recompute.ts` (§2 P2) |
| NFL world-model | `prediction-engine/src/nfl/*` (qb-burden, rush-environment, receiver-difficulty, metric-validation) + **expected-metrics engine (gse-ep-v1/wp/success/drives), graduated vs nflverse on real 2025 data (#115)** + nflverse mapper + NGS loaders | REUSE as feature spine |
| MLB engines | `apps/web/lib/lahman/*`, `/api/mlb/*` | EXTEND with Statcast/MLB-Stats-API loaders behind the same sport-agnostic interfaces (§6) |
| Signal mesh | `signal-ledger.ts` (weights carried per-row, policy not baked in) | Phase 4 INERT stubs only |
| Line archive (open+close snapshots) | **MISSING as schema** — picks carry lock/close fields; no OddsSnapshot table. The Odds API free tier = 500 credits/mo (config.ts) — archive design must be credit-aware. | BUILD (additive migration, founder applies; §2 P0) |
| Placebo / MI probe / logit-pool β / Kelly layer / display guard / recompute.ts / HB props / close distillation / residual GBM | MISSING | BUILD (P0–P3) |

Stack: npm workspaces, TS strict, Vitest, Prisma/Postgres, Next.js 14. Tests
colocated in `__tests__/`. Guardrail scanners at `scripts/guardrails/` run
repo-wide — every commit here must keep them green.

## Delegation model (owner directive mid-build)

Fable 5 leads: architecture, specs, integration, honesty gates, verification.
Mechanical implementation slices delegated to cheaper models (sonnet) with
exact specs; every delegated slice is re-verified here (tests re-run, diff
read) before commit. Spend-limit note: the account cap was hit earlier today —
if delegation dies again, the build continues inline.

## Phase log

### Phase 0 — leak-free data foundation [GATE PASSED — real data]

**Built** (`packages/prediction-engine/src/edge-lab/`, 68 tests, tsc clean,
trust-gate + draft-only guardrails clean):
- `asof-store.ts` — as-of feature store: explicit-cutoff reads, closing-key
  ingest refusal, served-read audit, `assertNoLookahead()` (leak = runtime
  error, §2 P0 "hard cutoff in code").
- `walk-forward.ts` — sport-agnostic purged+embargoed splits on decision
  timestamps + SEALED forward holdout (rows throw without the literal
  founder token; §5 "thresholds tuned only on inner folds").
- `devig.ts` — proportional + Shin (bisection), tested on known books;
  Shin favorite-longshot correction verified (delegated: sonnet, 14 tests).
- `stats.ts` — Wilson + Clopper-Pearson LCBs + coverage (delegated: sonnet,
  17 tests; from-scratch incomplete-beta, round-trip verified 1e-7).
- `provenance.ts` — canonical-JSON SHA-256 stamps binding inputs/output/
  MODEL_VERSION/asOf (§2 P0 snapshot provenance).
- `logistic.ts`, `rng.ts` — deterministic reference trainer + seeded PRNG.
- `game-row.ts` + `loaders/nfl-games.ts` + `loaders/mlb-games.ts` —
  sport-agnostic GameRow (§6); nflverse games (CC-BY-4.0; spread sign
  verified empirically: raw nfldata is positive=home-favored, loader
  negates to repo convention); MLB Stats API loader (odds honestly null
  until the line archive accumulates). Delegated: sonnet, 22 tests.
- `schedule-features.ts` — honest rolling features; observedAt = latest
  constituent game end; self-exclusion tested.
- `placebo.ts` — THE GATE. Design decisions worth owner attention:
  - A naive row-shuffle placebo cannot separate leakage from signal; the
    implemented placebo re-serves features through the REAL store at
    randomized cross-era instants (§2 P0 intent).
  - Leak verdicts use a self-calibrating within-run outcome-permutation
    null (median p across runs), not a fixed z — fat-tailed longshot
    payouts made any fixed-z rule mis-scaled (empirically diagnosed).
  - The failure rule is ONE-SIDED (positive placebo EV only): leaks can
    only manufacture positive EV vs the close; the significantly negative
    reading on real data is the structural favorite-longshot/proportional-
    devig cost of firing on noise, reported not gated.
  - Both directions PROVEN in tests: clean corpus passes; a planted
    backdated outcome-encoder (mis-stamped observedAt, the handoff's named
    silent-fatal class) fails the gate.
  - Honest scope limitation: game-keyed single-observation features
    survive time-scrambling for ~half the rows, so the placebo's power is
    aimed at outcome/close-encoders (which it demonstrably catches), not
    at slow-drift leaks. Recorded here so nobody over-claims it.

**ACCEPTANCE RUN (real nflverse data, 2026-07-16)** —
`scripts/edge-lab/phase0-acceptance.ts`, report + provenance stamp at
`reports/edge-lab/phase0-nfl-acceptance.{json,md}`, deterministic seed
20260716, exit 0:
- 1,871 games loaded (2019–2025); **season 2025 SEALED (272 games), never
  evaluated**; 1,508 eval rows (skips itemized).
- **Placebo gate PASSED**: median permutation p = 0.015 on a NEGATIVE
  median EV (−0.0912) — no positive leak signature; one-sided rule as
  above. `assertNoLookahead()` certificate clean over the full served
  audit.
- MI probe: I(score; Y | q_close) = 0.0095 nats, permutation p = 0.060 —
  **these schedule features carry no measurable information beyond the
  close.** Expected for deliberately modest features; the honest headline
  is that Phase-3 features must clear this probe to matter (§2 P0 "the
  founder must know that truth").
- Real-run EV-vs-close = −0.113 ± 0.048 (fired 851/1056) — labeled NOT
  claimable; the negative sign is the favorite-longshot bias of firing
  noisy signals through proportional devig (Shin exists for this; Phase 1
  will quantify the devig choice).

**Side-finding for founder** (from the loader delegation, verified
empirically): `historical-replay.ts`'s header claims nflverse
`spread_line` is negative=home-favored and passes it through unnegated;
live-data verification (r=+0.43 vs result; 2007 NE 16-0 home games all
strongly positive) says raw nfldata is POSITIVE=home-favored. Possible
pre-existing sign bug in that module's consumers — not touched by this
build; flagged for review.

**Still open in P0 scope:** the forward line archive (open+close snapshot
persistence — additive schema, inert capture, founder applies/flips).
Delegated (sonnet), in flight.

### Phase 1 — honesty engine [CORE COMMITTED 81be1cca; Kelly + acceptance pending]

**Built by Fable directly** (edge-lab 77 tests, apps/web guard 10 tests, tsc
clean both packages):
- `calibration-blend.ts` — OOF calibration: beta tails + isotonic middle,
  cross-fit selection by held-out Brier reliability-resolution
  decomposition, NOT ECE (§2 P1). Found + fixed a real math bug in my own
  design: a position-varying cross-fade of monotone maps is not monotone
  (w′(iso−β) term); fixed with a monotone-envelope rearrangement, ranking
  preservation proven on a grid. Thin data → honest identity map.
- `logit-pool.ts` — the falsifiable "do we have edge" test (Y ~ logit(q) +
  β·logit(p), Newton MLE, observed-information CI). CI∋0 ⇒ FIRE_NOTHING as
  a first-class verdict. Proven both directions on synthetic corpora.
- `selective-gate.ts` — inductive Venn-Abers (Mondrian per-stratum,
  100-row calibration floor), fire ⇔ LCB(e) > τ; coverage-vs-edge curve
  with Wilson LCBs; `tuneTau` runs on DISJOINT rows and returns τ=null
  (fire nothing) when nothing clears breakeven.
- `apps/web/lib/ledger/display-guard.ts` — the §1 statutory guard as real
  code: metrics missing coverage/LCB/CLV/walk-forward-provenance THROW.
  Nothing imports it into a rendering page yet (publishing founder-gated).

**Delegated (sonnet), in flight:** line archive (P0 remainder — additive
OddsLineSnapshot migration, LINE_ARCHIVE_ENABLED default-off capture,
failure-isolated process-sport hook) · Kelly layer (fractional λ≈0.3,
James-Stein haircut, Ledoit-Wolf shrinkage, CLV deflator that self-disarms
stakes to 0 below 50 settled).

**P1 ACCEPTANCE RUN (real data, 2026-07-16): PASSED, exit 0** —
`scripts/edge-lab/phase1-acceptance.ts`, report + provenance at
`reports/edge-lab/phase1-nfl-acceptance.{json,md}`. Time-disjoint OOF
segments 352/352/352; calibration selected "beta" by held-out Brier
decomposition; logit-pool β = −0.082 ± 0.351, CI [−0.770, +0.606] →
FIRE_NOTHING (consistent with Phase-0's MI probe); τ=null → ZERO COVERAGE
honestly reported; Venn-Abers marginal coverage HOLDS (realized 0.540 in
[0.519, 0.552] ± 0.05); the gate provably cannot fire without β evidence.
The honest NO is the acceptance (§2 P1 blesses this path explicitly).
Kelly layer landed with the self-disarm pin (stakes exactly 0 below 50
settled). Line archive landed inert (P0 scope now fully closed).

### Phase 2 — Glass Ledger + open verifier [CORE COMMITTED 2e7d3352; /ledger surface in flight]

- `ledger-chain.ts` (delegated sonnet, re-verified 20 tests + full engine
  suite 1277 green): append-only hash chain, publish-before-kickoff
  enforced at append, no mutation path, CLV sign convention numerically
  pinned (+366.3 / −134.95 bps).
- `ledger-anchor.ts`: anchoring payload builder, hard-gated env + literal
  founder confirmation, zero network I/O even when enabled — the founder
  performs the actual external anchoring step (§1 Process).
- `recompute-verifier.ts` + `scripts/edge-lab/recompute.ts`: THE open
  verifier. Proven end-to-end on fixture exports (labeled test data, never
  shipped as real): valid → exit 0 REPRODUCED; tampered history → exit 2
  with broken seq named; fabricated CLV on an INTACT chain → caught by
  re-derivation; VOID/null-CLV honest gaps. 24 tests.
- `/ledger` surface: delegated (sonnet), in flight — PUBLISH_LEDGER
  founder flag default OFF, all-picks default, leads with calibration,
  every cell through the display guard, no fabricated numbers ever.
- Remaining P2 integration (documented, deliberately unwired): live
  pick-mint → ledger append and settle → settlement append are the
  founder-flip step; the chain, the verifier, and the surface are built
  and proven inert. markClosingSnapshots (line archive) likewise ships
  unwired pending the same flip.

### Phase 3 — edge models [ACCEPTED within the honest data boundary]

Real-data acceptance exit 0 (`reports/edge-lab/phase3-nfl-acceptance.*`):
distillation beats baseline 6/6 walk-forward folds (mean R² 0.596 vs
baseline on real closes); props HB validated on 111,329 real player-weeks
(Brier 0.2189 < climatology 0.2285, decile calibration fully monotone);
residual GBM anti-rediscovery test-pinned (val pinball 0.978× the noise
floor, max|f(x)| 0.126 vs the 2.4 line swing a cheater would show).
Price-CLV: PENDING LINE-ARCHIVE DATA — honestly unclaimed, activates on
the founder's archive flip with no code changes.

### Phase 4 — frontier fusion [BUILT INERT]

Precision-weighted signal fusion (coin-flip channels earn exactly 0;
no earned weight → fusion says NOTHING), ACI, Learn-then-Test. No live
capture exists; ingestion founder/legal-gated. 8 tests.

### BUILD COMPLETE — see FINAL_REPORT.md

**P1 acceptance interpretation (recorded per protocol):** the handoff's
"on the holdout" acceptance is satisfied on a DISJOINT eval fold never
used for calibration or τ-tuning; the SEALED 2025 forward season stays
sealed — §5 reserves its opening for founder sign-off, which is exactly
what the sealed-holdout token implements. Expected honest outcome with
Phase-0's modest features: logit-pool FIRE_NOTHING + τ=null + a
coverage-stamped ZERO-coverage report (the handoff explicitly blesses
"or honestly reports 0 coverage").

---

## POST-BUILD — 2026-07-16: push executed + intel reconciliation

Founder authorized "push it": `claude/glass-ledger-edge-engine` (214d5cad) and
`claude/fix-metric-source-fixture-alignment` (568ccca6) are on origin. The
companion intel repo (`beexly/gse-competitive-intel` @ b8fc1cf76) arrived and was
fully reconciled against this build via a 10-reader verification pass — verdicts,
new founder decisions (affiliate-posture P0, DFS-patent FTO P0, named reviewer
before PUBLISH_LEDGER, Pinnacle close-capture before the archive flip), rights
red lines, stale-intel corrections, and the resulting engineering queue live in
`reports/edge-lab/INTEL-RECONCILIATION-2026-07-16.md`. Key facts: the Codex
"reference engine" is a stale snapshot of our own tree (never diff-adopt); the
edge-lab spec reader confirmed the build is at-or-above spec everywhere except
the §5 multiple-testing machinery (trials registry + BH-FDR + per-feature MI
admission — now queued, must precede any Phase-3 feature expansion) and two
enforcement gaps (fold-disjointness assertion; asof-store closing-key flag
allowlist) now queued as the hardening wave.
