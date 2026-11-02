# HANDOFF

Dated entries only. Each entry carries what changed, what was proven, what was not, and what the
next role must do. ---

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
