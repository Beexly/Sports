# STATISTICS lane — Board-group Mondrian + ordering design
**Date:** 2026-09-18  
**Lane:** STATISTICS (follow-through on James-Stein / CQR / Jackknife+ / ACI / Mondrian)  
**Status:** MEASURED on local receipts snapshot; full 3,257 board export **NOT RUN** (no `verifier/picks-h1.json` production export; law 7 bars DB access).

---

## 0. What this is (and is not)

**OBSERVATION — data actually scored tonight**

| Item | Value |
|---|---|
| Source | `docs/data/receipts-snapshot-2026-09-08.json` |
| Harvested | 2026-09-08, shaOk 1111/1111 |
| Scored n | **1,087** settled WIN/LOSS (excluded: VOID 19, PUSH 5) |
| Claimed p | **marketFairProb on all 1,087 rows** (confidence/100 unused) |
| Missing on export | `bookmakerCount`, `rankingP`/`rankingSource`, realized margins/final scores |
| Full published board (3,257) | **NOT RUN** — export absent |

**OBSERVATION — method constraints honored**

- One quantile per bin; **no borrowing** across bins.
- Finite q̂ only if `n ≥ ceil(1/α)−1`; at α=0.10 that is **n ≥ 9**.
- `n < 9` → **q̂ = +∞**, coverage reported as **null** (not 1.0).
- Existing `MondrianResidualManager` hierarchical fallback is **not** used for these claims.
- Correct primitive shape: `mondrianResidualThresholds` with `Infinity` on thin groups.

**CARRIED WARNING (load-bearing, every result below)**

> **MONDRIAN PARTITIONS A SCORE. IT DOES NOT FIX AN INVERTED ONE.**  
> Each bin’s top band can still invert. Residual-interval coverage is not rank calibration.

**INFERENCE vs SPECULATION** — labeled in each section. Numbers under OBSERVATION come from the script run recorded in `mondrian-board-groups-2026-09-18.json`.

---

## 1. PRIMARY TASK — Mondrian on real board groups

### 1.1 Pre-registration (before reading coverage)

| Prediction (kill line on the same line) |
|---|
| Pooled residual q̂ will sit **between** lean and fat bins, not at the fat bin — **kill line:** pooled q̂ ≥ fat-bin q̂ (pooled would then *overstate* scale; pooling-understates claim dies). |
| Under **pooled** q̂ applied to every bin, fat bins **under-cover** and lean bins **over-cover** — **kill line:** no bin’s pool coverage more than 3pp off its own-q̂ coverage in the opposite direction of the fat/lean split. |
| SPORT q̂ scale fat/lean ratio > 1.15 on eligible bins — **kill line:** ratio ≤ 1.15. |
| MLB run line (`SPREAD|MLB` abs(line)≈1.5) residual scale **not comparable** to variable-line spreads — **kill line:** treat as comparable only if |meanR_runline − meanR_nonrun| < 0.02 AND own q̂s within 10%. |
| BOOKS bucket: **NO prediction** — field absent. Status **INFINITE / NOT RUN** until `bookmakerCount` joins the export. |
| TIMING: in-play_or_at_kickoff hit rate exceeds pre_game by >10pp → **refuse ordering claims on the mixed sample**. |
| MODEL_VERSION mean residuals: heteroscedasticity present if max version-bin meanR − pooled meanR > 0.01. |

### 1.2 Dumb baseline (same scored rows)

| | |
|---|---|
| Pooled q̂ | **0.5913** |
| Pooled coverage @ that q̂ | **0.9016** (n=1087) |
| Theorem target | 0.90 |

**INFERENCE:** Marginal coverage ≈ 0.90 is **by construction** under split conformal on pooled residuals.  
**It is not a statement about any sport, market, or version bin.** Do not publish 90.2% as “the board is calibrated.”

### 1.3 Per-bin coverage with **own** q̂ (strict Mondrian)

