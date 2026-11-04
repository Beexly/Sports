# HANDOFF

Dated entries only. Each entry carries what changed, what was proven, what was not, and what the
next role must do. ---

## 2026-11-03 — GPP conservation coupling, no MNF

**Changed:** `scripts/ops/pbp_conservation_coupling.py` is now what `run_full_dk_bitemporal_gpp.py` calls. Conserved PBP yards are no longer rescaled onto the static mean. A missed JEV call returns `DEGRADED_UNVERIFIED` / `PASS_FRAGILE` instead of `LOCK_TOURNAMENT_ALPHA` and 0.86. Showdown salary floor is clamped to $48,000. ESPN Week 8 finals are in `data/engine/espn_week8_finals_2026-11-02.json`.

**Proven:** `python -m pytest tests/test_pbp_conservation_coupling.py -q` — 5 passed. Ja'Marr Chase receiving line in that ESPN extract is 11/141/1, 34.1 classic DK points. Zay Flowers is 0/0/0.

**Not proven:** The TypeScript vitest timeout and feed-dirtying fix are still an open lane in this worktree. Do not treat those dirty files as mine. MNF was not run. The ESPN file is skill-category classic scoring only; it does not include fumbles or DST, so it is not an official DK contest score.

**Next role:** Do not start CHI @ SEA until the remaining engine suite is green. Leave `packages/prediction-engine` and `packages/ingestion-pipeline/src/process-sport.ts` to the lane already editing them.

---

## 2026-11-02 — Week 8 forensic kernels on hermes/week8-forensic-tracks-1-3

**Changed:** Empirical-Bayes shrink, ownership penalty, inactive hard-zero, and single-pass injury stamp are called from the DK slate builder and injury overlay. PBP receiving yards are allocated by share instead of a post-sim lognormal draw. Cognitive router clamps quarantined equations to zero log-odds. Gate override requires a verified line or roster delta. `gpp_architecture.py` now lives at `intelligence/dfs/gpp_architecture.py` (same bytes as the Downloads copy). The DK optimizer no longer imports it from `C:/c/wt-sports`.

**Proven:** pytest tests/test_trench_pocket_physics.py tests/test_week8_post_slate_fixes.py tests/test_trench_pipeline_integration.py tests/test_mind_guardian.py — 14 passed. npm test --prefix packages/mcp-equations-server — 60 passed, then the quarantine clamp test passed (11/11 on the router file). FWL residualization and calibration-map tests passed.

**Not proven:** npm test --prefix packages/prediction-engine did not finish. Two runs hit the tool timeout while still passing the tests they had reached. The in-loop rng.normal yardage draw in gse_coach_mind_simulator.py is still there. trainer_feed.jsonl is gitignored, so CI will not see that copy.

**Next role:** Finish the prediction-engine suite, or accept the timeout as a pre-existing duration problem. Do not treat this branch as a published pick path.

---

## 2026-11-01 — Cadence v4.0 T-90 game-day lock refresh (SUN_EARLY + SUN_LATE)

**Changed:** `scripts/ops/run_cadence_v40_gameday_lock.py` — repaired the summary print that crashed the run *after* its report was already written. The print read `surprise_flips_vs_stored`, a key `availability_refresh` stopped emitting when the diff split into `stored_names_absent_from_refresh` + `newly_listed_not_in_stored_subset`. The script was untracked; it is now tracked so the runner is not a local-only file. Landed both W8 reports: `docs/predictions/research/2026-11-01/cadence_v40_gameday_lock_sun_early_w8.json` (10:30 CT) and `..._sun_late_w8.json` (13:35 CT).

**Proven:** Re-run of the fixed script exits 0 and prints `T-90 refresh: 21 designations applied across 3 games, 0 fetch errors, 11 stored names absent from refresh, 17 newly listed`. Seal unchanged — merkle `23245bcbba04f147…`, tau 0.42, all four lineage checks true; no `seal()` call exists in the file. Conformal diagnostic n=14, band ±3.2423, coverage 1.0, 0 flagged. SUN_LATE polled 3 games (LAC@LAR, KC@DEN, NE@MIA) at HTTP 200 with 0 fetch errors. The one in-slot "absent" name is RJ Harvey (DEN), who moved from the Friday game-designation `Out` to ESPN roster status `Injured Reserve` — still unavailable, so not a flip toward active. Locked-card team labels match the live ESPN blocks; the 2026 dataset simply carries different rosters than 2024 reality, so no parsing corruption.

