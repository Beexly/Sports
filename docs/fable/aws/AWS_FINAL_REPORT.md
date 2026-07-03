# AWS Final Report

Updated: 2026-07-03

Implemented:
- AWS docs and service scorecard.
- Cost/security gate module.
- Zero-cost Amplify skeleton.
- GitHub-ready AWS issue bodies.
- AWS model leverage map, model router design, model evaluation plan, AgentCore firebreak, tool permission matrix, evaluation rubrics, SageMaker/Amplify ADRs, and synthetic Clean Rooms partner demo docs.

Verification log:
- `npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts`
  - Final run passed: 7 test files, 18 tests.
  - AWS gate coverage is in `apps/web/lib/fable/aws-gates.test.ts`.
- `npm run fable:evidence`
  - Passed: aggregate evidence harness returned `[fable-evidence] OK - all`.
- `npm run fable:aws-gates`
  - Passed: AWS gate validation returned `[fable-evidence] OK - aws-gates`.
- `npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts lib/fable/docs-claims.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts`
  - Passed: 4 test files, 11 tests.
- `npm run typecheck --workspaces --if-present`
  - Failed in `@sports/web` because imported prediction-engine BigInt literal files require an ES2020-or-newer target.
- `npm run guard:secrets`
  - Passed after staging: scanned 3051 tracked files; no secrets detected.
- `npm run guard:trust`
  - Passed: scanned 1102 files; no banned phrases.
- `git diff --check`
  - Passed: no whitespace errors.
- `gh auth status`
  - Failed: GitHub CLI is unauthenticated.

Caveats:
- No AWS account was used.
- No live AWS resources were created.
- No AWS secrets were added.
- No paid AWS dependencies were added.
- Official AWS docs were used only for research/design notes and are linked in `README.md` in this folder.
