# Historical NFL Execution Queue

The existing historical safety spine is now covered by runtime tests and tasking.

## Behavior

- GSIS identity is preferred.
- Name-only identity remains ambiguous/blocked.
- Team aliases normalize.
- Current season is excluded from settled calibration.
- Projection feature weight changes require AUDIT and owner approval.
- Historical stat gaps create PRISM/ASCEND review tasks.
- Unknown depth-chart shape should become an inspection task, not fake ingest.
