# ADR 005 — Free Data Source Candidates + Distribution Channel Config

**Date:** 2026-06-19
**Status:** Accepted
**Author:** Autonomous loop (Workstream-M expansion, cycle 3)

## Context

The prediction engine has a built-in weather factor (outdoor game-time conditions
affect totals and passing models) that was data-blocked — no approved weather
source existed in the Source Rights Registry. In parallel, several data source
categories (combat-sports results, NFL schedules, sports journalism, jersey
numbers, historical stats) were identified as useful but unclassified.

Separately, the revenue operating system (Workstream M) defines distribution
channels (YouTube, TikTok, Instagram, Discord, Telegram, RSS, newsletter) that
belong in a typed config for the `/cockpit/channels` surface — not fabricated
with fake metrics, but honestly marked `not_connected` until real analytics
integrations are wired.

This ADR records the rights-classification decisions for each new source and the
rationale for the distribution-sources config.

## Binding constraint

Every source entry MUST pass through `checkClearance()` (the Scraping Clearance
Engine, `apps/web/lib/scraping/clearance-engine.ts`) before any extraction job
runs. A `ClearanceResult` with `allowed=false` stops the job unconditionally.
`wrapExtractedRecord()` enforces the rights-snapshot envelope and throws if
clearance was not granted. No entry added in this ADR changes or weakens these
guards.

**No extraction is enabled by any entry in this ADR.** The entries below are
classifications only. Sources with `permission_required`, `vendor_candidate`, or
`manual_research_only` status require the conditions documented in their
`unlock_condition` field before any automation can proceed.

---

## Source classifications

### 1. National Weather Service API (`nws-weather-api`)

**Status assigned:** `approved_api`

**Why:** The NWS REST API (`api.weather.gov`) is a U.S. federal government
service. All NWS data is a U.S. Government Work under 17 U.S.C. §105 and is
in the public domain. No API key is required. No contract or login is needed.
The API is explicitly designed for open automated use (OpenAPI spec published at
`api.weather.gov/openapi.json`). There are no copyright restrictions on the
weather facts (temperature, wind, precipitation). This is the most conservative
status that still accurately represents the source's actual posture — the source
genuinely is an open public API.

**Value:** Game-time weather for outdoor NFL, MLB, and college football venues
(US only). The prediction engine already has a built-in weather factor that was
data-blocked. This source unblocks it. Facts only: temperature, wind speed/
direction, precipitation probability — no creative expression, no personal data.

**Gate:** Extraction remains gated behind `checkClearance()` + a registered
`approved_api`-compatible mode (`licensed_api_ingest` or
`public_logged_off_fact_extract`). For non-US venues, use Open-Meteo
(`open-meteo`, `approved_open_license`).

---

### 2. The Athletic (`the-athletic`)

**Status assigned:** `permission_required`

**Why:** The Athletic is a subscription-only sports journalism outlet (acquired
by the New York Times Company). Its Terms of Service explicitly prohibit
automated scraping and crawling. Content is paywalled and protected by copyright
(editorial expression). `permission_required` is the most conservative status
short of `excluded`, and it is accurate — there is a potential licensing path
(written agreement with The Athletic Media Company) but no automation is
permitted without it.

`approved_public_logged_off` was considered and rejected: the site requires a
subscription to read full content, and its ToS bar automated access regardless.

**Value:** Injury context, coaching signals, lineup news as factual references —
facts only (author, date, headline), never article bodies. The only permitted
lane today is a human reading publicly visible headlines as manual research
notes, per the Airwave source policy.

**Gate:** All extraction blocked. Manual research note (human review of
publicly accessible headlines/metadata) is the only permitted lane.

---

### 3. Tapology (`tapology`)

**Status assigned:** `permission_required`

**Why:** Tapology's Terms of Service prohibit automated scraping and commercial
use without consent. The database is a community-curated factual compilation of
MMA/combat-sports events and fighter records. While the underlying facts (fight
dates, results, opponents) are not copyrightable, Tapology's database may carry
EU sui generis database rights, and the ToS restriction on automation applies
regardless.

`manual_research_only` was considered but rejected in favor of `permission_required`
because there is a plausible licensing/API path and the value is higher than a
pure research-only source.

**Value:** UFC/MMA fight cards, fighter records, odds history — inputs for a
combat-sports prediction track. Unlockable via written permission or API
licensing from Tapology.

**Gate:** All extraction blocked. Manual research note (human reads public
fighter pages) is the only permitted lane today.

---

### 4. NFL.com Schedule (`nfl-schedule-api`)

**Status assigned:** `permission_required`

