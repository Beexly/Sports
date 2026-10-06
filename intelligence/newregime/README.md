# newregime — new-regime adaptation (rookie QB / new HC windows)

Implements the c10 new-regime program (syntheses.md S5: the MAML vs NGGP race;
buildable-systems.md SYS-28, SYS-30, SYS-31; gated research lanes SYS-13/14/15/17).

| File | Implements |
|---|---|
| `maml.py` | 1912 first-order MAML adapter. Honest finding: full-(w,b) inner-loop adaptation on 4 support points overfits (measured 0.0018) — working design is an INTERCEPT-only inner adapter (regime shock = intercept shift; shared playbook meta-learned), marked INFERENCE |
| `nggp.py` | 1902 few-shot GP with calibrated uncertainty (Laplace GP kernel; neural-likelihood + FFJORD is a research-grade extension, not claimed) |
| `feature_store.py` | SYS-28 (event_ts, creation_ts) store + backfill runner + leak-injection test. The leak test caught and fixed a real bug during the build (as-of must respect event_ts, not just creation_ts) |
| `drift.py` | SYS-30 drift ensemble: ADWIN + HDDM-A + KSWIN (abrupt) / HDDM-A + HDDM-W + Page-Hinkley (gradual), majority vote; per-game error stream mapping is INFERENCE and documented |
| `rusty_backup.py` | SYS-31 rusty-backup archetype: layoff-return = ≥10 targeted attempts after ≥8-week gap; blanket = most separation-friendly individual role (NOT a positional checkdown lean) |
| `research_lanes.py` | Gated RESEARCH-GRADE lanes: TASC (SYS-13), dynamic probit bake-off (SYS-14), copula-HMM (SYS-15), injury estimand machinery (SYS-17) — all UNTESTED, `evaluate()` raises `ResearchGradeNotEvaluated`; the SYS-17 estimand-taxonomy REPORTING STANDARD is adopted as real code |
| `dgp.py` | Seeded synthetic DGPs (meta-learning tasks, few-shot GP tasks, weekly error streams) — NOT real NFL data |

**Gates:** MAML ≥ 0.02 Brier improvement (measured 0.0281); NGGP ≥ 0.01
(measured 0.0216). `research_lanes_status()` reports each lane's gate and
UNTESTED status — per INGEST-AND-LEARN, untested items are QUEUED FOR
EVALUATION, never SKIP/DEAD.
