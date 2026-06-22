# GSE 2026 — Memory & Personalization (Workstream G)

> **Status:** INTERNAL research doc. Companion to `apps/web/lib/gse/memory-policy.ts`.
> **Doctrine alignment:** Aligns to the existing memory system in `apps/web/lib/memory/*`,
> `apps/web/lib/jarvis/memory/*`, and the cockpit memory review queue
> (`apps/web/app/cockpit/memory/page.tsx`). The governing rule there is the rule here:
> **only CONFIRMED memories are recalled; candidates are never treated as facts.**
> Existing `MemoryStatus` is `CANDIDATE → NEEDS_OWNER_REVIEW → APPROVED → REJECTED → ARCHIVED`
> (`apps/web/lib/memory/memory-types.ts`). This doc formalizes the policy; the code is source of truth.

---

## 0. Memory principle

> **Memory exists to make decisions better — never to make the user easier to manipulate.**

Three tests gate every byte we keep:

1. **Decision value** — does remembering this measurably improve a future decision or save the user effort?
2. **Non-creepiness** — would the user be comfortable seeing this in a plain-English review queue?
3. **Non-manipulation** — could this be used to nudge against the user's interest? If yes, it is not stored,
   or it is stored as inert preference, never as a persuasion lever.

If a memory fails any test, it is not stored. When in doubt, don't remember — or store a candidate the
owner/user can reject. **A candidate is not a fact.** Candidates inform the review queue; they never feed
recommendations until confirmed.

---

## 1. Memory type framework

Each memory TYPE is specified along the same 11 axes:

| Axis | Question |
|---|---|
| **Can store** | What is legitimately captured. |
| **Must NOT store** | Hard exclusions. |
| **Requires consent** | What needs explicit opt-in before capture/use. |
| **Stays local** | What never leaves the device/session. |
| **Private** | What is never shown to anyone but the subject (or owner, for business). |
| **User-visible** | What the user can see in their memory ledger. |
| **Deletable** | What the user can erase, and the effect of erasing it. |
| **Feeds recommendations** | Whether/how it influences output (confirmed-only). |
| **Staleness decay** | How it ages out / loses weight. |
| **Audited** | What is logged about its creation/use. |

---

## 2. Type: User Preference Memory

- **Can store:** declared and inferred preferences — favorite sports/leagues/teams to follow, risk appetite,
  notification cadence, UI density, default views, confidence-display preference.
- **Must NOT store:** sensitive personal attributes, financial account data, health/wagering-disorder inferences,
  anything resembling a manipulation profile.
- **Requires consent:** any *inferred* preference (vs. explicitly set) before it influences recommendations.
- **Stays local:** ephemeral session UI state (scroll, last tab) — never persisted server-side.
- **Private:** yes — preferences are per-user and not shared or sold.
- **User-visible:** fully — every stored preference is shown and editable.
- **Deletable:** yes; deletion reverts to defaults immediately.
- **Feeds recommendations:** yes (confirmed only) — to order/filter, never to pressure. Personalization is transparent ("shown because you follow X").
- **Staleness decay:** inferred prefs decay if behavior stops supporting them; re-confirmed on use.
- **Audited:** logs source (declared vs inferred) + last update.

## 3. Type: Decision History Memory

- **Can store:** the user's own past decisions (picks viewed/acted on, lineups set, start/sit, trades), the
  evidence shown at the time, and how they settled.
- **Must NOT store:** decisions reframed as guarantees; any banned-token phrasing; bets placed off-platform we
  weren't given (we don't infer external wagering).
- **Requires consent:** linking decision history into coaching/recommendations beyond the user's own review.
- **Stays local:** drafts/unsaved decisions until the user commits them.
- **Private:** yes — a user's decision history is theirs.
- **User-visible:** fully — this is the spine of Autopsy Mode and the user's own track record.
- **Deletable:** yes; deletion removes it from coaching inputs (may reduce personalization quality — disclosed).
- **Feeds recommendations:** yes (confirmed) — for process-vs-variance coaching, never to shame or upsell.
- **Staleness decay:** old seasons down-weighted but retained for long-run calibration unless deleted.
- **Audited:** logs decision + the point-in-time evidence snapshot (immutable).

## 4. Type: League Memory

- **Can store:** structure and dynamics of a user's fantasy leagues — scoring settings, roster rules,
  rivalries, trade history *within that league*, manager tendencies the user observes.
