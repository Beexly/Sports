# Plan — Cycle 14 · feat(ai): prompt-caching audit + ephemeral caching where it pays

## Audit (token estimates @ ~4 chars/token)

| Call site | System prompt | Cacheable user prefix | Per-call variable |
|---|---|---|---|
| `content-generator.ts` | ~400 chars / ~100 tokens | none (user prompt is fully per-call) | picks + sources |
| `content/draft-reviewer.ts` | ~800 chars / ~200 tokens | BANNED_LIST (~150 tokens) is identical every call | the DRAFT (variable, up to ~3K tokens) |
| `brief/slate-overview.ts` | ~500 chars / ~125 tokens | none today (will grow with sections context per the queued composer restoration) | picks by sport |
| `scripts/draft-nightly-content.mjs` | inline duplicates of the above | as above | as above |

## Hard Rule §6 status
None of the system prompts hits the ~2K-token threshold today, so caching is not strictly required. This cycle is forward-investment for two cases where it'll pay:

1. **draft-reviewer**: operator-iteration loop (review → edit → re-review) hits the same SYSTEM_PROMPT + BANNED_LIST many times within the 5-min ephemeral cache window. The DRAFT itself changes; everything else is stable. ~350 tokens of input cost saved per cache hit.
2. **slate-overview**: prompt is small today but is the obvious place the brief composer's full sections context will land (per queued item 3). Adding caching now means item 3 doesn't need a follow-up "add caching too" cycle.

## Skipping content-generator
The system prompt is short (~100 tokens) and there's no stable user prefix — each blog post sees different picks data. The cache hit rate would be near-zero. Document this in DECISIONS.

## Implementation

System has to be passed as an array of blocks (not a string) to attach `cache_control`. SDK accepts both forms.

```ts
system: [
  { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }
]
```

For the reviewer's banned list — currently in the user message. Better placement for caching: keep it in the user message but put it BEFORE the variable DRAFT in a separate content block with `cache_control: ephemeral`, and the DRAFT in a second block without. The cache key is everything up to (but not including) the first uncached block, so this works for repeat reviews of different drafts.

## Files to touch
1. `apps/web/lib/content/draft-reviewer.ts` — array-form system + cached banned-list user block
2. `apps/web/lib/brief/slate-overview.ts` — array-form system with cache_control
3. `apps/web/__tests__/draft-reviewer.test.ts` — assert cache_control set on system + on banned-list user block
4. `apps/web/__tests__/slate-overview.test.ts` — assert cache_control set on system
5. `_logs/CHANGELOG.md` + `_logs/DECISIONS.md` — append

## Test plan
- Update existing reviewer / slate specs to inspect the SDK call shape and verify cache_control is present
- Existing functional tests still pass (the response handling shape is unchanged)
- Full sweep + guardrails

## Rollback
Single commit. Revert restores the string-form system blocks.

## Commit message
`feat(ai): ephemeral prompt caching on draft-reviewer + slate-overview`