α=0.10, min n=9. Coverage null when q̂ infinite.

#### Axis: sport

| Bin | n | own q̂ | own coverage | mean residual | hit rate |
|---|---:|---:|---:|---:|---:|
| MLB | 705 | 0.5989 | 0.9021 | 0.4605 | 0.4894 |
| NCAAF | 199 | 0.5057 | 0.9045 | 0.4527 | 0.6080 |
| MLS | 153 | **0.6788** | 0.9085 | 0.4893 | 0.5098 |
| NFL | 30 | 0.5059 | 0.9333 | 0.4576 | 0.3667 |

**OBSERVATION:** fat/lean own-q̂ ratio MLS:NCAAF = **1.342** (> 1.15 → prediction survives).

#### Axis: market type

| Bin | n | own q̂ | own coverage | mean residual | hit rate |
|---|---:|---:|---:|---:|---:|
| SPREAD | 512 | 0.6056 | 0.9023 | 0.4868 | 0.4375 |
| TOTAL | 396 | 0.5146 | 0.9040 | 0.4993 | 0.4949 |
| MONEYLINE | 179 | **0.7632** | 0.9050 | 0.3150 | 0.7542 |

**OBSERVATION:** MONEYLINE residual *quantile* is much wider despite lower *mean* residual — distributional shape differs; pooling one q̂ across markets is wrong even when means look similar.

#### Axis: market × sport (textbook run line called out)

| Bin | n | own q̂ | own coverage | mean residual | hit rate |
|---|---:|---:|---:|---:|---:|
| **SPREAD\|MLB_RUN_LINE_1.5** | **307** | **0.6220** | 0.9055 | 0.4788 | **0.4007** |
| SPREAD\|MLB_NON_RUN_LINE | 20 | 0.5834 | 0.9500 | 0.4774 | 0.4500 |
| MONEYLINE\|MLS | 46 | **0.8323** | 0.9348 | 0.4670 | 0.5652 |
| MONEYLINE\|NCAAF | 25 | 0.2225 | 0.9600 | 0.1209 | 0.9600 |
| **MONEYLINE\|NFL** | **5** | **+∞** | **null** | 0.2408 | 0.8000 |
| (other bins ≥9) | … | … | ~0.90–1.00 | … | … |

**OBSERVATION — run line:** meanR run-line 0.4788 vs non-run 0.4774 (Δ=0.0014) but own q̂ 0.622 vs 0.583 (7% gap) on n=20 non-run (thin). Hit rate 40.1% on run lines is the product fact, not a conformal coverage fact.

**Kill line (comparability):** |Δ meanR| < 0.02 **passes** on means; n=20 non-run means the scale comparison is **underpowered**. **INFERENCE:** do **not** merge run-line and variable-line residual stores; keep separate bins. STRUCTURAL difference (fixed 1.5 ladder, 50 free consensus/depth points) remains a **score** defect Mondrian cannot fix.

**Kill line (MONEYLINE\|NFL):** n=5 < 9 → **q̂ infinite, coverage null**. This is the method working. Do not clamp.

#### Axis: bookmaker-count bucket

| Bin | n | own q̂ | coverage |
|---|---:|---:|---:|
| UNKNOWN_NO_bookmakerCount_FIELD | 1087 | 0.5913 | 0.9016 (this is the pooled bin — **not** a books result) |

**STATUS: NOT RUN.** Field absent on receipts export.  
**Named data needed:** production picks / factorBreakdown `bookmakerCount` (or signal-snapshot books count) joined to settled rows.  
**Pre-registered buckets for the real run:** `0`, `1`, `2–4`, `5–9`, `10+`. Prediction: thin-book bins have **wider** residual q̂; kill line: q̂(10+) ≥ q̂(2–4).

#### Axis: pre-game vs in-play (proxy: frozenAt vs commenceTime)

