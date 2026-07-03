# ADR-0002: When To Use SageMaker Processing

Decision: Use later only for repeatable batch jobs that outgrow local execution.

Use when:
- approved dataset exists
- job duration or scale exceeds local workflow
- reproducibility matters for partner review

Do not use now:
- no approved cloud dataset
- no cost approval
- no processing job definition

Rollback path: run local script on fixture/replay data.

Owner approval needed: yes.
