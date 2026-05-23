# Vault Feedback Synthesis Protocol

**Audience:** Garrett. Internal.
**Purpose:** Members send Galaxy feedback through several channels (Vault Discord #vault-feedback, email, office hours, retention check-in replies). The signal is real but scattered. This protocol consolidates feedback into actionable input.

**Cadence:** Weekly skim during daily ops; monthly synthesis during KPI ritual; quarterly deep audit.

---

## The feedback funnel

Galaxy receives member feedback through five channels:

| Channel | Frequency | Signal type |
|---|---|---|
| `#vault-feedback` Discord channel | Daily | Direct, explicit feedback |
| Email replies to retention check-ins | Per-cohort | Substantive, opt-in feedback |
| Office hours questions | Monthly | Live, follow-up-able feedback |
| Discord `#vault-lounge` substantive threads | Daily | Indirect, conversational feedback |
| Cancellation reason notes | Per-cancel | Highest-stakes feedback |

Each channel produces different feedback shapes. The synthesis protocol consolidates across channels.

---

## Daily (1-2 minutes during daily ops)

Per `galaxy-daily-operations-checklist.md` Step 2:

- [ ] Read every new `#vault-feedback` message.
- [ ] Skim `#vault-lounge` for substantive threads.
- [ ] Check email inbox for retention-check-in replies.

For each piece of feedback, ask:
1. Is this actionable in the next 7 days? (e.g., a billing issue → daily ops priority list)
2. Is this a pattern signal? (3rd member raising the same thing this month)
3. Is this a Year-2 direction signal? (longer-arc input)

Don't act on every piece. Tag in the feedback log.

---

## The feedback log

Maintain `templates/vault-feedback-themes.csv`:

```
date,channel,member_id,theme_tag,verbatim_quote,action_taken,follow_up_needed,year2_signal
2026-XX-XX,vault-feedback,[hash],"digest format / length","digest is running long this month",None yet,Pattern check at 3,No
2026-XX-XX,email-retention-30,[hash],"OH schedule","8pm Tuesday is hard with kids in EST",None yet,Pattern check at 3,Yes
2026-XX-XX,office-hours,[hash],"sport coverage / NHL","NHL playoffs are unrepresented in publications",None yet,Pattern check at 5,Yes
```

The themes get tagged categorically. Year-2 signals stay flagged for the strategic question framework (per `galaxy-year2-strategic-question-framework.md`).

---

## Weekly synthesis (5 minutes during Friday retrospective)

- [ ] Re-read the week's feedback entries.
- [ ] Cluster by theme.
- [ ] For any theme with 3+ instances this month: surface in the weekly retrospective.
- [ ] For any theme with 5+ instances over 90 days: queue for monthly KPI ritual.

The weekly synthesis is informal. It captures what's bubbling up, not what's been decided.

---

## Monthly synthesis (15 minutes during KPI ritual)

Per `audit/kpi-operator-ritual.md`, the monthly KPI ritual includes a section for retention audit. Extend that section with feedback synthesis:

### Top 3 themes this month

What 3 themes appeared most often in the feedback log?

| Theme | Member count | Channels | Action |
|---|---|---|---|
| [Theme name] | N | [channels] | [Decision: investigate / address / acknowledge / hold for Year-2] |
| [Theme name] | N | [channels] | [Decision] |
| [Theme name] | N | [channels] | [Decision] |

### Pattern check

Did any theme cross the threshold for action?

| Theme threshold | Triggering action |
|---|---|
| 5+ members raising same theme over 90 days | Open a Vault Discord thread asking the broader room for input |
| 8+ members raising same theme over 90 days | Address explicitly in the next Vault digest or office hours |
| Theme appears in 3+ cancellation reason notes | Treat as structural issue; decision-log entry required |

### Year-2 signals

What feedback is informing the Year-2 strategic questions (per `galaxy-year2-strategic-question-framework.md`)?

Flagged signals get carried forward to the December Year-2 strategic review.

---

## Quarterly deep audit (60 minutes)

Once per quarter, run a 60-minute review of all feedback received in the quarter:

- Total feedback events: __
- Top 5 themes by frequency:
- Top 3 themes by severity / specificity:
- Themes that became digest topics:
- Themes that became methodology changes:
- Themes that became Vault product changes:
- Themes that surfaced cancellation:
- Themes that became Year-2 strategic inputs:

The quarterly audit is published internally under `reviews/`.

---

## What feedback Galaxy acts on vs not

### Galaxy DOES act on:

1. **Specific, fixable, brand-aligned suggestions** ("the digest is running too long — could you target 600 words?")
2. **Pattern signals across 3+ members** (multiple members raising the same theme = real signal)
3. **Methodology-question feedback** that improves the methodology page or surfaces a new factor candidate
4. **Tooling / UX issues** that affect member access (gated content not loading, Discord role not assigning, billing edge cases)

### Galaxy does NOT act on:

1. **Single-member preferences that contradict the brand position** ("I'd subscribe more if you published more picks per day")
2. **Tactical suggestions to chase competitive advantages** ("Outlier just shipped X; you should too")
3. **Marketing-tactic suggestions** ("you should run a referral promotion for a week")
4. **Feature requests that scale linearly with member count** ("could you do 1:1 calls with each member?")

The brand position determines what Galaxy will and won't change. Member preference isn't sufficient cause; brand-aligned member preference is.

---

## How feedback becomes a Galaxy product decision

The path from feedback to decision:

1. **Day 0-7:** Feedback enters the log.
2. **Day 7-30:** Pattern check at weekly + monthly synthesis. Theme reaches 3+ members → flag.
3. **Day 30-90:** Theme is referenced in office hours discussion. Garrett tests the underlying premise with the room.
4. **Day 90+:** If theme survives pattern + room discussion + brand-position check → decision-log entry.

Decisions don't get made in the first 30 days of a feedback signal arriving. The discipline is: pattern + brand fit + room discussion + then commitment.

---

## When feedback reveals a Galaxy mistake

Sometimes feedback reveals Galaxy made an error — a published call had a factor weighting that contradicted the methodology, a digest contained inaccurate information, a member's account was mishandled.

In these cases, Galaxy's response is per `galaxy-crisis-communications-playbook.md`:

1. Acknowledge specifically what was wrong.
2. Correct.
3. Apologize without padding.
4. Log in `templates/critique-log.md`.
5. If structural: decision-log entry.

Don't argue with feedback that surfaces an error. Honor it.

---

## When feedback challenges the brand position

Sometimes a member writes thoughtful feedback that questions Galaxy's brand position itself: "Vault is too restrained — you'd be more useful if you published more picks" or "the Loss Room is performative humility."

Per `founder-resilience-playbook.md` § "Anti-spiral protocol":

- Don't reflexively defend.
- Sit with the critique for 24 hours.
- Ask: would Galaxy's brand position actually be better off being changed?
- If yes: write a decision-log entry. (This is rare.)
- If no: write a 200-word response demonstrating the brand position rather than asserting it.

The brand position is the bet. Feedback can stress-test the bet without invalidating it.

---

## Sharing feedback patterns publicly

Quarterly, Galaxy may publish a short note (in the Model Journal or annual report) sharing aggregate feedback patterns:

> "This quarter's most-cited member request: extended sport coverage to include NHL playoffs. We've added it to the Year-2 considerations queue but haven't committed."

This is brand-aligned transparency. Members like to know their feedback is heard. Galaxy doesn't claim every request becomes product; it claims every request is heard.

---

## What this protocol deliberately doesn't do

1. **No NPS surveys.** Galaxy doesn't run scheduled member surveys. Feedback is opt-in via existing channels.
2. **No feedback-tier prioritization by tier.** Founding-50 feedback gets the same weight as later-joiners. Equality.
3. **No public response to individual feedback.** Responses happen in DM, email, or office hours.
4. **No feedback gamification.** No badges for active feedback contributors. The Vault advisory channel is its own reward.
5. **No outsourced feedback analysis.** Garrett reads every piece. AI assistance is allowed for tagging + categorizing but not for analysis.

---

## Cross-references

- Daily operations checklist (where feedback enters the loop): `galaxy-daily-operations-checklist.md`
- KPI operator ritual (monthly synthesis): `audit/kpi-operator-ritual.md`
- Year-2 strategic question framework (where patterns feed): `galaxy-year2-strategic-question-framework.md`
- Crisis communications (when feedback surfaces an error): `galaxy-crisis-communications-playbook.md`
- Founder resilience (anti-spiral for brand-position challenges): `founder-resilience-playbook.md`
- Vault office hours playbook: `copy/vault-office-hours-playbook.md`
- Vault retention check-ins: `copy/vault-retention-checkins.md`

---

*Member feedback is Galaxy's most honest input layer. The synthesis protocol is what turns scattered signal into structured product decisions. Read every piece; pattern-check before acting; honor the bet.*
