# Clearance memo — three scraped sources presented for Q2 ingestion

**Status: PROPOSAL. Nothing here has been applied to
`apps/web/lib/scraping/source-rights-registry.ts`.** Registry status changes are
owner decisions; this memo exists so one can be made on evidence.

Author: Claude session `claude/gse-week1-launch-bh0nqo`, 2026-08-26.

## Verdicts, as returned by `checkClearance()`

Run with `mode: "public_logged_off_fact_extract"`, `tool_id: "fetch-native"`,
`intents: ["internal_analysis","storage","derived_analytics"]`.

| source_id | allowed | requiresReview | block |
|---|---|---|---|
| `nextgenstats.nfl.com` | **false** | true | `SOURCE_NOT_REGISTERED` |
| `predictions.draftkings.com` | **false** | true | `SOURCE_NOT_REGISTERED` |
| `pro-football-reference.com` | **false** | true | `SOURCE_NOT_REGISTERED` |
| `nflverse` | **true** | false | — (attribution required) |

Per the standing law, `allowed=false` STOPS the job. **None of the three scraped
sources was ingested.** No record from any of them entered the pipeline, the
database, or any artifact in this branch.

## What Q2 actually used, and why it needed no exception

`data/nflverse/ngs_receiving.csv.gz`, pulled from the nflverse-data release
`nextgen_stats`. This is the licensed mirror the registry already prescribes:
`nflverse` is a registered, cleared source, and this repo's own
`packages/data-ingestion/src/nflverse-ngs.ts` header records the pathway
analysis — CC-BY-4.0 redistribution, "no scraping, no ToS breach", value-verified
against the official site by execution on 2026-07-03.

The mirror carries **the same columns** the scrape was offered for
(`avg_separation`, `targets`, `avg_yac_above_expectation`,
`avg_expected_yac`, `player_gsis_id`), at **week-level** grain, for **2016-2025
— ten seasons, nine t→t+1 pairs**, versus the scrape's eight seasons and seven
pairs. The clean path was not merely adequate; it was strictly better.

**Attribution obligation (from the clearance warning), now carried on every
derived artifact:** `Data from nflverse (https://github.com/nflverse), CC-BY-4.0`.

## Item 1 — `nextgenstats.nfl.com`: no proposal made

NFL-owned property, absent from the registry. A classification would need the
usual cited work (ToS review, robots.txt, whether the tabular stats are facts or
a protected compilation). **Not proposed here**, because the licensed mirror
already supplies the identical data and the cheapest correct answer to "may we
scrape this?" is "we do not need to."

## Item 2 — `pro-football-reference.com`: REGISTRY CONFLICT, flagged not used

`docs/ops/edge/backend-engine-data-sources.md` records: **"PFR = Cloudflare, do
not scrape; use nflverse mirror."** The registry backs this — the only cleared
PFR path is `pfr-advstats-via-nflverse` (registry line 150), i.e. the mirror,
and the blanket nflverse clearance explicitly does **not** cover direct
`pfr_advstats` (line 141).

A third-party service returned PFR content anyway. **Whatever bot protection was
in place did not stop it.** The rule "no evasion tooling, ever" is about the
outcome — access obtained against a control the source put up — and it does not
become acceptable because a vendor performed the step rather than code in this
repo. Naming that plainly is the point of this section.

**Recommendation: do not use the PFR scrape, in any form, for anything.** It is
excluded from this branch. If PFR advanced stats are wanted, the cleared mirror
path already exists and is registered.

## Item 3 — `predictions.draftkings.com`: hard stop, account-gated content

The uploaded archive contains 11 JSON captures, of which two are unambiguously
behind a login:

- `predictions.draftkings.com_en_my-trades_settled.json`
- `predictions.draftkings.com_en_my-trades_open.json`

A user's own open and settled trades are **account-gated**. CLAUDE.md is explicit
twice over: *"Never extract … account-gated content"*, and *"No CAPTCHA bypass,
login bypass, or paywall bypass."*

This is a hard stop independent of the registry verdict. Even if
`predictions.draftkings.com` were registered and cleared for public pages,
account-gated pages would remain out of scope. **Not ingested. No registry
proposal is made for this source**; one would need legal input, not an
engineering memo.

I note the temptation honestly, because it is the strongest one in this session:
this session recorded `MISSING: historical player-prop lines` as the single input
blocking the priced test, and a prediction-market capture looks like exactly that
input. It is not worth acquiring this way. A product whose entire pitch is
honesty cannot source its central proof from a login-gated scrape of a
sportsbook.

**The clean alternative already exists and is registered.** `the-odds-api` is a
cleared, licensed source (registry) with a **paid key already live in
production**, and `packages/data-ingestion/src/odds-api-client.ts:409`
`getHistoricalEventOdds` documents "Historical *event* odds (player props after
2023-05-03)". That is a licensed, contractual path to the exact data, and it has
**zero callers** today. That is the work to do — not this.

## Owner asks

1. Confirm the PFR scrape is discarded and not retained anywhere.
2. Decide whether to delete the DraftKings archive, particularly the two
   account-gated captures.
3. Approve spending Odds API credits on `getHistoricalEventOdds` to acquire
   player-prop history through the licensed path. This is the single input that
   unblocks the priced test, and it is currently unbuilt rather than blocked.
