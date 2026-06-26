# GSE Master Dossier
### Galaxy Sports Edge — the integrated, current-state source of truth
**2026-06-24 · The front-door document. Synthesizes the entire GSE intelligence corpus into one definitive read. Reflects the CORRECTED state, not superseded versions.**

> **Precedence rule (binding).** Where any statement here or in any companion doc conflicts, the rigor-pass corrections in **`GSE_INTEL_00_RIGOR_PASS.md`** are authoritative. This Dossier is written to *already embody* those corrections; the companions are listed in the Reading Map (§7) for depth. The single most important override, repeated wherever it matters: **the market anchor conserves team YARDS and TDs — fantasy points are derived from the scoring formula, never "fantasy points = team total."**

---

## 0. What Galaxy Sports Edge is, in one sentence

**Build the only sports forecaster that anchors every prediction to the market, publishes its own uncertainty as a coverage-tracked range, and shows its own calibration by position over time — turn it on for fantasy this week on real cleared data, earn the engine's public flip with an honest backtest, light it up at kickoff (Sept 9) — and let every settled game make the data deeper, the model sharper, the proof louder, and the price more defensible, all on the same heartbeat.**

Everything below is how that sentence is true: the thesis and the flywheel that compounds it (§1), the corrected six-layer brain that produces the numbers (§2), the frontier mechanisms that make the combination rare (§3), the real state of the shipped code (§4), the decisions that follow (§5), the 80-day path to launch (§6), and the map of where to read deeper (§7).

---

## 1. The thesis — and the flywheel that compounds it

### 1.1 The one decision

Everyone in this market forecasts the same things — fantasy points, game winners — and sells a number with no error bars and no track record. GSE wins by doing three things at once, in public, that no competitor combines:

1. **Anchors every prediction to the market.** The Vegas implied team total is the constraint, not a competitor. GSE pours the market's own number across a roster through a usage-and-efficiency model, so projections are never internally inconsistent and *disagreements with the market are explicit and measurable*.
2. **Quantifies its own uncertainty.** Every published number is a *range whose coverage tracks the target rate over the season*, not a false-precision point — and the honest framing is "adaptive coverage that converges to nominal," never a finite-sample guarantee.
3. **Publishes its own calibration.** Each forecast is committed (hashed) before the game and scored after, and the system shows the world how wrong it has been — by position, over time, against a market baseline.

Transparency + uncertainty + market-anchoring + self-published calibration: pick any competitor (PFF, ESPN, the touts) and they have **at most one** of the four. The moat is not a secret model — a secret formula is not rare, compounding, or hard to copy. The moat is *integration + transparency + discipline*, which is all three.

### 1.2 The compounding flywheel (data × forecast × proof × revenue, on one heartbeat)

Most "data flywheel" claims are decoration. Here it is as an actual mechanism. When an NFL game settles, **one event (`game.settled`) fires four compounding updates in a fixed, idempotent order** — and the fourth is *derived from* the third, so revenue maturity and engine maturity advance from the same milestone or not at all:

| Beat | What fires | Where it lands | Why it compounds |
|---|---|---|---|
| **DATA** | the prediction-time feature vector + the real outcome append to the corpus | R2 Parquet → in-process DuckDB (≈$0, zero egress) | the data moat deepens every Sunday; nobody can backfill *our* pre-commit history |
| **FORECAST** | the calibration harness rescoring updates ensemble weights + isotonic maps (proposes only; never auto-applies) | `lib/calibration/compute.ts` → a `CalibrationProposal` | the next projection is sharper than the last — gated by Model Court, automatically motivated |
| **PROOF** | CLV beat-rate, Brier, ECE, interval coverage, settled-count update | the public track record + the ladder counters | the proof grows; the price becomes defensible by evidence, not assertion |
| **UNLOCK** | settled-sample milestones flip pricing rungs **and** `priced=false→true` flags **and** `canPublishProjections` | the `LadderEvent` registry, via `reduceLadder()` | revenue and engine advance from the *same* record |

