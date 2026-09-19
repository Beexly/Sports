# PATH FROM 38 → 100 — measured, replaceable, no graveyards
**Mimo statistics lane · 2026-09-19 · worktree `stats-books-ordering-2026-09-18`**

Claude’s 38/100 (booked 2026-09-06) is **conservative and largely correct**. Tonight’s instruments **corroborate** the defects; they also **build the replacements**. Nothing is deleted without a successor.

---

## Scorecard vs tonight’s measurements

| Defect in the 38 | Status tonight | Replacement / path |
|---|---|---|
| Confidence inverted at the top (n 2,385, z −10.7) | **CONFIRMED** in doctrine + ordering duel | **Do not recalibrate confidence.** Public p = **marketFairProb**; ranking on independent/market, not Edge Index |
| CLV ~23% vs 52.4% (n 1,586) | **CONFIRMED** 22.9% all-graded / 40.6% non-push on export | **Model problem, not archive.** Totals spine 56.7%; ML withheld until e-process+logit-pool pass |
| MLB run-line consensus pinned 1.0000 | **CONFIRMED** in code (`scoring.ts` spread sign consensus) | Replace copy/consensus with **side-agreement fraction**; rank off **marketFairProb + adj-EPA**, not consensusScore |
| 50/100 confidence points = book depth | **CONFIRMED** (`WEIGHTS.CONSENSUS 30 + MARKET_DEPTH 20`) | **Zero depth for ranking** until MODEL_VERSION bump; depth stays **evidence display only** |
| Book depth anti-predictive on MLB spreads | **Direction consistent**; **Simpson** — v5.2.7 gap −7.2pp, CIs overlap | Stratify by modelVersion always; more v5.2.7 settles before any weight edit |
| NFL ~70 settled picks | **CONFIRMED** scarcity | Sample is the long game; **do not** invent rows |
| Opponent-adjusted EPA/play not built | **BUILT TONIGHT** on nflverse 2024 PBP | `opponent_adjusted_epa.py` → ratings + `nfl_epa_adj` fair p |
| Eight ACTIVE signals weight 0 | Registry/evidence path still sparse | **Earn weight** via rung-2 Brier vs dumb baseline, not CLV |
| 373/374 PASS rows publish | Design defect in publish gate | **PASS veto replacement** (below) — founder merge |
| Elo weights 3-yard run like 30-yard pass | **CONFIRMED** structural | Adj-EPA dropback/rush splits replace margin-only Elo as **independent fair** |

---

## What we built tonight (owned, measured)

### A. Opponent-adjusted EPA (the #1 upgrade) — LIVE on 2024 PBP

**Source:** nflverse `play_by_play_2024.csv.gz` · **544** team-game pairs · CC BY 4.0  
**Method:** port of `opponent-adjusted.ts` — iterative net-out of opponent defense/offense, 25 iters.

| Team | adjOff | adjDef | **overall** |
|---|---:|---:|---:|
| BAL | 0.235 | −0.047 | **+0.282** |
| DET | 0.185 | −0.072 | **+0.257** |
| BUF | 0.181 | −0.010 | +0.191 |
| GB | 0.103 | −0.086 | +0.190 |
| PHI | 0.079 | −0.107 | +0.186 |
| … | | | |
| DAL | | | −0.177 |
| CLE | | | −0.184 |
| **CAR** | | | **−0.242** |

**Fair value hook** (`nfl-epa-fair-value.ts` convention): HFA 0.025 EPA/play, scale 0.12, minGames 4.  
Example: BAL home vs CAR → **pHome ≈ 0.990**, margin_epa ≈ 0.549.

**Kill line (pre-registered):** wire to mint **only if** adj-EPA beats Elo/market Brier by **≥0.002** on **n ≥ 272** held-out NFL. Until then: **independent fair-value research path**, not publish authority.

