# Legal / Rights Brief

Claude must preserve the source gates.

- `active_open`: usable now according to rights flags and attribution requirements.
- `active_owned`: internal/owned data usable under GSN policy.
- `active_api`: only live when an API key is present and rights permit.
- `active_partner`: only live when partner contract flags are active.
- `fixture_backed`: demo/test UI only; label visibly; never market as live.
- `metadata_only` / `source_tracked_only`: source cards and metadata only; no transcript/full-content extraction, training, or derived active metrics.
- `activation_api_key`: adapter/env/health shell only until key and rights are active.
- `activation_license`: adapter/schema/CRM/outreach only until license is active.
- `activation_partner`: intake/import/CRM only until agreement is active.
- `manual_review_required`: admin review queue only.
- `blocked_until_review`: do not ingest, derive, train, or show as active.

Do not remove fixture labels, rights warnings, source lineage, or missing-data states. Metadata-only does not mean content rights; adapter shell does not mean active ingestion.