**Not proven:** The conformal band is degenerate by construction — qLevel saturates at 1.0 for n≤18 at alpha=0.1, so the band equals max|residual| and zero flags is mathematically forced. Coverage 1.0 is NOT evidence of calibration. Also unproven: that "11 stored names absent from refresh" means anything slate-wide — 10 of the 11 play in games this slot never polled; the stored snapshot is slate-wide while the refresh is slot-scoped, so the headline count is a scope artifact.

**Next role (Owner):** Review and push — the commit is local per Law 1. Consider making the diff like-for-like (slot-scoped stored vs slot-scoped refresh) so the absent-names count stops reading as a slate-wide status change. Note the DoD gate's handoff check keys on UTC `new Date()`, so every commit day needs an entry here or the hook blocks.

---

## 2026-10-31 — finished Carolina at Green Bay pack taken off sale

**Changed:** apps/web/lib/packages/catalog.ts sets forSale false on tnf-all-in-pack. Checkout throws. The pack page shows the final score and no buy button.

**Proven:** ESPN event 401873023 is final, Green Bay 27, Carolina 19, kickoff 2026-10-30T00:15Z.

**Not proven:** The public URL will not change until this reaches main.

**Next:** Re-fetch https://www.galaxysportsedge.com/packages/tnf-all-in-pack and confirm the buy button is gone.


## 2026-10-28 / 2026-10-29 (UTC) — Master Corpus, Coach-Scheme-Player-Fit Engine & Commercial Package Builder

**Changed:**
- `packages/prediction-engine/src/coach-sim/coach-scheme-player-fit-engine.ts` (+ `.test.ts`)
- `packages/prediction-engine/src/coach-sim/index.ts`, `src/engine/coach-projection.ts`, `src/reasoning/arxiv-reasoning-bridge.ts` (+ `.test.ts`), `src/decision/2001-09097v1-gap-stat-ratings.ts` (`ENABLED = true`)
- Resolved all 38 TypeScript errors across 11 files in `packages/prediction-engine/src/` and all 5 dead threshold exports flagged by `reconciliation/_audit_unenforced_thresholds.mjs`.
- `scripts/ops/harvest_openalex_arxiv_master.py`, `scripts/ingest-hf-and-kaggle-nfl-corpus.py`, `scripts/build-gse-coach-brain-sft-corpus.py`, `scripts/compile-coach-brain-corpus.py`, `scripts/train-coach-brain-lora.py`, `scripts/generate-commercial-packages.ts`, `scripts/guardrails/agent-bus-sync.mjs`.
- Added mind feeds under `brain/feeds/2026-10-28/` (`hf_ultrascale_playbook_feed.jsonl` [50], `openalex_arxiv_nfl_coaching_scheme_fit_feed.jsonl` [761], `kaggle_20_kernels_bdb_physics_feed.jsonl` [31], `hf_34_datasets_empirical_feed.jsonl` [34]) and compiled `data/llm/gse-coach-brain-v1-sft.jsonl` (`6,469` records).

**Proven:**
- `npx tsc --noEmit` in `packages/prediction-engine` exits 0 (`0` errors).
- `node reconciliation/_audit_unenforced_thresholds.mjs` exits 0 (`T12 GATE PASS`).
- `python scripts/ingest-hf-and-kaggle-nfl-corpus.py --verify-firewall --assert-perturbation` exits 0 (`20` Zone 1/2 files with `0` market columns; `3,078` pre-cutoff and `272` holdout games bitwise invariant).
- `python scripts/verify-corpus-count.py` exits 0 (`2,446` canonical papers preserved).
- All 4 commercial packages generated deterministically in `data/packages/2026-10-28-commercial-packages.json`.

**Not proven:**
- Live GPU execution of `train-coach-brain-lora.py` on the expanded `6,146`-record train split (verified via `--dry_run` and Ultra-Scale Playbook VRAM accounting `33.498 GB`).

**Next role (Trainer / Verifier):**
- Run full LoRA fine-tuning on `data/coach-brain/coach-brain-train.jsonl` (`6,146` records) and grade Sunday Week 8 post-game residuals.

---

## 2026-10-28 — Verifier

**Changed:** nothing (verification role). Read `engine-reasoning-audit-2026-10-28.md`.

**Proven:** the coach lock is odds-free by type (`CoachLockPacket` has no odds field) and
`readCoachLock` is the first statement of `scoreSpreadPick`. The simulation runs through
`coach-projection → coach-sim → locked-projection → simulateCoachGame`. All six factor builders are
invoked once each. Measured: `coachSupport` −5.0 → shift −0.75 against a stub of 3 →
`coachOverridesStub: false`.