| Bin | n | own q̂ | own coverage | mean residual | hit rate |
|---|---:|---:|---:|---:|---:|
| pre_game | 935 | 0.5850 | 0.9016 | 0.4824 | **0.4802** |
| in_play_or_at_kickoff | 152 | 0.7632 | 0.9079 | 0.3438 | **0.6974** |

**OBSERVATION:** hit-rate gap **+21.72pp**. Mean residual **lower** in-play (0.34 vs 0.48) — claims look “more correct” when priced after kickoff.

**PRE-REGISTERED KILL LINE: TRIGGERED.**  
> Refuse board-ordering comparisons on any **mixed** pre-game + in-play sample. Ordering work must use eligibility-clean **pre-game only** (or report the two strata separately).

This matches C-298/C-325 production findings (in-play 73.5% vs pre-game 52.3%). Third independent angle on contamination.

### 1.4 THE PRODUCT DEFECT — coverage under **pooled** q̂ (no borrowing in the *report*; pooling is the *board* behavior)

Applying **one** pooled q̂=0.5913 to every bin (what a non-Mondrian board does):

| Axis / bin | n | own q̂ | own cov | **pooled cov** | **under/over** |
|---|---:|---:|---:|---:|---:|
| sport MLB | 705 | 0.5989 | 0.9021 | 0.8879 | **−1.4pp under** |
| sport MLS | 153 | 0.6788 | 0.9085 | 0.8366 | **−7.2pp under** |
| sport NCAAF | 199 | 0.5057 | 0.9045 | 0.9899 | **+8.5pp over** |
| sport NFL | 30 | 0.5059 | 0.9333 | 0.9667 | +3.3pp over |
| market SPREAD | 512 | 0.6056 | 0.9023 | 0.8730 | **−2.9pp under** |
| market TOTAL | 396 | 0.5146 | 0.9040 | 0.9975 | **+9.3pp over** |
| market MONEYLINE | 179 | 0.7632 | 0.9050 | 0.7709 | **−13.4pp under** |
| **MLB run line** | 307 | 0.6220 | 0.9055 | **0.8046** | **−10.1pp under** |
| **MONEYLINE\|MLS** | 46 | 0.8323 | 0.9348 | **0.5652** | **−37.0pp under** |
| TOTAL\|MLB | 275 | 0.5138 | 0.9055 | 1.0000 | +9.5pp over |
| in_play | 152 | 0.7632 | 0.9079 | 0.8421 | −6.6pp under |
| pre_game | 935 | 0.5850 | 0.9016 | 0.9112 | +1.0pp over |

**INFERENCE — third measurement of one defect (same shape as AFC/NFC and ECE pooling):**

| Measurement | Pooled number | Fat stratum | Lean stratum | Shape |
|---|---|---|---|---|
| Turnover Mondrian (prior lane) | q̂ 15.6 | AFC 23.6 | NFC 14.3 | pooled ≈ lean |
| ECE by model version | pooled 0.0524 | v5.2.7 0.1089 | v5.2.6 0.0587 | pooled **below** strata |
| **Board residual q̂ (tonight)** | **0.5913** | MLS 0.679 / ML 0.763 / ML\|MLS 0.832 | NCAAF/NFL 0.506 | pooled **between**; fat bins under-covered |

**Kill lines:**

1. Pooled q̂ ≥ fat-bin q̂? **No** (0.591 < 0.832) → pooling-understates claim **survives**.
2. Fat under-cover / lean over-cover under pooled q̂? **Yes** (MLS −7.2pp, ML −13.4pp, run line −10.1pp, ML\|MLS −37pp; TOTAL +9.3pp, NCAAF +8.5pp) → **survives**.
3. Sport fat/lean q̂ ratio > 1.15? **1.342** → **survives**.
4. MODEL_VERSION max meanR − pooled meanR = 0.0125 > 0.01 → mild version heteroscedasticity **present** on this snapshot (weaker than market/sport axes).

