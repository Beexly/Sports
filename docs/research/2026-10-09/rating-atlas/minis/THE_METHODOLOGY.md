# THE METHODOLOGY — What's Between the Numbers
**2026-10-10 · companion code: `cfb/cfb_engine.py`, `cfb/book_anatomy.py`, `cfb/cfb_context.py`, `doctrine.py`**
Anyone can find the numbers. Anyone can reverse-engineer an endpoint. The asset is the
**quantified context stack** — measured below on 2,681 CFB games (2023–2026 closes).

---

## 0. The honesty premise (read this before the layers)

100% accuracy does not exist and any seller claiming it is lying. What exists:

```
score = residual(market_close, model)  →  E[CRPS_close] is the bar (CFB wk-6 2026: 7.6174)
```

Accuracy is **relative to the close**, and it is earned subclass by subclass, kill test
by kill test, through the founder gate (n≥100, Brier≤0.22, ECE≤0.05, 3 consecutive green).
The methodology below is the machine that grinds toward that bar — it is not a promise.

## 1. The four-layer information hierarchy

**Everything knowable about a game lives in exactly one of four layers. Money is made
where a layer is priced into one market but not another.**

| Layer | Contains | Who prices it | Our edge mechanism |
|---|---|---|---|
| L1 · the price | the close itself | everyone | anchor it (doctrine rule 2); never beat it without evidence |
| L2 · in the number, not the price | σ, key clusters, hold structure, fav-longshot tax, bias decay | partially priced | trade the mispriced SUBSPACES of the ladder |
| L3 · in the situation, not the number | spots, altitude, motivation, fatigue, injuries | mostly unpriced by retail; partially by sharps | subclass residuals → registry → gate |
| L4 · in the flow, not the situation | who moves first, steam, maker walls, latency | priced seconds later | be the reader, not the read |

## 2. LAYER 2 — measured (in the number, not the price)

### 2a. Key-number clusters (CFB, n=2,681)
- **|3| + |7| = 18.6% of all CFB games land on a key number** (3: 5.26% home side,
  −3: 4.92%, 7: 4.55%, −7: 3.92%).
- The full spike ladder: 3, 7, 10 (2.80%), 14 (2.87%), 17 (2.39%), 21 (2.31%) — CFB keys
  are **not** NFL keys. 13/14 both spike; 20/21 both spike; −17 (1.68%) spikes harder than −20.
- **The money:** alt-line pricing near keys is where the Gaussian approximation is worst.
  A book that interpolates a spread ladder with σ=15.15 smooths across the spikes; the true
  distribution is lumpy. Buying the cheap side of a key (3/7/17/21) when the ladder price
  lags the empirical mass = structural, repeatable, quantifiable edge on *alt* lines.
- This is why rule 12 (scheme) and rule 18 (σ) are separate: the ladder shape is a
  distribution question, not a mean question.

### 2b. Closing-total bias is a REGIME, not a constant
- Week-by-week 2026: −1.05, −0.07, **+3.20**, −0.83, +1.14, +3.00.
- The sign flips. A single "books shade totals by X" constant is FALSE — the bias is a
  time series with regime shifts (early-season totals uncertainty → week-3 overshoot).
- **The money:** bias *decay tracking* (EWMA of recent-week residual) is a legitimate
  candidate feature — but only via the gate (rule 8 discipline: measured, never assumed).

### 2c. Where the spread misses: the blowout tax
- Residual (actual − close) by favorite size: 1–6: +0.66 · 7–13: +0.41 · 14–20: +0.77 ·
  21–30: +0.13 · **31+: +2.84 (n=198)**.
- Big CFB favorites outperform their closing spread by ~2.8 points. Garbage-time
  structure + backups + motivation asymmetry. This is a *priced-in-advance* candidate:
  favs 31+ are systematically under-laid by the close.
- σ stays ~15.2 in EVERY bucket — the spread σ is favorite-size-invariant; only the MEAN
  drifts. That separation (σ robust, μ biased) is exactly what a margin model should exploit.

### 2d. The hold map (from book_anatomy.py, 4 seasons)
- ML holds: DK **4.19%** (engineered constant: 4.20/4.19/4.20/4.09), ESPN Bet 4.24%,
  Bovada 4.52% (offshore tax), WH-NJ (old Caesars) sharp at 8.335 CRPS.
- **Fav-longshot tax:** the hold is taken ~3.0 pts from the favorite side, ~1.2 from the dog.
  The dog is the cheap side of the ML. Combined with 2c (favorites under-laid on the spread),
  the books tax favorites on BOTH markets — one shade direction, two expressions.

## 3. LAYER 3 — measured (situational subclasses, residual vs close)

| subclass | n | residual ± SE | t | verdict |
|---|---|---|---|---|
| altitude home (≥4,000 ft) | 190 | **+2.11 ± 1.12** | +1.88 | near-signal; needs n; registry DIAGNOSTIC |
| blowout-class fav (31+) | 123 | **+2.52 ± 1.34** | +1.88 | same — pair with 2c |
| conference game HFA shift | 1,754 | +0.50 ± 0.36 | +1.38 | weak; keep measuring |
| neutral site | 208 | +0.81 ± 1.01 | +0.79 | HFA≈0 confirmed — close prices it |
| late season (wk10+) | 854 | +0.56 ± 0.53 | +1.06 | no standalone edge |
| early season (wk1–3) | 729 | +0.61 ± 0.56 | +1.09 | no standalone edge |

**The protocol (this is the methodology, not the numbers):**
1. Subclass the residuals against the close (never against zero — the close is the prior).
2. t-stat ≥ 1.96 → enter registry as `diagnostic` with the reopen condition pre-written.
3. Walk-forward gate decides promotion (doctrine.py — code, not vibes).
4. A spot that dies (bias decays — see 2b) gets a kill-ledger entry with why.
5. Situational context is CONDITIONAL: model P(margin | spot-class), never a global constant.

**What nobody quantifies (our build list for L3):** post-bye CFB (NFL analog measured −2.33),
rivalry-week margin compression, upset-letdown (post-ranked-win fade), sandwich spots,
portal-departure team-year quality shock, HC/DC transition year-1 spikes, travel-radius
(miles × timezone), and motivation asymmetry late-season (bowl-eligible vs eliminated).
Each enters through the same 5-step protocol. None is assumed.

## 3b. LAYER 3 deep — coaches, rest, travel, weather (the NFL engine rebuilt on CFB rows)

Measured on 2,681 games; coaches from 1,816 CFBD records; weather = Open-Meteo venue
archive; all residuals vs the cross-book closing median:

| factor | n | margin resid ± SE (t) | verdict |
|---|---|---|---|
| first-year coach | 1,389 | −0.33 (−0.80) | **PRICED** — CFB market already discounts transitions (contrast: NFL OC-change shock = live angle) |
| tenure 2–3y / 4–6y / 7y+ | 2,296/839/838 | +0.32 (1.0) / −0.30 / −0.02 | no tenure edge at the close |
| **bye week (≥12d)** | 1,723 | **+0.01 (+0.02)** | **DEAD in CFB** — NFL's −2.33 post-bye does NOT port. Rule 3 vindicated empirically: same feature class, different sport, different truth |
| short rest (≤5d) | 78 | +0.13 (+0.09) | too rare to matter in CFB |
| **travel >1000mi (road)** | 581 | **+1.20 (+1.92)** | NEAR-SIGNAL: long-haul road teams underperform the close — registry diagnostic, needs the n |
| travel 500–1000mi | 832 | +0.07 (+0.13) | nothing |
| wind 15+ mph | 339 | +1.03 (+1.28), total −0.04 | CFB totals NOT wind-depressed in 2025 sample — NFL −0.197/mph NOT assumed; needs multi-season n |
| rain ≥2mm | 157 | +1.11 (+0.96), total −1.17 | direction matches NFL (unders) but n-starved |

