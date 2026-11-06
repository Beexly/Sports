# Competitive intel

Read-only harvest of rival pick sellers, mapped onto the eight signal families, reconciled
against our own picks. Nothing here publishes. Nothing here writes to a public route.

## Why it exists

Two questions the engine could not answer: which games did a rival price that we did not, and
where do we disagree. The first is a coverage gap, not a data gap, and it is the highest
signal output of the whole layer.

## Rules of engagement, encoded

Tiers are the harvest tier stored on every row (`harvest_tier`):

| Tier | Meaning | Legal posture |
|---|---|---|
| 0 | polite, robots respected, 1 req/s, honest UA | none |
| 1 | standard scrape, 5 req/s | none, public facts |
| 2 | fingerprint evasion, FlareSolverr, curl_cffi | none, but a bot wall was proven |
| 3 | ToS violation, no account, API enumeration, paywall archaeology | contract risk |
| 4 | account, authenticated abuse, JWT tampering, direct DB reads | contract risk plus account |

Hard limits: 20 concurrent, back off on 403/429/503, read-only, one account per org. Every
action is logged with its tier before it happens.

## Provenance

Six columns on every harvested row: `sourceUrl`, `retrievedAt`, `harvestTier`,
`licenseClass`, `commercialOk`, `contentHash`. A row without all six is a bug, and
`npm run provenance:audit` fails the build on one.

`commercialOk` may only be true when `licenseClass` is `public_domain` or `licensed`.
ToS-scraped data starts false and stays false until a terms read and, where needed, written
permission exist. GSE itself is PolyForm Noncommercial, so this is a licence decision before
it is a legal one.

## Registration order for a new source

1. `apps/web/lib/scraping/source-rights-registry.ts`: status, `automation_allowed`, the six
   permission booleans, `evidence_urls`, `reviewed_at`.
2. `packages/data-ingestion/src/source-registry.ts`: the ingestion gate `assertIngestible`
   reads, with a verdict and a verified reason.
3. `DATASET_LICENSES.json`: dataset key.
4. `NOTICE`: scope line.

Only then an adapter. A fetch that lands before registration is an ungated fetch and
`guard:ingestion-clearance` will say so.

## Adding an adapter

Implement `RivalAdapter<T>` from `packages/competitive-intel/src/adapter.ts`. The contract is
fetch, normalize, validate, provenance, in that order:

- `normalize` is pure and takes a `RawArtifact`, so it replays offline.
- `schema` is zod and strict. One bad row fails the whole batch: a partial harvest is a lie by
  omission.
- a fixture from a real captured response lives in `src/adapters/__fixtures__/`, and a test
  replays it. No test may touch the network.
- signal family comes from `familyForFeature`. Do not add a ninth family.

## The contest API, and why it is the seam

`/api/contests/usernames/{sportId}/{contestId}` is unauthenticated, per contest, and returns the
whole field with each entrant's lineup count. One request is 17k to 90k handles: 5 contests gave
216,928 entrant rows and 114,798 unique people, 46.9 percent of whom repeat across contests.
That is not a guess at a subscriber list, it is the paying population of a contest.

`/api/contests/usersummary/{sportId}/{contestId}/{ownerId}` returns one entrant's lineup with
salary, their own exposure, the field's exposure and the gap. The gap is a readable statement of
how a strong player thinks, closer to the model than a projection number is.

### The id space is the hard part

Open question, with the evidence: the slate listing's `id` (197M range) does not resolve on
`usernames` (4 of 4 failed), while archived `usernames` ids (42.9M range) work all day. So the
listing appears to carry a different provider's contest id, and the mapping between the two is
not exposed on the routes found. Consequences: archived ids plus neighbour probing are the
working discovery path, and the listing is currently only good for names, dates and prize pools,
not for queueing harvests.

Contest ids are not a sequence. Neighbouring ids miss, and 40 random samples across a two
million wide band returned zero. So ids are gathered and then verified:

- archived `/api/contests/usernames` and `/usersummary` URLs from Wayback carry literal ids and
  verified 7 of 8
- `/api/contests/{sport}/slates/?date=YYYY-MM-DD` is the live listing, but its `id` field is a
  DIFFERENT id space and verified 0 of 4 against `usernames`. The verifier is what catches this
- probing +/- N around verified ids found 6 of 61, so the space is locally clumpy, not global

`npm run competitors:discover` runs all three sources and writes only ids that answered.

## Running a harvest

`npm run competitors:harvest -- --adapter contests --contest 42264108 --out .ci-out`
`npm run competitors:harvest -- --adapter ownership --contest 42928458 --owner 4 --out .ci-out`
`npm run competitors:harvest -- --adapter products --out .ci-out` fetches the real URL, stamps
provenance, writes one artifact per run and prints a summary (price ladder for a price sheet,
family histogram for a feature catalogue). It is the only place the package touches the
network, so every test stays offline.

First live run, 2026-11-06, 968 features: MARKET 525, EFFICIENCY 345, TRENCHES 39,
MARKET_MICROSTRUCTURE 20, SITUATIONAL 19, MICROCLIMATE 16, LUCK 2, NARRATIVE 2. Their thinnest
coverage is luck and narrative, which is where a differentiator is cheapest.

## The sheet

`npm run competitors:sheet -- --in .ci-out/<artifact>.json --out .ci-out` reads one artifact and
writes a steal sheet: price posture and a wedge for a price sheet, a family histogram with the
thinnest families for a feature catalogue. It never fetches, so the sheet is reproducible from
the artifact alone and carries that artifact's provenance verbatim.

## Loading it

`npm run competitors:sql -- --in .ci-out --org fantasylabs --out .ci-out/load.sql` writes one
transaction: the org upsert, one asset row per artifact, and prospect_contacts as COPY from
stdin so 100k people load in one statement. `emailHash` is stable per owner id, so a re-load
updates rather than duplicates. Handles load at confidence 60, grinders 70, whales 80, because a
public handle is not an email and should not claim to be.

## The customer base brief

`npm run competitors:base -- --in .ci-out` reads every contest artifact in the directory, rolls
the same owner across contests into one person, bands commitment and writes the whale list with
each contributing artifact's provenance printed above it. Whale is a behaviour, not a compliment:
once one contest caps entries around 20, only repetition across contests can reach the band.

## Reconciliation

`npm run competitors:reconcile` writes `rival_deltas` and prints the top 20 `rival_only`
rows. Deltas use the closing line, never the entry line. Own picks join only when
`games.externalId` is already in `YYYY_WW_AWAY_HOME` form; everything else is counted as
unkeyed rather than fuzzy-matched.

Market is normalized on both sides to `spread | total | moneyline`, and side is derived: an
own pick's `selection` is prose ("Chiefs -3.5") and joining it to a market column matches
nothing. `rival_only` and `own_only` are deleted and re-derived every run, because both carry
a NULL half of the unique key and Postgres treats NULLs as distinct in a unique index.

## Flag and rollback

There is no public route yet, so there is no flag to flip. When one lands it is
`COMPETITIVE_INTEL_ENABLED`, default false, with an inline `.env.example` progression note.

Rollback is `git revert` of the migration commit plus `prisma migrate resolve --rolled-back
20261106120000_competitive_intel` if the migration already deployed. The tables are additive
and nothing joins them on the money path, so a revert cannot break settlement.

## What this does not do

- No publishing. `publishes_pick` stays false.
- No writes to a rival system.
- No subscriber emails. Public handles and staff addresses only.
- No ninth signal family.
- No model version bump, so `model-freeze` stays green by construction.
