# Sports Branch Atlas — 224 keyword-matched branches

Built 2026-10-02 by 6 parallel workers via GitHub API (read-only). Each entry: latest commit, AI-inferred purpose from name+commit, status hint, github.dev link.

---

# Branch Atlas — Part 0 (chunk-00, 33 branches)

Source: `branch-chunk-00.txt`. Read-only API queries against Beexly/Sports, 2026-10-02. No 404s, no rate limits.

### `agent/total-signal-wiring`
- Last commit: df60c7c — "[agent-TSW] nightly status note 2026-09-27: wired, blocked, next" (2026-09-27)
- Inferred purpose: The total-signal wiring program lane — nightly status notes tracking what signal plumbing got wired vs what's blocked next. Touches the engine's signal ingestion/plumbing (nflverse adapters, Sleeper market signals, source router, lineage). Status: active as of late September (latest commit 2026-09-27, freshest in this chunk).
- Open in browser: https://github.dev/Beexly/Sports/tree/agent/total-signal-wiring

### `backup/pre-push-20260924/gse-signal-wiring`
- Last commit: 771d036 — "fix(quote-plane): #893 HOLD — hard wall, cite vs liveGate split, demote parlay" (2026-09-23)
- Inferred purpose: A backup/safety-copy branch of the gse-signal-wiring work taken pre-push on 2026-09-24. The last real change is a quote-plane fix enforcing a HOLD gate on issue #893 (cite vs liveGate split, parlay demotion). Status: backup snapshot, likely superseded by the landed work.
- Open in browser: https://github.dev/Beexly/Sports/tree/backup/pre-push-20260924/gse-signal-wiring

### `ci/web-calibration-lint`
- Last commit: 90ab83c — "fix(web): exclude arxiv-year calibration ports from tsc roots" (2026-09-23)
- Inferred purpose: CI/build hygiene for the web app and calibration code — fixes TypeScript compilation roots so arxiv-year calibration ports don't break the web build's type checking. Touches web CI config / tsconfig. Status: small surgical fix from 2026-09-23, possibly already merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/ci/web-calibration-lint

### `claude/calibration-math-verification`
- Last commit: fc79d6b — "Verify calibration math end-to-end; pin it; fix one floor denominator" (2026-08-25)
- Inferred purpose: A verification pass over the calibration math — end-to-end check, pinning the verified state, plus one denominator floor fix. Touches the calibration core of the prediction engine. Status: stale (2026-08-25, ~5 weeks old), looks like a one-shot verification lane.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/calibration-math-verification

### `claude/fairpredicts-research`
- Last commit: 70ae1ff — "docs(ops): watchdog exposure + claim hardening — FairPredicts, FTC substantiation, Kalshi dependency" (2026-08-25)
- Inferred purpose: Research/docs on regulatory and claim risk — FairPredicts watchdog exposure, FTC substantiation standards for public claims, and the Kalshi prediction-market dependency. Touches ops docs rather than engine code. Status: stale research doc from 2026-08-25.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/fairpredicts-research

### `claude/fix-calibration-regressions`
- Last commit: 38cb7ae — "fix(calibration): repair two regressions the Clopper-Pearson merge introduced on main" (2026-08-21)
- Inferred purpose: Regression repair after a Clopper-Pearson (binomial confidence interval) change broke calibration behavior on main. Touches the calibration module of the prediction engine. Status: stale (2026-08-21) — likely already merged into main long ago.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/fix-calibration-regressions

### `claude/gate-nflverse-and-dfs-pages`
- Last commit: e145470 — "Gate /nflverse and /fantasy/dfs server-side; add repo-wide paywall guard" (2026-08-25)
- Inferred purpose: Paywall/entitlement work for the web app — server-side gating of the /nflverse and /fantasy/dfs pages plus a repo-wide paywall guard. Touches web routes and access control. Status: stale (2026-08-25), likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/gate-nflverse-and-dfs-pages

### `claude/gse-business-prompts-zexw2w`
- Last commit: 7b1e7d4 — "docs(business): NORTHSTAR and STATE.md aren't absent — they land on #672" (2026-08-26)
- Inferred purpose: Business-side docs work — a note correcting that NORTHSTAR and STATE.md exist and will land via PR #672. Touches docs/business rather than code. Status: stale (2026-08-26), bookkeeping note.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/gse-business-prompts-zexw2w

### `claude/gse-engine-infrastructure-du1mxy`
- Last commit: 94acd5d — "fix(gse-ml-service): patch torch critical CVE, run Docker image as non-root" (2026-08-10)
- Inferred purpose: Security hardening of the ML service infra — patching a critical torch CVE and running the Docker image as non-root. Touches gse-ml-service Docker/infra. Status: stale (2026-08-10), likely merged; one of the oldest branches in this chunk.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/gse-engine-infrastructure-du1mxy

### `claude/gse-gsn-architecture-research-3iidd4`
- Last commit: 75001d0 — "docs: record the re-verification pass, the settle-picks wire-up, and the outlier-detector fix" (2026-09-08)
- Inferred purpose: GSN architecture research docs — records a re-verification pass, wiring up of settle-picks, and an outlier-detector fix. Touches docs on the GSN (Galaxy Sports Network?) architecture and the picks pipeline. Status: research-doc lane, last touched 2026-09-08.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/gse-gsn-architecture-research-3iidd4

### `claude/gse-week1-launch-bh0nqo`
- Last commit: dccdfcb — "docs(research): triage 10 uploaded discovery artifacts — 1 useful, 3 verification failures [skip ci]" (2026-08-26)
- Inferred purpose: Week 1 launch research triage — reviewed 10 uploaded discovery artifacts, found 1 useful and 3 verification failures. Touches docs/research. Status: stale launch-prep lane from 2026-08-26.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/gse-week1-launch-bh0nqo

### `claude/hermes-w2-consolidation`
- Last commit: 0ffe9ca — "test(edge-lab): remove two flaky Math.random tests, and pin a fail-open in the shuffle gate" (2026-08-25)
- Inferred purpose: Test-stability work in the edge lab — removing two flaky Math.random-based tests and pinning fail-open behavior in the shuffle gate. Touches test code, not production logic. Status: stale (2026-08-25), likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/hermes-w2-consolidation

### `claude/lq1-dfs-salaries-gate`
- Last commit: 14aeea6 — "fix(fantasy): gate /api/dfs/salaries behind the fantasy entitlement floor (LQ1)" (2026-08-23)
- Inferred purpose: Launch-qualification item LQ1 — putting the /api/dfs/salaries endpoint behind the fantasy entitlement floor so only entitled users can access DFS salary data. Touches the fantasy API entitlement layer. Status: stale (2026-08-23), likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/lq1-dfs-salaries-gate

### `claude/lq13-calibration-insight-grounding`
- Last commit: 2c73682 — "fix(claims): ground calibration weekly insight numerics (LQ13)" (2026-08-23)
- Inferred purpose: Launch-qualification item LQ13 — grounding the numeric claims in the weekly calibration insight so published numbers are substantiated. Touches the claims/calibration-insights surface. Status: stale (2026-08-23), likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/lq13-calibration-insight-grounding

### `claude/lq7-stripe-webhook-idempotency-research`
- Last commit: ee9b025 — "docs(ops): Stripe webhook idempotency decision record (LQ7)" (2026-08-23)
- Inferred purpose: Launch-qualification item LQ7 — a decision record on Stripe webhook idempotency (payments reliability design). Touches ops docs, not code. Status: stale research doc from 2026-08-23.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/lq7-stripe-webhook-idempotency-research

### `claude/master-research-charter`
- Last commit: 9260886 — "Merge remote-tracking branch 'origin/main' into claude/master-research-charter" (2026-08-21)
- Inferred purpose: purpose unclear from name and commit — the branch name suggests a master research charter document, but the latest commit is just a main merge with no descriptive change. Likely a docs lane that went quiet. Status: stale (2026-08-21).
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/master-research-charter

### `claude/nfl-kickoff-live-check-0qwxfm`
- Last commit: 7f4f29e — "Merge remote-tracking branch 'origin/main' into claude/nfl-kickoff-live-check-0qwxfm" (2026-09-15)
- Inferred purpose: An NFL kickoff live-check lane kept current with main — the branch name implies live game-day checking around the NFL kickoff window. Latest commit is only a main merge, so the specific work isn't visible from the tip. Status: maintenance-kept through 2026-09-15, no recent activity.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/nfl-kickoff-live-check-0qwxfm