A competitor cannot copy this by buying the same data: their projection doesn't publish calibration (so it can't earn trust on a curve), their data goes stale between updates (so it doesn't compound), and their pricing isn't gated to proof (so a price increase is just a price increase). GSE's price increases are *earned in public*, and every founding member is grandfathered for life — so the flywheel rewards early believers and structurally punishes imitators who arrive after the track record exists.

### 1.3 The spine: one `LadderEvent` ledger

The single highest-leverage engineering move is to make the coupling between "we've proven enough to raise the price" and "we've proven enough to turn this signal on" **one append-only, event-sourced ledger** rather than prose plus scattered env booleans:

```
LadderEvent (append-only):
  SETTLED_BATCH · CALIBRATION_PUBLISHED · CLV_BEAT_UPDATED · ECE_CHECK · MODEL_COURT_APPROVED
        │
        ▼
reduceLadder(events) ──► current rung ──► read by ALL of:
   • pricing-phases.ts        (which tier is live: FOUNDING → PROVEN → ESTABLISHED → AUTHORITY)
   • priced=false→true        (independent estimators enter the priced score)
   • canPublishProjections    (the weekly forecast goes public)
   • PERFORMANCE_STATS_ENABLED (the public win/CLV stats open)
```

**Invariant INV-1 (the investor-slide test):** a pricing-tier advance and a `priced`-flag flip must derive from the *same* milestone event — they cannot diverge because they are the same reducer reading the same ledger. The ledger encodes **two tracks** (fantasy and betting; see §2) so they never cross-unlock. It ships in **shadow mode first** — the reducer logs where it disagrees with today's env flags before it takes authority. (Built; see §4.)

### 1.4 Cost is the weapon (the inversion)

The cost work already shipped reads like defense — stop the bleed. The real story is offense: because the corpus lives in **R2 Parquet (free egress) queried by in-process DuckDB**, GSE's marginal cost of running *another* backtest, recalibration, or walk-forward CV is **≈$0**, while competitors on Postgres/Snowflake/per-query warehouses pay for every scan. Climbing the proof ladder fast *is* "run thousands of recalibrations and shadow backtests" — and GSE does that on the flat part of the cost curve. The cost architecture and the intelligence flywheel are the **same decision**. Solo-founder launch envelope: roughly **$5–55/month** all-in — a runway measured in years of iteration, not months of burn.

---

## 2. The corrected intelligence architecture — the six-layer Core

One brain, two products. Six layers, each a real method grounded in a real file, each promotable only through the existing Model Court + `model-freeze.mjs` calibration gate. **All six rigor-pass corrections (C1–C6) are baked into the description below** — this is the corrected design, not v1.

```
FEATURE STORE (L1) → PLAYER-RATE POSTERIORS (L2) → MARKET-ANCHORED ALLOCATION (L3)
   → CROSS-PLAYER CORRELATION / COPULA (L3.5) → EARNED-WEIGHT ENSEMBLE (L4)
   → ADAPTIVE CONFORMAL INTERVALS (L5) → SELF-PUBLISHING CALIBRATION (L6)
```

- **L1 — Feature store.** One clearance-gated, versioned feature factory (`lib/metrics/*`): opponent-adjusted EPA/success (shipped, Gauss-Seidel), CPOE, WOPR/target share, air-yards/aDOT, PROE/pace, red-zone usage. Persisted to R2 Parquet → DuckDB views → a Neon serving subset. Every row carries its stat-commandment envelope `{source, timestamp, definition, weakness}` and a `CLEARED|GATED` flag that travels downstream.

- **L2 — Player-rate posteriors (the single biggest honesty upgrade).** NFL is a small-sample sport; a 4-game target share is mostly noise. Empirical-Bayes / hierarchical-Bayesian shrinkage regresses each player rate toward a position/archetype prior with weight `w = n/(n+k)` and emits a **posterior distribution (mean + variance), not a point** — Beta-Binomial for shares/rates, Normal-Normal/James-Stein for continuous efficiency, Dirichlet for the usage simplex. The published `shrinkage = 1−w` is the mathematical implementation of "conflict is not confidence."

- **L3 — Market-anchored reconciliation (the keystone). [C1 baked in]** Take the Vegas implied team total and **decompose it into the physical quantities it actually predicts — expected team YARDS and team TDs** (split into pass/rush yards by the game-script pass-rate forecast) — then allocate *those physical pools* across the roster through the L2 usage×efficiency posteriors. **The conserved invariants are `Σ recYds = passYds_team`, `Σ rushYds = rushYds_team`, `Σ TD = teamTD` — never on fantasy points.** Fantasy points are a **derived output** of the league scoring formula applied to the conserved line. The residual — bottom-up minus allocated, **computed per physical stat in matching units** (projected receiving yards vs. the receiving-yards prop, etc.) — is `DIVERGENCE`: simultaneously a fantasy buy-low/sell-high signal, a betting-edge candidate, and the best content GSE can publish ("The Receipt"). *Why yards-and-TDs:* the team total is scoreboard points (a function of TDs and FGs); fantasy points are a different unit (PPR + yardage); summing fantasy points to a scoreboard total is dimensionally meaningless, and the old single `pointsPerImpliedPoint` scalar hid the mismatch while a "conservation test" passed proving nothing.

- **L3.5 — Cross-player correlation / copula. [C6 baked in — was missing entirely in v1]** Every player up to here is projected with his own marginal; that is silently wrong for any product where players move together (QB–WR1 fantasy correlation ≈ 0.47–0.56; RB production anti-correlates with own-team pass volume; shootouts lift two pass-catchers together). A **Gaussian copula** over the L3 marginals — estimated empirically, shrunk toward a structured block matrix to stay positive-definite — preserves every marginal while injecting the dependence, so the system samples the **joint** roster distribution. One covariance model powers best-ball spike-week correlation, DFS stacking, **and** parlay leg correlation — extending the one-engine-many-products thesis from the point projection to the *risk* structure.

- **L4 — Earned-weight ensemble + online learning (the honesty gate). [C5 baked in]** Combine `{market-anchored, bottom-up usage, opponent-adjusted-EPA, dumb baseline}` with weights **earned out-of-sample**, updated weekly by multiplicative-weights (Hedge), `w_e ∝ exp(−η·cumloss)`. The loss fed to Hedge is **bounded/normalized** (per-position error capped to a known max) so the `O(√(T·ln|E|))` regret guarantee actually holds — quoting that bound against *unbounded* MAE, as v1 did, was unsound. The "beats the market" gate uses the **Clark–West (2007)** adjusted test for **nested** forecast comparison (market-only is nested inside market+player-signal; Diebold–Mariano is undersized on nested models and is explicitly rejected), with a minimum effect size and a block-bootstrap robustness check. **Nothing ships unless it beats both an equal-weight blend and a market-only baseline OOS.** Walk-forward weight learning is purged + embargoed (López de Prado) to prevent leakage. The dumb baseline is the honesty floor.

- **L5 — Adaptive conformal intervals (coverage that tracks the target rate). [C2 baked in]** Wrap every projection in a **distribution-free** interval. A finite-sample marginal-coverage *guarantee* holds only under exchangeability, and the NFL is not exchangeable (week-to-week and season-to-season shift, role changes, injuries) — so split-conformal coverage would drift. GSE runs **Adaptive Conformal Inference (Gibbs & Candès 2021)** — adjusting the effective miscoverage level online, `α_{t+1} = α_t + γ(α − err_t)` — **inside Mondrian (per-position) bins** with a rolling recalibration window, and claims the honest thing: *long-run realized coverage converges to nominal*, not a guarantee. Normalized nonconformity (`|y−proj|/σ̂`) makes the band wider where the model itself is less sure. **Leakage rule (fixed):** conformal calibration weeks must not overlap ensemble-fit weeks (separate, time-ordered folds).

- **L6 — Self-publishing calibration (the layer that makes the claim true). [two-track proof, C4 baked in]** Commit each projection **before** the game (SHA-256 receipt folded into a per-slate Merkle root — non-repudiable) and score it **after**. The proof runs on **two tracks on the same `LadderEvent` ledger, neither borrowing the other's evidence:**
  - **Fantasy track** — graded on **per-position MAE + interval coverage vs. nominal + rank-correlation** (Spearman/Kendall — does the ordering help lineups?), with realistic sample targets (hundreds of player-weeks per position; the historical harness supplies thousands immediately). CLV is *meaningless* for a points projection, which is why v1's CLV-gated ladder was wrong.
  - **Betting track** — graded on **CLV + Brier/log-loss + ECE + Murphy decomposition**, as the shipped picks engine already does. Isotonic/PAVA recalibration only at **n≥100 settled with non-worsening ECE**; below that, Platt/beta is the small-n bridge.

  The public artifact (`/observatory/projections`) shows sample sizes, MAE/RMSE GSE-vs-market with CIs, achieved-vs-nominal coverage with the live ACI trace, rank correlation, the current `MODEL_VERSION` + Merkle root + receipt link, and honest "still collecting" states wherever `n` is short. This artifact gates the `canPublishProjections` flip.

**The distributional family (Atlas, corrected).** The base fantasy estimator is the **Tweedie** compound Poisson–Gamma distribution (a point mass at zero plus a continuous right-skewed tail — the native model for fantasy points), with **zero-inflated/hurdle** for low-usage players, **Dirichlet-multinomial** for honest touch-share allocation, **Skellam** (difference of two Poissons) for multi-sport margins/puck-lines/run-lines, **Gaussian copula** for the L3.5 correlation, plus GAMLSS/Plackett-Luce/MDNs at pilot/reference depth. *Truth-in-labeling caveat (see §4):* the shipped Tweedie code is a **Tweedie-flavored scaffold** (boosts stumps on `log1p(y)`, does not yet use the Tweedie deviance gradient) and must be honestly labeled as such until the gradient is wired.

**Architectural invariants (never violated):** GSE Score stays a *ranking index, not a win probability* (`round(confidence × M)`); calibration is *evidence-only and human-gated* (the harness proposes, never mutates weights); `canPublishProjections=false` is a *hard wall* until cleared; every output is a `derived_signal` carrying the stat-commandment envelope; source-of-truth ordering is **market odds > cleared nflverse metrics > model posteriors** (the market is reconciled against and the divergence disclosed, never silently overridden); no isotonic recalibration below n=100.

---

## 3. The frontier mechanisms — and the honest novelty ledger

Six rarer mechanisms take GSE from "excellent application of known methods" to "a combination this market has not seen." Each is either *process-grade today* or *gated behind the same proof milestones* as everything else — none requires flipping a claim early.

1. **Cross-market triangulation** — anchor not just to the team total but to a *third independent market, player props* (receptions, rush yards, anytime-TD). Three estimates now exist (bottom-up usage, top-down allocation, prop-market line); where all three agree → tight interval; where props agree with bottom-up but not the naive allocation → a game-script signal; where props disagree with both → a genuine edge **or** a data-quality alarm, and the system logs which.
2. **Public model parliament** — make the internal earned-weight ensemble *public*: a live leaderboard where GSE's own models (market-anchored, bottom-up, opp-adj-EPA, baseline) compete weekly on out-of-sample CRPS/Brier with their weights visible and moving. Proof, engagement, and the "learning, growing" narrative in one artifact no tout can fake.
3. **Community calibration tournament** — let users submit weekly projections, score everyone with proper scoring rules, rank them on a season-long calibration leaderboard; the best earn a "verified sharp" badge, and the aggregated-and-extremized consensus becomes a proprietary signal GSE benchmarks against. A wisdom-of-crowds flywheel that is also retention and acquisition.
4. **Options-style distribution pricing** — stop selling a point; sell the **distribution**. Ceiling = call-option payoff, floor = downside protection, spike-week probability = tail mass above a threshold. Best-ball/DFS become explicit risk/portfolio decisions ("this roster is long volatility").
5. **Active learning** — point the ingest budget at the system's *own ignorance* (widest conformal intervals, worst-calibrated buckets) rather than ingesting everything. Optimal experiment design is the difference between a year of motion and a year of progress for a solo founder.
6. **Replayable forecast provenance** — publish enough that *anyone can replay GSE's entire forecast history* from the hash chain plus the open methodology and independently reproduce the calibration numbers. In a market of touts who delete their losses, *verifiable* is the whole brand.

**The novelty ledger (this keeps the company honest):**

- **Table-stakes** — no fabricated data, intervals on every number, a stated model version, responsible-gaming posture. Everyone *should*; few do them well.
- **Applied-well** — hierarchical-Bayesian shrinkage, conformal prediction, Hedge ensembles, Shin de-vig, isotonic calibration, CLV grading, purged/embargoed walk-forward CV. Known methods, executed with rigor most consumer tools skip. This is the bulk of the Core, and it is valuable *because* it is testable and falsifiable.
- **Frontier-for-this-market** — market-anchored reconciliation with **divergence-as-the-product**, the **one `LadderEvent` ledger** coupling price to model activation, **self-published per-position calibration**, and the six mechanisms above. Defensible *because* it is transparent.
- **Not claimed** — "unknown to science," "no machine has thought of it." We don't need that claim, and making it would be the first dishonest sentence in the company.

---

## 4. The current REAL build state

The intelligence work lives on branch **`codex/intelligence-core`** (worktree `C:\Users\Garrett\Sports-intelligence-core`, ~30 commits Slice 0 → AUDIT). **It is verified real, not merged, not deployed.** *(Note: the design docs name an earlier work branch `claude/sweet-fermi-sk9gws`; the build was cut from it onto `codex/intelligence-core` — Slice 0 recorded this; treat `codex/intelligence-core` as the branch of record.)*

### 4.1 The 5-lens review grades (of `codex/intelligence-core`)

| Lens | Grade | What it means |
|---|---|---|
| **Integration** | **B−** | the `LadderEvent` reducer + engine compute layer are **exported-only — no app caller yet**. This is the single biggest honest gap. |
| **Math** | **A−** | the C1–C6 corrections all landed and the audit confirms the invariants. |
| **Tests** | **A** | full gate green across the specced backlog; INV-1 and the projection-leakage test pass. |
| **Safety** | **A−** | no money/secret/prod path touched; `canPublishProjections` and all priced flags confirmed OFF; Slice 0 ran first and is blocking. |
| **Revenue** | **A−** | the $49/yr Fantasy loop is verified end-to-end real, one owner punch-list from live. |

### 4.2 What is built (≈28 slices, all SHADOW / `priced=false` / flagged-off, gate-green)

- **The Core (L1–L6):** feature-store seam + opp-adj EPA (B1); player-rate posteriors with published shrinkage (B2); market-anchored reconciliation conserving yards & TDs (B3, **C1 applied**); cross-player copula (C6, **C6 applied**); earned-weight Hedge ensemble with Clark–West + bounded loss (B4, **C5 applied**); Adaptive Conformal Inference, Mondrian-by-position (B5, **C2 applied**); self-publishing calibration *criteria* — defines, does not flip (B6).
- **The 5 Frontier modules:** opportunity/role-migration (C2-slice), game-script (C3-slice), breakout/regression "Mirage & Buried / The Receipt" engine (C1-slice), injury/return + role-tenure with the deliberate Cox reuse (C4-slice), and the divergence layer unifying them into 3 shadow queues (C5-slice).
- **The 6 Addendum mechanisms:** prop-anchor triangulation (D1), distribution pricing (D2), model parliament feed — flagged off (D3), replayable provenance + route — flagged off (D4), community tournament scaffold — draft-only (D5), uncertainty-map active learning — review-queue only (D6).
- **The spine + cost seams:** `LadderEvent` ledger + `reduceLadder()` + two-track `RUNG_REQUIREMENTS` with INV-1 passing (A1, Prisma model added but **not migrated**); the settled-game heartbeat fan-out as a pure stub (A2); the historical replay/backtest harness with purged/embargoed walk-forward + Clark–West (E1); reliability-diagram reporting (E2); the persist-what-we-fetch cost seam (F1) over the shipped Phase-0 cost controls.

### 4.3 What is SHIPPED (independent of the branch, on the primary product)

The betting engine (13-component additive confidence, Shin de-vig + median consensus, Edge Index, GSE Score, `MODEL_VERSION v5.0.0`); the calibration harness (isotonic/PAVA + Brier + Murphy + ECE) and CLV + Wilson + integrity ledger; `model-freeze.mjs` + Model Court governance; the season-long fantasy projection on real nflverse data (CC-BY-4.0); and the **$49/yr Fantasy revenue loop, verified end-to-end real** (Stripe wiring → webhook tier-map → checkout → FANTASY entitlement → Best Ball engine).

### 4.4 This session's fixes and the open work-order

**Fixed on-branch this session (pending one gate re-run before merge):**
- ✅ **Conformal coverage bug** — `conformal-intervals.ts` + `tweedie-aci.ts` now use the split-conformal `(n+1)` finite-sample order statistic, so "calibrated" intervals are no longer systematically too narrow on small samples. Verified by hand against both test files (the change only widens intervals; existing assertions hold).
- ✅ **Backtest driver stood up** — `scripts/backtest/player-projection-backtest.ts` is real and runnable: fetches real nflverse weekly stats, builds leakage-safe trailing features, runs the engine's purged/embargoed walk-forward + Clark–West harness, prints an OOS report. **Written but not yet run** (the Linux sandbox VM was down this session). One command produces the verdict:
  `NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023`
- ✅ **Tweedie truth-in-labeling** — an honesty note was added (comment-only) forbidding any public surface from calling `fitTweedieBaseline` a fitted Tweedie GLM until the deviance gradient is wired.

**Open work-order for Codex (each: one additive, flagged, tested commit; full gate green; nothing priced/published):**
1. **Tweedie truth-in-labeling, finished** — implement the real Tweedie deviance gradient, or rename the export to `boostedLog1pBaseline` and scrub the INTEL_01 banner; no false "Tweedie" claim may reach a public surface.
2. **Reconciliation yard coherence** — split the single merged yard pool into pass/rush/receiving pools (use the C3 game-script split), conserve each separately, then derive fantasy points. Keep `priced=false`.
3. **Gate the leaky readiness endpoints** — ADMIN-gate `airwave/*`, `media/readiness`, `health/synthetic-monitoring`; rate-limit the open `human/*` + `sleeper/league` reads (payloads are booleans/counts, low severity, but they should match the `cockpit/*` ADMIN gating).
4. **Doc the launch switch** — add `PROJECTIONS_PROVIDER` + `STRIPE_FANTASY_*` to both `.env` templates; add the Fantasy tier to the `VALUE_TIERS` strip.
5. **Activation wiring (close the B− gap)** — wire the `LadderEvent` reducer + heartbeat in **shadow** (logs vs. env flags, changes nothing) and surface the divergence/parliament/uncertainty readouts on the observatory behind their off-flags — real activation, no truth-claim flipped.

### 4.5 The honest gaps worth naming (from the integration matrix)

The corpus is exceptionally well-integrated and Codex executed the entire specced backlog; what remains is overwhelmingly *deliberate gating*, not dropped work. The few true items to track:
- **O-4 (highest-value true orphan):** the **PAST_DUE entitlement grace-leak** — the advisory flags that PAST_DUE appears to drop straight to FREE instead of the documented 7-day grace. It is a *live revenue-integrity bug* named once and never re-tracked. Needs an entitlements slice + regression test.
- **O-8 / O-9 / O-10:** the B− app-caller wiring, the yard-pool split, and the endpoint hardening — correctly queued in the handoff (= work-order items 5/2/3 above), not yet executed.
- **I-1 (most material inconsistency):** the **Tweedie label** — acknowledged but not fully propagated; a reader of INTEL_01 alone would believe a fitted Tweedie ships. Resolved by work-order item 1.
- **I-3:** residual "guaranteed coverage" phrasing still lingers in the INTEL_01 L5 *body* (the banner and build correctly use ACI) — scrub to the "tracks the target rate" framing.
- Larger uncoded design blocks deferred by design: the 9-step rating-system estimator ladder (Elo/Glicko-2/SRS/Massey/Bradley-Terry/Dixon-Coles — only opp-adj EPA exists), the market-read upgrades (alt de-vig cross-check, steam/RLM detectors), and the `/intelligence-ledger` public changelog page (its data feeds exist; the page does not).

**Integration grade: A− (corpus internal) / B (corpus → shipped reality).** Close O-4/O-8/O-9/O-10 and propagate I-1/I-3, and the pairing moves to A−/A−.

---

## 5. The decisions

**One line:** *Open the revenue product today (it's real); earn the engine's flip with the backtest this week (it's fast); fix what the review caught (one's done, the rest is a tight work-order) — and never publish a number you can't prove, because that honesty is the entire company.*

1. **The revenue product opens NOW.** The $49/yr Fantasy tier runs on cleared facts (real nflverse season-long data), needs **zero shadow flags lifted**, and is verified end-to-end. It is gated only by an **owner Stripe punch-list** (config, not code): create the live `STRIPE_FANTASY_*` prices ($4.99/mo · $49/yr), set live Stripe keys, register the `/api/webhooks/stripe` webhook, set `NEXT_PUBLIC_APP_URL`, confirm `PRICING_PHASE=FOUNDING`, and (optionally) set `PROJECTIONS_PROVIDER` for the real graded pool. Until step 1, checkout returns a clean 503 — it does not crash. This is the money this week, during perishable peak draft season.

2. **The engine earns its public flip via the backtest — honest and fast.** Flipping `canPublishProjections`/`priced=true` *now* would publish forecasts unvalidated on real data under a "calibrated/proven" label — the exact tout behavior the brand is built against, and a breach of the `model-freeze`/`trust-gate` guardrails. The shadow flags are not bureaucracy; **they are the product.** The honest path is one backtest: load real nflverse (1999+) into the already-built replay harness, run purged + embargoed walk-forward, produce the Clark–West report vs. the baseline. *If it beats the market OOS* → author the calibration proposal, flip with the evidence in hand, launch the headline. *If it doesn't* → you just avoided shipping numbers that don't work; iterate the model, not the marketing. (First bar is "beats naive points-persistence"; "beats the Vegas market" needs historical player props, a `[DATA]` follow-up.)

3. **Nothing is priced or published on faith.** Promotion of any layer or signal runs the shadow → backtest → Model Court → priced path, accompanied by a `MODEL_VERSION` bump + an `IMPLEMENTED` `CalibrationProposal` artifact. Codex may author only **DRAFT** proposals; flipping to `IMPLEMENTED`, bumping the version, and flipping the publish/price gates are **human-only** actions.

---

## 6. The 80-day path to kickoff (Sept 9)

**The arc in one spine:** monetize draft season now on what's true (season-long projections + Best Ball), and use the runway — including preseason as a *live dress rehearsal, not model calibration* — to legitimately earn the weekly-projection headline for a loud launch behind a claim no competitor can fake.

| Milestone | Window | Goal | Gate class |
|---|---|---|---|
| **M0 — Soft-launch live** | Jun 23–26 | Revenue loop on, real data, first 5–25 Fantasy subs; checkout conversion measured | `[OWNER]` Stripe punch-list |
| **M1 — Draft-season harvest** | Jun 27–Jul 11 | Best Ball value-board polish + honest pricing comparison + social proof; 25–60 cumulative subs | builds on M0 |
| **M2 — Pre-commit the weekly model** | Jul 12–Aug 1 | Freeze `weekly-model.ts`; write immutable pre-game projection rows; pre-declare the MAE/Brier bar | `[DATA]` capture pipeline |
| **M3 — Oracle/R2 cutover *iff* it pays for itself** | Aug 1–8 | Move always-on work off metered serverless only if volume justifies; else **defer** | `[INFRA]` (spend-triggered) |
| **M4/M5 — Preseason dress rehearsal** | Aug 6 (HOF) → Aug 28 | Exercise the commit→score→publish *plumbing*; **the real accuracy evidence comes from the historical harness, not preseason** (rigor-pass C3) | `[DATA]` |
| **M6 — Land the keystone** | by Sep 5 | Author the `IMPLEMENTED` CalibrationProposal, bump `MODEL_VERSION`, flip `canPublishProjections` — *only if the bar is cleared* | `[DATA]` + `[OWNER]` |
| **M7 — Sept 9 ribbon-cutting** | Sep 9 | Loud launch behind "publicly backtested, calibration-frozen weekly projections" | depends on M6 |
| **M8 — In-season Frontier rollout** | post-launch | Each module via freeze → backtest → clear (already built as shadow, ahead of schedule) | per-module DRAFT proposal `[DATA]` |

**The single ordering principle:** everything *pure and cleared* (L1, L2, the L3 allocation math, L4/L5 code) is built **before** kickoff so it is ready the moment outcomes settle; everything that is an **accuracy/coverage claim** (the L4 gate, L5 coverage, L6 publish, the `canPublishProjections` flip, any priced betting graduation) is **gated on settled data + Model Court** and fills in across the season — honest and small-`n` first, then promoted as the evidence earns it.

**The standing human gates** (built as injected seams; the *flip* is an explicit human action): `[OWNER]` — merge/deploy, live money, Stripe price creation, pricing-rung flips, public-feed enablement. `[INFRA]` — provision R2/DuckDB stores, durable hash-chain/tournament/trace stores, Oracle VPS, CDN rollout. `[DATA]` — load real historical rows, learn coefficients, produce Clark–West reports, bump `MODEL_VERSION`, approve promotions (**the single most impactful next action**). `[SCHEMA]` — generate/review/apply the `LadderEvent` migration (Prisma model exists, never migrated). Standing flags never flipped by code and confirmed OFF: `canPublishProjections`, `PROJECTIONS_PROVIDER`, `PERFORMANCE_STATS_ENABLED`, `PUBLIC_PICKS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, `CALIBRATION_ADJUSTMENTS_ENABLED`.

**Explicitly NOT now** (decisiveness is the point): real-money contests/DFS (founder + legal gated), CV/broadcast charting (counsel-gated), deep-learning/foundation models (sample too small — the Atlas is firm), multi-sport, the coverage-map UI, email *sending* (capture addresses now; `draft-only.mjs` blocks sends structurally), and the full R2 lake before launch.

---

## 7. Reading map — this Dossier is the front door

Read this Dossier first. Go to a companion only for depth on its subject. **Precedence: `GSE_INTEL_00_RIGOR_PASS` > the corrected briefs (`CODER_KICKOFF`, `CODEX_AUTONOMOUS_EXECUTION`) > the companion design docs (`INTEL_01–05`, advisory, atlas).**

**Corrections & current status (authoritative / freshest)**
- `GSE_INTEL_00_RIGOR_PASS.md` — the adversarial self-audit: the nine defects, the six corrections (C1–C6) with corrected math, the pre/post grades. **Authoritative where anything conflicts.**
- `GSE_GO_DECISION.md` — the 5-lens review verdict + the open/done work-order; the "open the revenue product, earn the engine flip" decision.
- `GSE_BACKTEST_AND_FIXES_STATUS.md` — exactly what changed on-branch this session, the one command to run the backtest, the one command to verify.
- `GSE_INTEGRATION_MATRIX.md` — every idea mapped to its home and real build status; the orphans (O-1…O-10) and inconsistencies (I-1…I-8). The fear-killer.

**The intelligence design (deep dives)**
- `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md` — the thesis + the brain in one read (the headline companion).
- `GSE_INTEL_01_CORE_ARCHITECTURE.md` — the six-layer Core with full math, data contracts, tests, and the 80-day build order (corrections folded into the body; note the I-3 residual-phrasing cleanup is still pending).
- `GSE_INTEL_02_FORECASTING_FRONTIER.md` — forecast what *moves* points: opportunity/role, injury/return, game-script, regression, divergence.
- `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md` — the settled-game heartbeat, the `LadderEvent` spine in schema, cost-as-weapon.
- `GSE_INTEL_04_80DAY_SEQUENCE.md` — the milestone-by-milestone launch plan (read its keystone through the C3 correction: historical harness, not preseason).
- `GSE_INTEL_05_FRONTIER_ADDENDUM.md` — the six rarer mechanisms + the honest novelty ledger.

**Strategy & method**
- `GSE_EXECUTIVE_ADVISORY_PASS.md` — the 8-lens panel review of every section + the Master "Top Moves" backlog.
- `GSE_FORECASTING_METHODOLOGY_ATLAS.md` — 177 forecasting methods (169 betting + 8 fantasy-native distributional/allocation), each rated for GSE with an integration path.

**Execution & visual**
- `GSE_CODER_KICKOFF.md` — the one operational page: Day-0 gate, first commits, per-commit rule.
- `GSE_CODEX_AUTONOMOUS_EXECUTION.md` — the self-driving brief for the coding agent (hardened per INTEL_00).
- `GSE_CLAUDE_HANDOFF_PROMPT.md` — the standing handoff prompt + human-gate list.
- `GSE_intelligence_flywheel.svg` — the architecture diagram.

*The coder also generates, during the build, `docs/SURFACE_AUDIT.md`, `docs/DECISIONS_TO_RATIFY.md`, `docs/CLAUDE_HANDOFF.md`, and `docs/EXECUTION_LEDGER.md` — that is how progress is watched.*

---

*This Dossier reflects the corpus as of 2026-06-24. It is the integrated source of truth; the rigor pass (`GSE_INTEL_00`) remains the authority on any conflict. The loop does not stop — build, red-team, correct, push further.*