- **Must NOT store:** other members' personal data beyond what's needed for league function; private info about
  third parties without their basis; anything that profiles non-users.
- **Requires consent:** using one member's data to advise another; cross-league sharing.
- **Stays local:** speculative trade scenarios until acted on.
- **Private:** scoped to the league + the requesting user; not exposed across leagues.
- **User-visible:** yes — rendered as the League Memory Graph (§13).
- **Deletable:** yes per-league; deletion detaches the league from advice.
- **Feeds recommendations:** yes (confirmed) — waiver/trade/draft advice tuned to that league's reality.
- **Staleness decay:** settings refreshed each season; stale rosters flagged before use.
- **Audited:** logs league config source + last sync.

## 5. Type: Model Memory

- **Can store:** lessons about model behavior — features that helped/hurt, calibration drift, situations where
  confidence was miscalibrated (`MODEL_LESSON`, `CALIBRATION_LESSON`, `PROJECTION_FEATURE_DECISION` candidates).
- **Must NOT store:** user PII; fabricated post-hoc rationalizations; results-only "lessons" with no process basis.
- **Requires consent:** N/A for users; **owner approval required** to promote a candidate to an applied lesson.
- **Stays local:** N/A — model memory is system-level, not device-local.
- **Private:** internal; not user-facing except as improved calibration.
- **User-visible:** indirectly (calibration improves); the public track record reflects outcomes, not internals.
- **Deletable:** owner can reject/archive a lesson; applied lessons are versioned and reversible.
- **Feeds recommendations:** only after owner approval (confirmed). Candidates never alter live scoring.
- **Staleness decay:** lessons re-validated against fresh outcomes; ones that stop holding are archived.
- **Audited:** every candidate, approval, and application is logged (auditable model versioning per CLAUDE.md).

## 6. Type: Business Memory (owner-only)

- **Can store:** owner decisions, sprint outcomes, pricing/gate decisions, support patterns, blockers, data-rights
  decisions (`OWNER_DECISION`, `SPRINT_OUTCOME`, `PUBLIC_GATE_DECISION`, `DATA_RIGHTS_DECISION`, `BLOCKER`, `SUPPORT_PATTERN`).
- **Must NOT store:** secrets/keys (env-only per CLAUDE.md); subscriber PII beyond what billing requires;
  anything that would weaponize subscriber data.
- **Requires consent:** N/A users; **owner-gated** for sensitive (HIGH-sensitivity) items.
- **Stays local:** N/A.
- **Private:** owner-only; never exposed on public/subscriber surfaces.
- **User-visible:** no (not subscriber-visible); fully owner-visible.
- **Deletable:** owner can archive/reject; audit record of the decision persists.
- **Feeds recommendations:** yes for the Founder Cockpit / Revenue Strategist (confirmed, owner-gated).
- **Staleness decay:** decisions retained for institutional memory; superseded ones archived, not deleted.
- **Audited:** full log — this is the company's decision record.

## 7. Type: Agent Memory

- **Can store:** inter-agent handoffs, source-reliability lessons, historical-data lessons
  (`AGENT_HANDOFF`, `SOURCE_RELIABILITY_LESSON`, `HISTORICAL_DATA_LESSON`).
- **Must NOT store:** unbounded free-form agent "beliefs" that bypass review; cross-agent gossip about users.
- **Requires consent:** owner approval to promote a candidate into routing/behavior.
- **Stays local:** N/A.
- **Private:** internal to the council; surfaced to owner in the war room.
- **User-visible:** no.
- **Deletable:** owner reject/archive; routing changes are reversible.
- **Feeds recommendations:** only confirmed handoffs/lessons influence routing; candidates inform the queue only.
- **Staleness decay:** reliability lessons decay as source behavior changes; re-checked on use.
- **Audited:** every handoff + lesson logged with originating agent + sensitivity.

---

## 8. Cross-cutting invariants

1. **Confirmed-only recall.** No `CANDIDATE` / `NEEDS_OWNER_REVIEW` memory is ever recalled as a fact or fed
   to a recommendation. Only `APPROVED` flows downstream. (Mirrors `apps/web/app/cockpit/memory/page.tsx`.)
