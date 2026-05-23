# Vault Persistence Migration Contract

**Status:** Engineering contract. Adapter-neutral.
**Related decision:** DEC-NEXT-056

## DEC-NEXT-056 - Define Vault persistence migration contract

**Decision:** Define the database tables, uniqueness constraints, transaction boundaries, and idempotency rules Vault needs before real checkout can open.

**Why now:** The product docs specify the logical model, and the app scaffold has pure decision logic. The missing middle is the persistence contract that turns those decisions into reliable launch behavior. This document keeps the eventual migration from becoming an improvised provider-specific implementation.

## Scope

This contract covers launch-critical Vault storage only:

- paid membership state;
- founding seat assignment;
- processed Stripe webhook events;
- Discord role repair state;
- lifecycle emails;
- referral attribution and payout review;
- admin repair tasks;
- audit events.

It does not choose a vendor, ORM, hosting provider, migration tool, or auth provider.

## Required Tables

### `vault_members`

Purpose: one durable row per paid or formerly paid Vault member.

Required constraints:

- primary key `id`;
- unique `user_id`;
- unique `stripe_subscription_id`;
- unique nullable `founding_number` where `founding_number <= 1000`;
- index `status`;
- index `current_period_end`;

Transaction rule:

When a checkout conversion creates a member, the transaction must also:

1. verify the Stripe event has not already been processed;
2. assign `founding_number` under a lock or serializable transaction;
3. create initial lifecycle email rows;
4. create or update referral attribution if present;
5. write audit events.

### `vault_processed_stripe_events`

Purpose: idempotency log for Stripe webhook events.

Required constraints:

- primary key `stripe_event_id`;
- `event_type`;
- `received_at`;
- `processed_at`;
- `processing_status` enum: `processed`, `ignored`, `failed`;
- `failure_reason` nullable text;

Transaction rule:

Insert the event ID before mutating member state. If insert conflicts, skip processing. Do not mutate member state outside the same transaction that records successful processing.

### `vault_lifecycle_emails`

Purpose: durable send queue for welcome, retention, renewal, cancellation, referral, and re-engagement emails.

Required constraints:

- primary key `id`;
- unique pair `vault_member_id`, `template_id`;
- index `scheduled_for`;
- index `status`;

Queue rule:

Email sends must update `send_attempts`, `status`, `sent_at`, and `provider_message_id` atomically with provider-send outcome recording. Held rows become admin repair tasks.

### `vault_referral_attributions`

Purpose: referral click, conversion, first-year commission, and refund-clawback state.

Required constraints:

- primary key `id`;
- unique `attribution_code`;
- index `referrer_user_id`;
- index `referred_email`;
- index `status`;

Attribution rule:

The conversion transaction must match normalized referred email, enforce the stored `click_expires_at`, block self-referrals, and never create commission without a successful Vault payment.

### `vault_referral_payouts`

Purpose: monthly payout batch lines for manual V1 review.

Required constraints:

- primary key `id`;
- unique pair `referrer_user_id`, `period`;
- index `status`;

Payout rule:

Subscription credit is the default payout destination. Cash payout through Stripe Connect requires an explicit payout preference and reviewed account ID. Refunds void unpaid accrual first and claw back only paid exposure.

### `vault_admin_repair_tasks`

Purpose: visible operator queue for partial failures.

Required constraints:

- primary key `id`;
- unique pair `source`, `entity_key`, `title` while status is open;
- index `severity`;
- index `status`;
- index `created_at`;

Task rule:

Open tasks are created from deterministic repair-task helpers. Resolution must record `resolved_by`, `resolved_at`, and a note. P0 tasks feed incident thresholds.

### `vault_audit_events`

Purpose: immutable-ish audit trail for member and launch-critical operations.

Required constraints:

- primary key `id`;
- index `entity_type`, `entity_id`;
- index `event_type`;
- index `created_at`;

Audit rule:

Audit events are append-only from the application path. Manual corrections write a new correction event rather than editing prior audit records.

## Transaction Boundaries

### Checkout Success

All-or-nothing:

1. processed webhook event inserted;
2. member created or updated;
3. founding number assigned if cap remains;
4. lifecycle email rows inserted;
5. referral attribution activated;
6. onboarding repair watch row or audit event written.

If any step fails, the webhook returns a retryable failure and no partial member entitlement is exposed without a repair task.

### Cancellation

All-or-nothing:

1. processed webhook event inserted;
2. member status updated;
3. paid-through date preserved;
4. future active-member-only lifecycle emails skipped or paused;
5. Discord removal task scheduled for paid-term end, not immediate removal;
6. audit event written.

### Refund

All-or-nothing:

1. processed webhook event inserted;
2. member status updated when refund implies access loss;
3. referral clawback decision recorded;
4. payout line updated or repair task created;
5. audit event written.

## Required Launch Tests

- duplicate Stripe event does not duplicate a member, founding number, lifecycle row, or referral attribution;
- two concurrent checkout conversions cannot receive the same founding number;
- canceled member keeps access until `current_period_end`;
- refunded member loses access when refund policy requires it;
- lifecycle rows are unique per member/template;
- held lifecycle rows become repair tasks;
- referral self-referral is blocked;
- refund clawback does not exceed paid commission exposure.

## Still Unwired

- Actual migration files.
- ORM models or query helpers.
- Database adapter.
- Transaction implementation.
- Backups and restore runbook.

## Guardrail

This contract does not authorize enabling checkout, selecting a vendor, or deploying migrations. It exists so the first real persistence implementation has a stable target.