### `claude/nflverse-schedules-data`
- Last commit: c4a8904 — "data(nflverse): NFL schedules plus derived columns, 2015-2025, with the fabricated columns left behind" (2026-09-18)
- Inferred purpose: nflverse data ingestion — NFL schedules plus derived columns spanning 2015–2025, with a cleanup pass that removed fabricated columns. Touches the nflverse data layer, a core input for the prediction engine. Status: recently active data lane (2026-09-18).
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/nflverse-schedules-data

### `claude/pl7-calibration-freshness`
- Last commit: ff1f63b — "feat(performance): show the calibration report's freshness stamp (PL7)" (2026-08-23)
- Inferred purpose: Performance/launch item PL7 — adding a freshness stamp to the calibration report so users can see how current the calibration numbers are. Touches the calibration report UI/surface. Status: stale (2026-08-23), likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/pl7-calibration-freshness

### `claude/research-consolidated-status`
- Last commit: 6a50525 — "fix(edge): correct SBR archive rights classification -- excluded, not adopt" (2026-08-21)
- Inferred purpose: Research-status consolidation — the tip commit corrects the rights classification of the SBR (Sports Betting Review?) archive from adopt to excluded, which matters for the legal posture of the research corpus. Touches research docs/edge. Status: stale (2026-08-21).
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/research-consolidated-status

