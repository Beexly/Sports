# Galaxy Sports Edge — The Intelligence Core & The Compounding Flywheel
### The brain, the moat, and the 80-day path to revenue — one thesis
**2026-06-23 · The headline document. Four deep-dive companions sit beside it: `GSE_INTEL_01_CORE_ARCHITECTURE`, `GSE_INTEL_02_FORECASTING_FRONTIER`, `GSE_INTEL_03_FLYWHEEL_LADDER_COST`, `GSE_INTEL_04_80DAY_SEQUENCE`.**

---

> ⚠ **Rigor pass applied — read `GSE_INTEL_00_RIGOR_PASS.md` first.** A hostile review corrected six material defects across this package: the market-anchor math (conserve **yards & TDs**, not fantasy points), **adaptive** conformal intervals (no false coverage guarantee), the launch keystone (**historical backtest now**, not preseason), a **two-track** proof ladder (fantasy MAE vs. betting CLV), a valid **Clark–West** model test, and a new **cross-player correlation** layer. `INTEL_00` is authoritative where it conflicts with the text below.

## The one decision

Everyone in this market forecasts the same thing — fantasy points, game winners — and sells you a number with no error bars and no track record. Galaxy Sports Edge wins by being the only forecaster that does three things at once and lets you watch:

1. **Anchors every prediction to the market** — the Vegas team total is the constraint, not a competitor. We distribute the market's own number across a roster with a usage-and-efficiency model, so our projections are never internally inconsistent and our *disagreements with the market are explicit and measurable*.
2. **Quantifies its own uncertainty** — every published number is a *range with a coverage guarantee*, not a false-precision point.
3. **Publishes its own calibration** — we commit each forecast before the game, score it after, and show the world how wrong we've been, by position, over time.

Those three together make a machine that **gets smarter, more provable, and more valuable on the same heartbeat** — every settled game. That is the whole company in one sentence. Everything below is how it's built, why it compounds, and what to do in the next eighty days while the best revenue window of the year is open.

**The decisive call:** soft-launch the *already-built* $49/yr Fantasy loop on real, cleared nflverse data **this week** to capture peak draft season; build the Intelligence Core over the runway; and flip the calibrated weekly projection live **at kickoff (Sept 9)** as the headline — *"the only fantasy projection that publishes its own calibration."* Revenue now, proof building underneath, moat compounding the whole time.

---

## Part I — The Flywheel (the thesis, made mechanical)

Most "data flywheel" claims are decoration. Here it is as an actual mechanism. When a game settles, **one event fires four compounding updates** — in order, idempotent:

| Beat | What fires | Where it lands | Why it compounds |
|---|---|---|---|
| **DATA** | the prediction-time feature vector + the real outcome append to the corpus | R2 Parquet → DuckDB (≈$0, zero egress) | the data moat literally deepens every Sunday; nobody can backfill *our* pre-commit history |
| **FORECAST** | the calibration harness rescoring updates ensemble weights + isotonic maps | `lib/calibration/compute.ts`, emits a `CalibrationProposal` | the next projection is sharper than the last — automatically, weekly |
| **PROOF** | CLV beat-rate, Brier, ECE, interval coverage, settled-count update | the public track record + the ladder counters | the proof grows; the price becomes defensible by evidence, not assertion |
| **UNLOCK** | settled-sample milestones flip pricing rungs **and** `priced=false→true` flags **and** `canPublishProjections` | the `LadderEvent` registry | revenue maturity and engine maturity advance from the *same* milestone |

