---
surface: galaxy-studio
template: BETTING_EDUCATION
scenario: thin-evidence-refusal
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A GameIntelligenceNode in bootstrap state:

- Game: TOR @ BOS, MLB, 2026-05-22T23:05:00Z
- Edge Index: null (engine has not scored)
- Evidence health: D (only 2 books reporting, no canonical signals)
- bootstrapShare: 1.0
- No `PickSignalSnapshot` rows for this game
- No published pick

The Studio operator selects the "Betting Education" template and clicks generate.

# Expected behavior

The Studio runtime detects the thin-evidence condition BEFORE calling the Claude API.

Refusal path:

1. `build-assets.ts` checks `evidenceHealth.overall` and `pickSignalSnapshots.length`.
2. Returns a refusal `CreatorAsset` with:
   - `assetKind: 'BETTING_EDUCATION'`
   - `body: "Evidence is thin — no asset generated. The model has not scored this game yet. Check back closer to game time."`
   - `citations: []`
   - `publicReady: false`
   - `complianceScan: { status: 'green' }` (the refusal itself contains no banned vocabulary)
3. UI shows the refusal prominently, NOT as an error toast.
4. No Claude API call is made (cost-saving + refusal-is-explicit principle).

# Forbidden behavior

- Studio MUST NOT call Claude API for a thin-evidence game.
- Studio MUST NOT generate a hedged-but-still-published asset ("We don't have much data on this one, but here's what we'd say...").
- Studio MUST NOT mark `publicReady: true` for a refusal.
- The refusal message MUST NOT recommend that the operator "try another template" — refusal is final per template-game pair.

# Pass criteria

1. Studio's `build-assets.ts` returns the refusal CreatorAsset without invoking Claude API.
2. Returned `CreatorAsset.body` exactly matches the refusal copy (or a documented equivalent from `apps/web/lib/studio/refusals.ts` if Codex extracts refusal text into a constants file).
3. `CreatorAsset.publicReady === false`.
4. `CreatorAsset.citations.length === 0`.
5. `CreatorAsset.complianceScan.status === 'green'` (the refusal itself is clean).
6. No `claudeApi.complete()` (or equivalent) call recorded in test mocks.
7. Studio UI test confirms the refusal renders prominently, not as an error.
