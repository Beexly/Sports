> Companion deep-dive to **GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md** · Galaxy Sports Edge · 2026-06-23

# GSE INTELLIGENCE CORE — The Glass-Box Forecasting Brain

> ✓ **Rigor-pass corrections are now integrated into the body of this document.** The red-team fixes from `GSE_INTEL_00_RIGOR_PASS.md` (C1–C6, provenance) have been folded into the affected layer sections directly — you do not need this banner or INTEL_00 to read the correct version. In summary: L3 conserves **team yards and TDs** (fantasy points are a *derived* output of the scoring formula), with the new cross-player correlation/copula layer (**L3.5**, QB–WR ≈ 0.5) sitting between allocation and the ensemble; L4's "beats the market" gate uses the **Clark–West** test for nested models with a **bounded loss** feeding the Hedge regret bound; L5 uses **Adaptive Conformal Inference** (Mondrian-by-position, rolling recalibration) with the honest "tracks the target rate" framing; the base estimator for the *derived* fantasy-point total is **gradient-boosted Tweedie**, honestly labeled a **Tweedie-flavored scaffold** until the deviance gradient is wired and the power parameter `p∈(1,2)` is calibrated — never claimed as a fitted Tweedie before then.

**Status:** Architecture spec, design-against-real-repo. Branch reference `claude/sweet-fermi-sk9gws`.
**Author role:** Chief Forecasting Architect.
**Scope:** The layered forecasting stack that turns GSE data into calibrated, uncertainty-quantified projections that publish their own track record — buildable by a solo founder on R2/DuckDB/Neon over ~80 days, kickoff Sept 9 2026.

---

## THESIS — Why this is defensibly smarter than PFF / ESPN / the field

PFF and ESPN ship a **single point number** with a brand attached — "WR1, 14.2 points" — and ask you to trust the logo. They are black boxes; they publish no interval, no coverage guarantee, no audited error history, and they do not anchor to the betting market that actually clears money. GSE inverts all four. Every published number is (1) **a distribution, not a point** — a posterior with an *adaptive* conformal interval whose coverage **tracks the target rate over time** (90% of true outcomes land in the published 90% band, distribution-free, with the quantile level recalibrated online so coverage holds under in-season distribution shift rather than assuming the season is exchangeable); (2) **honest about small samples** — six NFL games of target share is not a rate, so we shrink every player rate toward a position/archetype prior via empirical-Bayes, and we *say* how much we shrank; (3) **market-anchored** — we take the Vegas implied team total, decompose it into the **team yards and team TDs** it implies, and allocate *those physical quantities* across the roster by usage/efficiency, so our bottom-up usage model is forced to reconcile with the sharpest probability estimate on Earth in matching units (fantasy points fall out as a derived total), and the *gap* between bottom-up and allocated becomes the explicit edge signal; and (4) **self-grading** — we commit each projection cryptographically before kickoff and publish the settled MAE-by-position, interval coverage vs nominal, and rank-correlation against a market baseline, on a public reliability page. The moat is not a secret model. The moat is **the only fantasy projection in the world that publishes its own calibration and beats a market baseline out-of-sample to earn the right to be priced** — a claim a competitor cannot copy without also exposing their error history, which they will never do. Transparency + uncertainty + market-anchoring + self-published calibration is a compounding trust asset; it is the betting platform's proof engine and the fantasy product's differentiator running on **one** pipeline.

---

## THE SPINE (one sentence per layer)

```
FEATURE STORE (L1)  →  PLAYER RATE POSTERIORS (L2)  →  MARKET-ANCHORED ALLOCATION (L3)
        →  CROSS-PLAYER CORRELATION / COPULA (L3.5)  →  EARNED-WEIGHT ENSEMBLE (L4)
        →  ADAPTIVE CONFORMAL INTERVALS (L5)  →  SELF-PUBLISHING CALIBRATION (L6)
```

L1 builds the shared, clearance-gated feature store. L2 turns thin per-player counts into honest posterior *distributions* by shrinking to archetype priors. L3 is the keystone: it decomposes the market's team-total into expected **team yards and TDs**, pours *those physical quantities* into the roster through the L2 posteriors so bottom-up usage and top-down market reconcile (fantasy points are the derived output), and the residual becomes the edge signal. L3.5 couples the per-player marginals with a Gaussian copula so QB–WR and game-stack correlations are honored — the layer that makes best-ball, DFS stacking, and parlay construction correct. L4 blends estimators by weights they *earned* out-of-sample. L5 wraps the blended number in a distribution-free *adaptive* interval. L6 commits each projection pre-game, scores it post-game, and publishes the reliability that makes the whole claim true. The same L3 residual that feeds fantasy buy-low/sell-high is the betting Edge Index; the same L6 harness that calibrates fantasy is the L6 that already gates `MODEL_VERSION` on the betting engine. **One brain, two products.**

---

## ARCHITECTURAL INVARIANTS (inherited from the real repo — never violated)

1. **GSE Score stays a ranking index, not a win probability.** `gseScore = round(confidence × M)`, `M = 0.80 + 0.20·P`. Nothing in this Core is allowed to relabel it as P(win). (`packages/prediction-engine/src/scoring.ts`, the additive 13-component `confidence`.)
2. **Calibration is evidence-only and human-gated.** `lib/calibration/compute.ts` produces buckets + Brier + proposals; it *never* mutates weights. Promotion requires a `MODEL_VERSION` bump, which `scripts/guardrails/model-freeze.mjs` blocks unless a matching `IMPLEMENTED` `CalibrationProposal` artifact exists.
3. **`canPublishProjections=false` is a hard wall.** Weekly fantasy projections (`lib/projections/weekly-model.ts`) stay illustrative until cleared. Player-derived signals may NOT enter the *priced* betting confidence or *published* weekly numbers until they pass the shadow→backtest→Model Court→priced path (§10) with a projection-leakage test.
4. **Every GSE output is a `derived_signal` carrying a stat-commandment envelope** `{source, timestamp, definition, weakness}` (`data-rules.ts`). The Core's posteriors and residuals are GSE outputs; they carry the envelope.
5. **Source-of-truth ordering:** structured market odds (Odds API, Shin de-vig + median consensus) > cleared nflverse derived metrics > model posteriors. The market is never overridden silently; it is *reconciled against* and the divergence is *disclosed*.
6. **No isotonic recalibration below n=100 settled, and only when ECE does not worsen.** Below n=100 the small-sample bridge (Platt/beta) carries the load (L6).

---

## DATA-FLOW DIAGRAM (the one picture)

