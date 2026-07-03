# Validation Report

Status as of creation:
- New FABLE primitives have focused Vitest coverage.
- Final command outcomes are recorded in `CODEX_FINAL_REPORT.md`.
- AWS-specific command outcomes are recorded in `aws/AWS_FINAL_REPORT.md`.

Validation scope:
- Source registry adapter/status mapping.
- Uncertainty ranking strategies.
- Labeling manifest schema and local cost simulation.
- PSI, KL divergence, and chi-square drift checks.
- Safe football segment parity blocking.
- AWS deploy and paid-resource gate defaults.
- Unsupported claim scanning for FABLE docs.

Known caveat:
- Passing local tests do not prove live data freshness, provider rights, paid AWS setup, or production operations.
