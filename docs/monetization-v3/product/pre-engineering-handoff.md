# Pre-Engineering Handoff

Status: ready when execution gates clear

This is the packet Codex should read when Garrett gives the GO after customer development.

## Do Not Start Unless

Read [../13-execution-gates.md](../13-execution-gates.md). Vault engineering starts only after the Vault gate is cleared.

## Required Inputs From Garrett

- Runway scenario.
- Vault customer-dev decision memo.
- Canonical landing copy approval.
- Founding-50 cohort selection method approval.
- Referral program V1 policy lock or explicit deferral.
- Stripe product/price preference or permission to create.
- Email provider choice.
- Office-hours recording/transcription provider choice.
- Discord server id, role id, and bot setup details.
- App repo location if different from this docs repo.

## Read Order for Engineering

1. [vault-prd.md](vault-prd.md)
2. [../15-vault-operations-integration.md](../15-vault-operations-integration.md)
3. [vault-data-model.md](vault-data-model.md)
4. [vault-api-contracts.md](vault-api-contracts.md)
5. [webhook-and-integrations-spec.md](webhook-and-integrations-spec.md)
6. [admin-operations-spec.md](admin-operations-spec.md)
7. [vault-test-plan.md](vault-test-plan.md)
8. [engineering-issue-pack.md](engineering-issue-pack.md)
9. [../brand-safety-checklist.md](../brand-safety-checklist.md)
10. [../galaxy-brand-voice-canonical.md](../galaxy-brand-voice-canonical.md)
11. [../copy/vault-office-hours-playbook.md](../copy/vault-office-hours-playbook.md)
12. [../copy/vault-referral-program.md](../copy/vault-referral-program.md)
13. [../copy/vault-retention-checkins.md](../copy/vault-retention-checkins.md)
14. [../copy/vault-member-support-playbook.md](../copy/vault-member-support-playbook.md)
15. [../copy/vault-launch-press-pack.md](../copy/vault-launch-press-pack.md)
16. [../galaxy-press-kit.md](../galaxy-press-kit.md)
17. [../week-minus-1/07-founding-50-selection-framework.md](../week-minus-1/07-founding-50-selection-framework.md)
18. [../week-minus-1/08-voice-deck-template.md](../week-minus-1/08-voice-deck-template.md)
19. [../launch/vault-launch-runbook.md](../launch/vault-launch-runbook.md)

## First Engineering Move

Do not start with UI.

Start by locating and documenting:

- User model.
- Subscription model.
- Stripe webhook handler.
- Entitlement helpers.
- Auth middleware.
- Existing gated routes.
- Email provider.
- Discord integration, if any.

Then map the Vault implementation onto existing patterns.

## Implementation Order

1. Data model and migrations.
2. Entitlement helper.
3. Stripe webhook handling.
4. Seat assignment and seat count endpoint.
5. Gated member dashboard shell.
6. Landing page and application form.
7. Content archives.
8. Discord role automation.
9. Email and lifecycle sequences.
10. Referral tracking and payout operations.
11. Office-hours archive and transcripts.
12. KPI export.
13. Test plan and launch smoke.

## Stop Conditions

Pause and ask Garrett if:

- Existing app has no reliable subscription state.
- Stripe webhook behavior is unclear or unsafe.
- Founding number cannot be assigned transactionally.
- Discord role automation requires credentials not available.
- Referral payouts require Stripe Connect setup Garrett has not approved.
- Lifecycle email scheduling would send retention/referral/cancel emails before copy approval.
- Office-hours transcription requires a third-party account Garrett has not approved.
- Brand-safety scanner is missing and public copy is about to ship.

## Definition of Done

- All P0 test cases in `vault-test-plan.md` pass.
- Non-member access is blocked server-side.
- Founding seat assignment is duplicate-safe.
- Stripe and Discord behavior are idempotent.
- Welcome emails are loaded and scanned.
- Lifecycle emails and referral program policy are loaded or intentionally deferred.
- Office-hours archive can accept recording, transcript, notes, and commitments.
- Launch runbook can be executed without missing steps.
