---
paths:
  - "**/__tests__/**"
  - "**/*.test.{ts,tsx}"
  - "scripts/guardrails/**"
  - "docs/ops/evals/**"
  - "**/*trust-claim*"
---

# Tests and claims rules

- A regression test reproduces the original failure before proving the fix.
- Do not weaken assertions, exclude hard cases, relabel fixtures, or rewrite public claims merely to make new code pass.
- Test deterministic domain logic directly; use source scans only for structural invariants.
- Fixtures are visibly fixtures and never support public performance claims.
- Run targeted tests during edits; run final typecheck, lint, guardrails, build, and any protected-zone full suite once.
- Report exact command, exit code, and counts. Never claim a test was run when it was inferred.
