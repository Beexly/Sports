# Source Risk Register

As of: 2026-06-09

| Risk | Severity | Likelihood | Mitigation | Owner | Decision |
| --- | --- | --- | --- | --- | --- |
| Official pages change HTML | HIGH | MEDIUM | Use adapter fixtures, parser versioning, failure logs, and low-rate probes. | data engineering | GO with tests |
| Official roster lags transaction | HIGH | HIGH | Transaction-to-roster reconciler creates NEEDS_REVIEW rather than silent overwrite. | data quality | GO |
| Media/fantasy TOS risk | HIGH | MEDIUM | Legal/robots review before automated fetch; use as manual fallback until approved. | legal | APPROVAL_REQUIRED |
| Staff privacy overcollection | HIGH | MEDIUM | Only public professional role data from official/professional sources. | legal/data | GO with limits |
| Public method leakage | HIGH | MEDIUM | Founder-only cockpit contains source weights and conflict logic; public sees simplified status. | product | GO |
| Null overwrite | HIGH | MEDIUM | Never overwrite confirmed facts with stale/null lower-confidence source. | engineering | GO |

