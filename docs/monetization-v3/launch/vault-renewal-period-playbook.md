# Vault Renewal Period Playbook (Months 11-12)

**Audience:** Garrett. Internal.
**Scope:** Operating discipline for the founding-1000's renewal window — Days 305 through 365 of each member's subscription.
**Why this matters:** Renewal rate is the month-12 kill criterion (70% threshold). The renewal period is the highest-stakes 60 days of Vault's first year.

---

## What members experience in months 11-12

The retention check-ins (per `copy/vault-retention-checkins.md`) fire at:
- Day 30 (one-month-in)
- Day 60 conditional (engagement-gated)
- Day 90 (three-months-in + Almanac favor ask)
- Day 180 (six-months-in honest pushback)
- Day 335 (renewal pre-warning, 30 days before renewal)
- Day 365 (anniversary)

Day 335 + Day 365 are the renewal-period communications.

---

## What Garrett does in months 11-12

### Day 305-315 (40-50 days before renewal)

- [ ] Run a member-by-member health audit. For each active Vault member, classify:
  - **Strong renewal candidate** (engaged in Discord ≥1x/month + opened ≥75% of digests + attended ≥1 office hours)
  - **Likely renewal candidate** (engaged moderately)
  - **At-risk** (low engagement, hasn't posted in 60+ days, low digest open rate)
  - **Will not renew** (already canceled or signaled cancellation)

- [ ] For at-risk members: identify if there's anything Galaxy could do that's brand-aligned (no extraordinary saves; just one personal touch).

- [ ] Update the renewal forecast: project month-12 renewal rate based on current engagement signals.

### Day 315-325

- [ ] Personal email to top-20 founding-50 members. NOT a renewal pitch. A genuine check-in:

```
Subject: 11 months in.

Hey [first name],

Quick note from me. You're one of the founding-50 members and you've been in Vault for almost a year. Wanted to drop a line that isn't about anything specific.

How is Vault landing for you? Specifically: anything you're getting out of it that I haven't surfaced, or anything you're not getting that I should know?

No pitch, no renewal pressure. Just a 11-month check-in from the founder.

— G
```

This email is sent over ~5 days to 20 specific members (not the whole founding-50). Personalized. Brand-aligned.

### Day 335 (30 days before each member's renewal)

The Day-335 email from `copy/vault-retention-checkins.md` auto-fires:

```
Subject: Heads-up — your Vault renewal is in 30 days.
```

This email is informational. No upsell. No urgency. Just transparent.

### Days 336-355 (member decision period)

- [ ] Monitor Stripe Customer Portal for any cancellation requests.
- [ ] Monitor inbox for any "I'm not sure if I'll renew" emails.
- [ ] Respond same-day to renewal-related emails. Brand-aligned: no save tactics, no special offers, no "but wait..." pitches.

For members who write "thinking about not renewing":

```
Hey [first name],

Heard you. Three options, you pick:

1. Renew as planned — nothing changes; your year-2 access continues.
2. Skip year-2 — let the renewal lapse; access ends at term-end as scheduled.
3. Take a break — I can pause the subscription for up to 60 days post-term-end with credit applied if you decide to return.

Whichever fits. If it's option 2 or 3 and there's a specific reason that would inform how I run Vault, I'd value the read.

— G
```

This response is intentionally non-persuasive. The brand position says: respect the member's decision; don't fight it.

### Day 365 (renewal day)

- Stripe processes the auto-renewal charge.
- The Day-365 anniversary email from `copy/vault-retention-checkins.md` auto-fires.

Garrett doesn't need to do anything proactive on Day 365 unless something goes wrong:

- Failed renewal charge → handle per `copy/vault-member-support-playbook.md` Scenario 1 (declined card).
- Surprise cancellation → handle per the cancel-flow message in retention check-ins.

### Day 366-370 (post-renewal stabilization)

- [ ] Compute actual month-12 renewal rate from Stripe data.
- [ ] Compare to forecast from Day 305-315.
- [ ] Note discrepancies in monthly KPI ritual (last Friday of month 12).

---

## The renewal-rate KPI gate

The month-12 KPI gate (per `04-kpi-decision-rules.md`):

- **≥70% renewal rate:** Vault continues into Year 2. V2 planning (cap-lift, conference, etc.) begins.
- **<70% renewal rate:** Vault sunsets per `launch/vault-sunset-playbook.md` Scenario C.

The override protocol applies. Garrett can override the 70% threshold once if there's a structural reason (e.g., a known one-time event drove churn that's not representative of the broader trend). The override requires a decision-log entry per `04-kpi-decision-rules.md` § "Owner-Override Protocol."

