# SituationSnapshot — FREE quote intake precedence

**Additive ops reminder · 2026-09-23 · No secrets**

When assembling a **SituationSnapshot** (book market-state bundle) from free
quote sources, merge order is:

1. **Rundown** (TheRundown / therundown)
2. **Sharp × 3** (sharp-leaning free/book legs as a bundle)
3. **Odds-free** (free-spine sportsbook odds adapters)
4. **Parlay** (parlay / multi-leg free surfaces — **market-state only**; off cite + off live-gate)
5. **OddsPapi** (secondary; credit-governed; citeAllowed; **not** `certifiableForLiveGate`)
6. **Apify last** — **Tier-B market-state only** (never cite as provenance; never live-gate)

**Rule:** earlier tier **always keeps** the line on conflict; later tiers fill
gaps only. A substantially fresher later tier only emits a `stale_higher_tier`
divergence flag — **no overwrite**. Never let Apify alone set headline consensus.

## Hard wall — reject non-book inputs

`freeTier` label alone is **not** trusted. `buildSituationSnapshotFromQuotes`
rejects any contribution whose `line` has:

- `sourceKind` in `model_prior` | `synthetic_demo` | `prediction_market`
- `market` === `"model"`
- `rights` in `research_only` | `internal_synthetic`

Rejected contributions never enter winners / `sourcesUsed`. Optional skip
reason flags: `rejected_non_book:…`. Helper: `isBookMarketStateLine(line)`.

## Cite vs live-gate (split)

| Field | Predicate | OddsPapi | Parlay | Apify |
|-------|-----------|----------|--------|-------|
| `citeEligibleSources` | kept line ∧ `citeAllowed(t)` | may appear | never | never |
| `liveGateEligibleSources` | kept line ∧ `certifiableForLiveGate(t)` | never | never | never |

OddsPapi: `citeAllowed=true` → may appear in `citeEligibleSources`;
`certifiableForLiveGate=false` → never in `liveGateEligibleSources`.

Parlay: stays on `FREE_QUOTE_PRECEDENCE` for merge/gap-fill only;
`citeAllowed=false` and `certifiableForLiveGate=false`.

## Tier doctrine (do not blur)

| Tier | Role | Cite on public claim? |
|------|------|------------------------|
| A — provenance-grade | Licensed/official / cleared APIs | YES (with source id) |
| B — internal SIGNAL | Scrapers, Apify actors, agreement mesh | **NEVER** as provenance |

See also: `docs/architecture/2026-09-18-signal-architecture.md` (L7 rights /
provenance; Tier-A vs Tier-B signal posture).

## Code anchors

- `packages/quote-plane/src/precedence.ts` — `FREE_QUOTE_PRECEDENCE` + helpers
- `packages/quote-plane/src/situation-snapshot.ts` — `buildSituationSnapshotFromQuotes`, `isBookMarketStateLine`
- Tests: `packages/quote-plane/src/__tests__/situation-snapshot-precedence.test.ts`

**Out of scope here:** Kalshi / Polymarket independence mesh (`KIND_RANK` in
`aggregate.ts`) stays first-class for fair `q`. This ladder is sportsbook
SituationSnapshot only. No ESPN / TeamRankings in this encode (TeamRankings
held — PR #884).

## Operator notes

- Live keys / quotas for Rundown, OddsPapi, Sharp bundle — operator env only;
  never embed in docs or source.
- Legal read required before OddsPapi live-gate certification.
