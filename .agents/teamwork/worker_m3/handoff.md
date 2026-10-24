# Handoff Report: Worker 3 — DET @ CAR SNF Board Re-verification & Audit

**Date:** 2026-10-05T00:08:00Z  
**Worker:** Worker 3 (implementer, qa, specialist)  
**Deliverables:**
- `frontier/sports/audit_tonight_snf.py`
- `outbox/DET-CAR-SNF-AUDIT-2026-10-04.json`
- `outbox/DET-CAR-SNF-AUDIT-2026-10-04.md`

---

## 1. Observation

1. **Live Feeds & Market Conditions:**
   - ESPN Event ID `401872978` corresponds to "Detroit Lions at Carolina Panthers" with kickoff scheduled for 2026-10-05T00:20Z at Bank of America Stadium (Charlotte, NC).
   - In ESPN Core Odds feed (`odds/100`), DraftKings live spread is DET -4.5 (-105.0) / CAR +4.5 (-115.0); total has steamed from an opening line of 45.5 up to 52.5 (+7.0 points inflation); moneyline is DET -225 / CAR +185.
   - Core prop bets feed returned 1,577 items. Live book lines reflect significant inflation over legacy tout cheat-sheet lines:
     - Amon-Ra St. Brown Receptions: opened at 6.5, current market is 7.5.
     - Jahmyr Gibbs Rushing Yards: current market line is 98.5 (legacy tout script had 74.5).
     - Jameson Williams Receiving Yards: current market line is 52.5.
     - Tetairoa McMillan Receiving Yards: opened at 67.5, steamed to 73.5 (legacy tout script had 64.5).
     - Chuba Hubbard Rushing Yards: current market line is 66.5 (legacy tout script had 54.5).
     - Chuba Hubbard Receptions: current market line is 3.5.
     - Aidan Hutchinson Sacks: current market line is 0.75 (-135).
     - Detroit Lions Team Sacks: current market line is 3.5 (-110).

2. **Live Roster Gate Behavior (`intelligence/roster/live_roster_gate.py`):**
   - Active players on DET and CAR verified cleanly with stable ESPN IDs:
     - Amon-Ra St. Brown (DET) -> `PASS espn_id=4374302`
     - Jahmyr Gibbs (DET) -> `PASS espn_id=4429795`
     - Jameson Williams (DET) -> `PASS espn_id=4426388`
     - Tetairoa McMillan (CAR) -> `PASS espn_id=4685472`
     - Chuba Hubbard (CAR) -> `PASS espn_id=4241416`
     - Aidan Hutchinson (DET) -> `PASS espn_id=4372099`
     - Detroit Lions (DET) -> `team market (no player)`
   - 100% of negative control candidates were immediately blocked at Gate 1:
     - David Montgomery (DET): `BLOCK: stale roster -- live team is HOU, not DET espn_id=4035538`
     - Andy Dalton (CAR): `BLOCK: stale roster -- live team is PHI, not CAR espn_id=14012`
     - Diontae Johnson (CAR): `BLOCK: not on any live NFL roster`
     - Saquon Barkley (PHI): `BLOCK: Sleeper injury status 'out' espn_id=3929630`

3. **Empirical Outcomes & Wilson 95% LCB:**
   - Empirical per-game actuals from official ESPN athlete gamelogs (2025/2026 seasons) show:
     - Amon-Ra St. Brown: $n=20$ games. At line 7.5, hit count = 10/20 (50.0%), Wilson 95% LCB = 32.7%, implied prob = 53.5%, LCB edge = -20.7%. (Even at legacy line 6.5, hits = 12/20 (60.0%), Wilson LCB = 41.9%, implied = 54.5%, LCB edge = -12.7%).
     - Jahmyr Gibbs: $n=20$ games. At live line 98.5, hit count = 5/20 (25.0%), Wilson LCB = 12.7%, implied prob = 53.5%, LCB edge = -40.8%. (At legacy line 74.5, hits = 8/20 (40.0%), Wilson LCB = 24.2%, LCB edge = -29.3%).
     - Jameson Williams: $n=20$ games. At line 52.5, hit count = 10/20 (50.0%), Wilson LCB = 32.7%, LCB edge = -20.7%.
     - Tetairoa McMillan: $n=21$ games. At live line 73.5, hit count = 7/21 (33.3%), Wilson LCB = 19.2%, LCB edge = -34.3%.
     - Chuba Hubbard: $n=19$ games. At live rush line 66.5, hit count = 3/19 (15.8%), Wilson LCB = 6.5%, LCB edge = -47.0%. At receptions line 3.5, hit count = 3/19 (15.8%), LCB edge = -45.9%.
     - Aidan Hutchinson: $n=20$ games. At line 0.75, hit count = 13/20 (65.0%), Wilson LCB = 46.6%, implied prob = 57.4%, LCB edge = -10.8%.
     - Detroit Lions Team Sacks: $n=10$ recent completed games. At line 3.5, hit count = 5/10 (50.0%), Wilson LCB = 26.9%, implied prob = 52.4%, LCB edge = -25.5%.
   - Every single candidate prop produces a negative Wilson 95% LCB edge ($\le 0\%$).

