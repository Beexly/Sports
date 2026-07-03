# ADR-0001: Amplify Vs Current Hosting

Decision: docs-only spike.

Current hosting reality:
- Existing deployment assumptions remain outside this AWS spike.

Current pain points:
- Need GitHub-visible demo paths.
- Need branch preview evaluation.

Cost pressure:
- No paid AWS resources approved.

DNS risk:
- no DNS changes allowed.

Auth/env risk:
- NextAuth and secrets require careful review.

Vendor-dependence risk:
- avoid migration without proof.

Rollback path:
- keep current hosting.