**Next:** 2025–2026 seasons same pipeline; **dropback vs rush** opponent-adjusted ratings (passing predicts wins at ~0.53–0.61 vs rushing ~0.13–0.19 — Motif landscape).

### B. Composite / ranking replacement (MODEL_VERSION work — founder bump)

**Do not** isotonic confidence. **Do** replace the composite’s decision surface:

```
rankingScore  := marketFairProb          # book-priced rows
                | nfl_epa_adj / blend   # independent when quality gates pass
confidence    := display-only Edge Index  # never a win probability
consensusScore: = 0 for ranking           # structural constant on run lines
marketDepth   := 0 for ranking            # evidence caption only
PASS veto     := never mint when independentEdge.decision === "PASS"
```

Executable check tonight: **v5.2.7 top-decile** — marketFairProb **88.9%** [76.5,95.2] vs rankingP **53.3%** [39.1,67.1] on confidence-source rows (**intervals separate**). Blend rows: mfp 88% vs rankingP 56% (**overlap** — no winner declared).

**Founder-only:** MODEL_VERSION bump after PICKS-H1 scorecard (L11). Until then: **withhold PASS**, **display market p**, **rank board on marketFairProb / rankingP-with-independent**, never Edge Index alone.

### C. Turnover occurrence vs recovery

**Rule (AGENTS + literature):** model **forced** turnover rates; **regress recovery to league mean (~46.3%)**; never carry raw margin into Elo.  
**Data we own:** `stats_team_week_2024` `def_fumbles_forced`, `def_interceptions`, opponent fumble recovery share; nflverse `turnover_luck` CSV family in Motif lab.  
**Implementation next:** team-week occurrence expected-vs-actual; feed **adj-EPA residual**, not Elo bump.

### D. Sample — the only unfakeable lever

- Export v2 sport keys + CLV columns shipped (`board-export.mjs`).
- Hex32 **98.95%** resolved (2065/2087); 22 remain.
- Every settle tonight **increases** NFL n; standing OOT monitor watches coverage by books×market.

---

## What moves 38 → higher (order, with owners)

| Order | Action | Owner | Kill / evidence |
|---|---|---|---|
| 1 | **Opponent-adj EPA** seasons 2024–2026 + dropback/rush splits | Mimo (done 2024) | Brier ≥0.002 vs market/Elo n≥272 or stay research |
| 2 | **PASS veto** never mint `decision===PASS` | Founder/engine | Regression: 7 PASS+neg expectedClv rows in AGENTS |
| 3 | **Rank on marketFairProb / indep** — confidence display-only | Founder MODEL_VERSION | v5.2.7 top-decile separation measured |
| 4 | **Zero consensus/depth in ranking weights** | Founder MODEL_VERSION | Run-line consensus structurally constant |
| 5 | **Turnover occurrence** in adj-EPA pipeline | Mimo + grok | Recovery regressed; no raw margin in strength |
| 6 | **Totals-first product** + CLV dual denominators | Product | Totals CLV 56.7% only cell near 52.4% |
| 7 | **Situational Mondrian** weather/key/totals | Mimo done | NFL OOT 0.87–0.94; K3 product bands stay killed |
| 8 | **Props / signal weights** via rung-2 Brier | Grok/flash | Never CLV admission (founder doctrine) |
| 9 | **Sample accumulation** + standing OOT | Fleet | n floors; L10 denominators |
| 10 | **Typecheck green on signal branch** | Fleet review `679c6e1aa` | tsc exit 0 on 3 workspaces after fix |

---

## Honest residual (what 38 still costs)

- NFL settled n is tiny — **no algorithm substitutes for games**.
- CLV gap is **model**, not infrastructure.
- Tracking/spatial stack remains **rights-blocked** (BDB NC; NGS 401).
- **Immune system** (self-audit, kill lines, bus corrections, typecheck adversarial) is the climbable asset — keep it.

**A number that went up without these replacements would still be the lie.**
