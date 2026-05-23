# Vault Interview Field Guide

Status: Week-1 execution companion
Primary source: Codex master brief Part 4

## Purpose

Run 30 interviews in 7 days before Vault engineering starts. The goal is not encouragement. The goal is a clean go, retest, pivot, or no-go decision.

## Interview Setup

- Duration: 30 minutes.
- Format: Zoom or Google Meet; use one consistently.
- Recording: ask consent before recording.
- Tone: research call, not sales call.
- Rule: after the $200 pitch, stop talking and let silence work.

## Opening Script

```text
Hey [name], thanks for taking 30 minutes. I'm Garrett, founder of Galaxy Sports Edge.

The goal of this call is research, not sales. I'm validating a premium subscription tier called Vault before I build it. I want to ask you about how you currently research sports bets, what works and doesn't, and get your reaction to a specific pitch.

There are no wrong answers. If something I describe sounds off, tell me. I'm going to record this if that's OK, just so I don't have to type while you talk. Ready?
```

## Section A - Background

1. How often do you bet on sports?
   - Tag: `frequency_tier`

2. What is your annual spend on sports betting, roughly?
   - Tag: `spend_tier`

3. Do you currently subscribe to any sports betting research products? Which?
   - Tag: `existing_subscriptions`
   - If never paid, flag `never_paid_for_research = TRUE`

## Section B - Existing Tools

4. Tell me about your relationship with your primary research product. What works?
   - Tag: `current_research_mode`

5. What is the most frustrating thing about your current research stack?
   - Tag: `top_frustration`
   - Capture verbatim.

6. If you canceled tomorrow, why would you?
   - Tag: `churn_driver`

## Section C - Galaxy Positioning

Share Galaxy and walk through Loss Room, Pass List, Ledger, and methodology.

7. First reaction: what does this seem to be?
   - Tag: `positioning_recognition`

8. We publish losses with autopsies, every game considered and not published, and refresh on a schedule. How does that read?
   - Tag: `transparency_reaction`

9. What is missing? What would make you trust Galaxy more?
   - Tag: `trust_gap`

10. Compared to your current paid tool, does Galaxy feel more or less trustworthy? Why?
    - Tag: `relative_trust`

## Section D - Vault Offer

Pitch:

```text
I am thinking about a premium tier above Elite called Vault. $200/year. Capped at 1,000 founding members.

Members get:

1. Weekly internal-rationale digest: I write the reasoning behind a major publication of the week, Wednesdays.
2. Monthly group office hours: 60 minutes on Discord, members ask anything about model, picks, losses, methodology.
3. Quarterly private data review: performance internals not in the public Almanac.
4. Early access to the Model Journal weekly draft.
5. Vault-only Discord channel.

$200 per year. How do you react?
```

Then stop talking.

11. Initial reaction.
    - Tag: `initial_reaction`

12. What would make Vault worth $200/year to you?
    - Tag: `lead_benefit`

13. What would make Vault feel overpriced?
    - Tag: `overprice_risk`

14. The first 1,000 are founding members. Does that change anything?
    - Tag: `scarcity_reaction`

15. Would you join the founding 1,000? Walk me through your decision.
    - Tag: `intent_to_join`

16. If no, what is the blocker?
    - Tag: `blocker_category`

17. If yes, what would you tell a friend about why?
    - Tag: `referral_message`
    - Capture verbatim.

## Section E - Wrap

18. What is one thing I should change about how I described Vault?
    - Tag: `pitch_feedback`

19. Would you be willing to be one of the first 50 founding members if Vault launches in [target month]?
    - Tag: `early_commit`

20. Anyone in your network I should talk to?
    - Tag: `referrals`

## What to Listen For

- Energy shifts at autopsies, Pass List, or price.
- Follow-up question quality.
- Specific benefit named without prompting.
- Exact vocabulary the prospect introduces.
- Whether the prospect moves from "interesting" to "I would pay."

## Politeness Filter

Mark `politeness_suspected = TRUE` if:

- No follow-up questions about the offer.
- Generic "sounds cool" answer without a named benefit.
- Multiple benefits named shallowly.
- Visible price tension at $200 but verbal yes.
- No meaningful response to founding-50 prompt.

Qualified yes excludes politeness-suspected responses.
