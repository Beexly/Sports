# Galaxy Vault PRD

Status: Draft
Build gate: 30 customer-development interviews validate the offer, unless runway is Scenario A

## Problem

Galaxy's most committed users need a premium layer that gives them more context, not more picks. The product must monetize trust and restraint without pressuring the model to publish more volume.

## User

Primary user:

- A serious sports bettor or sports-research buyer who distrusts tout culture.
- Already values transparency, model discipline, and loss accountability.
- Will pay for context, internal rationale, and direct access.

Secondary user:

- A power user who wants to understand Galaxy's model evolution and decision discipline.

## Product Promise

Vault members get closer to the reasoning layer behind Galaxy without changing the public model discipline.

## V1 Scope

In scope:

- Annual $200 membership
- 1,000 founding-member cap
- Vault landing page
- Payment and entitlement
- Member dashboard or gated Vault page
- Weekly internal-rationale digest archive
- Monthly office hours information and recordings
- Quarterly private data review archive
- Early Model Journal drafts
- Vault-only Discord invite
- Vault Discord channel architecture and role model per `copy/galaxy-vault-discord-channel-architecture.md`
- Discord webhook/bot role assignment for `vault-member`
- 5-email onboarding sequence after payment clears
- Day-by-day member onboarding behavior per `copy/galaxy-vault-member-onboarding-day-by-day.md`
- Retention check-ins through renewal and cancellation lifecycle
- Renewal email sequence and Year-1 renewal communications per `copy/galaxy-vault-renewal-email-sequence.md`
- Referral attribution for 10% first-year revenue share
- Referral dashboard and monthly payout review
- Office-hours recording, transcript, searchable archive, and follow-up commitments
- Founding-50 selection support using the cohort scoring framework
- Press launch tracking after the founding-50 window closes
- Founder-unavailability graceful-degradation behavior per `copy/galaxy-founder-unavailability-protocol.md`
- KPI reporting export

Out of scope:

- More picks
- Outcome-promise performance claims
- Individual betting advice
- Private one-on-one consulting
- Private API access, until V3
- Conference management, until V2 planning

## Access Rules

- Vault is above Elite.
- Vault entitlement must be separately checkable.
- Canceled users keep access through paid term unless refund policy says otherwise.
- Refund and cancellation paths must be clear.
- Founding-member cap must be enforced or visibly tracked.

## Content Model

### Weekly Internal-Rationale Digest

Fields:

- Title
- Publish date
- Author
- Week covered
- Summary
- Key decisions
- Interesting pass
- Loss/autopsy lesson, if applicable
- Model watch item
- Member-only note

### Monthly Office Hours

Fields:

- Event date
- Registration link
- Capacity
- Recording URL
- Transcript URL
- Notes
- Questions addressed
- Commitments made
- Commitments completed
- Attendance count
- Recording views within 7 days

### Quarterly Data Review

Fields:

- Quarter
- PDF URL
- Recording URL
- Summary
- Key charts
- Limitations / caveats

## Compliance Guardrails

- Do not imply returns are assured.
- Do not publish individual financial advice.
- Do not say Vault members receive better picks.
- Do not say Galaxy is AI if brand position is deterministic math.
- Do not compare competitor claims unless source-verified and reviewed.
- Referral copy must frame payouts as a modest member thank-you, not an income opportunity.
- Press copy must not lead with win rate, funding claims, or direct competitor scorekeeping.

## Success Metrics

| Metric | Target |
|---|---:|
| Month-3 paid members | 250 |
| Month-6 paid members | 500 |
| Month-12 paid members | 1,000 |
| Month-12 renewal rate | 70%+ |
| Month-6 NPS doubling trigger | 65+ |
| Office-hours live attendance | 40%+ of active members |
| Office-hours replay watched within 7 days | 80%+ |
| Referral-driven new Vault signups | 5%-25% healthy range |

## Test Cases

- New user buys Vault and receives access.
- Existing Elite user upgrades to Vault.
- Non-Vault user cannot access Vault content.
- Canceled Vault user keeps access through term.
- Referrer attribution is recorded.
- Referral click attribution uses 30-day last-click rules.
- Referral payout accrues monthly, clawbacks on refund, and awaits admin approval in V1.
- Digest publish updates member archive.
- Office hours recording is gated.
- Office hours transcript and commitment follow-ups are gated.
- Quarterly review PDF is gated.
- Retention check-ins fire on the right day, pause on cancel, and skip Day 60 when engagement is healthy.
- Founding cap behavior is correct at 999, 1,000, and 1,001 attempted signups.
- Stripe success grants Discord role.
- Stripe cancellation keeps Discord role through paid term and removes it at term end.
- Welcome email sequence pauses if member cancels.
- Discord channel permissions match `@vault-member`, `@founding-50`, and `@founding-50-advisory` roles from the channel architecture spec.
- New member experience follows the first-30-day onboarding map after checkout, Discord linking, and welcome email delivery.
- Renewal emails fire on the cadence defined in the renewal sequence, unless Vault sunset rules supersede renewal.
- During Garrett unavailability, Stripe, Discord, website, email infrastructure, and cron jobs continue automatically while Garrett-authored content pauses per the unavailability protocol.

## Source Operating Docs

- `copy/vault-landing-page.md`
- `copy/vault-welcome-emails.md`
- `copy/vault-discord-launch-pack.md`
- `copy/galaxy-vault-discord-channel-architecture.md`
- `copy/galaxy-vault-member-onboarding-day-by-day.md`
- `copy/galaxy-vault-renewal-email-sequence.md`
- `copy/galaxy-founder-unavailability-protocol.md`
- `copy/vault-office-hours-playbook.md`
- `copy/vault-referral-program.md`
- `copy/vault-retention-checkins.md`
- `copy/vault-launch-press-pack.md`
- `copy/vault-member-support-playbook.md`
- `galaxy-brand-voice-canonical.md`
- `galaxy-press-kit.md`
- `week-minus-1/07-founding-50-selection-framework.md`
- `week-minus-1/08-voice-deck-template.md`
