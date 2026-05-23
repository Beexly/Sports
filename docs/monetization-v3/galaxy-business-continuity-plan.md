# Galaxy Business Continuity Plan

**Audience:** Garrett + designated emergency contact (TBD by Garrett).
**Pairs with:** `founder-resilience-playbook.md` (the 2-week + 2-month absence tests) + `06-continuity-risk.md` (Codex's founder-dependency map).
**Purpose:** When Garrett is suddenly unable to operate Galaxy (illness, injury, family emergency), Galaxy needs documented continuity. This plan is the "what happens if Garrett can't" answer.

**Status:** Confidential. Shared with the designated emergency contact + lawyer only.

---

## The principle

Galaxy is single-operator. Member subscriptions, partnership commitments, and brand-position discipline all run through Garrett. If Garrett is suddenly unavailable, the question isn't "can Galaxy continue without Garrett?" — it's "how does Galaxy degrade gracefully until Garrett is back, or until Galaxy formally sunsets?"

The business continuity plan exists for two scenarios:
1. **Temporary** — Garrett expected back within 4-8 weeks (illness recovery, family event, planned medical procedure).
2. **Indefinite or permanent** — Garrett incapacitated for longer than 8 weeks, or permanently.

Both scenarios need protocols.

---

## Designated emergency contact

Galaxy needs ONE designated emergency contact — a trusted person who has:

- Authority to access Galaxy's communication channels.
- Authority to post to Vault Discord on Galaxy's behalf.
- Authority to pause Galaxy's billing operations if needed.
- Authority to engage Galaxy's lawyer.
- The judgment to apply Galaxy's brand position even in unusual situations.

**Garrett identifies this person privately.** The designated contact is told they're the emergency contact, given the basic protocol, and consents to the role.

This is NOT a Galaxy hire. It's a personal trust relationship that has emergency operational authority for Galaxy.

### Who this is NOT

- The designated contact is NOT a co-founder or business partner.
- Not Galaxy's lawyer (the lawyer has a specific role but isn't an operator).
- Not a Vault member (member trust is one-way; the contact needs to be outside the member relationship).
- Not a contractor (1099 relationships are scope-limited).

### Who this is

Typically:
- A close family member with operational judgment.
- A trusted founder-peer who knows Galaxy's brand position.
- A friend with business operations background.

Garrett identifies the specific person. The selection is private.

---

## Temporary scenario protocol (≤8 weeks)

### Day 0-1 (the event happens)

If Garrett can communicate:

Garrett or the designated contact sends a single email to all paid Galaxy subscribers:

```
Subject: Galaxy is pausing briefly

Hey [first name],

Short note. Something personal came up that requires me to step back from Galaxy operations for [estimated duration, conservative: e.g., "4-6 weeks"].

What's continuing:
- Your subscription remains active. Stripe doesn't charge until the next renewal.
- Past digests + autopsies + ledger remain accessible.
- Your data is safe.

What's paused:
- Wednesday digest [duration].
- Vault office hours scheduled in [period].
- Real-time Discord engagement from me.

What's already in motion:
- [Designated contact's first name] is monitoring the platform.
- Galaxy's monitoring + auto-deployments continue.
- Stripe billing operates normally.

This is a temporary pause, not a permanent one. I expect to be back around [estimated return date]. If something material changes about that estimate, I'll send another email.

If you have questions: reply to this email. [Designated contact] is checking the inbox and can respond on operational matters. Anything that needs my decision will wait for me.

Garrett
```

If Garrett cannot communicate:

The designated contact sends a similar email, signed appropriately:

```
[Subject: Galaxy update from a designated emergency contact]

Hey [first name],

I'm [first name], Garrett's designated emergency contact. I'm writing on his behalf because he's temporarily unable to operate Galaxy directly.

[Specific, factual description of what's happening, calibrated to the situation. Examples:
- "Garrett is recovering from a medical procedure and expects to be back in [timeframe]."
- "Garrett is dealing with a family emergency. Expected back within [timeframe]."]

Galaxy's operations:
- Subscriptions continue. No new charges to your card until renewal.
- Discord remains accessible.
- The Loss Room, Pass List, and methodology pages stay updated automatically.
- The Wednesday digest pauses until Garrett's back.
- Vault office hours pause; any scheduled session is canceled with re-scheduling pending Garrett's return.

What you can expect:
- I'll check the support inbox daily. Routine matters get acknowledged; substantive decisions wait for Garrett.
- If Garrett's expected return changes materially, I'll send another email.

If you need to refund or pause: I can help with that. Reply to this email.
If you have a Galaxy-product question: I'll log it for Garrett to address when he's back.

Best,
[Designated contact's first name]
on behalf of Galaxy Sports Edge
```

