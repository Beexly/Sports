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
