# LOOP IMPLEMENT 2026-09-19

Generated 2026-09-19T06:26:35.699859+00:00

Self-audit suite ok; kills remain K3 band; multiple replacements implemented (never delete-only).

| ID | Status | Replacement |
|---|---|---|
| R-K3-WEATHER-REST | IMPLEMENTED_AS_ARTIFACT | Promote weather/roof Mondrian as NFL margin UQ (6/6 bins OOT>=0.85 prior); extend with rest_diff buckets from H5 (nflver… |
| R-DEPTH-DISPLAY-ONLY | MEASURED_KILL_CONFIRMED | DEPTH_DISPLAY_ONLY: bookmakerCount Spearman -0.7999999999999998 vs marketFairProb 0.8999999999999998. Order boards on ma… |
| R-MARKET-P-PUBLIC | MEASURED + dual score code in compute.ts | When books priced the row, public/rank p = marketFairProb (realised bits 0.0751213846179819); confidence/100 bits -0.080… |
| R-TOTALS-FIRST-CLV | MEASURED | Dual-denominator Law-10 card: pooled R1/R4 stay below 0.524; named cells only (e.g. MLB TOTAL R4 if n>=30) with populati… |
| R-COACH-GO-RATE-CANDIDATE | CANDIDATE_NOT_WIRED | Coach go-rate sticky (mean Spearman 0.42816923925029426 on 2023-2025 nflverse PBP). Register as CANDIDATE situational fa… |
| R-SHIN-KEEP-PROP | MEASURED_KEEP | Shin ΔBrier vs proportional on NFL ML n≈5050 is ~2e-5 << 0.002 → PROPORTIONAL_STAYS. No product formula switch.… |
| R-ML-WITHHELD-MARKET-BASELINE | GATED_HONEST | Frozen scorecard baseline market ML Brier 0.211179825381329 n=5051. As-of Elo loses to market ML (ELO_LOSES_TO_MARKET_ML… |
| R-PASS-VETO-EXPORT | AWAITING_OPS_EXPORT | board-export.mjs already emits independentEdge* + passVeto; disk export STALE. Ops re-export then loop_pass_veto_totals … |
| R-FAIL-CLOSED-CONFORMAL | CODE_SHIPPED_THIS_PASS | tweedie-aci + conformal-margin-set now fail-closed +Inf when k>n; warmup empty residuals are point bands (status warmup_… |
| R-HEX32-RETRY | RETRY_PATH_LIVE | Retry UNRESOLVED via date±2 + aliases (resolve_hex32_retry.mjs); keep UNRESOLVED_ID visible.… |

## Observed score (loop)
```json
[
  {
    "why": "K3 OOT < 0.85",
    "replace": "use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals",
    "owned": [
      "owned_nflverse_weather_props.py",
      "owned_replacement_engine.py"
    ]
  },
  {
    "why": "hex32 resolve 0.9775 < 1.0",
    "replace": "retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date\u00b12 and name aliases",
    "n_unresolved": 47
  },
  {
    "why": "ML CLV 0.142 < 0.50",
    "replace": "e-process + logit-pool gates; totals-first product; no ML beat-close claim",
    "owned": [
      "owned_replacement_engine.py",
      "ml_gate_totals_eprocess.py"
    ]
  },
  {
    "why": "totals add info vs market (logit-pool)",
    "replace": "advance totals density/CRPS path + e-process accumulation; keep kill lines",
    "positive": true
  },
  {
    "why": "weather Mondrian all bins OOT>=0.85",
    "replace": "promote weather/roof residual bands as NFL margin UQ replacement",
    "positive": true
  },
  {
    "why": "totals e-process M_max=4.430387116702636 < 20",
    "replace": "accumulate more settled totals + shrinkage eps sweep; formal Ville test \u2014 do not claim skill yet"
  }
]
```

## Kill lines (pre-registered, still active)
- K3 band model killed — weather/roof UQ promoted
- ML CLV / e-process gates — no skill claim until M_max>=20
- Elo/adj-EPA ranking authority only if Brier <= market_ml - 0.002 n>=272
- Coach go-rate CANDIDATE only until holdout Brier
- Never mint PASS
- No CLV signal admission
