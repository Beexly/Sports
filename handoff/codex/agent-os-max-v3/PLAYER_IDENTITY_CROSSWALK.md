# Player Identity Crosswalk

`apps/web/lib/nfl/player-identity-resolver.ts` resolves players by GSIS ID only.

Name normalization is available for diagnostics, but name-only matches intentionally return `AMBIGUOUS` and do not merge players.