```
                         ┌──────────────────────── EXTERNAL / LICENSED ───────────────────────┐
                         │  nflverse (CC-BY-4.0)   Odds API (spreads/totals)   ESPN public      │
                         │  pbp + rosters + snaps   Vegas team totals           Open-Meteo (wx)  │
                         └───────┬───────────────────────┬──────────────────────────┬───────────┘
                                 │                        │                          │
                                 ▼                        │                          │
   ┌──────────────────────────────────────────────┐      │                          │
   │ L1 FEATURE STORE  (lib/metrics/*, R2 Parquet) │      │                          │
   │  opp-adj EPA/SR · CPOE · WOPR/tgt-share ·      │      │                          │
   │  air-yards/aDOT · PROE/pace · RZ usage         │      │                          │
   │  → DuckDB views → Neon serving subset          │      │                          │
   └───────────────┬──────────────────────────────┘      │                          │
                   │ features (typed FeatureRow)          │                          │
                   ▼                                      │                          │
   ┌──────────────────────────────────────────────┐      │                          │
   │ L2 PLAYER RATE POSTERIORS                      │      │                          │
   │  empirical-Bayes shrinkage to archetype prior  │      │                          │
   │  Beta-Binomial (shares/rates) + Normal-Normal  │      │                          │
   │  (efficiency) → posterior mean + variance      │      │                          │
   │  lib/rates/player-rate-posterior.ts            │      │                          │
   └───────────────┬──────────────────────────────┘      │                          │
                   │ RatePosterior{mean,var,shrinkage}    │                          │
                   ▼                                      ▼                          │
   ┌──────────────────────────────────────────────────────────────────┐             │
   │ L3 MARKET-ANCHORED RECONCILIATION  (THE KEYSTONE)                  │◀────────────┘
   │  market(total,spread) → expected TEAM YARDS + TEAM TDs             │   weather/context
   │  → allocate yards & TDs by usage/efficiency posteriors             │   as multipliers
   │  → CONSERVE yards & TDs (Σ recYds=passYds_team; Σ TD=teamTD)        │   (band-only)
   │  → fantasy points = scoring_formula(yards, TDs, rec)  [derived]    │
   │  → MARKET_MINUS_MODEL DIVERGENCE = bottom-up − allocated           │
   │  lib/projections/market-anchored.ts                                │
   └──────┬───────────────────────────────────────────────┬───────────┘
          │ per-player marginals (allocated)               │ divergence signal
          ▼                                                ▼
   ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────┐
   │ L3.5 CROSS-PLAYER CORRELATION (COPULA)        │  │  FANTASY: buy-low/sell-high       │
   │  Gaussian copula over the marginals           │  │  (weekly-model.ts, gated)         │
   │  QB↔WR ≈ 0.5, RB↔team-pass < 0, stack via tot │  │  BETTING: Edge Index candidate    │
   │  → JOINT samples for best-ball / DFS / parlay │  │  (shadow only until §10 clears)   │
   │  lib/projections/correlation.ts               │  └──────────────────────────────────┘
   └───────────────┬──────────────────────────────┘
                   │ marginals + joint samples
                   ▼
   ┌──────────────────────────────┐
   │ L4 EARNED-WEIGHT ENSEMBLE     │
   │  Hedge / mult-weights over    │
   │  {market-anchored, bottom-up, │
   │   opp-adj-EPA, baseline}      │
   │  weights ∝ exp(−η·cumloss)    │
   │  Clark–West gate (nested),    │
   │  bounded loss for Hedge       │
   │  lib/ensemble/hedge.ts        │
   └───────────────┬──────────────┘
                   │ blended point μ
                   ▼
   ┌──────────────────────────────────────────────┐
   │ L5 UNCERTAINTY  (adaptive conformal)           │
   │  split/Mondrian-by-position nonconformity      │
   │  + ACI online quantile recalibration           │
   │  → [lo, hi], coverage TRACKS target 1−α         │
   │  GARCH/quantile option for vol                 │
   │  lib/uncertainty/conformal.ts                  │
   └───────────────┬──────────────────────────────┘
                   │ Projection{point, lo, hi, coverageTarget}
                   ▼  (PRE-GAME COMMIT: SHA-256 receipt + Merkle slate)
   ┌──────────────────────────────────────────────┐
   │ L6 CALIBRATION + SELF-PUBLISHING               │
   │  extend lib/calibration/compute.ts +           │
   │  lib/tracker/clv.ts  →  reliability artifact    │
   │  MAE/pos · coverage vs nominal · rank-corr ·    │
   │  Brier/log-loss (prob outputs) · vs market      │
   │  → public /observatory/projections page         │
   │  → canPublishProjections flip criteria          │
   └───────────────┬──────────────────────────────┘
                   │ settled evidence
                   ▼
        MODEL COURT + model-freeze.mjs  ──►  MODEL_VERSION v1→v2 (only with IMPLEMENTED proposal)
```

---

# LAYER 1 — FEATURE STORE (the shared derived-metrics factory)

**Purpose.** One clearance-gated, versioned, persisted feature store that both products and every downstream layer read from. It removes per-feature re-computation, makes features auditable, and is the single place clearance status is enforced. This generalizes the existing `lib/metrics/*` factory (slice 1 = `opponent-adjusted-epa.ts`, Gauss-Seidel, verified).

**Methods + real math.**

- **Opponent-adjusted EPA / Success Rate (shipped).** Two-way additive decomposition solved by Gauss-Seidel. For offense `o` vs defense `d` on play `i` with raw EPA `y_i`:
  `y_i = μ + off_{o(i)} + def_{d(i)} + ε_i`. Iterate
  `off_o ← mean_i∈o( y_i − μ − def_{d(i)} )`, `def_d ← mean_i∈d( y_i − μ − off_{o(i)} )`, re-centering `Σ off = Σ def = 0` each sweep until `max|Δ| < 1e-4`. Adjusted EPA for a unit = its solved `off`/`def` coefficient. (Already in repo.)
- **CPOE (Completion % Over Expected).** `CPOE = mean_i( c_i − p̂_i )` where `c_i∈{0,1}` is completion and `p̂_i` is modeled completion prob for that pass (depth, location, pressure as available). V1 `p̂` = league completion-rate lookup by air-yard bucket × location (logistic later, §Frontier).
- **WOPR / target share / air-yards / aDOT.** `target_share = team_targets_to_player / team_targets`; `air_yards_share = player_air_yards / team_air_yards`; `WOPR = 1.5·target_share + 0.7·air_yards_share`; `aDOT = player_air_yards / player_targets`.
- **PROE (Pass Rate Over Expected) / pace.** `PROE = pass_rate_actual − pass_rate_expected(down,distance,score,clock)`; `pace = sec_per_play (neutral situations)`; `seconds_per_play` and `plays_per_game` feed L3's team-total realism.
- **Red-zone usage.** `rz_target_share`, `rz_carry_share`, `rz_touch_rate = rz_touches / team_rz_plays` — the highest-signal TD-rate feature for L2.

**GSE files.**
- `apps/web/lib/metrics/` (extend the factory): `cpoe.ts`, `wopr.ts`, `air-yards.ts`, `proe-pace.ts`, `red-zone-usage.ts`, joining `opponent-adjusted-epa.ts`.
- `apps/web/lib/metrics/feature-store.ts` — the facade: `buildFeatureRows(season, week) → FeatureRow[]`, clearance-aware.
- Persistence: `data-lake/features/season=YYYY/week=WW/*.parquet` on **R2**; `lib/metrics/duckdb-views.sql` registers `read_parquet` views; a thin `lib/metrics/serving.ts` materializes the current-week subset into **Neon** for low-latency reads.

**Data contract (typed I/O).**
```ts
// INPUT: nflverse pbp + rosters + snaps (cleared), keyed by playerId/teamId/season/week
export interface FeatureRow {
  playerId: string; teamId: string; opponentId: string;
  season: number; week: number; position: "QB"|"RB"|"WR"|"TE";
  // counts (carry n for L2 shrinkage)
  targets: number; teamTargets: number; carries: number; teamCarries: number;
  rzTouches: number; teamRzPlays: number; airYards: number; teamAirYards: number;
  // rates / adjusted metrics
  targetShare: number; airYardsShare: number; wopr: number; aDOT: number;
  oppAdjEpaPerPlay: number; cpoe: number | null; routeRate: number | null;
  proeTeam: number; paceTeam: number; // team-level, joined
  clearance: "CLEARED" | "GATED";     // gate flag travels with the row
  source: "nflverse"; definition: string; weakness: string; fetchedAt: string; // stat-commandment
}
export type FeatureStore = ReadonlyMap<string /*playerId@week*/, FeatureRow>;
```

**Tests + promotion evidence.**
- Unit: each metric vs a hand-computed fixture (extend `metrics/__tests__/*`); Gauss-Seidel convergence + zero-sum invariant (already passing for EPA).
- Property: `Σ target_share over a team's players ≈ 1 (±ε)`; `WOPR ∈ [0, 2.2]`; no metric emitted for a `GATED` row used downstream of a `CLEARED` boundary.
- **Clearance gate:** a `feature-store.clearance.test.ts` asserts that any feature whose `clearance==="GATED"` cannot be read by a layer whose output `canPublish===true`. This is the L1 analogue of the betting `data-rules.ts` gate.
- Promotion: pure-function correctness only (no calibration needed — features are inputs, not predictions). Model Court not required for L1.

