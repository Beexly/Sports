# GSN Source Quality + Rumor Quarantine System

## Purpose
GSN cannot be a trust-first product unless sources are treated as first-class entities. A source is not just a link. It is a reliability profile with authority, freshness, history, licensing status, conflict behavior, and publishability rules.

## Source types
- Official league/team
- Official injury report
- Beat reporter
- National reporter
- Market/odds provider
- Analytics model
- Social/media signal
- User-submitted tip
- Internal analyst note
- Historical database
- Podcast/news article

## Source scoring fields
```ts
type Source = {
  id: string;
  name: string;
  url?: string;
  sourceType: string;
  authorityLevel: 1 | 2 | 3 | 4 | 5;
  licensingStatus: 'owned' | 'licensed' | 'public' | 'unknown' | 'restricted';
  historicalAccuracy?: number;
  conflictRate?: number;
  averageFreshnessMinutes?: number;
  publishableDefault: boolean;
  requiresReviewDefault: boolean;
  notes?: string;
};
```

## Rumor states
- observed
- unconfirmed
- corroborated
- contradicted
- official_confirmed
- expired
- rejected

## Publish rules
- `unconfirmed` cannot publish as a recommendation basis.
- `contradicted` automatically blocks a related pick candidate.
- `official_confirmed` can publish if freshness and license checks pass.
- Social-only claims remain quarantined unless corroborated or used only as “watch” context.

## Public copy model
Do not say: “Insider reports X is out.”
Say: “Availability is unresolved. One non-official signal conflicts with the official status, so this market is in No-Bet/watch mode.”

## Acceptance criteria
- Every source claim has a source record.
- Every source claim has an observed_at and expires_at.
- Unconfirmed claims cannot be used as public proof.
- Any contradiction creates a Flight Recorder event.
