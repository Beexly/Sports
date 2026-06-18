# OSS Betting & Prediction Repo Scan — June 2026

**Scope:** Methodology/technique recon of **73 public GitHub repositories + 1 article**, in two batches.
**Part 1** (39 repos) = sports-betting models, odds ingestion, betting math, ML infra. **Part 2** (34 repos
+ the Anthropic "Claude Design" article) = core data/ML libraries, data infra/CLI, web analytics & BI,
charting, AI-media (Higgsfield), and Claude/Anthropic design resources, plus six more sports repos.
Researched via README + raw source + web search; no repo cloned or executed.

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

---
---

# Part 2 — Infrastructure, Data, Analytics, Media & Design (second batch)

34 repos + 1 article, broader than betting: core data/ML libraries, data infra/CLI, web analytics & BI,
charting, AI-media (Higgsfield), Claude/Anthropic design resources, and six more sports/prediction repos.
Verdicts weigh **stack fit** (GSN is TS/Node) and **license** heavily — a great tool in the wrong language
or under copyleft is a liability, not a win.

## 7. Executive verdict (batch 2)

**Adopt / use now (license-clean, in-stack or clearly worth it):**

| Repo | License | Use |
|---|---|---|
| **umami-software/umami** | MIT | Self-hosted privacy analytics — *same Next.js+TS+Postgres stack* |
| **exceljs** *(the Node answer to qax-os/excelize)* | MIT | Operator + track-record/calibration Excel exports |
| **vega/vega-lite** (via `react-vega`) | BSD-3 | Calibration/reliability + line-movement charts (Recharts for the rest) |
| **scikit-learn** | BSD-3 | *Offline* calibration toolchain → export fitted map to TS (§9) |
| **statsmodels** | BSD-3 | *Offline* Poisson/Dixon-Coles GLM → port closed-form math to TS |
| **Claude Design (Anthropic Labs)** | hosted | Pilot for cockpit views; one-instruction handoff to Claude Code |
| **VoltAgent/awesome-claude-design** | MIT | Adopt the **`DESIGN.md` convention** (author a GSN-specific one) |
| **higgsfield-ai/higgsfield-js** | MIT | Headless media-worker generation w/ provenance stamping (beyond the MCP) |

**Experiment / defer:** apache/superset (internal-only BI over Postgres), pathwaycom/pathway (real-time
line-movement — *only* if GSN moves to a push/websocket odds feed; BSL license does **not** block us),
johnkerl/miller (BSD ops CLI for backfills), seedance2-jineng prompt-craft (ideas only for the media-brief
generator), AKCodez/higgsfield-claude-skills (reuse prompt-style templates clean-room).

**Skip:** haifengl/smile (JVM **+ GPL-3.0** copyleft blocker), boyter/scc (low-leverage), imbalanced-learn
(SMOTE *degrades* calibration — a "don't"), ApplikeySolutions/VegaScroll (abandoned iOS), clawnify/open-studio
(no Claude tie), BIT-DataLab/Edit-Banana (AGPL, diagram→DrawIO tool, off-domain), **higgsfield-ai/higgsfield**
(dead legacy GPU-training framework — name collision, not the video product), pandas/seaborn (offline
enabling deps only — adopt in notebooks, nothing to port), nwlynam62-ai/bet-coach (static UI shell).

**⚠ Compliance flags (record + avoid):** **stablesports711-hue/stable-sports-iptv** is sports-broadcast
**IPTV piracy** (expiring `.m3u` restream playlists) — off-limits under our no-piracy posture.
**davidtheaibet/aibet-meeting-room** is a private, **unlicensed competitor** data layer that relies on
**uncredited ESPN scraping** — don't borrow its rights-ungated ingestion approach (one-line competitive
intel only). `jamesbarnesmd-website` (sports *medicine*) and `harrischs185/innoweb` (sports *collectibles*)
are off-domain keyword matches — skip.

## 8. More sports/prediction repos (6) — two carry real gold

> All six are 0–3★ single-author projects; the huge commit counts (2,500–8,300) are **automated daily
> bot/CI commits writing generated picks back to the repo**, not engineering signal. Judge on methodology.
> Most have **no license** → reimplement ideas, don't copy code. All scrape sources our clearance posture
> would block → take the math, keep The Odds API as source of truth.

