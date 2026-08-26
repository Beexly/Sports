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

---

# ADDENDUM — crawl4ai feed + teamrankings (reported 2026-08-26, NOT verified here)

**Still a PROPOSAL. Nothing applied to the registry.**

## What was reported, and what I could confirm

A separate seat reports: container `crawl4ai_nfl_local` healthy, feed attempted,
"5 crawls verified, max legal position held, boundary documented", with
artifacts `FEATURE_STORE_ACTUAL.md`, `MODEL_ACTUAL.py`, `CALIBRATION_FEATURE.md`,
`UNIFIED_INDEX.md`, `CRAWL4AI_FEED_LOG.md`, `CRAWL4AI_FEED_ATTEMPT.md`,
`COMPLETE_A_B_C.md`, and `ENGINE_CRAWL_LIVE.zip` (81 files) at `Sports/reports/`.

**I could verify NONE of it.** All eight are absent from this working tree, and
absent from all 120 `origin` refs. `reports/` contains no zip. The working tree
is clean. So this was produced in an environment this session cannot see, and
per honesty law 1 I record it as reported, not as observed:
`MISSING: all eight named crawl4ai artifacts`.

## The legal reasoning already in this repo SUPPORTS the crawl

Credit where due — `docs/ops/edge/backend-engine-data-sources.md:42-47` did the
homework before any crawl ran:

- `teamrankings.com` — "robots ALLOWS site content, Crawl-delay: 10 → legal slow
  crawl of power-ratings/trend pages via crawl4ai (deferred to next lane)"
- `sportsbookreview.com` — Cloudflare-hardened, deferred, odds API preferred
- `pro-football-reference.com` — "Cloudflare challenge on even robots.txt → do
  NOT"

A crawl of teamrankings at a 10s delay, honoring a robots file that permits it,
is a legitimate position and is NOT the evasion pattern. "Boundary documented"
is consistent with respecting the PFR "do NOT". I opened by flagging this as a
likely evasion concern; the repo's own analysis does not support that reading
and I withdraw it.

## But the ENFORCEMENT layer knows about neither the source nor the tool

Verified in code this session:

| gate | file | state | consequence |
|---|---|---|---|
| `teamrankings.com` | `source-rights-registry.ts` | **absent** | `checkClearance()` returns `allowed=false`, `SOURCE_NOT_REGISTERED` |
| `crawl4ai` | `tool-registry.ts` `ToolId` union | **absent** | cannot be passed to `checkClearance()` at all — it does not typecheck |

The `ToolId` union is exactly:
`trafilatura | crawlee-python | playwright | autoscraper | easyspider | fetch-native | manual-operator`.

So there is a gap between the doctrine (a documented, reasoned, legal crawl
plan) and the mechanism (a clearance engine that would refuse it, and a tool
enum that cannot express it). That gap is the finding. It is not an accusation
about the crawl; it is that **the crawl's output cannot lawfully enter this
repo until the registry can represent it**, because `checkClearance()` runs
before every extraction and `allowed=false` stops the job.

## Two owner decisions, proposed not applied

1. **Add `teamrankings.com` to `source-rights-registry.ts`.** Candidate status
   `approved_public_logged_off` on the cited basis (robots allows, Crawl-delay:
   10, facts only, no login, no contract). Needs the standard cited memo:
   ToS review, robots snapshot, and what may be extracted (power ratings and
   trend figures are facts; site copy and any proprietary composite rating are
   not).
2. **Add `crawl4ai` to the Tool Registry `ToolId` union**, with its rate-limit
   and robots-honoring configuration recorded. Note the standing law: evasion
   tools must NOT be added. crawl4ai used at a robots-declared delay against a
   robots-permitted path is not evasion; the same tool pointed at a
   Cloudflare-challenged host would be. The registry entry should make the
   permitted posture explicit so the distinction is enforced rather than
   remembered.

Until both land, any record from these crawls fails the envelope requirement in
`wrapExtractedRecord()` and must not be merged.

## Unchanged from the main memo

The three sources assessed above — `nextgenstats.nfl.com`,
`pro-football-reference.com`, `predictions.draftkings.com` — remain
`allowed=false`. The Q2 pipeline in this branch used the licensed nflverse
mirror (`allowed=true`) and needs none of this.
