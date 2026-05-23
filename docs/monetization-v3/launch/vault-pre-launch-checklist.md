# Vault Pre-Launch Checklist

**Scope:** Day -7 through Day 0 (the morning founding-50 invitations send).
**Pairs with:** `launch/vault-launch-runbook.md` (Day 0 onward) + `launch/vault-first-90-day-runbook.md` (Days 8+).
**Use:** Single-page reference Garrett runs through before Vault launches. Skip nothing.

---

## Day -7 (7 days before founding-50 invitations send)

This is the final integrity check week. All engineering should be done; this week is verification.

### Engineering verification (Codex confirms)

- [ ] Vault landing page deployed at `/vault` — renders correctly desktop + mobile
- [ ] Vault application form at `/vault?apply` — submits successfully
- [ ] Stripe Checkout configured with Vault product ($200/year) + custom fields per `copy/vault-checkout-copy.md`
- [ ] Stripe webhook receiving + processing test events (test mode green)
- [ ] Discord bot configured + tested for `vault-member` role assignment
- [ ] Welcome email sequence (5 emails) loaded into transactional email stack
- [ ] All 5 welcome emails tested end-to-end with test account
- [ ] Member dashboard at `/vault/member` accessible to test Vault account
- [ ] All gated routes properly gated (test as non-Vault user; should not load)
- [ ] Member support inbox (`garrett@galaxysportsedge.com`) configured + monitored
- [ ] Brand-safety scanner runs successfully against all Vault copy

### Content verification (Garrett confirms)

- [ ] Vault landing copy finalized (per `copy/vault-landing-page.md`)
- [ ] First 4 weeks of digest topics drafted (or at least topic-list confirmed)
- [ ] Office hours first session date scheduled
- [ ] Founding-50 cohort selected per `week-minus-1/07-founding-50-selection-framework.md`
- [ ] Founding-50 invitation email drafted + ready to send
- [ ] Discord channels created + permissions set per `copy/vault-discord-launch-pack.md`
- [ ] First 8 Discord threads drafted with placeholders filled

### Decision-log entries

- [ ] DEC-NEXT-001 — Runway scenario confirmed
- [ ] DEC-NEXT-002 — Vault customer dev decision (GO at $200 or applicable variant)
- [ ] DEC-NEXT-003 — Canonical landing page version selected
- [ ] DEC-NEXT-004 — Founding-50 roster selected

---

## Day -5

### Founding-50 outreach prep

- [ ] Personalization per invitee drafted (one specific reason per recipient)
- [ ] Member-specific signup URLs generated (founding-50 bypasses public)
- [ ] Calendar blocked Day 0 morning 09:00-11:00 for invitation send + first-72-hour response monitoring

### Internal communication

- [ ] Brief contractor on hand (PR consultant if hired, BD consultant if applicable) — ready for any press response if launch attracts attention
- [ ] Friends/family advised that Garrett will be heads-down Day 0 to Day 14

### Test transactions (with real money, then refunded)

- [ ] Process one Vault test subscription using Garrett's own card
- [ ] Verify all webhook events fire correctly
- [ ] Verify Discord role assigned automatically
- [ ] Verify welcome email arrives within 5 minutes
- [ ] Process refund to confirm refund flow
- [ ] Verify member dashboard correctly shows Vault state pre + post refund
- [ ] Document any issues; fix before Day 0

---

## Day -3

### Final operational readiness

- [ ] Calendar Mon-Fri 09:00-11:00 peak blocks for launch week — protected
- [ ] Saturday Day -3 + Saturday Day +4 confirmed OFF (per founder resilience playbook)
- [ ] Phone do-not-disturb settings tested for off-hours
- [ ] Discord notification settings adjusted (Garrett does not want Discord notifications outside business hours)

### Communication channels

- [ ] @GalaxySportsAI Twitter posting permissions confirmed
- [ ] Vault Discord stage (for office hours) tested + working
- [ ] Email signature confirmed: `garrett@galaxysportsedge.com`
- [ ] Email auto-reply configured for high-volume launch days (acknowledge within 24 hours; not real-time)

