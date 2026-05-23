# Decision-Log Collision Audit

Date: 2026-05-23
Auditor: Codex

## Scope

Scanned `DEC-NEXT-*` references across:

- `docs/monetization-v3/`
- `.github/`
- `CODEX_MONETIZATION_V3_MASTER_BRIEF.md`
- root `README.md`

## Finding

No active decision-ID collision requiring reassignment was found.

Repeated IDs fall into three expected categories:

1. **Canonical required entries** repeated across `templates/decision-log.md`, `week-minus-1/06-decision-log-entry-templates.md`, gates, issue templates, and runbooks.
2. **Cross-references** to a decision that must exist before execution, such as DEC-NEXT-001 through DEC-NEXT-004.
3. **Template placeholders** with suffixes such as `DEC-NEXT-NNN`, `DEC-NEXT-XXX-OVERRIDE`, or track-specific IDs.

## Reserved / Used IDs

- DEC-NEXT-001 through DEC-NEXT-010 are already reserved by the canonical decision-log templates.
- DEC-NEXT-011 through DEC-NEXT-014 were assigned on 2026-05-23 for overnight maintenance decisions.
- Latest validation state after this audit: 170 Markdown files and 21 CSV files.

## Resolution

No IDs were reassigned.

If a future artifact introduces a real decision using an already-reserved ID with a different meaning, reassign the later-added artifact and update this audit file.

