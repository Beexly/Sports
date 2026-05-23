# Vault Advisory Channel — Spec

**Audience:** Garrett. Internal.
**Status:** Activates Month 4-6 if Vault retention holds + founding-50 cohort demonstrates substantive feedback patterns. Optional structure; not promised to members at launch.

**Purpose:** Founding-50 members are Galaxy's highest-signal feedback source. The advisory channel formalizes their input loop without making it transactional or hierarchical.

---

## Why this exists

Founding-50 members self-selected into Vault at Month 0. They paid $200 before there was a track record. They are, by definition, the members most aligned with Galaxy's brand position.

Their feedback is qualitatively different from later-joiners:
- They notice drift from the original positioning.
- They have specific opinions about methodology evolution.
- They volunteer ideas without being asked.
- They are willing to tell Garrett uncomfortable truths.

The advisory channel captures this signal in a structured way without creating a tier-within-a-tier dynamic that would violate Galaxy's brand-position equality.

---

## What the advisory channel IS

A **private Discord channel** within the Vault server, named `#advisory-board` or `#founding-50-advisory`.

Visible only to:
- Founding-50 members who opt in.
- Garrett.

Read-only for non-members. (Other Vault members don't see the channel exists; founding-50 members who decline opt-in don't see it either.)

### Activity cadence

- **Monthly Garrett post.** Garrett posts a substantive question or scenario to the channel each month (typically the first Monday). Examples:
  - "We're considering adding NHL playoff coverage. Here's the methodology fit analysis. What's your honest take?"
  - "Three founding members have raised X feedback. Before we change anything, what do you think?"
  - "Year-2 strategic question: hire a community manager or stay solo. Here's the analysis. What would you do?"

- **Founding-50 replies.** Members who want to engage reply substantively. The tone is peer-to-peer, not advisor-to-founder.

- **No external publishing.** Conversations in `#advisory-board` stay there. No quotes leak to public surfaces unless Garrett explicitly asks for permission.

- **No required participation.** A founding-50 member can be opt-in but stay silent. Lurking is fine.

### What it is NOT

1. **Not a paid advisor relationship.** No founding member receives compensation for advisory input.

2. **Not an equity-for-advice arrangement.** No founding member gets equity, stock options, or revenue share for participating.

3. **Not a board.** Founding-50 members do not have decision rights. Garrett retains all decision authority per `galaxy-decision-rights-matrix.md`.

4. **Not a marketing tier.** The advisory channel is not promoted publicly. New Vault members don't learn about it. Founding-50 status (numbers 1-50) is the only public signal.

5. **Not a focus group.** Garrett does not run scheduled "research sessions" with founding-50 members. Input is opt-in, channel-based, not scheduled.

---

## Activation criteria

The advisory channel activates only if all 4 conditions hold:

1. **Founding-50 cohort is full** — all 50 numbers issued.
2. **Vault retention at Month 4 is ≥85%** (founding-50-specific retention; high benchmark).
3. **At least 5 founding-50 members have organically initiated substantive feedback** in the first 4 months.
4. **Garrett's bandwidth allows a monthly post + replies** without displacing other Vault commitments.

If any condition fails: defer activation. The channel can be deferred indefinitely; it's not a launch requirement.

---

## Invitation copy

When activation criteria are met, Garrett DMs each founding-50 member individually:

```
Hey [first name],

Quick question. I'm thinking about creating a private channel for the founding 50 — just a place where I can post substantive questions once a month and hear honest reactions from the people who got here first.

It would be opt-in (no obligation), no promise of compensation, and conversations would stay in the channel (nothing leaks externally). The reason I'm asking founding members specifically is that you all signed up before there was a track record, which makes your read on whether Galaxy is staying true to itself uniquely valuable.

If you'd want in, just reply yes. If not, no problem — equally happy to keep the existing #vault-feedback channel as our main loop.

A few things to be clear about:
- This isn't a board. I make the decisions; I just want better input.
- This isn't paid. No advisory shares, no fees.
- This isn't tiered access. You'll get the same Vault content as every other member; the channel is just a side conversation.

Either way, glad you're here.

— Garrett
```

### What this email demonstrates

- Galaxy doesn't assume. Members opt in or out without pressure.
- Galaxy is clear about what's NOT on offer (compensation, board seats, tiered access).
- Galaxy frames the request as serving Galaxy's need for honest input, not the member's ego.

---

## Channel norms

Pinned post in `#advisory-board`:

```
A few channel norms:

1. **Honest is the goal.** Cheerleading isn't useful. Disagreement is.

2. **Galaxy makes the call.** I post questions because I want better-informed decisions. The decisions stay with me; that's the deal.

3. **Conversations stay here.** Nothing in this channel gets quoted publicly unless I ask and you approve.

4. **No obligation.** Lurking is fine. Skipping months is fine. The channel is opt-in, not opt-out.

5. **Substance over volume.** Short, honest replies beat long, polite ones.

— Garrett
```

---

## Monthly post template

Garrett posts a monthly question. The format is consistent:

```
**[Topic]: [one-line question]**

Background:
- [3-5 bullets of context: why this question matters now, what we're already considering, what's at stake]

What I'd like your read on:
- [1-3 specific questions]

What I'm NOT looking for:
- [Optional: clarifications about what kind of input doesn't help]

Reply when you have time. Skip if you don't have a take.

— Garrett
```

