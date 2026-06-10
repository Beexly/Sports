# GSN Market Integrity Flight Recorder — Product Spec

## Purpose
The Flight Recorder is the permanent truth log for every game, market, note, pick candidate, No-Bet, podcast segment, and post-game autopsy. It prevents the platform from becoming a memoryless picks feed.

## Primary users
- Public user: wants to know why the position changed.
- Founder/admin: wants to prove data freshness and editorial discipline.
- Analyst: wants feedback on process quality.
- Future auditor/legal reviewer: wants to reconstruct what was known at the time.

## Events captured
1. Source observed
2. Source updated
3. Source contradicted
4. Official injury report fetched
5. Odds snapshot fetched
6. Line movement detected
7. Market volatility threshold crossed
8. Model run completed
9. Model disagreement changed
10. Confidence changed
11. No-Bet created
12. No-Bet resolved
13. Analyst note drafted
14. Analyst note scored
15. Human review requested
16. Human review approved/rejected
17. Publish blocked
18. Published
19. Podcast script generated
20. Voice generation approved
21. Game finalized
22. Post-game autopsy completed

## Event schema
```ts
type FlightRecorderEvent = {
  id: string;
  entityType: 'game' | 'market' | 'pick_candidate' | 'no_bet' | 'source_claim' | 'podcast_episode' | 'autopsy';
  entityId: string;
  eventType: string;
  severity: 'info' | 'watch' | 'material' | 'blocker';
  title: string;
  summary: string;
  sourceId?: string;
  sourceUrl?: string;
  observedAt: string;
  fetchedAt?: string;
  expiresAt?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  confidenceDelta?: number;
  reviewerId?: string;
  publishImpact: 'none' | 'requires_review' | 'blocks_publish' | 'updates_public_receipt';
  createdAt: string;
};
```

## Public UI
- Timeline drawer on game detail page.
- Filters: source, odds, injury, confidence, No-Bet, review, publish, autopsy.
- Human-readable event copy: “Confidence reduced from 64 to 51 because injury source conflict was unresolved.”
- Trust Receipt link on every event that changes a public-facing decision.

## Admin UI
- Full event stream.
- Diff viewer for before/after state.
- Reviewer note composer.
- “Block publish until resolved” action.
- Event severity override with required reason.

## Acceptance criteria
- Every public recommendation has at least one Flight Recorder timeline.
- Any confidence movement over a configured threshold creates an event.
- Any stale data event can block publish.
- Events are append-only.
- Admin edits create new correction events; they do not rewrite history.
