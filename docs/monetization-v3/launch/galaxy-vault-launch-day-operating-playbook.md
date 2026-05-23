# Vault Launch Day — Operating Playbook

**Audience:** Garrett. Internal.
**Purpose:** Vault's public founding-1000 launch day is the highest-stakes operational day in Year-1. The hour-by-hour playbook below specifies what Garrett does, when, and what to watch for after the founding-50 window has closed.

**Status:** Pre-launch artifact for public launch day. Final version updated 24 hours before public launch.

---

## Pre-launch prerequisites

Before the playbook fires, confirm the pre-launch checklist is complete per `launch/vault-pre-launch-checklist.md`:

- [ ] Stripe webhook live + tested.
- [ ] Vault Discord server live + bot configured.
- [ ] Methodology page + Loss Room + Pass List archive deployed.
- [ ] Welcome email template + welcome flow tested with a test purchase.
- [ ] Founding-50 window closed, or explicitly bypassed by decision-log entry.
- [ ] Twitter launch thread drafted + scheduled.
- [ ] Press outreach pack ready for tier-1 outlets.
- [ ] Daily operations checklist printed for the day.
- [ ] Emergency contact briefed on the launch day in case of catastrophic issue.
- [ ] All cross-references in `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` validated.

If any item isn't ready: defer launch. The brand-position cost of a botched launch is higher than the cost of waiting a week.

---

## The 36 hours before launch

### T-36h (e.g., Sunday evening before Monday launch)

- [ ] Final review of all welcome emails (open in email client, check link rendering).
- [ ] Final review of methodology page, Loss Room intro, Pass List intro.
- [ ] Final review of Stripe configuration (price, subscription, webhook URLs).
- [ ] Personal time. No new work after 8pm.

### T-24h

- [ ] Morning peak block: write Day-1 welcome email if not already written. Final review.
- [ ] Test the full customer flow: signup → Stripe → welcome email → Discord invite → role assignment.
- [ ] If anything fails: triage immediately. Don't launch with broken pipes.
- [ ] Briefing call (if applicable) with PR consultant or BD contact.
- [ ] Personal time. No new work after 6pm. Restful sleep is the constraint.

### T-12h (evening before launch)

- [ ] Final dry-run of customer flow.
- [ ] Confirm Twitter thread is scheduled.
- [ ] Confirm press email drafts are ready to send Tuesday morning.
- [ ] Stop reading Twitter, news, Discord. Mental hygiene before launch.

---

## Launch day — hour-by-hour

### Time zone reference

All times are operator-local time. Adjust as needed for Garrett's actual schedule.

### T-2 hours (e.g., 06:00 local before 08:00 launch)

- [ ] Wake. Coffee. Routine.
- [ ] Verify Stripe + Discord + website are healthy (dashboard checks).
- [ ] Verify scheduled Twitter thread is queued.
- [ ] Confirm welcome email template is loaded + sender is configured.
- [ ] Personal centering. Per `founder-resilience-playbook.md` § "Morning of high-stakes days," 10 minutes of quiet before the day starts.

### T-30 minutes

- [ ] Open the Stripe dashboard, Discord admin panel, Vault Discord, Twitter, and email tabs.
- [ ] Quick check on the Twitter thread schedule.
- [ ] Quick check on Stripe webhook health.
- [ ] Notify any operational support (Codex if applicable) that launch is firing.

### T-0 (launch moment)

- [ ] Manually publish the Twitter launch thread per `copy/galaxy-twitter-launch-thread.md`.
- [ ] Send press launch emails per `copy/vault-launch-press-pack.md` only if the press cycle has been approved for this launch window.
- [ ] Confirm no founding-50 invitation emails are queued; that window already closed.
- [ ] Toggle Vault landing page to "live" state (if applicable).
- [ ] Vault checkout becomes accessible at galaxysportsedge.com/vault.

### T+15 minutes

- [ ] First members likely signing up. Check Stripe dashboard for first transactions.
- [ ] Spot-check a webhook delivery + welcome email send.
- [ ] Monitor #vault-feedback for any reported issues.
- [ ] Twitter monitoring — but don't engage yet. The launch thread is the message.

