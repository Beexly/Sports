# qb_behavior.situational — c02 situational splits + trust-target modeling

**Owner:** c02 coordinator. **Status:** built, tested, green (2026-10-02).

## What this is

The situational layer on top of c01's core profile engine. It answers
"how does this QB behave **in this situation**" — pressure splits, INT rates
by game state, target-concentration time series, OL stress — and serves them
through the integration `QBBehaviorProvider` ABC.

## Layout

```
situational/
    cells.py       cell definitions (single source of truth: pressure_floor,
                   288-cell INT grid, trust situations). Stdlib only.
    specs.py       SplitSpec implementations (c01's protocol in splits.py):
                   pressure_floor, int_situational, trust_situation,
                   down_distance, field_zone, script, quarter.
    serve.py       CSV-backed INT/situational server. EB ladder M=25,
                   league -> team -> QB; null floors n<30; QB pressure cells
                   need >=100 pooled pressured dropbacks.
    trust.py       trust-target series (point-in-time): HHI, N_eff, top shares,
                   bootstrap CIs, 4-week CV stability, HHI autocorrelation.
    protection.py  Protection Stress (team-week OLS vs blitz expectation) +
                   shared ols_fit. Analyst/display use only in v1.
    provider.py    SituationalQBProvider(QBBehaviorProvider) — UNPARKS
                   get_pressure_splits (was PARKED "until sourced" per c09 #8).
```

Build (precompute, polars): `qb-behavior/build/build_tables.py` →
`qb-behavior/data/*.csv` (see `data/README.md`). Runtime serves CSVs with
stdlib+csv only.

## The honest-limits contract (from the deep research)

- `pressure_floor = (qb_hit == 1 OR sack == 1)` — hurries exist in no nflverse
  source. The clean cell is contaminated; contrasts attenuate toward zero.
  Never bare "pressure".
- The proposal's **charted** sensitivity is NULL (nflverse FTN has no per-play
  pressure field). The served `sensitivity_epa_floor` is the honest T1
  construction, always reported with the clean baseline + SE (never a raw
  cross-QB ranking — QB-quality confounding is unaddressed by the corpus).
- Engine INT rates use **actual interception occurrence** (T1). The
  worthy-rate × 52.3% formula is the display/props lane only (FTN L7
  share-alike: never a served engine feature).
- `first_read_rate` is always None + data_gap (no pbp source).
- TTT is never emitted (no proxy). No `predicted_sacks` column exists
  anywhere (sack-prop veto, R² < 0.005).
- `cpoe` served is the **nflverse pbp column** (`cpoe_nflverse_pbp`), not NGS CPOE.
- `aggressiveness` is the public proxy P(air_yards ≥ 20); NGS true
  aggressiveness is internal-only and never served.

## Quick start

```python
import sys
sys.path.insert(0, 'qb-behavior/src')
sys.path.insert(0, '.')  # for integration.*
from qb_behavior.situational.provider import SituationalQBProvider

p = SituationalQBProvider()  # reads qb-behavior/data/*.csv
prof = p.get_qb_profile('00-0033537', week=4, season=2026)   # Watson, pre-kickoff W4
splits = p.get_pressure_splits('00-0033537', week=4, season=2026)
sit = p.get_int_situational('00-0033537', 2026, 4,
    {'pressured': 1, 'qtr': 4, 'score_differential': -6,
     'yardline_100': 35, 'down': 3, 'ydstogo': 9})
trust = p.get_trust_series('00-0023459', 2026, 'all')         # Rodgers HHI series
stress = p.get_protection_stress('PIT', 2026, 3)              # analyst-only
```

## Tests

`qb-behavior/tests/test_{cells,eb_ladder,trust,protection,provider,specs,real_data,name_map_fix}.py`
— hermetic unit tests (synthetic fixtures) + real-data integration tests
(pinned independently-verifiable facts, never the implementation's own formula).
