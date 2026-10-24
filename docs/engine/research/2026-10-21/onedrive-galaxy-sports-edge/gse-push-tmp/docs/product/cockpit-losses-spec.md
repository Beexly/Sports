# `/cockpit/losses` — Page Specification

**Status:** Phase 3 build. Operator-only surface for authoring `LossAutopsy` entries.
**Owner of code:** Codex.
**Owner of layout + autopsy voice rules:** Claude.
**Location:** `apps/web/app/cockpit/losses/page.tsx`, `apps/web/app/cockpit/losses/[id]/page.tsx`, supporting components in `apps/web/components/cockpit/losses/`.
**Companion specs:** `docs/product/ledger-and-loss-room-spec.md` (public Loss Room product), `docs/product/galaxy-memory-persistence-spec.md` (Memory cross-references).

---

## TL;DR

The operator workspace for authoring `LossAutopsy` entries on settled losses. Lists all settled losses awaiting autopsy, draft + author flow, publish to the public Loss Room at `/performance/losses/[id]`.

Autopsies are the core of Galaxy's transparency posture. Done right, they're the strongest moat against tout-coded competitors. Done wrong (defensive, exculpatory, blame-external-factors), they become marketing dressed as honesty.

This UI exists to make right easy and wrong hard.

---

## Route shape

- `/cockpit/losses` — landing page; lists settled losses needing autopsies + drafts in progress + published autopsies.
- `/cockpit/losses/[id]` — autopsy editor for one settled loss.
- `/cockpit/losses/[id]/preview` — preview of how the autopsy renders on the public `/performance/losses/[id]` surface.

Authentication: operator role required.

---

## Landing page layout (`/cockpit/losses`)