This is why a competitor cannot copy it by buying the same data: their projection doesn't publish calibration (so it can't earn trust on a curve), their data goes stale between updates (so it doesn't compound), and their pricing isn't gated to proof (so a price increase is just a price increase). GSE's price increases are *earned in public*, and every customer who joins at the founding rate is grandfathered for life — so the flywheel rewards early believers and punishes imitators who show up after the track record exists.

### The spine: make "the one ladder" real in schema

Today the coupling between "we've proven enough to raise the price" and "we've proven enough to turn this signal on" lives in prose and scattered env booleans. The single highest-leverage engineering move in the entire system is to make it **one event-sourced ledger**:

```
LadderEvent (append-only):  SETTLED_BATCH · CALIBRATION_PUBLISHED · CLV_BEAT_UPDATED · ECE_CHECK · MODEL_COURT_APPROVED
        │
        ▼
reduceLadder(events) ──► current rung  ──► read by ALL of:
   • pricing-phases.ts        (which tier is live: FOUNDING → PROVEN → ESTABLISHED → AUTHORITY)
   • priced=false→true        (independent estimators enter the score)
   • canPublishProjections    (the weekly forecast goes public)
   • PERFORMANCE_STATS_ENABLED (the public win/CLV stats open)
```

The invariant test that makes the pitch true (`INV-1`): *a pricing-tier advance and a `priced`-flag flip must derive from the same milestone event.* Ship it in **shadow mode** first — the reducer logs where it disagrees with today's env flags before it takes authority. First commit is small and named in `GSE_INTEL_03`. When this exists, "revenue maturity and engine maturity are the same ledger" stops being a slogan and becomes a passing test.

> *The architecture diagram for this flywheel renders alongside this document in chat.*

---

## Part II — The Intelligence Core (the brain)

Six layers, each a real method, each grounded in a real file, each promotable only through the existing Model Court + `model-freeze.mjs` calibration gate. Full math and data contracts are in `GSE_INTEL_01`; here is the spine and the one idea that matters most.

1. **Feature layer** — the derived-metrics factory (`lib/metrics/*`): opponent-adjusted EPA/success (shipped), CPOE, WOPR/target share, air yards/aDOT, PROE/pace, red-zone usage. Persisted to R2/DuckDB, clearance-gated, each carrying its "stat-commandment" envelope (source, timestamp, definition, weakness).
2. **Player-rate layer** — **hierarchical Bayesian / empirical-Bayes shrinkage.** NFL's whole problem is small samples: a 3-target game and a 9-target game both lie if you take them at face value. We regress each player's rate to a position/archetype prior with weight `w = n/(n+k)` and emit a *posterior distribution*, not a point. This is the single biggest honesty upgrade in the Core — and almost no consumer tool does it.
3. **Market-anchored reconciliation layer — the keystone.** Take the Vegas implied **team total** (licensed Odds API) and pour it across the roster through the usage×efficiency posteriors, **constrained so the player projections sum to the team total.** Top-down market × bottom-up usage, reconciled. The residual — **where our bottom-up model disagrees with the market** — is defined as `DIVERGENCE`, and that one number is simultaneously a fantasy buy-low/sell-high signal, a betting-edge candidate, and the best content we can publish. *One engine, two products.*
4. **Ensemble + online-learning layer** — combine the market-anchored model, the pure bottom-up model, opponent-adjusted EPA, and a dumb baseline with weights **earned out-of-sample** (Brier/MAE/CLV), updated weekly by multiplicative-weights (Hedge). Nothing ships unless it beats both an equal-weight blend *and* a market-only baseline OOS. The dumb baseline is not a joke — it's the honesty floor.
5. **Uncertainty layer** — **Adaptive Conformal Inference** (split/Mondrian by position) wraps every projection in a distribution-free interval whose coverage **tracks the target rate over time** (NFL data shifts week to week, so there is no false finite-sample guarantee). This is what lets us say "≈80% of the time the real outcome lands in this band" — and publicly keep checking that it does.
6. **Calibration + self-publishing layer** — extend `lib/calibration/compute.ts` + `lib/tracker/clv.ts`: commit each projection pre-game (hashed), score post-game (MAE by position, interval coverage vs nominal, rank-correlation, Brier/log-loss vs a market baseline), and **publish the reliability.** This is the artifact that makes the headline literally true and gates the `canPublishProjections` flip.

**Why this is defensibly smarter than PFF / ESPN / the field:** they sell a confident point estimate from a black box. GSE sells a *market-anchored range from a glass box that publishes its own error*. Transparency + uncertainty + market-anchoring + self-published calibration — pick any competitor and they have at most one of the four.

---

## Part III — The Forecasting Frontier (forecast what *moves* the points)

Points are noisy; usage is sticky. The durable edge is forecasting the **causes** of fantasy value, which almost no consumer product does well. Full designs in `GSE_INTEL_02`:

- **Opportunity / role migration** — forecast next week's target share, snap share, routes, carries, red-zone touches (a Markov role-state model + shrunk transitions); when an injury hits, redistribute the vacated touches to teammates by historical share. This is the leading indicator the Core consumes.
- **Injury / return + role-tenure** — a deliberate, correct reuse of **survival / Cox / discrete-time hazard** models (the Atlas marked Cox *skip* on the win/loss pick surface because there's no duration there — but return-timelines and "how long does this hot role last" are *exactly* duration problems). Outputs P(active) and expected snap% that widen the projection band honestly.
- **Game-script** — from the Vegas spread/total and the win-probability path, forecast pass/run rate, plays, and pace → the volume environment each player sits inside. This is the bridge that keeps the fantasy projection and the betting total/prop reads consistent.
- **Breakout / regression engine** — detect unsustainable rates (TD rate over expected, catch rate over xCatch) and forecast mean-reversion. Extends the divergence logic already in `receiving-opportunity.ts`.
- **The divergence layer** — the unifier: standardized market-minus-model `z`, gated by whether the conformal intervals even overlap, routed three ways — betting candidate (shadow→Court→priced), fantasy buy-low/sell-high, and **"The Receipt"** content ("the market says X; our usage model says Y; here's why").

**Ship first:** the **Regression Engine** (Module 4). It reuses existing logic, needs no new data, ships *process-grade today* (no gate), and produces "Mirage & Buried" / "The Receipt" content from day one — your zero-budget growth loop. Opportunity migration (Module 1) follows immediately for the durable moat.

---

## Part IV — Cost is the weapon (the inversion nobody frames)

The cost work already shipped (deploy-gating, SourceSnapshot hash-only, CDN policy) reads like defense — stop the bleed. The real story is offense: because the corpus lives in **R2 Parquet (free egress) queried by in-process DuckDB**, GSE's marginal cost of running *another* backtest, recalibration, or walk-forward CV is **≈ $0**. Competitors on Postgres/Snowflake/per-query warehouses pay for every scan.

Climbing the proof ladder fast *is* "run thousands of recalibrations and shadow backtests." GSE can do that on the flat part of the cost curve. **The cost architecture and the intelligence flywheel are the same decision** — "king of stats and data" grows the *cheapest* line item, not Neon or Vercel. Solo-founder launch envelope: roughly **$5–55/month** all-in (Vercel hobby/pro + Neon + R2 pennies + Oracle Always-Free workers + internal LLM for non-user work). That is a runway measured in *years* of iteration, not months of burn.

And the by-product is the **"learning, growing" artifact**: a public **model changelog / intelligence ledger** where users watch the system get measurably smarter every settled week — version bumps, calibration deltas, what improved and why. Engagement, proof, and the founder's narrative, fused into one page backed by the integrity ledger.

---

## Part V — The 80-day decisive sequence

Full plan in `GSE_INTEL_04`. The strategy in one sentence: **turn on the money this week on data that's already real, then spend the runway earning the right to flip the calibrated projection live at kickoff.**

**THE ONE THING THIS WEEK (by Fri Jun 26):** quiet soft-launch the $49/yr Fantasy tier on real nflverse data. Owner actions, in order: (1) create the live Stripe `STRIPE_FANTASY_*` $49/yr price; (2) flip `PROJECTIONS_PROVIDER` to put the tools on the real graded pool; (3) set analytics tokens; (4) rotate the Anthropic key; (5) self-subscribe-and-refund to test the money path end-to-end; (6) flip `/launch` live and DM 20–30 drafters. **Do not touch `canPublishProjections`** — season-long draft/best-ball data is cleared and ready; weekly forecasts stay honest "Preview." Draft season is perishable; this is the action that pays rent.

**The critical path to *cleared* projections (the keystone):** freeze `weekly-model.ts` and pre-declare the bar → pre-commit immutable, pre-game projection rows for the **HOF game (Aug 6)** and **preseason (Aug 13+)** → backtest via `calibration/compute.ts` against a pre-declared MAE/Brier threshold → author an `IMPLEMENTED` calibration proposal and bump `MODEL_VERSION` in the same change so `model-freeze.mjs` stays green → **flip `canPublishProjections:true` at/just before kickoff.** If the model misses the bar, *do not flip* — launch the rest, keep weekly as "Preview," clear it on real Week 1–2 games. The discipline is the brand.

**If you only do five things in 80 days:**
1. **This week:** turn on the $49 loop on real season-long data; test checkout; quiet launch into draft season.
2. **By Jul 25:** freeze the weekly model; start writing pre-committed, immutable pre-game projection rows.
3. **Aug 6 → Aug 28:** backtest the frozen model on HOF + preseason to a pre-declared bar.
4. **By Sep 5:** land the calibration proposal, bump `MODEL_VERSION`, flip `canPublishProjections`.
5. **Sep 9:** loud launch behind *"publicly backtested, calibration-frozen weekly projections."*

**What to explicitly NOT do now** (decisiveness is the point): real-money contests (founder + legal gated), CV/broadcast charting (counsel-gated), deep-learning/foundation models (sample too small — the Atlas is firm on this), multi-sport, the coverage-map UI, email *sending* (capture addresses now, `draft-only.mjs` blocks sends), and the full R2 lake before launch. Provision Oracle VPS + R2 only when traffic pays for them.

---

## Part VI — The understanding layers (the words you used, made operational)

- **Contextual.** This is *one* system, not three products fighting for attention. Fantasy is the **revenue bridge** (it sells now, in season, to a huge audience). Picks are the **proof engine** (CLV + calibration is the hardest, most trustworthy track record in the space). Data is the **moat** (every cleared source, every derived metric, deepening the corpus). The projection and the public calibration are *outputs* of the machine, not the machine.
- **Situational.** Two clocks are running: **draft season is open now** (perishable revenue) and **cash is burning** (finite runway). The plan front-loads the perishable revenue and back-loads the proof to the moment it's most valuable (kickoff). The honest, time-true posture — "early, disciplined, climbing; NFL-only; we will not price what we have not proven" — is not a weakness to hide. It is the most credible thing a founder in this space can say, and it is rare.
- **Psychological.** The market is full of touts who promise certainty and delete their losses. GSE's wedge is the **exact opposite reflex: radical honesty.** "We show you how wrong we've been, where, and we're getting less wrong" is a trust object no competitor can fake without a year of pre-committed history they don't have. The calibration artifact *is* the thing that justifies the price — it converts the skeptic, who is the most valuable customer because the skeptic churns the least.

---

## The single sentence, again

**Build the only sports forecaster that anchors to the market, publishes its own uncertainty, and shows its own calibration — turn it on for fantasy this week, prove it through preseason, light it up at kickoff — and let every settled game make the data deeper, the model sharper, the proof louder, and the price more defensible, all on the same heartbeat.**

*Companion deep-dives: `GSE_INTEL_01_CORE_ARCHITECTURE.md` · `GSE_INTEL_02_FORECASTING_FRONTIER.md` · `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md` · `GSE_INTEL_04_80DAY_SEQUENCE.md`. Strategic context: `GSE_EXECUTIVE_ADVISORY_PASS.md` · `GSE_FORECASTING_METHODOLOGY_ATLAS.md`.*
