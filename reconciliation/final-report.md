# GSE Reconciliation — Final Report

**Audited ref:** `origin/main` @ `4fa5330f4` ("analytics sweep: 2026-10-19 21:08 evening run (lane A addendum 3)")
**Worktree:** `C:/Users/Garrett/Sports-wt-audit-20261020` (isolated — the main tree's uncommitted work was not touched)
**Branch:** `audit/reconciliation-2026-10-20`
**Artifacts:** `inventory.json` · `research-to-code.md` · `gaps.json` (28 findings) · `reachability.json` · `tiers.json` · `live-path.json` · `literature-coverage.json` · `schema_literature.sql` · `patch-list.md`

---

## 1. Executive summary (two-minute read)

**What is solid.** The engine's *core* is well built. `packages/prediction-engine/src/scoring.ts` de-vigs multi-book consensus (`removeVig`, `averageAmericanPrices`), blends independent estimators through an agreement-scaled edge engine (`edge-engine.ts:180-290`) that refuses to credit an edge when the sub-vig guard fires or a source contradicts, withholds on adverse edge (`pricesWorseThanMarket`, `scoring.ts:836`) and on a defective calibration slice (`scoring.ts:839`), snaps published lines to real posted lines with the tie broken *against* us (`published-line.ts:111-116`), and is honest about what it cannot see. Pure-function design, frozen `MODEL_VERSION`, 1,014 modules with 967 test files. The docstrings are accurate — I found no case where a comment claimed more than the code did. That is rarer than it should be and worth saying plainly.

**What is missing.** The research corpus is a *reading* program, not an *implementation* program. 1,151 of 1,442 arXiv paper IDs (80%) have no code at all; 33 of the 47 explicitly ADOPTed papers were never built. Of the 306 arXiv-derived modules that do exist, **7 are called by another engine module**; 47 are barrel-only; 251 are imported by nothing. The `scoring.ts` import closure is **11 modules**. Roughly 730 engine modules are implemented, unit-tested, and unreachable — `symreg/` (9), `ratings/` (16 of 17), `ensemble/` (44), `decision/` (50), `calibration/` (21 of 22), all 5 `continual/*`. There is no self-improvement loop: every recalibration path (`online-beta-recalibration`, `calibration-ladder`, isotonic/PAVA/spline/temporal-conformal) has zero consumers, and the only calibration effect in production is a *withhold*.

**What is actively blocking the current business model.** Six things, all measured:

1. **The Oct-18 board is not the engine's output.** `publish_late_sun_mon_live_free.py:498-505` clamps `trueProb` to `[0.6020, 0.6160]`, `edgeScore` to `[68.4, 71.2]`, `confidence` to `[66, 69]`, and hardcodes `pick_grade = "STRONG_PLAY"` for every pick. Most picks carry `market_fair_prob: 0.5000` — a placeholder, not a de-vigged consensus. The public board reads exactly these rows.
2. **The emission gate protects the path that emits nothing.** `walk-forward-gate.json` has `passed: false`; `generate-signal-slate.ts:265` returns 0 picks. The content that shipped bypassed it via a manual script with no cron, no adverse-edge withhold, no line-integrity snap, and no proof-of-record.
3. **The public-picks gate is never read at mint time.** `isPublished` defaults `true` (`schema.prisma:550`) and `canExposePublicPicks` appears **zero times** in `process-sport.ts`. The gate hides rows at read time; it does not stop the mint. Two parsers of the same env var have *opposite* defaults (`platform-config.ts:166` lenient-true vs `commit-reveal.ts:35` strict-false).
4. **The "math you can read" ban is still enforced** — in CI (`trust-gate.mjs`, 3,701 files), at runtime (`compliance-scanner/rules.ts:50`, severity `block`), and in the mobile app, which is the only surface still showing the retired line to users. The `tools` page still says "nothing here claims to predict an outcome" while the site publishes predictions.
5. **The no-publish doctrine is enforced in code, not prose** — a CI guardrail (`draft-only.mjs`, 3,716 files), a default-ON kill switch (`INTERNAL_CALIBRATION_ONLY`), a runtime `throw` (`persist-draft.ts:60-65`), and TypeScript **literal types** that make agent publishing a compile error (`agent-council.ts:88,90`). The props route is gated off with no cron. Both postures are live at once because the Oct-18 script sits *outside* the guardrail's scan set.
6. **The repo's own "every paper is wired" index is a bucket-tagging artifact.** `WIRE-IN-PLAN.md:3` claims "1,251 / 1,251 tracker papers indexed, each in ≥1 engine bucket." Measured code coverage: **20%**.

**Top 5 actions.**

| # | Action | Why | Where |
|---|---|---|---|
| 1 | Remove the four clamps and the hardcoded `pick_grade`; derive `market_fair_prob` from the live de-vigged consensus and fail closed when it is unavailable | Until this, every published number is a presentation artifact and the ledger, CLV, and settlement all measure the clamp | `scripts/publish_late_sun_mon_live_free.py:498-505`, `:127-300` |
| 2 | Make one publish path that reads `canExposePublicPicks` at mint, enforces the emission gate, and produces all surfaces | Three surfaces, three mechanisms, two doctrines, no gate registry — the system cannot state what is live | `process-sport.ts` (add the gate read), `platform-config.ts:166`, `commit-reveal.ts:35` |
| 3 | Retire the AI-framing ban and the "math you can read" line across web, mobile, CI, and the agent briefs | It blocks legitimate copy, still ships to mobile users, and contradicts the model in public copy | `positioning-vocab.json`, `compliance-scanner/rules.ts:50`, `trust-claims.ts:376-455`, `apps/mobile/src/components/brand.tsx:135`, `apps/web/app/tools/page.tsx:93` |
| 4 | Re-home the research corpus: make the "wired" index mean *imported by a production path*, then triage the 33 unbuilt ADOPT papers by their numeric gates | The 20% vs 100% gap is the single largest misstatement in the repo; ADOPT gates are already written | `WIRE-IN-PLAN.md:3`, `docs/arxiv-program/research/2026-09-21/arxiv-deep/` |
| 5 | Wire the Literature Index (built and measured in this session) as the retrieval path for the corpus, and close the `corpusWeight` seam | The corpus is computed and discarded today; the index makes it continuous, with real residuals and do-calculus on promoted edges only | `packages/prediction-engine/src/literature/`, `ranking-prob.ts:56-58`, `scoring.ts:848,1534` |

---

## 2. The Literature Index (built and measured this session)

The brief's central ask: make the literature continuous, add residual feedback, promote high-performing premises to causal edges with do-calculus, expand to the broader corpus, and measure coverage.

**Built** on Neon branch `dev-lit-vectors-2026-10` (`br-sweet-forest-aptzgn32`, parent `main`), schema in `reconciliation/schema_literature.sql`:

- `packages/prediction-engine/src/literature/` — `literature-embeddings.ts` (bge-m3 via OpenRouter, 1024-dim, L2-normalized, with a deterministic hashed fallback for tests), `literature-pillars.ts` (9-pillar taxonomy derived from premise text), `literature-index-builder.ts`, `literature-retrieval.ts`, `literature-discovery.ts`, `literature-causal.ts`. 31/31 vitest pass.
- `apps/web/lib/literature/` — `literature-event-bridge.ts` hooks `writeSignalCandidates` (the signal-ledger cron); `literature-residual-bridge.ts` hooks `recordFreePathSnapshot` (settlement). Both gated on `GSE_LITERATURE_BRIDGE=1`, both strictly non-blocking.
- `scripts/literature/` — `build-index.cjs`, `run-loop.cjs`, `run-discovery.cjs`, `measure-coverage.cjs`.
- **The dead seam is closed:** `GameContextInput` gained `corpusAdjustment` / `corpusWeight`; `scoring.ts:848` and `:1534` now pass them; `process-sport.ts` populates `corpusAdjustment` from the corpus evaluator's shift. **The weight stays 0** — the corpus evaluator's own gate (N≥500 settled, ΔBrier≥0.002) has not been run, so the corpus changes nothing downstream.

**Measured** (`reconciliation/literature-coverage.json`):

| | |
|---|---|
| Premises indexed + vectorized | **5,509** (5,434 structured + 75 promoted from raw corpus) |
| Raw corpus vectorized for discovery | **1,268** |
| Live events → literature evaluation | **200** (7 signal keys, 15 games) |
| Activations recorded | **5,650** across 257 distinct premises |
| Retrieval latency | p50 **78 ms**, p95 79 ms, p99 84 ms |
| **HNSW index used** | **yes** — `Index Scan using premise_vector_hnsw_idx … Order By: (embedding <=> …)` |
| Residuals from **real settled outcomes** | **72** (43 correct), 28 premises graded |
| Premises promoted to causal edges | **8** |
| Intervention tests (promoted edges only) | **8**, all INCONCLUSIVE (samples too small) |
| Raw items surfaced by ≥3 distinct events → structured | **75** |
| Residuals improving? | **yes** — MAE 0.4522 → 0.4431 |

**Four real bugs the run exposed, all fixed:** (1) the scoring rule was binary correctness, so a 0.5-predicted premise was scored *incorrect every time* and no premise could ever earn weight — measured 48 graded / 0 correct / MAE exactly 0.50000; switched to Brier skill against the 0.25 baseline. (2) residuals were an artifact of a hash of the game id; now read from 1,401 real settled games, with 1,547 activations skipped rather than given a synthetic outcome. (3) `intervention_test.estimate` was `NOT NULL`, so inconclusive tests could not be recorded — the table read 0 rows while the console reported 8. (4) the 285 probability-claim bridge premises all share the metric `pregame_context_logit`, matching no live signal key, so a pillar-scoped retrieval could never surface them — 285 premises, 0 ever activated.

**Honest limits on these numbers.** 72 residuals over 2 games, split 36/36 by grade order, is not a trend — it is noise with a favourable sign, and the second half contains more bridge premises (0.5-prior), which have smaller residuals by construction. Treat `residuals_improved: true` as "the mechanism is wired and directionally plausible," not as validated. The 8 intervention tests are all INCONCLUSIVE: the promotion machinery works, the tests have not concluded anything. The `lit.discovery_hit` evidence trail is written by the script but not yet by the TypeScript `retrieveForEvent` path.

---

## 3. Method and coverage

| Dimension | Coverage |
|---|---|
| Critical packages | 9/9 — `prediction-engine`, `ingestion-pipeline`, `feature-store`, `verifier`, `db`, `ops`, `types`, `apps/web`, `intelligence` |
| Research dirs | 20/20 — every dir in the brief surveyed, 3,234 md/json catalogued |
| Branches | 789 remote (non-dependabot) inventoried with dates + family tags; 248 since 2026-10-01 sampled by family; `main` + top active set analyzed exhaustively |
| Engine modules | 1,014 non-test modules — every one classified PROD / BARREL_ONLY / ORPHAN by import-graph walk |
| arXiv ledgers | 1,511 parsed, joined to implementing modules by paper ID |
| Gates | 37 catalogued with file:line and live state |
| Old doctrine | 134 raw hits / 90 files, separated into enforced vs stale |

**Coverage score: 92%** of critical packages and research items examined. The uncovered 8% is the tail of stale branches and the frozen `docs/ops/chaos/` archives, which are explicitly historical.

**Provenance rule applied:** no claim in `gaps.json` rests on a subagent's word. Every recon claim was re-verified in this session by a fresh grep before being recorded — including two where the agent's classification needed correcting (`live-edge-registry.ts` does have one importer, `part-reading.ts`, but that module itself has no production importer; the `symreg/` modules' single non-barrel importer is their own test file).

---

## 4. What the audit did *not* cover

- **Stale branches beyond the top active set** were sampled, not exhaustively read. The brief explicitly scoped this.
- **The `docs/ops/chaos/` archives** and the bulk of `docs/arxiv-program` quoting "math you can read" as corpus text rather than doctrine.
- **Runtime `PUBLIC_PICKS_ENABLED` on Vercel** — the deploy env was not read, only the in-repo templates. The code default is `true`; both `.env.example:313` and `.env.production.example:89` ship `false`. Which one is live is undetermined.
- **Whether the Oct-18 clamped rows are still on the public site.** The script wrote them; whether they were subsequently withdrawn was not checked.
- **Typecheck.** The audit worktree has no `node_modules`, so `@sports/types` and `@types/node` do not resolve and the whole package fails to typecheck. The errors are environmental, not from the new files, but I did not prove that on a proper install.

---

## 5. Artifacts

| File | What it is |
|---|---|
| `reconciliation/inventory.json` | 789 branches with dates/tags, package tree, 3,234-doc census, corpus inventory |
| `reconciliation/research-to-code.md` | The reconciliation table: artifact → status → evidence → action |
| `reconciliation/gaps.json` | 28 findings, machine-readable, severity + blocking-model flag + evidence[] |
| `reconciliation/reachability.json` | Full import-graph closure and orphan lists |
| `reconciliation/tiers.json` | PROD / BARREL_ONLY / ORPHAN classification of all 1,014 modules |
| `reconciliation/live-path.json` | Which modules each live publish path actually touches |
| `reconciliation/literature-coverage.json` | The coverage readout above |
| `reconciliation/schema_literature.sql` | The `lit` pgvector schema (applied to `dev-lit-vectors-2026-10`) |
| `reconciliation/patch-list.md` | The suggested patch list / PR descriptions for the top fixes |
| `packages/prediction-engine/src/literature/` | The index, retrieval, discovery, and causal modules (new) |
| `apps/web/lib/literature/` | The event and residual bridges (new) |
| `scripts/literature/` | Build, loop, discovery, and coverage scripts (new) |
