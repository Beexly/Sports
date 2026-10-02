# Branch Atlas — Part 4

Branch chunk: `branch-chunk-04.txt` (37 branches). Commit facts pulled from the GitHub API on 2026-10-02. All branches resolved — no 404s.

### `hermes/props-lab-2026-09-15`
- Last commit: f856dd5 — "[hermes-props-lab] Props lab 2026-09-15: L1 KILLED (K1/K2/K3), L5 KILLED (pooled c3 CI covers 0, game-level branch closed), L2 KILLED as revenge edge, L3 shelved w/ 6 checked sources; A5 crosscheck r=0.9999977; report + 41 artifacts; AGENT.md status block" (2026-09-15)
- Inferred purpose: Props (player-prop betting) research lab run on 2026-09-15. Most candidate angles were killed after backtesting; one (L3) shelved pending 6 sources. Produced a report plus 41 artifacts, then closed — experimental, terminal research snapshot, not an integration branch.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/props-lab-2026-09-15

### `hermes/res-night-1`
- Last commit: 4fecdc7 — "Initial leverage implementation: algorithm usage guide, configuration reference, enhanced research lab with algorithm mappings, and EV Calculator component" (2026-08-29)
- Inferred purpose: First overnight research session branch ("res-night-1") building a "leverage implementation" — algorithm usage docs, config reference, research-lab algorithm mappings, and an EV (expected value) calculator component. Early research-scaffolding work; appears superseded by res-night-1-cleanup. Stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/res-night-1

### `hermes/res-night-1-cleanup`
- Last commit: f38fa43 — "chore: clean hermes/res-night-1 for merge" (2026-08-29)
- Inferred purpose: Cleanup pass on the res-night-1 branch to prepare it for merging — tidying rather than adding features. Merge-prep maintenance branch; stale once the merge completed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/res-night-1-cleanup

### `hermes/research-audit-2026-09-17`
- Last commit: 7200179 — "audit(research): verify evidence and expose remaining correctness gaps" (2026-09-17)
- Inferred purpose: Research audit pass verifying the evidence behind research claims and exposing remaining correctness gaps. Touches research docs/verification rather than engine code. Audit-style snapshot, likely terminal.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/research-audit-2026-09-17

### `hermes/schedule-signal-ledger-write`
- Last commit: a46174c — "fix(vercel): mirror the cron into apps/web/vercel.json and the manifest" (2026-09-28)
- Inferred purpose: Wiring scheduled cron jobs for signal-ledger writes — the latest commit mirrors a cron into the Vercel config and the schedule manifest. Touches deployment scheduling (apps/web/vercel.json) plus the manifest. Operational plumbing, likely landed or near-landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/schedule-signal-ledger-write

### `hermes/settlement-token-fix`
- Last commit: 593319e — "leverage monitoring: 2026-09-05 cron refresh re-verify canonical tree on hermes/settlement-token-fix" (2026-09-05)
- Inferred purpose: Fix branch for settlement tokens (bet/pick settlement logic), later used as a host for leverage-monitoring cron refresh checks verifying the canonical tree. Mixed-purpose maintenance branch around settlement + monitoring. Stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/settlement-token-fix

### `hermes/shard-rotation`
- Last commit: 1a2d01b — "docs(calibration): record that the §2 backtest does not resolve" (2026-09-28)
- Inferred purpose: Named for shard rotation (likely data-shard or model-shard management), but the latest commit is calibration documentation recording a non-resolving backtest section. Touches calibration docs; honest negative-result bookkeeping. Stale research-doc branch.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/shard-rotation

### `hermes/signal-scale-norm`
- Last commit: ee073bf — "feat(signals): normalize the ten key scales and fit real per-key weights" (2026-09-30)
- Inferred purpose: Signal engineering — normalizing the ten key engine signal scales and fitting real per-key weights. Touches the signal layer of the prediction engine; directly relevant to the wire-first sequencing (wire → weight → calibrate). Active around late September.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/signal-scale-norm

