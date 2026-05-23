# Galaxy Founder Unavailability Protocol

**Audience:** Garrett. Internal.
**Purpose:** Galaxy is single-operator-led. Garrett's unavailability (illness, family emergency, deliberate disconnect) creates operational risk. The protocol below specifies what continues to operate, what pauses cleanly, and how members are communicated with.

**Status:** Applies to absences >24 hours. <24h absences are absorbed by normal cadence.

---

## The categories of unavailability

| Category | Trigger | Member-facing communication |
|---|---|---|
| Planned vacation / disconnect | Garrett pre-schedules | Yes, in advance |
| Brief illness (≤3 days) | Garrett unwell | Brief if needed; usually absorbed |
| Extended illness (>3 days) | Garrett unwell, recovery uncertain | Yes, within 48 hours of trigger |
| Family emergency | Garrett unavailable due to family situation | Yes, within 24-48 hours |
| Mental health pause | Garrett deliberately disconnecting | Yes, framed honestly |
| Catastrophic | Garrett unable to operate Galaxy at all | Per `galaxy-business-continuity-plan.md` |

---

## What continues automatically (regardless of category)

Per the operational architecture in `product/vault-prd.md`:

- **Stripe** continues processing subscriptions + handling renewals.
- **Discord** server continues to function (members can post, react, search).
- **Website** continues to display methodology, Loss Room, Pass List archive.
- **Email infrastructure** continues to deliver scheduled communications.
- **Cron-scheduled jobs** continue to run (factor model updates, calibration tracking).

What stops:

- **Wednesday digest** — requires Garrett's writing. Cannot be automated.
- **Pass List entries** — same.
- **Loss Room autopsies** — same.
- **Office hours** — same.
- **Member support edge cases** — same.
- **Twitter posting** — same.
- **#vault-feedback responses** — same.
- **Calling new picks** — same.

---

## Category 1: Planned vacation / disconnect

### Pre-trigger (1-4 weeks before)

Garrett pre-schedules the absence:
- Personal calendar block.
- Notify Codex if engineering changes are expected.
- Identify the unavailable window + return date.

### Member communication (1 week before)

Email + Vault Discord announcement:

```
Subject: Brief Galaxy pause — [dates]

Hey [first name],

Heads up: Galaxy is taking a brief pause from [start date] through [end date]. ~[N] days off the regular cadence.

What this means for Vault:
- No Wednesday digest during the pause (the [date] digest is skipped; next digest is [date]).
- No new Pass List entries or Loss Room autopsies during the pause.
- No office hours during the pause (the [month] session moves to [new date]).
- Discord stays open; members continue to talk, but my replies pause.

What stays running:
- Stripe + subscriptions continue normally.
- Methodology page + Loss Room + Pass List archive remain accessible.
- The factor model continues to update behind the scenes.

I'll be back on [date] + the next digest will land [date].

— Garrett
```

### During the absence

Garrett does NOT check email, Discord, or Twitter daily. Discipline of restoration is important.

Critical-only alerts (per `galaxy-business-continuity-plan.md`):
- Stripe outage.
- Discord server-level issue.
- Account-compromise signal.

Anything else: hold until return.

### Post-return

Resume normal cadence. Don't write a "Vault is back" announcement unless the absence was longer than 10 days. The digest landing on schedule is the announcement.

---

## Category 2: Brief illness (≤3 days)

### No member-facing communication if the illness fits within normal cadence breaks

If Garrett is unwell for 24-72 hours and:
- It doesn't impact a digest delivery,
- It doesn't impact a scheduled office hours,
- It doesn't impact a Loss Room or Pass List entry that had already been promised,

→ No communication needed. Quiet recovery.

### Brief communication if the illness impacts something promised

If Garrett misses a Wednesday digest due to illness:

```
Subject: Quick note — digest delayed

Hey [first name],

Quick note. I'm under the weather + the digest is delayed. It'll land Thursday [date] instead of today.

Everything else continues normally.

— Garrett
```

