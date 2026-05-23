# Vault Member Onboarding — Day-by-Day

**Audience:** Garrett. Internal.
**Purpose:** Vault's first 14 days post-signup are the highest-leverage window for member experience. The day-by-day below specifies exactly what happens, who triggers it, and what the member sees.

**Status:** Pre-launch. Stress-tested before Day-0 cohort enters Vault on launch day.

---

## The onboarding goals

Within 14 days of joining Vault, a new member should:

1. **Have read** the methodology page + Loss Room intro + Pass List intro.
2. **Have seen** one digest + one Pass List entry + one Loss Room autopsy.
3. **Have entered** the Vault Discord at least once (login, not necessarily post).
4. **Have understood** the cancel-flow, refund policy, founding-status (if applicable).
5. **Have heard from** Garrett at least twice — welcome email + Day-7 check-in.

If those 5 happen: member is properly onboarded. If any miss: triage.

---

## Day 0 — Signup completed

**Trigger:** Stripe webhook fires on successful subscription.

**Automated within 5 minutes:**

1. Stripe creates the subscription record.
2. VaultMember record created in Galaxy DB.
3. Welcome email #1 sent (per `copy/vault-welcome-emails.md` Email 1).
4. Discord role assigned if member completes Discord linking step.
5. Discord onboarding DM sent if member joins server within 24h.

**Member sees:**

- Stripe receipt email.
- Galaxy welcome email (Garrett-signed).
- Calendar invitation for upcoming office hours (next session).
- Discord invite link (one-time use, expires 7 days).

**Member experience markers:**

- Welcome email arrives within 5 minutes.
- Stripe receipt is recognizable (Galaxy Sports Edge clear sender).
- Discord invitation works without friction (no expired links, no role-assignment failures).

**Failure modes + escalation:**

- Webhook fails → Garrett notified within 1 hour; manual provisioning per `copy/vault-member-support-playbook.md`.
- Discord invite expired → automated retry + Garrett notified.
- Welcome email bounces → check member's email on file; outreach within 24h.

---

## Day 1 — First active day

**Trigger:** Day-1 email per `copy/vault-welcome-emails.md` Email 2 (sent automatically 24h after signup).

**Member sees:**

- Email titled "Why Vault exists."
- Body covers: what Vault is, what it is not, what the next 7 days look like, and where to find the methodology.
- Links to: methodology page, Loss Room, Pass List, Discord.

**Member expected action:**

- Read the email.
- Click through to methodology + Loss Room intro at minimum.
- (Optional) Join Discord.

**Garrett action:** None. Email is automated.

---

## Day 2-3 — First content delivery

**Trigger:** First Wednesday after signup.

**Member sees:**

- Standard Vault digest delivered to their inbox.
- Digest is the same digest all Vault members receive that week.
- Digest includes: 1-2 published picks, 1-2 Pass List entries, methodology notes, occasionally a Loss Room reference.

**Garrett action:** Digest is written + sent per normal cadence.

**Failure modes + escalation:**

- New member doesn't receive digest (email routing issue, etc.) → check + resend manually.
- Digest content doesn't land (member confused, missing context) → Day-7 check-in surfaces this.

---

## Day 4 — Discord onboarding check

**Trigger:** Garrett's daily ops includes "review new-member Discord status" (per `galaxy-daily-operations-checklist.md`).

**Garrett action:**

- For any Day-0-to-Day-4 member who hasn't joined Discord: send a friendly DM via the Discord invite path.

```
Subject: Re: Vault welcome — Discord

Hey [first name],

Quick note. I noticed you're in Vault but haven't joined the Discord server yet. No pressure — some members prefer email-only — but the digest discussion + office hours mostly happen there.

If you'd like to join, here's a fresh invite link: [link]

If you've decided Discord isn't your thing, no problem. Just reply and let me know + I'll skip the next nudge.

— Garrett
```

**Member expected action:**

- Reply OR join the server.

**Garrett action follow-up:**

- If joined: roles assigned automatically.
- If reply ("skip Discord"): tag member as email-only in DB.
- If no reply: send one more nudge at Day-7; after that, treat as email-only.

---

## Day 5 — Methodology check (optional)

**Trigger:** Garrett's daily ops includes "spot-check new-member methodology engagement."

**Garrett action (informal):**

- Spot-check Mixpanel or analytics: did the member visit galaxysportsedge.com/methodology?
- If not visited by Day 5: nothing urgent; Day-7 check-in will address.

**Why this matters:**

The methodology page is the most-important piece of Galaxy context. If a member completes 30 days without reading it, that's a churn risk signal.

---

## Day 6 — Office hours invitation reminder

**Trigger:** Automated email 24h before next office hours session.

**Member sees:**

- Reminder email titled "Office hours tomorrow."
- Body: Date/time, Discord channel where it'll happen, link to the office hours playbook.

**Garrett action:** None. Automated.

---

## Day 7 — Personal check-in from Garrett

**Trigger:** Garrett's daily ops includes "Day-7 check-in for members hitting Day-7 today."

**Garrett action:**

Send a personal DM (Discord) or email (if email-only member):

```
Subject: Vault — checking in

Hey [first name],

Quick check-in on the first week.

You've had a chance to see the digest, the Pass List, and (hopefully) the Loss Room by now. A few questions:

1. Anything about Vault that's worked well for you so far?
2. Anything that's confusing or worse than expected?
3. Anything you wanted to ask about the methodology that I haven't covered?

No need for long answers — even one line is helpful. The reason I'm asking is that the first week is when I can fix things easily; later it becomes harder.

If everything's fine, just reply "all good" + that's enough signal.

— Garrett
```