### Example post (Month 4, hypothetical)

```
**NHL playoff coverage: do we add it for spring?**

Background:
- 8 members have asked about NHL playoff coverage in #vault-feedback over the past 30 days.
- NHL coverage is brand-fit: real factor model, calibration data is available, the methodology applies.
- Adding coverage means rebuilding the model for hockey + holding the methodology bar through the learning curve. Estimated 4-6 weeks of focused work.
- The opportunity cost: that's 4-6 weeks where I'm not writing the Almanac or shipping Vault product improvements.

What I'd like your read on:
1. Is NHL playoff coverage a "real" Galaxy product expansion, or a "give the audience what they ask for" mistake?
2. If we did add it, would you read it? (Honest answer.)
3. What would make NHL coverage feel brand-aligned vs feel like scope creep?

What I'm NOT looking for:
- Tactical "yes do it" or "no don't" without reasoning.

Reply when you have time.

— Garrett
```

---

## Member feedback patterns

Over time, founding-50 advisory feedback tends to fall into these categories:

| Pattern | Signal value | Response |
|---|---|---|
| Brand-position challenge | Highest signal | Per `vault-feedback-synthesis-protocol.md` and `founder-resilience-playbook.md` anti-spiral protocol |
| Methodology-improvement suggestion | High signal | Investigate; may become decision-log entry |
| Operational drift observation | High signal | Address in next quarterly audit |
| Sport-coverage request | Medium signal | Treat as Year-2 strategic question input |
| UX / Discord channel layout feedback | Medium signal | Implement low-risk; surface bigger changes in #vault-lounge first |
| Member-experience suggestion | Variable | Cross-check against brand position |

The advisory channel concentrates the higher-signal patterns. Lower-signal patterns more often surface in `#vault-feedback`.

---

## What Garrett does with the input

- **Decision-log entries:** When advisory channel input shapes a decision, the decision-log entry references the channel (anonymized if needed). Example: `DEC-NEXT-NHL-001: NHL playoff coverage deferred to Year-2. Input from founding-50 advisory channel: 7 of 11 respondents framed expansion as brand-position risk, not opportunity.`

- **Quarterly synthesis:** During the quarterly deep audit per `galaxy-quarterly-deep-audit-protocol.md`, Garrett synthesizes advisory channel patterns alongside #vault-feedback and other channels.

- **Public acknowledgment:** Year-end annual report may aggregate-acknowledge advisory input: "Founding-50 advisory channel input shaped 4 product decisions this year, including [examples]." No names; just acknowledgment that the channel was load-bearing.

- **What Garrett does NOT do:** Quote specific founding-50 members by name in public surfaces without permission. Use advisory input to short-circuit broader Vault discussion. Treat advisory input as veto power on Garrett's decisions.

---

## Sunset criteria

The advisory channel sunsets if:

1. **Engagement drops below 3 active monthly contributors over 90 days.** The channel isn't earning its keep.
2. **Galaxy's brand position is compromised by the dynamic.** If the advisory channel becomes a kingmaker tier-within-a-tier, kill it.
3. **Garrett can't sustain the monthly post discipline.** If posts become quarterly or sporadic, the channel becomes performative.
4. **Founding-50 members leave en masse.** Different problem entirely; see `vault-month-12-renewal-decision-memo-template.md`.

Sunset announcement to founding-50 members:

```
A note on the advisory channel.

When we started this, I committed to posting monthly substantive questions and treating your input with care. Looking at the past few months, the cadence has slipped — and continuing the channel as-is would make it more performative than substantive.

So I'm sunsetting #advisory-board for now. We'll keep #vault-feedback as the main loop, and I'll continue to read it daily.

If/when there's a clearer reason to bring the advisory channel back — maybe Year-2, maybe never — I'll restart it. For now: thanks for the input. It shaped real decisions, and I'll honor that in the annual report.

— Garrett
```

---

## Year-2 evolution

If the advisory channel works through Year-1 + Vault scales to V2 cap (founding-1000 → 5,000 members), the dynamics change:

- **Founding-50 still gets the channel.** Their first-mover status is permanent.
- **Founding-1000 doesn't get equivalent.** Galaxy can't run multiple advisory tiers without compromising brand position.
- **The founding-50 channel may shift to quarterly cadence** if Garrett's bandwidth tightens.
- **Year-2 onward, the channel may produce a year-end synthesis** ("What founding-50 saw") that's published with permission as part of the annual report.

The founding cohort relationship compounds. The channel is the operational expression of that compounding.

---

## Cross-references

- Vault feedback synthesis protocol (main feedback loop): `copy/vault-feedback-synthesis-protocol.md`
- Founder resilience playbook (handling brand-position challenges): `founder-resilience-playbook.md`
- Decision rights matrix (advisory input vs decision authority): `galaxy-decision-rights-matrix.md`
- Quarterly deep audit protocol: `galaxy-quarterly-deep-audit-protocol.md`
- Founding-50 selection framework: `week-minus-1/07-founding-50-selection-framework.md`
- Member support playbook: `copy/vault-member-support-playbook.md`

---

*The advisory channel is the operational expression of the founding-50 relationship. Used right, it deepens the bet without compromising the brand position. Used wrong, it creates a tier-within-a-tier and corrupts the equality Galaxy promises. The discipline above keeps it on the right side.*
