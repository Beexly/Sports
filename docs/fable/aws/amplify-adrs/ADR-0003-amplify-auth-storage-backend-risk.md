# ADR-0003: Amplify Auth Storage Backend Risk

Decision: reject backend expansion for now.

Reason:
- Current app already has auth/database assumptions.
- Adding Amplify backend services would increase security and migration risk.

Allowed:
- docs-only analysis.
- preview-hosting evaluation after approval.

Blocked:
- Cognito migration.
- storage migration.
- secret sync.
- DNS changes.
