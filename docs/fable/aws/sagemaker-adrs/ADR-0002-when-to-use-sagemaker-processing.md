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

Additional gates:
- scoped IAM role and deletion path exist
- dry-run artifact exists
- source rights allow AWS processing

Reject when:
- local scripts are sufficient
- source rights are unknown
- no reproducible dataset manifest exists
