# HERMES BUILD QUEUE 2 — 2026-08-20B

Queue 1 (BUILD-QUEUE-2026-08-20.md) is complete: B-1..B-4 merged. Same
standing rules apply verbatim — branch per task from latest
`origin/claude/cron-config-placement-verify-qsl19t`, never push main, guards
with real exit codes before every commit, blocked-means-skip-not-stop,
sealed paths untouched, every metric ships with its honesty block.

Launch items first. The research item is LAST and must not start until B-6
and B-7 are done or blocked.

## B-6 — Glass Ledger: make the promise true (three branches, in order)

The /glass-ledger copy promises a linked chain ("each entry points to the one
written just before it") that does not run yet. Verified gaps: the edge-lab
chain (`packages/prediction-engine/src/edge-lab/ledger-chain.ts`
appendPick/appendSettlement) has ZERO runtime callers; `loadLedgerView()`
(apps/web/lib/ledger/ledger-view.ts:19-24) is a hardcoded empty stub; no
public chain-export endpoint exists.

- **B-6a `hermes/b6a-chain-append`** — wire appendPick into the pick
  publication path (process-sport.ts, beside the existing receipt mint) and
  appendSettlement into the settle path (settle-sport.ts, beside
  markClosingSnapshotsIfEnabled). Follow the receipt mint's exact
  failure-isolation pattern: chain append must NEVER fail a publish or a
  settle — catch, log, continue. Feature-flag it `LEDGER_CHAIN_ENABLED`
  default OFF (founder flips; do not flip it yourself). Tests for: append
  called with flag on, zero DB interaction with flag off, publish survives an
  append throw.
- **B-6b `hermes/b6b-chain-export`** — public read-only endpoint
  `/api/proof/ledger-chain` streaming the chain in the exact format
  `scripts/edge-lab/recompute.ts` consumes, rate-limited like the other
  public proof routes, empty-state honest (returns `{entries: [], note}` not
  404) while the chain is empty.
- **B-6c `hermes/b6c-ledger-view`** — implement `loadLedgerView()` from real
  chain rows. Keep every existing display guard (renderableMetricOrNull four-
  leg substantiation) exactly as-is; the view renders honest-empty until real
  settled entries exist. Do not touch PUBLISH_LEDGER.

## B-7 — Consensus Clock + Line DNA spec (data-gated, spec-only now)

The phase-tagged snapshot archive started writing at the 90aa7652 deploy.
These two pages need days of accumulated OPEN/INTERIM/CLOSE rows, so build
the LIBRARY + TESTS now against synthetic fixture rows, and the page LAST:
`apps/web/lib/truthmetrics/consensus-clock.ts` (dispersion half-life fit
D(t)=D_inf+(D_0−D_inf)e^(−λt), per game) and
`apps/web/lib/truthmetrics/line-dna.ts` (per-game path summary: normalized
total variation, increment count, book count, first/last snapshot age).
Every output feeds the metric-honesty component. No page ships until the
archive holds ≥7 days of games — put the check in the page loader, render
"collecting" honestly before that.

## R-9 — Grok engine, synthetic-first (LAST; research tail)

Per docs/ops/edge/2026-08-20-grok-stack-audit.md (+ round-2 addendum). Build in
`packages/prediction-engine/src/research/` (new dir, non-sealed), and follow
the HOUSE FILTER CONVENTIONS from the existing
`packages/prediction-engine/src/team-strength-filter.ts` exactly — pure,
seeded/deterministic, snapshot/restore for serverless, log-space weights,
ESS-triggered systematic resampling, degeneracy handling that never emits
NaN, shadow/priced:false status. Do not invent a second style. Layering per
the audited spec: particles carry discrete assignments; linear coefficients
via Laplace approximation to the NB likelihood (warm-started Newton, analytic
Hessian) optionally wrapped in a cubature update; Liu-West on LOG-scale
variance components, applied after weighting and BEFORE resampling (order is
load-bearing). Grok's sandbox artifacts are spec references only — never
import or trust its code or results.
negative-binomial hierarchical model (team/pitcher/park/umpire effects),
Rao-Blackwellized particle filter with Liu-West on variance components,
fractional e-process with FIXED λ=0.3 as primary and adaptive-λ as a
comparison arm. **Synthetic data only. Never load the odds archive or any
real game table — that is a hard rule, not a preference (Track E is closed,
C-44).** Acceptance: (1) NULL TEST — across ≥200 pure-noise seeds the
fixed-λ capital exceeds 20 in ≤ α·seeds runs (α=0.05); an engine failing
this is discarded, not tuned until it passes; (2) planted-edge recovery
beats the open-loop baseline. Report both numbers in RESULTS.md. The
sandbox result Grok reported (capital 896) must not be cited anywhere.

## R-10 — DML causal prototype (after R-9; shadow-only)

Double Machine Learning (Chernozhukov et al. 2018) on ONE treatment:
starting-QB out/limited, NFL, from nflverse injury data. IRM/AIPW form,
XGBoost-or-equivalent nuisances, 5-fold TIME-AWARE cross-fitting (never mix
future into nuisance training), strict as-of feature discipline. Outcome:
win indicator. Controls: team-strength posterior mean/variance from the
existing filter, rest, travel, opponent strength. Mandatory diagnostics:
overlap/positivity (trim extreme propensities), placebo treatment test,
sensitivity-to-unobserved-confounding bounds. Deliverable is a RESULTS.md
estimate with CI plus a comparison against the TeamIntervention magnitude
the filter currently applies for the same event — NOT a public claim, NOT a
pick input. Shadow-only until it clears the same replay standards as
everything else. SUTVA is violated in sports (game-script interference) —
state that limitation in the results rather than pretending it away.

## After the queue

Stop and report. Do not invent tasks.