**Not proven:** that the projection is accurate for any team — it is not, because `pointLocation`
takes only `coachSupport` and `injuryDropOff`.

**Next role (Builder):** feed `pointLocation` from 2026 pbp team EPA and pace so margin and total
start from the matchup instead of the constants 3 and 46.5.

---

## 2026-10-28 — Librarian

**Changed:** `docs/strategy/ORG.md`, `docs/strategy/engine-reasoning-audit-2026-10-28.md`,
`scripts/guardrails/definition-of-done.mjs`, this file.

**Proven:** the DoD gate runs and reports four conditions; `--check` mode never fails.

**Not proven:** that the roles are adopted. That is a habit, not a file.

**Next role (any):** take one role, not two. Hand off with all four fields.

## 2026-11-01 — CI tree repair: guardrail compliance + typecheck wall

**Changed:** 46 files across `apps/web`, `packages/ingestion-pipeline`, `packages/prediction-engine`, `packages/types`, `packages/mcp-equations-server`. Trust-gate copy fixes (70 hits -> 0), em-dash scan fixes, ingestion-pipeline tsconfig/vitest alias repair, `extractRankingP` in `@sports/types`, `AciState.gamma` in `temporal-conformal.ts`, `BEAT_CLOSE` verdict literal in `evidence-producers.ts`, `PrincipleApplicationAuditRecord` fields in `live-engine-proof.test.ts`, Zod v4 fixes in `labeling.ts` / `waitlist-validation.ts`, `confidence` projection in `settle-picks/route.ts`.

**Proven:** `apps/web` tsc exit 0; `packages/prediction-engine` tsc exit 0; `packages/ingestion-pipeline` tsc exit 0; `packages/types` vitest 123/123; `packages/mcp-equations-server` vitest 60/60; `packages/ingestion-pipeline` vitest suite exit 0; `live-engine-proof.test.ts` pass; guardrails 30/31 (only `dependency-audit` founder-waiver stale).

**Not proven:** CI on the pushed branch; the PR merge.

**Next role (Verifier):** push `ci/fix-tree-red-2026-10-31`, open the PR, watch CI, merge on green. Re-run `npm run guardrails` after merge to confirm 31/31.

## 2026-11-02 — CI tree repair: coach-sim memo, publishing mint, last red lanes

**Changed:**
- `packages/prediction-engine/src/coach-sim/locked-projection.ts` — added `simulateCoachGameMemo`, keyed on canonical JSON of the FULL sim input (`seedFor` omits `belichickHome/Away`, `staffAggressionAway`, `forceApplyCells`, so a seed key could serve a projection built from different inputs). `scoreGame` reads the coach lock three times per game and each read forced two 10k-game Monte Carlo draws.
- `packages/ingestion-pipeline/src/process-sport.ts` — a publishing mint now OMITS `isPublished` (schema default `true` applies); only an explicit gate veto (`canExposePublicPicks === false`) writes `false`. The prior conditional treated an undefined gate as a veto.
- Test repairs: `markov-simulator.test.ts` converted to vitest with URL-relative fixture paths (it was `node:test` inside a vitest glob and doubled the package dir); `model-registry.generated.ts` regenerated for 200 modules and 5 sibling tests written instead of raising the coverage baseline; `_mutation_sweep_r5_r10.mjs` R7 fragment re-anchored to the guard statement; `walk-forward-emission-gate.t15.test.ts` on-disk CRPS assertions updated.

**Proven:**
- `packages/prediction-engine`: 1124 test files passed / 2 skipped, 9474 tests passed / 5 skipped, 407s total. `scoreGame` 5.9s → 465ms cold, 0.7ms warm.
- `packages/ingestion-pipeline`: 108 test files passed / 1 skipped, 1579 tests passed / 6 skipped. `process-sport.test.ts` 87/87; `walk-forward-emission-gate.t15.test.ts` 27/27.
- `npx tsc --noEmit` exit 0 in both packages; repo `npm run lint` exit 0.
- `Pick.isPublished` is `Boolean @default(true)` (schema.prisma line 550, inside `model Pick` 516–610) — omitting the flag publishes, so the change cannot mass-unpublish.
- `ReadinessGates.canExposePublicPicks` is a required `boolean`, constructed at one site (`readiness.ts:134` from `config.publicPicksEnabled`); `undefined` occurs only in the test's `as unknown as` fixture, so production row outcome is identical either way.