- **Alex-2911/Basketball_prediction** (MIT — the most production-grade) — NBA home-win LightGBM pipeline whose
  *value is the post-processing, not the model*: a **calibration ladder** (raw → in-sample isotonic →
  time-aware **walk-forward OOS isotonic** → **binned empirical win-rate** with **Wilson lower-bound** +
  **readiness gating** that degrades to global base-rate when data is thin → market-safe clip), a full
  **calibration eval suite** (Brier, LogLoss, **ECE**, reliability slope, subset accuracy), a **model-vs-market
  gap governor** (devig → `gap` → blend `w=exp(-|gap|/0.08)` → shrink-to-0.5 `0.5+α(p−0.5)` → hard-block on
  extreme disagreement), and **grid-searched EV thresholds**. Bugs to *avoid*: rolling means without
  `.shift(1)` (leakage) and **random** train/test split on time-series (use walk-forward). → `prediction-engine`.
- **nadzhh/sports-picks** (no license) — fully-specified NBA-prop + soccer engine. **Shrinkage-to-baseline
  confidence** `final = 0.6·model + 0.4·55`, capped `[40,95]`; **bounded contextual multipliers** (pace
  `[0.90,1.10]`, team-total `[0.88,1.12]`, defense `[0.92,1.08]`, B2B `0.96×`, blowout `0.94×`) over a
  L5/L10/season-weighted projection with σ floored at 15% of mean; P(X>line) via **normal CDF**; **composite
  quality-score** ranking + **diversification caps** (max 2/player, mix high+mid conf); soccer = independent
  **Poisson** scoreline grid + xG-vs-actual "efficient finisher" flag + FIFA-ranking→goal-strength mapping.
  → `prediction-engine` (high, methodology).
- **05aptrading-jpg/sportsAPBot** (no license) — MLB/LMB sabermetric bot. **Transparent weighted factor
  blocks → single auditable score** (Starter 30% / Offense 35% / Bullpen 25% / Efficiency 10%, each with
  named sub-factors) = a textbook **factor trail**; **multi-condition value gate** ("Tríada del Valor":
  publish only if prob >~57% AND BaseRuns-unlucky AND edge ≥3.5%) = a clean hard-stop pattern; context-aware
  weight overrides + **graceful data fallbacks** (FanGraphs→MLB API→market). → `prediction-engine` (factor-trail
  architecture is directly portable).
- **SaRangWOO/sports_analytics** (no license) — KBO portfolio. Worth one idea each: **calibration tables as a
  published accuracy artifact** (Brier+LogLoss), **explainable derived-index features** (team-style/situational
  indices rather than raw stats — fits our "derived signals" rights rule + factor trail), and a **JSON model
  artifact** (versionable/auditable). → `prediction-engine` (low-med).
- **SEBASBELMOS/Sports_Data_API_with_Neo4j** (no license, thin academic) — Node REST API over a Neo4j graph.
  Schema: `Athlete`/`Team`/`Sport` nodes; `PLAYS_FOR`, `PRACTICES`, and `CONTRACTED_BY {value,startDate,endDate}`
  edges. **One takeaway: time-bounded relationships with properties on the edge.** GSN is Postgres/Prisma, so
  borrow only the *modeling idea* (extend our entity graph with attributed, temporal edges to Game/Market/Line/
  Season/Venue). → modeling concept (low).
- **nwlynam62-ai/bet-coach** (no license) — static HTML "coach" board, **not** an LLM agent; no engine, even the
  render JS is missing. Salvage only the **pick-card JSON shape** (`matchup, odds, line_movement_history[],
  take, rank, grade, status, line_sources[], updated_at`) as a UI/content contract. → **skip**.

## 9. Core Python ML libraries (5) — the calibration cookbook

All BSD/MIT, all **Python** → used as **offline R&D** or **methodology to port to TS**, never in the runtime engine.

- **scikit-learn** (66k★, BSD-3) — the keystone for our calibration + backtest roadmap. The concrete recipe:
  measure honesty with **`brier_score_loss` + `calibration_curve`**, fit **`CalibratedClassifierCV(method=
  'isotonic'|'sigmoid')`** using **`cv=TimeSeriesSplit`** (avoid temporal leakage), then **export the fitted
  mapping** (two Platt scalars, or isotonic breakpoints) and **apply it in the TS engine at runtime**. Use
  sigmoid/Platt until ~1000 settled picks per segment, then isotonic.
- **statsmodels** (11.5k★, BSD-3) — `sm.GLM(y, X, family=Poisson()).fit()` is the canonical **soccer goal
  model**; add the **Dixon-Coles** low-score correction + time-decay weighting, fit/validate offline, then
  re-implement the (closed-form) Poisson scoring math in TS. Also Logit (win prob), ARIMA (team-form trend).
- **imbalanced-learn** (MIT) — **mostly a warning, not an adopt:** SMOTE/resampling **destroys probability
  calibration** by shifting base rates. For a calibration-first platform that's an anti-pattern — prefer
  `class_weight`/threshold tuning, and if you ever resample, *always* recalibrate after and re-check Brier.
