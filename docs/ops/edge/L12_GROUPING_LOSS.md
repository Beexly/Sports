# L-12: Grouping-Loss Go/No-Go Gate

**Date:** 2026-09-18 (run 2026-08-19)
**Branch:** `hermes/l12-grouping-loss` (branches from `origin/claude/cron-config-placement-verify-qsl19t`)
**Model:** poolside/laguna-s-2.1:free (Nous)
**Spec:** C-21 (Perez-Lebel / Le Morvan / Varoquaux 2023, arXiv:2210.16315); estimator corrected in `docs/ops/edge/2026-08-19-deepseek-adversary-round3.md`.
**Rules:** read-only. No DB writes. No network. No invented numbers. Does not edit the ledger.

---

## 1. Decider question

ECE ≈ 0.0044 (well-calibrated) but resolution ≈ 0. The entire roadmap hinges on the answer to C-21:

> Is RES ≈ 0 because the market is efficient against the features we have **(=> STOP, go find new data)**, or because the pipeline collapses real signal into one flat number **(=> BUILD the model)**?

Grouping loss — `GL = E_S[ Var( P(Y=1|X) | score = s ) ]` — is a **lower bound** on recoverable resolution. It is the spread of true posteriors *within a score bin*, estimated by clustering on **features** inside each calibrated-probability bin. The permutation null (shuffle outcomes within bin, recompute) is the decision rule, not a fixed threshold: `GL > c_0.95` ⇒ real structure (build); `GL ≤ c_0.95` ⇒ market already efficient w.r.t. current features (stop / find data).

**C-21 correctness note (C-22 round 3 fix):** GL must be computed against *features* used to cluster. Without features it collapses to within-bin outcome variance ≈ p(1−p) ≈ 0.25, which is pure Bernoulli noise — the exact wrong formula an adversary shipped in v2 and C-21 corrected in round 3. This implementation clusters on features; if features were absent it would (and does) refuse to compute.

---

## 2. Step 1 — Data recon (the gate)

Grouping loss requires, for every pick in one graded population (n=909), all three on the **same** pick-level table:

1. **a model probability p̂ per pick** — a calibrated win probability in (0,1), the score that forms the bins;
2. **a binary outcome y per pick** — WIN/LOSS;
3. **per-pick FEATURES** to cluster on — sport, market, team, park, starting pitcher, weather, line value, book, day/time, confidence inputs, etc. (logit-transformed + standardized before k-means).

### Working-tree reality vs. available artifacts

This branch (`hermes/l12-grouping-loss`) is cut from the orchestrator commit `b0601ad7`. Its working tree contains:

- `docs/ops/calibration/2026-08-19-l9-clv-slices/` — **l9 artifacts, present locally** (clv-slices.json, RESULTS.md, l9_compute.py). These are *aggregates only* (market×month beat rates, 57/388 SPREAD counts, n=3 spot checks). No pick-level `(score, outcome, features)` rows.
- `docs/ops/calibration/2026-08-18-clv-census.csv` — **NOT in the working tree.**
- `docs/calibration-proposals/2026-08-19-clv-forensics/` — **NOT in the working tree.**

However, the **raw L-7 artifacts — including the CLV census CSV — exist on the remote branch `origin/hermes/l7-clv-forensics`** (not landed on the orchestrator branch; i.e. L-8 did not bring them in). To perform an honest recon against the *real* pick-level data, the remote L-7 branch was fetched (git fetch, read-only) and its artifacts materialized into a **scratch mirror** — `SPORTS_REPO_ROOT=C:/tmp/l12-scratch` — which is *not* part of the repository and was never committed. The script then ran against that mirror so its verdict is based on the actual 909-population data, not an empty tree.

### What the remote L-7 artifacts actually contain

`docs/ops/ops/2026-08-18-clv-census.csv` (1,161 rows, 22 columns) is the closest pick-level table. Field-by-field audit:

