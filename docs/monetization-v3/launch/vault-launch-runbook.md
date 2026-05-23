# Vault Launch Runbook

Status: operational runbook
Build gate: Vault customer-development GO decision

## Launch Phases

| Phase | Audience | Duration | Purpose |
|---|---|---:|---|
| Private founding-50 | Interviewees + strongest Elite users | 14 days | Test onboarding and community feel |
| Public founding-1000 | General Galaxy audience | Until cap | Scale validated product |
| Waitlist | After cap | Ongoing | Preserve demand without overloading Garrett |

## Pre-Launch Checklist

- [ ] Runway scenario recorded.
- [ ] Vault customer-dev decision memo says GO.
- [ ] DEC-NEXT-001 through DEC-NEXT-004 complete where applicable.
- [ ] DEC-NEXT-009 referral policy is locked or referral program is deferred.
- [ ] Founding-50 roster scored using `week-minus-1/07-founding-50-selection-framework.md`.
- [ ] Landing page copy brand-safety checked.
- [ ] Stripe checkout tested.
- [ ] Vault entitlement tested.
- [ ] Seat counter tested.
- [ ] Discord role assignment tested.
- [ ] Welcome email sequence loaded.
- [ ] Retention check-ins loaded but not over-triggering.
- [ ] Referral dashboard enabled or intentionally hidden until public launch.
- [ ] First digest drafted.
- [ ] First office-hours date scheduled.
- [ ] Office-hours recording/transcription workflow tested.
- [ ] First 8 Discord threads drafted with placeholders filled.
- [ ] Support inbox monitored by Garrett.

## Founding-50 Invite

Audience:

- 30 interviewees.
- 20 strongest Elite subscribers or highest-commit prospects.

Message:

```text
Hey [first name],

Vault is ready for the first 50 seats.

You spent time helping shape it, so you get first claim before the public founding-1000 opens.

The page is here: [private link]

Two reminders:

- Vault does not include more picks.
- It is the rationale layer: weekly digest, monthly office hours, quarterly review, early Model Journal draft, and the Vault Discord.

If you want in, the founding-50 window is open for 14 days.

Garrett
```

## Launch-Day Timeline

### T-2 hours

- Confirm Stripe webhook health.
- Confirm app logs visible.
- Confirm Discord bot online.
- Confirm email sender working.
- Confirm support inbox open.

### T

- Send founding-50 invite.
- Open private link.
- Watch first 3 checkouts.

### T+30 minutes

- Verify:
  - Payment received.
  - VaultMember created.
  - Founding number assigned.
  - Seat count updated.
  - Email 1 sent.
  - Discord role granted or repair path created.

### T+2 hours

- Post first Discord welcome thread.
- Reply personally to first member posts.

### T+24 hours

- Check conversion.
- Check support issues.
- Confirm no compliance issues in member questions.
- Update decision log with launch observations.

## P0 Launch Issues

If any occur, pause checkout:

- Duplicate founding numbers.
- Paid user has no access.
- Non-member has access.
- Stripe double charge.
- Discord role assigned to wrong user.
- Landing page shows false seat count.
- Public copy contains prohibited outcome claims.

## First-Week Operating Cadence

Day 0:

- Welcome thread.
- Manual monitoring.

Day 1:

- Most uncomfortable publication thread.

Day 2:

- Methodology factor thread.

Day 3:

- Digest format thread.

Day 4:

- Garrett's own loss-room style post.

Day 5:

- "What should Galaxy stop doing?" thread.

Day 6:

- Office-hours pre-load.

Day 7:

- One-week check-in.

## Post-Launch Retrospective

After 14 days:

- Founding-50 conversion count.
- Time-to-first-engagement.
- Discord active rate.
- Support issue count.
- Refund count.
- Copy objections repeated by members.
- Whether public founding-1000 can open.
- Referral link usage, if enabled.
- Lifecycle email queue health.
- Office-hours readiness and first-session expected attendance.

## Public Launch Press Window

After the 14-day founding-50 window closes and public founding-1000 opens:

- Use `copy/vault-launch-press-pack.md`.
- Track outreach in `templates/vault-press-outreach-tracker.csv`.
- Do not send press until the product is live, founding-50 conversion is known, and public copy has passed brand-safety review.
- Decline any interview that requires win rate as the primary story.