- **pandas** (BSD-3) / **seaborn** (BSD-3) — offline **enabling tooling** only: build the labeled
  backtest dataset (join Odds-API snapshots to settled results), draw reliability diagrams / Brier-by-bucket.
  No runtime role, nothing to port (TS uses Prisma aggregations + React charts).

**Synthesis — GSN calibration cookbook (pulls Part 1 + Part 2 together):**
1. **Offline (Python notebook):** fit isotonic/Platt with `TimeSeriesSplit`; report **Brier + LogLoss + ECE +
   reliability slope + calibration tables** (Basketball_prediction / sports_analytics standard). Export the map.
2. **Runtime (TS engine):** apply the exported calibrator → then a **binned empirical win-rate table with
   Wilson lower-bound + readiness gating** (degrade to base-rate when thin) → optional **shrink-to-baseline**
   (`0.6·model + 0.4·base`) and **market-gap governor** (devig → blend/shrink → hard-block) before publishing.
3. The per-bin observed-win-rate table *is* an auditable artifact → powers the public calibration page and the
   PROVEN-tier "published calibration" milestone.

## 10. Data infra / CLI (5)

- **qax-os/excelize** (Go, BSD-3, 20.7k★) — great library, **wrong stack.** Do the capability (operator +
  track-record/calibration **Excel exports**) **in-stack with `exceljs`** (MIT, ~1.9M wk npm, streaming, ~6×
  less memory than SheetJS under serverless). Keep SheetJS in reserve only for reading legacy/odd formats.
- **pathwaycom/pathway** (62.9k★, **BSL-1.1** → Apache after 4y) — strongest *future* fit for **real-time
  line-movement / steam detection** (incremental, stateful, out-of-order-tolerant). License does **not** block
  GSN (we're an end-user, not a stream-processing reseller). But it's **premature**: our upstream (The Odds API)
  is a polled REST source and BullMQ snapshot-diff covers line-movement today; and it's a separate **Python
  service**. Revisit only with a push/websocket feed.
- **johnkerl/miller** (Go, BSD-2, 9.9k★) — handy **single-binary CLI** for ad-hoc CSV/JSON transforms in
  backfill/migration/debug scripts. Adopt as an ops convenience; keep off the runtime ingestion path.
- **boyter/scc** (Go, MIT) — fast LOC/complexity counter. Harmless but **low-leverage**; optional CI metric.
- **haifengl/smile** (JVM, **GPL-3.0**, 6.4k★) — **skip:** doubly wrong-stack (JVM) and GPL copyleft is a real
  blocker for a proprietary SaaS. If GSN ever needs real ML, use the Python ecosystem (XGBoost/LightGBM/sklearn).

## 11. Analytics, BI & viz (5)

- **umami-software/umami** (MIT, 37k★) — **adopt** for privacy-first web/product analytics: *same Next.js+TS+
  Postgres stack*, single datastore, trivial self-host, richer free funnels/retention. Beats **plausible/analytics**
  (27k★, excellent but **AGPL** + Elixir + ClickHouse → heavier + copyleft friction; prefer only as hosted SaaS).
- **vega/vega-lite** (BSD-3) via the maintained **`react-vega`** — **selective adopt** for *statistical* charts
  (calibration/reliability, binned confidence-vs-accuracy, layered line-movement with bands/annotations). Default
  the bulk of GSN's React charts to **Recharts** (visx for bespoke) for stack ergonomics.
- **apache/superset** (Apache-2.0, 73k★) — **experiment, internal-only.** Point it at Postgres for ad-hoc
  operator BI (pick volume, confidence-bucket calibration, CLV trends) at near-zero frontend cost. Heavy
  standalone Python service; never customer-facing; skip if a few fixed cockpit panels suffice.
- **ApplikeySolutions/VegaScroll** (Swift, MIT) — **skip:** abandoned iOS animation lib, name-collision only.

## 12. Higgsfield AI-media ecosystem (6) — mostly covered by the connected MCP

GSN already has the **Higgsfield Video MCP** (`generate_image/_video/_audio`, marketing studio, virality
predictor, upscale, outpaint, remove-bg). Net-new value from OSS is narrow:

- **higgsfield-ai/higgsfield-js** (official, MIT, TS) — **use for headless, non-agent worker jobs**: typed
  endpoints + polling/webhooks; control the call site to stamp the "AI-generated" label + brief ID at gen time.
- **higgsfield-ai/higgsfield-client** (official, Apache-2.0, Python) — skip unless a Python media worker exists;
  mirror its `NSFW`/`Failed` result classes in our media-acceptance gate.
- **beshuaxian/higgsfield-seedance2-jineng** (3rd-party, **no license**, 608★) — best **prompt-craft** reference
  (hook frameworks, shot lists, camera language, platform specs) for the **media-brief generator** — *ideas only*,
  and **never fabricate footage of real games/players/events**; safest borrows are generic promo/explainer hooks.
- **robonuggets/higgsfield-skill** (3rd-party, CC-BY-4.0) — thin MCP wrapper; **skip** (write a GSN-owned skill).
  The *official* `higgsfield-ai/skills` (MIT, 427★) is the better skill reference if needed.
- **higgsfield-ai/higgsfield** (Apache-2.0, 3.8k★) — **skip:** dead legacy **GPU-training framework** (name
  collision), last release 03/2024, nothing to do with media.
- **BIT-DataLab/Edit-Banana** (**AGPL-3.0**, 5.3k★) — **skip:** it's a **diagram→DrawIO XML** vectorizer (SAM 3 +
  MLLM + OCR), *not* an image editor; off-domain + copyleft.

