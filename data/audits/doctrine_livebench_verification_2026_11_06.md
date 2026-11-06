# Task 4 — 19-Rule Doctrine & GSE-LiveBench Cross-Verification
**Date:** 2026-11-06 · **Branch:** `muse/formal-verification-and-ns32-2026-11-06` · **Host:** Motif VM (this host)

## Verdict: 19/19 PASS — reproduced by execution, not by citation

`doctrine.py` is **not on `main`** and was not in this host's checkout. It lives, with its
self-check battery, on the unmerged branch `research/rating-atlas-2026-10-09-packet` at
`docs/research/2026-10-09/rating-atlas/minis/doctrine.py` (27,118 bytes) — the location
recorded in Motif's 2026-10-14 fleet audit ("doctrine.py/Warehouse/FeatureRegistry/
hash-chained kill ledger — verified as claimed"). Both files were pulled verbatim from
`origin` on 2026-11-06 and the self-check was run **unmodified**:

```
$ python3 doctrine_selfcheck.py   →   19/19 rules enforced in code. THE GATE HOLDS. (exit 0)
```

All 19 rules pass, including the ones Garrett named: Rule 1 `Warehouse.asof(t)` is the
only read path and refuses future-row leaks and unstamped rows; Rule 2/11 Pinnacle close
is the permanent μ anchor (Novig may never anchor); Rule 3 `CollegeGuard`; Rule 6 Shin
closed-form de-vigging with the calibration-pooled dispatcher; Rule 19 `HonestyGate`
manifest-tamper voiding. Full rule map: `DOCTRINE_19.md` on the same branch path.

## Constants Garrett named — each traced to its branch source

| Constant | Brief | Branch source | Status |
|---|---|---|---|
| CFB spread σ | 15.15 | `RUNNING_LOG.md`, `THE_METHODOLOGY.md` (L1 anchor), `SESSION_REPORT_2026-10-10.md`, `cfb_altline_engine.py` N(0,15.15) ladder | ✅ exact |
| CFB σ (model card) | — | `MODEL_CARD_v1.json`: `sigma_spread: 15.185` | ⚠️ second value on record — the card's machine fit is 15.185; the 15.15 figure is the session-report/methodology value. Delta 0.035. Both preserved; not smoothed. |
| CFB HFA | 4.32 | `SESSION_REPORT_2026-10-10.md` ("HFA 4.32 (NFL 1.56)"), `THE_METHODOLOGY.md` | ✅ exact |
| CFB HFA (model card) | — | `MODEL_CARD_v1.json`: `hfa: 3.929` | ⚠️ second value on record — card-fit HFA ≠ close-context HFA 4.32. Flagged for Garrett's later list; the guard's separation property does not depend on which is used, because both are CFB-native and neither is within ±2% of NFL 1.56. |
| CFB close CRPS bar | 8.3314 | `MODEL_CARD_v1.json`: `holdout_crps_close: 8.3314`, holdout = 2026 wks 1–6 | ✅ exact — this is an empirical holdout score in points, the frozen bar a challenger must beat (PPA challenger scored 8.3401 and was refused). |
| NFL σ | 13.36 | Not a literal in `doctrine.py` (its banned-value list carries the older fits 13.45 ladder / 13.19 Pinnacle) | ✅ caught anyway — check C4: 13.36 lies inside the guard's ±2% band around 13.45 ([13.181, 13.719]), so Rule 3 refuses it in a college fit by value. |
| NFL HFA | 1.56 | `doctrine.py` banned values (`modern_hfa: 1.56`); `SESSION_REPORT_2026-10-10.md` | ✅ exact |
| CRPS constant | 0.233695 | Analytic identity, check C1 | ✅ **proven, not just recorded**: the standardised Normal CRPS at z = 0 is 2φ(0) − 1/√π = 0.233694977…, matching 0.233695 to 2.3×10⁻⁸. Check C6 ties it to the CFB scale: CRPS(N(0,15.15), 0) = 15.15 × 0.233695 = 3.540479. |

## Independent numeric cross-checks (companion harness, 5/5 PASS)

`doctrine_numeric_checks.py` (shipped alongside this report in the audit folder) imports
the **real** `doctrine.devig` from the branch file — no reimplementation:

- **C1** 2φ(0) − 1/√π = 0.233694977 vs 0.233695 (diff 2.27e-08) — PASS
- **C6** Gaussian CRPS closed form at the mean, σ=15.15 → 3.540479 = 15.15 × 0.233695 — PASS
- **C4** NFL σ 13.36 inside CollegeGuard ±2% value band — PASS
- **C5** `devig(0.55, 0.50)` → (0.525000, 0.475000) via `shin`, sum exactly 1 — PASS
- **C5b** `devig(0.45, 0.45)` (sub-1 book) → dispatched to `multiplicative(sub-1)` only,
  per Rule 6's dispatcher — PASS

