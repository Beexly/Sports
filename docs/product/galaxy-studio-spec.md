# Galaxy Studio — Spec

> Phase 3 deliverable. The creator production tool. Turns one game (or
> one slate) into multiple monetizable assets in a single workflow.
>
> Route: `/cockpit/studio`.
> Builder: `apps/web/lib/studio/build-assets.ts`.
> Templates: `apps/web/lib/studio/templates.ts` (Claude's lane).
> Tests: `apps/web/__tests__/studio-*.test.ts`.

## Why this exists

The owner is the solo creator in Phase 3 (master plan decision #7).
Galaxy Studio is the force multiplier — one unit of intelligence
becomes multiple shareable assets without rewriting from scratch each
time. Phase 6+ adds multi-contributor support and packages Studio as
a sellable creator-tier subscription.

## Inputs

- A `GameIntelligenceNode` (from the Intelligence Graph) OR a
  `SlateWeather` (for slate-wide content)
- A `UserLens['kind']` (the editorial angle the asset should take)
- A target asset list (which outputs to generate)

## The asset taxonomy

Each asset is a typed output. Studio generates each one independently
so the user can regenerate one without disturbing the others.

### Game-level assets

- `fan-explainer` — plain-English game preview, no betting language,
  no model claims. For social posts that need to be sponsor-safe.
- `fantasy-angle` — DFS / season-long lens on the same game. Usage,
  matchups, injuries, projected points.
- `betting-education-angle` — what the line means, why it moved, how
  the model reads it. **Never a "take."** Educational only.
- `x-thread` — 5-7 posts, citations attached, voice rules from Part 3
  enforced.
- `tiktok-reels-script` — 45-90 seconds, beat-by-beat with on-screen
  text cues.
- `newsletter-block` — drop-in for Substack/Beehiiv/Ghost. Markdown.
- `sponsor-safe-blurb` — compliant for newsletter sponsorship slots.
- `youtube-title-and-thumbnail-ideas` — three variants each.
- `compliance-scan-report` — runs the existing trust-claims +
  promotions guards against every other asset; flags issues.
- `citations` — every claim links to the `SourceSnapshot` or
  `PickSignalSnapshot` it relies on.
- `approval-status: 'red' | 'yellow' | 'green'` — derived from the
  compliance scan.

### Slate-level assets

- `morning-brief` — 3-5 paragraph slate state for an email
- `evening-recap` — what settled, what learned, what's next
- `x-pinned-tweet` — daily slate summary in one post
- `instagram-carousel-script` — 6-8 panels of slate state

## Hard rules

1. **No auto-posting.** Every asset lands in a draft state for human
   review. The `/cockpit/studio` UI provides one-click "copy to
   clipboard" + "open in X composer" but never publishes directly.
2. **Compliance scan is mandatory.** No asset can leave Studio with
   `approval-status: 'red'`. Yellow is fine for owner review.
3. **Citations are mandatory on every claim.** If Studio can't
   citation-trace a claim, it must omit the claim.
4. **No EV / Kelly / win-rate claims** unless the relevant gate
   allows. Same rules as the consumer site.
5. **Voice rules from master plan Part 3 enforced** at template level
   AND at compliance scan.
6. **Claude API is the LLM.** No OpenAI dependency (master plan
   decision #20). Use the existing Claude integration patterns from
   `lib/content-generator.ts`.

## Implementation shape

```ts
// apps/web/lib/studio/build-assets.ts
export async function buildAssets(input: {
  source: GameIntelligenceNode | SlateWeather;
  lens: UserLens['kind'];
  assets: AssetKind[];
}): Promise<{
  assets: Record<AssetKind, CreatorAsset>;
  scan: ComplianceScanReport;
}>
```

Studio calls `buildAssets`, gets back a record of typed
`CreatorAsset`s, surfaces them in the UI panel-by-panel. The user
edits in place, regenerates individual assets, and exports.

## Templates (Claude's lane)

`apps/web/lib/studio/templates.ts` exports a `TEMPLATES` constant
keyed by `AssetKind`. Each template is a Claude-prompt-shape that
takes the typed input and renders the asset. Claude owns these.

Example shape:

```ts
export const TEMPLATES = {
  'fan-explainer': {
    systemPrompt: '...',
    userPromptTemplate: (node, lens) => `...`,
    maxTokens: 400,
    bannedPhraseCheck: ['guaranteed', 'lock', ...],
  },
  'x-thread': { ... },
  // ...
} as const;
```

## Storage

Drafts persist in `ContentDraft` (existing model). A Studio session is
a `ContentDraft` row with `kind: 'studio-session'` and a JSON `payload`
holding the generated assets + the user's edits.

## Tests

- `studio-template-coverage.test.ts` — every `AssetKind` has a
  template; every template has a banned-phrase check.
- `studio-compliance-scan.test.ts` — generated assets pass the
  trust-claims and promotions guards.
- `studio-citations.test.ts` — every claim has a traceable citation.
- `studio-no-auto-publish.test.ts` — no Studio code path calls a
  publish/post API directly.
- `studio-claude-only.test.ts` — Studio imports do not reach any
  non-Claude LLM SDK.

## Future expansion (Phase 4+)

- Canva integration for graphic export
- HyperFrames or similar for video generation
- Draft routing to Slack/Gmail for collaborator review
- Multi-contributor mode (House picks vertical schema, named
  handicappers, individual track records)

## Open questions

- Should `CreatorAsset` history persist forever, or expire after N
  days? Provisional: persist forever for the owner (they're the
  archive); expire after 30 days for multi-contributor mode at Phase
  6+.
- How does Studio surface in the existing operator cockpit nav?
  Provisional: new `Studio` nav item between `Brief` and `Content`.

## Phase 3 deliverable

- `/cockpit/studio` route with panel UI per asset
- `lib/studio/build-assets.ts` + `lib/studio/templates.ts`
- Storage in `ContentDraft` with `kind: 'studio-session'`
- The asset taxonomy above, minus video assets (Phase 4)
- Full test coverage per the test plan above
