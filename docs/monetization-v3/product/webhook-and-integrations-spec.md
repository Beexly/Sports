# Webhook and Integrations Spec

Status: implementation contract

## Stripe Integration

Events:

- Checkout completed.
- Subscription created.
- Subscription updated.
- Subscription canceled/deleted.
- Invoice paid.
- Invoice payment failed.
- Charge refunded.

Required behavior:

- Idempotent handling.
- Durable logs for each event.
- No duplicate founding numbers.
- Access follows paid-term policy.
- Refunds update access according to refund policy.
- Referral attribution is applied on checkout success.
- Referral payout clawbacks are created on refund.
- Referral accrual runs monthly and queues admin approval in V1.

## Discord Integration

Inputs:

- User links Discord account, or admin manually maps Discord user id.
- Vault membership status.

Actions:

- Grant `vault-member` role.
- Remove `vault-member` role at paid-term end.
- Repair role on demand.

Failure behavior:

- Log failure.
- Show repair task in admin.
- Do not repeatedly spam Discord API.

## Email Integration

Provider: Postmark, SendGrid, or existing transactional stack.

Sequences:

- Vault welcome emails, days 0, 1, 3, 7, 14.
- Vault retention emails, days 30, 60 when engagement is low, 90, 180, 335, 365.
- Vault referral soft mentions, day 30 and optional day 90, separate from retention emails.
- Renewal reminder 30 days before renewal.
- Cancellation confirmation.
- Re-engagement 90 days after compatible term-end cancellation.

Rules:

- Email 1 sends after payment clears.
- Sequence pauses if canceled.
- Emails 3+ include unsubscribe if required by policy/law/provider.
- Retention emails pause after cancellation unless they are cancellation or re-engagement templates.
- Day 60 retention email skips if Discord, office-hours, and digest engagement are healthy.
- All emails use brand-safety checklist before load.

## Storage Integration

Needed for:

- Quarterly review PDFs.
- Office-hours recordings.
- Office-hours transcripts.
- Almanac export packages.

Rules:

- Member-only files must not be public by obscurity.
- Use signed URLs or authenticated proxy if possible.
- Do not put private PDFs at guessable public URLs.

## Analytics Integration

Needed events:

- Vault application submitted.
- Vault checkout started.
- Vault checkout completed.
- Vault member dashboard viewed.
- First digest viewed.
- First Discord engagement, if available.
- Office-hours registration clicked.
- Office-hours attended.
- Office-hours recording viewed.
- Office-hours transcript opened.
- Quarterly review downloaded.
- Referral link clicked.
- Referral converted.
- Lifecycle email sent/opened/clicked where provider supports it.

Privacy:

- Do not expose individual betting behavior in analytics tools that do not need it.

## Office-Hours Transcription

Provider: Otter, Granola, or equivalent.

Required behavior:

- Recording is uploaded within 24 hours of office hours.
- Transcript is attached to the office-hours archive and gated to Vault members.
- Transcript search is available through Discord-native search, app search, or tagged archive metadata.
- Follow-up commitments from the session are captured and visible in admin until completed.

## Press Tracking

Press outreach is not product-critical, but the launch cockpit should support a simple tracker or CSV export.

Fields:

- Outlet.
- Journalist or host.
- Tier.
- Outreach variant.
- Personalization detail.
- Sent date.
- Response status.
- Placement URL.
- Placement quality score.