## GSE-LiveBench vs ForecastBench — cross-verification

**What ForecastBench is (verified from primary sources, 2026-11-06):** Karger et al.,
*ForecastBench: A Dynamic Benchmark of AI Forecasting Capabilities*, arXiv:2409.19839,
ICLR 2025. 1,000 automatically generated, regularly updated forecasting questions about
**future events only** (leakage-free by construction), drawn from nine sources including
prediction markets; human baselines on a 200-question subset. Scoring is Brier.
Superforecasters 0.081 overall Brier; best LLMs ≈ 0.101–0.113; general public ≈ 0.107.
A 2026 follow-on analysis of 25 resolved rounds finds frontier LLMs add ≈ 0.001 nats
beyond a liquid market price — the market-relative lesson GSE already encodes as
Rules 2/11 (the close is the anchor; you must beat it, not restate it).

**What ForecastBench-Sim adds (from Garrett's own corpus, dossier #1472, arXiv:2606.18686):**
simulator-resolved questions (Freeciv rollouts) with interventional P(Y|do(X)) items,
Brier + normalised CRPS scoring, model rankings correlating with real ForecastBench at
Spearman ρ = +0.43 (p = 0.018, N = 30). Corpus verdict: ADAPT for GSE sim-resolved calibration.

**GSE-LiveBench status — stated plainly:** no artifact named `GSE-LiveBench` exists on
`main`, on the rating-atlas branch, or on this host (searched 2026-11-06). It is a design
name in Garrett's brief, not a built benchmark. The cross-verification therefore runs as a
**design conformance check** — GSE-LiveBench, to be ForecastBench-grade, must satisfy:

| ForecastBench property | GSE-LiveBench requirement | GSE enforcement already in code |
|---|---|---|
| Future-events only, no leakage | Questions frozen before kickoff; features as-of decision time | Rule 1 `Warehouse.asof(t)`; Rule 17 latency-after-t worthless |
| Proper scoring, published | CRPS (Gaussian closed form) + Brier on every settled forecast | Rule 15 FounderGate metric floors (n≥100, Brier≤0.22, ECE≤0.05); gate CRPS in `doctrine.py` |
| Market baseline is the bar | Beat Pinnacle close, not a naive prior | Rules 2/11 anchor; Rule 9 promotion needs PROMOTED verdict **and** non-negative live CLV |
| Dynamic, regularly refreshed | Weekly slate, rolling holdouts, frozen walk-forward manifest | Rule 19 manifest sha-frozen at gate construction; Rule 16 append-only kill ledger |
| Human/expert baseline | Superforecaster analogue = the close itself + recorded human cappers where available | CLV ledger is the standing expert-baseline record |
| Simulator arm (Sim extension) | Counterfactual calibration vs rolled-out game states | Corpus spec #1472 §11–13 (halftime freeze, 1,000+ sims, ±0.05 slope acceptance gate) — **not yet built** |

**Gap, honestly:** the LiveBench harness itself (question bank, weekly runner, leaderboard)
is unbuilt. What exists and is verified is the *enforcement substrate* it must run on —
the 19 rules above. Building the harness is a follow-on work order, not a claim made here.

## Challenge-pass rerun (Garrett's order, 2026-11-06 15:48 CT) — reproduced from clean

Both files were re-extracted from the branch into a fresh directory; MD5 hashes are
identical to the first run (`doctrine.py` 6ddabeeb…, `doctrine_selfcheck.py` b99753ec…).
Self-check rerun: **19/19 PASS** again. Numeric cross-checks rerun: **5/5 PASS** again.

Direct adversarial probes against the real `CollegeGuard` class (beyond the battery):
- NFL σ **13.36** submitted as a CFB `spread_sigma` → **refused by value** (matches both
  banned 13.45 and 13.19 within tolerance) — the brief's NFL constant cannot enter a
  college fit even under an innocent key name.
- NFL HFA **1.56** under a renamed key (`home_edge`) → **refused by value**.
- True CFB constants (15.15 / 4.32 / 15.81) → clean. Model-card pair (15.185 / 3.929) →
  clean, confirming the dual-value record in the table above is a fit-provenance
  difference, not a guard violation.

## Skill substitution note
`/antigravity-skills:*` slash skills are not installed on this host; no equivalent was
needed for this task — the doctrine's own self-check battery is the verification instrument,
and it was executed directly.
