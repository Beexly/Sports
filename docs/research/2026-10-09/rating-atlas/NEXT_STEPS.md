# Rating atlas — next steps, gaps closed, gaps open (2026-10-10 audit pass)

Research documentation. Not a pick. No production change. Every claim below was
re-verified against this checkout and origin this session.

## Closed tonight (pushed on this branch)

- `5ba69e3ac` — idle step wired: `glicko2_idle` (rating/sigma unchanged,
  rd' = SCALE*sqrt((rd/SCALE)^2 + sigma^2), no volatility solve, no /v) plus
  `period_with_byes` roster router; parallel path untouched; idle assert
  (200.27 / 1500 / 0.06) added. Board checklist appended; `cfb_2026-10-10.md`,
  `DEEP_RESEARCH_AUDIT.md`, `run_cycle.py` landed.
- `407e20495` — `FULL_STACK_DELIVERY.md` rewritten on this branch from the
  Downloads v6 paste (the board's "delivery file not rewritten" gap). Fixes:
  `ci()` → `ci_of_mean` (marked do-not-cite) + `draws_interval` (2.5/97.5 of
  draws) now feeding the three Gibbs prints; manifest "matches exactly" →
  "canonical to rounding, 1464.05 vs paper 1464.06" (both spots); Kalman
  docstring corrected (draws interval [1.01, 2.18], ladder sd stays 13.45,
  production NFL_EPA_HFA 0.025 EPA/play untouched); both teaser claims replaced
  with the verified result (rho 0 → 0.468 fair +114; rho 0.35 → 0.506 fair
  -102; gap +0.038 is correlation, not a tax; -155/-127 was a different setup);
  Part 5 sigma row corrected (point ~13.4, ladder stays 13.45); weather
  intercept row corrected (+1.74 is the 0 mph / 70 F baseline, not the average
  miss, not an addend).
- `run_cycle.py` hardened: runs `glicko2.py`, `engine_math.py`,
  `props_optimizer.py`, `verify_claims.py`; sets
  `PYTHONDONTWRITEBYTECODE=1` so imported siblings stop sweeping `.pyc` into
  commits. Root `.gitignore` gained `__pycache__/`.
- Validations (fresh runs this session): `python3 glicko2.py` exit 0 —
  parallel 1464.05 / 151.52 / 0.059996 (paper 1464.06), first chord -5.626955,
  sequential 1463.79 / 151.87 / 0.06000 with sigma not 2, idle RD 200.27 /
  1500 / 0.06. `run_cycle.py` exit 0 (4/4 self-checks). The patched
  `analyze_nfl` code block inside the delivery compiles clean.
- Board rows flipped to [x]: delivery ci(), Part 5 sigma, Kalman docstring,
  weather intercept, Glicko-exact manifest.

## Open gaps, with the next command for each

1. **Wind/temp column.** `data/gse-dataset/games.jsonl` verified this session:
  rest/roof/surface present, no wind, no temperature. Re-fit needs the
  delivery's `weather_fit_ols` join (`games_all.csv` wind column against
  `closing_lines.csv`). Until the column exists, wind stays NOT RE-RUN and the
  production nonlinear curve is the prior. Cost: $0.
2. **EPL showdown + lambda_3 reprice.** `research.db` verified absent in this
  checkout. Build with `data/build_db.py`, then `data/fit_engines.py`, then the
  EPL totals reprice against Pinnacle closes. Until then EPL rows stay NOT
  RE-RUN. Cost: $0.
3. **Market prior in the 2025 weeks 1-6 backtest.** Integrate
  `stack_with_market(p_model, p_market, w=0.3)` into the `backtest.py`
  expanding loop. 55.8% / Brier 0.2868 -> 0.2464 stands as the no-market
  number; not a 100% engine.
4. **Fatigue quarter ratios.** Delivery quarter scoring ratios (1.519, 1.446,
  0.982) are single-machine output; regenerate with
  `python3 data/deep_metrics_nfl.py` before citing.
5. **NGS 2024 cache + EPA/contract joins into research.db** (audit gap board
  items 8-9): cache 2022-2023 NGS, poll the release repo weekly; join
  `contracts.csv` and pbp into context tables.
6. **Live x-ray Shin display bug** (z=0.0% with probabilities that do not sum
  to 1): `/xray` router verified absent from Sports and agent-bus; the bug
  lives in a third repo (galaxy-sports-api candidate). Cross-repo; fix on its
  own cycle, never from this branch.
7. **Closing line still ahead of the EPL model** (0.966 vs 1.047 nats) — the
  accuracy work, not another rating.

## Swapped ledger IDs — hard warning

The GSE architecture audit (Sports Engine and Glicko2 Audit.docx, 2026-10-09)
keys its five priority ports as: 0329 wisdom-of-crowds, 0668 Cherny-Obloj
Kelly, 1168 ACI, 1750 shrinkage, 2044 bivariate Poisson. The verified mapping
is different: 0329 is rugby EP, 0668 is NFL DPI (REJECT), 1168 is
wisdom-of-crowds, 1750 is Cherny-Obloj, 2044 is QuantFactor REINFORCE. Do not
wire any port by ID without a human reading the PDF first. The math inside the
audit is otherwise consistent with doctrine where checked (Shin z=0.0476,
Illinois k=1 bracket-cap analysis, exact-zero hardening suggestion).

## Stale documents (superseded tonight — do not re-execute)

- `GSE_Session_Handoff_2026-10-09.md` section 0 says the idle step is NOT
  wired and Task 1 is open. Done in `5ba69e3ac`. Do not redo it from that
  handoff.
- `gse_brain_ingestion_v1` promotion-layer rules are unaffected by tonight:
  mu = market close, Gaussian-close CRPS bar 7.109 (beat by >= 0.01, n >= 150,
  walk-forward), no MODEL_VERSION bump, do-not-rescue list stands.
- `ASTRA-PACK-COMBINED.docx` is the separate Galaxy Sports Edge product
  redesign workstream (design brief + inventories, no repo writes from it).

## Suggestions (proposed, not done)

- Split the 6.6k-line delivery into per-file code under
  `docs/research/2026-10-09/rating-atlas/code/` on a later pass; the sibling
  self-check files already cover the verified engines.
- Author a `ci_fix.report_gibbs`-shaped helper inside the delivery's
  `analyze_nfl` block so a fresh external build cannot reintroduce the
  mean-CI print. The grep gate below is the interim guard.