**The meta-finding:** the only CFB spot the market misses badly is *geography*
(long travel) and *extreme favorites* (+2.84 blowout tax). Motivation-adjacent factors
(coach transitions, byes, rivalry intensity proxies) are already inside the number.
The L3 build list now prioritizes: travel × altitude interaction, travel on short
prep (Thursday games), and the blowout-tax μ-shift — each through the 5-step protocol.

## 4. LAYER 4 — flow (the honest gap and our build)

- CFBD `lines.lastUpdate` is **never populated** (measured: 0/709) → provider
  move-leadership is NOT computable from archives. Nobody publishes it.
- **The fix is ours:** the snapshot pump (Sat AM / Sun AM / post-whistle cadence, already
  specced in REDUNDANCY.md) timestamps every provider price we can see. Repeated
  latency-stamped snapshots turn into: who moves first, steam direction, shade velocity,
  and close-vs-open drift per book — **a flow dataset nobody sells and nobody publishes.**
- Kalshi maker walls measured live (IND −2.5): yes bid 71¢ (48k contracts at 70¢),
  ask via no-side 74¢ → 1¢ display spread + 1.43¢ taker fee at mid, maker 0¢.
  Exchange cost ≈ 2.9–3.5% round trip vs retail ML 4.19–4.52%. The maker side is free —
  the quoter's edge — and the 1¢ seed walls (1.5M shares at 1¢) show how MM inventory
  is parked. That order-book geometry is flow context no retail book shows.

## 5. How the books actually sleep (revenue models, measured)

- **DraftKings:** engineered-constant hold (4.19% four seasons running) + prop-ladder
  Gaussian pricing (σ 70.9/37.7/41.7 — R² .98 recon) + parlay/SGP correlation tax +
  jersey-tax shading on popular players. Volume machine. Sleeps on the tax, not the line.
- **ESPN Bet (Penn/theScore engine):** holds slightly worse (4.24%), CRPS worst of the
  four (8.633) — acquisition-mode pricing, promo-funded. Fades late, follows early.
- **Bovada:** offshore, no regulatory cost, tightest shade-following (σ 0.44 vs spine) —
  a price-taker with a higher hold. Sleeps on the 0.33% extra hold it charges for access.
- **Caesars/William Hill:** the legacy engine is the *sharpest CFB close in the sample*
  (CRPS 8.335, n=462) — retail brand, steel underlying. The name is the product.
- **Circa:** the opposite model — low hold, the highest limits in Nevada, wins by taking
  wiseguy flow at thin margins and profiting from the square flow that follows it. Their
  close IS a signal (that's why rule 2 anchors to sharp closes, not to Circa itself).
- **Kalshi:** sleeps on fees from both sides of a matched book — zero price risk. The
  quadratic fee `7·p·(1−p)¢` is anti-toxic-flow pricing: cheapest at the extremes where
  quotes are safe, highest at p=0.5 where adverse selection peaks.

## 6. The compounding stack (why this beats "find the numbers")

```
L1 anchor (close, σ 15.15 spread / 15.81 total / HFA 4.32 — all CFB-native)
 + L2 key-cluster ladder pricing + blowout-tax μ-shift + bias-regime tracking
 + L3 subclass spots (altitude, big-fav, + the unquantified build list)
 + L4 our own flow pump (leadership, steam, maker walls)
 ── every layer: diagnostic → kill test → walk-forward gate → CLV → production
 ── enforced by doctrine.py; one invented number = refusal; ledger is append-only
```

Each layer alone is a coin clip. Stacked with enforced honesty, they compound into the
only kind of 100% that exists: **persistent, measured accuracy-versus-close.**

*Founder gate standing: wk-6 2026 close baseline CRPS 7.6174. First candidate
(colley_margin_v1, point-in-time ratings) refused at 140.97 — the gate works; the model
isn't ready. That is the system doing its job.*