```
┌──────────────────────────────────────────────────────────────┐
│ Loss Autopsies — Operator Workspace                          │
│                                                              │
│ ⚠ NEEDS AUTOPSY (4)                                          │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ LAL +145 @ GSW (NBA) — settled 2026-05-15 ❌ LOSS    │    │
│ │ Pre-mortem cited: rest, venue form, line movement     │    │
│ │ [Start autopsy]                                       │    │
│ └──────────────────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ MIN +6 @ PIT (NFL) — settled 2026-05-18 ❌ LOSS      │    │
│ │ Pre-mortem cited: schedule stress, rest, consensus    │    │
│ │ [Start autopsy]                                       │    │
│ └──────────────────────────────────────────────────────┘    │
│ ...                                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ DRAFTS IN PROGRESS (1)                                       │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ TOR @ BOS MLB — last saved Saturday 9:42am ET        │    │
│ │ Root cause: VARIANCE (working draft)                  │    │
│ │ [Continue draft]                                      │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ PUBLISHED AUTOPSIES (most recent 20)                         │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ NYK +3.5 @ MIA (NBA) — published 2026-05-10           │    │
│ │ Root cause: INJURY_SHOCK                              │    │
│ │ Pre-mortem coverage: INCOMPLETE                       │    │
│ │ [View public] [Edit cross-refs only]                  │    │
│ └──────────────────────────────────────────────────────┘    │
│ ...                                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Authoring editor layout (`/cockpit/losses/[id]`)

```
┌──────────────┬──────────────────────────────┬──────────────┐
│ LEFT RAIL    │  CENTER (editor)             │ RIGHT RAIL   │
│              │                              │              │
│ Pick context │  HEADLINE (≤140 chars)       │ Pre-mortem   │
│ Game ID      │  [text input]                │ tagging:     │
│ Final score  │                              │              │
│ Outcome: L   │  WHAT WE SAW                 │ Bullets at   │
│ Pick: -3.5   │  [markdown editor]           │ publish:     │
│ Confidence:  │                              │ - Rest adv   │
│ 68%          │  WHAT HAPPENED               │ - Venue form │
│ Pre-mortem:  │  [markdown editor]           │ - Line move  │
│ 4 bullets    │                              │ - Data qual  │
│              │  WHAT WE LEARNED             │              │
│ Model        │  [markdown editor]           │ For each:    │
│ version at   │                              │ [ ] CALLED   │
│ publish:     │  ROOT CAUSE                  │ [ ] DID NOT  │
│ v6.0.3       │  [enum dropdown]             │     HAPPEN   │
│              │                              │              │
│ Settled at:  │  LESSON TAGS                 │ Missed       │
│ 2026-05-15   │  [tag input]                 │ cause flag:  │
│ T02:00:00Z   │                              │ [ ] check if │
│              │  PUBLIC?                     │ root cause   │
│              │  ☐ public  ☐ draft           │ was NOT in   │
│              │                              │ any bullet   │
│ Actions:     │  [Save draft] [Preview]      │              │
│ - Discard    │  [Run compliance scan]       │ Compliance   │
│   draft      │  [Publish]                   │ flags        │
│              │                              │              │
└──────────────┴──────────────────────────────┴──────────────┘
```

---

## Authoring constraints (UI-enforced)

The editor enforces the autopsy voice rules from `docs/product/ledger-and-loss-room-spec.md`. Specifically:

1. **`whatWeSaw`, `whatHappened`, `whatWeLearned` are all required.** Save-as-draft works without them but publish requires all four narrative fields.
2. **`rootCause` is a required enum selection.**
3. **`headline` is hard-capped at 140 chars.**
4. **`whatWeLearned` MUST commit to one of three outcomes** (UI hint, not enforcement, since it's free-text): (a) this changes factor weight X, (b) this is variance, (c) this is a known limitation we'll address in model version N. The right rail surface shows a reminder above the field.
5. **`isPublic` defaults to FALSE.** Operator explicitly opts in to publish.

---

## Pre-mortem comparison (right rail)

For each bullet in the pick's pre-mortem at publish:

- The bullet text is shown.
- Operator tags each as `CALLED` or `DID_NOT_HAPPEN`.

Separately, operator checks "Pre-mortem missed the actual cause" — auto-checked when the rootCause's expected factor doesn't match any bullet's `factorKey` (using the mapping from `lib/pre-mortem/compare.ts`).

This drives the Loss Room comparison panel + Twitter bot post-mortem thread content + the Galaxy Memory comparison data.

---

## Compliance scanner integration

Before publish, the scanner runs against the concatenated narrative fields (`headline + whatWeSaw + whatHappened + whatWeLearned`). Hard refuses on:

- Banned vocabulary.
- Exculpatory language ("tough loss," "back tomorrow," "the refs," "bad luck").
- Blame-external-factors framing.
- Aggregate win-rate claims.
- Competitor comparisons.

Yellow on:

- Hedging language ("might have been," "could be argued").
- Defensive framing ("we still believe").

The scanner runs with `getRulesForTemplate('LOSS_AUTOPSY')` — autopsy-specific layer 3 rules layered on top of platform-wide layers 1+2.

---

## Publish flow

When operator clicks Publish:

1. All required fields validated.
2. Compliance scanner runs final pass. Block if red.
3. Modal confirms: "Publish autopsy to /performance/losses/[id]? It will surface in the public Loss Room and link from the relevant Game Room's Galaxy Memory slot."
4. Status: `DRAFT` → `PUBLISHED`. `authoredAt` already set on draft creation; doesn't change.
5. Cross-references propagate:
   - Game Room's Galaxy Memory slot links to this autopsy.
   - Ledger row gets a 📋 Autopsy badge.
   - If a Model Journal entry is in DRAFT and references this game, its draft view shows the newly-published autopsy.
   - Twitter bot's post-mortem thread queue gets this autopsy's content for the next bot cycle.

---

## Edit-after-publish behavior

Same as Model Journal: append-only.

- Body fields (headline, what-we-saw, what-we-happened, what-we-learned) are immutable after publish.
- `lessonTags` can be appended to but not removed.
- `evidenceRefs` can be appended.
- Cross-references append automatically.
- Retraction available via the right rail "Retract" button. Requires decision-log entry. Public surface returns 410 Gone.

---

## Hard refusals (UI-enforced)

- UI MUST NOT publish without all narrative fields filled.
- UI MUST NOT bypass compliance scanner on red status.
- UI MUST NOT support body edits on `PUBLISHED` entries.
- UI MUST NOT delete autopsies. Retraction is the only removal mechanism.
- UI MUST NOT auto-suggest narrative text via Claude API. The author writes the autopsy. (Phase 5+ may add a "draft helper" that suggests structure, but content stays operator-authored.)

---

## Acceptance criteria (Phase 3 cockpit/losses v0 → green)

1. Operator authentication enforced.
2. Landing page shows three sections (needs autopsy / drafts / published).
3. "Needs autopsy" list is auto-populated from settled losses without a `LossAutopsy` row.
4. Authoring editor renders pick context + 4 narrative fields + rootCause + lessonTags + visibility toggle.
5. Pre-mortem tagging right rail shows each bullet and accepts CALLED / DID_NOT_HAPPEN selection.
6. Compliance scanner runs on submit.
7. Publish triggers cross-references in Galaxy Memory + Ledger row badge.
8. Edit-after-publish prevents body changes.
9. Retraction flow requires decision-log entry.
10. NO body-edit endpoint exists on the route handler for PUBLISHED entries.
11. NO auto-draft via Claude API for the narrative fields.

When all 11 hold, cockpit/losses v0 is shippable.

---

## Open items

- **OPEN-CKP-LOS-1:** Should the editor auto-save drafts? Default: yes, every 30s.
- **OPEN-CKP-LOS-2:** Should there be a "deadline" — e.g., autopsies must be published within 7 days of settlement? Default: no hard deadline; the Public Ledger shows "autopsy pending" indefinitely. Phase 4+ may add a soft alert if 14+ days pass.
- **OPEN-CKP-LOS-3:** Should authors other than the operator (e.g. a guest contributor in Phase 6+ multi-contributor model) be supported? Default: no in v0. `authorEmail` is locked to the cockpit-authenticated operator.

---

*Spec authored by Claude. Codex implements. Autopsy voice rules locked. Append-only persistence locked.*
