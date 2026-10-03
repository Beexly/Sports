# AWS Data Lake And Feature Store Plan

Current state:
- No S3 bucket, Glue catalog, Athena table, or feature store exists.

Allowed design:
- Store only data permitted by the source rights registry.
- Separate raw, normalized, derived, and report artifacts.
- Attach source id, rights snapshot, extraction timestamp, and attribution metadata.

Blocked:
- Storing raw data from sources with storage disabled.
- Sharing partner data without contract.
- Training on sources with model training disabled.

Future feature store requirements:
- Feature name.
- Source ids.
- Derivation code path.
- Rights snapshot.
- Calibration or drift monitoring owner.
