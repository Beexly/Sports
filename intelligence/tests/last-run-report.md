# GSE Intelligence Build — Last Full-Suite Run

**Date (UTC):** 2026-10-02 16:08:02
**Duration:** 224.8s
**Totals:** 803 tests — 783 PASS, 14 FAIL, 0 MISSING, 6 SKIP
**Verdict:** NOT GREEN — see failures below

## Per-module scoreboard

| Module | PASS | FAIL | MISSING | SKIP |
|---|---|---|---|---|
| `coaching` | 50 | 10 | 0 | 0 |
| `combining` | 27 | 0 | 0 | 0 |
| `newregime` | 21 | 0 | 0 | 0 |
| `qb` | 37 | 0 | 0 | 0 |
| `qb-behavior` | 175 | 0 | 0 | 6 |
| `ratings` | 28 | 0 | 0 | 0 |
| `staking` | 24 | 0 | 0 | 0 |
| `tests` | 308 | 4 | 0 | 0 |
| `tests/e2e` | 73 | 0 | 0 | 0 |
| `trust` | 40 | 0 | 0 | 0 |

## Failures / missing (must fix)

- **[FAIL]** `coaching/tests/test_coaching.py::TestFingerprint::test_t1_fixture`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestFingerprint::test_t1_fixture_values`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestFingerprint::test_team_fingerprint_zscores`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestTenures::test_monken_verified`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestTenures::test_unknown_coach_is_none`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestTenures::test_yoy_delta_same_context`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestTenures::test_yoy_delta_team_change_is_none`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestTenures::test_registry_coverage_honest`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestProvider::test_coach_profile_monken`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `coaching/tests/test_coaching.py::TestProvider::test_coach_profile_yoy_note`
  - E   integration.providers.DataGapError: DATA-GAP [coaching]: coaching seed data not found. Tried: C:\Users\Garrett\Sports-wt-intel\intelligence\coaching\data, C:\Users\Garrett/workspace/coaching-tende
- **[FAIL]** `tests/test_coaching_gates.py::test_gate_tau_hamming`
  - E   ValueError: No objects to concatenate
- **[FAIL]** `tests/test_coaching_gates.py::test_gate_brier`
  - E   ValueError: No objects to concatenate
- **[FAIL]** `tests/test_coaching_gates.py::test_gate_audit_agreement`
  - E   ValueError: No objects to concatenate
- **[FAIL]** `tests/test_coaching_gates.py::test_audit_pipeline_runs`
  - E   ValueError: No objects to concatenate

## Skipped (6) — not passing, not failing

- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_pipeline_has_180_qbs` — Skipped: real pipeline data not present
- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_rodgers_2016_epa` — Skipped: real pipeline data not present
- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_rodgers_2016_hhi` — Skipped: real pipeline data not present
- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_rodgers_2016_int` — Skipped: real pipeline data not present
- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_rodgers_2016_scramble` — Skipped: real pipeline data not present
- **SKIP** `qb-behavior/tests/test_engine.py::TestEngineRealData::test_rodgers_2016_top1` — Skipped: real pipeline data not present