### T+30 minutes

- [ ] Check member count in Stripe.
- [ ] Verify all welcome emails landed (no bounce backs).
- [ ] Check Discord role assignments for the first cohort.
- [ ] If any operational issue surfaces: log + triage. Don't post about issues unless they're affecting members.

### T+1 hour

- [ ] First public response time. If Twitter is showing engagement, allow controlled replies to substantive questions per `copy/galaxy-twitter-content-discipline.md`.
- [ ] Discord: welcome the first 10-20 new public-launch members personally if they're in #vault-lounge.
- [ ] Check press outreach for responses (some outlets reply within an hour).

### T+2 hours

- [ ] Continue public-launch member welcomes in Discord.
- [ ] Spot-check the customer flow with the first 50+ signups: are welcome emails landing? Discord roles assigning? Any pattern of failure?
- [ ] Quick Twitter sentiment check. If trending negative early: per `copy/galaxy-twitter-incident-response-protocol.md`, 24-hour buffer holds even on launch day.

### T+4 hours

- [ ] Lunch break. 30 minutes of stepping away. The launch will continue without active monitoring.
- [ ] When returning: review Stripe + member count + Discord + Twitter sentiment.
- [ ] Update public-launch welcome cadence if many members joined.

### T+6 hours

- [ ] Mid-afternoon check. Most launches see a slowdown in signups after the initial surge.
- [ ] Personal acknowledgment in Discord to high-signal members who joined.
- [ ] First office hours scheduled within next 2 weeks (if not already on calendar).

### T+8 hours

- [ ] End-of-launch-day operational summary:
  - Member count at launch end.
  - Twitter thread engagement.
  - Press response count.
  - Any operational incidents (Stripe, Discord, email).
  - Any member feedback patterns.

### T+8 hours +1 hour

- [ ] Stop active monitoring. The day is over.
- [ ] Quick journal entry: what worked, what didn't, what surprised you.
- [ ] Tomorrow's day-after playbook is in T+24 hours notes.
- [ ] Personal time. No work after this.

---

## What to watch for during the launch

### Signal: public launch conversion is materially below plan

If public launch signups are materially below the plan scenario by T+4 hours: investigate. The first four hours do not decide the product, but they reveal whether the public launch surface is creating friction.

Action: inspect checkout completion, webhook health, landing-page analytics, and inbound questions. Do not change pricing or copy on launch day unless a technical or factual error is present.

### Signal: Twitter thread doesn't gain traction

If the launch thread has <500 impressions by T+2 hours: the launch is happening but the audience signal is muted.

Action: don't add unscheduled tweets. The launch thread is the launch communication. Pressing for engagement compromises the brand position.

### Signal: Press outreach gets immediate "we want to cover this" response

If any tier-1 outlet responds within 4 hours wanting to cover Galaxy: this is a significant signal. Schedule the interview for the following week — not the same day.

Action: respond with appreciation + propose a specific time. Don't agree to interview the same day as launch.

### Signal: Discord conversations are substantive

If members are talking to each other substantively (not just "hi from founding-N!"): the community is forming. This is the leading indicator of Year-1 success.

Action: participate lightly. Don't dominate. Let members lead.

### Signal: Cancel-flow fires within the first 24 hours

If members signup and cancel within hours: each one gets a personalized outreach per `copy/vault-member-support-playbook.md` Scenario 4. Understand the reason before assuming.

Action: don't reactively change anything. Document the cancellation reasons.

### Signal: Operational issue (Stripe, Discord, email)

If any operational issue surfaces:

1. Stop new sales (if Stripe is broken).
2. Triage the issue.
3. Communicate to affected members within 24 hours per `copy/vault-member-support-playbook.md`.
4. Don't pretend the issue didn't happen.

---

## What NOT to do on launch day

1. **Don't add unscheduled tweets to chase engagement.** The launch thread is the message.

2. **Don't engage in adversarial Twitter exchanges.** The 24-hour buffer holds.