**Why:** NFL.com ToS explicitly prohibit scraping and commercial use of site
data without a license. The NFL is a known IP enforcer. Schedule facts
(teams, dates, venues) are not copyrightable, but the NFL's structured schedule
compilation may carry additional contractual or database-right protections, and
the ToS restriction on automation is unambiguous.

`approved_public_logged_off` was considered and rejected: the ToS bar is clear,
and the NFL actively enforces its data rights. The preferred path for schedule
facts already exists: The Odds API (`approved_api`) provides game schedules with
game lines, and nflverse (`approved_open_license`) covers historical data.
This entry exists to document the source category and its constraints.

**Value:** Official game schedules, venues, kickoff times — mostly covered by
existing approved sources. Evaluating the NFL Data Solutions licensing path
(nfldata@nfl.com) would unlock a direct official feed.

**Gate:** All extraction blocked. The Odds API and nflverse are the preferred
alternatives. Manual research note permitted for one-off fact checks.

---

### 5. Pro Football Reference (`pro-football-reference`)

**Status assigned:** `permission_required`

**Why:** Sports Reference's data_use policy (sports-reference.com/data_use.html)
explicitly states that automated scraping is not permitted. Their robots.txt
disallows most automated paths, and they rate-limit aggressively. A commercial
data license is available via sr-data@sports-reference.com.

`vendor_candidate` was considered; `permission_required` was chosen because the
automation block is explicit in their published policy (not just unevaluated
commercial terms), and the preferred substitute (nflverse, CC-BY-4.0) already
covers most of the same historical NFL data under an open license.

**Value:** Historical career stats, advanced splits, game logs. The preferred
free path is nflverse. If Sports Reference's coverage is needed (e.g., non-NFL
sports not in nflverse), the commercial license path is documented.

**Gate:** All extraction blocked. Use nflverse for NFL historical data.
Contact sr-data@sports-reference.com for commercial licensing if needed.

---

### 6. Jersey Number Database (`jersey-number-db`)

**Status assigned:** `manual_research_only`

**Why:** No authoritative free/open-licensed jersey-number database has been
identified with confirmed terms. The category entry exists to document the
research gap. Jersey number facts are not copyrightable, but the specific source
must be evaluated before any automation.

The preferred path is the nflverse roster data (CC-BY-4.0, already
`approved_open_license`) which includes player numbers — covering the NFL use
case without a new source. This entry remains `manual_research_only` until a
specific source is identified and its terms are confirmed.

**Value:** Player jersey number lookups for roster/identity disambiguation.
Likely fully covered by existing nflverse data for NFL.

**Gate:** Human research only. Update this entry with a confirmed source URL
and terms before any automation. If nflverse covers the need, no new entry is
required.

---

## Distribution channels config

`apps/web/lib/revenue/distribution-sources.ts` exports a typed
`DISTRIBUTION_SOURCES` config listing the free distribution/community channels
from Workstream M. Every entry has `status: "not_connected"` — no metrics are
fabricated. The config is surface-ready for `/cockpit/channels` but does not
edit that page.

Channels defined: YouTube (trust/authority), TikTok (acquisition),
Instagram (acquisition), Discord (community/owned), Telegram (owned),
RSS (owned/syndication), Newsletter (owned). Each carries `id`, `label`,
`role`, `status: "not_connected"`, and `ownerAction` describing what the
owner must do to activate it.

The config is additive and read-only — it does not enable any scraping,
does not change any rights flags, and does not weaken the legal posture.

---

## Consequences

**Positive:**
- The weather factor is now unblocked (NWS API is genuinely approved).
- Five additional source categories are classified, documented, and have
  explicit unlock conditions — future ingestion work can reference these
  instead of making ad-hoc decisions.
- The clearance engine remains the single gate — no entry bypasses it.
- The distribution channels config provides a typed foundation for
  `/cockpit/channels` without any fabricated data.

**Negative / limitations:**
- Sources with `permission_required` require outreach before delivering value.
- The jersey-number entry is a placeholder — it must be resolved to either
  "use nflverse" (preferred) or a confirmed source entry.
- NWS API covers US venues only; Open-Meteo remains the preferred path for
  international games.

## What this ADR does NOT do

- Does not enable extraction for any `permission_required`, `vendor_candidate`,
  or `manual_research_only` source.
- Does not add CAPTCHA bypass, proxy rotation, login bypass, or any evasion tool.
- Does not weaken the clearance engine or the RightsSnapshot requirement.
- Does not assign a status more permissive than the source's actual posture warrants.
- Does not fabricate any data, metrics, or analytics.
- Does not change `clearance-engine.ts` or `data-rules.ts`.

## Files changed

- `apps/web/lib/scraping/source-rights-registry.ts` — six new entries added
- `apps/web/lib/revenue/distribution-sources.ts` — new file, typed config only
- `docs/adr/005-free-data-and-distribution-sources.md` — this document