### Days 1-7

The designated contact:
- Checks support inbox daily.
- Posts a single update in #vault-lounge: "Galaxy update — Garrett is [doing well in recovery / handling the situation]. Expected return: [date]. Digest paused; office hours canceled this month."
- Responds to email inquiries with acknowledgments + the substantive decision deferred to Garrett.
- Does NOT make product decisions (no methodology updates, no partnership negotiations, no refund decisions outside automated policy).

### Days 8-30

If Garrett still hasn't returned and the original estimate was longer than 8 days:

- Designated contact sends a second update: "Garrett's return is now expected around [revised date]. Status: [factual]."
- Member subscriptions continue; renewal-period communications pause if Garrett would normally have personally responded.
- Lawyer is consulted on any major operational decisions that arise during the absence.

### Days 30-60

If Garrett still hasn't returned:

- Consider extending the pause longer. Refund options may be offered to members who don't want to wait.
- Detailed status update sent: "Galaxy operations remain paused. Your subscription continues at no additional cost; if you'd prefer to be refunded for the unused portion, reply to this email."
- The brand position requires honesty: don't pretend Galaxy is operating normally when it isn't.

---

## Indefinite or permanent scenario (>8 weeks or permanent)

This is the harder scenario. When Garrett's unavailability becomes structurally long-term, Galaxy needs to make a decision:

### Decision A — Wait

If Garrett is expected to return eventually:
- Operations remain paused.
- Subscriptions pause (no renewal charges).
- Members receive monthly updates from designated contact.
- Lawyer consulted on the implications of extended pause.

### Decision B — Sunset

If Garrett is unlikely to return:
- Galaxy formally sunsets per `launch/vault-sunset-playbook.md` Scenario D (Founder personal crisis).
- All subscriptions refunded prorated.
- Discord channels archive.
- Member data retained per `galaxy-data-retention-privacy-policy.md`.
- Galaxy's public surfaces become a historical archive (`/about` updates to reflect operating status).
- Lawyer + accountant manage the formal business closure.

### Decision C — Transition

If Garrett's permanent unavailability allows for some succession planning (rare):
- A pre-identified successor (likely the designated contact or a trusted hire) takes operations.
- Members are informed transparently.
- The brand position is maintained by the successor — or, if the successor can't honor it, Galaxy sunsets per Decision B.

The succession decision is governed by Garrett's pre-arranged plan with the designated contact + lawyer.

---

## What the designated contact has access to

To execute the continuity plan, the designated contact needs:

### Access (provided proactively, before any incident):