**SPECULATION (flagged):** The ECE pooling defect and residual-q̂ pooling defect are the **same mathematical object** — a weighted average of stratum quantities under signed cancellation / scale mix — not two unrelated bugs. C-293 already proved ECE pooled-vs-stratum gap is triangle-inequality cancellation. Residual q̂ pooling is scale mixing (order statistics of a mixture). **Do not treat them as independent evidence of “the model is fine in the pool.”**

### 1.5 What a customer can be misled in (the bins that matter)

| Customer-facing group | Mislead under pooled residual logic |
|---|---|
| **MONEYLINE** (esp. MLS) | Pooled interval too **narrow**; board looks 90% covered overall while ML\|MLS sits at **56.5%** under pooled q̂ |
| **MLB run line spreads** | **80.5%** coverage under pooled q̂ vs 90.6% own — plus structurally degenerate score (consensus/depth constants) Mondrian cannot repair |
| **MLS / thin markets** | Fat residuals; pooled q̂ borrowed from MLB mass |
| **NFL moneyline** | n=5 → infinite q̂ — **honest refuse**, not a silent clamp |
| **Any in-play-contaminated aggregate** | Hit rates inflated ~22pp; any ordering “winner” on mixed sample is look-ahead |

---

## 2. SECOND TASK — Unconfounded ordering comparison

### 2.1 Why the pre-registered comparison cannot run as stated

**OBSERVATION (production census, quoted in the lane brief):** board ordering basis is **perfectly collinear** with MODEL_VERSION:

| Version cohort | n (census) | Ordering basis |
|---|---:|---|
| v5.0.0 + v5.1.0 | 887 + 595 | 100% confidence |
| v5.2.2 … v5.2.7 | 1,775 | 100% rankingP |

Zero overlap. Any comparison of “confidence board vs rankingP board” on settled published rows is a **version effect** wearing an ordering label.

**OBSERVATION (tonight’s receipts):** export has `modelVersion` + `confidence` + `marketFairProb` on every row; **`rankingP` absent**. Receipts alone cannot complete a rankingP vs confidence duel either.

### 2.2 Options

| Option | What it answers | Fatal flaw |
|---|---|---|
| **(a)** Restrict to one model version, compare orderings within it | Would remove version confounding | **No version contains both bases.** Confidence cohort is only pre-v5.2.2; rankingP cohort only v5.2.2+. Within-version “confidence board vs rankingP board” has **zero support**. |
| **(b)** Treat live surface as closed; re-scope to historical record | Describes what each era did | Still **cannot identify ordering vs version** if the comparison is across eras. Historical record is not a randomized ordering experiment. |
| **(c)** Something better | See below | — |

### 2.3 ARGUMENT — pick **(c): version-fixed recomputed orderings on one eligibility-clean sample**

**Claim:** The collinearity is between the **published board basis label** and version. It is **not** a collinearity between **numeric scores stored on the same rows**.

**OBSERVATION from code/types:** `confidence` is written on every pick (heuristic score). `rankingP` is written when independents price (v5.2.2+ path). `marketFairProb` is publish-time market de-vig (receipts/odds). All three can be **read as sort keys on the same row** when present.

**Design (pre-registered before measuring):**

1. **Primary sample P:** settled, published, non-founder, **pre-game only** (`generatedAt < commenceTime`; unknown clock kept only in a sensitivity cell), eligibility exclusions counted (in_play, three_way, no_market_p, unverifiable_market_p), **modelVersion ∈ {v5.2.2 … v5.2.7}**, rows carrying **both** finite `confidence` and finite `rankingP` and finite `marketFairProb` (odds-table resolution order per C-298/C-105 — not receipt-first drift).
2. **On sample P only**, recompute four sort keys (do not use historical board order):
   - `O1` confidence (descending)
   - `O2` rankingP (descending)
   - `O3` marketFairProb (descending)
   - `O4` dumb baseline: shuffle with fixed seed, or sort by generatedAt (time order)
