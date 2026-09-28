# Coding-Agent Briefs — GSE data + engine build-out (2026-09-28)

Minimal, non-restrictive briefs per Garrett's rule: the repository's own rules govern. Each brief points at the implementation-ready research doc; the agent reads it and builds. Full orchestration: `full-orchestration.md`. Landing policy: clean feature branches, file-scoped pushes via the Git Database API, PRs where review fits, verify via API, CI green. Never copy code from no-license/GPL/AGPL sources (see `gpl-verdicts.md`).

## A. DFS slate provider wiring
**Research:** `salary-import-lanes.md`. **Gated on:** Garrett's decision #2 (DK path vs standing rule).
Build the `DfsPlayer` adapter for the registered live provider: slate discovery (draftGroupId), TLS-impersonated fetch of the draftables endpoint, mapping to `apps/web/lib/fantasy/dfs-slate.ts` (dedup FLEX rows on `playerId`, opponent from `competitions[]`, exclusion flags from status fields), hourly refresh through lock, snapshot `{draftGroupId, fetchedAt, lockTime}`, registration via `registerDfsSlateProvider` behind the founder gate + `DFS_PROVIDER` env. Projections/ownership merge downstream — the adapter emits salary/status/team/game only. If the rule stands: retarget the same adapter shape at the contracted feed; keep the DK path as a research-only snapshot tool. Acceptance: `activeDfsSlate()` returns the live pool on a real slate; FLEX dedup covered by a test; no plain-`fetch` path (must survive Akamai).

## B. CLV intake repair + backfill
**Research:** `clv-hunt-report.md`. **Gated on:** Garrett's legal read (#4) for the OddsPapi backfill; his spend word for any cadence upgrade.
Verify `LINE_ARCHIVE_ENABLED=true` in prod; wire `apps/web/lib/ops/odds-line-archive-freshness.ts` to a live alert channel; fix/re-verify the 8/22 → mid-Sept snapshot-writer regression; run `fetchPinnacleLineMovement` to backfill the gap (NFL sportId 14) into `odds_line_snapshots` with phase tagging (last pre-kickoff per market/book/side = CLOSE, idempotent). Keep per-book closes (never consensus-only) and the `sharpSplitSourced` honesty gate. Acceptance: zero missing CLOSE days going forward; gap backfilled; per-pick `clvValue` grades recompute.

## C. Adjustment layer v1 + player signals
**Research:** `docs/research/2026-09-27/total-signal-wiring-spec.md` (branch `motif/total-signal-wiring-2026-09-27`). **Gated on:** Phase 1 projection-source lock.
Implement the injury/depth-chart adjustment layer v1 per the spec's taxonomy; populate the empty `player_signals` table; every rule in TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG form. Acceptance: each rule has a backtest before it ships (standing order); magnitudes recorded as calibration tasks, not hardcoded certainties.

## D. NGS feed creation M0–M4
**Research:** `ngs-feed-creation-plan.md`. **Gated on:** Garrett's ToS call for the scrape lane; his spend word for M6; NFL+ token if the probe is dead.
M0 intake skeleton (lake layout, raw-first contract, env-tuned pacing) → M1 bootstrap corpus (asonty TSVs normalized to the target schema, dead-time trimmed, playDirection canonicalized, provenance manifest) → M2 physics baseline on real data beating naive → M3 scrape probe (build only if live; NFL Pro fallback is spec'd, never credential-handled) → M4 loader passing `test_loader_schema`/`test_causality`/`test_canonicalization`/`test_flip_involution`. M5 stays gated (counsel/licensed input); M6 ships stubbed/disabled. Acceptance: every milestone's gate is green and file-verifiable; the 12 data-QC rules are added to the repo's rule docs.

## E. Movement-lane training
**Research:** `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md`. **Gated on:** D's M2/M4.
Phase 0 physics baseline on real data → Phase 1 single relational model beating baseline RMSE by ≥ 10% on game-level held-out blocks → Phase 3 ensemble + TTA. Calibration gates (ECE < 0.15 yd, coverage ± 5 pp) are the last door before the engine consumes uncertainty. Acceptance: `test_no_teleport`, `test_speed_cap`, `test_permutation_invariance`, `test_determinism` all green; target beat 0.540 on held-out games; no BDB data in training (license unresolved).

## F. GPL-clean reimplementations + attributions
**Research:** `gpl-verdicts.md`.
Create/extend `docs/ATTRIBUTIONS.md` with the nflverse CC-BY-4.0 format; extract DynastyProcess ECR/ADP/player-ID facts into our own schema (never vendor their files); write an independent PFR snap-count scraper from nflverse-data output schemas; clean-room headers on every ingestion module (source, license, facts-vs-method, "independently implemented"). If `espn-fantasy-football-api` is adopted: `npm install`, unmodified dep only. Acceptance: no GPL/AGPL-licensed file in the tree; every external-data module carries a provenance header; attribution renders on public data surfaces.

## G. Benchmarks + weak-signal registry + confidence gate
**Research:** pydfs teardown (claimed on the unverifiable sweep branch — treat method claims as pointers and re-verify from the MIT-licensed source, which permits it); `salary-import-lanes.md` §3 for importer column shapes.
Benchmark pydfs (MILP/CBC, iterative re-solve) vs GSE `apps/web/lib/fantasy/` (branch-and-bound, k-best, diversePool) on the same live slate: solve quality + pool metrics; port candidates per the teardown (objective-noise diversification, hard ownership caps, min-salary rule). Adopt the `nfl_py3` weak-signal registry schema (MIT) for the total-signal rule store; drop the `nflalgorithm` confidence-engine tiers onto the 9.2 Hold posting gate; implement the nfl-edge-finder CRN shared-draws discipline (method only) in payout-sim/parlay pricing. Acceptance: benchmark numbers file-verifiable; every ported idea attributed in the file header with its license.

## Standing rules for all briefs
Repo rules (AGENTS.md, CONTRIBUTING.md, SECURITY.md) govern. Tests for everything new; CI green before done. No raw secrets in code, logs, or docs. Methods only from no-license/GPL/AGPL sources — independent reimplementation, never copied or line-by-line translated code. Nothing posts to @GalaxySportsHQ, no money touched, no accounts created, no spending — without Garrett's explicit word. Land on the remote: clean branches, file-scoped Git Database API pushes, PRs where review fits, verify via API.
