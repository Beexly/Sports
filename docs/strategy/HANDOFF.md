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

## 2026-11-04 — test wall triage: homepage cluster (9 files) rewritten to the RedlineWorld design; front-door trust surfaces restored

**Changed:**
- `apps/web/app/page.tsx`: the front door is now the field plus a responsible close (`id="responsible-close"`, `data-testid="homepage-responsible-close"`, `RiskDisclosure variant="card" includePastPerformance`, links to /methodology, /responsible-play, /how-we-make-money, /accountability, /pricing) and `<Footer />`. The Oct 31 rebuild had shipped the world alone: no disclosure, no footer, no route to the trust surfaces.
- `apps/web/components/redline/redline-world.tsx`: the wheel releases at both journey ends so the close band and footer are reachable by ordinary scroll; the header gains a RESPONSIBLE PLAY anchor; the retracted `VERIFIED RECORD: 31-11 (+18.56u)` becomes `OFFICIAL CARD: 14-6-1 (+7.19u)`; the slate panel eyebrow `31-11-0 (+18.56u)` becomes `LOCKED`.
- `apps/web/lib/packages/catalog.ts`: the purged `47-16 (+29.01u)` phantom record is removed from 3 pack descriptions (rendered on the homepage pack panel, /packages/[slug], and the paywall cards) and 7 `verifiedRecordBanner` values; they now carry the ledger `verified_record` `36-13-1 (+20.14u)`.
- `apps/web/lib/week8/sealed-board.json` `official_ledger`: `31-11-0` -> `36-13-1 (+20.14u)`, `tonight_result` `15-6-0 (+8.11u)` -> `14-6-1 (+7.19u)`, retraction note added.
- `apps/web/app/calibration/page.tsx`: eyebrow tracking matches the shared evidence-header rhythm (`tracking-[0.22em]`).
- Nine test files rewritten to the RedlineWorld contract: homepage-content, homepage-doctrine-hero, homepage-engine-centerpiece, homepage-finish-doctrine, homepage-suspense-nflverse, home-signal-anatomy, f28-home-hero-cta, decision-hero-states, storefront-stripdown. Every prohibition carried over; each repointed assertion is documented in-file.

**Proven (worktree `C:\c\wt-homepage`, branch `ci/homepage-cluster-2026-11-03`, base `ed00ab3d9`):**
- The 9-file homepage cluster: 54/54 tests pass.
- 21-file affected-surface batch (9 cluster + 7 picks + 2 packages + public-copy-integrity + public-copy-plain-language): 123/127 pass; the 4 failures are the pre-existing FE-10/C-107 wall items, identical on the stashed baseline.
- 15-file page.tsx-readers sweep: 17 failures, byte-identical failure set on the stashed baseline (zero regressions).
- `apps/web` `tsc --noEmit` exit 0.
- Guardrails: em-dash-scan OK (9 files), trust-gate OK (4,401 files), no-unsupported-performance-claims OK (481 files), commercial-copy-scan OK (477 files).

**Not proven:**
- No CI run on the pushed branch yet.
- Remaining wall untouched: ~61 apps/web files (board cluster, logic/runtime cluster, pricing/nav) plus the 7 other-workspace files.
- Open record question for the owner: /picks and /props headline the pre-TNF prior (`16-5 (76.2%) · +10.45u`) as the "Official New Engine verified record", while the ledger `verified_record` now reads `36-13-1 (+20.14u)` and the settlement doc post-MNF base card reads `38-13-1 (+22.85u)`. The homepage header now shows the settled TNF card (`14-6-1 (+7.19u)`) to match the packages page. Decide the single public headline number and align /picks, /props, and the catalog.

**Next role (Verifier / next loop):**
- Watch CI on the pushed branch; merge when the reduced wall is confirmed (no new failures vs `ed00ab3d9`).
- Next triage batches: (a) board cluster (board-picks-route-equivalence, board-class-banner-honesty, central-time-rendering, kickoff-local-time, honest-degraded-states, freshness-coverage, sample-mode-ui); (b) logic/runtime cluster; (c) pricing/nav clusters.
