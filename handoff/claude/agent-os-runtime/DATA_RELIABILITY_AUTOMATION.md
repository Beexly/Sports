# Data Reliability Automation

Implemented stale-data and ingestion-health tasking under `apps/web/lib/data-reliability`.

## Behavior

- Fresh data creates no warning.
- Stale data creates a TAL task.
- Critical stale data escalates risk to critical.
- Unknown ingestion state is `UNKNOWN`, not healthy.
- Source-rights block is separate from freshness.
- No automatic external or paid retry is performed.
