# Denominator diagnosis — receipts pre-game 0.4802 vs full board 0.5348

**Lane:** STATISTICS · compose-next · 2026-09-18  
**Status:** DIAGNOSIS from local receipts + repo production anchors. Full-board SQL **NOT RE-RUN** tonight (law 7 — no invented DB access).

---

## 1. The two numbers

| Claim | Value | Source |
|---|---:|---|
| Receipts **pre-game** hit | **0.4802** | Receipts snapshot 2026-09-08, WIN/(WIN+LOSS), `asOf`/`frozenAt` < `commenceTime` (stats-lane Mondrian run) |
| Full published board hit | **0.5348** | User/founder production read — all published non-bootstrap (as stated this turn) |
| Production **pre-game** published non-bootstrap | **0.5234** (2,119 graded) | C-325 / ledger (2026-09-11) |
| Production **in-play** published non-bootstrap | **0.7353** (170 graded) | C-325 |

**Same direction, different level:** receipts pre-game sits **~4–5pp below** production pre-game, and **~5.5pp below** the mixed full-board figure.

---

## 2. What each population actually is

### R — Receipts snapshot (docs/data/receipts-snapshot-2026-09-08.json)

| Property | Observed |
|---|---|
| n harvested | 1,111 (shaOk 1111) |
| Scored decided | 1,087 (VOID 19, PUSH 5 excluded) |
| Pre-game decided | 935 → hit **0.4802** |
| In-play/at-kickoff (proxy) | 152 → hit **0.6974** |
| Sport mix | MLB 728, NCAAF 200, MLS 153, NFL 30 |
| Market mix | SPREAD 526, TOTAL 405, MONEYLINE 180 |
| Fields | **No** bookmakerCount, **no** rankingP, **no** modelProb |
| Clock | `frozenAt` + payload `asOf` vs `game.commenceTime` |
| Selection | Proof-receipts API harvest — **not** a full `picks` table export |

**Mechanisms that push R_pre below B_pre / B_all:**

1. **Harvest ≠ board.** Receipts API is a proof surface; rows without receipts or outside the harvest window never enter R. Denominator is **conditional on having a receipt**.
2. **Sport/market mix.** R is MLB-heavy (~67%) with a large SPREAD share. Placeability: MLB spread/total win rates sit **below** moneyline-heavy boards (MLB spread 46.2%, total 44.0% vs MLB ML 62.8%). A receipts file that over-weights losing MLB sides **depresses** blended hit rate even if every stratum matches production.
3. **Clock proxy.** R uses receipt freeze/`asOf`, production uses `generatedAt < commenceTime`. Close but not identical; residual in-play leakage in R would **raise** R_pre, not lower it — so it does not explain 0.4802 < 0.5234.
4. **No books filter.** R includes unpriced / thin / signal-like rows mixed with book-priced rows. Production performance lanes split `bookmakerCount >= 1` vs `0` (C-352) because they are different animals.
5. **Time window.** frozenAt span 2026-07-09 → 2026-09-07 — not necessarily identical to the full-board query window behind 0.5348.

### B_all — Full published non-bootstrap decided (cited 0.5348)

| Property | Inference from repo |
|---|---|
| Includes in-play? | **If yes** — C-325 shows in-play at **73.5%** vs pre-game **52.3%**, which **lifts** any mixed rate above pure pre-game. |
| Includes moneylines? | Yes typically — high ML rates (favorites, fairProb ≥ 0.58 floor) **inflate** blended win rate vs even-money spreads/totals. |
| Includes signal-slate / 0-book? | Often yes in historical board counts — another composition shift vs receipts-only or book-priced-only. |

**0.5348 is closer to C-325 pre-game 0.5234 than to a heavily in-play mix**, so the cited “full board” is **likely mostly pre-game or lightly in-play**, **or** moneyline-weighted. Without the exact SQL it is not honest to decompose 0.5348 further. **Named gap:** re-run the C-325-style split on the same day the public number is published.

---

## 3. Which denominator is right for a **published** number?

**Answer (normative, grounded in repo law + measurements):**

| Use case | Correct denominator |
|---|---|
| **Public win-rate / performance claim** | **B_pre eligibility-clean:** `isPublished` ∧ `isBootstrap=false` ∧ not founder ∧ `result ∈ {WIN,LOSS}` ∧ `generatedAt < commenceTime`, **plus** rendered exclusion counts (L10): in_play, three_way, no_market_p, unverifiable_market_p, and **books-stratum** if the claim is book-priced. |
| **Book-priced performance lane** | Same as B_pre ∧ `bookmakerCount >= 1` (or ≥2 per calibration books rule). **Never** silently mix 0-book signal rows into “the record.” |
| **Model-signal lane** | `bookmakerCount = 0` reported **separately**, labeled unpriced — not summed into a bettable win rate. |
| **Calibration / ECE / Brier** | Market-anchored eligibility sample (odds-table p at generatedAt), pre-game, counted exclusions — **not** confidence/100, **not** receipts-only. |
| **Receipts snapshot** | **Internal diagnostic only.** Never the published denominator. |

**Why not receipts-only (0.4802):** non-random harvest, MLB/spread-heavy, missing books/rankingP, not the product’s published population.

**Why not B_all mixed (0.5348) without labels:** in-play look-ahead (C-325/C-298) and moneyline favorite selection (Placeability §5) make a **blended** rate a **misleading claim in our favour** if presented as engine skill.

**Why production pre-game non-bootstrap (~0.523 in C-325) is the closest honest anchor:** it already applies push exclusion + pre-game filter on the real board — still requires **stratum splits** (sport × market × books) before any public sentence.

---

## 4. Worked reconciliation (direction only — levels not fully closed)

```
Receipts pre-game (R_pre)           0.4802   n=935  (harvest, MLB/spread-heavy)
Production pre-game (C-325)         0.5234   n=2119 (full board, decided, pre-game)
Production in-play (C-325)          0.7353   n=170
Cited full board (B_all)            0.5348   (composition unknown tonight)
```

| Step | Effect on blended hit |
|---|---|
| Receipts harvest → full board population | Likely **up** (less MLB-spread dominance; more ML / other sports) |
| Add in-play rows to pre-game | **Up** (~+21pp on that stratum) |
| Add 0-book / signal rows | Ambiguous — can be high (favorites) or low; **must not** hide in a public blend |
| Restrict to placeable/book-priced even-money markets | **Down** (MLB totals 36–44% class) |

**INFERENCE:** 0.4802 vs 0.5348 is **not** a contradiction of one engine; it is **two different samples**. Neither is the published claim without the B_pre + strata + L10 recipe.

**SPECULATION:** Part of the gap is MLB SPREAD/TOTAL mass in receipts vs moneyline mass on a “full board” count — test when founder export lands: recompute hit on identical pickType×sport cells for R vs B.

---

## 5. Pre-registered kill lines for denominator work

| Prediction | Kill line |
|---|---|
| R_pre < B_pre because of **sport×market mix**, not grading error | Kill if cell-standardized R hit (B weights) still differs from B_pre by >3pp |
| B_all − B_pre gap driven by **in-play** | Kill if in-play share of B_all is <5% (cannot move 5pp) |
| Public “board win rate” is safe if ≥52.4% | **Kill always** for spreads/totals without price; ML needs implied-p context |

---

## 6. What to publish (one sentence)

> Published performance rates use **pre-game, non-bootstrap, published, decided** picks, split by **market** and **bookmakerCount**, with **in-play and other exclusions counted on the same surface** (L10). Receipts snapshots and mixed full-board blends are **not** the public denominator.
