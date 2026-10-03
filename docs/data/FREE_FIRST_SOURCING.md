# Free-First Sourcing — save money without losing stats quality

**Directive:** use every FREE, cleared data source before spending a cent on a paid API.
Money is tight. But we are pushing to be the king of stats, so cost-saving must never
lower quality. This is the operating doctrine and where it lives in code.

## The rule

For any data need, in priority order:

1. **Free + cleared + we have an adapter** → use it. (ESPN scores, ESPN rankings, Open-Meteo weather, nflverse.)
2. **Free + cleared, adapter pending** → build the adapter (verify schema live first).
3. **Free but gated** → clear it through the source-provider gate, then it drops to step 1.
4. **Licensed/already-paid** → use only when no free cleared source covers the need.
5. **Trial/paid-metered** → last resort, evaluation only.

Cost order **never** overrides the rights/clearance gate, and among equal-cost sources
the **higher-quality** one wins — free never means worse.

## Where it lives

| Concern | Module |
|---|---|
| Cost tiers + CFB cost view | `apps/web/lib/data-sources/cost-policy.ts` |
| Platform-wide router (all sports/needs) | `apps/web/lib/data-sources/source-router.ts` |
| Free adapters (verified live) | `apps/web/lib/data-sources/free-adapters/` |
| Free-first entrypoints + spend guard | `apps/web/lib/data-sources/free-first-ingest.ts` |
| Source confidence (quality) | `apps/web/lib/data-sources/source-confidence.ts` |
| Cockpit surfacing | `/cockpit/sources` + `/api/cockpit/free-coverage` |

## Live free coverage today (verified, HTTP 200, no key)

| Need | Free cleared source | Sports | Spend? |
|---|---|---|---|
| scores / results | **nflverse** (NFL), **ESPN public** (all 7) | all | none |
| schedules | nflverse, ESPN public | all | none |
| standings | ESPN public | all | none |
| rankings | **ESPN public** (AP/Coaches polls) | ncaaf, ncaab | none |
| weather | **Open-Meteo** (CC-BY) | all | none |
| player/team stats | nflverse (NFL deep) | nfl | none |
| **odds** | — (free odds sources still gated) | all | **The Odds API** (licensed, in-season gated) |

Smoke proof: `npx tsx scripts/free-ingest-smoke.mjs` → ESPN scores for all 7 sports +
Open-Meteo weather, 8/8 ok, zero key/spend.

## Spend guard

Before any paid API call, the pipeline asks `paidCallJustified(need, sport)` /
`requiresPaidEscalation(need, sport)`. It returns true ONLY when no cleared free source
covers the need. Today that's **odds** (free odds providers are gated). The Odds API is
further constrained by in-season gating (`getInSeasonSports`) to protect the 500/mo free
credit cap.

## To eliminate the remaining spend (odds)

Clear one of the free odds candidates through the source-provider gate (cheapest first):
TheRundown (20k pts/day), Big Balls (1–2k/day), Sports Game Data (2,500/mo). On clearance
they drop into the free tier and `requiresPaidEscalation("odds", …)` flips to false.

## Quality guardrails (king of stats)

- Facts only from public sources (no copyrighted expression); attribution propagates.
- `noFakeLiveData` invariant: an unproven/stale source LOWERS confidence — it is never
  dressed up as fresh.
- Adapters are built against **live-verified schemas** (no guessed columns) and tested
  against captured fixtures.
- Among equal-cost cleared sources, the router prefers higher data quality, so free
  selection never sacrifices accuracy.
- Cross-source agreement (e.g. ESPN scores vs licensed scores) is the next quality layer
  and a further credit saver for settlement.