**Member expected action:**

- Reply (most do).

**Garrett action follow-up:**

- Log the reply in `templates/vault-feedback-themes.csv` per `copy/vault-feedback-synthesis-protocol.md`.
- If the reply surfaces a fixable issue: address within 48h.
- If the reply is "all good": continue the standard digest cadence.

**Failure mode:**

- No reply by Day 10 → not necessarily a problem; some members are quiet. Don't push further.

---

## Day 8-13 — Standard cadence

**Trigger:** Standard Vault rhythm.

**Member sees:**

- Wednesday digest (Day 9-10).
- Office hours occurring (Day 10-11, depending on schedule).
- Whatever discussion is happening in #vault-lounge + #vault-feedback.

**Garrett action:** None member-specific. Standard ops.

---

## Day 14 — End of first 2 weeks

**Trigger:** Day-14 automated email (per `copy/vault-welcome-emails.md` Email 3).

**Member sees:**

- Email titled "Two weeks in — and a question."
- Body: Frames the first 14 days, references how to cancel + refund window, asks for any first-impression feedback.

**Member expected action:**

- Reply if they have feedback. Most don't; that's fine.
- Some members cancel here — within the 14-day refund window per `copy/vault-checkout-copy.md`.

**Garrett action:** None for non-replying members. For replying members: log feedback + respond.

---

## Day 14 + 1 — Founding-50 special touchpoint (if applicable)

**Trigger:** If member is founding-50 (number 1-50).

**Garrett action:**

Personalized DM (not template-form):

```
[Personalized opener based on what Garrett knows about the member from signup]

Two weeks in. Wanted to check in personally because you're founding-[number] — that means a lot, especially this early.

Galaxy is still figuring out its rhythm, and your feedback is shaping the product in ways the broader cohort's won't. So a few questions that are different than what I'd ask other members:

1. Where is Galaxy drifting from what made you sign up in the first place?
2. What's a Vault thing you'd quietly remove or change if I gave you the keys?
3. What did the first two weeks not deliver that you expected?

Real talk. No need to be diplomatic.

— Garrett
```

**Member expected action:**

- Substantive reply (most do).

**Garrett action follow-up:**

- Log in `templates/vault-feedback-themes.csv` with founding-50 tag.
- Pattern-check against other founding-50 feedback.
- Major themes trigger anti-spiral protocol per `founder-resilience-playbook.md`.

---

## Across the 14 days — analytics tracking

Garrett tracks (manually + via analytics) per new member:

- Did welcome email open?
- Did Day-1 email open?
- Did methodology page visit?
- Did Loss Room intro visit?
- Did digest open + read time?
- Did Discord login?
- Did Day-7 check-in reply?
- Did Day-14 email open?

Aggregate metrics published in monthly KPI ritual per `audit/kpi-operator-ritual.md`.

---

## What this onboarding deliberately doesn't do

1. **No NPS survey.** Not on Day 7. Not on Day 14. Galaxy doesn't run scheduled satisfaction surveys.

2. **No "verified buyer" badges or social proof tactics.** The welcome flow is substantive.

3. **No upsell during the first 14 days.** Members already at the highest Vault tier; nothing to push.

4. **No referral ask during the first 14 days.** Per `copy/vault-referral-program.md`, referral asks come at Day-30 minimum.

5. **No automated "did you forget to read?" emails.** Members are adults; Galaxy doesn't nag.

---

## When onboarding goes wrong

Specific signals + responses:

| Signal | Severity | Response |
|---|---|---|
| Welcome email bounces | High | Manual outreach within 24h to alternative contact path |
| Stripe charge succeeds but VaultMember record fails | Critical | Per `copy/vault-member-support-playbook.md` Scenario 1 |
| Member cancels within 14 days with negative feedback | Medium | Log; pattern-check; refund per policy |
| Member cancels within 14 days with no feedback | Low | Log; no follow-up unless they reply to cancellation email |
| Day-7 check-in surfaces methodology confusion | Medium | Garrett DMs follow-up; consider methodology page revision |
| Day-7 check-in surfaces brand-position concern | High | Anti-spiral protocol; 24h before responding |

---

## Onboarding success metrics

Healthy onboarding cohort, measured monthly:

- ≥90% Day-1 email open rate.
- ≥75% methodology page visit within 7 days.
- ≥60% Discord login within 7 days.
- ≥40% Day-7 check-in reply rate.
- ≥80% retention to Day 30 (per `audit/kpi-operator-ritual.md` benchmarks).

Cohort-level drops in any of these are tracked + investigated.

---

## Sunset trigger

If onboarding cohort metrics drop below benchmarks for 3+ consecutive months, this onboarding flow needs revision. Per `galaxy-quarterly-deep-audit-protocol.md`, the audit surfaces the metric drops + triggers a redesign.

---

## Cross-references

- Vault welcome emails (the email templates): `copy/vault-welcome-emails.md`
- Vault member support playbook: `copy/vault-member-support-playbook.md`
- Vault checkout copy: `copy/vault-checkout-copy.md`
- Vault retention check-ins: `copy/vault-retention-checkins.md`
- KPI operator ritual: `audit/kpi-operator-ritual.md`
- Feedback synthesis protocol: `copy/vault-feedback-synthesis-protocol.md`
- Founding-50 selection framework: `week-minus-1/07-founding-50-selection-framework.md`
- Galaxy daily operations checklist: `galaxy-daily-operations-checklist.md`

---

*The first 14 days set the relationship. The flow above is precise because each step is leverage. Done well: members stick. Done poorly: cancellation rates rise + the founder doesn't know why.*