> Throughout: our media rules hold — **label all generated media, keep it data-backed, never fabricate imagery
> of real events.** The MCP executes generation; OSS adds only headless SDK control + prompt-craft inspiration.

## 13. Claude / Anthropic design resources (3 repos + 1 article)

- **Claude Design (Anthropic Labs)** *(article)* — first-party, hosted, **Opus-4.7** design surface whose
  onboarding **ingests your codebase + design files into a persistent design system**, then offers
  **one-instruction handoff to Claude Code** (exports to Vercel/Miro/Figma/etc.). **Pilot it (highest design
  value)** for cockpit-view exploration and PM→Claude-Code sketches; subscription-gated (Pro/Max/Team/Enterprise);
  treat output as scaffolding to reconcile against GSN's WCAG-contrast + color-role rules, not a token source.
- **VoltAgent/awesome-claude-design** (MIT, 2.7k★) — **adopt the pattern, not the files**: the **`DESIGN.md`
  convention** (tokens + rules + rationale in one agent-readable file). Author a GSN-specific `DESIGN.md`; mine
  the dark-UI exemplars (Vercel/Sentry/Stripe-style) for structure. Don't import brand files wholesale.
- **AKCodez/higgsfield-claude-skills** (**no license**, 194★) — **partial, clean-room**: reuse the **15
  prompt-style templates** (motion ads, social hooks, e-commerce, brand stories) as inspiration for GSN-owned
  Claude Code skills; **skip the Playwright browser-automation skills** (fragile, redundant with our MCP).
- **clawnify/open-studio** (MIT, 16★) — **skip:** OpenRouter/Gemini image studio, **zero Claude tie**, tiny.

## 14. Batch-2 full index

| Repo | License | Verdict |
|---|---|---|
| 05aptrading-jpg/sportsAPBot | none | **Mine** — weighted factor-blocks → auditable score; multi-condition value gate |
| SEBASBELMOS/Sports_Data_API_with_Neo4j | none | Concept — attributed/temporal graph edges (thin) |
| nwlynam62-ai/bet-coach | none | Skip — static UI shell; salvage pick-card JSON only |
| Alex-2911/Basketball_prediction | **MIT** | **Mine** — calibration ladder + ECE/Brier eval + market-gap governor |
| SaRangWOO/sports_analytics | none | Low — calibration tables + derived-index features |
| nadzhh/sports-picks | none | **Mine** — shrinkage calibration + quality-score ranking + Poisson |
| johnkerl/miller | BSD-2 | Experiment — ops/backfill CLI |
| statsmodels/statsmodels | BSD-3 | **Port-methodology** — Poisson/Dixon-Coles GLM (offline) |
| boyter/scc | MIT | Skip — low-leverage CI metric |
| plausible/analytics | **AGPL-3.0** | Skip self-host (Elixir+ClickHouse+copyleft); SaaS only |
| qax-os/excelize | BSD-3 | Skip (wrong stack) → use **exceljs** (MIT) instead |
| umami-software/umami | **MIT** | **Adopt** — self-hosted analytics, same stack |
| scikit-learn/scikit-learn | BSD-3 | **Adopt offline** — calibration toolchain, export map to TS |
| pathwaycom/pathway | **BSL-1.1** | Experiment/defer — real-time odds (future push feed) |
| apache/superset | Apache-2.0 | Experiment — internal-only BI over Postgres |
| ApplikeySolutions/VegaScroll | MIT | Skip — abandoned iOS lib |
| vega/vega-lite | BSD-3 | **Adopt (selective)** — calibration/line-movement charts via react-vega |
| beshuaxian/higgsfield-seedance2-jineng | none | Experiment — prompt-craft ideas for brief generator |
| higgsfield-ai/higgsfield | Apache-2.0 | Skip — dead legacy GPU-training framework |
| AKCodez/higgsfield-claude-skills | none | Partial — reuse prompt-style templates clean-room |
| BIT-DataLab/Edit-Banana | **AGPL-3.0** | Skip — diagram→DrawIO tool, off-domain + copyleft |
| haifengl/smile | **GPL-3.0** | Skip — JVM + copyleft blocker |
| mwaskom/seaborn | BSD-3 | Adopt offline (light) — analysis plots only |
| pandas-dev/pandas | BSD-3 | Adopt offline — enabling dep for notebooks |
| scikit-learn-contrib/imbalanced-learn | MIT | Mostly skip — SMOTE *degrades* calibration (a "don't") |
| clawnify/open-studio | MIT | Skip — no Claude tie |
| VoltAgent/awesome-claude-design | MIT | **Adopt the `DESIGN.md` pattern** |
| higgsfield-ai/higgsfield-js | **MIT** | **Use** — headless media-worker SDK w/ provenance |
| robonuggets/higgsfield-skill | CC-BY-4.0 | Skip — thin MCP wrapper |
| higgsfield-ai/higgsfield-client | Apache-2.0 | Skip unless Python media worker |
| Claude Design (Anthropic Labs) *(article)* | hosted | **Pilot** — design-system-from-codebase + Claude Code handoff |
| goldenhousemedia/jamesbarnesmd-website | — | Skip — off-domain (sports *medicine*) |
| stablesports711-hue/stable-sports-iptv | — | **Skip + compliance flag** — IPTV broadcast piracy |
| davidtheaibet/aibet-meeting-room | none (private) | Skip — unlicensed competitor; uncredited ESPN scraping |
| harrischs185/innoweb | — | Skip — off-domain (sports collectibles), thin |

