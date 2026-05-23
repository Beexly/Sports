# Galaxy Discord Moderation Escalation Protocol

**Audience:** Garrett (V1 sole moderator). Eventually: community manager when Vault hits 1,000.

**Pairs with:** `copy/vault-discord-launch-pack.md` § "Moderation playbook" (individual member moderation) + `galaxy-crisis-communications-playbook.md` Category 8 (community-wide crisis).

**Scope:** Multi-stage escalation when individual moderation isn't resolving the issue, OR when the situation is more complex than the launch pack's three scenarios cover.

---

## The escalation ladder

Each rung represents increasing severity. Move up rungs only when the lower rung has been tried + insufficient.

### Rung 1 — Soft DM

**When:** First instance of a minor violation (rules-forgetting, off-brand-but-not-malicious behavior).

**Action:** Garrett DMs the member privately. Tone: helpful, not punitive.

```
Hey [name],

Quick note. Your post in [channel] about [topic] crossed into [specific issue — tail-trading / hot take / off-brand framing]. The channel rules cover this in the pinned post; the spirit is [specific reframe].

Would you mind editing/deleting? No big deal — just keeping the channel from drifting.

— G
```

**Expected outcome:** member edits or deletes. Door open for next time.

### Rung 2 — Public reminder

**When:** A pattern is forming in the channel (multiple members drifting). Or a single member repeated Rung-1 behavior.

**Action:** Garrett posts a public reminder in #vault-lounge.

```
Quick channel-rule reminder:

[Specific rule that's being drifted toward].

Specifically: [example of what the rule is preventing].

The pinned channel rules cover this. Worth a re-read.

— G
```

**Expected outcome:** the room sees the reminder; the offender(s) see themselves implicit; behavior shifts.

### Rung 3 — Strict DM

**When:** Member has had Rung-1 DM + behavior continues.

**Action:** Garrett DMs more directly.

```
Hey [name],

This is the second time I've reached out about [specific issue]. The first time I framed it as a rules-forgetting moment. This time I want to be more direct: the behavior isn't compatible with how Vault operates.

If this continues, I'll have to remove your Vault role (with prorated refund).

The next step is your choice. If you want to talk through what's not working, reply to this DM. If you want to course-correct, just do that.

— G
```

**Expected outcome:** either course-correct OR move to Rung 4.

### Rung 4 — Channel mute

**When:** Multiple Rung-3 attempts insufficient OR active conflict in channel.

**Action:** Garrett uses Discord's mute feature to temporarily silence the member (24-72 hours typical).

**Public communication:** none unless asked. Discord muting is a soft moderation tool; not publicly announced.

**Private communication:** Garrett DMs the muted member explaining: "Muted you for [duration] to reset. We'll talk when the mute ends. Either we course-correct or the next step is removal."

**Expected outcome:** the cooling-off period gives both parties time to step back.

### Rung 5 — Removal

**When:** Multiple rungs insufficient OR a single severe violation (per launch pack: betslip-posting third instance, public sharing of Vault content, repeated hostility).

**Action:** Remove `vault-member` role. Member loses Discord access + gated content.

**Stripe:** subscription canceled. Prorated refund issued for the unused portion.

**Private communication:** Garrett DMs the removed member.

```
Subject: Removing your Vault role

Hey [name],

I'm removing your Vault role today. Specific reason: [factual account of what happened].

What happens:
- Discord role removed within 1 hour. Channels you had access to will no longer appear for you.
- Stripe subscription canceled. Prorated refund for the unused portion will hit your card in 5-7 business days.
- Member dashboard access ends.

Why this is happening: [factual reasoning. Don't editorialize.]

If you think this was wrong: reply to this email. I'll re-read the history.

— G
```

**Expected outcome:** member is removed cleanly. No public announcement.

### Rung 6 — Public statement (very rare)

**When:** Removal becomes a public story. Other members ask publicly what happened.

**Action:** Garrett posts a single message in #vault-lounge.

```
A note on a recent removal.

A Vault member's role was removed yesterday. I don't share specifics about individual member actions or my reasoning — that's a privacy commitment that applies even when it would be advantageous to share more.

What I can say: the moderation rules in the pinned channel post are real. They apply uniformly. If a member doesn't fit those rules, removal is the answer, even when it's hard.

If you noticed something that informs your read of Vault — I'm reading.

— G
```

**Expected outcome:** the room understands moderation is real without learning specifics. Most members appreciate this; some are uncomfortable. Both reactions are acceptable.

