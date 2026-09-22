# CALIBRATION — status and how we lock accuracy

Updated: **2026-09-21** (read-only production SQL + repo scorecards).  
Model freeze: **`MODEL_VERSION = v5.2.7`** (`packages/prediction-engine/src/constants.ts`).

This page is the clean calibration board for every agent. Numbers below were
computed this session from the production `picks` table (settled WIN/LOSS) and
from `factorBreakdown` JSON. Scorecard/duel numbers under `docs/calibration-proposals/`
are frozen-holdout results and stay the authority for MODEL_VERSION bumps (L11).

---

## 1. Where we are (measured)

### 1.1 Outcomes on settled picks (WIN/LOSS only)

| Slice | n | Win rate |
|---|---:|---:|
| All settled W/L | 3,152 | **54.6%** |
| v5.2.7 | 1,834 | **56.9%** |
| v5.2.6 | 297 | 54.2% |
| v5.1.0 | 586 | 51.7% |
| v5.0.0 | 431 | 49.4% |
| MLB | 2,022 | 52.4% |
| NCAAF | 661 | 65.1% |
| MLS | 304 | 51.6% |
| NFL | 150 | 48.0% |
| MONEYLINE | 1,125 | 67.0% |
| SPREAD | 1,051 | 47.1% |
| TOTAL | 976 | 48.5% |

Read carefully: raw win rate is **not** the product claim. `PATH_TO_PROVEN_EDGE`
and law D22 judge the book-priced lane and CLV against 52.4%, and withhold
slices that are not bettable (preseason, 0-book, soccer ML, etc.).

### 1.2 Probability quality (the calibration question)

On rows where `factorBreakdown` carries both `marketFairProb` and `rankingP`
(n = 1,270 settled W/L):

| Arm | n | Brier | ECE | log-loss |
|---|---:|---:|---:|---:|
| Market (`marketFairProb`) | 1,270 | **0.2344** | **0.0169** | **0.6589** |
| Shrink w=0.10 (`m + 0.10·(rankingP − m)`) | 1,270 | **0.2344** | **0.0169** | **0.6589** |
| Raw model `rankingP` | 1,270 | 0.2675 | 0.0938 | 0.7564 |

Broader coverage samples (not fully paired):

| Predictor | n | Brier | ECE | log-loss |
|---|---:|---:|---:|---:|
| `marketFairProb` raw | 1,270 | 0.2343 | 0.0167 | 0.6589 |
| `fairProbability` raw | 1,628 | 0.2432 | 0.0581 | 0.6814 |
| `rankingP` raw | 2,135 | 0.2544 | 0.0802 | 0.7184 |

**Finding (locks D5):** a **10% shrink toward the market** of the model signal
matches market Brier/ECE and destroys the raw model's overconfidence. This is
display-probability calibration, not a free edge. Keep rule for any bump is still
the frozen-holdout duel (`ΔBrier < 0` AND `P(better) ≥ 0.75` vs market) — the
live sample above is descriptive, not a promotion ticket.

### 1.3 CLV (sharp credibility)

| Metric | Value |
|---|---|
| Rows with any CLV fields | 2,114 |
| Verdicts | BEAT_CLOSE 578 · MATCHED_CLOSE 752 · LOST_TO_CLOSE 784 |
| `clvValue > 0` | 608 |
| `clvPositive = true` | **0** |

**Defect:** `clvPositive` is never set even when `clvValue > 0`. Any surface that
reads the boolean (rather than `clvValue` / `clvVerdict`) under-reports beat-close.
Fix in one graded-CLV write path; do not “fix” by flipping stored flags without
recomputing from `clvValue` (honesty law 4).

### 1.4 Confidence band is not a calibrated p

| confidence bin | n W+L | win rate |
|---|---:|---:|
| 50–59 | 1,046 | 51.6% |
| 60–69 | 1,201 | 56.8% |
| 70–79 | 610 | 56.6% |
| 80–89 | 230 | 50.9% |
| 90–99 | 65 | 58.5% |

Confidence is a **rank/grade key**, not a probability. D17 already retires it as
a rank key in the v5.3 candidate. Never render it as “p = 80%”.

### 1.5 Pre-registered factors (`docs/factors/INDEX.md`)

| Status | Count | IDs |
|---|---:|---|
| CANDIDATE | 7 | A6, A7, A14, A19, A22, A23, A25 |
| DEAD | 18 | A1, A3–A5, A9–A13, A15–A18, A20, A21, A24, A27, A28 |
| BLOCKED | 3 | A2 (scorecard path), A8 (isotonic comparison), A26 (no man/zone column) |

None of the 7 CANDIDATE factors join to a priced pick row yet (no props-board
join key). v5.3.0 proposal = A2 shrinkage only, status **PROPOSED**, fails keep
rule vs market on the n=33 fixture (expected: same formula as A2). Real
`verifier/picks-h1.json` export is **NOT RUN**.

---

## 2. Gates that must stay honest