4. **Correlated SGP Parlay Execution:**
   - 3-leg correlated parlay (Amon-Ra Over 7.5 Rec + McMillan Over 73.5 Rec Yds + Hutchinson Over 0.75 Sacks) was evaluated using Canonical Vine Copula simulation with Higham nearest-PSD matrix repair.
   - Result: Joint probability = 18.04% (fair odds: +454), Fréchet compliant = True. Status = `ABSTAIN` because all component legs failed Gate 4.

5. **Static Anti-Bypass Scanning & Test Suites:**
   - `python -c "from frontier.sports.test_engine_gate import violations; assert len(violations()) == 0"` passed with 0 violations.
   - `pytest frontier/sports/test_engine_gate.py` passed 18/18 tests in 0.72s.
   - `pytest intelligence/roster/test_live_roster_gate.py` passed 11/11 tests in 0.10s.
   - `pytest frontier/sports/test_signal_registry_parity.py` passed 10/10 tests in 0.14s.

---

## 2. Logic Chain

1. **Live Feed Ground Truth (Observation 1):** The live market for tonight's SNF game has steamed totals and inflated individual player proposition lines substantially above opening and legacy tout values. Any analysis using legacy lines (e.g. Gibbs 74.5) represents market stale fantasy rather than executable reality.
2. **Gate 1 Roster Immunity (Observation 2):** By requiring live ESPN roster verification cross-checked with Sleeper before any mathematical evaluation, stale team assignments (Montgomery on DET), traded quarterbacks (Dalton on CAR), unlisted players (Diontae Johnson), and inactive players (Barkley on PHI) are blocked at the door. Gate 1 failed closed on 100% of negative controls.
3. **Law 9 / Standing Doctrine 5 Mathematical Enforcement (Observation 3):** Legacy tout scripts bypassed sample variance by applying scalar tricks (`lcb_edge = edge_pct * 0.8`), which produced false positive edges on sub-50% hit rates. When evaluated through true Wilson 95% Lower Credible Bounds ($z=1.645$, $n \ge 5$), the small sample penalty widens the interval, demonstrating that neither the inflated live lines nor the legacy tout lines possess positive empirical LCB edge against the book's implied probabilities.
4. **Zero Forced Picks (Observation 3, 4):** Under Standing Doctrine 5, any candidate with non-positive Wilson 95% LCB edge ($LCB \le 0\%$) must fail closed to `ABSTAIN`. Therefore, every candidate on tonight's board abstains, protecting capital against inflated public traps.
5. **Compound Parlay Defense (Observation 4):** Under `ENGINE_GATE_V1`, compound parlays cannot mask rotten legs. If any single leg fails Gate 4, the entire parlay fails closed to `ABSTAIN`.
6. **Integrity & Code Enforcement (Observation 5):** The script `frontier/sports/audit_tonight_snf.py` emits clean provenance-stamped artifacts directly to `outbox/` and satisfies repo-wide anti-bypass static scanning with 0 violations.

---

## 3. Caveats

- **No Caveats.** All data ingested during execution represents real-time live feeds from official ESPN and DraftKings endpoints with genuine timestamps. No synthetic mocks or scalar shortcuts were used.

---

## 4. Conclusion

- `frontier/sports/audit_tonight_snf.py` has been implemented and executed cleanly with 0 errors.
- Both audit deliverables have been emitted and verified:
  - `outbox/DET-CAR-SNF-AUDIT-2026-10-04.json` (54,378 bytes)
  - `outbox/DET-CAR-SNF-AUDIT-2026-10-04.md` (8,424 bytes)
- Roster Gate 1 verified: 100% block rate on stale, traded, unlisted, and inactive players.
- Engine Gate 4 verified: All inflated lines and legacy lines fail closed to `ABSTAIN` per Law 9 / Doctrine 5.
- Repo-wide anti-bypass scanner verified: 0 violations.
- All 39 test cases in the test suite pass.

---

## 5. Verification Method

To independently verify Worker 3's deliverables, run the following commands:

```bash
# 1. Run the live SNF board audit script
python frontier/sports/audit_tonight_snf.py

# 2. Run the CI anti-bypass scan
python -c "from frontier.sports.test_engine_gate import violations; assert len(violations()) == 0; print('0 violations verified')"

# 3. Verify the generated audit artifacts exist and parse
python -c "
import json
from pathlib import Path

p = Path('outbox/DET-CAR-SNF-AUDIT-2026-10-04.json')
assert p.exists()
data = json.loads(p.read_text(encoding='utf-8'))
assert data['audit_metadata']['event_id'] == '401872978'
assert len(data['roster_gate_summary']['negative_control_verdicts']) == 4
assert len(data['candidate_evaluations']) == 12
assert data['audit_summary']['law_9_fail_closed_compliance_pct'] == 100.0
md = Path('outbox/DET-CAR-SNF-AUDIT-2026-10-04.md')
assert md.exists() and md.stat().st_size > 5000
print('Artifact verification passed!')
"

# 4. Run full test suite
python -m pytest frontier/sports/test_engine_gate.py frontier/sports/test_signal_registry_parity.py intelligence/roster/test_live_roster_gate.py -v
```
