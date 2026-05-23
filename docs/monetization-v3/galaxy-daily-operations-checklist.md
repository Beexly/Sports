# Galaxy Daily Operations Checklist

**Audience:** Garrett. Daily 6:00-9:00 AM routine before peak work blocks begin.

**Why this exists:** A single-operator company depends on the operator's daily discipline. The checklist below codifies the first 60 minutes of each weekday so the high-leverage 09:00-11:00 peak block isn't compromised by reactive cleanup.

**Total time:** ~45 minutes per day. Shorter on Saturdays + Sundays.

---

## The daily flow

### Step 1 — Production health (10 minutes)

Open the admin cockpit. Check:

- [ ] Site uptime over the prior 24 hours (any incidents flagged?)
- [ ] Stripe webhook reliability (any failed events? duplicate charges?)
- [ ] Discord bot health (any failed role assignments overnight?)
- [ ] Vault subscription metrics (new sign-ups, cancellations, refunds in last 24h)
- [ ] Email delivery (any bounces or spam-flag patterns?)
- [ ] Loss Room queue (any settled losses awaiting autopsy publication?)
- [ ] Pass List queue (any passes from yesterday awaiting publication?)

**If any item is amber/red:** investigate before continuing with the rest of the morning. Production health is the floor.

**If all green:** move to Step 2.

This is a 10-minute scan, not a deep dive. Issues that need investigation go on the priority list; routine status stays in the cockpit log.

---

### Step 2 — Member feedback scan (10 minutes)

Open three channels in sequence:

#### 2a. Vault Discord (#vault-feedback) — 4 minutes

Read every unreplied message. For each:
- [ ] Categorize: substantive critique / suggestion / question / non-substantive
- [ ] If substantive critique: log in `templates/critique-log.md` per `founder-resilience-playbook.md`
- [ ] If a quick reply is appropriate, draft in the Discord composer but don't send yet (response goes in 11:00-12:00 reactive block)

#### 2b. Vault Discord (#vault-lounge) — 3 minutes

Scan the threads. Note:
- [ ] Any thread that's gone off-brand (tout-trading, hot takes, hostility)? Flag for moderation per `copy/vault-discord-launch-pack.md`.
- [ ] Any thread Garrett should respond to today (digest discussion, methodology question)? Note for the 11:00-12:00 reactive block.

#### 2c. Email inbox — 3 minutes

Skim the inbox. For each new message:
- [ ] Categorize per `copy/vault-member-support-playbook.md`:
  - Billing issue → priority list, response today
  - Access issue → priority list, response within 4 hours
  - Content question → response within 1-2 business days
  - Refund request → acknowledge same day
  - Press inquiry → 24-hour response per `galaxy-press-kit.md`
  - Partner outreach → 48-hour response per `galaxy-contractor-playbook.md`
  - Routine/non-urgent → batch with other reactive work

Don't reply yet. The reply block is 11:00-12:00.

---

### Step 3 — Yesterday's publications review (5 minutes)

Open the Ledger. Check yesterday's settled publications:

- [ ] How many publications settled?
- [ ] Hit rate against confidence band (rough calibration check)?
- [ ] Any unexpected outcomes worth surfacing in the digest or Model Journal?

If a high-confidence call (≥70%) lost: queue the autopsy for the day's peak block.

If a low-confidence pass would have hit at unusually-high rate: note for next Model Journal.

Don't autopsy yet. This step is observation, not work. Autopsy work happens in Step 5 if needed.

---

### Step 4 — Today's calendar awareness (5 minutes)

Open the calendar. Look at today + tomorrow:

- [ ] Any external meetings today (partner call, press interview)? Reconfirm.
- [ ] Any office hours today (second Tuesdays at 8pm)? Mental note + ensure Tuesday afternoon prep is on track.
- [ ] Any digest due today (Tuesdays + Wednesdays specifically)? Ensure first draft is in progress.
- [ ] Any deadlines for Almanac production (October-December specifically)? Verify on track.
- [ ] Last Friday of month? KPI ritual block (per `audit/kpi-operator-ritual.md`).

If today is unusually heavy: identify the one peak-block deliverable that cannot slip. Everything else negotiates.

---

### Step 5 — The day's peak-block target (5 minutes)

Decide the one thing that's the day's peak-block output. Examples:

- Monday: draft of Wednesday's digest, first half.
- Tuesday: complete Wednesday's digest. Office-hours prep if 2nd Tuesday.
- Wednesday: digest publishes; afternoon goes to depth (methodology / autopsy / Almanac).
- Thursday: Almanac essay work OR autopsy for yesterday's loss.
- Friday: weekly retrospective; last Friday of month adds KPI ritual.
- Saturday: OFF.
- Sunday: Saturday Model Journal draft → Vault Discord preview.

Write the day's peak target in a 1-line note in your daily journal:

```
[Date] — Peak target: [specific deliverable]
```

This single line is the day's discipline. Everything else in the calendar negotiates around this.

---

### Step 6 — Quick wins (5 minutes)

Knock out 2-3 lightweight items that take <90 seconds each:

- [ ] Single reply in Vault Discord to acknowledge a member observation from yesterday.
- [ ] Approve any Stripe refund request that's queued (per `copy/vault-member-support-playbook.md`).
- [ ] File any decision-log entry from yesterday's session if delayed.
- [ ] Update the running Model Journal candidate-topics list (1-line addition based on yesterday's data).

These are the under-90-second items. If something requires more time, it goes to the priority list.

---

## End of daily ops checklist — 09:00

By 09:00, Garrett is:

- [ ] Aware of production health
- [ ] Aware of member feedback
- [ ] Aware of yesterday's publication outcomes
- [ ] Aware of today's calendar
- [ ] Clear on the peak-block target
- [ ] Caught up on quick-win items

Now peak work begins. The 09:00-11:00 block is reserved for the one peak-block deliverable identified in Step 5.

---

## Daily journal entry (1 line)

After daily ops, write a single line in the daily journal:

```
[Date] — Status: [green / amber / red]. Peak target: [deliverable]. Priority list: [N items]. Notes: [anything worth carrying forward].
```

Example:

```
2026-MM-DD — Status: green. Peak target: Wednesday digest first half on Kelce-game pass. Priority list: 4 items (1 billing, 2 Discord replies, 1 press inquiry). Notes: NHL playoff calibration may be off — note for Friday retrospective.
```

The daily journal compounds. At year-end, it's the input to the Galaxy annual report.

---

## Saturdays

Saturday is OFF per `founder-resilience-playbook.md`.

- Daily ops checklist is NOT run on Saturday.
- Production-critical issues are handled by Codex's monitoring + on-call rotation if it exists, OR by Garrett accepting a calendar-justified Saturday exception (per founder resilience playbook).

The Saturday-off discipline is the operator's protection. Don't run the daily checklist on Saturday.

---

## Sundays

Sunday has a modified version:

### Sunday morning (08:00-09:00)

- [ ] Saturday Model Journal draft published to Vault Discord (Saturday morning peak block).
- [ ] Read Vault Discord responses to the Saturday draft.
- [ ] Decide whether to revise before Sunday public publish.

### Sunday morning publish (09:00)

- [ ] Public Model Journal entry publishes at `/journal/[date]`.
- [ ] Email to Galaxy subscribers.
- [ ] Twitter announcement.

### Sunday evening (19:00-19:30)

- [ ] 30-minute Monday pre-load. Identify Monday's digest topic. Open relevant tabs.

That's the entire Sunday discipline. Garrett does not run the full daily ops checklist on Sunday.

---

## When the daily ops checklist gets skipped

If Garrett skips the daily ops checklist:

- Monday only (post-weekend re-entry): catch up by lunchtime. The 09:00-11:00 block goes to the most-overdue item.
- Multiple days: acknowledge the slip in the next weekly retrospective. Don't pretend it didn't happen. Reset the routine the following week.
- Pattern of skips: per `founder-resilience-playbook.md` failure modes — escalate to weekend off + routine reset.

---

## How the checklist evolves

The checklist captures Garrett's current operating discipline. As Galaxy scales:

- **Month 4-6:** if Vault hits 500+ members, member feedback scan extends to 15 minutes. Discord may need more attention.
- **Month 7-12:** if Vault hits 1,000 members, community manager hire takes over Step 2 (Discord scan); Garrett focuses on Step 3 + 4.
- **Year 2+:** if Almanac production is active in October-December, the daily checklist adds an Almanac progress check.

Update the checklist when the operating reality changes. The version in `docs/monetization-v3/galaxy-daily-operations-checklist.md` is canonical; revisions get decision-log entries.

---

## What the checklist deliberately doesn't include

1. **No social media browsing.** Twitter, X, sports betting Twitter, news aggregators — none of these are in the morning routine. They're scheduled distractions, not operational requirements.

2. **No competitor scanning.** Galaxy doesn't watch Outlier / other competitors as part of daily ops. Quarterly competitive review covers that.

3. **No "inspirational reading" or news roundup.** Galaxy's brand depends on operator focus, not industry awareness.

4. **No metrics-dashboarding obsession.** The daily KPI check is the headline numbers from Step 1, not a deep-dive analytics session. Monthly KPI ritual is for depth.

5. **No founder Twitter posting from the morning routine.** Galaxy social posts are batched 1-2x per week, not part of daily ops.

6. **No external-stakeholder calls before 10:00 AM.** Garrett's calendar prefers external calls in the 14:00-16:00 medium-energy block.

---

## The checklist's purpose, restated

Galaxy is a single-operator company. The operator's daily discipline is the company's most fragile asset. The daily ops checklist exists to:

1. Surface production health before peak work begins.
2. Surface member feedback before it goes stale.
3. Direct peak energy to the one thing that matters most that day.
4. Prevent reactive work from eating creative work.

If the checklist is producing those four outcomes daily, Galaxy compounds. If the checklist is being skipped or rushed, something else needs to give.

---

## Cross-references

- Vault 90-day operating runbook (the daily rhythm extends this): `launch/vault-first-90-day-runbook.md`
- Founder resilience (the why behind protected blocks): `founder-resilience-playbook.md`
- KPI ritual (last Friday of month): `audit/kpi-operator-ritual.md`
- Member support playbook (Step 2c email triage): `copy/vault-member-support-playbook.md`
- Vault Discord launch pack (Step 2a + 2b context): `copy/vault-discord-launch-pack.md`
- Galaxy brand voice canonical (voice discipline across all surfaces): `galaxy-brand-voice-canonical.md`

---

*The daily ops checklist is the difference between Galaxy compounding and Galaxy drifting. Run it before peak work starts. Don't skip it; don't optimize it; don't outsource it. The checklist is the floor.*