2. **Candidate ≠ fact.** Candidates populate the review queue; they are visibly labeled as proposals.
3. **Sensitivity tiering.** `LOW | MEDIUM | HIGH` (existing). HIGH always owner-gated; never auto-applied.
4. **Point-in-time integrity.** Stored evidence snapshots (and `RightsSnapshot`s) are immutable — never mutated.
5. **Decay, don't hoard.** Stale memory loses weight and is flagged; freshness is validated before use.
6. **Transparency by construction.** If a memory shaped an output, the output can say *why* ("because you…").
7. **No manipulation vectors.** Memory may inform helpfulness; it may never be used to push a user against
   their stated interests or to exploit a vulnerability.

---

## 9. Design: The Memory Ledger

A single append-only, auditable record of every memory's lifecycle.

- **Record shape (aligned to existing `MemoryCandidate`):** `id`, `type` (from `MEMORY_TYPES`), `title`,
  `summary`, `source`, `createdByAgent`, `sensitivity`, `status`, `ownerApprovalRequired`, `relatedArtifact`,
  `createdAt`, `reviewedAt`, `rejectedReason`.
- **Lifecycle:** `CANDIDATE → NEEDS_OWNER_REVIEW → APPROVED | REJECTED → (later) ARCHIVED`.
- **Guarantees:** append-only history (status transitions logged, never silently overwritten); every recall
  cites the ledger entry; rejected/archived entries never feed recommendations.
- **Who writes:** agents emit candidates; only owner/user review promotes them per scope (business = owner,
  personal = user).
- **Surfaces:** owner queue at `apps/web/app/cockpit/memory/page.tsx`; user-facing ledger for personal memory.

## 10. Design: User Strategy Profile

A transparent, user-owned summary of how the platform personalizes for them.

- **Contains:** declared preferences, risk appetite, followed sports/teams, notification settings, a *labeled*
  set of inferred tendencies (each with "because…" provenance and an accept/dismiss control).
- **Built from:** confirmed user-preference + decision-history memory only.
- **Controls:** every line is editable; inferred lines can be rejected; "reset personalization" wipes inferences.
- **Use:** Jarvis reads it to order/weight recommendations transparently — never to apply hidden pressure.
- **Privacy:** per-user, private, never shared/sold; export + delete supported (§14).

## 11. Design: League Memory Graph

A per-user graph modeling each fantasy league's reality.

- **Nodes:** league (settings, scoring), teams/managers (the user's own + observed tendencies), assets (players,
  picks), the user's roster.
- **Edges:** ownership, trade history (in-league), rivalry, waiver claims, keeper relationships.
- **Sourced from:** confirmed league memory + the user's own inputs; refreshed each season.
- **Use:** powers Waiver/Trade/Draft/Roster Coach advice tuned to that exact league.
- **Boundaries:** does not profile non-users beyond league function; not shared across leagues without consent.

## 12. Design: Jarvis Memory Policy

The runtime contract Jarvis obeys when reading/writing memory.

1. **Read:** confirmed memory only; scope-checked (user can't read another user's; only owner reads business).
2. **Write:** Jarvis/agents emit **candidates**, never facts; promotion requires the proper review.
3. **Recall transparency:** any memory that shaped an answer is attributable in the deep dive.
4. **Sensitivity respect:** HIGH-sensitivity items are owner-gated and excluded from non-owner surfaces.
5. **Decay aware:** stale memory is down-weighted/flagged; freshness validated before recall.
6. **Deletion honored immediately:** deleted memory is excised from all recall paths on the next request.
7. **No banned-token leakage:** memory summaries are scanned; tout/casino phrasing is rejected at write time.

## 13. Privacy / trust language (user-facing copy guidance)

Plain, honest, non-creepy. Examples of the intended *tone* (final copy lives in product, not here):

- "We remember this to make your picks and advice more useful — not to pressure you."
- "You can see, edit, export, or delete everything we remember about you."
- "Guesses we make about your preferences are labeled as guesses. You can dismiss any of them."
- "We never sell your data, and we never use what we remember to push you toward decisions that aren't in your interest."

Forbidden in trust copy (and everywhere): the banned tokens from CLAUDE.md / Workstream F (e.g., "guaranteed",
"risk-free", "verified track record", etc.). Trust copy must not over-promise.

## 14. Memory deletion / export path

A first-class, user-initiated flow (privacy-by-design):

- **Export:** user (or owner, for business memory) can export their full ledger — machine-readable (JSON) +
  human-readable — including type, summary, source, status, timestamps. Excludes secrets and other users' data.
