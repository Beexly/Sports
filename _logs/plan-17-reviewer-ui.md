# Plan — Cycle 17 · feat(cockpit): UI for the semantic draft reviewer

## Goal
Item 1 of the queue. Cycle 3 shipped POST `/api/cockpit/review-draft`; no UI calls it. This cycle adds an operator-facing page that lets an admin paste a draft, hit "Run review", and see the verdict + findings inline.

## Files to touch
1. `apps/web/app/cockpit/review-draft/page.tsx` — NEW; thin server-component wrapper (admin gating happens in the cockpit layout)
2. `apps/web/components/cockpit/draft-reviewer-form.tsx` — NEW; client component (textarea + button + result render)
3. `apps/web/app/cockpit/layout.tsx` — add nav link
4. `apps/web/__tests__/cockpit-review-draft-page.test.ts` — source-level invariants
5. `_logs/CHANGELOG.md` — append

## Design

### Page (server)
- Sets `metadata: { robots: { index: false } }` (cockpit pattern)
- Renders heading + 1-sentence description + `<DraftReviewerForm />`
- No DB calls, no client-side state — the form owns interactivity

### Form (client, "use client")
- `useState`: `content: string`, `context: string`, `result: DraftReviewReport | null`, `pending: boolean`, `error: string | null`
- Submit handler: POST `/api/cockpit/review-draft` with `{ content, context }`; on 200, set result; on 4xx/5xx, set error
- Empty-state copy: "Paste a draft above and click Run review"
- Verdict badge: green `READY`, amber `REVISE`, red `REJECT`
- Findings list: severity chip + quote (italic) + bannedPhraseSemantic + suggestion
- All copy is operator-facing only; the cockpit layout already prevents public access

### Nav link
Adds `{ href: "/cockpit/review-draft", label: "Draft review", hint: "Run semantic compliance scan" }` to the NAV array.

### What this is NOT
- Not a persistence layer — findings are not saved anywhere
- Not an API surface — the existing POST endpoint is unchanged
- Not the brief preview UI — that's a separate page (future cycle, item from Cycle 16's POST surface)

## Test plan
Source-level invariant tests for both new files (matches the existing `cockpit-jarvis-api.test` / `cockpit-review-draft-api.test` patterns since the container has no browser):
- Page imports the form
- Page has `metadata.robots.index = false`
- Form is `"use client"`
- Form POSTs to `/api/cockpit/review-draft`
- Form has a content textarea + submit button
- Form renders findings + verdict (looks for "READY" / "REVISE" / "REJECT" identifier strings)
- No DB import in either file
- Cockpit layout NAV gets the new entry

I'll also re-run the existing cockpit-jarvis tests to confirm I haven't broken layout assumptions.

## Rollback
Single commit. Revert removes both new files + the nav line; nothing else changes.

## Commit message
`feat(cockpit): UI page for the semantic draft reviewer`
