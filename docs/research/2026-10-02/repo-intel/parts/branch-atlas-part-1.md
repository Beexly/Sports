# Branch Atlas — Part 1

### `fix/signal-ledger-shard-v3`
- Last commit: 3031946 — "rebase signal-ledger shard fix onto current main" (2026-09-30)
- Inferred purpose: Bugfix for the signal-ledger sharding logic (the ledger where engine signal weights are stored), third iteration (v3).
Recent (2026-09-30) and freshly rebased onto main — likely still awaiting merge; check PR/merge state before reworking.
- Open in browser: https://github.dev/Beexly/Sports/tree/fix/signal-ledger-shard-v3

### `fix/signal-weight-upsert-clause`
- Last commit: d402c88 — "docs(signals): correct 'seven of thirteen' to eight, at all five sites" (2026-10-01)
- Inferred purpose: Docs correction tied to the signal-weight upsert clause (how signal weights are written to the DB) — fixes a "seven of thirteen" count to eight in five places.
Active as of yesterday (2026-10-01); narrow docs scope suggests the underlying upsert-clause work may already have landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/fix/signal-weight-upsert-clause

### `grok/calibration-ci`
- Last commit: 2b0c703 — "fix(calibration): VOID count mock order + drop hardcoded 95% on dashboard" (2026-08-21)
- Inferred purpose: Grok-authored calibration test-suite fixes (VOID count mock ordering; removing a hardcoded 95% on the calibration dashboard).
Stale (~6 weeks); likely merged or superseded — verify PR state before touching.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/calibration-ci

### `grok/calibration-ci-followup`
- Last commit: bb2fba9 — "fix(calibration): VOID count mock order + drop hardcoded 95% on dashboard" (2026-08-21)
- Inferred purpose: Follow-up twin of `grok/calibration-ci` with an identical commit message and date — likely a duplicate or rebased variant of the same fix.
Stale; may be redundant with `grok/calibration-ci` — check whether both are needed.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/calibration-ci-followup

### `grok/gse-score-bridge-2026-09-26`
- Last commit: cb0dd03 — "feat: gse-score bridge fails closed on clamped inputs and null-as-zero edge" (2026-09-26)
- Inferred purpose: Hardens the gse-score bridge (engine output layer) so clamped inputs and null-as-zero edge cases fail closed instead of silently producing scores.
Recent (2026-09-26); looks like an active hardening workstream — review/merge pending.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/gse-score-bridge-2026-09-26

