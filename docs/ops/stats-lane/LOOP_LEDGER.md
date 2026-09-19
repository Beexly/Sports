# MIMO self-audit loop ledger

- **2026-09-19T04:36:43.937168+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet