# TheSportsDB pilot — 2026-10-13 (PFR alternative, robots-permitted)

## Why this pilot exists

Pro Football Reference is **robots-blocked** for football pages:

```
https://www.pro-football-reference.com/robots.txt   (reported 2026-10-13)
  User-agent: *
  Disallow: /football/
```

Our own curl probe of that URL returned `HTTP 403` (Cloudflare "Just a moment..." interstitial),
so we could not read the file directly — but the operator-reported contents above stand, and either
way the football paths are not available to us. **No PFR crawling is planned or piloted anywhere in
this repo.** This pilot demonstrates one of the named alternatives instead: **TheSportsDB**.

Robots check (probed 2026-10-13, transcript:
`docs/data-sources/research/2026-10-13/robots-probe/robots-2026-10-13.txt`):

```
=== https://www.thesportsdb.com/robots.txt ===
HTTP 200 bytes=379
User-agent: *
Allow: /
Disallow: /nfo/
Disallow: /nfo.php
Content-Signal: ai-train=no, search=yes, ai-input=no
User-agent: GPTBot
Disallow: /
... (GPTBot, Slurp, AhrefsBot, Amazonbot, Semrush* all Disallow: /)
```

Reading: general agents may crawl; the `/nfo/` and `/nfo.php` paths are off-limits; the site asks
that its content not be used for AI *training*. This is a **crawl-permitted, training-restricted**
source — so it is usable as a *signal feed for our own analysis* only after a rights review of
TheSportsDB's terms. The rights registry (`apps/web/lib/scraping/source-rights-registry.ts`) has
**no TheSportsDB entry today**, and `apps/web/lib/scraping/sports-data-candidates.ts` already lists
`id: "thesportsdb"` as a candidate — so the correct next step is a registry entry, not production
wiring.

## Commands run (exact, reproducible)

```bash
cd C:/Users/Garrett/Sports
mkdir -p docs/data-sources/research/2026-10-13/thesportsdb-pilot

# 0) auth / budget check
firecrawl --status

# 1) HTML page → markdown
firecrawl scrape "https://www.thesportsdb.com/league/4391" \
  -o docs/data-sources/research/2026-10-13/thesportsdb-pilot/league-4391-nfl.md

# 2) JSON API → markdown-wrapped JSON
firecrawl scrape "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Arizona_Cardinals" \
  -o docs/data-sources/research/2026-10-13/thesportsdb-pilot/api-searchteams-cardinals.json
```

Firecrawl status at run time: **v1.25.3, authenticated via stored credentials, 3,459 / 5,000 credits
left this cycle** (2 credits consumed by this pilot).

## Artifacts

| File | Bytes | What it is |
|---|---|---|
| `league-4391-nfl.md` | 44,008 | TheSportsDB NFL league page (4391) as markdown — nav chrome plus league content; contains Cardinals/Chiefs/AFC/NFC/Super Bowl strings |
| `api-searchteams-cardinals.json` | 6,632 | TheSportsDB v1 API response for `searchteams.php?t=Arizona_Cardinals`, wrapped as `{"markdown": "...json...", "metadata": {...}}` |

Verified fields in the API payload (first team object, 63 fields):

```
idTeam 134946 | idESPN 22 | idAPIfootball 11 | strTeam "Arizona Cardinals"
strTeamShort "ARI" | strSport "American Football" | strLeague "NFL" | idLeague "4391"
idVenue 16027 | strStadium "State Farm Stadium" | strLocation "Glendale, Arizona"
```

The `idESPN` field is the interesting one: TheSportsDB carries an **ESPN id crosswalk**, which is
exactly the join key a PFR-free pipeline needs to reconcile team/venue metadata against the ESPN
public API the repo already reads (`apps/web/lib/data-sources/free-adapters/espn-*.ts`).

## Honest caveats

1. **Robots ≠ rights.** `Allow: /` means we may *fetch*; it does not mean we may *store, display or
   redistribute*. TheSportsDB's terms were **not** reviewed in this session. No production wiring
   until `source-rights-registry.ts` carries a TheSportsDB verdict. [UNVERIFIED — needs rights review]
2. **Content-Signal `ai-train=no`.** Do not use these artifacts as training text for the mind/feed.
   Treat as reference metadata only.
3. The API key in the URL (`/json/3/`) is TheSportsDB's public test key. Production use requires a
   registered key (free/paid tiers); confirm tier terms first. [UNVERIFIED — tier terms not read]
4. The league page artifact is mostly navigation chrome. The **API** is the useful access path; the
   HTML page is only a fallback for content the API does not expose.
5. Nothing here replaces PFR's charting/advanced-stats depth. TheSportsDB gives identity, venue and
   roster-level metadata; it does **not** give play-by-play or PFR's charting grades. For those, the
   approved path remains nflverse releases — except `pfr_advstats`, which is
   `permission_required` / `automation_allowed: false` in the rights registry.

## Suggested next step (not done here)

Add a `thesportsdb` entry to `apps/web/lib/scraping/source-rights-registry.ts` with the real terms
read, then decide between the API (metadata crosswalk) and nothing at all. Until then, this directory
is a **pilot artifact**, not an ingestion path.
