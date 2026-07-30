# Moderator Coverage Plan — Galaxy Sports Edge Community Rooms

> Status: **ADOPTED** (2026-06-13). Satisfies the "Moderator coverage plan for
> live windows" checklist item in `docs/legal/COMMUNITY_MODERATION_POLICY.md`.
>
> Rooms do not open until every checklist box in that policy is checked.
> This document ticks one box; the others (privacy review, responsible-play
> signal pipeline hook) are tracked in the policy doc itself.

---

## 1. Coverage Philosophy — Presence Hours, Not 24/7

Galaxy Sports Edge is a solo-founder product. Live rooms open **only during
windows when the founder or a deputized moderator is actually present**. Rooms
have presence hours, not always-on access. A room that is closed is not a
failure — it is the right call when coverage cannot be guaranteed.

The culture line from the foundation directive governs every moderation
decision: **"We do not force action. We protect decision quality."**

---

## 2. Coverage Windows

These are the minimum windows for which a moderator must be present before a
room opens. Rooms open at window start and close at window end — no exceptions
for late arrivals.

| Window | Days | Open | Close | Notes |
|---|---|---|---|---|
| **Sunday Slate** (required minimum) | Sunday | 12:00 ET | 23:30 ET | Covers early + late NFL slate + SNF |
| **Monday Night Football** | Monday (NFL season) | 19:00 ET | 23:30 ET | MNF window only |
| **Thursday Night Football** | Thursday (NFL season) | 19:00 ET | 23:30 ET | TNF window only |
| **Ad hoc events** | As announced | Event start −30 min | Event end +30 min | Founder discretion; must be announced 24 h in advance |

Off-season: rooms remain closed unless the founder explicitly opens an ad hoc
window and coverage is confirmed.

---

## 3. Roles Per Window

Every open window requires at minimum:

| Role | Requirement | Responsibility |
|---|---|---|
| **Primary Moderator** | 1 person minimum — founder or a deputized moderator | Active in the room during the full window; first responder on reports |
| **Escalation Contact** | 1 person reachable (founder if primary is a deputy) | Reachable within 15 minutes via a confirmed channel (not just the room) |

A deputized moderator is a person who has:
1. Read and acknowledged this plan and `docs/legal/COMMUNITY_MODERATION_POLICY.md`
2. Received a walkthrough of the moderation tooling (`/cockpit/moderation`)
3. Been added to the escalation contact list by the founder

No one moderates a live window without completing those three steps.

---

## 4. Response-Time Targets

| Event | Target |
|---|---|
| Report acknowledgement (report button press) | Within 5 minutes during an open window |
| Distress nudge delivery | Immediate — automated where the pipeline supports it; manual within 2 minutes otherwise |
| Content removal (Rule violation) | Within 10 minutes of report acknowledgement |
| Escalation contact reach (for ban/suspend decisions) | Within 15 minutes |
| Appeal decision (SUSPEND or BAN) | Within 7 days of appeal filing (policy SLA from `moderation.ts`) |

**Distress nudge immediacy is non-negotiable.** The detection law
(`lib/community/distress-signals.ts`, built 2026-06-13) is designed to support
automated immediate response once the rooms message pipeline hooks into
`detectDistressSignals`. Until that pipeline hook lands, the primary moderator
is responsible for manual monitoring during every open window.

---

## 5. Escalation Path

The moderation ladder from `docs/legal/COMMUNITY_MODERATION_POLICY.md` and
`lib/community/moderation.ts` is the governing reference. Summary:

```
NUDGE (first soft violation, no penalty)
  ↓
REMOVE (content down, reason shown to author)
  ↓
MUTE_24H → MUTE_7D (room-level silence, time-boxed)
  ↓
SUSPEND (account-level, time-boxed, appealable within 7 days)
  ↓
BAN (permanent; reserved for hate, threats, doxxing, repeat touting,
     self-exclusion circumvention — may skip ladder)
```

**Straight-to-BAN reasons** (may bypass lower rungs): HATE_SPEECH, THREATS,
DOXXING, SELF_EXCLUSION_CIRCUMVENTION. See `STRAIGHT_TO_BAN_REASONS` in
`lib/community/moderation.ts`.

**Appeal rule**: any SUSPEND or BAN can be appealed once. A *different*
reviewer from the original actor decides. Decision within 7 days.

**Escalation to founder**: when the primary moderator is a deputy, any SUSPEND
or BAN decision must be confirmed with the founder before execution unless
time-critical (e.g. active threat in the room). Document the reason in the
action log.

---

## 6. Tooling References

| Tool | Location | Purpose |
|---|---|---|
| Moderation cockpit | `/cockpit/moderation` | Report queue, action history, appeal flow |
| Action ladder | `lib/community/moderation.ts` | Pure law — ladder order, straight-to-ban, appeal eligibility |
| Action store | `lib/community/moderation-actions.ts` | DB-backed operations (takeAction, fileReport, decideAppeal) |
| Distress detection | `lib/community/distress-signals.ts` | detectDistressSignals(), routeDistress() — pipeline hook lands with rooms |
| Policy | `docs/legal/COMMUNITY_MODERATION_POLICY.md` | Full policy including the three protections and hard rules |

Every moderation action is logged with actor, reason, and content reference.
This is not optional — `assertActionLoggable()` in `moderation.ts` throws if
actor or reason is missing.

---

## 7. Staffing Reality — Solo-Founder Mode

The platform launches under solo-founder operating conditions. That means:

- **Rooms open only when the founder can personally staff them**, or a
  deputized moderator (see §3) is confirmed available for the full window.
- There is no background moderation. If a window cannot be covered, the room
  does not open. The community page will show a "Room closed" state rather
  than an unmoderated live room.
- Deputized moderators are added as capacity grows. Each deputy requires the
  three-step acknowledgement above before staffing a window solo.
- This plan is the floor. It is designed to be honest about what is achievable
  at founder scale rather than promising 24/7 coverage that cannot be delivered.

---

## 8. Policy Checklist Status

From `docs/legal/COMMUNITY_MODERATION_POLICY.md` launch checklist:

| Item | Status |
|---|---|
| Written moderation policy | ✅ Adopted |
| Moderation tooling: report button, action ladder, audit log, appeal flow | ✅ Data layer + queue built (2026-06-12); UI hooks land with rooms |
| Privacy review: profiles, presence, message retention, data-deletion | ☐ Pending |
| Responsible-play signal wiring (nudges live before rooms do) | ☐ Detection law built 2026-06-13 — `lib/community/distress-signals.ts`; pipeline hook lands with rooms |
| **Moderator coverage plan for live windows (Sunday slate minimum)** | ✅ **This document (2026-06-13)** |

Rooms do not open until every box is checked. Owner sign-off required.