Short, honest, no over-explanation.

---

## Category 3: Extended illness (>3 days)

### Member communication (within 48 hours of becoming certain)

```
Subject: A note on the Vault cadence

Hey [first name],

Quick note. I've been dealing with a [health issue / illness] over the past few days, and recovery is going to take a bit longer than I initially expected.

Practically:
- The digest is paused until [estimated return date]. The factor model continues updating; the writing is the bottleneck.
- Office hours [this month / this week] is canceled; I'll reschedule when I'm back at full capacity.
- Discord stays open; members continue to talk among themselves. My replies pause during recovery.
- Pass List + Loss Room entries are paused.

If the timeline shifts, I'll send another note. I'd rather be honest about the pace than promise content I can't deliver.

If something urgent comes up that affects your subscription (Stripe issue, account compromise, refund request), email me directly + I'll address it.

— Garrett
```

### Post-return

A brief "back" note in the next Wednesday digest:

```
A note to start: I'm back at full pace. The pause is over; the cadence resumes.

[Standard digest content follows.]
```

No detailed health disclosure. No request for sympathy. Honest acknowledgment + back to work.

---

## Category 4: Family emergency

### Member communication (within 24-48 hours)

```
Subject: Pausing Galaxy briefly

Hey [first name],

Quick note. There's a family situation that needs my attention over the next [estimated window]. Galaxy's cadence is paused during that time.

I won't go into the details; some family things stay private. I'll be back when I'm back. The current estimate is [return date], but I may revise if needed.

What continues running:
- Subscriptions, Stripe, website.
- Discord stays open.
- Methodology, Loss Room, Pass List archive accessible.

What pauses:
- Digest writing.
- Pass List + Loss Room entries.
- Office hours.
- My personal replies in Discord + email.

The community + the documentation hold up while I'm out. I appreciate the patience.

— Garrett
```

### Why this email shape

- Acknowledges the absence + the cause without disclosing details.
- Frames the pause as time-limited (with honest uncertainty about timing).
- Maintains the operational structure (what continues vs pauses).
- Asks for patience without dramatizing.

### Member responses

Most members will reply with supportive messages. Garrett doesn't need to respond to every one; a single acknowledgment in the next digest is sufficient.

A few members may push for refund. Per `copy/vault-member-support-playbook.md` Scenario 2, prorated refund is offered if the absence exceeds 14 days.

---

## Category 5: Mental health pause

### Member communication (within 48 hours)

```
Subject: A note on Galaxy + a brief pause

Hey [first name],

Honest note. I'm taking a brief pause from Galaxy to recharge mentally. ~[N] days, returning [date].

The reasoning: Galaxy is a single-operator business + my output is the product. Running on fumes produces lower-quality content + worse decisions. Stepping back briefly to come back better is operating discipline, not weakness.

What's paused: same as a planned vacation — digests, Pass List, Loss Room, office hours, my Discord replies.

What continues: subscriptions, the website, the methodology.

I'll be back on [date]. Standard digest will land on [date+~7 days].

— Garrett
```

### Why this email shape

- Honest framing without performance.
- Positions the pause as discipline, not crisis.
- Treats members as adults who understand single-operator dynamics.

### Cross-reference

Per `founder-resilience-playbook.md` § "Year-end reflection" + "Anti-spiral protocol", mental health pauses are part of the operating mode. The member-communication template above operationalizes the public-facing version.

---

## Category 6: Catastrophic (Garrett unable to operate Galaxy)

### Trigger

Galaxy can't be operated at all. Garrett is incapacitated, hospitalized, or otherwise unable to run the platform.

### Response

Per `galaxy-business-continuity-plan.md`:

1. **Designated emergency contact** (per the business continuity plan) takes operational control.
2. **Lawyer engaged** within 24 hours if Garrett's incapacity is medical or legal.
3. **Member communication** sent within 48 hours per the catastrophic template in the BCP.

### Member communication (catastrophic scenario)