---

## When to skip rungs

The escalation ladder can be jumped for specific severities:

### Skip-to-Rung-5 (immediate removal)

- Member posts illegal content (CSAM, threats, doxxing).
- Member coordinates harassment of another member.
- Member publicly attacks Galaxy in a way that warrants legal review.
- Member's Vault subscription was paid by fraudulent means (Stripe dispute already received).

### Skip-to-Rung-4 (channel mute)

- Active conflict between members that needs immediate cooling-off.
- Member is posting at high volume in ways that overwhelm the channel.
- Public mention of Galaxy's internal data in ways Garrett didn't intend to surface publicly.

### Skip-to-Rung-2 (public reminder)

- Multiple members drifting simultaneously (no single offender; channel-wide drift).
- A specific rule is being interpreted incorrectly by the room.

---

## What this protocol deliberately does NOT do

1. **No public shaming.** Galaxy doesn't publicly call out members. The brand position is restraint applied to moderation.

2. **No warning point system.** Galaxy doesn't track "strikes" or run a points-based moderation. Decisions are case-by-case.

3. **No appeals process beyond DM with Garrett.** A removed member can email Garrett and have the decision re-read. No formal appeals committee.

4. **No public moderation logs.** Galaxy doesn't publish a log of "who got muted when." Moderation actions are private.

5. **No reinstatement after removal except in extraordinary circumstances.** Once removed, removal stands. The exception: if Garrett later determines the removal was incorrect (rare), he reaches out + offers reinstatement.

---

## How escalation actions get tracked

In `templates/moderation-log.md` (private):

```
date,member_id,rung,issue,action,member_response,outcome
2026-XX-XX,[hashed ID],1,Posted betslip in #vault-lounge,Soft DM,Edited the post,Resolved
2026-XX-XX,[hashed ID],3,Repeated betslip-posting after Rung-1 DM,Strict DM,No response after 5 days,Move to Rung 4
2026-XX-XX,[hashed ID],5,Hostile to multiple members repeatedly,Removed,Did not appeal,Removed cleanly
```

Member IDs are hashed for privacy. The log feeds into:
- Quarterly moderation review (patterns + improvements).
- Year-end annual report's "what we learned about community management."

---

## Quarterly moderation review

Once per quarter:

- How many rung-1 DMs were sent?
- How many escalated past rung-1?
- How many removals?
- Are there patterns suggesting a specific rule needs clarification?

**Healthy:** rung-1 DMs as ~70% of moderation actions; <5% escalating to removal.
**Concerning:** majority of actions reaching rung-3+ or rung-5. Investigate: is the community changing? Is the rule-set unclear?

The quarterly review informs whether the pinned channel rules need updating + whether the moderation protocol needs revision.

---

## When the moderator (currently Garrett) is the problem

This is the hardest scenario. Sometimes Garrett misreads a situation, moderates too aggressively, or applies a rule inconsistently.

The protocol:

- If a member raises a moderation concern via DM: Garrett reads it without defensive response. 24 hours minimum before replying.
- If Garrett reviews and agrees he overstepped: reinstate, apologize, document in decision log.
- If Garrett reviews and disagrees: explain the reasoning factually; don't argue.
- If a third party (the community manager if hired) flags Garrett's moderation behavior: take it seriously. The discipline of accepting external review is part of the brand position.

The single-operator model has limits. By Year 2, if Vault hits 1,000+ members, the community manager hire creates a second person who can apply moderation discipline + check Garrett's instincts.

---

## When to update this protocol

- After 6 months: quarterly moderation review surfaces specific issues. Update accordingly.
- When community manager hires: revise the protocol so both moderators apply it consistently.
- When Vault hits V2 cap (5,000 members): the entire protocol may need restructuring. 1,000 members can be moderated personally; 5,000 cannot without delegation.

---

## Cross-references

- Discord launch pack (Rungs 1-5 individual examples): `copy/vault-discord-launch-pack.md`
- Crisis communications (Category 8 community-wide crisis): `galaxy-crisis-communications-playbook.md`
- Member support playbook (Scenario 9 individual moderation): `copy/vault-member-support-playbook.md`
- Brand voice canonical (moderation tone): `galaxy-brand-voice-canonical.md`

---

*Moderation is the social application of the brand position. Galaxy's discipline is to apply it uniformly + privately + with restraint. The escalation ladder protects the operator from making moderation decisions reactively; the rungs make every action deliberate.*