### `grok/gse-score-contract-tests`
- Last commit: d7438a9 — "Merge remote-tracking branch 'origin/main' into verify/476" (2026-08-22)
- Inferred purpose: Contract tests for the gse-score layer (per the branch name, from Grok's verify/476 verification batch). The tip commit is only a main-sync merge, so the actual test content and its true age are indeterminate from this commit.
Stale since August; status unclear without diffing.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/gse-score-contract-tests

### `grok/hermes-ledger`
- Last commit: f0a2562 — "fix(ops): point Hermes overnight runner at the live AGENT_LEDGER" (2026-08-21)
- Inferred purpose: Ops fix wiring the Hermes overnight build runner to the live AGENT_LEDGER instead of wherever it was pointed.
Stale; likely landed or superseded — confirm it's live before any rework.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/hermes-ledger

### `grok/live-calibration-metrics-tests`
- Last commit: 86de292 — "Merge remote-tracking branch 'origin/main' into verify/475" (2026-08-22)
- Inferred purpose: Live calibration metrics tests (Grok verify/475 batch), per the branch name. The tip commit is only a main-sync merge, so test content and true age are indeterminate from this commit.
Stale since August; diff needed for status.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/live-calibration-metrics-tests

### `grok/nfl-margin-mixture`
- Last commit: c976dbf — "Merge remote-tracking branch 'origin/main' into verify/474" (2026-08-22)
- Inferred purpose: NFL margin-of-victory mixture model work (Grok verify/474 batch), per the branch name. The tip commit is only a main-sync merge, so actual model content is indeterminate from this commit.
Stale since August.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/nfl-margin-mixture

### `grok/odds-api-us-dfs`
- Last commit: 7c7f01a — "Merge remote-tracking branch 'origin/main' into verify/499" (2026-08-22)
- Inferred purpose: Odds-API ingestion for the US DFS lane (Grok verify/499 batch), per the branch name. The tip commit is only a main-sync merge, so the actual ingestion work is indeterminate from this commit.
Stale since August.
- Open in browser: https://github.dev/Beexly/Sports/tree/grok/odds-api-us-dfs

### `gse-enhancements-2026-09-18`
- Last commit: 073cddb — "gse: comprehensive session review - 48 APIs mapped, 62 columns flagged UNVERIFIED" (2026-09-18)
- Inferred purpose: Research-session dump cataloging 48 API data sources mapped and 62 data columns flagged UNVERIFIED.
Intake/catalog branch (docs, not code) from mid-September; recent-ish.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse-enhancements-2026-09-18

### `gse/beta-bakeoff-isotonic-alts`
- Last commit: ae42545 — "feat(cal): wire beta into map bake-off; fix projection score kinds" (2026-08-09)
- Inferred purpose: Calibration experiment wiring beta-distribution calibration into the MAP bake-off and comparing against isotonic alternatives, plus projection score-kind fixes.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/beta-bakeoff-isotonic-alts

### `gse/cat-c5-c1-offline-helpers`
- Last commit: e267ce9 — "docs(ops): unit status for C5/C1 PR 860 awaiting CI" (2026-09-16)
- Inferred purpose: Offline helper utilities for category C5/C1 work, tied to PR 860; the tip is a docs note saying CI was pending at the time.
Semi-active mid-September; check PR 860's state (merged? still blocked?) before continuing.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/cat-c5-c1-offline-helpers

### `gse/ci-c2-offline-helpers`
- Last commit: 724bfc7 — "fix(ci): resolve H-M ledger SHA + align CQR tests with fail-closed n≥9" (2026-09-23)
- Inferred purpose: CI repair branch — resolves an H-M ledger SHA mismatch and aligns conformal-quantile-regression tests with a fail-closed minimum-sample (n≥9) rule.
Recent (2026-09-23); active CI lane.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/ci-c2-offline-helpers

### `gse/consensus-binder-enforce`
- Last commit: 6e34a4a — "[hermes-gse/consensus-binder-enforce] bind public consensus to exact mint-time book set" (2026-09-24)
- Inferred purpose: Enforces that public consensus figures are pinned to the exact sportsbook odds set captured at mint time, preventing drift from stale or re-fetched books.
Hermes-authored; recent (2026-09-24) — active.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/consensus-binder-enforce

### `gse/cqr-numeric-stack`
- Last commit: a41113d — "feat(cal): CQR for numeric lines + isotonic vs Platt selection" (2026-08-09)
- Inferred purpose: Conformalized quantile regression (CQR) stack for numeric betting lines, with selection logic between isotonic and Platt calibration.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/cqr-numeric-stack

### `gse/dixon-coles-independent`
- Last commit: 6e918e4 — "feat(kalshi): parse event tail (ET start + Gn) for series disambiguation" (2026-08-09)
- Inferred purpose: Soccer-model branch treating Dixon–Coles as the independent rate model; the tip also adds Kalshi event-tail parsing (ET start + Gn) for series disambiguation.
Stale from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/dixon-coles-independent

### `gse/eprocess-calib-shadow`
- Last commit: 2d9f696 — "Merge remote-tracking branch 'origin/main' into gse/eprocess-calib-shadow" (2026-09-24)
- Inferred purpose: Shadow-mode calibration for the eprocess module (runs new calibration logic in shadow without affecting live output), per the branch name. The tip commit is only a main-sync merge, so the actual shadow logic and its true age are indeterminate from this commit.
Recently maintained (Sept 24); diff needed for status.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/eprocess-calib-shadow

### `gse/glass-ledger-phase14-prepare`
- Last commit: 2e0d585 — "Merge remote-tracking branch 'origin/main' into gse/glass-ledger-phase14-prepare" (2026-09-24)
- Inferred purpose: Preparation work for phase 14 of the glass ledger (transparency/audit ledger), per the branch name. The tip commit is only a main-sync merge, so the actual prep content is indeterminate from this commit.
Recently maintained (Sept 24); diff needed for status.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/glass-ledger-phase14-prepare

### `gse/hermes-live-wip`
- Last commit: 592e086 — "[hermes-P1d-2] Verify GSE-SEC-015 durable limiter on main (tsc=0, lint=0, vitest 6/6)" (2026-09-24)
- Inferred purpose: Hermes live work-in-progress branch; the tip verifies the GSE-SEC-015 durable rate limiter against main with clean type-check, lint, and 6/6 vitest.
Active late September.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/hermes-live-wip

### `gse/holdout-spearman-platt-explore`
- Last commit: 16a4146 — "feat(cal): holdout significance + Spearman separation + Platt methods matrix" (2026-08-09)
- Inferred purpose: Calibration-method exploration — holdout significance testing, Spearman-rank separation metrics, and a matrix of Platt variants.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/holdout-spearman-platt-explore

### `gse/improves-cite-eligible-snapshot-like`
- Last commit: 780a582 — "Merge remote-tracking branch 'origin/main' into gse/improves-cite-eligible-snapshot-like" (2026-09-24)
- Inferred purpose: Purpose unclear from name and commit — the name hints at snapshot-like "cite-eligible" improvement records, but the tip commit is only a main-sync merge, so the real content is indeterminate without diffing.
Recently maintained (Sept 24); diff needed.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/improves-cite-eligible-snapshot-like

### `gse/isotonic-kelly-platt-brier`
- Last commit: a06fb0d — "feat(cal): isotonic/Platt bakeoff with Murphy decomp + Kelly integrity" (2026-08-09)
- Inferred purpose: Calibration bake-off between isotonic and Platt methods, scored with Brier score and Murphy decomposition, guarding Kelly-criterion bet-sizing integrity.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/isotonic-kelly-platt-brier

### `gse/mlb-independent-model`
- Last commit: a4a1d62 — "Merge remote-tracking branch 'origin/main' into gse/mlb-independent-model" (2026-09-24)
- Inferred purpose: MLB independent model branch (baseball rate/independent model, paralleling the soccer Dixon–Coles independent), per the branch name. The tip commit is only a main-sync merge, so the model content is indeterminate from this commit.
Recently maintained (Sept 24); diff needed for status.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/mlb-independent-model

### `gse/model-version-independent-ranking`
- Last commit: 4457ae1 — "feat(engine): MODEL_VERSION v5.2.0 — price independents into ranking" (2026-08-09)
- Inferred purpose: Engine change pricing independent models (e.g., Kalshi/Dixon–Coles signals) into the ranking pipeline, tagged as MODEL_VERSION v5.2.0.
Stale from August 9; likely merged or superseded by later versions.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/model-version-independent-ranking

### `gse/nobet-regret-utilities`
- Last commit: 50f12be — "Merge remote-tracking branch 'origin/main' into gse/nobet-regret-utilities" (2026-09-24)
- Inferred purpose: No-bet / regret-utility modeling (decision theory for when the engine should pass on a bet), per the branch name. The tip commit is only a main-sync merge, so the actual utility content is indeterminate from this commit.
Recently maintained (Sept 24); diff needed for status.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/nobet-regret-utilities

### `gse/opencode-nfl-mlb-cal-20260923`
- Last commit: c03b05c — "x-analytics-sweep: 2026-09-22 PM AGENTS.md section; Cardio Index + Week-3 composite power ratings CSVs + README" (2026-09-23)
- Inferred purpose: OpenCode-run analytics sweep producing Cardio Index and Week-3 composite power-rating CSVs plus a README, and an AGENTS.md section.
Recent (2026-09-23); data/research artifacts branch.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/opencode-nfl-mlb-cal-20260923

### `gse/opencode-nfl-mlb-cal-20260923b`
- Last commit: a48a478 — "docs: OpenCode Zen NFL/MLB calibration+CLV wiring checklist and free-lane prompts" (2026-09-23)
- Inferred purpose: Docs companion to the branch above — an OpenCode Zen checklist for wiring NFL/MLB calibration and CLV, plus free-lane prompts.
Recent (2026-09-23); docs-only.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/opencode-nfl-mlb-cal-20260923b

### `gse/phase2-binary-conformal-adapter`
- Last commit: 1e99124 — "docs(gse): GSE_GROK_APEX_AUTONOMOUS_PROMPT — maximum-ambition agent OS" (2026-07-30)
- Inferred purpose: Phase-2 binary conformal adapter work, per the name — but the tip commit is an agent-operating-system prompt doc (GSE_GROK_APEX_AUTONOMOUS_PROMPT), so the branch appears to have doubled as a workspace for agent-OS docs.
Oldest tip in this set (2026-07-30); stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/phase2-binary-conformal-adapter

### `gse/proven-selective-b2b-platt`
- Last commit: 6cdd65a — "feat(proven): selective publish sweep, holdout ranking, B2B API, Platt" (2026-08-09)
- Inferred purpose: "Proven" publish-gate work — selective publish sweeps, holdout ranking, a B2B API surface, and Platt calibration.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/proven-selective-b2b-platt

### `gse/publish-matrix-isotonic-tests`
- Last commit: ac4e446 — "feat(ops): publishedEffective matrix + isotonic PAVA R&D + EB τ moment" (2026-08-09)
- Inferred purpose: Publish-matrix mechanics — the publishedEffective matrix, isotonic PAVA (pool-adjacent-violators) calibration R&D, and empirical-Bayes τ moments.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/publish-matrix-isotonic-tests

### `gse/ranking-signal-polarity-independents`
- Last commit: 08ebd71 — "fix(ranking): ban edge-as-p; polarity bestScore; ESPN FPI + Kalshi independents" (2026-08-09)
- Inferred purpose: Ranking-signal fixes — stops treating edge as probability, adds polarity bestScore selection, and integrates ESPN FPI + Kalshi independents.
Stale from August 9; likely merged or superseded.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/ranking-signal-polarity-independents

### `gse/ranking-signal-quality-pass`
- Last commit: 9cb2be4 — "fix(ranking): v5.2.1 quality pass — honest load, Kalshi maps, trueProb always" (2026-08-09)
- Inferred purpose: Ranking-signal quality pass under engine v5.2.1 — honest signal loading, Kalshi mapping fixes, and always-on trueProb.
Stale from August 9; likely merged or superseded by later versions.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/ranking-signal-quality-pass

### `gse/res-conformal-isotonic-closeout`
- Last commit: c15c518 — "feat(ops): RES definition + conformal inventory on public-surface-truth" (2026-08-09)
- Inferred purpose: Closeout of residual-series (RES) work — an RES definition and a conformal-method inventory scoped to public-surface truth (consistent with the public-only-projections doctrine).
Stale from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/res-conformal-isotonic-closeout

### `gse/research-by-category-workflow`
- Last commit: 966cce1 — "docs(ops): note U1/U2 helpers landed on gse/cat-c5-c1-offline-helpers (CI pending)" (2026-09-16)
- Inferred purpose: Research-workflow docs branch tracking category-based research organization and noting U1/U2 helper landing status on the C5/C1 branch (CI pending).
Docs-only, mid-September; semi-active.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/research-by-category-workflow

### `gse/research-sot-next-wave-2026-09-16`
- Last commit: 2858ba4 — "docs(ops): add HONEST_STATUS research depth admission" (2026-09-16)
- Inferred purpose: Research system-of-truth branch; the tip adds an HONEST_STATUS admission about research depth.
Docs-only from mid-September; semi-active.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/research-sot-next-wave-2026-09-16

### `gse/soccer-dc-not-double-poisson`
- Last commit: 39e98dc — "fix(ranking): soccer rate independent is Dixon–Coles only (no Poisson double-count)" (2026-08-09)
- Inferred purpose: Soccer model correctness fix — ensures the soccer rate independent uses Dixon–Coles only, eliminating a Poisson double-count.
Stale from August 9; likely merged or superseded.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/soccer-dc-not-double-poisson

### `gse/stationary-bootstrap-murphy-eb`
- Last commit: 22cc912 — "feat(cal): stationary bootstrap CI, full Murphy bake-off, conformal notes" (2026-08-09)
- Inferred purpose: Calibration research — stationary bootstrap confidence intervals, a full Murphy-decomposition bake-off, and empirical-Bayes notes.
Stale experimental branch from August 9.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/stationary-bootstrap-murphy-eb
