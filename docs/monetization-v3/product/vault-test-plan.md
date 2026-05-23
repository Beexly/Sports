# Vault Test Plan

Status: implementation contract
Build gate: Vault customer-development GO decision

## Test Levels

- Unit tests for entitlement and seat assignment.
- Integration tests for Stripe webhook behavior.
- API tests for gated content access.
- End-to-end tests for checkout to dashboard access.
- Manual smoke tests for Discord and email workflows.

## Critical Test Cases

## Entitlement

- Non-member cannot access `/vault/member`.
- Non-member cannot fetch digests.
- Active member can access all Vault member routes.
- Canceled member keeps access until `currentPeriodEnd`.
- Expired member loses access after `currentPeriodEnd`.
- Refunded member loses access immediately if refund policy requires.
- Admin can access content management surfaces.

## Founding Seat Counter

- First Vault member receives founding number 1.
- 999th member receives founding number 999.
- 1000th member receives founding number 1000.
- 1001st attempted founding member does not receive founding number.
- Concurrent checkout sessions cannot receive duplicate founding numbers.
- Seat count endpoint never exposes identities.

## Stripe

- Successful checkout creates `VaultMember`.
- Existing Elite user upgrades without duplicate user account.
- Subscription update changes status.
- Subscription cancellation keeps access through paid term.
- Failed invoice marks `past_due` without immediate access removal unless app policy says otherwise.
- Refund records status and updates access.
- Duplicate webhook deliveries are idempotent.

## Discord

- Vault member with linked Discord receives `vault-member` role.
- Role assignment failure creates repair task/log.
- Cancellation keeps role through paid term.
- Term-end expiration removes role silently.
- Manual role repair works.
- Abuse removal can remove role without waiting for term-end if Garrett chooses refund/removal path.

## Email

- Email 1 sends after payment clears.
- Emails 2-5 schedule correctly.
- Sequence pauses on cancellation.
- No referral ask appears in first 5 emails.
- Day 30 retention check-in sends.
- Day 60 retention check-in skips for healthy engagement and sends for low engagement.
- Day 90, Day 180, Day 335, and Day 365 lifecycle emails schedule correctly.
- Cancellation confirmation sends immediately after cancellation.
- Re-engagement email only schedules for compatible term-end cancellations.
- Compliance scan passes for every email.

## Referral Program

- Referral URL uses stable member id.
- Referral click creates or updates last-click attribution.
- Attribution expires after 30 days if no subscription occurs.
- Checkout within attribution window records conversion.
- Self-referral by matching payment method or address is blocked.
- Monthly accrual computes 10% prorated first-year commission.
- Refund creates a clawback.
- Admin can approve payout batch.
- Referrer identity is not exposed to referred member.

## Content

- Draft digest is not visible to members.
- Scheduled digest publishes at expected time.
- Published digest appears in archive.
- Office-hours recording is gated.
- Office-hours transcript is gated.
- Office-hours commitments are visible to admin until completed.
- Quarterly review PDF is gated.
- Missing quarterly review file does not expose broken public URL.

## Application Flow

- Public user can submit application.
- Invalid email rejected.
- Short freeform answer rejected.
- Duplicate applications are handled gracefully.
- Admin can approve, decline, or waitlist.
- Admin can export founding-50 scoring fields.

## Compliance/Brand

- Landing page copy passes banned-term scan.
- Welcome emails pass banned-term scan.
- Digest template passes banned-term scan.
- Referral page, retention check-ins, office-hours playbook, and press copy pass banned-term scan.
- Public pages do not imply guaranteed outcomes.
- Public pages do not promise more picks inside Vault.

## Launch Smoke Test

Before production launch:

1. Test user completes checkout.
2. Test user lands on member dashboard.
3. Test user sees founding number.
4. Seat count decreases by 1.
5. Test user receives email 1.
6. Test user receives or can request Discord role.
7. Test user can view one seeded digest.
8. Non-member cannot view seeded digest.
9. Test user can see referral dashboard.
10. Admin can see KPI export.
11. Cancellation keeps access through paid period and sends cancellation email.

## P0 Bugs

Treat as launch-blocking:

- Duplicate founding numbers.
- Non-member can access Vault content.
- Stripe payment succeeds but member has no access.
- Member gets charged twice.
- Discord role granted to wrong user.
- Email sequence sends to wrong user.
- Referral payout accrues to wrong user.
- Lifecycle email sends after cancellation when it should be paused.
- Public copy contains prohibited outcome claims.