### `claude/signal-architecture-rebuild-bq7l8i`
- Last commit: 640bf95 — "merge main into signal-architecture-rebuild (AGENTS.md append union)" (2026-09-20)
- Inferred purpose: A rebuild of the signal architecture (the engine's signal ingestion/processing layer), kept in sync with main — the merge note references an AGENTS.md append union, so it's actively documented work. Touches signal architecture, likely under intelligence/ or signal dirs. Status: active through 2026-09-20, though the tip is only a merge.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/signal-architecture-rebuild-bq7l8i

### `claude/sports-prediction-launch-rtiexc-r2`
- Last commit: 3910b07 — "fix(review): close the round-two Devin, cubic and CodeRabbit findings on the launch build" (2026-09-06)
- Inferred purpose: Launch-build review cleanup — closing round-two review findings from Devin, cubic, and CodeRabbit on the sports prediction launch build. Touches launch-critical code review remediation. Status: review-round lane, last activity 2026-09-06.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/sports-prediction-launch-rtiexc-r2

### `claude/sports-prediction-platform-6F7Wa`
- Last commit: d43e24a — "feat: add Privacy Policy and Terms of Service pages" (2026-04-22)
- Inferred purpose: The oldest branch in this chunk — a platform landing build adding Privacy Policy and Terms of Service pages. Touches web legal pages. Status: stale (2026-04-22, ~5 months old), almost certainly merged or abandoned.
- Open in browser: https://github.dev/Beexly/Sports/tree/claude/sports-prediction-platform-6F7Wa

### `codex/fable-nfl-evidence-integration`
- Last commit: 3932710 — "feat(prediction-engine): add metric source payload rights" (2026-07-04)
- Inferred purpose: Fable NFL evidence integration — adds metric source payload rights to the prediction engine, likely tracking provenance/rights of ingested metrics. Touches the prediction engine's metric ingestion. Status: stale (2026-07-04).
- Open in browser: https://github.dev/Beexly/Sports/tree/codex/fable-nfl-evidence-integration

### `codex/gse-frontier-recovery-2026-07-13`
- Last commit: 9b6da1a — "Merge origin/main (#114 preview paywall + #115 nflverse PBP) into gse-frontier-recovery" (2026-07-16)
- Inferred purpose: A recovery/work branch pulling in PR #114 (preview paywall) and PR #115 (nflverse play-by-play) from main — the "frontier recovery" name suggests rebuilding frontier/experimental work on top of merged main features. Touches paywall + nflverse PBP areas. Status: stale (2026-07-16).
- Open in browser: https://github.dev/Beexly/Sports/tree/codex/gse-frontier-recovery-2026-07-13

### `copilot/document-findings-gse-design-benchmarks`
- Last commit: 1b9aa7d — "[hermes-C-96] expose odds-header truth fields and skip out-of-season paid supplement" (2026-09-16)
- Inferred purpose: Despite the "document-findings" name, the tip commit is Hermes C-96 work — exposing odds-header truth fields and skipping the paid supplement out of season. Touches odds data exposure and subscription/pick supplement logic. Status: active-ish through 2026-09-16, though the commit looks more like feature work than design-benchmark docs.
- Open in browser: https://github.dev/Beexly/Sports/tree/copilot/document-findings-gse-design-benchmarks

### `docs/move37-research-corpus`
- Last commit: 3a373f6 — "[audit-followup] land 2026-09-14/15 corrections ledger + AGENTS.md follow-up (E.4/E.6)" (2026-09-15)
- Inferred purpose: The MOVE-37 research corpus docs lane — landing the audit corrections ledger from 2026-09-14/15 plus AGENTS.md follow-up items E.4/E.6. Touches docs/research corpus and repo guidance. Status: docs lane, last touched 2026-09-15.
- Open in browser: https://github.dev/Beexly/Sports/tree/docs/move37-research-corpus

### `feat/situation-join-nflverse-espn`
- Last commit: 4b064b5 — "fix(quote-plane): withinHours fail-closed — both commenceTimes required" (2026-09-24)
- Inferred purpose: A situation-join feature between nflverse and ESPN data — the tip commit hardens the quote-plane's withinHours logic to fail closed unless both commenceTimes are present. Touches the odds/quote plane and data-join logic. Status: recently active (2026-09-24).
- Open in browser: https://github.dev/Beexly/Sports/tree/feat/situation-join-nflverse-espn

### `feat/trueprob-calibration-boundary`
- Last commit: 6b82967 — "[hermes-traces] Emit three fixture reasoning traces from scoreGame" (2026-10-02)
- Inferred purpose: True-probability calibration boundary work — the tip commit emits reasoning traces from scoreGame, suggesting observability/explainability of game-scoring calibration decisions. Touches the calibration/prediction engine. Status: ACTIVE — committed 2026-10-02 (today).
- Open in browser: https://github.dev/Beexly/Sports/tree/feat/trueprob-calibration-boundary

### `feat/ws2-ws3-calibration-fuzz-certificate-wire`
- Last commit: 5311891 — "feat(board): certifyBoardGateEvaluation — the first production consumer of the certificate bridge + aligned work plan" (2026-07-28)
- Inferred purpose: Calibration fuzz certificate wiring for workstreams 2/3 — wires certifyBoardGateEvaluation as the first production consumer of the certificate bridge, i.e., certified/calibrated board-gate evaluation. Touches the board evaluation and calibration certificate infrastructure. Status: stale (2026-07-28).
- Open in browser: https://github.dev/Beexly/Sports/tree/feat/ws2-ws3-calibration-fuzz-certificate-wire

### `feat/ws5-walkforward-wiring`
- Last commit: cb7b12b — "ci: retrigger checks (empty diff)" (2026-07-28)
- Inferred purpose: Walk-forward validation wiring for workstream 5 — the tip commit is just a CI retrigger, so the actual walk-forward work isn't visible from the tip. Walk-forward validation is core to model evaluation. Status: stale (2026-07-28), possibly merged or abandoned.
- Open in browser: https://github.dev/Beexly/Sports/tree/feat/ws5-walkforward-wiring

### `fix/calibration-gate-determinism-2026-09-11`
- Last commit: 4182f16 — "[hermes-calib] fix(calibration): seeded estimators read a canonical sample order; guard flags verdict flips on identical metrics" (2026-09-11)
- Inferred purpose: Determinism fix for the calibration gate — seeded estimators now read samples in a canonical order, and a guard flags verdict flips when metrics are identical. Touches the calibration gate's estimator logic. Status: surgical fix from 2026-09-11, likely merged.
- Open in browser: https://github.dev/Beexly/Sports/tree/fix/calibration-gate-determinism-2026-09-11

### `fix/signal-ledger-shard-v2`
- Last commit: 1a2d01b — "docs(calibration): record that the §2 backtest does not resolve" (2026-09-28)
- Inferred purpose: Signal-ledger sharding work (v2) — the tip commit documents that the section-2 backtest does not resolve, i.e., a known limitation recorded in calibration docs. Touches the signal ledger and calibration backtesting. Status: active through 2026-09-28, reads like an honest limitation note rather than completed work.
- Open in browser: https://github.dev/Beexly/Sports/tree/fix/signal-ledger-shard-v2

---

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

---

# Branch Atlas — Part 2 (chunk 02)

Generated 2026-10-02 from GitHub API branch reads on `Beexly/Sports`. Entries are ordered as in `branch-chunk-02.txt`.

### `gse/true-pava-calibrator-matrix`
- Last commit: 313b9f4 — "feat(cal): true pointwise PAVA + calibrator selection matrix" (2026-08-09)
- Inferred purpose: Calibration lane — implements a true pointwise PAVA (pool-adjacent-violators) isotonic regressor and a matrix comparing/selecting calibrators. Touches the calibration module (likely edge-lab / calibration code). Status hint: old (August), experimental, likely superseded by later calibration work.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/true-pava-calibrator-matrix

### `gse/wp24-c86-totals-drop-reasons`
- Last commit: 1dee2fc — "[hermes-wp24] attach total drop reasons to coverage" (2026-09-24)
- Inferred purpose: WP-24 work package, claim C-86 — attaches reasons rows were dropped to coverage reporting for totals (over/under) markets. Touches coverage/reporting code. Status hint: recent-ish; may have been absorbed into the totals coverage lane.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/wp24-c86-totals-drop-reasons

### `handoff/gse-complete-2026-09-20`
- Last commit: ecc39d1 — "handoff: GSE complete work package" (2026-09-20)
- Inferred purpose: Handoff snapshot branch — a packaged snapshot of the complete GSE work state as of 2026-09-20, presumably for transfer between agents/hosts. Status hint: snapshot artifact; unlikely to be actively developed.
- Open in browser: https://github.dev/Beexly/Sports/tree/handoff/gse-complete-2026-09-20

### `hermes-surf-14-inventory`
- Last commit: ed4b99d — "[hermes-surf-16] ledger: resolve the evidence SHA to 2b546ec5b" (2026-09-29)
- Inferred purpose: Inventory/audit lane (surf-14 naming) whose latest commit ties into the surf-16 ledger, resolving an evidence SHA. Touches docs/ops ledger bookkeeping. Status hint: recent; active bookkeeping context.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-14-inventory

### `hermes-surf-16-provenance-fix`
- Last commit: 47fe369 — "docs(ops): four worker reports (airwave readiness, odds blackout, PR triage, dupes)" (2026-09-29)
- Inferred purpose: Provenance/audit lane for surf-16 — publishes four worker reports covering airwave readiness, an odds blackout, PR triage, and duplicates. Touches docs/ops. Status hint: recent; active audit documentation.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-16-provenance-fix

### `hermes-surf-16b`
- Last commit: 95c36c1 — "docs(ops): bridge-file review - 66 of the 75 rescued files are already in the repo" (2026-09-29)
- Inferred purpose: surf-16 follow-up lane — a bridge-file dedupe review finding that 66 of 75 rescued files were already present in the repo. Touches docs/ops. Status hint: recent; active dedupe/audit work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-16b

### `hermes/2026-09-18-flash`
- Last commit: 4cdd779 — "fix(edge-lab): close remaining loop holes — CQR empty, 5pp market, Venn-by-sport, discrete CRPS" (2026-09-18)
- Inferred purpose: One-day flash fix lane on edge-lab — closes CQR empty-interval loopholes, the 5-percentage-point market check, Venn-by-sport, and discrete CRPS handling. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/2026-09-18-flash

### `hermes/2026-09-18-queues`
- Last commit: 1b13ba9 — "fix(types): static dispatch for ranking orderings (Codacy critical)" (2026-09-18)
- Inferred purpose: One-day fix lane — replaces a dynamic dispatch with static dispatch in ranking-ordering types, flagged critical by Codacy. Touches type-level/ranking code. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/2026-09-18-queues

### `hermes/arbiter-0930`
- Last commit: 7ac8d5d — "fix(arbiter): declare the cron in the LIVE apps/web config too" (2026-10-01)
- Inferred purpose: Arbiter lane — declares the arbiter cron in the live apps/web config so the scheduled job actually runs in production. Touches apps/web cron config. Status hint: very recent; active.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/arbiter-0930

### `hermes/b6a-chain-append`
- Last commit: 7f3822c — "B-6a: ledger-store.ts added; process-sport.ts wiring BLOCKED" (2026-08-19)
- Inferred purpose: B-6a chain-append work — adds ledger-store.ts; process-sport.ts wiring was explicitly blocked at this commit. Touches the ledger chain code. Status hint: old; flagged BLOCKED — may be dead or awaiting unblock.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/b6a-chain-append

### `hermes/c104-clock-rot`
- Last commit: f33b09b — "[hermes-c104] clock-rot: relative kickoff + toKalshiDateFragment (test-only)" (2026-09-18)
- Inferred purpose: Claim C-104 — clock rotation helpers: relative kickoff time and a Kalshi date-fragment formatter, marked test-only. Touches Kalshi/time utilities. Status hint: single-day lane; test-only scope suggests experimental.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c104-clock-rot

### `hermes/c11-launch-fixes`
- Last commit: 3c28651 — "Record the game-clustering limitation on the AUC, and why the null survives it" (2026-09-04)
- Inferred purpose: C-11 launch lane — documents a game-clustering limitation affecting AUC measurement and why the null result survives it. Touches evaluation/AUC documentation. Status hint: old; documentation fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c11-launch-fixes

### `hermes/c12-close-the-pass`
- Last commit: 87000c3 — "C12 recovery completion: commit 9 worktree-only files the crash left behind (age-verify page+route+lib, paid-checkout switch, board-surface-chip, stripe-price-c…" (2026-09-05)
- Inferred purpose: C-12 crash recovery — commits 9 worktree-only files left behind by a crash (age-verify page/route/lib, paid-checkout switch, board-surface-chip, Stripe price code). Touches website checkout/verification UI. Status hint: one-off recovery; done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c12-close-the-pass

### `hermes/c298-inplay-parity-2026-09-12`
- Last commit: 395a58e — "Fix em-dash-scan failures in the-beat copy (punctuation only, no meaning change)" (2026-09-12)
- Inferred purpose: C-298 inplay-parity lane — latest commit is a copy-punctuation pass fixing em-dash-scan failures in the-beat copy (copy doctrine compliance). Touches website copy. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c298-inplay-parity-2026-09-12

### `hermes/cal-oom-fix-20260919`
- Last commit: 38d7577 — "fix(calibration): pass the Prisma client through the loose OddsTableDb boundary at the three recompute call sites (repo convention)" (2026-09-19)
- Inferred purpose: Calibration OOM fix — threads the Prisma client through the loose OddsTableDb boundary at three recompute call sites per repo convention. Touches calibration recompute paths. Status hint: single-day lane; likely landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/cal-oom-fix-20260919

### `hermes/calibration-audit-2026-09-30`
- Last commit: 034bfd7 — "docs(calibration): audit engine calibration claims against measured evidence" (2026-09-30)
- Inferred purpose: Calibration audit lane — a document auditing the engine's calibration claims against measured evidence. Touches docs/calibration. Status hint: recent; active audit.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/calibration-audit-2026-09-30

### `hermes/clv-decided-disclosure-20260920`
- Last commit: 2b2b780 — "Merge branch 'main' into hermes/clv-decided-disclosure-20260920" (2026-09-20)
- Inferred purpose: CLV (closing line value) decided-disclosure lane — disclosure reporting for decided bets' CLV. Latest commit is a main merge, so the substantive work is in earlier commits. Touches CLV/disclosure code. Status hint: rebased recently; purpose partly inferred from name since the latest commit is just a merge.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/clv-decided-disclosure-20260920

### `hermes/covariate-bus`
- Last commit: 5a1790d — "fix(edge-lab): add avgYac covariate to bus + tests" (2026-08-22)
- Inferred purpose: Covariate-bus lane in edge-lab — adds the avgYac (average yards after catch) covariate to the bus with tests. Touches edge-lab covariates. Status hint: old; likely superseded by the covariate-bus feature lanes.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-bus

### `hermes/covariate-bus-pfeatures-frame-forecast`
- Last commit: bc401cb — "feat(edge-lab): PFeatureSet + FrameForecast over covariate bus (PR per DEEPSEEK-CONTINUE-BUS)" (2026-08-27)
- Inferred purpose: Extends the covariate bus with PFeatureSet + FrameForecast features, built per the DeepSeek CONTINUE-BUS spec. Touches edge-lab feature framing code. Status hint: old; experimental feature framing.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-bus-pfeatures-frame-forecast

### `hermes/covariate-cpoe-comp`
- Last commit: d92a64d — "docs: mark #553 merged, update serving SHA to 0285b992" (2026-08-22)
- Inferred purpose: Covariate CPOE (completion percentage over expected) comparison lane — latest commit is pure bookkeeping: marks PR #553 merged and updates the serving SHA. Touches docs/CPOE tracking. Status hint: old; bookkeeping commit.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-cpoe-comp

### `hermes/ethandojo-typecheck-2026-09-25`
- Last commit: 5734416 — "[hermes-ETH-V1] record verification and the 18-error remediation in the ledger" (2026-09-25)
- Inferred purpose: ETH-V1 (Ethan Do model-rebuild lane) typecheck verification — records verification and an 18-error TypeScript remediation in the ledger. Touches the rebuilt model's types + ledger. Status hint: single-day lane; done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ethandojo-typecheck-2026-09-25

### `hermes/f9-ledger-chain-schema`
- Last commit: 96feca8 — "[founder-F-9] ledger DONE a28e1d67" (2026-08-20)
- Inferred purpose: Founder claim F-9 — the ledger chain schema; marked DONE at this commit. Touches the ledger chain schema. Status hint: old; completed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/f9-ledger-chain-schema

### `hermes/fe-c93`
- Last commit: 6c5ef58 — "[hermes-c93] claim C-93 frontend launch-quality batch (FE-02/08/09/11/12/13/17/18); FE-05/10/15 already in f06be6b31, FE-14 skipped for Claude's uncommitted tok…" (2026-09-10)
- Inferred purpose: C-93 frontend launch-quality batch — a set of FE-* frontend tasks (FE-02/08/09/11/12/13/17/18), with some already landed and FE-14 skipped. Touches the web frontend. Status hint: old; batch partially landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fe-c93

### `hermes/final-pass-2026-09-10`
- Last commit: fc1df2d — "[hermes-C313] ledger: C-313 DONE with the timeout correction, C-315 opened for the misnamed credential on this host" (2026-09-11)
- Inferred purpose: Final-pass ledger lane — marks C-313 DONE with a timeout correction and opens C-315 for a misnamed credential on this host. Touches ledger bookkeeping. Status hint: old; bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/final-pass-2026-09-10

### `hermes/finish-line-2026-09-05`
- Last commit: 56994f6 — "Merge remote-tracking branch 'origin/main' into hermes/finish-line-2026-09-05" (2026-09-06)
- Inferred purpose: purpose unclear from name and commit — the latest commit is only a main merge, and the branch name gives no domain hint. Substantive intent would need earlier commits. Status hint: old; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/finish-line-2026-09-05

### `hermes/fix-884-mock-isresearchpower`
- Last commit: 2137f49 — "test(cqr): take main's fail-closed conformal-quantile assertions" (2026-09-26)
- Inferred purpose: Fix for #884 (mock isResearchPower flag) — latest commit pulls main's fail-closed conformal-quantile assertions into the CQR tests. Touches CQR test assertions. Status hint: recent; syncing with main.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-884-mock-isresearchpower

### `hermes/fix-ingestion-oom-and-tracing`
- Last commit: 5be986c — "ledger: FIX-3 and FIX-4 verified live on dpl_CJYjQ13QPRtrBNGWrJnP4sEUTWKa; DOC-1 now measured" (2026-09-28)
- Inferred purpose: Ingestion OOM + tracing fixes — FIX-3 and FIX-4 verified live on a Vercel deployment (dpl_CJYjQ13QPRtrBNGWrJnP4sEUTWKa), with DOC-1 now measured. Touches data ingestion and tracing/ledger code. Status hint: recent; actively verified live.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-ingestion-oom-and-tracing

### `hermes/fix-lint-unused-args`
- Last commit: 5185a5b — "fix(data-ingestion): filter the season DURING the parse so refresh-player-stats stops OOMing" (2026-09-28)
- Inferred purpose: OOM fix in data ingestion — filters the season during the parse so refresh-player-stats no longer runs out of memory. Touches data-ingestion parse code. Status hint: recent; active fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-lint-unused-args

### `hermes/fix-publish-time-market-p-scan`
- Last commit: 9eabac8 — "[hermes-fix-ptmp-scan] publish-time-market-p source scan: accept the defensive db cast" (2026-09-20)
- Inferred purpose: Publish-time market-probability source scan fix — accepts the defensive database cast in the scan code. Touches the publish-time market-p source scan. Status hint: single-day lane; likely landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-publish-time-market-p-scan

### `hermes/fix-trust-gate-surname`
- Last commit: a3cc77e — "fix(trust-gate): clear the 4 remaining hits the job log named" (2026-09-26)
- Inferred purpose: Trust-gate scan fix — clears the 4 remaining hits named by the job log (oddly named "surname"; likely a scan-rule key). Touches trust-gate/guardrail scanning. Status hint: recent; active cleanup.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-trust-gate-surname

### `hermes/footer-link`
- Last commit: e50e611 — "[hermes-footer] Retarget dead /#founding-waitlist footer link to /waitlist" (2026-09-10)
- Inferred purpose: Website footer fix — retargets the dead /#founding-waitlist footer link to /waitlist. Touches the site footer. Status hint: old; small fix, done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/footer-link

### `hermes/founder-picks-form`
- Last commit: 93cb695 — "[hermes-UI-1] ledger: record the resolvable work SHA on the UI-1 row" (2026-09-27)
- Inferred purpose: UI-1 founder-picks form lane — latest commit is ledger bookkeeping recording the resolvable work SHA on the UI-1 row. Touches the founder picks form UI + ledger. Status hint: recent-ish; bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/founder-picks-form

### `hermes/frontier-transfer-2026-09-15`
- Last commit: 44b8ee6 — "[hermes-self-audit] Withdraw unisolated causal claim (thread-sprawl); L3 shelved on wrong half (snap_counts + practice_status unused); E2/F4 unblockable via the…" (2026-09-16)
- Inferred purpose: Frontier-transfer self-audit — withdraws an unisolated causal claim (thread-sprawl), shelves L3 for sitting on the wrong half (snap_counts + practice_status unused), notes E2/F4 unblockable. Touches research transfer audit docs. Status hint: single-day audit; corrective.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frontier-transfer-2026-09-15

### `hermes/frozen-path-guardrails`
- Last commit: 66b27f2 — "[hermes-C-363] ci: verify:holdout in run-all; L11 scorecard precondition (C-363)" (2026-09-15)
- Inferred purpose: Frozen-path CI guardrails — wires verify:holdout into run-all and adds the L11 scorecard precondition (C-363). Touches CI config and scorecard preconditions. Status hint: old; CI hardening.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frozen-path-guardrails

### `hermes/frozen-path-settle-scheduler`
- Last commit: b261b35 — "[hermes-C-418] ci: remove settle-picks from GitHub Actions (frozen-path)" (2026-09-15)
- Inferred purpose: Frozen-path CI change — removes settle-picks from GitHub Actions (C-418), likely to keep pick-settlement off the automated path. Touches GitHub Actions workflows. Status hint: old; deliberate automation restriction.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frozen-path-settle-scheduler

### `hermes/galaxy-keyless-fixes`
- Last commit: 727f3eb — "fix(galaxy): resolve 6 pre-existing tsc errors + add cron-matrix CI gate" (2026-08-28)
- Inferred purpose: Galaxy keyless fixes — resolves 6 pre-existing TypeScript errors and adds a cron-matrix CI gate. Touches the galaxy web app + CI. Status hint: old; maintenance fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/galaxy-keyless-fixes

### `hermes/galaxy-keyless-odds`
- Last commit: d880a84 — "feat(galaxy): clearance-gated keyless path + Kalshi second-book capability + timeouts" (2026-08-28)
- Inferred purpose: Galaxy keyless odds feature — a clearance-gated keyless path, Kalshi as a second book, and timeouts. Touches the galaxy web app's odds/keyless flow. Status hint: old; feature work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/galaxy-keyless-odds

### `hermes/gate-bound-stability-2026-09-12`
- Last commit: 74cd837 — "[hermes-gate] feat(ops): per-market calibration gate — RES floor as the anti-constant guard, no-skill-relative Brier" (2026-09-11)
- Inferred purpose: Per-market calibration gate — adds an RES floor as an anti-constant guard and a no-skill-relative Brier metric. Touches calibration gating/ops code. Status hint: single-day lane; gate stability work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/gate-bound-stability-2026-09-12

### `hermes/green-board-1`
- Last commit: a3560fa — "fix(guardrails): GB-6 review — mask-then-scan replaces line-level exemption (bypass hole closed)" (2026-08-29)
- Inferred purpose: Green-board guardrails — GB-6 review replacing line-level scan exemptions with mask-then-scan, closing a bypass hole. Touches guardrail scanning code. Status hint: old; security hygiene.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/green-board-1

### `hermes/grok46-full-audit-2026-08-27`
- Last commit: d6fc2c2 — "[hermes-C-64] ledger: mark C-64 DONE with 4ad1af456 #679" (2026-08-27)
- Inferred purpose: Grok 4.6 full-audit lane — latest commit is ledger bookkeeping marking C-64 DONE (referencing PR #679). Touches the audit ledger. Status hint: old; audit completion bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/grok46-full-audit-2026-08-27

---

# Branch Atlas — Part 3 (hermes/ branch chunk 03)

42 branches, read-only API sweep 2026-10-02. All branches resolved (0 404s, no rate limiting).

### `hermes/gse-signal-wiring-20260924`
- Last commit: eb737da — "feat(data-ingestion): add direct ESPN source adapters" (2026-09-25)
- Inferred purpose: Total-signal wiring lane — wires direct ESPN source adapters into the data-ingestion layer. One of the core GSE signal-wiring branches. Active as of late Sept (one week old), likely the live version of the signal-wiring handoff.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/gse-signal-wiring-20260924

### `hermes/h0-docs-completion-marker`
- Last commit: 99f8c26 — "docs(ops): annotate H0 completion status in EDGE-HUNT-LAUNCH.md" (2026-08-23)
- Inferred purpose: Housekeeping marker for the H0 (edge-hunt launch) workstream — annotates completion status in the launch doc. Docs-only, bookkeeping nature. Stale (Aug 23).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h0-docs-completion-marker

### `hermes/h0-incentive-cal-covariates`
- Last commit: ef67706 — "feat(edge-lab): incentive + rule-change calendar as covariates (H0 slice #4)" (2026-08-23)
- Inferred purpose: Edge-lab experiment adding incentive structures and rule-change calendars as model covariates — the H0 slice #4 workstream. Touches edge-lab model features. Stale (Aug 23).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h0-incentive-cal-covariates

### `hermes/h0-next`
- Last commit: e837ece — "chore: stage overnight grunt work (close-truth test, research files from agents)" (2026-08-23)
- Inferred purpose: Staging branch for overnight grunt work — close-truth tests and research files collected from agents. Scratch/staging branch, not a feature lane. Stale (Aug 23).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h0-next

### `hermes/h0-validation-harness`
- Last commit: 04410c0 — "feat(edge-lab): est-routes TPRR proxy from snaps x dropbacks (H0.4 E-C1)" (2026-08-22)
- Inferred purpose: Edge-lab validation harness work — builds an estimated-routes / TPRR (targets per route run) proxy from snaps x dropbacks, task H0.4 E-C1. Experimental model-feature branch. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h0-validation-harness

### `hermes/h1-qb-pressures-edge`
- Last commit: 6933655 — "fix(edge-lab): unblock H1 CI — typecheck, leak wall, and a permanently-red test" (2026-08-25)
- Inferred purpose: H1 workstream on QB-pressures as an edge-lab feature; last commit is CI repair (typecheck, leak wall, a red test). Model-research lane in edge-lab. Stale (Aug 25).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h1-qb-pressures-edge

### `hermes/h2-remaining-binds`
- Last commit: 4a51567 — "[op100] register: G-4 partial-fix row (routes proxy, 2024 join built)" (2026-08-23)
- Inferred purpose: Ledger/registration bookkeeping for remaining binds — records a G-4 partial fix (routes proxy, 2024 data join). Appears to be ops-tracking rather than a feature branch. Stale (Aug 23).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/h2-remaining-binds

### `hermes/hero-r3f-stack`
- Last commit: 9eeb374 — "fix: finalize rebase onto main — engine set to main's exact DP (0 Math.random), probe+test adapted to 3-arg signature, oracle reports regenerated against final engine, fix pre-existing tsc null-assert bug in proj-calibration.ts" (2026-09-12)
- Inferred purpose: Rebase/integration branch bringing a hero R3F stack onto main — touched the prediction engine (determinism DP work, probe/test signature change, oracle reports, calibration TS fix). Integration cleanup after rebase. Likely merge-ready or merged; stale since Sep 12.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/hero-r3f-stack

### `hermes/hf5-mve`
- Last commit: 0035e3b — "[hermes-H-F5] freeze MVE e-process; cycle BLOCKED on DB auth" (2026-08-20)
- Inferred purpose: H-F5 minimum-viable-experiment on the e-process; explicitly frozen, blocked on database auth. Stalled/experimental — work paused by the DB-auth blocker. Stale (Aug 20).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/hf5-mve

### `hermes/homepage-teardown`
- Last commit: 2d192a6 — "[hermes-iris] Iris wayfinding accent + active nav states" (2026-09-10)
- Inferred purpose: Homepage/web teardown work — the Iris lane (wayfinding accents, active nav states) in the site UI. Frontend/site surface branch. Stale since Sep 10.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/homepage-teardown

### `hermes/l6-clv-analysis`
- Last commit: 830ff6d — "L-6: CLV analysis of 2026-08-18 census (UNPUSHED)" (2026-08-19)
- Inferred purpose: Closing-line-value (CLV) analysis of the 2026-08-18 data census — betting-performance forensics lane. Commit message notes the analysis itself was unpushed at the time. Stale (Aug 19).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/l6-clv-analysis

### `hermes/l7-clv-forensics`
- Last commit: f87146b — "L-8: Commit CLV forensics artifacts (raw.json, ml-and-books.json, per-book.json, README.md)" (2026-08-19)
- Inferred purpose: CLV forensics follow-on — commits CLV forensic artifacts (raw data, ML-vs-books breakdown, per-book JSON, README). Research/analysis artifacts lane. Stale (Aug 19).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/l7-clv-forensics

### `hermes/land-audit-wave`
- Last commit: cecd888 — "land #664 (B3 money): swallowed failures on money/kill-switch/alert paths made audible fail-closed outcomes [LF git apply clean; RED->GREEN: 18/24 apps + 3/4 pkg tests failed against old code, 177+4 passed after]" (2026-09-04)
- Inferred purpose: Landing branch for PR/audit #664 (B3 money lane) — converts swallowed failures on money, kill-switch, and alert paths into audible fail-closed outcomes, with RED->GREEN test evidence. Money-path safety work. Stale (Sep 4).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/land-audit-wave

### `hermes/lane-bc-20260920`
- Last commit: cca14d2 — "[hermes-lane-b-nfl-publish] Mint-side supersede of unpublished PENDING slot-holders (NFL spreads/totals fix)" (2026-09-20)
- Inferred purpose: Lane-B NFL publish lane — supersede logic for unpublished PENDING slot-holders (NFL spreads/totals fix) on the mint side of the publish pipeline. Nearly identical to hermes/nfl-publish-supersede-20260920 (same date, same message pattern). Stale (Sep 20).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/lane-bc-20260920

### `hermes/last-plan-2026-09-15`
- Last commit: 9ae24d7 — "[hermes-corpus-signals] load every inventoried document as an engine signal" (2026-09-22)
- Inferred purpose: Corpus-signals lane — loads every inventoried research document as an engine signal (the total-signal ingestion play). Touches engine signal registration. Fairly recent (Sep 22); active candidate for the signal-wiring workstream.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/last-plan-2026-09-15

### `hermes/ledger-0928`
- Last commit: d1a6edc — "test(ci): cover the cron ROUTE contracts, not just the functions behind them" (2026-09-28)
- Inferred purpose: Ledger lane branch — extends CI test coverage to cron ROUTE contracts (testing the routes, not just the functions). CI/infra quality work. Recent (Sep 28).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ledger-0928

### `hermes/ledger-hr`
- Last commit: 2635594 — "[hermes-ledger] H-R DONE: NEBULA v7 overnight (merged #754 #755 #756)" (2026-09-10)
- Inferred purpose: Ledger bookkeeping branch marking H-R complete — records the NEBULA v7 overnight reskin landing (PRs #754/#755/#756). Completion marker, not active work. Stale (Sep 10).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ledger-hr

### `hermes/ledger-sha-fix-2026-09-05`
- Last commit: 0136130 — "Ledger H-N7/H-N8: repoint Evidence to squash commit c92964d23" (2026-09-05)
- Inferred purpose: Ledger repair branch — repoints evidence rows to the correct squash commit (c92964d23) for the H-N7/H-N8 night work. One-off integrity fix. Stale (Sep 5).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ledger-sha-fix-2026-09-05

### `hermes/live-wip-2026-09-24`
- Last commit: 0c9c9ea — "[hermes-SO-1c] TEST_GAP_MAP: correct the stale ranking with measured counts" (2026-09-29)
- Inferred purpose: Live work-in-progress branch carrying the SO-1c test-gap-map work — corrects a stale test-coverage ranking with measured counts. Test-inventory/CI lane. Recent (Sep 29).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/live-wip-2026-09-24

### `hermes/ncaaf-calibration-2026-09-04`
- Last commit: c9e5ecd — "docs(scripts): correct falsified header in run-historical-calibration.mjs (dispatch sec5 T3)" (2026-09-04)
- Inferred purpose: NCAAF historical-calibration script lane — fixes a falsified doc header in run-historical-calibration.mjs (dispatch section 5, task T3). Small integrity fix. Stale (Sep 4).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ncaaf-calibration-2026-09-04

### `hermes/nfl-adv-metrics-2026-09-17`
- Last commit: f041278 — "Add files via upload" (2026-09-18)
- Inferred purpose: NFL advanced-metrics lane (per branch name), but the last commit is a generic GitHub-web "Add files via upload" with no detail — content not inferable from the commit message. Stale (Sep 18); check branch file list for what was uploaded.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/nfl-adv-metrics-2026-09-17

### `hermes/nfl-change-point-detect`
- Last commit: 92f5f3d — "feat(edge-lab): NFL change-point / regime detector (H0 slice #1)" (2026-08-23)
- Inferred purpose: Edge-lab model feature — an NFL change-point / regime detector (H0 slice #1), detecting when a team's performance regime shifts. Experimental modeling branch. Stale (Aug 23).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/nfl-change-point-detect

### `hermes/nfl-publish-supersede-20260920`
- Last commit: bc1f570 — "[hermes-lane-b-nfl-publish] Mint-side supersede of unpublished PENDING slot-holders (NFL spreads/totals fix)" (2026-09-20)
- Inferred purpose: Lane-B NFL publish fix — supersedes unpublished PENDING slot-holders on the mint side (NFL spreads/totals). Mirror of hermes/lane-bc-20260920 (same message/date). Publish-pipeline lane. Stale (Sep 20).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/nfl-publish-supersede-20260920

### `hermes/ngs-sep-adot-catch`
- Last commit: 40ada7b — "fix(sep-bind): remove stray leftover comment in test file" (2026-08-22)
- Inferred purpose: NGS (Next Gen Stats) September aDOT (average depth of target) catch-work — sep-bind cleanup, removing a stray leftover comment in a test file. Minor test hygiene in the NGS data binding. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ngs-sep-adot-catch

### `hermes/night-2026-09-04`
- Last commit: 196c8f0 — "[hermes-H-N6] re-audit extended to all waves: W1-W4 deep-checked, W3 numbers reproduced exactly" (2026-09-04)
- Inferred purpose: Overnight audit branch (H-N6) — extended re-audit across waves W1-W4, with W3 numbers exactly reproduced. Audit/verification lane. Stale (Sep 4).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/night-2026-09-04

### `hermes/night-2026-09-05`
- Last commit: e323def — "merge: origin/main (C12 #704) into hermes/night-2026-09-05 — union ledger rows (C12 + H-N7/H-N8), LEVERAGE_STATUS reconciled to post-attic truth (12 archived/5 kept/2 misattributed, footprint re-measured 70,425 B, src file count 299)" (2026-09-05)
- Inferred purpose: Overnight ledger-reconciliation branch (H-N7/H-N8) — merges main into the night branch, unions ledger rows, reconciles LEVERAGE_STATUS against the post-attic attic/archive truth. Attic/archival accounting lane. Stale (Sep 5).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/night-2026-09-05

### `hermes/night-shift-1`
- Last commit: e6dd028 — "fix(proof): P0-1 canonical redirect origins, P0-2 entryOdds write-guard, P2-6 copy sweep, P3-7 pickType in receipts" (2026-09-08)
- Inferred purpose: Night-shift proof-fix branch — repairs proof-system items (canonical redirect origins, entryOdds write-guard, copy sweep, pickType in receipts). Same fix set as hermes/p0-launch-fixes (identical SHA prefix family/date), suggesting a parallel or duplicate branch. Stale (Sep 8).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/night-shift-1

### `hermes/opp-adj-epa-20260919`
- Last commit: 779528e — "move37: W5-W8 lab duels executed, all four KILLED at pre-registered lines (nulls preserved)" (2026-09-19)
- Inferred purpose: MOVE-37 lane branch — executed W5-W8 lab duels, all four killed at pre-registered lines with nulls preserved. Name suggests opponent-adjusted EPA context, but the latest commit is the MOVE-37 duel record. Experiment-ledger lane. Stale (Sep 19).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/opp-adj-epa-20260919

### `hermes/overnight-2026-08-27`
- Last commit: 54ae961 — "[hermes-overnight-2026-08-27] §4 research batch 13: xT-MDP/CxT, NHL special-teams xG, NFL DEPA, MLB framing-runs, soccer MC/HMM (70 methods)" (2026-08-27)
- Inferred purpose: Overnight research batch (section 4, batch 13) — 70 sports-analytics methods catalogued across NHL xG, NFL DEPA, MLB framing runs, soccer Markov/HMM models. Research-inventory lane. Stale (Aug 27).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/overnight-2026-08-27

### `hermes/ox-alpha-pass-yards-given-attempts`
- Last commit: 690e96d — "feat(props): pass yards given attempts — Gamma-Poisson exposure on attempts, not games" (2026-08-22)
- Inferred purpose: Ox-alpha props lane — pass-yards prop model using Gamma-Poisson exposure on pass attempts rather than games. Passing-prop modeling branch. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ox-alpha-pass-yards-given-attempts

### `hermes/ox-alpha-q-integrity`
- Last commit: 7d91770 — "fix(ledger): T-Q3a DONE row needs resolvable SHA evidence" (2026-08-22)
- Inferred purpose: Ox-alpha ledger-integrity fix — repairs a T-Q3a DONE row so it points at resolvable SHA evidence. Ledger bookkeeping, not modeling work. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ox-alpha-q-integrity

### `hermes/ox-alpha-rush-attempts-volume`
- Last commit: f55a2e1 — "docs: log H0 merge #555/#556/#557 into ox-alpha" (2026-08-22)
- Inferred purpose: Ox-alpha branch logging H0 merge PRs (#555/#556/#557) into the ox-alpha context. Docs/bookkeeping marker for the rush-attempts-volume lane. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ox-alpha-rush-attempts-volume

### `hermes/p0-3-ablation`
- Last commit: ed631a8 — "docs(ablation): P0-3 confidence-inversion ablation — mechanism found, measurement only" (2026-09-09)
- Inferred purpose: P0-3 confidence-inversion ablation study — documents a found mechanism, measurement-only (no fix shipped). Model-ablation research lane. Stale (Sep 9).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/p0-3-ablation

### `hermes/p0-launch-fixes`
- Last commit: 3a07fff — "fix(proof): P0-1 canonical redirect origins, P0-2 entryOdds write-guard, P2-6 copy sweep, P3-7 pickType in receipts" (2026-09-08)
- Inferred purpose: P0 launch fixes for the proof system — canonical redirect origins, entryOdds write-guard, copy sweep, pickType in receipts. Launch-day hardening lane. Same fix set as hermes/night-shift-1. Stale (Sep 8).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/p0-launch-fixes

### `hermes/p1d2-durable-limiter-verify`
- Last commit: 592e086 — "[hermes-P1d-2] Verify GSE-SEC-015 durable limiter on main (tsc=0, lint=0, vitest 6/6)" (2026-09-24)
- Inferred purpose: Verification branch for GSE-SEC-015 durable limiter — confirms it passes on main (clean typecheck, lint, and 6/6 vitest). Security/rate-limit infra verification. Recent-ish (Sep 24).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/p1d2-durable-limiter-verify

### `hermes/pass-volume-targets`
- Last commit: dd755ab — "pass-volume: use team_targets (sum of player targets) for rbTargetShare, not QB attempts" (2026-08-22)
- Inferred purpose: Pass-volume modeling fix — redefines rbTargetShare from the sum of player targets (team_targets) instead of QB attempts. Receiving-volume / target-share model feature. Stale (Aug 22).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/pass-volume-targets

### `hermes/plain-proof-2026-09-10`
- Last commit: 541e494 — "[hermes-ledger] H-R DONE: NEBULA v7 reskin merged via 94706a839 (#754)" (2026-09-10)
- Inferred purpose: Ledger completion marker — records the NEBULA v7 reskin merged via commit 94706a839 (PR #754) as H-R DONE. Companion to hermes/ledger-hr. Bookkeeping. Stale (Sep 10).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/plain-proof-2026-09-10

### `hermes/port-docscleanup-rest`
- Last commit: 9f37af2 — "fix(918): set the 4 new volume fields in the kalshi test fixture" (2026-09-26)
- Inferred purpose: Port/docs-cleanup rest-work — sets 4 new volume fields in the Kalshi test fixture (fix #918). Prediction-market fixture hygiene. Recent (Sep 26).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/port-docscleanup-rest

### `hermes/port-tcv-failclosed`
- Last commit: ddedd09 — "fix(prediction-engine): fail-closed conformal quantile when the rank exceeds n" (2026-09-26)
- Inferred purpose: Prediction-engine safety fix — makes the conformal quantile computation fail closed when rank exceeds n (calibration-uncertainty lane, TCV = temporal cross-validation likely). Recent (Sep 26).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/port-tcv-failclosed

### `hermes/port-verifier-harness`
- Last commit: 982add8 — "fix(factors): judge pre-registration from every ref, not just HEAD" (2026-09-26)
- Inferred purpose: Verifier-harness port — fixes factor pre-registration judging so it evaluates every ref rather than HEAD only. Pre-registration integrity lane. Recent (Sep 26).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/port-verifier-harness

### `hermes/port-xfp-research`
- Last commit: 6f25a22 — "docs(research): port the mimo-xfp pre-registration and its two results" (2026-09-26)
- Inferred purpose: Research port — carries the mimo-xfp pre-registration plus its two results into the repo. Mimo lane research documentation. Recent (Sep 26).
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/port-xfp-research

### `hermes/prop-signals-and-rule-backtests`
- Last commit: acfe75e — "fix(signal-ledger): shard the write so the next run actually resumes" (2026-09-28)
- Inferred purpose: Prop-signals and rule-backtests lane — latest commit fixes the signal-ledger write sharding so backtest runs can resume. Signal-ledger infra for the props backtesting pipeline. Most recent in this chunk (Sep 28); active lane.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/prop-signals-and-rule-backtests

---

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

---

# Branch Atlas — Part 5 (chunk-05)

34 branches, surveyed 2026-10-02 via GitHub API (read-only). All returned successfully.

### `motif/cv-pipeline-2026-09-30`
- Last commit: b3d6d5f — "Fix 2 Codacy findings: Array.fill for bug mask, seeded PRNG for RANSAC sampling" (2026-10-01)
- Inferred purpose: Computer-vision pipeline work for film analysis (RANSAC-based, likely video stabilization or tracking). Touches CV code; latest commit is a static-analysis fix pass. Looks active.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/cv-pipeline-2026-09-30

### `motif/film-calibration-spec-2026-10-01`
- Last commit: 10d8ca4 — "docs(research): film calibration + weight-fitting spec (UNCALIBRATED, no code)" (2026-10-01)
- Inferred purpose: Research-spec branch for calibrating film-derived signals (camera/film calibration, weight-fitting of CV signals into the engine). Docs only, explicitly uncalibrated and code-free; status is a spec draft, not wired.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/film-calibration-spec-2026-10-01

### `motif/film-manifest-2026-10-01`
- Last commit: 5323bd1 — "docs(film): repeatable clip manifest with measured baselines" (2026-10-01)
- Inferred purpose: Film research branch holding a repeatable clip manifest (list of video clips) with measured baselines for CV experiments. Docs/research area; active research support branch.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/film-manifest-2026-10-01

### `motif/film-pilot-2-2026-10-01`
- Last commit: 867af09 — "Film Pilot 2: ORB/RANSAC stabilizer (0.48px residual), motion-aware evaluator, measured report" (2026-10-01)
- Inferred purpose: Film-pilot CV work: ORB/RANSAC video stabilizer achieving 0.48px residual, with a motion-aware evaluator and measured results. Touches CV/film code; experimental pilot, appears complete with measured output.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/film-pilot-2-2026-10-01

### `motif/github-nfl-sweep-2026-09-28`
- Last commit: 7617c9d — "NFL GitHub sweep 2026-09-28: 1000 repos, 5 wiki pages, 29 code-grounded keepers" (2026-09-28)
- Inferred purpose: Research sweep cataloging ~1000 NFL-related GitHub repos, producing 5 wiki pages and 29 code-grounded keepers. Research/docs area; a completed one-day sweep, now historical reference.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/github-nfl-sweep-2026-09-28

### `motif/github-nfl-sweep-deep-dive-2026-09-28`
- Last commit: 6cd7155 — "NFL GitHub sweep deep dive 2026-09-28: completeness audit + 4 teardowns + keeper deep passes + orchestration index" (2026-09-28)
- Inferred purpose: Follow-on deep dive into the NFL GitHub sweep: completeness audit, four repo teardowns, keeper deep passes, orchestration index. Research/docs; completed same-day analysis work.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/github-nfl-sweep-deep-dive-2026-09-28

### `motif/github-secrets-audit-2026-09-27`
- Last commit: 5dc1473 — "docs: GitHub-secrets-lab audit note from IG reel DdweG3txUWI (2026-09-27)" (2026-09-28)
- Inferred purpose: Security-audit note on GitHub secrets (secrets-lab), transcribed from an Instagram reel source. Docs-only; appears to be a one-off research note, likely complete.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/github-secrets-audit-2026-09-27

### `motif/gse-intelligence-build-2026-10-02`
- Last commit: 531b39a — "[hermes-tau-stamp] Stamp the served tau table as a point fit" (2026-10-02)
- Inferred purpose: The GSE intelligence-build program (overnight intelligence wiring run): tau table stamping for the engine's model weights. Touches engine/intelligence code; very active (committed today).
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/gse-intelligence-build-2026-10-02

### `motif/ig-research-2026-09-27`
- Last commit: edf8be0 — "research: IG method batch 2026-09-27 (relateanything, startup programs, pose analysis, football CV)" (2026-09-28)
- Inferred purpose: Research batch from Instagram sources (relateanything, startup programs, pose analysis, football CV methods). Research docs; completed batch, historical.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/ig-research-2026-09-27

### `motif/ig-sweep-2026-10-01`
- Last commit: aa68e31 — "IG sweep 2026-10-01: master intelligence matrix, top-10 kernels, follow list, verified repos/APIs/licenses" (2026-10-01)
- Inferred purpose: Instagram intelligence sweep producing a master intelligence matrix, top-10 method kernels, follow list, and verified repos/APIs/licenses. Research area; a completed sweep, likely feeds the intelligence program.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/ig-sweep-2026-10-01

### `motif/ledger-shadow-2026-10-01`
- Last commit: a7a7cff — "fix(tests): stat-stability player-lab-table Stab count 3->2 (NGS hardening)" (2026-10-01)
- Inferred purpose: Ledger/shadow-mode test fix: adjusts a stat-stability count in player lab tables as part of NGS hardening. Touches tests and NGS-adjacent lab code; small targeted fix, looks done.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/ledger-shadow-2026-10-01

### `motif/madden-stage7-2026-10-01`
- Last commit: 89b4cea — "fix(cv): explicit Obs typing in tests — literal union inference" (2026-10-01)
- Inferred purpose: Stage-7 of a Madden-related (football simulation/video) CV workstream; latest commit is a TypeScript typing fix in CV tests. Touches CV code; narrow fix, likely done.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/madden-stage7-2026-10-01

### `motif/orchestration-2026-09-28`
- Last commit: cccefab — "Orchestration 2026-09-28: salary imports, CLV hunt, NGS feed plan, GPL verdicts, full orchestration + coding-agent briefs" (2026-09-28)
- Inferred purpose: First of a four-version orchestration batch: work coordination covering salary imports, CLV hunt, NGS feed plan, GPL verdicts, plus coding-agent briefs. Planning/docs area; superseded by later v2–v4 versions.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/orchestration-2026-09-28

### `motif/orchestration-v2-2026-09-28`
- Last commit: 2da983f — "Orchestration v2: rankings program, NGS internal-only doctrine, GPL explainer, Odds API backfills" (2026-09-28)
- Inferred purpose: Second orchestration iteration: rankings program, NGS internal-only doctrine, GPL explainer, Odds API backfills. Planning/docs; superseded by v3/v4.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/orchestration-v2-2026-09-28

### `motif/orchestration-v3-2026-09-28`
- Last commit: 5864125 — "orchestration v3: evidence-only briefs, public benchmarks replace head-to-head scoreboard, single coding-agent handoff" (2026-09-28)
- Inferred purpose: Third orchestration iteration: evidence-only briefs, public benchmarks replacing head-to-head scoreboard, single coding-agent handoff. Planning/docs; superseded by v4.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/orchestration-v3-2026-09-28

### `motif/orchestration-v4-2026-09-28`
- Last commit: 84d4250 — "[hermes-surf-12/13] record the PR #946 merge (ccda82c5b) in both rows" (2026-09-29)
- Inferred purpose: Latest orchestration version: bookkeeping update recording a PR #946 merge across rows. Planning/docs; final version of the 2026-09-28 orchestration batch, appears landed/recorded.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/orchestration-v4-2026-09-28

### `motif/pickem-intake-audit-2026-09-25`
- Last commit: 143f98a — "audit: re-verify pickem intakes live, fix action-network schema drift, add recon addendum (drafters parked)" (2026-09-25)
- Inferred purpose: Audit of the pick'em intake lane: live re-verification, fixing Action Network schema drift, recon addendum. Touches intake/audit code and docs; completed audit, drafters parked.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/pickem-intake-audit-2026-09-25

### `motif/replay-pilot-2026-10-01`
- Last commit: 7314d1e — "docs: film pilot 1 — add 10fps sample-rate finding" (2026-10-01)
- Inferred purpose: First film/replay pilot: documents a 10fps sample-rate finding for replay/film CV work. Docs-only; small measured finding, likely complete.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/replay-pilot-2026-10-01

### `motif/repo-bucket-reorg-2026-09-27`
- Last commit: b3c0ea0 — "reorg: record 2026-09-17 README redistribution in MOVED.md" (2026-09-27)
- Inferred purpose: Repo bucket reorganization: records a README redistribution in MOVED.md. Repo hygiene/docs; one-off record-keeping, done.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/repo-bucket-reorg-2026-09-27

### `motif/rescue-883-calib-clv`
- Last commit: 254014c — "rescue: rebase and repair Mimo calibration CLV work" (2026-09-26)
- Inferred purpose: Rescue of orphaned Mimo work: rebase and repair of calibration CLV (closing-line-value) work. Touches calibration/CLV engine code; completed rescue.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/rescue-883-calib-clv

### `motif/rescue-salvage-tier-a`
- Last commit: f1ececd — "rescue: port Tier A orphan salvage from mimo/salvage-tiera-2026-09-21" (2026-09-26)
- Inferred purpose: Rescue of Tier A orphan salvage work from a Mimo branch (salvage-tiera-2026-09-21), ported into the Sports repo. Port/salvage work; completed.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/rescue-salvage-tier-a

### `motif/space-v2-tracking-2026-10-01`
- Last commit: e0fa842 — "feat(space): v2 pipeline — ORB stabilization + BoT-SORT persistent tracking (Pilot 2 wired in)" (2026-10-01)
- Inferred purpose: v2 of the film-space pipeline: ORB stabilization plus BoT-SORT persistent tracking, with Film Pilot 2 wired in. Touches CV/tracking code; active feature work.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/space-v2-tracking-2026-10-01

### `motif/total-signal-wiring-2026-09-27`
- Last commit: b031328 — "spec: total-signal wiring — every signal in, adjustments logged, build order" (2026-09-27)
- Inferred purpose: Spec for the total-signal wiring program: every signal ingested, adjustments logged, build order defined. Spec/docs; part of the standing wiring program, referenced by follow-on inventory work.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/total-signal-wiring-2026-09-27

### `motif/watch-loop-2026-10-01`
- Last commit: 0b3c608 — "fix(watch): default watchSpaceUrl to production Space when env var unset; fix stale ZeroGPU comment" (2026-10-01)
- Inferred purpose: Watch-loop fix: defaults the watch Space URL to production when env var is unset, plus a stale ZeroGPU comment fix. Touches watch-pipeline config; small fix, likely done.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/watch-loop-2026-10-01

### `motif/watch-space-auth-2026-10-01`
- Last commit: a7ab04b — "Secure the watch pipeline: Bearer <redacted> on the Space /process-frame + watcher token wiring" (2026-10-01)
- Inferred purpose: Secures the watch pipeline: Bearer <redacted> on the HuggingFace Space /process-frame endpoint plus watcher token wiring. Touches watch-pipeline auth; security hardening, appears landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/watch-space-auth-2026-10-01

### `motif/watcher-space-auth-2026-10-01`
- Last commit: 7644793 — "feat(watcher): Bearer <redacted> auth for HF space /process-frame (fail-closed, 401/200 proven)" (2026-10-01)
- Inferred purpose: Watcher-side auth feature: Bearer <redacted> auth for the HF Space /process-frame endpoint, fail-closed, with 401/200 proven. Sibling to the watch-space-auth branch (watcher vs watch halves); appears landed/proven.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/watcher-space-auth-2026-10-01

### `motif/wiring-plans-2026-09-22`
- Last commit: 4dc8c0a — "week3: multi-episode transcript intake (full docx read) + pool notes" (2026-09-25)
- Inferred purpose: Wiring-plans research lane: week-3 intake of multi-episode transcripts (full docx read) plus pool notes. Docs/research; one intake commit, quiet since — likely superseded by the broader wiring lanes.
- Open in browser: https://github.dev/Beexly/Sports/tree/motif/wiring-plans-2026-09-22

### `overnight/2026-08-20-mlb-nfl`
- Last commit: 3fa4d9d — "[hermes-C-65] ledger DONE for spec-mismatch audit" (2026-08-20)
- Inferred purpose: Overnight Hermes run (2026-08-20, MLB+NFL): ledger marked DONE for a spec-mismatch audit. Agent-bus/ledger bookkeeping; old completed run, stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/overnight/2026-08-20-mlb-nfl

### `rescue/intelligence-core-2026-06-28`
- Last commit: 33251c8 — "fix(engine): conformal correction, backtest driver, and VERIFY gate" (2026-06-29)
- Inferred purpose: Old rescue of engine intelligence core: conformal correction, backtest driver, and a VERIFY gate. Touches core engine code; very old (June), stale/completed.
- Open in browser: https://github.dev/Beexly/Sports/tree/rescue/intelligence-core-2026-06-28

### `research/firecrawl-evidence-spine-wiring`
- Last commit: ed28660 — "fix: expected-metrics adapter signatures + reasoning-surface AdapterResult import" (2026-09-25)
- Inferred purpose: Research branch wiring Firecrawl evidence-spine into the engine: expected-metrics adapter signature fixes and reasoning-surface AdapterResult import. Touches adapter/engine code; fix pass, likely experimental.
- Open in browser: https://github.dev/Beexly/Sports/tree/research/firecrawl-evidence-spine-wiring

### `research/galaxy-genesis-metacortex-2026-07-17`
- Last commit: 14c7432 — "test(genesis): make launch package validation structural and non-brittle" (2026-07-18)
- Inferred purpose: Galaxy-genesis metacortex research: makes launch-package validation structural and non-brittle. Touches genesis/metacortex launch code; old (July), stale/experimental.
- Open in browser: https://github.dev/Beexly/Sports/tree/research/galaxy-genesis-metacortex-2026-07-17

### `research/proven-edge`
- Last commit: 8abd929 — "docs(master): §19 — the Frontier Institution (Meaning Compiler · Public Observer Ledger · Data Genesis Engine)" (2026-06-26)
- Inferred purpose: Proven-edge master-docs branch: §19 on the "Frontier Institution" (Meaning Compiler, Public Observer Ledger, Data Genesis Engine). Master docs; old (June), philosophical/ledger-oriented, stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/research/proven-edge

### `research/total-signal-inventory-2026-09-30`
- Last commit: be54387 — "[hermes-signal-inv-0] handoff + ledger row SIGINV-0" (2026-09-30)
- Inferred purpose: Total-signal inventory handoff (Hermes): ledger row SIGINV-0 for the signal inventory. Research/ledger area; first of a series, likely ongoing with the wiring program.
- Open in browser: https://github.dev/Beexly/Sports/tree/research/total-signal-inventory-2026-09-30

### `sonnet/hermes-ox-alpha-model-choice`
- Last commit: 6fc99c6 — "docs(hermes): add Ox Alpha (OpenRouter stealth model) as the new primary launch option" (2026-08-22)
- Inferred purpose: Hermes docs branch: adds the Ox Alpha (OpenRouter stealth model) as the new primary launch option. Docs/model-choice area; old (August), stale/one-off.
- Open in browser: https://github.dev/Beexly/Sports/tree/sonnet/hermes-ox-alpha-model-choice

