# `/cockpit/journal` — Page Specification

**Status:** Phase 3 build. Operator-only surface.
**Owner of code:** Codex.
**Owner of layout + voice:** Claude.
**Location:** `apps/web/app/cockpit/journal/page.tsx`, `apps/web/app/cockpit/journal/[entryId]/page.tsx`, supporting components in `apps/web/components/cockpit/journal/`.
**Companion spec:** `docs/product/model-journal-spec.md` (the product).

---

## TL;DR

The operator workspace for the weekly Model Journal essay. Codex's Friday data-pipe collects the week's settled-pick data + autopsies + pre-mortem tags + factor changes. Saturday's drafting job calls Claude API with the canonical drafting prompt. Owner reviews + edits + publishes Sunday morning at `/cockpit/journal/[entryId]`.

Not public. Not Pro/Elite-accessible. Pure operator surface.

---

## Route shape

- `/cockpit/journal` — landing page, lists all journal entries (draft, review, published, retracted).
- `/cockpit/journal/[entryId]` — single-entry editor + review + publish UI.
- `/cockpit/journal/new` — manual entry creation (when the auto-pipeline didn't fire or when the operator wants an out-of-cycle essay).

Authentication: operator role required.

---

## Landing page layout (`/cockpit/journal`)

```
┌──────────────────────────────────────────────────────────────┐
│ Model Journal — Operator Workspace                           │
│ Next scheduled publish: Sunday 10am ET                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ DRAFTS PENDING REVIEW                                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Week 21, 2026 — DRAFT                                 │    │
│ │ Drafted: Saturday 8:15 AM ET                          │    │
│ │ 1,127 words · 4 picks referenced · 2 autopsies linked│    │
│ │ Compliance: ✅ green                                  │    │
│ │ [Open editor]                                         │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ PUBLISHED ENTRIES (most recent 10)                           │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ Week 20, 2026 — PUBLISHED                             │    │
│ │ Published: 2026-05-19T14:30:00Z                       │    │
│ │ View on public site / View RSS / Twitter teaser sent │    │
│ │ Distribution: email delivered to 247 Elite subs       │    │
│ └──────────────────────────────────────────────────────┘    │
│ ...                                                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ RETRACTED ENTRIES                                            │
│ (none)                                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Editor layout (`/cockpit/journal/[entryId]`)

```
┌──────────────┬──────────────────────────────┬──────────────┐
│ LEFT RAIL    │  CENTER (editor)             │ RIGHT RAIL   │
│              │                              │              │
│ Entry meta:  │  ┌─ Markdown editor ──────┐  │ Week data    │
│ - Week 21    │  │                        │  │ summary:     │
│ - 2026       │  │ ## Cold open           │  │              │
│ - Model      │  │ ...                    │  │ Settled: 14  │
│   v6.0.5     │  │                        │  │ Wins: 9      │
│ - Status:    │  │ ## The week in numbers │  │ Losses: 5    │
│   DRAFT      │  │ ...                    │  │ Pre-mortem   │
│              │  │                        │  │ called: 3/5  │
│ Word count:  │  │ ...                    │  │ Autopsies: 4 │
│ 1,127        │  │                        │  │              │
│              │  └────────────────────────┘  │ Referenced   │
│ Last saved:  │                              │ picks (4):   │
│ 2 min ago    │  [Save draft] [Preview]      │ - BOS @ NYK  │
│              │  [Run compliance scan]       │ - LAL @ GSW  │
│              │  [Submit for publish]        │ - ...        │
│ Actions:     │                              │              │
│ - Revert     │                              │ Cited        │
│ - Retract    │                              │ autopsies:   │
│   (if pub)   │                              │ - LAL loss   │
│              │                              │ - ...        │
└──────────────┴──────────────────────────────┴──────────────┘
```

---

## Compliance scanner integration

Before publish, the operator runs (or Codex auto-runs on submit) the compliance scanner against the draft markdown:

- Green: publish button enabled.
- Yellow: publish button enabled with warning modal "X yellow flags — review before publishing."
- Red: publish button disabled. Inline highlights on the offending spans. Suggested fixes per flag.

The scanner runs the rules from `apps/web/lib/compliance-scanner/rules.ts` with `getRulesForTemplate('MODEL_JOURNAL')`. The Journal template has stricter rules around aggregate win-rate claims (banned) and "we believe" / "we think" first-person plural confidence framing (banned per spec voice rules).

---

## Submit-for-publish flow

When operator clicks "Submit for publish":

1. Compliance scanner runs final pass. Block if red.
2. Modal confirms: "Publish Week 21 essay? It will go to RSS, Email digest (247 Elite subs), and Twitter teaser tomorrow morning."
3. On confirmation, status transitions: `DRAFT` → `REVIEW_PENDING` → `PUBLISHED` (immediate, no intermediate human step).
4. `publishedAt` timestamp set.
5. Distribution scheduled:
   - Public route at `/journal/[slug]` immediately available.
   - RSS feed regenerated.
   - Email digest queued for Sunday 10am ET delivery.
   - Twitter bot queued for Monday morning teaser auto-post.
6. Cross-references update — every referenced pick's Game Room Galaxy Memory slot adds a link to this journal entry.

---

## Edit-after-publish behavior

Published entries are mostly immutable, with two narrow exceptions:

1. **Append-only cross-references.** If a related game later gets a fresh autopsy or another journal entry references this one, the cross-references field appends. The essay body is unchanged.
2. **Retraction.** Operator can retract an entry (`PUBLISHED` → `RETRACTED`). The public route at `/journal/[slug]` returns 410 Gone with a brief notice that the entry was retracted; the entry is preserved internally for audit. Retraction requires a decision-log entry explaining why.

Body edits after publish are NOT supported. If something is wrong, retract + republish as a corrected entry.

---

## Manual entry creation (`/cockpit/journal/new`)

Operator can create an out-of-cycle entry — e.g., for a major model version announcement that doesn't wait for Sunday.

Flow:

1. Fill in week (defaults to current ISO week + year).
2. Title (auto-suggested from cold-open if drafted).
3. Click "Run Friday data-pipe now" to populate the week data summary.
4. Click "Run Claude drafting now" to generate the draft body using the canonical drafting prompt.
5. Edit + compliance scan + publish as normal.

Out-of-cycle entries are clearly marked in the public index ("Special: v6.1.0 release notes — published mid-week").

---

## Hard refusals (UI-enforced)

- UI MUST NOT bypass the compliance scanner on red status.
- UI MUST NOT auto-publish without operator confirmation.
- UI MUST NOT support editing of a `PUBLISHED` entry's body (append-only cross-references + retraction only).
- UI MUST NOT delete entries. Retraction is the only "remove from public" mechanism, and it preserves the entry internally.

---

## Acceptance criteria (Phase 3 cockpit/journal v0 → green)

1. Operator authentication enforced.
2. Landing page renders drafts + published + retracted sections.
3. Editor renders markdown draft with live word count.
4. Run compliance scan from editor.
5. Submit-for-publish disabled when scan is red.
6. Publish triggers RSS, email digest queue, Twitter teaser queue, Game Memory cross-reference updates.
7. Edit-after-publish UI prevents body changes.
8. Retraction flow requires decision-log entry.
9. Manual entry creation works end-to-end.
10. NO body-edit endpoint exists on the route handler for PUBLISHED entries.

When all 10 hold, cockpit/journal v0 is shippable.

---

## Open items

- **OPEN-CKP-JRN-1:** Should the editor render a preview pane alongside the markdown? Default: yes, side-by-side with toggle. Codex confirms.
- **OPEN-CKP-JRN-2:** Should drafts auto-save on edit? Default: yes, every 30 seconds. Plus explicit "Save draft" for safety.
- **OPEN-CKP-JRN-3:** Should the Saturday drafting job's API cost be visible in the editor? Default: yes — small note at the bottom "This draft used $0.23 of Claude API budget."

---

*Spec authored by Claude. Codex implements. Append-only persistence locked.*