### Press readiness (if hiring PR consultant)

- [ ] PR consultant briefed on launch timing
- [ ] Press kit at `/press` confirmed live
- [ ] Tier-1 press outreach drafts ready to send on Day 7+ (after founding-50 window closes)

---

## Day -2

### Public surface readiness

- [ ] Galaxy `/board` page renders current publications
- [ ] Galaxy `/ledger` page renders settled picks
- [ ] Galaxy `/loss-room` page renders recent autopsies
- [ ] Galaxy `/passes` page renders recent passes
- [ ] Galaxy `/methodology` page renders current methodology
- [ ] Galaxy `/vault` landing page renders Vault offering
- [ ] All cross-links from `/vault` to other surfaces resolve correctly
- [ ] Mobile rendering verified for all surfaces

### Vault-specific surfaces

- [ ] `/vault/member` dashboard renders for test Vault account
- [ ] Welcome page at `/vault/welcome?session_id=*` renders correctly after checkout
- [ ] Cancel page at `/vault?cancel=true` renders correctly
- [ ] Member dashboard shows correct Vault state (active, refunded, canceled, etc.)

### Member data readiness

- [ ] Existing Galaxy Elite subscribers list pulled from Stripe (for founding-50 secondary pool)
- [ ] Customer dev interviewee list ready (for founding-50 primary pool)
- [ ] Combined founding-50 list reviewed once more for any last-minute swap

---

## Day -1 (the day before founding-50 invitations send)

### Final pre-flight

- [ ] Re-read founding-50 invitation email one more time
- [ ] Confirm personalization fields populated for each recipient
- [ ] Verify Calendly link in invitation works (for any follow-up scheduling)
- [ ] Verify member-specific founding-50 signup URLs work

### Code freeze

- [ ] No engineering changes between Day -1 16:00 and Day 0 12:00 (12-hour freeze window)
- [ ] Codex on call but only for P0/P1 issues during the window
- [ ] Documentation update lock — any wording changes pause until launch is confirmed stable

### Garrett's state of mind

- [ ] 7+ hours sleep Night -1 (per `founder-resilience-playbook.md`)
- [ ] No screens 60 minutes before bed (Night -1)
- [ ] Calendar protected for Day 0 morning
- [ ] One contingency plan: what if launch goes sideways? Identified the soft fallback ("delay one week if technical issue surfaces in Day 0 morning verification")

---

## Day 0 — Founding-50 invitations send

### 08:00 — Final verification

- [ ] Re-read invitation email
- [ ] Verify Stripe is processing payments correctly (one final test transaction + refund)
- [ ] Verify Discord bot is online + functional
- [ ] Verify email send infrastructure operational

### 09:00 — Send

- [ ] Send all 50 founding-50 invitation emails (batch via transactional email tool with personalization merge)
- [ ] Verify all sends went through (delivery confirmation)
- [ ] Post initial Discord welcome thread (Thread 1 of 8 from `copy/vault-discord-launch-pack.md`) — this becomes visible to founding-50 members the moment they get their role

### 09:15 — Monitor

- [ ] Open admin cockpit; watch real-time subscription processing
- [ ] Reply to any "I'm subscribing now" messages with founding-member personal welcome
- [ ] Monitor Stripe webhook reliability

### 12:00 — Launch runbook takes over

After this point, the `launch/vault-launch-runbook.md` Day 0 protocol governs. The pre-launch checklist is complete.

---

## If something goes wrong during pre-launch

### Scenario 1: Engineering surface fails Day -1 verification

- Don't push through. Delay launch by 1-3 days while Codex fixes.
- Update founding-50 invitees: send a single email noting the delay + new send date. No specific technical reason needed.
- Codex prioritizes fix; new verification window opens before next attempted launch.

### Scenario 2: Garrett gets sick or has personal issue Day -3 to Day -1

