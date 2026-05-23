# Plan — Cycle 9 · feat(brief): add Claude composeSlateOverview helper

## Goal
First piece of restoring the daily brief composer. The current `composeBrief` stub returns `slateOverview: { text: "Slate overview unavailable while the composer is being rebuilt." }`. This cycle adds an async `composeSlateOverview()` that produces a real slate-overview paragraph from today's picks. Doesn't touch the existing stub yet — a future cycle wires it through.

## Files to touch
1. `apps/web/lib/brief/slate-overview.ts` — NEW; Claude-backed composer
2. `apps/web/__tests__/slate-overview.test.ts` — NEW; mock-SDK specs
3. `_logs/CHANGELOG.md` — append entry

## Design

### Public surface
```ts
export interface SlatePickSnippet {
  readonly sport: string;
  readonly game: string;
  readonly pickType: PickType;
  readonly selection: string;
  readonly confidence: number;
  readonly pickGrade: PickGrade;
}

export interface SlateOverviewInput {
  readonly date: string;        // ISO date — included verbatim in the output
  readonly picks: readonly SlatePickSnippet[];
}

export interface SlateOverviewResult {
  readonly text: string;        // 1-2 short paragraphs, operator-readable
  readonly model: string;
  readonly composedAt: string;  // ISO timestamp
}

export async function composeSlateOverview(
  input: SlateOverviewInput
): Promise<SlateOverviewResult>;
```

### Model
Sonnet 4.6 — slate overview is the brief's lead. Editorial quality matters; cost per generation is fine (1/day). Haiku would also work but Sonnet's better narrative pacing justifies the upcharge here. Different judgment call from the reviewer (Cycle 2), which is classification.

### System prompt
Strict: only reference provided picks; measured language; no banned phrases; explicit length ceiling (~120 words). Re-uses the same "ONLY data provided to you" framing as content-generator for consistency.

### Output
`output_config.format` json_schema with `{ slateOverview: string }`. Single field, validated, no regex parsing.

### Empty-picks behavior
Throws — "composeSlateOverview requires at least one pick". The stub message stays as the right thing to show when there's no slate.

## Test plan
- Happy path: SDK returns valid JSON → text is the parsed string, model is "claude-sonnet-4-6", composedAt is ISO
- Throws when picks is empty
- Throws when ANTHROPIC_API_KEY is missing
- Throws when SDK returns no text block
- Propagates SDK errors
- Full suite + typecheck + lint green

## Rollback
Single commit. Revert removes the helper + test; existing brief stub is untouched.

## Commit message
`feat(brief): add composeSlateOverview as the first restored piece of the brief composer`
