# ADR-0004: When To Use Model Registry

Decision: Use model-card docs now; registry later.

Use when:
- versioned model artifact exists
- approval workflow exists
- rollback target exists

Why not now:
- current work is evidence harness and local primitives.

Rollback path: local model card and commit hash.

Owner approval needed: yes.

Additional gates:
- replay metrics and lineage are attached
- model card exists locally first
- promotion/demotion workflow is documented

Reject now because no SageMaker model artifact exists.
