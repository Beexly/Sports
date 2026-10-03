# AWS TOS And Legal Surface Map

AWS does not change upstream source rights.

Mapping:
- S3 storage follows `storage_allowed`.
- Feature derivation follows `derived_analytics_allowed`.
- Model training follows `model_training_allowed`.
- Commercial dashboards follow `commercial_display_allowed`.
- Partner collaboration follows commercial display, redistribution, and contract terms.

Source of truth:
- `apps/web/lib/scraping/source-rights-registry.ts`
- `apps/web/lib/fable/source-registry.ts`

AWS-specific review needed before live use:
- AWS account owner.
- Region.
- Encryption and retention policy.
- IAM role boundaries.
- Budget and alarms.
- Data classification.
