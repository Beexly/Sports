# ADR-0005: When To Use Model Monitor And Clarify

Decision: Mirror concepts locally first.

Use when:
- deployed model exists
- prediction logs exist
- approved monitoring data exists

Why not now:
- no hosted model exists.

Rollback path: local PSI/KL/chi-square and safe segment parity reports.

Owner approval needed: yes.

Additional gates:
- monitored baselines exist
- fairness/explainability questions are owner-approved
- report access controls are documented

Reject now because no hosted inference or recurring AWS prediction stream exists.
