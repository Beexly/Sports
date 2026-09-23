# SituationSnapshot — FREE quote intake precedence

**Additive ops reminder · 2026-09-23 · No secrets**

When assembling a **SituationSnapshot** (book market-state bundle) from free
quote sources, merge order is:

1. **Rundown** (TheRundown / therundown)
2. **Sharp × 3** (sharp-leaning free/book legs as a bundle)
3. **Odds-free** (free-spine sportsbook odds adapters)
4. **Parlay** (parlay / multi-leg free surfaces — market-state only)
5. **OddsPapi** (secondary; credit-governed; **not** `certifiableForLiveGate`)
6. **Apify last** — **Tier-B market-state only** (never cite as provenance)

**Rule:** earlier tier wins on conflict when freshness is comparable; later
tiers fill gaps only. Never let Apify alone set headline consensus.

## Tier doctrine (do not blur)

| Tier | Role | Cite on public claim? |
|------|------|------------------------|
| A — provenance-grade | Licensed/official / cleared APIs | YES (with source id) |
| B — internal SIGNAL | Scrapers, Apify actors, agreement mesh | **NEVER** as provenance |

See also: `docs/architecture/2026-09-18-signal-architecture.md` (L7 rights /
provenance; Tier-A vs Tier-B signal posture).

## Code anchors

- `packages/quote-plane/src/precedence.ts` — `FREE_QUOTE_PRECEDENCE` + helpers
- `packages/quote-plane/src/situation-snapshot.ts` — `buildSituationSnapshotFromQuotes`
- Tests: `packages/quote-plane/src/__tests__/situation-snapshot-precedence.test.ts`

**Out of scope here:** Kalshi / Polymarket independence mesh (`KIND_RANK` in
`aggregate.ts`) stays first-class for fair `q`. This ladder is sportsbook
SituationSnapshot only. No ESPN / TeamRankings in this encode (TeamRankings
held — PR #884).

## Operator notes

- Live keys / quotas for Rundown, OddsPapi, Sharp bundle — operator env only;
  never embed in docs or source.
- Legal read required before OddsPapi live-gate certification.
