# ADR-0006: When To Use Hosted Inference

Decision: Reject for now.

Use when:
- low-latency production inference is required
- model artifact is validated
- cost cap and rollback are approved

Why not now:
- no validated model artifact
- no live AWS budget
- no hosting need

Rollback path: local batch inference.

Owner approval needed: yes.
