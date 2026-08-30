# ADR-0003: Amplify Auth Storage Backend Risk

Decision: reject backend expansion for now.

Reason:
- Current app already has auth/database assumptions.
- Adding Amplify backend services would increase security and migration risk.
- Source rights for storage must be reviewed before any cloud persistence.
- Backend categories would add IAM, secret, data-retention, and rollback obligations not needed for a preview-only spike.

Allowed:
- docs-only analysis.
- preview-hosting evaluation after approval.

Blocked:
- Cognito migration.
- storage migration.
- secret sync.
- DNS changes.

Adoption trigger:
- explicit owner decision to evaluate AWS-native auth/storage, plus a data-rights and rollback review.