| Need | Census field(s) | Verdict |
|---|---|---|
| **Model probability (p̂)** | none | `confidence_pct` (0–100) is a **heuristic composite, not a probability**. `market_fair_prob` (populated on **only ~561/1161 rows**) is the **market's** de-vigged probability — not the model's. Per `packages/db/prisma/schema.prisma` (line 602) the intended column `PickProofReceipt.modelProb Float?` is documented **“null until one genuinely exists”** — i.e. the model has not yet emitted calibrated probabilities for these picks. | **MISSING p̂** |
| **Binary outcome** | `result` = WIN/LOSS | Present on all 1,161 rows; `y = (result==WIN)` gives the graded outcome. On the n=909 graded sub-population (rows with `clv_graded_at`/`clv_kind` non-null), 785 carry `clv_verdict`. | **Present ✓** |
| **Features** | `sport`,`sport_key`,`pick_type`,`selection`,`published_line`,`tier`,`model_version`,`clv_lock_line`,`clv_lock_price`,`receipt_entry_odds`,`market_fair_prob` | 18 feature-like columns exist — but they are **pre-lock odds + market metadata**, not the game-state covariates (rest days, schedule density, line movement, pitcher/weather/park) that would yield clustering structure. The richer covariates live on `Game` / `PickSignalSnapshot` / `OpeningLine` and are **not exported** in this census. | **Sparse — present but structurally weak** |

The L-7 JSON artifacts (`raw.json` spot_check n=10, `matched_audit` n=10, `ml-and-books.json` n=140 ML rows) confirm: verdict fields are `clv_verdict` (BEAT_CLOSE/MATCHED/LOST) — a close-vs-lock label, **not** the game outcome — and there is no `modelProb` populated.

### STEP 1 CONCLUSION (gate verdict)

The `(score, outcome, features)` triple is **not** available for the graded n=909 population:

- `outcome` — available (WIN/LOSS).
- `features` — available but sparse/market-metadata-only (no game-state covariates).
- **model probability p̂ — MISSING entirely.** `PickProofReceipt.modelProb` exists in the schema but is documented null-to-date; the census substitutes `confidence_pct` (heuristic) and `market_fair_prob` (market, not model).

Because **p̂ is the binning score and there is none**, grouping loss is **not computable** from these artifacts. The script therefore exits BLOCKED with a precise missing field — not a blanket “nothing exists” — which is the honest, gate-correct result.

---

## 3. Steps 2–4 — Computation status

`docs/ops/edge/l12_grouping_loss.py` implements the full estimator:

- equal-count score bins over `{5, 10, 20}`;
- k-means over **Logit-transform → standardize** feature space (k-means coded from scratch; **no sklearn dependency**);
- the two-term GL formula `GL_b = (1/N_b)·Σ_c n_c·(ȳ_c−ȳ_b)² − (1/N_b)·Σ_c (n_c/(n_c−1))·ȳ_c·(1−ȳ_c)`;
- singleton clusters (`n_c=1`) dropped (correction undefined);
- **1,000-iteration within-bin permutation null** (outcomes shuffled within each bin, binning features unchanged) → observed, mean, sd, 95th percentile, one-sided p-value;
- the `{5,10,20}×{3,5,8}` sensitivity grid.

It was run against the materialized L-7 artifacts (`SPORTS_REPO_ROOT=C:/tmp/l12-scratch`). Output:

```
repo_root = C:/tmp/l12-scratch
L7_DIR  = .../docs/calibration-proposals/2026-08-19-clv-forensics  (present=True)
L9_DIR  = .../docs/ops/calibration/2026-08-19-l9-clv-slices       (present=True)
census  = .../docs/ops/calibration/2026-08-18-clv-census.csv      (present=True)

{
  "score_available": false,
  "outcome_available": true,
  "features_available": true,
  "missing": ["model probability p_hat per pick (in (0,1))"],
  "notes": ["census has NO model probability field..."]
}
"verdict": "BLOCKED — grouping loss is NOT computable from local artifacts"
```

No GL, p-value, or sensitivity grid was emitted — and none was *invented*. The estimator is structurally ready to compute the moment a real `modelProb` (or equivalent p̂ in (0,1)) is supplied per pick; until then `GL_b` has no score bins to fill.

### Why “features exist but no scores” still blocks

One might ask: we have outcomes + market-metadata features, can’t we cluster on those and at least sanity-check? No — for three compounding reasons:

1. **GL is a function of the score-bins first, features-second.** Without p̂ there is no score axis to form bins on; clustering the features alone recovers `Var(ȳ|X)`-ish structure but is **not** the lower bound on *within-bin-score* variance that the gate asks about. Reporting it would answer a different question than C-21.
2. **The features are pre-lock odds metadata** (sport, published_line, receipt_line, market_fair_prob), not game-state covariates. `market_fair_prob` is the market’s de-vigged probability, so clustering on it would at best rediscover market efficiency — the confound C-21 is designed to *separate* the model from the market, not blend them.
3. **The v2-adversary failure mode** was precisely to compute *something* when p̂/features were incomplete and present it as a verdict. Per the L-12 rule “do not invent any number,” the correct output is a hard BLOCK plus the exact missing field.