**Cost.** R2 Parquet (free egress) + DuckDB in-process (no server) + a Neon subset measured in MB. **~$0.** Full-season pbp is ~50–80 MB Parquet; weekly rebuild is seconds of CPU in CI.

---

# LAYER 2 — PLAYER RATE POSTERIORS (the single most important honesty upgrade)

**Purpose.** NFL is a *small-sample* sport: a WR has ~6–10 games, a slate of carries that wouldn't fill one MLB week. A raw "31% target share over 4 games" is mostly noise. **The single most important honesty upgrade in the Core** is to refuse to treat thin per-player counts as truth: shrink every rate toward a **position/archetype prior** by an amount proportional to how little we've seen, and emit a **posterior distribution** (mean *and* variance), never a bare point. This is *why* GSE can put an honest interval on a number that PFF can't — uncertainty is computed at the source, from sample size, not bolted on.

**Why this matters (stated plainly).** Without shrinkage, the projections that look most exciting are exactly the over-fit small-sample flukes — a back-up who scored on 2 of 3 red-zone carries reads as a 67% TD-rate monster. Shrinkage drags that toward the archetype's ~55% and *widens its band*, so the system is loud only when the data earns it. It is the mathematical implementation of "conflict is not confidence."

**Methods + real math.**

**(a) Beta-Binomial conjugate for SHARES and RATES** (target share, RZ-touch rate, TD-conversion rate — anything `successes / trials`).
Prior per archetype `a`: `Beta(α_a, β_a)` with mean `m_a = α_a/(α_a+β_a)` and prior strength `k_a = α_a+β_a` (the "pseudo-games" of confidence). Estimate `(m_a, k_a)` empirically from the archetype population by **method of moments** on observed rates `p_j` with trials `n_j`:
`m_a = Σ n_j p_j / Σ n_j`, and solve `k_a` from `Var_pop = m_a(1−m_a)/(k_a+1)` ⇒ `k_a = m_a(1−m_a)/Var_pop − 1` (empirical Bayes).
Player posterior given `s` successes in `n` trials:
`Beta(α_a + s, β_a + (n − s))`,
`posterior_mean = (α_a + s)/(α_a + β_a + n) = w·p̂ + (1−w)·m_a`, with **shrinkage weight** `w = n/(n + k_a)`.
`posterior_var = (α'β')/((α'+β')²(α'+β'+1))`.
*Interpretation:* with `n` small, `w→0` and the rate is basically the archetype prior (wide); with `n` large, `w→1` and it's the player's own rate (tight). `shrinkage = 1 − w` is published.

**(b) Normal-Normal / James-Stein for CONTINUOUS efficiency** (yards-per-route-run, EPA/play, aDOT — unbounded-ish quantities).
Prior `N(μ_a, τ_a²)` per archetype; player sample mean `x̄` from `n` obs with within-player sampling variance `σ²/n`. Posterior:
`posterior_mean = ( (1/(σ²/n))·x̄ + (1/τ_a²)·μ_a ) / ( 1/(σ²/n) + 1/τ_a² )`,
`posterior_var  = 1 / ( 1/(σ²/n) + 1/τ_a² )`.
Equivalently `posterior_mean = x̄ − B·(x̄ − μ_a)` with **James-Stein-style shrinkage factor** `B = (σ²/n)/(σ²/n + τ_a²)`. For the *positive-part James-Stein* multi-player estimator across a position group of `p≥3` players,
`θ̂_JS = μ_a + (1 − (p−2)σ²/Σ(x̄_j−μ_a)²)^+ · (x̄ − μ_a)`,
which dominates the raw MLE in total squared error — the formal guarantee that shrinkage *reduces* projection error, not just hedges it.

**(c) Dirichlet for a player's full usage simplex** (the share of team touches across the roster), used directly by L3:
team usage vector `~ Dirichlet(α_a,1 + c_1, …, α_a,K + c_K)` over `K` roster slots with observed touch counts `c_k`; posterior mean of slot `k` is `(α_k + c_k)/Σ(α_j + c_j)`. This gives a *coherent* set of shares that sum to 1 — exactly what the allocation step needs.

**(d) Tweedie for the DERIVED fantasy-point total** (the compound Poisson–Gamma family, the native distribution for fantasy points — a point mass at zero for "didn't play / didn't produce" plus a continuous right-skewed tail). This is the per-player *fantasy-point* estimator that sits on top of the conserved yards/TDs (L3 Step 2b); directly usable as `objective="tweedie"` in XGBoost/LightGBM. **Honesty label:** it is only a "fitted Tweedie" once the Tweedie **deviance gradient** is actually wired and the model is fit to data with a calibrated power parameter `p∈(1,2)`. Until that is done, any Tweedie-shaped output must be labeled a **Tweedie-flavored scaffold** (e.g. a Gamma- or lognormal-on-positives placeholder with a separate zero hurdle), never claimed as a fitted Tweedie. The data contract's `family` field below records which it is, so the distinction is auditable rather than rhetorical.

**Archetypes (the prior buckets).** Position × role: `WR_alpha, WR_slot, WR_field-stretcher, RB_bellcow, RB_committee, RB_passing-down, TE_inline, TE_move, QB`. Archetype assignment from cleared L1 features (route-rate, aDOT, snap share). Priors re-estimated each week from the season-to-date population (empirical Bayes is *adaptive*).

**GSE file.** `apps/web/lib/rates/player-rate-posterior.ts` (pure; dependency-injectable archetype-prior table for tests), `lib/rates/archetype.ts` (assignment), `lib/rates/empirical-bayes.ts` (MoM prior fitting).

**Data contract.**
```ts
export interface RatePosterior {
  playerId: string; metric: "targetShare"|"rzTouchRate"|"tdRate"|"yprr"|"epaPerPlay"|"fantasyPoints";
  family: "beta-binomial" | "normal-normal" | "dirichlet"
        | "tweedie-fitted" | "tweedie-scaffold"; // honest label: scaffold until deviance gradient is wired
  posteriorMean: number; posteriorVar: number;
  shrinkage: number;          // 1 − w ; how much we leaned on the prior (PUBLISHED)
  n: number;                  // sample the player actually has
  archetype: string; priorMean: number; priorStrength: number;
  source: "GSE-derived"; definition: string; weakness: string; // stat-commandment envelope
}
export function fitRatePosterior(row: FeatureRow, prior: ArchetypePrior): RatePosterior; // pure
```