### `hermes/site-pass-2026-09-10`
- Last commit: e34ebde — "Merge pull request #757 from Beexly/hermes/ledger-hr" (2026-09-10)
- Inferred purpose: Site pass from 2026-09-10; head is a merge of the ledger-hr branch (PR #757). Website/surface work involving the ledger human-review area. Snapshot branch from the site-pass day; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/site-pass-2026-09-10

### `hermes/sources-rapidapi-registration`
- Last commit: 2ce6a7f — "Merge pull request #870 from Beexly/hermes/nfl-publish-supersede-20260920" (2026-09-20)
- Inferred purpose: Data-source work around RapidAPI registration; head is a merge of an NFL publish-supersede branch (PR #870), which superseded an earlier NFL publishing flow. Touches data ingestion/publishing pipeline. Stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/sources-rapidapi-registration

### `hermes/sports-intel-orientation`
- Last commit: 2761dcf — "[hermes-backfill] Historical odds backfill complete + tests run" (2026-08-27)
- Inferred purpose: Sports-intel orientation/onboarding branch whose head commit records a completed historical odds backfill plus tests. Touches the odds-data ingestion layer. Early backfill milestone; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/sports-intel-orientation

### `hermes/t11-settlement-backfill`
- Last commit: 8d85687 — "ledger: H-T11 T12 verified green (e742a1af, PR #447)" (2026-08-22)
- Inferred purpose: Backfill/verification for settlement task T11 in the signal ledger — the head commit marks H-T11 and T12 verified green against a specific SHA and PR #447. Ledger-verification checkpoint; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/t11-settlement-backfill

### `hermes/t12-import-boundary`
- Last commit: b56d6b1 — "overnight cheap 2026-08-22: stop + morning report + session handoff" (2026-08-22)
- Inferred purpose: Task T12 work on an import boundary; head commit is an overnight-session stop note with morning report and handoff. Session-handoff checkpoint branch; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/t12-import-boundary

### `hermes/tune-signal-weights-caller`
- Last commit: 77bb111 — "feat(signals): give tuneSignalWeights a real caller; weight by measured power" (2026-10-01)
- Inferred purpose: Signal-layer work giving the `tuneSignalWeights` function a real caller, weighting signals by measured predictive power. Touches the prediction engine's signal weighting — core wire/weight sequencing work. Very fresh (2026-10-01); active.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/tune-signal-weights-caller

### `hermes/v3-350-signal-ledger-sources`
- Last commit: 7447d68 — "[hermes-CLV-1] ledger: record the resolvable work SHA" (2026-09-27)
- Inferred purpose: Signal-ledger sources work under the v3-350 line; head commit records the resolvable work SHA for the CLV (closing-line-value) lane. Ledger bookkeeping for the CLV edge measurement. Stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/v3-350-signal-ledger-sources

### `hermes/v528-market-gate-preserved-2026-09-11`
- Last commit: e2ec226 — "[hermes-preserve] v5.2.8 market-anchored gate WIP rescued from an uncommitted working tree (does not compile)" (2026-09-11)
- Inferred purpose: Preservation branch rescuing a work-in-progress v5.2.8 market-anchored gate from an uncommitted working tree. Explicitly noted as not compiling — a rescue snapshot, not working code. Terminal/preserved state.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/v528-market-gate-preserved-2026-09-11

### `hermes/v528-week1`
- Last commit: 2d31355 — "HP-14: add market-anchored v5.2.8 gate (C-255) — publish only when model has positive edge over de-vigged market fair" (2026-09-09)
- Inferred purpose: Week-1 work on the v5.2.8 market-anchored gate: picks publish only when the model shows positive edge over the de-vigged market fair line. Touches the publish/gating logic of the prediction pipeline. Superseded by later gate iterations; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/v528-week1

### `hermes/verifier-integrity-metrics`
- Last commit: 187e1a7 — "feat(verifier): wire four research papers into the holdout scorecard" (2026-09-26)
- Inferred purpose: Verifier work adding integrity metrics — wiring four research papers into the holdout scorecard. Touches the verification/scorecard layer that grades model outputs. Recent (2026-09-26); integration-quality work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/verifier-integrity-metrics

### `hermes/w2-audit-settlement`
- Last commit: c2d7ad1 — "docs: add development status summary and next steps for cloud coding agents visibility" (2026-08-28)
- Inferred purpose: Week-2 audit-settlement branch whose head is a docs commit summarizing development status and next steps for cloud coding-agent visibility. Handoff/documentation branch; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/w2-audit-settlement

### `hermes/wave5-totals-tiebreak`
- Last commit: 1c69144 — "docs(ops): H-N5 DONE (totals tie-break strict opt-in + before/after replay + proposal) + Wave 5 proposal doc" (2026-09-04)
- Inferred purpose: Wave-5 totals work: a strict opt-in totals tie-break with before/after replay plus the Wave 5 proposal document. Touches ops docs and totals (over/under) handling. Marked DONE; terminal.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wave5-totals-tiebreak

### `hermes/wip-beexly-sports-local-2026-09-26`
- Last commit: db4b189 — "chore(scripts): 400-site sports data sweep — batch runner, shared lib, site list" (2026-09-26)
- Inferred purpose: WIP branch rescuing local work: a 400-site sports data sweep with a batch runner, shared library, and site list. Touches scripts/data-collection tooling. Local-rescue snapshot; recent.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wip-beexly-sports-local-2026-09-26

### `hermes/wip-e1-movement-2026-09-26`
- Last commit: 4f50065 — "feat(e1-movement): player-movement trajectory model + /predict/movement endpoint" (2026-09-26)
- Inferred purpose: WIP branch rescuing a player-movement trajectory model plus a `/predict/movement` API endpoint. Touches the prediction engine's API surface and a movement-model module. Local-rescue snapshot; recent.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wip-e1-movement-2026-09-26

### `hermes/wip-ethandojo-benchmark-film-2026-09-26`
- Last commit: 2c6af8d — "feat(prediction-engine): ethandojo weekly benchmark gate + film module" (2026-09-26)
- Inferred purpose: WIP branch rescuing the Ethan Do (@ethandojo) benchmark work: a weekly benchmark gate plus a film module in the prediction engine. Connects to Garrett's 2026-09-25 Ethan Do model reverse-engineering. Local-rescue snapshot; recent.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wip-ethandojo-benchmark-film-2026-09-26

### `hermes/wip-kb-inventory-2026-09-26`
- Last commit: 570dd02 — "docs(research): add the 13.7k-line analytics KB master and point the README at it" (2026-09-26)
- Inferred purpose: WIP branch rescuing knowledge-base inventory work: a 13.7k-line analytics KB master document with README pointers. Touches research documentation organization. Local-rescue snapshot; recent.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wip-kb-inventory-2026-09-26

### `hermes/wip-wire-port-contract-2026-09-26`
- Last commit: f0b2c36 — "[wire-port-contract] adopt frontier signal catalog, verifier loader, and engine doctrine from hermes last-plan" (2026-09-23)
- Inferred purpose: WIP branch rescuing wire-port-contract work: adopting a frontier signal catalog, verifier loader, and engine doctrine from a prior plan. Touches engine wiring contracts between signals and the engine. Local-rescue snapshot; recent.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wip-wire-port-contract-2026-09-26

### `hermes/wire-papers-2026-09-26`
- Last commit: b4cc172 — "docs(wiring): restate census on this checkout, write the normalizer down" (2026-09-26)
- Inferred purpose: Paper-wiring branch documenting the research corpus census on that checkout and writing down the normalizer spec. Touches wiring documentation for research-paper integration. Recent (2026-09-26).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wire-papers-2026-09-26

### `hermes/wire-signal-ledger`
- Last commit: e24bb53 — "feat(prediction-engine): signal ledger populator + outcome-tuned weight tuner" (2026-09-27)
- Inferred purpose: Signal-ledger wiring in the prediction engine: a ledger populator plus an outcome-tuned weight tuner. Core ledger/wiring infrastructure linking signals to measured outcomes. Recent; integration work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/wire-signal-ledger

### `mimo/typecheck-signal-value-fix`
- Last commit: 2e6d702 — "[mimo/typecheck-signal-value-fix] fail-closed ACI + conformal-margin-set (+Inf k>n); 15/15 tests" (2026-09-19)
- Inferred purpose: Typecheck fix on signal-value code: fail-closed ACI (adaptive conformal inference) plus a conformal margin set with +Inf for k>n, all 15 tests passing. Touches uncertainty/quantification logic with strict correctness requirements. Test-verified fix; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/mimo/typecheck-signal-value-fix

### `mimo/wire-nfl-mlb-2026-09-23`
- Last commit: 94a6d87 — "docs: night log for Lane D (SHA + commands + stop rule)" (2026-09-23)
- Inferred purpose: Mimo's NFL/MLB wiring branch whose head is a Lane D night log (SHA, commands, stop rule). Overnight work-session record; the actual wiring content sits under that log. Stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/mimo/wire-nfl-mlb-2026-09-23

### `motif/arxiv-second-pass-2026-09-27`
- Last commit: 2e58e54 — "arxiv second pass 2026-09-27: seven-paper synthesis, corrected cross-paper architecture, what-we-missed, replacement read 2606.09409 (replaces REJECTed 2609.23158); tracker 585->586/750" (2026-09-27)
- Inferred purpose: arXiv program second-pass repair work: a seven-paper synthesis with corrected cross-paper architecture, a what-we-missed note, and a replacement paper read (2606.09409 replacing REJECTed 2609.23158). Moved the verified-paper tracker 585 → 586 of 750. Research-corpus maintenance; terminal for that pass.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/arxiv-second-pass-2026-09-27

### `motif/audit-fix-calib-2026-10-01`
- Last commit: 3e717b2 — "audit(calibration): honest status labels — stale v5.3.0 proposal + rankings queue (NOT BUILT)" (2026-10-01)
- Inferred purpose: Audit repair pass on calibration: applying honest status labels — marking a stale v5.3.0 proposal and the rankings queue as NOT BUILT. Touches calibration docs/status labeling. Very fresh (2026-10-01); audit-honesty work.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/audit-fix-calib-2026-10-01

### `motif/audit-fix-ledger-2026-10-01`
- Last commit: 535b487 — "fix(ops): add watch crons to the schedule manifest (drift guard was red)" (2026-10-01)
- Inferred purpose: Audit repair on the ledger/ops side: adding watch crons to the schedule manifest because the drift guard was red. Touches the scheduling manifest and drift monitoring. Very fresh (2026-10-01); active ops fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/audit-fix-ledger-2026-10-01

### `motif/audit-fix-props-2026-10-01`
- Last commit: ff9b98d — "fix: sync apps/web/vercel.json crons with root copy" (2026-10-01)
- Inferred purpose: Audit repair on the props lane: syncing the crons in apps/web/vercel.json with the root copy. Touches Vercel deployment scheduling for props jobs. Very fresh (2026-10-01); small ops-consistency fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/audit-fix-props-2026-10-01

### `motif/audit-fix-signals-2026-10-01`
- Last commit: 7042f5f — "fix(signals): shadow-scoring guard + NGS metadata doctrine scrub" (2026-10-01)
- Inferred purpose: Audit repair on signals: a shadow-scoring guard plus scrubbing NGS metadata per the internal-only doctrine. Touches the signal layer and NGS compliance (NGS data never public). Very fresh (2026-10-01); active.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/audit-fix-signals-2026-10-01

### `motif/cv-corpus-2026-10-01`
- Last commit: b06cf30 — "CV corpus REDO: 16 full-read deep dives with implementation specs, corrected matrix + top-kernels (every kernel cites its read)" (2026-10-01)
- Inferred purpose: Computer-vision research corpus redo: 16 full-read deep dives with implementation specs, a corrected matrix, and top kernels — each kernel cited to its source read. Touches the CV research corpus feeding film/prior work. Very fresh (2026-10-01); research depth work.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/cv-corpus-2026-10-01

### `motif/cv-engine-bridge-2026-10-01`
- Last commit: fd9ec10 — "bridge: film priors, engine adapter, shadow harness, backtest scaffold, shadow ledger DDL" (2026-10-01)
- Inferred purpose: Bridge between the CV/film lane and the prediction engine: film priors, an engine adapter, a shadow-testing harness, a backtest scaffold, and shadow-ledger DDL. Touches engine integration and DB schema. Very fresh (2026-10-01); active integration build.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/cv-engine-bridge-2026-10-01

### `motif/cv-perception-2026-10-01`
- Last commit: 3261d7a — "Reconcile field coordinates: goal-line origin shared with tracking template (A feeds D)" (2026-10-01)
- Inferred purpose: CV perception work reconciling field coordinates — aligning goal-line-origin coordinates with the tracking template (module A feeding module D). Touches the tracking/perception coordinate system. Very fresh (2026-10-01); active.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/cv-perception-2026-10-01