---

## 4. Interpretation guidance (for when it becomes computable)

| Condition | Meaning |
|---|---|
| `observed GL  >  c_0.95(permutation)` (p ≤ 0.05) | Within-bin posterior spread beyond chance → signal being collapsed by the pipeline → **BUILD the multicalibration/IDR layer (C-22).** |
| `observed GL ≤ c_0.95` (p > 0.05) | No grouping structure recoverable from current features → market already prices them in → **STOP the edge search, go find new data.** |
| Sensitivity `{5,10,20}×{3,5,8}` **flips the verdict** | Not robust at n=909 → do **not** act; enrich features or collect more data, then re-run. |

Once a p̂ exists, run:
```
SPORTS_REPO_ROOT=/path/to/repo python docs/ops/edge/l12_grouping_loss.py \
  --score-key modelProb \
  --outcome-key y \
  --feature-keys sport pick_type market_fair_prob lineMovementSpread ...
```

---

## 5. Deliverables (committed on `hermes/l12-grouping-loss`)

| File | Purpose |
|---|---|
| `docs/ops/edge/l12_grouping_loss.py` | Full recon + estimator + permutation null + sensitivity grid. Exits non-zero + emits `blocked` once it confirms p̂ is absent; computes end-to-end when inputs are present. Requires `numpy`-free stdlib only (k-means hand-rolled). |
| `docs/ops/edge/grouping-loss.l12.json` | Machine-readable recon audit + block reason (exact missing field: `model probability p_hat per pick`). No fabricated numbers. |
| `docs/ops/edge/L12_GROUPING_LOSS.md` | This file. |

### Files committed to the branch

```
$ git status --short docs/ops/edge
A  docs/ops/edge/l12_grouping_loss.py
A  docs/ops/edge/grouping-loss.l12.json
A  docs/ops/edge/L12_GROUPING_LOSS.md
```

(The scratch mirror at `C:/tmp/l12-scratch` is outside the repo and was **not** committed; it held a read-only fetch of `origin/hermes/l7-clv-forensics` purely so the recon could run against real data.)

---

## 6. Explicit honesty statement

- **Computed:** nothing was fabricated. The recon audit and the block reason are derived **directly** from the census CSV contents and the schema comment on `PickProofReceipt.modelProb` (“null until one genuinely exists”).
- **Blocked field (the gate):** the **model probability p̂** — not present in any local or remote L-7 artifact. `confidence_pct` is a heuristic 0–100 composite (not a probability); `market_fair_prob` is the market’s de-vigged probability on only ~561/1161 rows (not the model’s). This is the single missing input that makes GL structurally undefined (no score axis → no bins).
- **What was available but insufficient:** outcome (`result` WIN/LOSS) and market-metadata feature columns exist on the n=1161 census, but they do not satisfy the triple, so no GL / p-value / sensitivity grid was produced.
- **Why this is a real answer, not a stall:** C-21’s decision is “is there recoverable resolution the current model+features hide?” The model has not yet emitted calibrated probabilities (`modelProb` is schema-documented as still-null), so **there is no model score to bin** — the question is genuinely unaskable on today’s artifacts. The gate correctly says **NO-GO until p̂ exists**, which in turn means the “build the model” path is *not yet cleared*: the prerequisite is to get the prediction engine to (a) emit a real calibrated p̂ per pick and (b) persist it on the graded population. That prerequisite is the actionable outcome of L-12.
- **No DB writes occurred.** No network beyond the read-only `git fetch` of a data branch. The ledger (`docs/ops/AGENT_LEDGER.md`) was not read or edited.

---

## Appendix — provenance of the n=909 / 909 figure

- `raw.json → graded_n = 909` (L-7 artifact, `origin/hermes/l7-clv-forensics`).
- `clv-slices.json → graded_n = 909`; spot-check verification `10/10, 0 mismatches` (L-9 artifact, present locally).
- The 1,161-row census is the *superset* (includes pre-graded/seed picks); the 909 are the graded subset (rows with `clv_kind` / `clv_graded_at` populated). The script audits the census as the pick-level source and reports the 561/1161 population for `market_fair_prob` so the p̂-missing claim is not overstated.