- Reschedule launch. Vault doesn't ship without Garrett at full operational capacity.
- Send single email to founding-50 invitees: "Launch is being pushed by [N days]. Same plan."
- No public communication.

### Scenario 3: A major Galaxy publication has an unexpectedly bad outcome the week of launch

- Address per `galaxy-crisis-communications-playbook.md` Category 2 (major loss backlash).
- Don't delay Vault launch unless the backlash is genuinely destabilizing. Founding-50 members joined because they value Galaxy's restraint; they understand losses.
- The autopsy on the loss is the test. If the autopsy is good, the loss strengthens Vault's positioning ("here's why this exists — to talk through losses like this one").

### Scenario 4: Press leak about Vault before Day 0

Unlikely but possible. If a journalist publishes ahead of Garrett's planned announcement:

- Don't accelerate launch. The 14-day founding-50 window stays as planned.
- Respond to the press piece per `galaxy-press-kit.md` protocols (Tier 1-3 depending on outlet).
- Founding-50 invitations send on Day 0 as planned, regardless of press coverage.

---

## Post-launch (Day 0 evening, after the send is complete)

### Reflective check (15 minutes)

- [ ] What worked smoothly?
- [ ] What had friction?
- [ ] Note any "next-time-do-differently" items in the weekly retrospective

### Founder energy check

- [ ] How does Garrett feel after the launch send? (Note in daily journal)
- [ ] If exhausted: Day 0 evening is off-limits for additional Galaxy work. Saturday is still off; the routine holds.
- [ ] If energized: it's tempting to work the evening. Resist. Day +1 needs peak energy for member responses.

### One sentence to Garrett's daily journal

```
[Day 0 date] — Launched Vault founding-50. [N] invitations sent. [N] subscriptions received by EOD. Notes: [anything worth carrying forward into the next 14 days].
```

---

## What this checklist deliberately does not include

1. **No marketing-blitz coordination.** Galaxy doesn't run paid social, paid press, or paid promotion around launch. The brand position rejects this.

2. **No "soft launch" beta period.** Vault either launches to founding-50 or doesn't. There's no half-launch state.

3. **No public announcement before founding-50 are notified.** The first 50 hear before anyone else. Galaxy doesn't tease publicly.

4. **No competitor-monitoring during launch week.** Galaxy operates by its own discipline. Outlier's response (if any) doesn't change Vault's launch sequence.

5. **No "launch celebration" social posts.** Galaxy doesn't celebrate launch milestones publicly. The Loss Room + Pass List + Methodology are Galaxy's celebration. Vault's launch is a subscription tier opening, not a brand moment requiring announcement.

---

## After 14-day founding-50 window closes — public launch handoff

The pre-launch checklist ends Day 0 12:00. The 14-day window then runs through Day 13. On Day 14, public Vault opens — and the founding-50 window closes.

That handoff is covered in `launch/vault-launch-runbook.md` Phase 2 (public founding-1000 launch).

---

## Cross-references

- Launch runbook (Day 0 onward): `launch/vault-launch-runbook.md`
- 90-day operating runbook (Days 8+): `launch/vault-first-90-day-runbook.md`
- Sunset playbook (if launch goes wrong): `launch/vault-sunset-playbook.md`
- Crisis communications: `galaxy-crisis-communications-playbook.md`
- Daily operations checklist (post-launch): `galaxy-daily-operations-checklist.md`
- Founding-50 framework (cohort selection): `week-minus-1/07-founding-50-selection-framework.md`
- Decision log templates: `week-minus-1/06-decision-log-entry-templates.md`
- Welcome email sequence: `copy/vault-welcome-emails.md`
- Discord launch pack: `copy/vault-discord-launch-pack.md`
- Checkout copy: `copy/vault-checkout-copy.md`
- Founder resilience playbook: `founder-resilience-playbook.md`

---

*Pre-launch is the operating discipline made literal. Skip one verification and the launch ships into preventable problems. Run the checklist; honor the timeline; trust the work.*
