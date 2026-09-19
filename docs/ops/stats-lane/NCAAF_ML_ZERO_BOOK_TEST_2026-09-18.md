# NCAAF MONEYLINE · bookmakerCount=0 · hit 0.8716 (n=109)

**Kill lines first. Do not move them after seeing more data.**

---

## 0. Claim under test

**H_edge:** The engine has information on NCAAF moneyline sides that is **not** in a public price, so unpriced (0-book) published picks win at a rate that cannot be explained by favorite selection or grading error.

**H_artifact:** The 0.8716 on n=109 is a **selection / composition / grading** artifact (unpriced favorites, signal-slate, early-season mismatches, corrupt finals, receipt-style harvest bias).

Repo prior (hypothesis, not proof): Placeability 2026-09-07 already argued high NCAAF ML rates reflect `fairProb >= 0.58` favorite selection and early-season mismatches — **H_artifact**. A separate production table cited **NCAAF ML 94.1% on n=102** decided non-bootstrap — **same direction, different n/rate** than 0.8716 / n=109; first step of the test is reconciling **which rows** make 109 vs 102.

---

## 1. Kill lines (pre-registered)

| ID | Rule | Outcome if triggered |
|---|---|---|
| **K1** | *Kill H_edge* if realized hit − mean **public** implied p ≤ **+3.0 pp**, **or** 95% Wilson lower bound on (hit − implied) ≤ **0**. | Artifact / market-explainable |
| **K2** | *Kill “private info beyond favorites”* if ≥80% of cohort has null `marketFairProb` **and** mean `confidence/100` ≥ 0.75 **and** hit is within **5pp** of book-priced NCAAF ML **same confidence band**. | Selection on engine favorites |
| **K3** | *Kill any edge claim* if **>5%** of cohort fails independent ground-truth re-grade (ESPN/event-id final vs stored `result`). | Grading defect |
| **K4** | *H_edge may be considered only if* K1 survives (gap ≥+3pp, LB>0), K2 fails to explain, K3 passes, **and** the same rule **replicates** on a **second time window** with n≥80. | Otherwise default **H_artifact** |
| **K5** | *Published number rule:* any NCAAF ML rate must show **n**, **bookmakerCount=0**, **pre-game filter**, and the sentence **“unpriced model/signal lane — not a book-priced ATS/ML record.”** Blended board win rate **refused**. | Honesty boundary (L10) |

**Default if data missing:** absent public price for a row → that row **cannot** support H_edge (cannot beat a market it never faced). Report as **NOT RUN vs market**, not as edge.

---

## 2. Procedure (A → E)

### A — Census the cohort (required before any edge language)

On published, non-bootstrap, decided, **pre-game**, `sport=NCAAF`, `pickType=MONEYLINE`, `bookmakerCount=0`:

| Field | Why |
|---|---|
| n decided, wins, hit rate | Reproduce 0.8716 / 109 or report the true figure |
| Date range / weeks | Early-season mismatch check |
| `modelVersion` mix | Engine path |
| Signal-slate signature | `selection` “(model signal)”, `line==0`, slate writes (C-81) |
| `confidence` distribution | Favorite-selection proxy |
| `marketFairProb` null share | K2 |
| Team list / matchup quality | Blowout favorites vs true dogs |
| Duplicate gameId rows | Double-count risk |

**Also reconcile:** 0.8716×109 vs Placeability 94.1%×102 — same population filters or not?

### B — Attach a market benchmark (the only way K1 can fire)

For each pick/side, obtain **one** of (prefer earliest available **at or before** `generatedAt`):

1. Odds-table / receipt `marketFairProb` when any book later priced the game (not 0 at mint — may still exist historically).  
2. Public closing or near-kickoff ML implied p (ESPN, archived Odds API, oddsmagnet if lawful).  
3. `publicMlImpliedProb` column if founder supplies it with the export.

Compute cohort mean implied p̄.  
**K1 test:** hit = wins/n; Δ = hit − p̄; Wilson 95% on hit; optional paired bootstrap over games.

### C — Composition control (K2)

Book-priced NCAAF ML, same era, non-bootstrap, pre-game:

- Stratify by `confidence` decile or `confidence/100` bands.  
- Compare 0-book hit vs book-priced hit **within band**.  
- If gaps vanish within band → **selection**, not private edge.

### D — Ground truth (K3)

Re-grade a **random sample** (or full cohort if n=109) against ESPN/event-id finals (C-150 method).  
Report wrong-result rate. **>5% → K3 kills edge language** even if hit looks high.

### E — Replication window (K4)

Pre-register a second window (e.g. next NCAAF weeks or prior season slice with same rules).  
Same filters, same kill lines. **One-window 87% is not an edge claim.**

---

## 3. Decision table (fill when data lands)

| Check | Observed | Pass/Fail |
|---|---|---|
| A reproduce n/hit | | |
| B mean public implied p̄ | | |
| B Δ = hit − p̄ | | |
| B Wilson LB on hit − p̄ (or hit vs p̄) | | |
| **K1** | | |
| C null-mfp share / mean conf / within-band gap | | |
| **K2** | | |
| D ground-truth error rate | | |
| **K3** | | |
| E replication window hit & K1 | | |
| **K4 / default** | **H_artifact unless K1–K4 all pass** | |
| K5 copy on any public rate | | |

---

## 4. What “tracks residual scale” is **not**

This test is about **hit rate vs market-implied p**, not Mondrian residual width.  
0-book rows may show **narrow** `|y−confidence/100|` residuals if the engine is confidently taking favorites who win — that is **not** H_edge. Residual Mondrian by books bucket answers a **different** question (interval scale); K1–K4 answer **edge vs artifact**.

---

## 5. Interim product rule (until K1–K4 complete)

- Do **not** publish NCAAF 0-book ML 87–94% as engine skill.  
- Performance surface: **separate lane** for `bookmakerCount=0` (C-352 shape).  
- Placeability warning stands: moneyline win rate ≠ edge without price; even-money markets are where win rate ≈ profitability — and those cohorts were **below** break-even on placeable MLB sides/totals.