- **Delete (selective):** remove individual memories; effect on personalization is disclosed before confirm.
- **Delete (all / reset personalization):** wipes personal memory + inferred profile; reverts to defaults.
- **Propagation:** deletion removes the memory from every recall path and recommendation input on next request;
  immutable audit *of the deletion event* is retained (we log that you deleted, not the deleted content).
- **Scope rules:** users manage personal/decision/league memory; owner manages business/model/agent memory.
  No path lets one user delete or read another user's memory.

---

## 15. How memory feeds recommendations (influence matrix)

Recommendation influence is **confirmed-only** and **transparent**. The matrix below states, per type,
whether it may shape an output and the maximum strength of that influence. "Order/weight" = may reorder or
re-weight options; "Constrain" = may rule options in/out; "Inform tone" = may adjust explanation, not the call.

| Type | May influence? | Max strength | Always disclosed? |
|---|---|---|---|
| User preference | Yes (confirmed) | Order/weight | Yes ("shown because you…") |
| Decision history | Yes (confirmed) | Inform tone + coaching | Yes |
| League memory | Yes (confirmed) | Constrain (league rules) | Yes |
| Model memory | Yes (owner-approved) | Alters scoring (versioned) | Via calibration, indirectly |
| Business memory | Owner surfaces only | Order/weight (owner) | Owner-facing |
| Agent memory | Routing only (confirmed) | Constrain routing | War-room visible |

Hard limit: **no memory may push a user toward higher risk against their stated interest.** The Responsible
Decision agent (Workstream H) re-checks personalized output for exactly this.

### Staleness & decay policy (per type)

Stale memory is never deleted automatically (that would erase audit history); instead it **loses weight,
is flagged, and is re-confirmed on use.** Default horizons below are starting points, not hard rules.

| Type | Decay signal | Default horizon | On staleness |
|---|---|---|---|
| User preference (inferred) | behavior stops supporting it | weeks | down-weight, re-surface for confirm |
| Decision history | season boundary | multi-season retained | old seasons down-weighted, kept for calibration |
| League memory | new season / settings change | per season | force re-sync before advising |
| Model memory | calibration drift / outcomes | rolling | re-validate; archive if it stops holding |
| Business memory | superseded decision | indefinite (institutional) | mark superseded, archive, never delete |
| Agent memory | source behavior change | rolling | re-check reliability before recall |

## 16. Worked example (illustrative — not real user data)

> *Walks the full lifecycle so the policy is concrete. Names/values are placeholders.*

1. **Capture (candidate).** User repeatedly sets conservative lineups. The system emits a candidate:
   `{ type: USER_PREFERENCE-equivalent, title: "Prefers lower-variance lineups", source: "behavior", sensitivity: LOW, status: CANDIDATE }`.
   It does **not** yet influence anything.
2. **Review.** The candidate appears in the user's Strategy Profile as a *labeled guess* with accept/dismiss.
   (For business/model/agent memory the owner reviews it in `/cockpit/memory`.)
3. **Confirm.** User accepts → status becomes `APPROVED`. Only now may it weight recommendations.
4. **Recall (transparent).** DFS Optimizer biases toward floor; Jarvis says *"weighted toward your lower-variance preference."*
5. **Decay.** If the user then builds three high-ceiling lineups, the preference loses weight and is re-surfaced for confirmation.
6. **Delete.** User removes it → excised from all recall paths on the next request; only the deletion *event* is logged.

At no point does the candidate act as a fact, and at no point is the preference used to push the user toward
*more* risk than they want. This is the whole policy in one trace.

## 17. Mapping to existing code (do not duplicate)

| This doc | Existing implementation |
|---|---|
| Memory types + status enum | `apps/web/lib/memory/memory-types.ts` (`MEMORY_TYPES`, `MemoryStatus`, `MemoryCandidate`) |
| Candidate runtime | `apps/web/lib/memory/memory-candidate-runtime.ts` |
| Review queue (confirmed-only recall) | `apps/web/lib/memory/memory-review-queue.ts`, `apps/web/app/cockpit/memory/page.tsx` |
| Jarvis memory access | `apps/web/lib/jarvis/memory/*` |
| Rights snapshots (immutable) | `apps/web/lib/scraping/*` (`RightsSnapshot`) |

**Caveat:** Exact field semantics, whether export/delete flows already exist, and which decay rules are
implemented vs. proposed are **(uncertain)** from this doc — verify against the files above. The code is
source of truth; this doc is the policy contract it should satisfy.