| Gate | Rule |
|---|---|
| `MODEL_VERSION` | Frozen at v5.2.7 until L11 scorecard passes + founder `model-version` PR |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | OFF until held-out `calibratedEce ≤ rawEce` audit (C6) |
| `CALIBRATION_AUTO_PUBLISH` | default false — see `calibration-publish-policy.ts` |
| Floors | ECE ≤ 0.05 · Brier ≤ 0.22 · n floors per stratum — never lower |
| L10 | No public rate without n + population + exclusion counts |
| Estimator corrections | Allowed only under the 2026-09-009 owner amendment (bias-corrected ECE is the only one) |

Do-not-touch: gate flips, pricing amounts, `hermes/v528-market-gate-preserved-2026-09-11`.

---

## 3. Optimization levers (ranked by accuracy impact × risk)

Do these in order. Each is either **measurement**, **wiring**, or **pre-registered
model work** — never a silent gate change.

### P0 — make the scoreboard trustworthy (1–2 days)

1. **Recompute `clvPositive` from `clvValue`** in the CLV grader + one test.
   Surfaces that read the flag currently show 0% beat-close against 608 true positives.
2. **Export a real `verifier/picks-h1.json`** from settled picks (same shape as
   `packages/verifier/fixtures/picks-h1.json`). Unblocks every duel that is
   currently fixture-only (A2, v5.2.8, v5.3.0).
3. **Split every calibration metric by lane** (book-priced vs model-signal,
   sport × marketType) with n and exclusions on the same surface (L10). The live
   54.6% collapses two very different populations.

### P1 — lock display probability (this is the known good lever)

4. **Ship shrinkage as the display p** (`p = market + 0.10·(model − market)`),
   only after the real-export keep-rule scorecard (D5 / D20 / L11). Live sample
   already matches market ECE; frozen holdout decides the bump.
5. **Market-anchored dual report forever:** always print raw model Brier beside
   shrunk and market Brier. Shrunk-only numbers hide the signal that is drowning.
6. **Selected-slice ECE** (published/+EV only) beside pool ECE — calibration
   paradox. `selectedSliceEce` already exists in prediction-engine.

### P2 — grow the only validated edge (props)

7. **Props join key (Phase 3, C-358/C-381/C-383)** so A14/A22/A23/A25 can enter
   a real joint model against posted lines. Until then those factors stay off
   the pick probability.
8. **Prop close capture (C-357 T-15 sweep)** — CLV cannot live without close.
9. **Power certificate before reading grades** on P1 (kill line + n target first).

### P3 — structural model work (only on frozen holdout)

10. **v5.3.0 joint refit** after props join: market logit + shrinkage + surviving
    factors; `confidence` not an input. Keep rule vs market on PICKS-H1.
11. **Per-market maps** only if RES + Brier floors hold on holdout (`calibration-map`
    bakeoff already prefers parametric; do not apply live without C6).
12. **CQR / conformal / Venn-Abers** stay measurement harnesses (width, coverage)
    until they beat isotonic/shrinkage on the same holdout with n stated.

### Explicit non-goals (already measured dead or unsafe)

- Standalone team-model “edge” on sides/totals with public data (LAST_PLAN §1).
- Confidence as a probability.
- Lowering ECE/Brier floors or widening samples to go green.
- Full Kelly / Markowitz inversion (pipeline law 3–4).
- Paid tick history / scraped pick’em boards (D4/D15/C-410).

---

## 4. Definition of “locked in”

Calibration is locked when **all** of the following are true on a frozen holdout
and on a rolling live sample with the same estimator:

1. Display p = market-anchored shrink (or better) with ECE ≤ 0.05 and Brier ≤ 0.22.
2. Shrunk model does not lose to market on Brier (`P(better)` documented either way).
3. Every public rate shows n, population, exclusions (L10).
4. CLV beat-close rate and verdicts agree with `clvValue` (no dead flags).
5. Any MODEL_VERSION change carries an IMPLEMENTED proposal + verifier scorecard (L11).
6. Three consecutive GREEN eligibility readings before any auto-publish path.

Until (1)–(6) hold, the product language stays honest-and-humble: calibrated
probabilities and a public record, not “proven edge”.

---

## 4b. Research corpus (2026-09-21)

750 valuable arXiv ledgers now live under `docs/research/2026-09-21/arxiv-deep/`.  
Transfer map and ranked techniques: [`../research/2026-09-21/RESEARCH_TO_PRODUCT_PLAYBOOK.md`](../research/2026-09-21/RESEARCH_TO_PRODUCT_PLAYBOOK.md).  
Highest-leverage calibration transfers: ENIR (1074), SplineCalib (0738), per-cell extremizing (0762), CRC loss-rate gate (0743), CORP diagnostics (0469).

## 5. Commands (no DB writes)

```bash
npm run export:settled-picks          # JSONL export (read-only DATABASE_URL)
npm run calibration:offline           # CIR/PAVA smoke without DB
npm run verify:holdout                # needs verifier/picks-h1.json export
npm run guard:model-freeze            # MODEL_VERSION + IMPLEMENTED evidence
npm run guardrails
```

Live eligibility (do not invent): `https://www.galaxysportsedge.com/api/ops/public-surface-truth`
and Production `/cockpit`.