**Not proven:**
- Not yet observed against a live database: the equivalence claim is read from the Prisma default and the single gate construction site, not from a production write.
- No CI run on the pushed branch yet.
- `data/decision-time-prices/2026-11-02.jsonl` (generated by the live-proof script during the test run) is left untracked and NOT committed — deliberate, it is test-run output rather than pipeline data.

**Observation (pre-existing, not introduced here):** `platform-config.ts:166` defaults `PUBLIC_PICKS_ENABLED` to `false` via `parseBool(env, false)`. An environment that loses that variable mints every pick unpublished rather than failing closed loudly. Worth a deploy-time assertion, separate from this branch.

**Next role (Verifier):**
- Push `ci/fix-tree-red-2026-10-31`, refresh PR #1228, and watch the CI test step now that the suite fits its cap.
- After deploy, compare published-pick counts for one refresh cycle against the prior cycle to confirm the omitted-flag change did not reduce the published set.

## 2026-11-03 — merge resolution: origin/main into ci/fix-tree-red-2026-10-31

**Changed:**
- Merge of `origin/main` resolved (was left uncommitted mid-merge). Conflicts were non-textual: main's week8-gameday catalog dropped `redzone-dfs-pro-pack` and its tests were stale in four places.
- `apps/web/lib/packages/catalog.ts` — restored the `redzone-dfs-pro-pack` entry (5 slugs again) and kept main's DFS-inclusive `tnf-all-in-pack`.
- `apps/web/__tests__/wagertalk-storefront-checkout.test.ts` — metadata key `guaranteedCreditBack` → `creditBack` (the branch rename `0e411ac0b` had already changed the builder; the assertion was left behind) and `tnf-all-in-pack` expected `includesDfs: true`.
- `apps/web/__tests__/packages-storefront.test.ts` — same metadata key + error-message regex (`does not offer a credit-back tier`).
- `apps/web/__tests__/fantasy-ia.test.tsx` — DFS package list now includes `redzone-dfs-pro-pack`.
- `apps/web/__tests__/coach-writeup-engine.test.ts` — `postedTotal` 47.5 → 46.5 and PLAY count 5-6 → 1 (main's `7ad2fc017` deliberately flipped the finished CAR@GB pack to PASS).
- `scripts/guardrails/node-version-parity.mjs` — `fileURLToPath` comparison (the guard silently no-opped on Windows) + `packages/polymarket-sdks/` exemption.

**Proven:**
- `apps/web` tsc exit 0 (0 errors); `eslint .` exit 0.
- 5 affected test files / 15 tests pass: packages-storefront 4/4, wagertalk 3/3, fantasy-ia 2/2 (x2 copies), coach-writeup 4/4.
- `node scripts/guardrails/node-version-parity.mjs` prints `OK — 17 workflow pin(s) agree on Node 20; scanned 4255 file(s)`, exit 0 — a REAL scan, not the previous silent no-op.
- `trust-gate` OK — scanned 4401 files, no banned phrases.
- `npm run guardrails` 30/31; the only failure is `dependency-audit` (pre-existing environmental: npm 12 rejects the `.npmrc` script gate; recorded as a founder-only stale waiver in AGENTS.md).

**Not proven:**
- No CI run on the pushed merge commit yet.
- `dependency-audit` cannot run in this environment; not fixed (founder-owned config).

**Next role (Verifier):** push the merge commit on `ci/fix-tree-red-2026-10-31`, refresh PR #1228, confirm CI's lint/typecheck/test steps now pass.

## 2026-11-03 (2) — test wall triage: /picks + /packages clusters rewritten to the sealed-board design; em/en-dash debt cleared

**Changed:**
- 8 /picks test files rewritten or surgically retired to the owner's sealed Week 8 locked board design (`30a6fe52f`): picks-paywall-copy-truth (ledger-provenance banner pin added; teaser-model assertions retired), picks-page-policy-gate, picks-states-conversion, picks-demo-mode, picks-gate-hint-containment, picks-daily-limit-meta, picks-mobile-tap-targets; plus `apps/web/app/picks/page.tsx` (both footer links gain the `inline-flex min-h-11 items-center` 44px tap floor).
- `apps/web/__tests__/no-fake-percentages.test.ts`: outcome-context regex narrowed so the brand name (Sports Edge) stops false-positiveing beside the sealed banner percentage; a real edge claim still trips.
- `apps/web/__tests__/packages-storefront-paywall.test.tsx`: pins updated to the current storefront copy (`What's inside` checklist, `Unlock Picks Now · $19`); unlocked-card badge counts now derived from the writeup data (`BET THIS` / `PASS · NO BET` counts must equal the decision counts); PicksPage removed from the Under Construction gate list (deliberately un-gated by `30a6fe52f`) with a sealed-board check added; hero copy pin moved to the `Choose Your Football Pack` chooser.
- `apps/web/__tests__/em-dash-public-copy.test.ts`: ratchet lowered (board 1->0, fantasy 4->0, games/[gameId] 1->0; entries deleted) and seven files cleaned to zero em/en dashes in public copy: `app/packages/page.tsx`, `app/packages/[slug]/page.tsx`, `app/props/page.tsx`, `app/resources/card-supplies/page.tsx`, `components/packages/paywall-reveal-card.tsx`, `components/redline/redline-world.tsx`, `components/week8/sealed-table.tsx`. Replacement follows the `6862589f6` convention (em dash -> middle dot, ranges -> hyphen, prose joins -> comma).

**Proven (worktree `C:\c\wt-tree-red`, branch `ci/test-wall-triage-2026-11-03`, base `eac0ecdba`):**
- All 11 rewritten/retired test files pass: the 7 picks files, no-fake-percentages, em-dash-public-copy, packages-storefront-paywall (both copies).
- No regressions in the 14-file readers-of-/picks sweep: the 10 pre-existing wall failures keep identical counts (23 tests); the 4 baseline-green files stay green.
- `apps/web` `tsc --noEmit` exit 0; `node scripts/guardrails/em-dash-scan.mjs` OK, 0 hits.
- Commits: `9eeed2767` (picks cluster), `0527649f4` (packages + copy cluster).

**Not proven:**
- No CI run on the branch yet at write time.
- The rest of the wall (~71 apps/web files + 7 other-workspace files) is untouched: homepage cluster (stale against RedlineWorld), board/nav/pricing clusters, and the logic/runtime files that need individual inspection for real regressions.

**Next role (Verifier / next loop):**
- Watch CI on the pushed branch; merge when the reduced wall is confirmed (no new failures vs `eac0ecdba`).
- Next triage batches in order: (a) homepage cluster (homepage-content, homepage-doctrine-hero, homepage-engine-centerpiece, homepage-finish-doctrine, homepage-suspense-nflverse, home-signal-anatomy, f28-home-hero-cta, decision-hero-states, storefront-stripdown); (b) board cluster (board-picks-route-equivalence, board-class-banner-honesty, central-time-rendering, kickoff-local-time, honest-degraded-states, freshness-coverage, sample-mode-ui); (c) logic/runtime cluster (dfs-optimizer-optimality, bestball, dfs-correlation, scheme, news/impact, wire-store, mission-control, do-calculus-verifiers, gate-registry.t24, literature-and-bow-arc, public-picks-enabled-readers, module-header-accuracy, periodic-timeseries-id, continuous-reconciliation-daemon); (d) pricing/nav clusters.

---

## 2026-11-04 — Corpus / Overnight Harvest

**Changed:** `scripts/research/harvest_overnight_500.py`, `extract_corpus_text.py`,
`repair_and_extract.py`, `intelligence/research/corpus_retriever.py`,
`scripts/ops/build_corpus_index.py`, `tests/test_corpus_retriever.py`,
`intelligence/corpus/corpus_index_stats.json`, this file.

**Proven:** 552 new PDFs downloaded against a 500 target, 1,117 unique on Drive after
content-hash dedupe (115 arXiv/OpenAlex duplicates removed by md5). Corpus index rebuilt to
2,226 deduped records with 1,143 carrying full text (was 249). 25 tests pass against the real
manifest, exit 0. Two genuine defects found and fixed: `pdf_path` stored as MSYS `\c\Users\...`
(400 records, unopenable by `Path`) and filename-scheme drift (276 relinked by source_id stem).

**Not proven:** that the expanded corpus improves any pick. Every record is `UNVALIDATED`
against GSE data and the reasoning engine reads neither `corpus_hits` nor `tool_backend` —
both remain dead fields (`CORPUS-WIRING-STATUS.md`). Kaggle was not harvested: no
`~/.kaggle/kaggle.json`, reported BLOCKED rather than faked. Gmail/Google Docs are not
connected in this profile, so those sources were not scanned.

**Next role (Builder):** add a gate check in `intelligence/reasoning/` that refuses a
`gate_status != VALIDATED` record from becoming load-bearing, then wire `tool_backend` into
the specialists. Without the gate first, wiring is unsafe by construction.
