# Analytics Events (No-Op)

For PR1, instrument only as internal no-op planning and storage schema; no production KPI commitments.

## waitlist_viewed
- fields: `event_id`, `ts`, `page`, `referrer`, `utm_source`, `utm_campaign`, `copy_version`
- source: `apps/web/app/waitlist/page.tsx`
- storage/tracker: internal event log (future DB table or JSON file)
- metric: queue conversion intent ratio
- improves next action: identifies which page variants actually get attention
- owner gate: requires consent state + anonymous vs identified handling review

## waitlist_started
- fields: `event_id`, `ts`, `lead_email_hash`, `sport_interests`, `role`, `copy_version`
- source: waitlist form begin
- storage/tracker: internal event queue
- metric: form start to submission conversion
- improves next action: reduces friction points in field layout
- owner gate: field-level minimization and consent before persistence

## waitlist_submitted
- fields: `event_id`, `ts`, `lead_record_id`, `email_domain`, `utm`, `source`, `consent_timestamp`
- source: waitlist submit endpoint
- storage/tracker: internal event queue + secure lead store
- metric: valid leads by source and role
- improves next action: route to owner triage orderbook
- owner gate: explicit consent required prior to follow-up

## audit_offer_clicked
- fields: `event_id`, `ts`, `cta_id`, `offer_slug`, `lead_record_id`
- source: marketing page CTAs
- storage/tracker: internal event queue
- metric: interest in audit lane
- improves next action: tunes landing copy and form clarity
- owner gate: no performance framing in copy or CTA labels

## transparency_read
- fields: `event_id`, `ts`, `reader_id`, `section`, `dwell_ms`, `copy_version`
- source: transparency/backtest section
- storage/tracker: internal event queue
- metric: whether users read backtest truth section
- improves next action: protects claims risk by increasing truth exposure
- owner gate: requires accurate backtest numbers; no fabricated values

## claim_gate_hit
- fields: `event_id`, `ts`, `triggered_text`, `page`, `user_agent`
- source: content validation guardrail
- storage/tracker: internal guardrail log
- metric: number of draft pages blocked for claim risk
- improves next action: prevents accidental performance language from shipping
- owner gate: hard stop for banned claims

## research_brief_clicked
- fields: `event_id`, `ts`, `brief_id`, `lead_record_id`, `source`
- source: decision-audit and transparency pages
- storage/tracker: internal event queue
- metric: research-intent conversion
- improves next action: identifies high-value onboarding paths
- owner gate: brief content must follow `backtest-transparency.md` and `no-claim-rules.md`