## 15. Batch-2 added backlog (merge into §6)

- **Adopt now:** self-host **Umami** for funnel/conversion analytics; build operator/track-record **Excel
  exports** with **exceljs**; render calibration/line-movement charts with **Vega-Lite (`react-vega`)** + Recharts.
- **Calibration cookbook (§9):** stand up the offline sklearn notebook (isotonic/Platt + `TimeSeriesSplit` +
  ECE/Brier/LogLoss/reliability), export the fitted map, and apply **calibrator → binned-empirical+Wilson →
  shrink-to-baseline → market-gap governor** in the TS engine. Add `statsmodels` Poisson/Dixon-Coles offline for
  a real soccer goal model.
- **Design/media:** pilot **Claude Design** for cockpit views; author a GSN **`DESIGN.md`**; add a headless
  **higgsfield-js** media-worker path with provenance stamping (label + brief ID), mining seedance2 prompt-craft
  for briefs (never fabricating real-event footage).
- **Defer:** **Superset** (internal BI) and **Pathway** (real-time line-movement, only on a push feed).
- **Never:** the IPTV-piracy repo and the unlicensed/uncredited-scraping competitor layer — recorded here so
  they're explicitly out of scope under our clearance + no-piracy posture.

---
---

# Part 3 — Accelerating the Proven-70% Path (code-grounded; every item mapped)

> **Read `docs/path-to-70.md` first — it is the strategy of record and this Part plugs into it.**
> The first two Parts of this doc were written *before* reading the engine and were generic. After reading
> the real code, the picture inverts: GSN has **independently shipped most of the "discipline" the scan
> recommends, often in more advanced form** (Shin **+** goto devig ensemble vs the proportional method;
> `clv.ts`/`clv-capture.ts` + Prisma CLV columns; isotonic/PAVA + Brier-Murphy + ECE + reliability curves;
> an *independent-estimator* `edge-engine.ts`; Merkle `proof-of-record.ts`; `marketGravityIndex`; a Kalshi
> referee; `ml-estimator.ts`; `edge-significance.ts`). So this Part is not "what to build from scratch" —
> it's **which research findings accelerate which step of the existing path to a truthful 70%.**

## 16. The honest 70% (affirming `path-to-70.md`, not re-deriving it)

A **blended / against-the-spread 70% win rate is not real and must never be claimed** (break-even at −110 is
52.4%; the best sustained ATS in the world is ~55–57%; claiming 70% blended trips `scripts/guardrails/trust-gate.mjs`
and burns credibility). "70%" is honest in exactly one framing GSN already chose: a **selective, calibrated,
publicly-proven top tier** where a pick labeled ~70% *actually wins ~70%*, carries **positive CLV**, and is
priced better than −233 (else 70% is −EV). **The only two honest levers on realized win rate are SELECTION
(what you grade) and CALIBRATION (P means what it says)** — both already in the engine, both founder-gated.