### Anti-rationalization rule

Specific to the renewal-rate decision:

- Did the renewal-period communications follow this playbook?
- Did any member feedback surface specific brand-position issues Galaxy could fix?
- Is the renewal rate trending down (worse), flat (stable), or up (recovering)?

If the answer to question 3 is "down" — the decision is sunset. Don't override.

If "flat" — investigate before deciding. The override is plausible but the bar is high.

If "up" — likely continue. The override may be appropriate if the trajectory is positive.

---

## What Galaxy does NOT do during the renewal period

1. **No "renewal sale."** Galaxy doesn't run a discount during renewal. The price is the price.

2. **No founding-rate bait-and-switch.** Founding members keep their founding rate forever. No "upgrade to Vault Plus for $X more" at renewal.

3. **No high-pressure save tactics.** No "We've extended your renewal — please call to discuss!" Galaxy lets members leave gracefully.

4. **No mass-email renewal nag.** The Day-335 email is the only proactive renewal communication. No follow-up reminder series.

5. **No retention discount.** Members who consider canceling don't get a "Stay for 50% off!" offer. The brand position rejects this.

6. **No "your spot will be given to the waitlist" pressure.** Even if the waitlist exists, Galaxy doesn't use it to pressure renewals.

7. **No win-back campaigns during the renewal window.** Past-cancellation re-engagement happens at Day-90-after-cancel per the re-engagement template — not during the renewal window itself.

---

## What Garrett's brand position requires during the renewal period

The renewal period tests whether Galaxy operates with discipline under commercial pressure. The temptations:

- Lower the price to retain.
- Add features to retain.
- Pressure members emotionally to renew.
- Discount the renewal for the founding-50 specifically.

All of these are brand-position violations. Resist.

What Galaxy does instead:

- Sends the Day-335 transparency email.
- Sends the Day-365 anniversary email.
- Responds honestly to any renewal-related inquiry.
- Lets the renewal rate be what it is.

If the renewal rate is below threshold: sunset per `launch/vault-sunset-playbook.md`. Galaxy's brand position requires this.

---

## Year-2 V2 cap-lift considerations (only if renewal rate ≥70%)

If Vault makes it through to Year 2:

- **The 1,000-member cap lifts to 5,000** (per master plan v3).
- **The Year-2 cohort is recruited from the public Galaxy waitlist** (per public sunset/cap-reach mechanic).
- **Office hours splits into multiple sessions** (one Tuesday for original founding-1000; one alternate time for the new cohort).
- **The annual Vault Conference launches** (per master plan v3).

V2 planning starts at month 9-10 if the trajectory looks positive. Garrett doesn't commit until month 12 + actual renewal rate data.

---

## Tracking renewal-period operations

In `templates/renewal-tracking.csv`:

```
member_id,founding_status,subscription_start,renewal_date,renewal_status,member_feedback,renewal_decision
[ID],founding-50,2026-XX-XX,2027-XX-XX,renewed,"loves digest format, would extend office hours",renewed_at_$200
[ID],founding-1000,2026-XX-XX,2027-XX-XX,canceled,"too narrow sport coverage",canceled_at_term-end
```

The tracking sheet feeds into the month-12 KPI ritual decision.

---

## Cross-references

- Retention check-ins (Day 335 + Day 365 templates): `copy/vault-retention-checkins.md`
- Sunset playbook (if renewal rate <70%): `launch/vault-sunset-playbook.md`
- KPI decision rules: `04-kpi-decision-rules.md`
- KPI operator ritual: `audit/kpi-operator-ritual.md`
- Member support playbook (renewal-related inquiries): `copy/vault-member-support-playbook.md`
- 90-day operating runbook (context for ongoing operations): `launch/vault-first-90-day-runbook.md`

---

*The renewal period is when Galaxy's discipline is tested most directly. The discipline holds Year 2 alive; the discipline broken sunsets Vault. Run the playbook honestly.*
