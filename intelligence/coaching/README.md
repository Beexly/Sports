# coaching/ — 4th-down risk preference + situational playcalling

**Owner:** c04 Phase 2+ coordinator. **Pair:** c03 owns the core tendency engine (descriptive tables); this module owns the risk-preference layer and the situational decision engine. Boundary: we import c03's artifacts, never rebuild them.

## Research provenance

| File | Implements | Source |
|---|---|---|
| `coach_risk.py` | per-coach-team-season τ̂ via Hamming-loss inverse problem | Sandholtz et al. arXiv:2309.00756 (deep-read `docs/arxiv-program/research/2026-09-21/arxiv-deep/1575-learning-risk-preferences-fourth-down.md`); verified `deep/c04/verified-claims.md` VC-1 |
| `situational_wp.py` | shrunk situational WP engine, 4th-down/2-pt | Ganesh 2026 arXiv:2604.13861v2 ADAPT (`0207-...md`); 2-pt priors from 0247 footballonomics; verified VC-2/VC-3 |
| `coach_audit.py` | coach-decision audit in WP points | S-1 composition; closes c04-map gap #5 |
| `behavior.py` | behavior-conditioned live WP hook (BS-4) | reasoning-depth-spec L3 requirement |
| `refit_tau.py` | offseason refit procedure (BS-5) | CH-2, S-2 |

Deep research: `~/workspace/corpus-intelligence/deep/c04/` (`verified-claims.md`, `syntheses.md`, `challenges.md`, `buildable-systems.md`).

## Honest translations (ours, not the papers')

- Forward MDP → empirical next-state value distributions (v = wp + wpa).
- 4th Down Bot risk-neutral reference → WP-max rule (argmax_a E[v|cell,a]).
- Blended-profile λ(n) = n/(n+50) — the paper's exact formula was unrecoverable (CH-7).
- Timeout action set: stubbed (CH-8). Blitz/man/zone inputs: unavailable in nflverse — not claimed.

## Gates

- τ̂ rule beats WP-max rule by ≥3pp Hamming accuracy, opponent half, 2024–2025 (`TauFitter.hamming_gate`).
- ≥5% Brier improvement shrunk vs raw MLE on held-out 2026 drives (`brier_gate`).
- ≥80% agreement with risk-neutral reference on 200-play audit (`audit_agreement_gate`).

## Run

```
/home/hatch/workspace/.build-venv/bin/python -m coaching.refit_tau --seasons 2022-2026 --out data/tau_hat.csv
/home/hatch/workspace/.build-venv/bin/python -m pytest tests/ -x -q   # from gse-intelligence-build/
```

## Data

Reads `~/workspace/coaching-tendencies/data/pbp_YYYY.parquet` (read-only). Never writes outside `gse-intelligence-build/`. Never touches the Sports checkout.
