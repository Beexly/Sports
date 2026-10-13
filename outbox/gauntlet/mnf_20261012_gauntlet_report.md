# MNF Gauntlet Report — Buffalo Bills at Los Angeles Rams

**DIAGNOSTIC — not a pick. RVC: NOT_CLEARED.**

Kickoff 2026-10-13 00:15 UTC · Inputs frozen 2026-10-13 00:09:24 UTC (T-5.6) · Manifest: `mnf_20261012_manifest.json`
Run mode: **fallback, individual suites in pipeline order** — the unified gauntlet runner branch (`motif/gates-wiring-2026-10-12`) had not landed by the T-30 checkpoint (23:44:52Z) nor by freeze. Exactly what was missing is listed below; no gate result was fabricated.

## The game (Garrett format)

**Spread — Rams -3.5.** Our projection: implied team totals LAR 29.0, BUF 25.5 — a 3.5-point margin, dead on the line. No independent margin model exists in the frozen set, so no gap is claimed. The market's own de-vigged number leans **Bills +3.5** (Shin fair 51.8% vs Rams cover 48.2%). One line: *the close is the projection tonight; the only honest call is no call.*

**Total — 54.5.** Market leans **OVER 54.5** (Shin fair 51.8% at -118). Our projection: 54.5 points (29.0 + 25.5 implied). One line: *a dead-on number — the engine neither confirms nor fades it.*

**Moneyline (Layer 1):** Rams -175 / Bills +145, booksum 1.0445, Shin fair Rams 61.4%.

**SGP stack projections (measured correlations, 1,088 team-games):**
- **Rams stack** (QB pass yds o250.5, QB pass TDs o1.5, WR rec yds o75.5, WR anytime TD): fair **28.0% (+257)**, +64.1% over independence pricing.
- **Bills stack** (same canonical legs): fair **19.9% (+404)**, +133.7% over independence.

**Props board:** 68 rows priced live from Pinnacle at the freeze, **0 with a model side** — the measured-distributions branch landed empty (ref still at the base head). Largest model-vs-market discrepancies: **none computable, none claimed.** The board is real prices only.

**Market movement (evidence, not signal):** 44 of 69 props moved between the first snapshot (22:17Z) and T-30; 15 more by the freeze. Allen pass yards 244.5 → 246.5; Stafford 281.5 → 278.5; Kyren Williams rush 69.5 → 67.5; Davante Adams receiving 61.5 → 62.5. Greg Dortch's receiving market was pulled before kickoff (board 69 → 68 rows).

## Gate verdicts (14 gates)

| Gate | Verdict | Evidence |
|---|---|---|
| Input integrity / manifest freeze | **PASS** | 8 files SHA-256 frozen at T-5.6; all code blob-verified against remote tree of `motif/props-board-live-2026-10-12` @ `b7df9c9f4755` |
| Claim matrix | **PASS** (suite) / live check NOT_RUN | Suite green in final pass; production `claims.json` unfetchable tonight (GitHub API degradation) |
| Held-out contamination | **PASS** | Walk-forward trace train/eval years disjoint; suite green |
| Reasoning mint gate | **PASS** | Suite green in final pass (00:10:04Z) |
| Freshness | **SHADOW** | Pinnacle fetched 00:05:59Z and board generated 00:08:25Z (fresh); ESPN live host unreachable from this VM all evening (21:47Z-00:07Z), game markets rest on the 2026-10-12 captured scoreboard, output identical across 4 runs |
| Price integrity (both feeds) | **PASS** | Never-invent parsing, one-sided skip, participant mapping, Shin + multiplicative de-vig — within 77 passed / 7 skipped dry pass |
| SGP engine | **PASS** | Copula suite incl. Clayton matrix guard; measured-correlation adapter; real-price honesty suite green |
| Props board honesty | **PASS** | Stamps verified on the frozen artifact (DIAGNOSTIC, is_pick false, rvc_cleared false); zero kelly/stake keys; all rows model=null with priced-only notes |
| Props discrepancy suite | **FAIL** | 32 passed / 9 failed — every failure is the two CSV sheets (`edge_sheet_pp_vs_dk_v2.csv`, `dk_vs_pinnacle_shade_2026-10-10.csv`) that exist on no branch; blocks the historical board only |
| Phase-wires suite | **NOT_RUN** | Needs the `providers` module, absent from the assembled tree |
| Reasoning run_game suite | **NOT_RUN** | Transitive deps (`integration` package + ~100 MB coaching parquets) not staged; its mint gate ran separately: PASS |
| Unified gauntlet runner | **MISSING** | Branch 404 on every poll 21:45Z-23:57Z incl. the T-30 checkpoint; unlanded local bytes were not consumed |
| Model-side distributions | **MISSING** | Branch ref = base head (zero new commits) at final poll; board rows with model: 0 of 68 |
| **RVC (residual vs close)** | **NOT_CLEARED** | No clearance artifact in the frozen manifest; every frozen artifact self-stamps `rvc_cleared: false`; canonical status stands uncleared |

**Verdict counts:** PASS 7 · SHADOW 1 · FAIL 1 · NOT_RUN 2 · MISSING 2 · NOT_CLEARED 1.

## What the RVC verdict rules

Because RVC is NOT_CLEARED on this frozen manifest, everything above stays **DIAGNOSTIC**: no picks, no edges, no stake sizing — on this page and in every artifact in `outbox/gauntlet/`. The SGP lifts and the market's own de-vigged leans are measurements of the market and the correlation structure, not recommendations.

## Doctrine framing

Layer 1 (the close) is respected as the foundation: DraftKings via the ESPN/Galaxy capture — Rams -3.5, total 54.5, ML -175/+145. Layer 2 (reasoning) had no independent model output in the frozen set tonight: no margin model, no player distributions. Per the doctrine, that means pass discipline — honest uncertainty over an invented overlay. What the fleet did produce is the full gate record on real, frozen, hash-verified inputs, with every absence named.
