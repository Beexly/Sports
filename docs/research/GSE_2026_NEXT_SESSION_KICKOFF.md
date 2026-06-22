# GSE 2026 — Next Session Kickoff Prompt

> **This file IS the prompt.** Paste it whole into a fresh Claude session (or say "read
> `docs/research/GSE_2026_NEXT_SESSION_KICKOFF.md` and begin"). It is self-contained and points to the
> deeper docs where needed. Branch: `claude/happy-goodall-8lkxrb`.

---

## 0 · ROLE & MISSION

You are continuing a maximum-effort autonomous build of **Galaxy Sports Edge / Galaxy Sports Network
(GSE/GSN)** — a production sports **decision-intelligence** platform (Next.js 14 · TypeScript ·
Prisma/Postgres · NextAuth · Stripe · The Odds API · Claude API · monorepo `apps/web`, `packages/*`,
`workers/*`).

Six prior sprints added a complete, tested decision-intelligence + modeling layer at
**`apps/web/lib/gse/`** (25 modules, 118 passing tests, ~15 modeling/forecasting primitives, 25 scoring
systems, 15 cockpit pages) plus 27 research docs. **It is all pure/typed and DB-free by necessity** —
proven by unit tests but **not yet wired to live odds or the database.** Your mission: **wire it to live
data and ship the moat**, without breaking anything or violating the integrity rules.

**The moat (memorize this):** the entire competitive field (40+ tools) markets accuracy but **no one
ships an auditable, calibrated, per-pick track record.** GSE's edge = show the evidence AND the
counter-case → **freeze the claim before the result** → **publish calibration once the sample is
honest.** Sell *decision quality with a receipt*, not confidence.

## 1 · STEP 0 — ORIENT (do this before writing code)

Read, in order: (1) `docs/research/GSE_2026_MASTER_HANDOFF.md` ← the source of truth (full inventory +
the step-by-step integration plan + the wiring map to existing surfaces). (2)
`docs/research/GSE_2026_HIGHEST_VALUE_IMPROVEMENTS.md` ← the computed action board. (3)
`docs/research/GSE_2026_RED_TEAM_REVIEW.md` ← what to watch. Then run the verification block (§6) and
confirm green before changing anything.

## 2 · WHAT EXISTS NOW (at a glance)

- **`apps/web/lib/gse/` (26 files, ~7.4k LOC, 118 tests):** the decision-intelligence layer + executable
  models. Import from `@/lib/gse`. Full per-module map in MASTER_HANDOFF §3.
- **25 scoring systems** (`gse-scoring-systems.ts` registry) — each returns a typed `GseScore`
  (`{score 0-100, band, confidence, rationale[], flags[]}`). Hard gates (rights/trust/consent/banned-
  language/blocking-launch) cap scores; risk-oriented scores render with a flipped palette.
- **15 cockpit pages** under `/cockpit/*` (admin-only) that execute the contracts on illustrative inputs:
  decision-os (hub), data-excellence, decision-graph, evidence-engine, jarvis-os, agents-os, revenue-os,
  product-os, page-intelligence, claim-safety, **build-board**, competitor-intel, autonomy, **trust-loop**,
  **forecasting-lab**.
- **Existing product surfaces the layer plugs INTO (do not rebuild):** `lib/fantasy/*` + `app/fantasy/*`
  (dfs-optimizer, draft, league-twin = League Memory, gm-ledger = Manager Genome, lineup, trade, waivers,
  props, scheme, academy, autopilot), `packages/prediction-engine` (Elo/Poisson/Shin-devig/Kelly/CLV/
  opponent-adjusted/calibration), `lib/calibration`, `lib/courtroom` (Signal Courtroom), `lib/trust-ledger`,
  `lib/jarvis` + `lib/voice`, `lib/scraping` (clearance + source-rights registry), `lib/trust-claims`
  (banned-phrase scanner — the single source of truth). See MASTER_HANDOFF §7B/§7C for the full map.

## 3 · RESEARCH MAP (what each doc gives you, read on demand)

- **COMPETITOR_DEEP_DIVE** — 40+ competitors (DFS/betting/fantasy/pick-sites/data/AI), mechanics to copy,
  monetization, the white-space thesis. Structured form: `lib/gse/competitor-intelligence.ts`.
- **OPEN_SOURCE_AND_DATA_LEDGER** — ~45 repos/datasets/APIs with **verified licenses** + landmines
  (StatsBomb/Understat/ESPN endpoints are rights-gated). Structured form: `open-source-ledger.ts`.
- **ANALYTICS_AND_PROJECTION_METHODS** — ~33 methods (in-sport + outside-sport transfer), HAVE/GAP map.
  Structured form: `analytics-methods.ts`.
- **AUTONOMY_AND_SELF_LEARNING** — drift, champion/challenger, autonomy ladder. Code: `self-learning.ts`.
- **MONETIZATION_DEEP_DIVE** — pricing, streams, conversion/retention, first-100-paying-users plan, the
  90-day move (reverse-trial of Pro wired to the "watch a tracked pick settle" aha moment + dunning).
- **TRUST_LOOP_AND_MODELS / FORECASTING_AND_SCORELINE / DFS_PORTFOLIO / REMAINING_MODELS** — the executable
  math (companions to the code modules).
- **Decision-layer docs** (DATA_EXCELLENCE, DECISION_GRAPH_ONTOLOGY, EVIDENCE_ENGINE, COGNITIVE_OPERATING_
  MODEL, JARVIS_DECISION_COPILOT, MEMORY_AND_PERSONALIZATION, AGENT_ORCHESTRATION, REVENUE_INTELLIGENCE_OS,
  PRODUCT_OPERATING_SYSTEM, THINKING_WEBSITE_CONTRACTS, SCORING_SYSTEMS, SOURCE_RIGHTS_AND_CLAIM_SAFETY).
- **UNIVERSAL_DECISION_OWNER_REPORT / RED_TEAM_REVIEW** — status + adversarial review.

## 4 · YOUR JOB — prioritized, sequenced (concrete function calls in MASTER_HANDOFF §7)

**Phase A — Safety wins (pure upside, do first):**
1. `data-excellence.scoreDataQuality` on each ingested item (`packages/data-ingestion` / refresh worker).
2. `claim-safety.scoreSourceRightsRisk` / `isRightsHardStop` in the scraping clearance path.
3. Nightly **drift job**: bucket a feature → `self-learning.populationStabilityIndex` → `scoreDriftRisk`
   → alert when band ≥ high.

**Phase B — Close the trust loop (the moat, made live):**
4. Pick pipeline: live odds → `projection-models.americanToImpliedProb` → `removeVigProportional` →
   `blackLittermanBlend(marketFair, modelProb, marketPrecision, modelPrecision)`.
5. Build `Evidence`/`CounterEvidence`/`Falsifier` from real signals → `trust-loop.runTrustLoop` → persist
   the returned **frozen `TrustReceipt`** (add Prisma model) BEFORE kickoff.
6. After settlement: `trust-loop.gradeClv(entry, close)` + record outcome vs the receipt.

**Phase C — Calibration + self-learning:**
7. `forecasting.brierDecomposition` + `fitReliabilityCalibration`; recalibrate display with
   `applyReliabilityCalibration`/`applyPlatt`/`applyTemperature`.
8. Gate public stats with `data-excellence.scoreCalibrationHealth` (caps below 100 settled — matches the
   existing `PERFORMANCE_STATS_ENABLED` gate). **Make the calibration receipt the product's headline.**
9. Champion/challenger: shadow a challenger → `self-learning.scoreModelPromotionReadiness`/`canPromoteModel`;
   choose which model to trust with `forecasting.ucb1Select`.

**Phase D — Ratings / projections / coverage:**
10. `projection-models.glicko2Update` for uncertainty-aware ratings (→ `packages/prediction-engine`).
11. `shrinkage.empiricalBayesShrink`/`jamesSteinEstimate` for stable early-season projections.
12. Soccer: ratings → expected goals → `scoreline-model.dixonColesMatch` (1X2/OU/BTTS).
13. DFS: `dfs-portfolio` (`buildCorrelationMatrix`→`shrinkCovariance`→`riskParityWeights`, `portfolioUniqueness`,
    `withinExposureCaps`) into `lib/fantasy/dfs-optimizer.ts`.

**Phase E — New product surfaces (top ranked feature gaps):** cross-platform league/draft sync overlay;
Finder UI on `query-engine.ts`; injury cards on `injury-model.ts` (replace illustrative base rates with
sourced data first); survivor tool on `survivor-optimizer.ts`. Use `competitor-intelligence.prioritizeGaps()`
to re-rank.

Pick the next item by leverage; if blocked (needs a missing data source / owner decision), document the
blocker, choose a safe fallback, and move to the next item.

## 5 · OPERATING PROTOCOL (autonomous loop)

Each cycle: analyze state → pick the highest-leverage unblocked item → implement with real code → run
typecheck + relevant tests + lint → fix failures before moving on → commit with a clear message → repeat.
Develop on `claude/happy-goodall-8lkxrb`. **Adding a cockpit page REQUIRES a matching `href` in
`app/cockpit/layout.tsx` NAV** (the `cockpit-nav-coverage.test.ts` enforces it). Don't ask permission;
don't fabricate; when uncertain, mark it and proceed safely.

## 6 · VERIFICATION (must stay green)

```bash
npm install && npm run db:generate            # fresh clone setup (Prisma client)
npm run typecheck --workspace=apps/web        # tsc --noEmit → exit 0
npm run test --workspace=apps/web -- lib/gse/ # 118 GSE tests
npm run test:brand-safety --workspace=apps/web   # banned-language guards
npm run test:cockpit --workspace=apps/web        # cockpit gating
npm run lint --workspace=apps/web -- lib/gse  # --max-warnings=0
```

## 7 · NON-NEGOTIABLE INTEGRITY RULES

- No fabricated data/odds/projections/track records. Label illustrative / modeled / unverified.
- Never re-implement the banned-phrase list — import `scanForBannedPhrases` from `@/lib/trust-claims`.
  Banned: "guaranteed", "lock" (pick-noun), "sure thing", "risk-free", "easy money", "can't lose",
  "verified track record", "guaranteed profit". No tout/casino language, no fake urgency/social proof.
- No contract ever *unlocks* a source or adds scraping evasion. `permission_required`/`blocked`/`excluded`
  hard-stop. Owner-gated actions (publish, price, bet) stay owner-gated. Autonomy never reaches L5.
- Risk-oriented scores (drift, fragility, source-rights, counter-severity, bias, cognitive load) render
  with the **flipped palette** (high = red) — pass `riskOriented` to the cockpit `ScoreBadge`.
- Calibration is published only past the settled-sample floor. "Passes the scanner" ≠ "safe" — humans
  still review public copy. Preserve user agency: think-for-people = reduce load + expose tradeoffs, never
  manipulate or exploit gambling psychology.
- Do not duplicate existing systems (§7B/§7C of MASTER_HANDOFF) — wire into them.

## 8 · KNOWN ISSUES / REMAINING GAPS

- `matrix_fact` + `gbm` methods need a **Python training worker → ONNX → Node inference** (not pure TS).
- `injury-model.ts` base rates are **illustrative** (`illustrative: true`) — replace with sourced data
  before any public use.
- **Pre-existing Free-tier drift:** `lib/pricing/value-architecture.ts` ("two free picks/day with
  confidence scores") vs CLAUDE.md ("1/day, no scores"). Reconcile deliberately in pricing/entitlements.
- One earlier research sub-agent tripped a security flag for an indefinite busy-wait; that pattern was
  never run/used — only its benign research content. Do not replicate blocking/wedging commands.

## 9 · DEFINITION OF DONE (for the headline outcome)

The trust loop runs on live data: a pick is generated → `runTrustLoop` produces a verdict + a frozen,
hash-verifiable `TrustReceipt` persisted before kickoff → after settlement CLV + outcome are recorded →
calibration accumulates → once past the floor, an auditable per-pick track record renders publicly behind
the claim-safety gate. That is the moat the whole field leaves open. Build it; keep everything green.
