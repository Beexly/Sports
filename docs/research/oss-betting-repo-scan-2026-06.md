# OSS Betting & Prediction Repo Scan — June 2026

**Scope:** Methodology/technique recon of 39 public GitHub repositories (sports-betting models, odds
ingestion, betting math, ML infra) for applicability to GSN. Researched via README + raw source + web
search; no repo cloned or executed.

**Read this as:** a methodology and schema reference, **not** a code-import list. Nearly everything here
is Python/Go/R; GSN is TypeScript. The value is in *patterns and math we re-implement cleanly*, gated by
our non-negotiables (real data as source of truth, calibrated confidence, no fake data, tests required,
clearance-gated ingestion). **No repo demonstrated a proven, independently-validated long-run edge** — the
honest ones self-report break-even/negative. Treat all of this as engineering and calibration discipline,
not transferable alpha.

---

## 1. Executive verdict

Out of 39, **~8 are worth real attention**; the rest are concept-only, niche, or skips.

**Tier S — build toward these (license-clean, directly applicable):**

| Repo | License | Why it matters | GSN target |
|---|---|---|---|
| **minus5/go-uof-sdk** | MIT | Gold-standard Sportradar UOF odds schema + recovery model | `packages/types`, `data-ingestion` |
| **sedemmler/WagerBrain** | MIT | Portable betting math (no-vig prob, EV, Kelly, conversions) | `prediction-engine` odds-math util |
| **georgedouzas/sports-betting** *(bonus find)* | MIT, 719★ | Rigorous walk-forward backtest + odds-as-first-class-data | `prediction-engine` backtest harness |
| **Wysdomos/mlb-slate** | (has license) | Transparent weighted/tiered scoring + closed-loop grading | `prediction-engine`, content, track-record |

**Tier A — mine for one specific technique each:**