3. **Secondary sample H1/H0:** pre-v5.2.2 rows with confidence + marketFairProb only. Compare O1 vs O3 vs O4. **rankingP is structurally missing — report as NOT RUN, not as zero.**
4. **Never pool H1/H0 with P** into a single “ordering winner.”

**Metrics (each ordering, same sample, same rows):**

| Metric | Definition | Why |
|---|---|---|
| Decile monotonicity | realized hit rate by score-decile; count inversions | Directly diagnoses inverted confidence |
| Decile Brier / ECE | claimed p_decile vs realized | Calibration of the *ordering-implied* probability |
| Top-decile hit rate + Wilson 95% | vs sample base rate | Product-visible “top of board” claim |
| Pairwise rank correlation | Kendall/Spearman(score, y) | Ordering quality independent of threshold |
| Dumb-baseline duel | O4 on identical rows | Hard rule: method that does not beat mean-only/time-only is dead |

**Inference rule (hard):**

- Report **one interval per ordering** (Wilson on top-decile hit; bootstrap over **slates/days** for decile Brier differences).
- If intervals **overlap**, write **“intervals overlap”** — do **not** name a winner.
- Four orderings × one sample = four chances to find a winner by noise. Correct for multiplicity on pairwise decile tests or report raw + adjusted.

**Predictions + kill lines (same line):**

| Prediction | Kill line |
|---|---|
| On sample P, rankingP deciles are **more monotone** than confidence deciles | Kill if inversion count rankingP ≥ inversion count confidence. |
| On sample P, rankingP top-decile Wilson interval does not sit **entirely above** confidence top-decile interval | Kill “rankingP orders the board better” as a *product* claim if intervals overlap — still allow “confidence is non-monotone” as a *defect* claim. |
| On sample P, **neither** O1 nor O2 beats O3 (marketFairProb) on decile Brier | Kill both as edge claims; report market as the ordering the data support. |
| On sample H, confidence top-decile hit is **not** monotonically above bottom-decile | Already expected from 80+ band data; kill any residual claim that historical confidence board was a useful ranker. |
| Mixed pre-game+in-play ordering duel | **Refuse** (timing kill already TRIGGERED tonight). |

**What (c) is not:** It is not “replay the live board.” It is a **counterfactual sort** on frozen rows. It answers “if we had sorted this version cohort by score X, what would top-of-board look like?” It does **not** claim the historical UX used that sort.

**Fallback if rankingP is absent on too many P rows:** primary collapses to O1 vs O3 vs O4 on the largest eligibility-clean pre-game cohort that has marketFairProb; rankingP marked **DATA BLOCKED** with the named missing field — then run the **next** standing-loop step (do not idle).

### 2.4 Pre-registration artifact for the real run

When `verifier/picks-h1.json` (or a calibration-metrics export) lands:

```
Sample: PICKS-H1 ∩ pre_game ∩ eligibility-clean ∩ finite scores
Orderings: confidence | rankingP | marketFairProb | time/shuffle baseline
Split: time-ordered — discover era for any threshold; validate era for intervals
Bootstrap: slates/days, never rows
Report: interval per ordering; overlap => say overlap
Kill lines: as table above, written into docs/factors or stats-lane YAML BEFORE the run
```

---

## 3. Standing loop — what runs next (never idle)

### Step 2 — Heteroscedastic CQR (scale residuals)

**OBSERVATION:** Tonight’s residual axis already shows scale heterogeneity by market and sport (MONEYLINE q̂ 0.76 vs TOTAL 0.51; MLS 0.68 vs NCAAF 0.51). That is a **probability-residual** scale split.

**Gap named:** CQR on **realized margins** needs final scores / margin vs line — **absent** from receipts snapshot.

**Design (run as soon as a margin-bearing export exists; shape pre-registered):**

