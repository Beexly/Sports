# Analytics / Cost / Retention Model

## Events

| Event | Properties | Product Use | Retention Use | Privacy Concern |
| --- | --- | --- | --- | --- |
| audio_card_viewed | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_play_started | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_play_completed | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_paused | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| transcript_opened | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| captions_enabled | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| voice_brief_played | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| support_audio_played | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Avoid PII in transcript metadata. |
| onboarding_audio_completed | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| no_bet_audio_played | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_cta_clicked | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_generation_requested | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| audio_generation_failed | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |
| voice_cost_recorded | surface, route, tier, script_id, asset_id, source_version, data_status, approval_status | Measure whether audio helps comprehension. | Compare return visits and completion. | Use aggregate identifiers where possible. |

## Cost Model

- Track characters generated.
- Track minutes generated.
- Cache approved scripts by source hash.
- Set route-level limits.
- Set user/tier limits.
- Keep internal/founder usage separate from customer usage.
- Alert on monthly spend thresholds.
- On quota failure, show transcript-only mode.

## Retention Hypotheses

- Audio Brief increases return visits.
- Spoken explainers reduce confusion.
- Support audio reduces support tickets.
- No-bet audio improves trust.
- Captions improve accessibility.
- Shareable captioned clips improve acquisition.
