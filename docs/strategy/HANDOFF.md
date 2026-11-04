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

## 2026-11-04 — test wall triage: board cluster (7 files) rewritten to the sealed-era design; PRs #1230 + #1231 verified merged

**Verified this run:** PR #1230 merged (a93313a76 is the merge commit of PR #1231; #1230 = ed00ab3d9). PR #1231 CI failure set diffed against PR #1230's: 78 -> 68 failing files, exactly the 9 homepage files fixed, ZERO new failures. Merged PR #1231 with `gh pr merge --merge` (remote branch deleted; local branch kept by wt-homepage worktree).

**Changed (branch `ci/board-cluster-2026-11-04`, worktree `C:\c\wt-board`, base `a93313a76`):**
- The root cause for all 7 board-cluster files: /board is now the under-construction stub, /picks is the static sealed Week 8 locked board, / (home) is the static RedlineWorld + responsible close, /pricing is the static under-construction pack catalog. All 24 failing assertions pinned the retired live-board / dynamic-picks / data-driven-home contracts. Each test rewritten to the current design; every prohibition carried over and each repoint documented in-file.
- `board-picks-route-equivalence`: /board job = parked stub routing to /packages + /fantasy/dfs (no loadBoardState, no sealed-board import); /picks job = sealed card (sealed-board.json, SealedTable, `publishAllowed && PUBLISH` filter, seal digest); nav names /picks as a revenue pillar and deliberately omits /board; neither page links the other (the shared /packages funnel is the route between jobs).
- `board-class-banner-honesty`: page test rewritten to "parked stub renders no board-class banner" (no testid, no boardClass.publicMessage, no refusePublicFire, no loadBoardState; under-construction notice + both funnel links). Classifier + badge honesty tests untouched.
- `central-time-rendering` + `kickoff-local-time`: board+picks removed from the Central-pinning surface lists (they format no timestamps now); both files gained a static-page test pinning the absence of EVERY banned timestamp format shape (toLocale*String, Intl.DateTimeFormat, new Date) on the stub and the sealed card, so a future unpinned timestamp fails loudly.
- `freshness-coverage`: /board stub renders no data-derived numbers so it owes no freshness stamp (pinned: notice present, board-freshness/Last refresh/StateTile absent); /picks pinned to seal-digest provenance (LineFreshnessBadge banned on a static card); homepage pinned to no lastRefresh and no "Board data as-of"; the CST-pinned MethodologySection stamp pinned on /methodology (its real caller); /pricing pinned to NO refresh/cadence language at all (FAQ is gone; numeric-cadence ban preserved).
- `sample-mode-ui`: homepage test rewritten to the stronger property (imports no board loader at all); /picks test rewritten to "static sealed card, no demo banner, seal digest is the provenance" (dashboard banner test still covers the one surface that renders sample data).
- `honest-degraded-states`: /board + /home describes rewritten as structural contracts (execute the pages, walk the trees, assert the retired outage/healthy copy can never render, assert no loader imports); /proof describe untouched. File shrank 521 -> 259 lines; all 6 tests pass locally (needs @neondatabase/serverless + @prisma/adapter-neon stubs in this worktree's junction target to run locally; CI installs them).
- `apps/web` `tsc --noEmit` exit 0; em-dash-scan OK; 7 rewritten files scrubbed to zero em/en dashes.

**Proven (worktree `C:\c\wt-board`):**
- The 7-file board cluster: 63/63 tests pass.
- 22-file affected-surface sweep (7 board + 13 readers of board/picks/pricing + homepage cluster + packages paywall): 179/179 pass, zero regressions.

**Not proven:**
- No CI run on the pushed branch yet (merge gate for the next loop: reduced wall, no new failures vs `a93313a76`).
- Remaining wall: ~54 apps/web files (logic/runtime cluster, pricing/nav, plus the 7 other-workspace files).

**Next role (Verifier / next loop):**
- Watch CI on the pushed branch; merge when the reduced wall is confirmed (no new failures vs `a93313a76`).
- Next triage batches: (a) logic/runtime cluster (dfs-optimizer-optimality, bestball, dfs-correlation, scheme, news/impact, wire-store, mission-control, do-calculus-verifiers, gate-registry.t24, literature-and-bow-arc, public-picks-enabled-readers, module-header-accuracy, continuous-reconciliation-daemon); (b) pricing/nav clusters (pricing-conversion-a11y, pricing-honesty, pricing-mobile-tap-targets, pricing-page-smoke, nav-auth, nav-ia, nav-live-chip-honesty, nav-route-integrity, mobile-nav-ia, five-pillar-nav, cockpit-nav-coverage).

## 2026-11-04 — test wall triage: nav/pricing cluster (12 files) rewritten to the sealed-era design; PR #1233 verified merged

**Verified this run:** PR #1233 CI failing set diffed against main (`a93313a76`, run 41794523901): 65 -> 57 unique failing test files (55 in CI summary), 8 files fixed (7 board + 1 flaky), ZERO new failures. Merged PR #1233 (`gh pr merge --merge`; merge commit `7e32951a4`; remote branch deleted).

**Changed (branch `ci/nav-pricing-cluster-2026-11-04`, worktree `C:\c\wt-nav`, base `7e32951a4`):**
- The root cause for all 12 files: the site is the sealed-era design (desktop bar = GALAXY PICKS (PAID) + DFS + 4-door "This week's packs" bar; mobile = 6 links; footer = Picks/Props/Packs/DFS; /pricing = under-construction pay-per-slate catalog; /picks + /props static sealed cards). The tests pinned the retired 5-pillar / subscription-ladder / comparison-table contracts.
- Implementation fix (1): `app/cockpit/layout.tsx` had no `/cockpit/workflows` NAV entry although the page exists; added under Ops. `cockpit-nav-coverage` now 31/31.
- `nav-ia` (plus `components/ui/__tests__` re-export copy): pillars aria-label = "This week's packs"; footer = Picks/Props/Packs/DFS. Prohibitions kept (zero Telegram, no /board //players //the-beat //academy //fantasy/studio doors).
- `mobile-nav-ia` (plus re-export copy): 6 links - Locked board /picks, Props /props, Packs /packages, DFS Optimizer & Stacks, All-Access Pricing, Sign in. Retired-link absence kept.
- `nav-auth`: signed-out CTA = "Get Today's Picks" -> /packages (was "See plans" -> /pricing); signed-in door = /packages (was /dashboard).
- `nav-route-integrity`: /pricing is reachable via mobile Account & Access + homepage TRUST_LINKS only (monthly subs under construction), not a desktop-bar door; dead-link and retired-door gates unchanged.
- `nav-live-chip-honesty`: the Live Board chip is rendered nowhere in the current nav; pinned the gate helper (`shouldShowLiveBoardChip`, LIVE_BOARD + canExposePublicPicks) and zero live-chip markup across nav-auth/nav/mobile-nav.
- `five-pillar-nav` + `five-pillar-architecture`: FIVE_REVENUE_PILLARS = 4 doors (Picks/Props/Packs/DFS). Writeup gate made future-correct: PLAY => expected CLV > 0 always; PASS <= 0.025 only for future-kickoff (live) cards - frozen sealed records keep their original pre-game CLV estimates as history (the old rule flagged a sealed PASS carrying its pre-game estimate, mis-stating the record as a violation).
- `pricing-honesty` / `pricing-page-smoke` / `pricing-conversion-a11y` / `pricing-mobile-tap-targets`: /pricing is the static under-construction catalog; pinned zero monthly literals, per-pack h3 headings + /packages#<slug> CTAs, no money-back promise; DOB test flipped to pin the founder's 2026-09-14 age-gate removal (SubscribeButton renders no DOB field - it was removed, the test needed the new truth).
- `docs-pricing-figures`: `data/snapshots/` added to EXEMPT_TREES (frozen archive of third-party prices); the `$19` lookahead excludes decimals (`$19.07MM` contracts, `$19.99` third-party); `docs/strategy/HANDOFF.md` exempted as a running handoff log (quoted button label).
- All 12 rewritten files scrubbed to zero em/en dashes. (Note: honest-degraded-states needed local stubs for `@neondatabase/serverless` + `@prisma/adapter-neon` in the junction target again; CI installs them. Stubs were removed after the run.)

**Proven (worktree `C:\c\wt-nav`):**
- The 12-file cluster + 2 re-export copies: 102/102 tests pass (incl. five-pillar-architecture 3/3, proven locally with the DB stubs).
- Affected-surface check: cockpit-routes + cockpit-stub-safety 10/10; the other sweep files that fail (public-surface-sweep, conversion-path-contrast, commercial-pages-launch-qa, public-unfinished-copy-fence, public-copy-plain-language, no-double-brand-title, disclosure-surface, sealed-engine) fail identically on the main checkout - pre-existing wall members, zero new failures.
- `apps/web` `tsc --noEmit`: only pre-existing ingestion-pipeline errors resolve via the dirty main-checkout junction; none in `apps/web` or this diff.

**Not proven:**
- CI on `ci/nav-pricing-cluster-2026-11-04` still running; merge gate for the next loop: reduced wall with no new failures vs `7e32951a4`.
- Remaining wall: ~43 apps/web files. Next batch: (a) the logic/runtime cluster named in the board handoff (dfs-optimizer-optimality, bestball, dfs-correlation, scheme, news/impact, wire-store, mission-control, do-calculus-verifiers, gate-registry.t24, literature-and-bow-arc, public-picks-enabled-readers, module-header-accuracy, continuous-reconciliation-daemon).
- Still open from the homepage handoff: the owner decision on the single public headline record number (/picks + /props headline `16-5 (76.2%) +10.45u`; ledger `verified_record` reads `36-13-1 (+20.14u)`). Other 2026-11-04 runs may have moved this - re-check the ledger before cutting the fix.

## 2026-11-04 - logic/runtime cluster (branch ci/logic-cluster-2026-11-04, base a7ff1d93c)

**Shipped:** PR #1234 (nav/pricing) verified vs main at 7e32951a4 (zero new failures, 10 files fixed by the lane's extraction) and merged (a7ff1d93c); remote branch deleted. Logic cluster below is on ci/logic-cluster-2026-11-04.

**Fixes (30 files):**
- bestball: bye-fragility fixture drifted - orr is now DAL bye 7, only two bye-14 RBs exist; test now uses ferris+soto (score 2). Rosters slackened to the pool's current teams/bys.
- dfs-correlation: slate moved - old PHI stack fixtures (dqb1 Silas Hart/WR_PHI Quincy Ohm) point at other teams now; repointed to the DAL stack (Dak Prescott + CeeDee Lamb + Javonte Williams) and LAR Puka as the off-game split. Projection gap 2.0 < 4.
- scheme: consolidation (#MIA) had no MIA players in the pool; air-raid CIN lacked a back. Scenarios re-targeted: air-raid to BAL (Lamar + Flowers + Henry - QB up and early-down back fades), consolidation to CIN (Chase alpha + Higgins fade).
- dfs-optimizer-optimality: old optima (120.5/218/259.00/256.24) belonged to a previous slate. Current Week 8 slate (37 players) optima independently re-solved with CP-SAT (stack = QB + >=1 same-team WR/TE) and re-pinned: cash 191.7, gpp 276, leverage 239.86539390434126 / 238.39434127276232. Engine matches all six exactly.
- C-416 DEMO_WIRE deletion (was a test-ahead-of-code defect): deleted the fictional export from lib/news/wire.ts; TheBeat now has no sample fallback (unconfigured feeds render an honest empty state, never stand-in headlines); host.ts studio script draft and cockpit mission-control briefing carry their own clearly-labelled SAMPLE fixtures (still disclosed, never live news); impact tests use local fixtures.
- continuous-reconciliation-daemon nextTuesday04CT: was process-TZ-dependent (only correct when TZ=America/Chicago); rewritten to compute the Chicago wall clock with Intl - passes under UTC/NY/London/Tokyo.
- module-header-accuracy: added the GENERIC BASELINE marker to 17 tracklet-association headers whose titles are not tracking papers but whose Mechanism claimed GTA association.

**Proven (worktree C:\c\wt-logic):** 10/10 target files, 90 tests; plus conviction/fantasy affected surfaces 10/10 (172 tests). tsc clean on touched files (pre-existing unrelated errors remain, as on main checkout).

**Not yet proven:** CI on ci/logic-cluster-2026-11-04; periodic-timeseries-id 'too large to be exact' fails in CI (Node 20) but passes locally (Node 24) - not reproduced, left for a Node-20 repro. Remaining wall per PR #1234 CI: public-surface-sweep, conversion-path-contrast, data-first/fantasy surfaces, do-calculus-verifiers, gate-registry, literature-and-bow-arc, public-picks-enabled-readers, and ~20 docs/picks/props files - next loop.