- Residual: `r_i = | (margin_i - line_i) |` or CQR nonconformity on [q_lo, q_hi] if quantile model exists.
- Scale model: `s(x)` from book dispersion at mint, sport, market, |line| bucket, timing stratum — **fit on a discover fold**.
- Scaled residual `r_i / s(x_i)`; Mondrian or pooled q̂ on scaled residuals.
- **Kill line:** scaled method fails to beat mean-only scale (s≡1) on validate-era coverage **or** mean interval width; kill if width does not tighten when extremes are wilder.
- **Dumb baseline:** unscaled pooled q̂ on the same test rows.

**Interim (data available now — do not wait):**  
Heteroscedastic **probability** CQR/CQR-like diagnostic already delivered in §1.4: pooled q̂ understates fat bins. Next code-level experiment: **per-bin residual stores keyed by market×sport, Infinity on n<9, no parent fallback** — shadow only, does not unlock PROVEN.

### Step 3 — ACI on a real stream

**DATA BLOCKED (named):** week-level settled results ordered by **kickoff clock**, not alphabetical team order; two seasons of 32 teams is not a stream.

**Required data:** append-only settled slate with `commenceTime`, result, claimed p — production exports weekly.  
**Do not promote ACI until clock = kickoff.**  
**Next action when blocked on stream:** complete Step 4 n-requirements + wire strict Mondrian shadow stores (Step 2 interim).

### Step 4 — Group-conditional n requirements (answerable now)

| Goal | α=0.10 | Formula / rule |
|---|---:|---|
| Finite conformal q̂ | **n ≥ 9** | `n ≥ ceil(1/α)−1` |
| Coverage SE ≈ 0.03 near p=0.9 | **n ≈ 100** | `z²p(1-p)/e²` |
| Wilson half-width ≈ 0.05 at 0.90 | **n ≈ 138** | `1.96²·0.9·0.1/0.05²` |
| Detect 0.90 vs 0.82 coverage, 80% power, α=0.05 | **n ≈ 200–250 / bin** | two-proportion rough |
| Trust sport×market Mondrian leaf for product claims | **n ≥ 150 / leaf** recommended | diagnostic only below that |
| Detect q̂ scale ratio 1.3 with bootstrap | **n ≥ 50 / bin** minimum; **n ≥ 150** preferred | order-stat stability |

**OBSERVATION tonight:** NFL moneyline n=5 → infinite (correct). NFL sport n=30 is finite q̂ but Wilson on coverage is wide — **diagnostic, not product-grade**.

**Product rule:** publish group-conditional coverage only when bin n ≥ 138 **and** the surface renders n + exclusion counts (L10). Below that, show **INFINITE / underpowered**, never a clamped 83.33% behind a 90% label.

---

## 4. Separate observation / inference / speculation

| Kind | Statement |
|---|---|
| **OBSERVATION** | Receipts snapshot n=1111; scored 1087; pooled q̂ 0.5913; MLS own q̂ 0.6788; MONEYLINE own q̂ 0.7632; run-line pool coverage 0.8046; ML\|MLS pool coverage 0.5652; in-play hit 0.697 vs pre_game 0.480; MONEYLINE\|NFL n=5 q̂=∞. |
| **OBSERVATION** | `bookmakerCount` / `rankingP` / margins absent on export; full board export NOT RUN. |
| **INFERENCE** | Pooled residual scale understates fat board groups — third measurement of the same defect class as ECE pooling and AFC/NFC q̂. |
| **INFERENCE** | Mixed-sample ordering comparisons are **refused** (timing kill TRIGGERED). |
| **INFERENCE** | Option (a) is empty (no dual-basis version); option (b) alone cannot deconfound; **(c) version-fixed recomputed orderings** is identifiable when both scores exist on the same rows. |
| **SPECULATION** | ECE cancellation and residual-scale pooling are one mathematics, two product surfaces. |
| **SPECULATION** | MONEYLINE\|NCAAF hit 0.96 (n=25) may reflect market-true favorites + thin residual, not engine skill — needs marketFairProb vs outcome joint check, not residual width alone. |

---

