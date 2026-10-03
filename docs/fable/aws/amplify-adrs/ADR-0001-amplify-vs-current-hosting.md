# ADR-0001: Amplify Vs Current Hosting

Decision: reject full migration for now; keep docs-only analysis and preview-only evaluation separate.

Current hosting reality:
- Existing deployment assumptions remain outside this AWS spike.

Current pain points:
- Need GitHub-visible demo paths.
- Branch preview value is plausible but unproven.

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

Adoption trigger:
- owner requests AWS-hosted preview value, cost ceiling is approved, and current host remains untouched.