- Email account credentials (or 2FA recovery for Galaxy's inbox).
- Stripe dashboard access (read-only by default; write access for refund processing during continuity).
- Discord moderator role for Garrett's account or a designated continuity role.
- Galaxy's password vault (1Password / Bitwarden / similar).
- Galaxy lawyer's contact info.
- Galaxy accountant's contact info.

### Authority (documented in writing):

- A signed durable power of attorney covering Galaxy's business operations.
- Specific scope: continuity operations only, not strategic decisions or product changes.
- Time-bounded: authority expires automatically when Garrett returns or after the lawyer-approved continuity period.

### Constraints (documented for the designated contact):

- Cannot ship product changes.
- Cannot moderate Discord members beyond standard rule-enforcement.
- Cannot speak for Galaxy in press inquiries beyond "Galaxy is currently in continuity mode."
- Cannot make partnership decisions.
- Cannot make refund decisions outside automated policy.
- Cannot publicly characterize Garrett's situation in detail without explicit prior consent.

---

## Galaxy operations in continuity mode

### Auto-continues (no operator required):

- Stripe subscriptions and renewals.
- Discord channels (with role auto-assignment via existing bot).
- Public Galaxy site (Loss Room, Pass List, methodology page — these update from existing data).
- Galaxy email auto-replies (configurable to acknowledge continuity).
- Monitoring + alerting infrastructure.

### Pauses (Garrett-required):

- Wednesday Vault digest.
- Vault office hours.
- Saturday Model Journal draft.
- Garrett-led email responses on substantive matters.
- New partnership outreach or response to inbound.
- Engineering changes via Codex.

### Continuity decisions (designated contact handles):

- Refund processing per existing policy.
- Discord moderation (member rule violations).
- Member inquiries on routine matters (billing, access).
- Press inquiries (deferred response: "Galaxy is in continuity mode; Garrett expects to be back").

---

## Communication discipline during continuity

The designated contact's communications follow Galaxy's brand voice rules:

- Factual.
- Restrained.
- No marketing language.
- No defensive language.
- No speculation about Garrett's situation.
- Respects Garrett's privacy.

If members or press ask for details about Garrett's situation: the designated contact says only what Garrett has consented to share. Member privacy and founder privacy both apply.

---

## Pre-arrangements Garrett completes BEFORE any incident

The business continuity plan only works if Garrett completes these steps in advance:

- [ ] Identify the designated emergency contact.
- [ ] Have a private conversation with them about the role.
- [ ] Sign a durable power of attorney covering Galaxy operations (lawyer drafts; both sign).
- [ ] Provide credentials access (in password vault or sealed envelope).
- [ ] Brief the designated contact on Galaxy's brand voice + operating values.
- [ ] Document the lawyer's + accountant's contact info.
- [ ] Identify a successor scenario if "Decision C — Transition" applies.
- [ ] Set up Galaxy email auto-reply scripts that the designated contact can activate.

These pre-arrangements should be completed by end of Year 1.

---

## What the designated contact does NOT need to be

- Familiar with sports betting.
- Familiar with Galaxy's methodology.
- A subscription-business operator.
- A member of Vault.

The designated contact's role is operational continuity + member-facing communication + crisis containment. Not product expertise.

---

## When Galaxy formally returns from continuity

When Garrett resumes operations:

- Single email to all subscribers: "Galaxy is back. Wednesday digest resumes [date]. Office hours scheduled [date]."
- Resume normal cadence.
- Decision-log entry: what Galaxy learned from the continuity period. What worked. What didn't. What pre-arrangements need updating.
- The continuity plan is updated for the next incident.

---

## What this plan deliberately doesn't do

1. **No co-founder structure.** Galaxy is single-operator by design. The designated contact is emergency-only, not a co-founder.

2. **No board of directors.** Galaxy is a single-member LLC (likely). No formal corporate governance.

3. **No insurance recommendations.** Garrett's personal disability/life insurance is a personal financial planning matter.

4. **No "what happens to Garrett's equity" detail.** That's estate planning, handled separately from operating discipline.

5. **No specific medical scenarios.** The plan is generic to any incident that makes Garrett unavailable.

---

## Annual review

Once per year (typically January after the year-end annual report):

- Designated contact contact info confirmed.
- Power of attorney still in effect.
- Credentials access still works.
- Lawyer + accountant relationships still active.
- Any operational changes in the past year that update the continuity plan.

The annual review is brief (~30 minutes) but non-negotiable. Galaxy's continuity is the operator's responsibility, and the operator can be temporarily unavailable.

---

## Cross-references

- Founder resilience playbook (the 2-week + 2-month tests): `founder-resilience-playbook.md`
- Continuity risk (Codex's founder-dependency map): `06-continuity-risk.md`
- Sunset playbook (Decision B): `launch/vault-sunset-playbook.md`
- Crisis communications (Category 7 founder personal crisis): `galaxy-crisis-communications-playbook.md`
- Data retention + privacy policy (member data during continuity): `galaxy-data-retention-privacy-policy.md`
- Contractor playbook (lawyer engagement context): `galaxy-contractor-playbook.md`

---

*Galaxy's single-operator structure is the brand position's most fragile dependency. The business continuity plan is the discipline that turns "Garrett gets sick" from a brand-destroying event into a brand-preserving pause. Complete the pre-arrangements before they're needed.*
