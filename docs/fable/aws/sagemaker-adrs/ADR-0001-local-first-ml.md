# ADR-0001: Local-First ML

Context: Current FABLE work has local TypeScript/statistical primitives and no approved ML runtime.

Decision: Local/open-source first.

Options considered: local scripts, SageMaker training, hosted inference.

Why now / why not now: Local work is enough for evidence harnesses; SageMaker is premature without data windows and model artifacts.

Cost impact: zero now.

Security impact: lower exposure.

Repo impact: keeps tests local.

Rollback path: remove local experiment branch.

Owner approval needed: yes for cloud ML.
