---
surface: model-journal
template: compliance-scan
scenario: banned-vocab-block
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

Saturday drafting job produces an essay. The Claude API output (for whatever reason — model variance, prompt-injection by the input data, etc.) contains a banned phrase:

```
## Cold open

This week our AI-powered scoring engine caught some interesting market
inefficiencies in MLB...

[remaining ~1000 words follow]
```

The phrase "AI-powered" violates L1-AI-POWERED in `apps/web/lib/compliance-scanner/rules.ts`.

The cockpit operator opens `/cockpit/journal/[entryId]` to review the draft.

# Expected behavior

When the operator clicks "Run compliance scan" (or it runs automatically on draft load):

1. Compliance scanner runs `getRulesForTemplate('MODEL_JOURNAL')` against the markdown body.
2. Returns `status: 'red'` with at least one flag at layer 1, severity `block`, message referencing "AI-powered" being banned.
3. Editor UI highlights the offending span ("AI-powered") inline in the markdown.
4. Submit-for-publish button is disabled.
5. A suggested fix appears next to the flag: "Use 'deterministic scoring' or 'factor model' instead."

The operator either:

- Manually edits the offending text, re-runs the scan, gets green → publishes.
- Re-runs the Saturday drafting job with a stronger anti-banned-vocab reminder added to the user prompt.
- Retracts the draft entirely (status DRAFT → DELETED — note that DRAFT can be deleted, only PUBLISHED requires retraction).

# Forbidden behavior

- Editor MUST NOT publish a draft with red compliance status.
- Editor MUST NOT silently strip the offending text and present a "cleaned" version. The operator sees the original + flagged spans + suggestion.
- Editor MUST NOT auto-rewrite via Claude API without explicit operator action. Auto-regen burns budget.
- Editor MUST NOT lose the draft on regenerate — every regeneration creates a new history entry.

# Pass criteria

1. Compliance scan returns `status: 'red'`.
2. At least one flag with layer 1, severity `block`, pattern matching "AI-powered".
3. Flag span correctly identifies the position of the offending phrase.
4. Suggested-fix copy from the rule is rendered alongside the flag.
5. Submit-for-publish button is disabled in the UI test.
6. The draft body is preserved verbatim — no silent text replacement.
7. Regeneration creates a new history entry (does not overwrite the offending draft).

This eval verifies that the compliance scanner is the last-line defense for Model Journal publishes. Even if Claude API generates a banned phrase, the surface refuses to publish.