## 5. Hard rules checklist

| Rule | Status |
|---|---|
| Kill criterion same line as prediction | Yes — §1.1, §2.3 |
| Preserve null/negative results | Yes — books NOT RUN; ML\|NFL infinite; coverage null when q̂=∞; rankingP on H sample NOT RUN |
| Obs / inf / spec separated | §4 |
| Dumb-baseline duel | Pooled q̂ baseline §1.2; time/shuffle O4 in §2.3 |
| Never clamp rank to finite interval | n<9 → +∞ |
| Never report 1−α where theorem gives 1−2α | Reported theorem target **0.90** = 1−α for split conformal residual quantile at level 1−α; no 1−2α claim made. ACI/optional-stopping not claimed. |
| Never return “awaiting data” | Books/margins/rankingP named; Step 2 interim + Step 4 executed now |
| Mondrian ≠ fix inversion | Carried in header, §0, §1.5 |

---

## 6. Files

| File | Role |
|---|---|
| `docs/ops/stats-lane/mondrian_board_groups.py` | Strict no-borrow runner |
| `docs/ops/stats-lane/mondrian-board-groups-2026-09-18.json` | Full machine-readable bins |
| `docs/ops/stats-lane/MONDRIAN_BOARD_GROUPS_2026-09-18.md` | This report |

**Code note (no production change in this lane pass):** `packages/prediction-engine/src/conformal/mondrian.ts` still hierarchical-falls-back. Board-group **claims** in this report must not be generated by that path until a strict mode exists. Suggested strict flag: `useGlobalFallback: false` + `minSamples: ceil(1/α)-1` + return `Infinity` when below — already the semantics of `mondrianResidualThresholds` in `apps/web/lib/calibration/conformal-calibration.ts`.

---

## 7. Bottom line

1. **Strict board-group Mondrian is measurable on receipts tonight** and already reproduces the pooling defect: fat bins (MONEYLINE, MLS, MLB run line) **under-cover** a pooled residual threshold by 7–37pp while lean bins over-cover.
2. **90%+ marginal coverage is not about any bin** — do not publish it as product calibration.
3. **In-play contamination kill TRIGGERED** (+22pp hit) — ordering duels on mixed samples are refused.
4. **Bookmaker-count Mondrian: NOT RUN** — named missing field; infinite until joined.
5. **Ordering comparison design = (c)** version-fixed recomputed orderings on v5.2.2+ rows that carry both scores; intervals on every ordering; overlap means overlap.
6. **Next concrete work:** strict residual stores (shadow), margin-bearing export for heteroscedastic CQR, kickoff-ordered stream for ACI — n thresholds already fixed in §3 Step 4.

---

## 8. ERRATA (2026-09-18 double-check — read before citing §1–§5)

See **`DOUBLE_CHECK_ERRATA_2026-09-18.md`**. Material corrections:

- Residuals on receipts are **`|y − marketFairProb|`** (market), not engine rankingP/confidence. Product-score residual is a **separate** table in the errata.
- In-sample own-q̂ coverage ≈0.90 is **not** a product guarantee. **OOT stratified time-split** still shows fat-bin pooled under-coverage (run line +10.6pp, MLS +8.7pp, ML|MLS +33pp own vs pool) but own-q̂ can **undercover lean bins** under drift (NCAAF spreads 0.81 OOT).
- Naive midpoint time-split is **seasonally confounded** (NCAAF/NFL `n_cal=0`); stratify within sport/market.
- ECE pooling ≠ residual-q̂ pooling “same math” — **withdrawn**.
- Receipts have **no** rankingP/bookmakerCount/modelProb; primary corpus for the next run is **`scripts/export-settled-picks-for-calibration.mjs`** output (founder/ops runs it; law 7).
- Ordering duel must **stratify pickType** — TOTAL rankingP may be a confidence echo.
- Carried warning unchanged: **Mondrian partitions a score; it does not fix an inverted one.**
