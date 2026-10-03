# AWS Local Data Factory

Updated: 2026-07-03

This factory creates AWS-shaped data discipline without moving data to AWS.

## Data Classes

| Data class | Allowed now | Storage | AWS-shaped future | Gate |
| --- | --- | --- | --- | --- |
| synthetic partner data | yes | repo docs/fixtures | Clean Rooms demos | no real partner data |
| public fixture data | yes if source-safe | repo fixture | S3/Athena later | source rights marker |
| internal model outputs | yes | local artifact | SageMaker registry later | artifact lineage |
| odds/market data | fixture only unless licensed | local fixture | Clean Rooms/Athena later | license review |
| personal learning proof | metadata only | docs/personal/aws | portfolio proof | owner approval |
| private AWS account data | no | none | none by default | explicit owner approval |

## Local Dataset Manifest

Every dataset should define:
- dataset id.
- source.
- rights status.
- storage permission.
- commercial-use status.
- derived-feature permission.
- retention rule.
- deletion path.
- fixture command.
- AWS future service, if any.

## No-Cost Pipeline

1. source-rights review.
2. fixture creation.
3. schema validation.
4. metric replay.
5. evidence report.
6. no-action or next local test.
7. AWS mapping only if local proof survives.

## Data Quality Signals

- freshness age.
- missing fields.
- contradiction count.
- source agreement count.
- update latency.
- outcome availability.
- fixture reproducibility.
- rights certainty.

## Rejection Rules

- rights unknown means no cloud storage.
- partner identity data means no repo fixture.
- private account data means no commit.
- paid provider data means no public demo without license.
- synthetic data must be labeled synthetic.
