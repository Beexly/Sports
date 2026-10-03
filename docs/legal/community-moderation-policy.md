# Galaxy Community Moderation & Safety Policy (v1 — 2026-06-12)

The prerequisite for opening ANY live room (Sunday Couch, Brotherhood
Table, No-Shame Room — `docs/design/NFL_HOUSE_DOCTRINE.md` Stage 2).
No real-time UGC surface ships until every requirement here has an
implemented, tested counterpart. This document is the gate; code follows it.

## Principles (from House rules — non-negotiable)

1. **Protect beginners.** The basic question is always welcome; mocking a
   beginner is a removable offense.
2. **We do not force action. We protect decision quality.** No pressure to
   bet, no shame for sitting out, no chasing-losses dynamics, ever.
3. **No manufactured certainty.** Community "locks"/"free money"/"guaranteed"
   talk gets the same treatment as our own copy: it does not stand. The
   trust-claims registry applies to surfaces we operate, and visible hype in
   rooms gets moderator action + an education nudge, not amplification.
4. **Disagreements require reasons.** Attack the read, never the person.
5. **Privacy by default.** Display names only; no real-name requirement; no
   location surfacing; profile fan-type is self-chosen and editable/deletable.

## Hard rules (removal + escalation ladder)

- Harassment, hate, threats, doxxing → immediate removal; repeat → ban.
- Selling picks, paid-group recruiting, affiliate/tout funnels → removal.
  (Triage law: nothing that re-enters gambling-tout territory.)
- Encouraging chasing losses, mocking No-Bet discipline, "you're soft if
  you don't bet" → removal + responsible-play nudge to the audience.
- Underage indicators → immediate ban + account review.
- Self-harm or gambling-harm signals → respond with the helpline
  (`HELPLINE` in `lib/brand.ts`) via a vetted template; never moderate-and-
  ignore. Behavior signals trigger responsible-play nudges, NEVER upsells
  (standing law from `responsible-gaming.ts` triage).

## Operational requirements (each must exist before launch)

| Requirement | Definition of done |
|---|---|
| Human moderation coverage | A named operator on duty for every scheduled live window; rooms close when nobody is on duty — no unmoderated hours |
| Report flow | Every message reportable in ≤2 taps; reports hit a cockpit queue with full context |
| Rate limits + slow mode | Per-user message rate limits; slow mode toggleable live |
| Word/pattern gate | The trust-claims banned list + harassment patterns pre-filter at post time (server-side) |
| Audit log | Immutable log of removals/bans with reason codes — accountability applies to us too |
| Appeals | A removal can be appealed; appeals reviewed by a human |
| Privacy review | Data inventory for messages/presence/profiles signed off before launch; retention window defined (default: messages 90 days, then purge) |
| Responsible-play integration | Helpline pinned in every room; harm-signal template wired |
| Age gate | Rooms inherit the platform's age requirements; no separate teen surface |

## Launch sequence

1. This policy merged + cockpit moderation queue built and tested.
2. Closed pilot: one room (Sunday Couch), one game window, invite-only,
   two moderators, full debrief.
3. Owner reviews pilot debrief → go/no-go on general availability.
4. The Beat remains the open (non-chat) surface throughout.

## What we will not build

- Engagement mechanics that reward volume over quality (streak-shaming,
  loudest-voice leaderboards). Leaderboards, if ever, rank verified
  decision quality — per triage law.
- Behavioral profiling for monetization. Behavior data serves safety
  nudges only.
- Anonymous-but-trackable dark patterns. What we collect is disclosed.