**Tests + promotion evidence.**
- Unit: closed-form posterior matches hand-computed Beta/Normal values; `n=0 ⇒ posteriorMean===priorMean & shrinkage===1`; `n→large ⇒ shrinkage→0`.
- Monotonicity property: `shrinkage` strictly decreasing in `n`; `posteriorVar` decreasing in `n`.
- Calibration-of-the-prior: **back-test that shrunk rates predict next-week rates with lower MAE than raw rates** on held-out weeks (the honesty payoff, measured). This is the L6-style evidence required before L2 output feeds any *published* number.
- Promotion: because L2 changes nothing the user is *charged for* yet (it's an internal estimator), it ships behind the same `canPublishProjections` wall; surfacing it publicly requires the L6 reliability artifact.

**Cost.** Closed-form arithmetic over a few thousand player-weeks. Milliseconds. **~$0.**

---

# LAYER 3 — MARKET-ANCHORED RECONCILIATION (the keystone; one engine, two products)

**Purpose.** This is the idea that makes GSE structurally different and lets a single pipeline serve betting *and* fantasy. Take the **Vegas implied team total** (the sharpest point estimate of how many points a team will score, derived from the licensed Odds API spread+total), **decompose it into the physical quantities it actually predicts — expected team yards and team TDs —** and **allocate those quantities** across the roster using the L2 usage/efficiency posteriors. Fantasy points are then a *derived* output of the scoring formula, not the thing being conserved. Top-down market discipline × bottom-up usage detail. Then define **market-minus-model divergence** as the explicit edge signal feeding *both* the betting picks (Edge Index) and the fantasy buy-low/sell-high engine.

> **Why conserve yards and TDs, not fantasy points.** The Vegas team total is *expected points on the scoreboard* — a function of TDs and field goals. Fantasy points are a *different unit* (PPR + yardage). Summing player fantasy points to a scoreboard total is dimensionally meaningless, and a single `points-per-implied-point` scalar only hides that mismatch — the old "fantasy points sum to the team total" invariant would pass while proving nothing. The corrected design conserves the *physical* quantities the market actually implies (yards and TDs) and emits fantasy points downstream. A second payoff: divergence-vs-market is now computed in **matching units** — projected receiving yards vs. the receiving-yards prop, projected receptions vs. the reception prop — which is both correct and a cleaner per-stat edge signal than a fantasy-point-vs-points comparison ever could be.

**Step 1 — Decompose the market into a team environment (reuse the betting engine's de-vig).**
From Odds API, take median-consensus spread `S` (home-relative) and total `T` (Shin de-vig applied as in the picks engine). Implied team totals:
`TT_home = T/2 − S/2`, `TT_away = T/2 + S/2` (S negative ⇒ home favored ⇒ higher home total).
Map `TT_team` (scoreboard points) to **expected team TDs and expected team yards** via fitted historical relationships — points↔TD rate, points↔total yards, red-zone conversion — frozen per season. Split expected **team yards** into **pass yards** and **rush yards** using the game-script pass-rate forecast (`PROE/pace`, L1; `INTEL_02` Module 3): `passYds_team = yards_team · passRate`, `rushYds_team = yards_team · (1 − passRate)`. These per-team **yard and TD pools** — not a fantasy-point pool — are what the roster allocation must conserve.

**Step 2 — Allocate the physical units through posteriors (usage × efficiency, normalized).**
Allocate each pool by usage/efficiency posteriors, normalized over the players who share it:
- **Receiving yards:** `recYds_j = passYds_team · (E[targetShare_j]·E[aDOT_j]·E[catchRate_j]) / Σ_k(E[targetShare_k]·E[aDOT_k]·E[catchRate_k])`.
- **Rush yards:** `rushYds_j = rushYds_team · (E[carryShare_j]·E[YPC_j]) / Σ_k(E[carryShare_k]·E[YPC_k])`.
- **TDs:** `TD_j = teamTD · (E[rzUsage_j]·E[tdRate_j]) / Σ_k(E[rzUsage_k]·E[tdRate_k])`, split pass/rush/rec by role.
The optional temperature-`β` softmax (`β=1` ⇒ plain normalized shares) may sharpen or flatten the allocation weights before normalization. The QB's passing line is `Σ_j recYds_j` thrown (minus sack/scramble yardage). **By construction the physical quantities are conserved — `Σ_j recYds_j = passYds_team`, `Σ_j rushYds_j = rushYds_team`, `Σ_j TD_j = teamTD` — so the roster cannot drift away from what the market says the team will *do*, while no claim is made that fantasy points sum to anything.**

**Step 2b — Derive fantasy points as an output.**
Each player's fantasy projection is the scoring formula applied to his allocated physical line, e.g.
`proj_j = 0.1·rushYds_j + 0.1·recYds_j + 0.04·passYds_j + 6·rushTD_j + 6·recTD_j + 4·passTD_j + 1·rec_j`
(PPR weights; `rec_j = recYds_j / E[aDOT_j]·E[catchRate_j]`-derived reception count). The scoring constants are the only place the "points" unit appears, and they convert *from* conserved yards/TDs — never the reverse.

**Step 3 — Context as band-only multipliers (never as point inflators on thin evidence).**
Weather (Open-Meteo), opponent (opp-adj-EPA), environment (dome/altitude) enter as bounded multipliers `m∈[m_lo, m_hi]` (e.g. heavy wind caps deep-pass pool). Crucially, **availability widens the band but does not move the point** (mirrors the shipped `weekly-model.ts` rule): an unknown injury increases `posteriorVar`, not the mean.

**Step 4 — The edge signal (the payoff), computed in matching units.**
Run an *independent* bottom-up projection (L2 posteriors → raw expected **yards and TDs** per player, NOT constrained to the market). Define divergence **per physical stat**, not on fantasy points:
`DIVERGENCE_j^{stat} = stat_bottomup_j − stat_allocated_j` for `stat ∈ {recYds, rushYds, TD, rec}`.
- **Fantasy use:** large positive `DIVERGENCE_j^{recYds}` (or `^{TD}`) ⇒ our usage model thinks this player out-produces what the market's team environment implies the roster can support ⇒ **buy-low** candidate (market underrates his role); large negative ⇒ **sell-high**. The per-stat residual maps directly onto the matching player prop (receiving-yards prop, reception prop, anytime-TD), which is a sharper signal than any fantasy-point delta. This is the cleared, model-honest version of the `receiving-opportunity.ts` buy-low/sell-high signal.
- **Betting use:** aggregate the per-stat divergence across a team back to the *game* level — if the bottom-up roster's total yards/TDs exceed what the market total implies, the model disagrees with the total/spread → a candidate **OVER/UNDER edge** and a candidate input to player-prop edges. This is the bridge into the betting Edge Index — but it enters **shadow-only** and must clear §10 before it is ever *priced*.

**GSE file.** `apps/web/lib/projections/market-anchored.ts` — `allocate(teamEnv, posteriors[], context) → AllocatedProjection[]`, pure, dependency-injectable, where `teamEnv` carries the decomposed `{passYds, rushYds, teamTD}` pools (Step 1). Composes `weekly-model-loader.ts` (which already joins `loadExpectedPoints` + `loadPlayerModel` by `playerId`) and the Odds API consensus reader. The per-stat divergence feeds `weekly-model.ts` (fantasy, gated) and a new `lib/edge/divergence-signal.ts` (betting, shadow). The market→team-environment decomposition (points→yards/TDs, pass/rush split) lives in `lib/projections/team-environment.ts`.

**Data contract.**
```ts
export interface TeamEnvironment {                 // Step 1 output — the conserved pools
  teamId: string; impliedTeamTotal: number;        // scoreboard points (from Odds API de-vig)
  passYdsTeam: number; rushYdsTeam: number;        // expected team yards, split by game script
  teamTD: number;                                  // expected team TDs (points→TD-rate fit)
}
export interface MarketAnchorInput {
  env: TeamEnvironment;
  posteriors: ReadonlyArray<{ playerId: string; usage: RatePosterior; efficiency: RatePosterior }>;
  context: { passShareExpected: number; pace: number; weatherMult?: number; oppAdjMult?: number };
  scoring: "PPR" | "HALF" | "STD";                 // scoring weights for the DERIVED fantasy total
}
export interface AllocatedProjection {
  playerId: string;
  // conserved physical line (the invariants hold on these)
  recYds: number; rushYds: number; passYds: number; td: number; rec: number;
  fantasyPoints: number;                           // DERIVED via scoring formula (not conserved)
  // edge signal, per stat, in matching units
  divergence: { recYds: number; rushYds: number; td: number; rec: number };
  share: number; bandLo: number; bandHi: number;   // band widened by availability/var
  source: "GSE-derived"; definition: string; weakness: string;
}
export function allocate(input: MarketAnchorInput): AllocatedProjection[];
// invariants: Σ recYds === passYdsTeam ; Σ rushYds === rushYdsTeam ; Σ td === teamTD
```

**Tests + promotion evidence.**
- **Conservation invariants (the headline tests):** `Σ_j recYds === passYds_team`, `Σ_j rushYds === rushYds_team`, and `Σ_j td === teamTD` within float tolerance, for randomized rosters/posteriors. **Conservation is on yards and TDs — never on fantasy points.** A complementary test asserts that `fantasyPoints` equals the scoring formula applied to the conserved line (derived-output correctness), and that no test asserts fantasy points sum to the team total.
- Monotonic allocation: higher `E[targetShare]` ⇒ higher receiving-yard share; degenerate roster (one player) ⇒ player absorbs the whole pool.
- Divergence-sign correctness on fixtures (engineered buy-low/sell-high cases), checked **per stat** against the matching prop.
- **Projection-leakage test (critical, see §10):** assert that the *betting* divergence path is flagged `priced:false` and that no field of `AllocatedProjection` reaches a priced betting confidence component while `canPublishProjections===false`.
- Promotion to *priced/published*: requires the L6 reliability artifact (allocated MAE beats market-only and bottom-up-only OOS) **and** Model Court sign-off.

**Cost.** Reuses already-fetched Odds API data + L2 posteriors; pure arithmetic. **~$0.**

---

# LAYER 3.5 — CROSS-PLAYER CORRELATION (the copula layer; turns a fix into a product)

**Purpose.** Up to here every player is projected with his **own** marginal posterior — correct for a single-player number, but silently wrong for any product that depends on players *moving together*. QB–WR1 fantasy correlation is ~0.47–0.56; RB production correlates *negatively* with his own team's pass volume; two pass-catchers in a shootout rise together with the game total. Best-ball, DFS stacking, and parlay construction are *entirely* about this joint structure. L3.5 couples the L3 marginals with a **Gaussian copula** so the system can sample the **joint** distribution of a roster, not just the margins. This is the layer the frontier addendum's best-ball/parlay surfaces consume; it was missing from v1 entirely and is added here as a first-class part of the stack.

**Methods + real math.**

**Gaussian copula over the marginals.** Keep each player's L3 marginal `F_j` (the allocated posterior for his stat / fantasy line) exactly as-is — the copula does **not** touch the margins, only their dependence. Estimate a player-pair correlation matrix `Σ` empirically from cleared historical co-occurrences:
- QB ↔ his pass-catchers: positive (`≈ 0.5` for QB–WR1, decaying down the depth chart);
- RB ↔ own-team pass volume: negative;
- game-stack (any two players, opposing or same team, in a high-total game): coupled through the game total.
To draw a joint sample: draw `z ~ N(0, Σ)`, push each component through the standard normal CDF to a uniform `u_j = Φ(z_j)`, then invert each player's own marginal `x_j = F_j^{-1}(u_j)`. The resulting `(x_1,…,x_K)` preserves every marginal *and* the estimated correlation — exactly the input best-ball spike-week math, DFS lineup construction, and parlay leg-correlation all need. `Σ` is regularized (shrinkage toward a structured block matrix) so it stays positive-definite on thin samples, mirroring the L2 shrinkage philosophy.

**One covariance model, three products.** The same fitted `Σ` powers (1) best-ball *correlation of spike weeks*, (2) DFS *stacking* value, and (3) *parlay* leg correlation — extending the "one engine, many products" thesis from the point projection to the **risk** structure. A parlay of positively-correlated legs is correctly priced as riskier-but-higher-ceiling than the naive independent product would suggest; an anti-correlated hedge is correctly priced as safer.

**GSE file.** `apps/web/lib/projections/correlation.ts` — `fitCorrelation(history) → CovModel`, `sampleJoint(marginals[], cov, nDraws) → JointSample[]`; pure, dependency-injectable. Consumed by `bestball.ts`, the distribution layer (`INTEL_05` #4), and any parlay surface. It reads the L3 `AllocatedProjection` marginals and emits joint draws without mutating them.

**Data contract.**
```ts
export interface CovModel {
  players: readonly string[];                       // index order for Σ
  sigma: readonly (readonly number[])[];            // correlation matrix, PD after shrinkage
  pairsCited: ReadonlyArray<{ a: string; b: string; rho: number; basis: string }>; // e.g. QB-WR1 0.52
  source: "GSE-derived"; definition: string; weakness: string;                     // envelope
}
export interface JointSample { draw: number; values: Record<string /*playerId*/, number>; }
export function sampleJoint(
  marginals: ReadonlyArray<{ playerId: string; quantile: (u: number) => number }>,
  cov: CovModel, nDraws: number
): JointSample[]; // preserves each marginal; injects Σ dependence
```

**Tests + promotion evidence.**
- **Marginal-preservation invariant:** the empirical marginal of each player over the joint draws matches his input marginal (KS within tolerance) — the copula must not move the margins.
- **Correlation-recovery:** the realized sample correlation of the draws matches the input `Σ` within tolerance; PD-ness of `Σ` is asserted after shrinkage.
- Sign fixtures: QB–WR1 draws are positively correlated; RB–own-pass-volume negative.
- Promotion: best-ball/parlay surfaces consuming the joint stay gated behind the same `canPublishProjections` wall and (for any priced betting use) the §10 path; the copula itself is an internal estimator and ships behind that wall.

**Cost.** A Cholesky of a per-game `K×K` matrix (`K` ≈ roster size) plus `nDraws` samples — milliseconds. **~$0.**

---

# LAYER 4 — EARNED-WEIGHT ENSEMBLE + ONLINE LEARNING (the honesty gate)

**Purpose.** Combine the estimators — `{market-anchored (L3), bottom-up usage (L2), opponent-adjusted-EPA projection, simple baseline}` — with weights **earned** by out-of-sample performance, updated weekly. The rule that protects the brand: **the ensemble must beat both an equal-weight blend and a market-only baseline out-of-sample, or it does not ship.** No estimator is in the blend on faith; it is in the blend because it has paid for its weight in measured accuracy.

**Methods + real math.**

**Multiplicative-weights / Hedge (exponential weighting of experts).** Experts `e∈E`. After each settled week, expert `e` incurs loss `ℓ_e,t` (per-position MAE, or pinball loss for the interval, or Brier/CLV for any probabilistic output). **The loss fed to Hedge must be bounded** — the regret guarantee below holds only for losses in a known range `[0, B]`, and raw MAE is unbounded. We therefore feed Hedge a **bounded/normalized loss**: cap per-position error at a known max `B_pos` (a position-specific ceiling derived from historical residuals) and normalize to `ℓ̃_e,t = min(ℓ_e,t, B_pos)/B_pos ∈ [0,1]`, or use an inherently scale-free loss. (Brier and CLV-derived losses are already bounded; MAE/pinball are the ones that need capping.) Maintain cumulative loss `L_e = Σ_{τ≤t} ℓ̃_e,τ` and weight
`w_e,t = exp(−η · L_e) / Σ_{e'} exp(−η · L_{e'})`,
with learning rate `η = sqrt(8·ln|E| / T_horizon)` (the regret-optimal Hedge rate). The blended projection is the weight-weighted combination
`proj_blend = Σ_e w_e,t · proj_e`.
With the bounded loss, Hedge carries the standard guarantee: cumulative regret vs the best single expert is `O(sqrt(T·ln|E|))` — i.e. the blend is provably *almost as good as the best estimator we could have picked in hindsight*, without knowing in advance which one. (Quoting that bound against *unbounded* MAE, as v1 did, was unsound; the cap restores it.) CLV-earned weighting (for the betting side) replaces MAE loss with a CLV-derived loss so estimators that beat the closing line accrue weight.

**Walk-forward discipline (no leakage in weight-learning).** Weights at week `t` use only data settled `< t`. Weight evolution is itself evaluated with **purged + embargoed walk-forward CV**: when scoring, purge player-weeks whose outcome window overlaps the training window, and embargo a 1-week gap, so a player's own future never trains his present.

**"Beats the market" significance — Clark–West, not Diebold–Mariano.** The honesty gate asks whether market+player-signal genuinely beats market-only out-of-sample. The two models are **nested** (market-only is market+player-signal with the player coefficient zeroed), and the **Diebold–Mariano** test is *undersized* on nested models — it under-rejects and would let a truly-better model look insignificant (or, with the wrong sign convention, the reverse). Use the **Clark–West (2007)** adjusted test for nested forecast comparison: it corrects the MSE difference for the noise the larger model introduces under the null, so the comparison is correctly sized. Require a **minimum effect size** (not just `p<0.05`) and, as a robustness check, a paired **block-bootstrap** on the loss differential (blocks preserve week-to-week dependence). Only a Clark–West-significant, effect-size-meeting improvement sets `beatsMarketOnly=true`. The same machinery on the equal-weight comparison sets `beatsEqualWeight`.

**GSE file.** `apps/web/lib/ensemble/hedge.ts` — `updateWeights(experts, settledLosses) → Weights`, `blend(projections, weights) → number`; pure, deterministic given inputs. Weight state persisted append-only in Neon (`ensemble_weights` by week) and mirrored to the L6 artifact.

**Data contract.**
```ts
export interface ExpertProjection { expert: "market-anchored"|"bottom-up"|"opp-epa"|"baseline";
  playerId: string; point: number; }
export interface ExpertLoss { expert: string; week: number; position: string;
  loss: number; lossBounded: number; } // raw MAE|pinball|brier + the [0,1] bounded loss fed to Hedge
export interface EnsembleWeights { week: number; eta: number;
  weights: Record<string, number>; // sums to 1
  beatsEqualWeight: boolean; beatsMarketOnly: boolean;          // THE GATE flags
  clarkWest: { stat: number; pValue: number; effectSize: number }; } // nested-model test backing the gate
export function updateWeights(history: ExpertLoss[]): EnsembleWeights;   // Hedge, bounded loss
export function blend(ps: ExpertProjection[], w: EnsembleWeights): number;
```

**Tests + promotion evidence.**
- Weight-simplex invariant (`Σ w = 1`, `w_e ≥ 0`); a dominated expert's weight → 0 monotonically.
- Regret bound sanity: on synthetic streams **with bounded loss**, Hedge's cumulative loss ≤ best-expert loss + the theoretical `sqrt(T ln|E|)` slack; a test asserts the loss fed to Hedge is always in `[0,1]` (the cap is applied).
- **The honesty gate (blocks ship):** `beatsEqualWeight && beatsMarketOnly` over the holdout must both be `true`, where each is set by a **Clark–West**-significant, effect-size-meeting improvement (nested-model correct — a DM-based check is explicitly rejected). CI test asserts the gate and the Clark–West sign/size on a fixture; if either flag is false, the ensemble output cannot set `canPublish`.
- Promotion: this is where a *new* estimator earns entry — added as an expert, shadowed, and only counted once it has positive earned weight + clears the gate.

**Cost.** A handful of `exp()` per expert per week. **~$0.**

---

# LAYER 5 — UNCERTAINTY (adaptive conformal intervals that track the target rate)

**Purpose.** Wrap **every** published projection in a **distribution-free** interval whose coverage **tracks the target rate over time** — over a season, ~90% of realized outcomes fall in the published 90% band, with no Gaussian assumption and no model-correctness assumption. The honest framing matters: a finite-sample *marginal-coverage guarantee* holds only under **exchangeability**, and the NFL is not exchangeable — week-to-week and season-to-season distribution shift, role changes, and injuries make split-conformal coverage *drift*. So the claim is **adaptive coverage that converges to nominal**, recalibrated online, not a static guarantee. This is what makes "every number is a range" a defensible claim rather than a vibe, and it is the visible face of the L2/L3 uncertainty.

**Methods + real math.**

**Split conformal base (Mondrian, by position).** Hold out a calibration set `C` (settled player-weeks not used to fit the blend). For each calibration point compute the **nonconformity score** `r_i = |y_i − proj_i|` (absolute residual of the L4 blend). For a new projection at miscoverage `α` (e.g. `α=0.10` → 90% band), the base interval is
`[ proj − q, proj + q ]`, where `q = Quantile( {r_i}, ⌈(1−α)(|C|+1)⌉ / |C| )`.
Under exchangeability this gives `P( y ∈ [proj−q, proj+q] ) ≥ 1−α` — but exchangeability is exactly what we do **not** assume to hold across an NFL season, so this is the *base layer*, not the published guarantee. **Mondrian** = compute `q` *separately per position* (and optionally per archetype/usage-tier), because a TE's residual distribution is not a WR's. This yields *conditional-by-group* coverage, which is what an honest fantasy band needs.

**Adaptive Conformal Inference (ACI, Gibbs & Candès 2021) — the actual published mechanism.** Run ACI *inside each Mondrian (per-position) bin* with a **rolling recalibration window**: track realized coverage and adjust the effective miscoverage level online,
`α_{t+1} = α_t + γ·( α − err_t )`, where `err_t = 1{ y_t ∉ band_t }` is the realized miss at week `t` and `γ>0` is the step size.
When the band has been under-covering (too many misses), `α_t` shrinks and the band widens next week; when over-covering, it tightens. The guarantee ACI actually provides is the honest one we publish: **long-run realized coverage converges to `1−α`**, *without* assuming exchangeability — it tracks how the season is actually behaving. **Leakage rule (fixed from review):** the conformal calibration weeks must **not overlap** the ensemble-fit weeks — use separate, time-ordered folds, and the rolling ACI window is always strictly in the past of the point it wraps.

**Asymmetric / normalized variant.** Because fantasy outcomes are right-skewed (a ceiling game is a long tail), use **normalized nonconformity** `r_i = |y_i − proj_i| / σ̂_i`, where `σ̂_i` is the L2/L3 posterior-implied scale, then `interval = proj ± q·σ̂`. This makes the band *wider where the model itself is less sure* (high-shrinkage, unknown-availability players) — uncertainty that *travels from the source*.

**Volatility option (Frontier-adjacent, optional).** For line-movement / week-to-week variance, a **quantile-regression** head (pinball loss `ρ_τ(u)=u(τ−1{u<0})`) or a lightweight **GARCH(1,1)** on a player's residual series `σ²_t = ω + a·ε²_{t−1} + b·σ²_{t−1}` gives a heteroskedastic band when sample supports it; conformal stays the default because it needs no distributional commitment.

**GSE file.** `apps/web/lib/uncertainty/conformal.ts` — `fitConformal(calibrationResiduals, byPosition) → QuantileTable`, `updateAci(perPositionState, realizedMiss) → AciState` (the online `α_t` update), `wrap(point, position, sigmaHat) → {lo, hi, coverageTarget}`; pure.

**Data contract.**
```ts
export interface ConformalCalibration { position: string; alphaTarget: number; // nominal 1−α target
  alphaEff: number;          // ACI's current effective level (drifts to hold coverage)
  gamma: number;             // ACI step size
  q: number; nCalib: number; normalized: boolean; windowWeeks: number; } // rolling window
export interface IntervalProjection { playerId: string; point: number;
  lo: number; hi: number; coverageTarget: number; // e.g. 0.90 (the nominal we converge to)
  sigmaHat: number; method: "adaptive-conformal-mondrian"; }
export function wrap(point: number, cal: ConformalCalibration, sigmaHat: number): IntervalProjection;
```

**Tests + promotion evidence.**
- **Coverage test (the headline):** on a held-out season, *empirical long-run* coverage of the 90% band ∈ [0.88, 0.92] overall, and per-position ≥ 0.86 — i.e. ACI's realized coverage **tracks** the target. A second test injects a synthetic mid-season distribution shift and asserts ACI *recovers* coverage within a few weeks (a static split-conformal band would not). If long-run coverage does not converge to nominal, the layer cannot publish.
- Interval-width sanity: high-shrinkage players get wider bands than low-shrinkage (monotone in `sigmaHat`).
- Leakage guard: calibration weeks do **not overlap** ensemble-fit weeks, and the rolling ACI window is strictly in the past of each wrapped point (separate time-ordered folds).
- Promotion: coverage-tracking-within-tolerance is itself part of the L6 public artifact; a `MODEL_VERSION` bump that changes interval method requires a calibration proposal showing coverage did not worsen.

**Cost.** Quantile of a residual array per position per week. **~$0.**

---

# LAYER 6 — CALIBRATION + SELF-PUBLISHING (the layer that makes the whole claim true)

**Purpose.** Commit each projection **before** the game (cryptographic receipt), score it **after** (MAE by position, interval coverage vs nominal, rank-correlation, log-loss/Brier for any probabilistic output, all **versus a market baseline**), and **publish** the reliability. This is what earns the line *"the only fantasy projection that publishes its own calibration."* It extends the *existing* betting harness (`lib/calibration/compute.ts` + `lib/tracker/clv.ts`) so the fantasy and betting proof engines are the same machinery.

**Methods + real math.**

**Pre-game commitment (reuse the picks engine's proof).** At lock, serialize the slate's projections, hash with **SHA-256** into a per-projection receipt, fold receipts into a **Merkle root** committed before kickoff (identical to the GSE Score `P` provenance: pre-kickoff receipt + Merkle slate commitment + canonical/fresh data). This makes "we predicted X before the game" non-repudiable — the spine of the published track record.

**Post-game scoring (the metrics).**
- **MAE by position:** `MAE_pos = mean_i∈pos |y_i − proj_i|`; also RMSE and median-AE.
- **Interval coverage vs nominal:** `coverage = mean_i 1{ lo_i ≤ y_i ≤ hi_i }` vs target `1−α`; report the gap.
- **Rank correlation (does the *ordering* help lineups?):** Spearman `ρ` and Kendall `τ` between `proj` and `y` within position — the metric fantasy users actually feel (start the right guy), not just point error.
- **Brier + log-loss for any probabilistic output** (e.g. "P(player exceeds his prop"): `Brier = mean(p̂−o)²`; `LogLoss = −mean[o·ln p̂ + (1−o)·ln(1−p̂)]`; plus the **Murphy decomposition** (reliability − resolution + uncertainty) and **ECE**, exactly as the betting side already computes. Isotonic/PAVA recalibration applies only at **n≥100 settled with non-worsening ECE**; below that, **Platt/beta/temperature** is the small-n bridge.
- **Versus market baseline (the comparison that matters):** the same metrics computed for a *market-only* projection (allocate the implied **team yards and TDs** by naive depth-chart shares, no usage model, then derive fantasy points the same way). GSE must **beat market-only on MAE and rank-corr OOS** — established with the **Clark–West** nested-model test (§L4), since market-only is nested inside the full model — to claim edge. This is the analogue of CLV for fantasy.
- **CLV (betting side, existing):** `lib/tracker/clv.ts` keeps Closing-Line-Value + Wilson intervals; the fantasy artifact sits beside it under one reliability surface.

**The public artifact (`/observatory/projections`).** Contents:
1. Sample sizes (settled player-weeks) by position and overall.
2. MAE / RMSE by position, GSE vs market-only, with Wilson/bootstrap CIs on the difference.
3. Adaptive-conformal coverage achieved vs nominal (e.g. "90% band caught 89.4%"), by position, with the live coverage-over-time trace ACI produces (the calibration artifact no competitor publishes).
4. Rank correlation (Spearman/Kendall) by position, GSE vs market-only.
5. For probabilistic outputs: reliability diagram + Brier + log-loss + ECE + Murphy decomposition.
6. The current `MODEL_VERSION`, the Merkle root of the committed slate, and a link to the receipt — so the track record is *auditable*, not asserted.
7. Honest "still collecting" states (mirrors `compute.ts` note copy) wherever `n` is short.

**`canPublishProjections` flip criteria (the gate that turns the scarce paid layer on).** Flip `false → true` for weekly projections only when **all** hold, on a frozen holdout of ≥ a full season's worth of settled player-weeks (target `n≥300` per position group):
1. **Beats market-only OOS** on MAE *and* rank-correlation, by the **Clark–West** nested-model test with a minimum effect size (a DM-based or naive-CI check is insufficient — see §L4).
2. **Adaptive-conformal coverage tracks nominal** (90% band empirical long-run coverage ∈ [0.88, 0.92] overall, ≥0.86 per position, and ACI recovers coverage after an injected shift — see §L5).
3. **Ensemble honesty gate green** (`beatsEqualWeight && beatsMarketOnly` from L4, both Clark–West-backed).
4. **No clearance violation** (every contributing feature `CLEARED`; weekly-projection data rights cleared).
5. **Model Court sign-off** (prosecution + defense + falsifier + out-of-sample evidence + no calibration regression + owner approval).
6. **Artifact is live and honest** (the public page renders the above with real `n`, including shortfalls).
Until then, weekly stays `illustrative` exactly as `weekly-model.ts` ships today.

**GSE file.** Extend `apps/web/lib/calibration/compute.ts` with `computeProjectionCalibration(committed, settled) → ProjectionReliability` (MAE/pos, coverage, rank-corr, vs-market) and `lib/tracker/clv.ts` for the betting beside-by. New `lib/calibration/projection-commit.ts` (Merkle/SHA-256 reuse) and `app/observatory/projections/page.tsx` (public surface).

**Data contract.**
```ts
export interface ProjectionCommit { week: number; merkleRoot: string; modelVersion: string;
  items: ReadonlyArray<{ playerId: string; sha256: string; point: number; lo: number; hi: number; coverageTarget: number; }>; committedAt: string; }
export interface ProjectionReliability {
  byPosition: ReadonlyArray<{ position: string; n: number;
    maeGse: number; maeMarket: number; rmseGse: number;
    coverageAchieved: number; coverageTarget: number;
    spearman: number; kendall: number; beatsMarket: boolean; }>;
  prob?: { brier: number; logLoss: number; ece: number; murphy: { rel:number; res:number; unc:number } };
  sampleSize: number; modelVersion: string; merkleRoot: string;
  canPublishProjections: boolean; note: string; }
export function computeProjectionCalibration(c: ProjectionCommit, settled: SettledOutcome[]): ProjectionReliability;
```

**Tests + promotion evidence.**
- Commit/settle round-trip: a known fixture yields the hand-computed MAE/coverage/Spearman; Merkle root is deterministic and verifies.
- **`canPublishProjections` gate test:** the boolean is `false` unless every criterion above is satisfied on the fixture — and a single failing criterion (e.g. coverage 0.84) forces `false`.
- Beside-the-betting parity: the projection artifact and the CLV artifact share the same "evidence-only, human-gated, no silent recalibration below n=100" invariants (regression test against `compute.ts` thresholds).
- Promotion: this *is* the promotion machinery for the layers above it.

**Cost.** Arithmetic over settled rows + a Merkle hash. **~$0.**

---

# CROSS-CUTTING SPEC A — MODEL_VERSION + the calibration-proposal artifact (promoting v1→v2)

`scripts/guardrails/model-freeze.mjs` already blocks any `MODEL_VERSION` change (currently `v5.0.0` in `packages/prediction-engine/src/constants.ts`) unless a **matching `IMPLEMENTED` `CalibrationProposal`** exists — either a `seed.ts` row (`status:"IMPLEMENTED"`, `modelVersion` == new) or a `docs/calibration-proposals/<slug>.md` with front-matter `modelVersion: <new>` + `status: IMPLEMENTED` (or a `FROZEN.md` `frozen: <version>` baseline marker when no weights changed). The Core adopts the **doc-artifact** path for projection-engine promotions.

**To promote the Intelligence Core from v1 → v2, the artifact (`docs/calibration-proposals/core-v2.md`) must contain:**
1. Front-matter: `modelVersion: <new>`, `status: IMPLEMENTED`, `kind: WEIGHT_ADJUSTMENT|CONFIDENCE_SHIFT|THRESHOLD_CHANGE|FEATURE_DEPRECATION` (matching `CalibrationProposalKind`).
2. **Observation:** the settled evidence that motivated the change — bucket deltas (≥0.12 to qualify, per `computeCalibrationProposals`), MAE/coverage/rank-corr shifts, sample sizes (each bucket ≥30 per `MIN_BUCKET_SAMPLE`).
3. **Proposed change:** exact weights/thresholds/feature edits, diffed.
4. **Out-of-sample proof:** walk-forward (purged/embargoed) result showing the change improves the target metric on held-out data and **does not worsen ECE** (the non-worsening-ECE rule).
5. **Model Court record:** prosecution + defense + falsifier arguments and the owner approval.
6. **Coverage/no-regression statement:** for any L5 change, empirical coverage stayed within tolerance.
The guardrail is local-state-only: the working tree must carry **both** the new constant **and** the matching artifact, or CI fails the merge.

---

# CROSS-CUTTING SPEC B — Player features into BETTING confidence without breaking `canPublishProjections=false`

The wall: weekly projections are not cleared to publish, so a player-derived signal must not silently become a *priced* betting confidence component. The path (shadow → backtest → Model Court → priced) keeps the wall intact:

1. **Shadow.** A player-derived signal (e.g. L3 team-level divergence as an OVER/UNDER input, or a prop edge from `DIVERGENCE_j`) is computed and *logged* via the existing `signal-snapshot.ts` / `shadowEvidence` channel — it appears in `FactorDetail` with `impact:"neutral", weight:0` (exactly how `buildShadowEvidenceFactors` already injects shadow rows into `scoring.ts`). It influences *nothing* priced.
2. **Backtest.** Settle the shadow signal against outcomes + CLV. It must show out-of-sample lift (Brier/CLV) **and** that the *projection* it derives from clears its own L6 reliability — you cannot price a betting edge built on an uncalibrated projection.
3. **Model Court.** Full adversarial review: prosecution (overfit? leakage? rights?), defense, falsifier (what would prove it spurious?), out-of-sample evidence, no calibration regression, owner approval.
4. **Priced.** Only then does the signal graduate from `weight:0` shadow to a real weighted component, accompanied by a `MODEL_VERSION` bump + the §A calibration-proposal artifact.

**Projection-leakage test (CI, blocks merge).** `lib/edge/__tests__/projection-leakage.test.ts` asserts: while `canPublishProjections===false`, **no** field originating in `weekly-model.ts` / `market-anchored.ts` (allocated yards/TDs, derived fantasy points, per-stat divergence, bands) — nor any joint draw from `correlation.ts` — contributes nonzero `weight` to any priced `FactorBreakdown` component, and any such field present in scoring is flagged `impact:"neutral", weight:0`. The test walks the `FactorDetail[]` of a scored pick built with player signals present and fails if a gated field has nonzero weight. This is the structural guarantee that the wall holds even as the two products share a brain.

---

# BUILD ORDER OVER 80 DAYS (ranked; shipped → next commit → gated)

**Already shipped (the foundation the Core stands on).**
- Betting engine: 13-component additive confidence, Shin de-vig + median consensus, Edge Index, GSE Score `round(confidence×M)`, `MODEL_VERSION v5.0.0`. (`scoring.ts`, `constants.ts`.)
- Calibration harness (isotonic/PAVA + Brier + Murphy + ECE, n≥100/non-worsening gate) and CLV + Wilson + integrity-ledger. (`lib/calibration/compute.ts`, `lib/tracker/clv.ts`.)
- `model-freeze.mjs` guardrail + Model Court governance.
- L1 slice 1: `opponent-adjusted-epa.ts` (Gauss-Seidel, verified).
- Season-long fantasy projection live (`graded-pool.ts`, nflverse, CC-BY-4.0, `PROJECTIONS_PROVIDER`).
- L3/L5 scaffolds gated: `weekly-model.ts` (`projectWeekly`, availability widens band, `canPublishProjections:false`) + `weekly-model-loader.ts` (joins `loadExpectedPoints`+`loadPlayerModel` by `playerId`, DI for tests).

**Phase 1 — Feature store completion (Days 1–18). *Peak best-ball season — ship the features that power draft value now.***
1. **Next commit:** `lib/metrics/wopr.ts` + `air-yards.ts` + `red-zone-usage.ts` (highest fantasy signal, draft-relevant) → `feature-store.ts` facade → R2 Parquet + DuckDB views. (No data risk: all nflverse, cleared.)
2. `cpoe.ts` + `proe-pace.ts`. Persist current-week subset to Neon.
3. Tests: per-metric fixtures + team-share-sums-to-1 property + clearance gate test.
*Gate: none — pure cleared features. Unlocks L2.*

**Phase 2 — Player rate posteriors (Days 14–30).** *The honesty upgrade.*
4. `lib/rates/empirical-bayes.ts` (MoM prior fitting) + `archetype.ts` + `player-rate-posterior.ts` (Beta-Binomial + Normal-Normal + Dirichlet).
5. Back-test: shrunk rates beat raw rates on next-week MAE (the L2 evidence).
*Gate: feature store (Phase 1). Internal estimator — ships behind `canPublishProjections`.*

**Phase 3 — Market-anchored allocation + correlation (Days 24–45). *The keystone.***
6. `lib/projections/team-environment.ts` (market → expected team yards/TDs, pass/rush split) + `lib/projections/market-anchored.ts` `allocate(...)` conserving **yards and TDs** (fantasy points derived); wire the Odds API de-vig reader.
7. `lib/projections/correlation.ts` (L3.5 Gaussian copula over the marginals; QB–WR ≈ 0.5) for best-ball/parlay joint sampling.
8. `lib/edge/divergence-signal.ts` (betting, **shadow**) + feed per-stat `DIVERGENCE_j` into `weekly-model.ts` buy-low/sell-high (fantasy, gated).
9. Tests: **yards/TDs conservation invariants** (never fantasy-point sum) + derived-fantasy-point correctness, monotone allocation, copula marginal-preservation + correlation-recovery, **projection-leakage test**.
*Gate: L2 posteriors + Odds API (already licensed). Betting path is shadow-only until §10.*

**Phase 4 — Ensemble + adaptive conformal (Days 38–58).**
10. `lib/ensemble/hedge.ts` (multiplicative weights, **bounded loss**, purged/embargoed walk-forward) — **honesty gate** via the **Clark–West** nested-model test (`beatsEqualWeight && beatsMarketOnly`).
11. `lib/uncertainty/conformal.ts` (Mondrian-by-position split base + **ACI online recalibration**) — **coverage-tracking test** (incl. a mid-season-shift recovery test) in CI; calibration weeks non-overlapping with ensemble-fit weeks.
*Gate: L3 + ≥4 settled weeks of OOS data to learn weights and fit conformal residuals. **This is the first data-dependent gate** — accuracy claims need settled outcomes, which begin accruing after kickoff Sept 9.*

**Phase 5 — Self-publishing calibration (Days 52–72).**
12. `lib/calibration/projection-commit.ts` (SHA-256 + Merkle, reuse) + extend `compute.ts` with `computeProjectionCalibration` (MAE/pos, coverage, rank-corr, vs-market).
13. `app/observatory/projections/page.tsx` — the public reliability artifact (with honest "still collecting" states from week 1).
14. Wire the `canPublishProjections` flip criteria as an automated check.
*Gate: needs settled player-weeks to populate; the page ships in "collecting" state pre-data and fills in as the season settles.*

**Phase 6 — Promotion + the v1→v2 path (Days 66–80).**
15. First **Model Court** review of the Core's projection reliability; if criteria met on the season-to-date holdout, author `docs/calibration-proposals/core-v2.md` and flip `canPublishProjections` for the cleared layers.
16. If a player signal has earned its CLV/Brier lift in shadow, run the shadow→backtest→Model Court→priced graduation for **one** betting component, with the §A artifact + `MODEL_VERSION` bump.
*Gate: data sufficiency (`n≥300`/position group is the *target*; partial-season ships honest, smaller-`n`, wider-CI artifacts and holds the flip until thresholds are met) + Model Court + owner approval.*

**The single ordering principle:** everything that is *pure and cleared* (L1, L2, L3-allocation math, L4/L5 code) is built **before** kickoff so it is ready the moment outcomes start settling; everything that is an **accuracy/coverage claim** (L4 gate, L5 coverage, L6 publish, the `canPublishProjections` flip, any priced betting graduation) is **gated on settled data + Model Court** and fills in across the season — honest and small-`n` first, then promoted as the evidence earns it. The Core is *buildable now*; the *claims* turn on only when the math has paid for them.