**What the research can and cannot do for 70%:**
- It **cannot** shortcut the binding constraint: **Step 0 = ≥100 settled canonical picks** (`public-performance-policy.ts`).
  No repo accelerates the clock; only real settled results prove calibration.
- It **can** (a) **sharpen the probability estimate** so the engine correctly identifies *more* genuine
  ≥70% situations (more tier volume *without lowering the bar*), and (b) **prove the 70% is real, not
  variance** (CLV, significance, reliability curves). That's the whole game.

## 17. Research → mapped onto the `path-to-70.md` staged plan

| path-to-70 step | What it needs | Highest-leverage research accelerant (link → mechanism) | Maps to |
|---|---|---|---|
| **0. Honest sample** | ≥100 settled canonical picks; no leakage | **Offline backtest + calibrator-export lane** (georgedouzas/sports-betting, scikit-learn `TimeSeriesSplit`, statsmodels) → validate calibration on *historical* settled data and pre-prove the method before the live sample matures; **walk-forward only** fixes the in-sample self-validation in `calibration-apply.ts` | new `scripts/analytics/` notebook lane + a general `backtest-harness.ts` |
| **1. Calibrate confidence→P** | small-n-safe, conservative, leak-free calibration | **Calibration-ladder upgrades** (Alex-2911 ladder + nadzhh shrinkage + scikit-learn): add **Platt/sigmoid for small-n** (you'll be small-n for a long time; isotonic-only is the wrong default), **binned-empirical + Wilson lower-bound** (publish the bucket's *lower* win-rate — a defensible 70%), **shrink-to-baseline**, **market-gap governor** | `calibration-apply.ts`, `probability-calibration.ts`, new `binned-empirical.ts` |
| **2. Price the independent edge** | the sharpest possible P, to find true ≥70% spots | **★ Multi-market true-probability ensemble** (Kalshi **already wired** + Polymarket + Shin-consensus + Poisson/Elo/ML, **precision/inverse-variance weighted**) → lower-vig markets + model triangulation = the cleanest `p_fair`, surfacing more genuinely-mispriced ≥70% picks; **cross-market divergence/steam** as a leading edge-confirmation | `edge-engine.ts`, `market-read.ts`, new Polymarket referee |
| **3. Define the conviction tier** | fill scarce ≥70% slots with the best qualifiers | **Learned no-bet abstention** (charlesmalafosse) + **contextual-bandit surfacing on CLV reward** (llSourcell RL *reframed*) to allocate attention to the highest-CLV ≥70% qualifiers; **Dixon-Coles τ** (✅ shipped this pass) sharpens soccer multi-market P | `conviction-tier.ts`, `poisson.ts` |
| **4. Prove it in public** | the moat: a calibrated, auditable record | **Reliability diagram + Wilson-bounded per-bucket win-rate table via `react-vega`** (Vega-Lite, BSD-3); CLV beat-rate + edge-significance p-value + Merkle links on one page; **`exceljs`** track-record export; **Umami** to measure the FOUNDING→PROVEN conversion | `/methodology`, `/proof` routes; `react-vega`; `exceljs`; Umami |
| **5. Keep improving** | tune without overfitting; find new spots | **Black-box threshold tuner** (Optuna over walk-forward CLV — **not betty**, the inner loop isn't differentiable); **statsforecast line-movement/steam** signal; drift monitor (`calibration-drift.ts`, exists); **war-room content** + **synthetic-fade** as labeled cockpit experiments | new `threshold-tuner`; statsforecast worker |

## 18. The ranked accelerant builds (what to actually do, tagged by 70%-role)

> Tags: **[FIND]** = surfaces more true ≥70% picks · **[PROVE]** = makes the 70% believable/auditable ·
> **[DATA]** = matures the settled sample faster/cleaner. None flips a `MODEL_VERSION` gate — that stays the founder's audited call.

1. **★ Multi-market true-prob ensemble + cross-market divergence** **[FIND]** — precision-weight Kalshi (wired) +
   Polymarket (new, clearance-gated read-only) + Shin-consensus + Poisson/Elo/ML into one calibrated `p_fair`;
   emit `crossMarketDivergence` + its time-derivative. *Socket already exists (`edge-engine.ts`); ~70% of the
   plumbing is built; this is the flagship "find more honest 70% picks" lever and it directly serves the CLV milestone.*
2. **Honest calibration ladder** **[PROVE]+[FIND]** — Platt/sigmoid small-n + binned-empirical/Wilson +
   shrink-to-baseline + market-gap governor, composed after the existing isotonic calibrator; fixes the
   in-sample-validation leak. *This is the literal switch behind `conviction-tier.ts` and the PROVEN milestone.*
3. **Offline backtest + calibrator-export notebook lane** **[DATA]+[PROVE]** — sklearn `CalibratedClassifierCV(cv=TimeSeriesSplit)`
   + statsmodels Poisson, over real `Odds` history + settled picks; exports the versioned calibrator for build #2.
   *Converts the "fixture-scaffolded proof" admission into a real historical-proof artifact.*
4. **Public calibration/proof surface** **[PROVE]** — reliability diagram + Wilson per-bucket table (`react-vega`),
   CLV beat-rate, edge-significance, Merkle links, `exceljs` export, Umami conversion analytics.
5. **Line-movement forecasting + steam/anomaly engine** **[FIND]** — statsforecast AutoETS/MFLES batch worker
   building the doctrine-only `market-gravity.md`/`weak-signal-engine.md`; bounded `confidence_adjustment`; defer
   pathway until a push feed (Elite real-time alerts) exists.
6. **Canonical UOF-shaped odds schema + normalizer** **[FIND]+[DATA]** — `Event→Market{specifiers,status,lineId}→Outcome{odds,impliedProb,active}`,
   nullable odds, per-source `lastProcessedAt`; promotes the shadow `lineMovement`/`closingLineValue` factors and
   satisfies "no stale data" by heartbeat (minus5/go-uof-sdk).
7. **Dixon-Coles τ for soccer** **[FIND]** — ✅ **shipped this pass** (`poisson.ts`: `dixonColesTau`,
   `dixonColesJointMatrix`, `moneylineProbabilitiesDC`, `overUnderProbabilitiesDC`, tests) — closes the gap where
   the header cited Dixon-Coles but shipped independent Maher. Remaining: fit ρ per-league + λ ingestion (gated).
8. **Contextual-bandit surfacing/exploration** **[FIND]** — LinUCB/Thompson over pick features with **CLV as an
   instant reward** for the scarce cockpit/free-pick slots and new-market exploration; *allocation layer only —
   never resurrects a PASS into a SPEAK.*
9. **War-room multi-agent content** **[PROVE-adjacent]** — Bull/Bear/Sharp/Skeptic debate over the factor trail
   (reuses the `DRAFT_ONLY` agent-council pattern); forces the bear case into every pick — on-brand for a
   "publish your losses" platform. (Synthetic-fade = labeled experiment, must earn CLV correlation first.)
10. **Threshold tuner (Optuna, not betty)** **[FIND]** + **CLIP media brand-safety/dedup** **[product]** +
    **news-velocity weak-signal worker** **[FIND, operational]** — second-order plays; all gated, all clearance-respecting.

## 19. Net-new doctrine gaps the research names (not yet in GSN's docs)

- **Time-ordered validation as an engine invariant** — add a doctrine line + a **CI test that fails any calibrator
  validated in-sample/random-split** (`calibration-apply.ts` currently validates on the sample it fit — the exact
  leakage Alex-2911's bugs illustrate). Cheap, high-trust.
- **Learned "no-bet" abstention** (charlesmalafosse) — model PASS as a trained, EV-objective decision, not only a threshold.
- **Prediction-market mid as a named vig-free calibration anchor** (polymarket_gambot) — articulate Kalshi/Polymarket
  as a secondary CLV cross-check, not just one referee.
- **Conversion analytics** — no doc owns funnel/conversion measurement for the pricing-ladder milestones; Umami (MIT, same stack) is the $0 fit.

## 20. Full coverage ledger — ALL ~73 items (nothing skipped)

**A. Already shipped in the engine (these links validate existing modules — no build):** WagerBrain & mberk/shin
& goto_conversion → `shin-devig.ts`/`scoring.ts`/`kelly.ts` (+ELO estimator); EDGE_BOT/mlb-slate CLV → `clv.ts`/`clv-capture.ts`+DB;
scikit-learn/Basketball_prediction/sports_analytics calibration *measurement* → `probability-calibration.ts` (isotonic/Brier-Murphy/ECE/reliability)
+ `model-limitations.wilsonInterval`; FIFA-WC/englianhu/statsmodels Poisson → `poisson.ts`/`team-rates.ts`; CardinHa/prediict
Kelly/EV → `kelly.ts`/`bankroll.ts`; sportsAPBot/mlb-slate/betting_edge factor trail → `composite-score.ts`; arbitrage-repo
consensus/steam → `market-read.ts` (`marketGravityIndex`); polymarket_gambot/Kalshi referee → `kalshi-client.ts`+`edge-engine.ts`;
kyleskom ML → `ml-estimator.ts`; Merkle proof → `proof-of-record.ts`; mlb-slate/CardinHa grading → `settlement.ts`; J1BON Reddit →
`reddit-narrative-source.ts`+`narrative-signal.ts`; paper-betting-tracker MC significance → `edge-significance.ts`; betting_edge RG gate → `responsible-gaming.ts`.

**B. Finish-the-dormant (built but gated; research supplies activation mechanics) — top 70% leverage:** Alex-2911 +
nadzhh + scikit-learn → calibration-ladder upgrades (Platt/Wilson/shrink/market-gap, walk-forward fit); georgedouzas/sports-betting +
statsmodels + pandas + lazypredict + ProphitBet → offline backtest/notebook lane; minus5/go-uof-sdk → canonical odds schema;
FIFA-WC/englianhu + openfootball → Dixon-Coles (✅ τ shipped) + λ ingestion.

**C. Net-new signals/engines (additive; build toward more/better 70% spots):** ★ Kalshi+Polymarket+arbitrage repos →
multi-market true-prob ensemble + divergence/steam; Nixtla statsforecast → line-movement/anomaly engine (pathway deferred);
llSourcell RL *reframed* → contextual bandits (CLV reward); MiroFish *reframed* (build own minimal — AGPL) → war-room content +
labeled synthetic-fade; CLIP → media brand-safety/logo/dedup + "setups-like-this" (own feature-embeddings); J1BON patterns →
news-velocity weak-signal worker; betty → *concept only* (use Optuna, inner loop non-differentiable); devig-method-disagreement (Shin/goto/naive) → small signal.

**D. Product / infra adopt:** **Umami** (MIT, same stack) ADOPT analytics · **exceljs** (MIT, not Go's excelize) ADOPT exports ·
**Vega-Lite/`react-vega`** (BSD-3) ADOPT calibration charts · **Claude Design** + **awesome-claude-design** `DESIGN.md` (MIT) PILOT ·
**higgsfield-js** (MIT) + connected MCP + seedance prompt-craft USE (provenance-stamped) · **Miller** (BSD) ADOPT ops/backfill ·
**Superset** (Apache-2.0) EXPERIMENT internal BI · **Pathway** (BSL) DEFER to push-feed · **statsforecast/neuralforecast** (Apache-2.0)
EXPERIMENT (= build #5) · **lazypredict** (MIT) R&D-only bake-off · **kserve** (Apache-2.0) DEFER (needs k8s) · **pandas/seaborn** (BSD) offline-only ·
**scc** (MIT) optional CI metric · **AKCodez higgsfield-claude-skills** (no license) PARTIAL (prompt templates clean-room).

**E. Decline (with reason):** smile (JVM + **GPL-3.0**), imbalanced-learn (**SMOTE degrades calibration** — a "don't"),
plausible (**AGPL**+Elixir+ClickHouse → use Umami), VegaScroll (abandoned iOS), open-studio (no Claude tie), Edit-Banana
(**AGPL**, diagram→DrawIO, off-domain), higgsfield-ai/higgsfield (dead GPU framework, name collision), higgsfield-client
(skip unless Python worker), robonuggets/higgsfield-skill (thin MCP wrapper), MiroFish-as-picks (AGPL + violates calibration —
*pattern reused in C*), le-wm (visual world model, true skip), llSourcell-as-MDP (skip — *bandit reframe in C*), companygondu
MLB-montecarlo (no actual MC), Sports-Betting-Sportsbook/Active37/Swati7819/vegassportsbook/jhogarciacu/ursusandwolf/pybet/Fremont28/bet-coach/Neo4j-API
(empty/thin/off-domain — concept-only at most), Bet-on-Sibyl/DKscraPy/sportsbookreview-scraper/JustBeYou (scrapers — technique refs only, clearance-gated; UOF is the legit target).

**F. Compliance / off-domain decline:** ⚠ **stable-sports-iptv** (broadcast IPTV **piracy**) · ⚠ **aibet-meeting-room**
(unlicensed competitor, **uncredited ESPN scraping**) · jamesbarnesmd-website (sports *medicine*) · innoweb (sports *collectibles*).

## 21. Honest bottom line

A **proven, calibrated ~70% high-conviction tier is achievable and genuinely first-of-kind** — not because the
model is a crystal ball, but because the **selectivity + calibration + public proof** is something essentially no
competitor does. The research **sharpens the probability** (the multi-market ensemble is the flagship "find more
honest 70% picks" lever) and **strengthens the proof** (reliability curves, CLV, significance, Merkle). But the
**binding constraint is settled data** (`path-to-70.md` Step 0) — the clock no repo can shortcut — and **blended/ATS
70% remains impossible and must never be claimed** (it would violate the trust guardrails the platform is built on).
Chase **calibration error → 0**; the 70% tier is the visible result, and the proof is the moat.