```
Subject: An important update from Galaxy

Hi [first name],

This is [emergency-contact-name], reaching out on behalf of Garrett.

Galaxy is paused due to circumstances affecting Garrett's ability to operate the platform. We're working through the situation; here's what's true:

1. **Your Vault subscription is paused, not cancelled.** Stripe will not charge you while we sort out the path forward.

2. **Your access continues** to the methodology page, Loss Room archive, and Pass List archive at galaxysportsedge.com.

3. **The Vault Discord is read-only** until further notice; members can still see archived content.

4. **We will communicate again within 7-14 days** with a clearer picture of what comes next.

We appreciate the patience. Galaxy is bigger than any single moment, and we're working to honor what Garrett built.

— [Emergency contact name]
[Title / role]
```

### What this scenario demands

Per `galaxy-business-continuity-plan.md`, the catastrophic protocol requires:
- Stripe access via emergency contact.
- Discord admin permissions held by emergency contact (with revocation if unused after a window).
- Lawyer engagement for any decision affecting member subscriptions.
- Refund policy clarification if Galaxy permanently shuts down.

---

## Operational tracking during all absences

Maintain a single absence log:

```
date,category,duration,communication_sent,member_responses,issues_arising,return_date
2026-XX-XX,planned_vacation,5 days,Yes (1 week before),12 supportive replies,None,2026-XX-XX
2026-XX-XX,brief_illness,2 days,No,N/A,None,2026-XX-XX
```

Logged in `templates/absences.csv`.

---

## What happens with the daily ops checklist

Per `galaxy-daily-operations-checklist.md`, daily ops include several Garrett-only tasks (digest review, feedback channel check, etc.).

During absences, the checklist pauses entirely. There is no "delegate to someone" version of the daily ops in V1 (single-operator).

In V2 (community manager hire), the daily ops checklist forks:
- Garrett-required tasks pause.
- Community-manager-required tasks continue.

The fork is documented in `galaxy-year-1-knowledge-base.md` § "Decision rights" + `galaxy-team-of-one-templates.md`.

---

## Re-entry protocol

After any absence longer than 5 days:

**Day 1 of return:**
- Read all #vault-feedback since the absence.
- Read all DMs since the absence.
- Read email replies since the absence.
- Scan #vault-lounge for thread shape (not full read).

**Day 2 of return:**
- Respond to any urgent member support tickets.
- Write the catching-up digest.
- Schedule office hours catch-up if needed.

**Day 3 of return:**
- Resume normal cadence.

The 3-day buffer prevents return-from-absence over-correction (responding to too much, too fast, creating worse signal).

---

## What this protocol deliberately doesn't do

1. **Doesn't promise specific return dates with certainty.** Health + family don't have predictable timelines.

2. **Doesn't quote sympathy responses.** Garrett doesn't post screenshots of member support during recovery.

3. **Doesn't request prayers or social-media support.** Galaxy keeps personal-emotional communication restrained.

4. **Doesn't offer "guaranteed" digest catch-up.** If absence skips a digest, the digest is skipped; the next digest is the next digest.

5. **Doesn't accept the "we should hire more people now" reaction.** Single-operator structure is intentional; absences don't change the structure.

---

## Cross-references

- Business continuity plan (catastrophic protocol): `galaxy-business-continuity-plan.md`
- Founder resilience playbook (operational philosophy): `founder-resilience-playbook.md`
- Vault member support playbook (refund scenarios): `copy/vault-member-support-playbook.md`
- Galaxy daily operations checklist: `galaxy-daily-operations-checklist.md`
- Team of one templates: `galaxy-team-of-one-templates.md`
- Crisis communications playbook: `galaxy-crisis-communications-playbook.md`
- Year-1 knowledge base (new hire context): `copy/galaxy-year-1-knowledge-base.md`
- Galaxy AI policy: `galaxy-ai-policy.md`

---

*Single-operator businesses are fragile around the operator's availability. The protocol above turns the absence into an operating mode rather than a crisis. Honest communication; restraint over performance; the operational structure holds.*