3. **Don't announce "thank you for X signups" pop-ups or banners.** Brand-position violation.

4. **Don't post member quotes or screenshots without permission.** Per `copy/galaxy-member-testimonial-policy.md`.

5. **Don't make pricing changes on launch day.** The price is the price.

6. **Don't add new features or surfaces on launch day.** The launch is the surfaces that exist.

7. **Don't drink to celebrate or commiserate. The day continues.** Personal regulation matters.

8. **Don't message every member who joins.** Discord auto-welcome + selective personal welcomes are enough.

9. **Don't check member growth metrics every 10 minutes.** Hourly checks are sufficient.

10. **Don't push the launch to a different time. The launch is the launch.** Deferring after T+0 confuses members.

---

## The day after (T+24 hours)

The day after launch is when the operational reality sets in. The playbook for T+24h:

- [ ] Morning peak block (09:00-11:00): standard ops resume.
- [ ] Review launch day results.
- [ ] Send personal follow-up to high-signal members who joined or asked substantive questions.
- [ ] Send press follow-up to outlets that responded.
- [ ] Begin the Day-1 of standard onboarding flow per `copy/galaxy-vault-member-onboarding-day-by-day.md`.
- [ ] Update the daily ops checklist for the rest of Week-1.

---

## If something catastrophic happens

If launch day surfaces a catastrophic issue (Stripe outage at scale, Discord server-level failure, member data exposure):

Per `galaxy-crisis-communications-playbook.md`:

1. Assess severity (15 minutes maximum).
2. Decide whether to halt new sales.
3. Communicate to affected members within 4 hours.
4. Engage the appropriate vendor (Stripe, Discord, lawyer if needed).
5. Document the incident.

The brand position holds. Honest acknowledgment + remediation > silent damage control.

---

## What success looks like on launch day

A successful Vault launch day produces:

- Founding-50 conversion already documented before launch day.
- 150-250 total Vault members by launch-day end, depending on plan scenario A vs B.
- No operational failure that compromised member experience.
- No member reports of brand-position drift.
- Twitter thread engaged within expected range (no viral spike, no flop).
- 1-3 press responses initiated.
- At least one member-to-member substantive Discord conversation in #vault-lounge.

If 6-7 of these are met: launch was successful.

If <4 of these are met: launch was concerning. Investigate during the post-launch retrospective.

---

## Post-launch retrospective (T+72 hours)

72 hours after launch, conduct a brief retrospective:

- What worked?
- What didn't?
- What surprised you?
- What's the Year-1 trajectory likely to look like based on launch?
- What changes does the daily ops checklist need based on actual experience?

The retrospective informs the first weekly retrospective + the Month-3 KPI ritual.

---

## Cross-references

- Vault pre-launch checklist: `launch/vault-pre-launch-checklist.md`
- Vault first-90-day runbook: `launch/vault-first-90-day-runbook.md`
- Vault member support playbook: `copy/vault-member-support-playbook.md`
- Vault welcome emails: `copy/vault-welcome-emails.md`
- Galaxy Twitter launch thread: `copy/galaxy-twitter-launch-thread.md`
- Galaxy Twitter incident response protocol: `copy/galaxy-twitter-incident-response-protocol.md`
- Vault launch press pack: `copy/vault-launch-press-pack.md`
- Founding-50 invitation email templates (private window, already closed before this playbook): `copy/vault-founding50-invitation-email-templates.md`
- Vault member onboarding day-by-day: `copy/galaxy-vault-member-onboarding-day-by-day.md`
- Galaxy crisis communications playbook: `galaxy-crisis-communications-playbook.md`
- Founder resilience playbook: `founder-resilience-playbook.md`
- Galaxy daily operations checklist: `galaxy-daily-operations-checklist.md`
- Galaxy member testimonial policy: `copy/galaxy-member-testimonial-policy.md`

---

*Launch day is one day. The discipline above sequences it so the brand position holds across the highest-stakes moment in Year-1. Operate the playbook; don't improvise. The day's success enables the year's compounding.*
