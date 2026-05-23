# Admin Operations Spec

Status: implementation contract

This spec captures the admin tasks Garrett needs without assuming the final app framework.

## Vault Admin

Required actions:

- Review Vault applications.
- Approve/decline/waitlist applicants.
- View founding seat list.
- Manually repair Discord role.
- Publish digest.
- Schedule office hours.
- Upload office-hours recording.
- Upload office-hours transcript.
- Mark office-hours commitments complete.
- Publish quarterly review.
- Review referral payout batch.
- Review referral clawback alerts.
- Review lifecycle email queue.
- Review retention risk list.
- Log member support notes.
- Create and resolve repair tasks.
- Tag support feedback themes.
- Export KPI metrics.

## Vault Application Review View

Fields visible:

- Name.
- Email.
- Source.
- Freeform answer.
- Referred by.
- Status.
- Review note.
- Submitted at.

Actions:

- Approve.
- Decline.
- Waitlist.
- Mark converted.

## Vault Member View

Fields visible:

- User.
- Email.
- Founding number.
- Status.
- Current period end.
- Stripe subscription.
- Discord user id.
- Discord role status.
- Referral source.
- Referral URL.
- Referral payout preference.
- Lifecycle email status.

Actions:

- Repair Discord role.
- Resend welcome email.
- Pause/resume lifecycle emails.
- View Stripe customer.
- Mark support note.
- Create repair task.
- Tag feedback theme.

## Content Admin

Digest:

- Draft.
- Preview.
- Schedule.
- Publish.
- Archive.

Office hours:

- Create event.
- Add registration link.
- Add recording.
- Add transcript.
- Add notes.
- Add commitments made.
- Mark commitments complete.

Quarterly review:

- Upload PDF.
- Add recording.
- Add summary.
- Add limitations.
- Publish.

## KPI Admin

Exports:

- CSV for monthly KPI review.
- Member count by status.
- Signups by month.
- Discord active 30d.
- Refund count.
- Cancellation count.
- Referral clicks, conversions, pending payouts, and clawbacks.
- Retention cohort list by Day 30 / 60 / 90 / 180 / 335 / 365.

## Referral Payout Review

Fields visible:

- Referrer.
- Payout period.
- Active referrals.
- Gross referred revenue.
- Accrued commission.
- Clawbacks.
- Net payout.
- Destination.
- Risk flags.

Actions:

- Approve batch.
- Hold line item.
- Forgive negative balance.
- Void referral standing with decision-log note.

## Retention Review

Fields visible:

- Member.
- Lifecycle day.
- Engagement summary.
- Next scheduled email.
- Cancellation status.
- Latest support note.

Actions:

- Preview email.
- Skip one email.
- Pause all lifecycle emails.
- Mark manual follow-up needed.

## Support Operations

Support playbook source: `copy/vault-member-support-playbook.md`.

Fields visible:

- Member.
- Issue type.
- Priority.
- Received at.
- Response deadline.
- Current status.
- Related Stripe event.
- Related Discord role state.
- Latest support note.
- Feedback theme.

Actions:

- Add support note.
- Send or copy response template.
- Create repair task.
- Mark repair complete.
- Escalate to Garrett/legal/compliance.

V1 can be a lightweight admin note field plus repair-task list. The important rule is that access, billing, refund, and compliance issues do not live only in Garrett's memory.

## Permissions

Minimum roles:

- Admin: all actions.
- Editor: content publish actions only.
- Support: member lookup and resend/repair actions, no financial changes.

V1 can have only Admin if Garrett is sole operator, but the role boundary should be documented for future hires.
