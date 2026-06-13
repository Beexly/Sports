# Privacy Review — Fan-Type Profiles & Room Presence (draft for owner sign-off)

> Status: **DRAFT** — written as the privacy-review gate for two staged
> features: fan-type on the user profile (NFL House Stage 1, item 4) and
> live-room presence (Stage 2). Neither ships until the owner signs the
> checklist at the bottom. Companion docs:
> `COMMUNITY_MODERATION_POLICY.md`, `docs/design/NFL_HOUSE_DOCTRINE.md`.

## What new data would be collected

| Datum | Feature | Sensitivity read |
|---|---|---|
| Fan type (one of ~6 labels: sharp bettor, film nerd, fantasy beginner, Sunday-only, learning football, here for the vibes) | Profiles | Low — a self-chosen content preference. But "learning football" + betting context implies inexperience; never expose it to other users or use it for offer targeting |
| Reader register (teach/plain/math) | Already live | Currently localStorage-only — no server storage, no account linkage. Moving it to the profile makes it account data; same rules as fan type |
| Presence (online/in-room indicator) | Live rooms | Medium — reveals when a person is active in betting-adjacent spaces, in real time |
| Message content + moderation log | Live rooms | Medium-high — UGC retained with actor attribution; distress signals may appear in content |

## Rules (proposed as law)

1. **Fan type and register are content-rendering preferences, period.**
   Never inputs to pricing, offers, upsells, or tier nudges. Behavior
   signals trigger support nudges, never marketing — the standing
   responsible-play law extends to these fields explicitly.
2. **No public exposure of fan type.** Other users never see it; no
   "beginner" badge anyone can target. (Moderation tooling MAY see it to
   protect beginners — that is its only cross-surface use.)
3. **Presence is opt-in, default off,** room-scoped (visible only inside
   the room you're in), and never historical (no "last seen 3h ago").
4. **Self-excluded users**: profile fields persist (so exclusion holds)
   but all room/presence features go dark — betting-adjacent spaces count.
5. **Retention**: messages per the moderation policy's audit needs
   (proposal: 12 months, then delete; moderation action log retained
   longer for legal defensibility). Fan type/register: live with the
   account, deleted with the account.
6. **Deletion path**: account deletion removes profile fields and
   anonymizes authored messages (content survives for thread coherence
   only if attribution is fully severed; otherwise delete).
7. **No model training on UGC** without separate consent — mirrors the
   rights posture we demand from sources we ingest.
8. **Distress content** (chasing language, self-harm references) routes
   to the support-nudge path; it is never used for engagement ranking.

## What this unblocks once signed

- Fan-type field on the user profile (schema: one nullable enum column;
  register follows the account instead of the browser)
- Presence plumbing for Stage-2 rooms (still behind moderation tooling)

## Open questions for the owner

1. 12-month message retention — right number?
2. Should fan type ever feed content *recommendations* (still not offers)?
   Proposal: yes, on-site ordering only, never email/push targeting.
3. Jurisdiction posture: if EU users are in scope, fan type + messages are
   personal data under GDPR — confirm the deletion path above satisfies
   the erasure timeline you want to commit to (30 days proposed).

## Sign-off

- [ ] Owner approves rules 1–8 (amendments in this file)
- [ ] Retention numbers confirmed (messages, moderation log)
- [ ] EU/GDPR posture confirmed
- [ ] THEN: fan-type schema migration may ship (Stage 1)
- [ ] THEN: presence may ship behind moderation tooling (Stage 2)
