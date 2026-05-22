# Improvement Backlog

## Shipped

### IMP-003 - Spec and Template Code Parity Gap

- Filed: 2026-05-22
- Severity: URGENT
- Status: shipped locally
- What: Claude's scratch-clone specs and template code were absent from the primary checkout, blocking Phase 3 Studio and bot implementation from using the locked voice, refusal, and compliance contracts.
- Resolution: copied the missing template code, `docs/product/**`, `docs/ops/evals/**`, Phase 3-5 briefs, manifest, and missing Intelligence Graph fixtures into primary. Local append-only ops logs were merged rather than overwritten.
- Follow-up: run typecheck/test/build before using the new templates in implementation; resolve any type drift in favor of primary-clone production architecture.