- **NBA-Betting/NBA_Betting** (MIT) — point-in-time feature store (anti-leakage) + benchmark error vs the line.
- **paul-pinto/FIFA-World-Cup-2026** — λ → Poisson/Dixon-Coles exact-score matrix + vig-stripped consensus.
- **mykiie85/EDGE_BOT_SOCCER_PREDICTOR** — calibrator bake-off (isotonic/Platt/beta/temperature) + CLV capture.
- **charlesmalafosse/sports-betting-customloss** (MIT) — profit/EV objective + learned "no-bet" abstention.
- **kochlisGit/ProphitBet** (MIT, 540★) — walk-forward CV + Boruta feature-importance triangulation.
- **CardinHa/sports-betting-engine** (MIT) — closest end-to-end architecture to GSN; Kelly unit ladder; grade-and-learn.
- **englianhu/data-analysis** (GPL-3.0) — Poisson/bivariate-Poisson + Kelly methodology (re-implement, don't copy GPL).
- **chrisgillam/polymarket_gambot** (MIT) — prediction-market price as a vig-free probability / cross-source signal.
- **stevenleon30/mockbook-qa-sandbox** — QA harness pattern (seed→assert-in-DB→reset; SQL-integrity tests).

**Tier B — concept-only / infra / niche:** day-mon/sports-betting-ai (serve-thin pattern), betting_edge
(LLM-narrates/gate pattern — but a vig anti-pattern), ChasingCars2002/mlb-betting-model (module
decomposition), thedatadoktor/prediict (cron ensemble), J1BON/Reddit-intel (clearance-gated signal
patterns), Nixtla statsforecast (line-movement forecasting), lazypredict (offline baselining), openai/CLIP
(content image tagging), zhouyan8603/Betting-Arbitrage (arb math), agad495/DKscraPy &
flancast90/sportsbookreview-scraper (JSON-feed technique reference, **compliance-gated**).

**Skip (toy / empty / off-domain / license-incompatible):** llSourcell/sports_betting_with_RL,
companygondu/MLB-SYSTEM-ig-montecarlopicks (no actual Monte Carlo — the name is marketing),
Swati7819/One-Percent-Better (learning journal), vegassportsbook/Vegas-Pro-Engine (stub),
jhogarciacu/Predictive-Betting-Agent (README-only stub), Active37/Betting-Analysis- (empty Angular),
Sports-Betting-Sportsbook/sports-betting (storefront, misnamed), ursusandwolf/sportsbook (Java auth
scaffold), zhoudaqing/pybet (toy), Fremont28/vegas_point_spreads (throwaway script),
jrbadiabo/Bet-on-Sibyl (Python 2, dormant, compliance no-gos), JustBeYou/betting (abandoned arb
auto-better), 666ghj/MiroFish (AGPL LLM swarm — violates our calibration rules), lucas-maes/le-wm (visual
world-model research), leopard-ai/betty (dormant bilevel-optimization research), kserve (excellent but
needs Kubernetes — premature).

---

## 2. Cross-cutting patterns — the real gold

These recurred across many repos and are where the leverage is:

### 2.1 Remove the vig **first** (biggest recurring gap → our differentiator)
Most repos compute implied probability as raw `1/odds` and **never normalize for the overround**, so their
"probabilities" sum to >100% and every edge is systematically understated (betting_edge literally does this
and inflates its thresholds to 15–20% to compensate). The correct primitive, which **WagerBrain and the
FIFA-WC pipeline do implement**:

```
raw_i      = 1 / decimal_odds_i
overround  = Σ raw_i            # the "hold"/vig; e.g. 1.05 = 5% hold
fair_p_i   = raw_i / overround  # no-vig implied probability (proportional method)
edge       = model_p − fair_p_i
EV/unit    = model_p × (decimal_odds − 1) − (1 − model_p)
```
For 2-way markets the **Shin** or **power** method removes favorite–longshot bias better than the
proportional method. **Making no-vig fair probability a core, tested primitive is a genuine edge for GSN** —
most of the field gets this wrong.

### 2.2 Closing Line Value (CLV) is the north-star metric — and almost nobody implements it
Only **EDGE_BOT** captures CLV properly (snapshot the closing/Pinnacle line at kickoff, compare to bet-time
line). This maps **directly** onto GSN's pricing-ladder proof gate ("verified CLV ≥52.4%"). It is the most
credible quality metric we can publish. Action: make **bet-time line + captured closing line** first-class
audited fields on every pick.

### 2.3 Separate **calibration** from **selection**
- **Calibration** (the 0–100 confidence number): fit a calibrator — isotonic / Platt / beta / temperature —
  and auto-select the best (EDGE_BOT's bake-off). Track with **Brier score + reliability curves**.
- **Selection** (publish a pick or not): use an **EV/profit objective** and an explicit **"no-bet" action**
  (charlesmalafosse's loss makes abstention a learned class with payoff 0, not a hard threshold).
A pure profit objective is **not** probability-calibrated, so you need both — this cleanly splits "how sure
are we" from "is there an edge worth surfacing."

### 2.4 Validate time-ordered, never random
Walk-forward / `TimeSeriesSplit` cross-validation (ProphitBet, georgedouzas, NBA_Betting all insist on it).
Random k-fold leaks future into past on sports data. Pair with a **point-in-time feature store** so every
feature is as-of-game (NBA_Betting's `all_features_json` snapshot table). This is exactly what our
"versioned & auditable picks" requirement needs.

### 2.5 Poisson / Dixon-Coles exact-score matrix = the soccer spine
One expected-goals (λ) pair per team → a full score-probability matrix → internally consistent 1X2 / O-U /
BTTS / correct-score (FIFA-WC, englianhu, EDGE_BOT). Dixon-Coles adds the low-score dependence correction
(0-0/1-0/0-1/1-1). Far better than predicting each market independently.

### 2.6 Closed-loop grading → rolling accuracy → recalibration
mlb-slate (season + last-7 + 14-day rolling) and CardinHa (grade-and-learn loop) both close
prediction→settlement→recalibration. Powers our **public track-record** (free tier) and feeds
`calibrate`/`tune-thresholds`/`grade-audit` skills.

### 2.7 Canonical odds schema (UOF model)
`Event → Market{specifiers, status, lineID} → Outcome{odds, impliedProb, active}` with **nullable** odds
(absent ≠ 0), **per-market and per-outcome status**, stable **URN event identity**, and **per-producer
last-processed timestamp** for dedup + freshness + gap-free recovery (minus5/go-uof-sdk). This is the
battle-tested target shape for `packages/types` and `data-ingestion`, even though we ingest via The Odds API.

### 2.8 Compute-offline, cache-in-Redis, serve-thin
Never run inference on a user request (day-mon/Accuribet's Rust+Redis split). Workers compute picks,
persist + cache in Redis, API routes serve cached only. GSN already has BullMQ+Redis — the pattern fits.

### 2.9 Fractional Kelly for stake/edge sizing, presented as a unit ladder
`f* = (b·p − q)/b`, scaled to quarter/half Kelly, surfaced as a discrete **0.5u–3.0u unit ladder**
(CardinHa) — a clean way to express "how strong is this pick" without exposing raw bankroll math. Good fit
for Pro/Elite confidence display. *(Note: WagerBrain's source has a sign quirk in its Kelly — use the
canonical `(b·p − q)/b` and unit-test it.)*

---

## 3. Concrete recommendations by subsystem

### `packages/types` + `packages/data-ingestion`
1. **Model the canonical odds schema on UOF** (§2.7): `Event → Market{specifiers, status, lineID} →
   Outcome{odds, impliedProb, active}`, nullable odds, stable event identity, per-source last-processed
   timestamp. Store `lineID` so line movement is trackable; treat heartbeat/timestamp staleness as the
   freshness invariant (satisfies "no stale data").
2. **Mirror the two-channel split**: fast numeric odds vs cached descriptive metadata (fixtures/markets),
   normalized to one enriched record.
3. **Adopt a `(sport, start, end, format)` backfill CLI contract** for historical ingestion jobs (SBR scraper).
4. **Sportsbook fallback chain + accent/suffix-normalized name matching** (mlb-slate) to harden the Odds API
   adapter against missing lines / name mismatches.
5. **(Optional signal source)** Polymarket/Kalshi prices as a *vig-free* probability and consensus check —
   route through the clearance engine, classify `vendor_candidate`/`approved_api`, treat as secondary.

### `packages/prediction-engine`
1. **New `oddsMath` util (port WagerBrain, MIT):** American/decimal/fractional conversions, implied
   probability, **no-vig fair probability** (§2.1), true-odds EV, fractional Kelly, parlay (`∏ decimal`),
   vig/overround + arb helpers. Small, deterministic, fully unit-tested. *This is the highest-leverage,
   lowest-risk borrow in the whole scan.*
2. **CLV capture as a first-class audited field** (§2.2): bet-time line + closing line on every pick.
3. **Calibration layer** (§2.3): isotonic/Platt/beta/temperature with auto-select; track Brier + reliability.
4. **Explicit "no-edge / no-pick" decision** (charlesmalafosse §2.3) instead of a bare confidence cutoff —
   directly informs free-pick gating and honest "no edge today" behavior.
5. **Poisson/Dixon-Coles exact-score matrix** for soccer (§2.5) as the spine for multi-market picks.
6. **Transparent weighted-factor confidence** (mlb-slate): each weight = an auditable factor-trail entry;
   tiered thresholds (T0/T1) map to free/premium gating.
7. **Backtest harness** modeled on georgedouzas/sports-betting: walk-forward `TimeSeriesSplit`, odds kept as
   a first-class array alongside features/labels, per-window ROI/yield + a calibration curve.

### `workers/`
- Daily `refresh → predict → grade → publish` cron (FIFA-WC, prediict use GitHub Actions; we have BullMQ).
- **Closed-loop grading** emitting season + last-7 + 14-day rolling accuracy (§2.6) for the public
  track-record page.
- **Compute-offline, cache-in-Redis, serve-thin** (§2.8).

### `apps/web` content pipeline
- **LLM narrates, a separate gate validates** (betting_edge) — already our doctrine ("Claude for content
  only, not source of truth"); this is a clean reference implementation of it.
- **(Niche)** CLIP zero-shot image tagging for blog/OG SEO *only if* we process images — prefer a hosted
  embedding endpoint over self-hosting PyTorch.

### `tests/` (Vitest)
- **Mock-data / fixture-harness pattern** (CardinHa offline mode + mockbook-qa-sandbox): seed known fixture
  rows → run the adapter → assert normalized output → reset. Deterministic odds-ingestion tests with no live
  API. *(Note: mockbook does not ship a mock odds API — we still build our own recorded Odds-API fixtures.)*
- **SQL-integrity-as-tests** (mockbook): every pick has line/confidence/model_version; no orphaned odds.
- **`@smoke` / `@regression` / `@critical` tagging** for CI tiering.

---

## 4. Compliance notes (scrapers)

Per `CLAUDE.md` legal posture and `source-rights-registry`: **every** scraper repo here would require a
registry entry + `checkClearance()` + a `RightsSnapshot` before running. None bypass CAPTCHA/login/paywall
and none rotate proxies (so not active *evasion*), but most hit **unlicensed** sources with no robots/ToS
handling.

- **jrbadiabo/Bet-on-Sibyl** — worst: Selenium-renders oddsportal/betbrain + scrapes *-reference.com (all
  prohibit automation). **Do not use as a source.** Salvage only the ratio/diff feature-normalization idea.
- **agad495/DKscraPy** — hits DraftKings' undocumented internal JSON API; `permission_required`/vendor.
  Keep the endpoint/JSON-traversal **map** and the `label/line/oddsDecimal/location` outcome shape as a
  schema reference; don't run it.
- **flancast90/sportsbookreview-scraper** (MIT code) — cleanest intent: hits the **structured JSON data
  layer, facts-only, no article bodies** — this is exactly our preferred technique. But SBR is
  `permission_required` and the bundled dataset's redistribution rights are unverified. Technique reference,
  not a live source.
- **JustBeYou/betting** — auto-placing arbitrage bot, against book ToS, abandoned. Skip; keep only the
  vig/implied-prob concept.
- **J1BON/Reddit-intel** — if we ever mine public sports subreddits for *sentiment magnitude / news
  velocity* as a soft, non-authoritative feature, the patterns (canonical-ID dedup, sub-sharding, adaptive
  backoff, dual auth/no-auth client) are reusable — but Reddit's API is contractual: classify in the
  registry, snapshot rights, **facts/derived signals only, never republish post bodies**.

**Counter-pattern to build toward:** minus5/go-uof-sdk models a **licensed** feed (`approved_api`) — the
legitimate shape every ingestion path should resemble.

---

## 5. Full index (all 39 + 1 bonus)

| # | Repo | License | Substance | Verdict |
|---|---|---|---|---|
| 1 | kochlisGit/ProphitBet-Soccer-Bets-Predictor | MIT | Real, 540★, maintained | **A** — walk-forward CV, Boruta, Optuna |
| 2 | leopard-ai/betty | Apache-2.0 | Research, dormant | Skip — bilevel opt, no gradient in our engine |
| 3 | jrbadiabo/Bet-on-Sibyl | GPL | Python2, dormant | Skip — compliance no-gos; keep ratio/diff idea |
| 4 | NBA-Betting/NBA_Betting | MIT | Real, 206★, archived | **A** — point-in-time feature store, line-error benchmark |
| 5 | llSourcell/sports_betting_with_RL | none | Toy coursework | Skip — textbook gambler's problem, no data |
| 6 | day-mon/sports-betting-ai | verify | Student, 104★, active | B — serve-thin + Redis cache pattern |
| 7 | charlesmalafosse/sports-betting-customloss | MIT | Reference notebook, 94★ | **A** — profit loss + learned "no-bet" |
| 8 | BettingApp-hcai/betting_edge | none | Real, 338 commits | B — LLM-narrates/gate pattern; **vig anti-pattern** |
| 9 | mykiie85/EDGE_BOT_SOCCER_PREDICTOR | none | New, strong blueprint | **A** — calibrator bake-off + CLV |
| 10 | companygondu/MLB-SYSTEM-ig-montecarlopicks | none | 2 commits, thin | Skip — **no actual Monte Carlo**; Elo-overlay idea only |
| 11 | Active37/Betting-Analysis- | none | Empty Angular | Skip |
| 12 | CardinHa/sports-betting-engine | MIT | Real, 130 commits | **A** — closest arch; Kelly unit ladder; grade-and-learn |
| 13 | Swati7819/One-Percent-Better | none | Learning journal | Skip — not a betting repo |
| 14 | ChasingCars2002/mlb-betting-model | none | Active, 293 commits, 51 issues | B — clean module decomposition (calibration.py) |
| 15 | paul-pinto/FIFA-World-Cup-2026-Prediction-Pipeline | none | Real, active | **A** — Poisson/DC matrix, Elo, vig removal |
| 16 | thedatadoktor/prediict | MIT | Solo, pre-prod | B — ensemble + edge gating + cron |
| 17 | J1BON/Reddit-opportunity-intelligence-system | MIT | Solo, unmaintained | B — heuristic signal pipeline (clearance-gated) |
| 18 | vegassportsbook/Vegas-Pro-Engine | none | Stub, 3 commits | Skip |
| 19 | Fremont28/vegas_point_spreads | none | Throwaway script | Skip — keep delta-vs-consensus concept |
| 20 | zhoudaqing/pybet | none | Toy PoC | Skip — redundant with WagerBrain |
| 21 | lucas-maes/le-wm | MIT | Research, 3.9k★ | Skip — visual world model, off-domain |
| 22 | shankarpandala/lazypredict | MIT | Real, 3.3k★ | B — **offline** model baselining only |
| 23 | Nixtla/nixtla (statsforecast/neuralforecast) | Apache-2.0 (TimeGPT paid) | Production-grade | B — line-movement forecasting, anomaly/steam |
| 24 | kserve/kserve | Apache-2.0 | CNCF, 5.6k★ | Skip-for-now — needs K8s, premature |
| 25 | openai/CLIP | MIT | Foundational, 33.8k★ | B-low — content/SEO image tagging only |
| 26 | 666ghj/MiroFish | **AGPL-3.0** | Viral, ~53k★ | Skip — LLM swarm violates calibration rules; AGPL |
| 27 | jhogarciacu/Predictive-Betting-Agent | none | README-only stub | Skip |
| 28 | Sports-Betting-Sportsbook/sports-betting | Apache-2.0 | Storefront template | Skip — misnamed; see bonus row |
| 29 | zhouyan8603/Betting-Arbitrage | none | Abandoned PoC | B-concept — arb math + vig removal |
| 30 | agad495/DKscraPy | none | Hobby, stale | B-ref — DK JSON endpoint map; **compliance-gated** |
| 31 | flancast90/sportsbookreview-scraper | MIT | Modest, clean intent | B-ref — JSON-feed-over-HTML; **permission_required** |
| 32 | englianhu/data-analysis | **GPL-3.0** | Real, 83★, long-lived | **A** — Poisson/Kelly/GARCH methodology (re-implement) |
| 33 | sedemmler/WagerBrain | MIT | Real, 305★ | **S** — betting math library to port |
| 34 | Wysdomos/mlb-slate | has license | Active, shipping | **S** — transparent scoring + closed-loop grading |
| 35 | ursusandwolf/sportsbook | none | Java auth scaffold | Skip — no betting math |
| 36 | stevenleon30/mockbook-qa-sandbox | none | New, substantive QA | **A** — fixture harness + SQL-integrity tests |
| 37 | minus5/go-uof-sdk | MIT | Real, well-engineered | **S** — UOF odds schema + recovery model |
| 38 | chrisgillam/polymarket_gambot | MIT | Complete notebook | **A** — prediction-market price = vig-free prob |
| 39 | JustBeYou/betting | none | Abandoned 2020 | Skip — arb auto-better, against ToS |
| ★ | **georgedouzas/sports-betting** *(bonus — the real toolbox)* | MIT | Real, 719★, maintained | **S** — walk-forward backtest + (X,Y,O) odds-as-data |

---

## 6. Suggested next steps (proposed backlog, in leverage order)

1. **Build `oddsMath.ts`** in `packages/prediction-engine` (port WagerBrain math, MIT): conversions +
   **no-vig fair probability** + EV + fractional Kelly + parlay + vig/arb, fully unit-tested. Lowest-risk,
   highest-leverage. Fixes the field-wide vig mistake by design.
2. **Add CLV capture** (bet-time line + closing line) as audited pick fields → unlocks the pricing-ladder
   ≥52.4% proof gate and an honest quality metric.
3. **Align `packages/types` odds model to the UOF graph** (nullable odds, per-outcome status, lineID, stable
   identity, per-source timestamp) for line-movement + dedup + freshness.
4. **Stand up a walk-forward backtest + calibration harness** (georgedouzas pattern: time-ordered splits,
   odds-as-data, ROI/yield + reliability curve + Brier) to validate the 0–100 confidence scores.
5. **Add the calibrator bake-off** (isotonic/Platt/beta/temperature auto-select) + explicit **no-pick
   abstention** to the engine.
6. **Closed-loop grading worker** emitting season/last-7/14-day rolling accuracy for the public track record.
7. **Deterministic ingestion tests** via a fixture harness (seed→assert→reset) + SQL-integrity specs +
   `@smoke/@regression/@critical` tags.
8. *(Later / evaluate)* Poisson/Dixon-Coles soccer spine; statsforecast line-movement signals; Polymarket as
   a secondary vig-free consensus signal (all clearance-gated where they touch external sources).

**Honest caveat repeated:** none of these repos proves a durable edge. They give us **discipline** (vig
removal, CLV, time-ordered validation, calibration, auditable factor trails) — which is exactly what a
trustworthy, proof-gated platform needs. The alpha, if any, we have to earn ourselves.
