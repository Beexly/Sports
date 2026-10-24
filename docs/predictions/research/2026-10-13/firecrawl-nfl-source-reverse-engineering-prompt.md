# FIRECRAWL MASTER PROMPT — NFL Props-Analytics Source Reverse Engineering

## How to run this

Paste this entire prompt into Firecrawl's autonomous agent (the agent mode with
browser + scrape + crawl + extract tools). Grant it the deepest crawl settings
available: follow sitemaps, fetch JavaScript bundles, read docs/help subdomains,
and pull archived snapshots. No login credentials will be provided — everything
below must come from publicly reachable surfaces only (see Rules).

You may split this into one run per TARGET dossier below, or run it as a single
campaign. Either way, exhaust each target before moving on. Dozens of pages per
target is expected, not excessive.

## Mission

Reverse-engineer the data pipelines behind nine NFL analytics creators whose
metrics are outperforming our internal models, plus the odds/market data layer
that prices player props. A previous research pass (2026-09-18) mapped what is
free and replicable — nflverse/nflfastR play-by-play (EPA, WP, WPA), The Odds API
v4, and a ten-facet EPA/WPA decomposition. Your job is everything that pass could
NOT crack: the proprietary charting tags, black-box grades, undisclosed data
providers, paywalled formulas, and undocumented API surfaces listed in the target
dossiers. Extract the maximum possible from public surfaces. Do not stop at the
first docs page — go DEEP: JS bundles, embedded JSON, OpenAPI specs, help
centers, changelogs, pricing matrices, archived snapshots, and public code
references.

Context: it is September 18, 2026. The 2026 NFL regular season is in Week 2
(Week 2 games play Sunday, September 20, 2026). "Current season" data means 2026.

## Rules (non-negotiable — these are the operator's standing doctrine)

1. **PUBLIC SURFACES ONLY.** Never log in, never bypass a paywall or login
   gate, never use credentials, tokens, session cookies, or API keys that are
   not yours, never impersonate anyone. If a page is publicly reachable without
   authenticating, it is fair game and you extract everything on it. If it sits
   behind a login, you stop at the gate and record what the gate itself reveals
   (plan names, feature lists, pricing).
2. **PROVENANCE ON EVERYTHING.** Every factual claim gets the exact URL and the
   date/time you accessed it. No exceptions.
3. **VERDICTS, NOT VIBES.** Label every finding:
   - CONFIRMED — seen directly in official docs, official code, or an official
     page. Quote the evidence.
   - INFERRED — reconstructed from public evidence. Show the evidence and the
     reasoning chain.
   - UNVERIFIED — rumored, undocumented, or seen only in third-party writeups.
     Never present these as confirmed.
4. **NO FABRICATED URLS OR ENDPOINTS.** Report only endpoint strings, paths, and
   parameters you actually observed in JS bundles, docs, or live responses.
   Never invent a plausible-looking path.
5. **NO HALLUCINATED SCHEMAS OR FORMULAS.** If you cannot see the formula, say
   so and list exactly which inputs are confirmed vs. guessed.
6. **EXTRACT, DON'T SUMMARIZE.** When a page holds a table, a glossary, or
   embedded data, pull the full content — every row, every column, every field
   name. Summaries are for your report; the raw extraction is the deliverable.
7. **RESPECT THE TARGETS' PUBLIC LICENSES** where stated (e.g., do not
   republish full paywalled articles; methodology facts and field names are
   fine).

## What the previous pass already mapped (do NOT redo — build past it)

- nflverse / nflfastR play-by-play: EPA, WP, WPA, Vegas WP/WPA, play context —
  free and fully mapped. Remaining gaps: exact formation fields (shotgun vs
  under center) and kickoff/return field names — see Target 9.
- The Odds API v4 (`https://api.the-odds-api.com/v4`): documented base, sport
  key `americanfootball_nfl`, markets `h2h`/`spreads`/`totals`, bookmakers
  DraftKings/FanDuel/Pinnacle — see Target 11 for the doc-extraction pass.
- Sam Hoppen's ten-facet EPA/WPA split (Pass Off, Run Off, Pass Def, Run Def,
  Takeaways, Giveaways, Offensive Penalties, Defensive Penalties, Special
  Teams, Other): fully replicated from nflfastR. Remaining gap: exact
  precedence rule when a play qualifies for two facets (e.g., turnover +
  penalty on the same play).
- Ben Baldwin's market-implied team tiers: blend of near-term DraftKings game
  lines with DraftKings futures (division, conference, playoff, No. 1 seed,
  Super Bowl). Known formula: `team_implied_total = total / 2 − signed_spread / 2`.
  Missing: exact futures weights, home-field adjustment, de-vig method.
- ThunderDanDFS matchup grades (RotoBaller): inputs confirmed as PFF grades /
  O-line data + FTN DVOA; output is a 0–100 black-box blend. Missing: exact
  weights and role/scheme/script adjustments.
- Josh Allen EPA/play heatmaps (@sfdata9ers): reproducible from nflverse once
  the play sample is defined. Missing: exact sample definition.
- SumerSports pricing (verified live 2026-09-18): $10/week, $20/month,
  $100/year, 7-day trial. No public API found. Missing: everything structural.
- PFF grading scale: −2 to +2 in 0.5 increments; positive/negative play rates
  are graded-play counts over eligible plays with neutral zeroes in the
  denominator. Missing: the rubric itself and eligibility rules.

Your targets are the MISSING pieces, not the mapped ones.

---

## TARGET 1 — FTN (Fantasy / FTN Data): the charting tags behind playcalling rates

**Who:** @sfdata9ers' playcalling-rate charts (motion %, screen %, play-action %,
no-huddle %, RPO %) are sourced from FTN's proprietary charting
(ftnfantasy.com). FTN also supplies DVOA-style data used by RotoBaller.

**What I have:** An OpenAPI surface with roughly 145 paths / 144 documented
GETs was observed; only 31 endpoints were empirically probed (they returned
invalid-token 401s without a key). Likely rate formulas:
`motion-tagged plays / eligible plays`, `screen or play-action plays / relevant
dropbacks`, `no-huddle snaps / offensive snaps`, `RPO-tagged plays / charted
plays` — but exact denominators and exclusions are unknown.

**What I need you to extract (public surfaces only):**
1. The complete OpenAPI/Swagger document if publicly hosted (check
   developers./docs./api. subdomains of ftnfantasy.com and ftn-related
   domains, plus `openapi.json` / `swagger.json` / `api/docs` paths — record
   which URLs exist and which 404).
2. The full endpoint inventory: every path, HTTP method, path/query
   parameters, and which endpoints serve charting tags (motion, screen,
   play-action, RPO, no-huddle, personnel, formation).
3. The tag glossary: FTN's own definitions — what counts as "motion" (any
   pre-snap movement? shifts excluded?), what counts as a "screen", how
   play-action is tagged (fake handoff vs. RPO reads), what qualifies as
   no-huddle (tempo vs. actual no-huddle offense).
4. Denominator and exclusion rules for every published rate: are kneels,
   spikes, penalties, nullified plays included or excluded? Minimum-snap
   cutoffs?
5. The auth model: which endpoints (if any) answer without a key; what the
   free tier includes; pricing page feature matrix (which plan unlocks
   charting vs. projections vs. DVOA).
6. Help-center / FAQ / glossary articles describing charting methodology —
   extract full text.
7. Public code references: GitHub public repos or gists referencing FTN
   endpoints (use only public code; never touch leaked keys — report their
   existence and the endpoint strings only).

**Where to dig:** ftnfantasy.com sitemap.xml and robots.txt; the main site's JS
bundles (search for `/api/`, `/v1/`, `/v2/`, `graphql`, endpoint-like strings);
help/support subdomains; pricing page; Internet Archive snapshots of the docs
and glossary pages (cite snapshot dates); the FTN blog for methodology posts.

---

## TARGET 2 — PFF: the grading black box

**Who:** @Shauncore's PFF QB charts (positive vs. negatively graded play rates,
2026 season). PFF grades every play −2 to +2 in 0.5 steps; most plays grade 0.

**What I have:** The scale; the rate construction (positive/negative graded
plays over eligible plays, zeroes in the denominator); the observed
consequence that a handful of −0.5s instead of 0s moves a game grade
materially. What I do NOT have: the rubric, eligibility, or normalization.

**What I need you to extract:**
1. PFF's own grading-rubric documentation: every public page describing what
   earns +2/+1.5/+1/+0.5/0/−0.5/−1/−1.5/−2 for QBs (and, separately, for
   receivers, linemen, defenders) — extract full text of each rubric page.
2. Eligibility and minimum rules: minimum snaps/dropbacks for a published
   grade; how penalties, throwaways, spikes, kneels, and nullified plays are
   treated; what "eligible graded plays" means in the denominator of the
   positive/negative play-rate stats.
3. The 0–100 normalization: PFF's published explanation of how raw grades
   become the 0–100 scale (position adjustments, season normalization).
4. Any public or semi-public data surface: inspect pff.com grades/rankings
   pages for embedded JSON (`__NEXT_DATA__`, `window.__STATE__`, JSON-LD);
   check for a developers.pff.com or api.pff.com surface and record what
   exists vs. 404s; extract API-like strings from pff.com JS bundles and label
   each UNVERIFIED.
5. PFF's published methodology articles and FAQ entries on grading
   (full text): especially anything stating denominator definitions or minimum
   thresholds in print.
6. PFF+ / subscription feature matrix: exactly which stats tables exist for
   each position (columns = the schema I can mirror).

**Where to dig:** pff.com/sitemap.xml; pff.com/grades pages and their page
source; PFF's "About PFF grading" hub and linked explainers; support/FAQ;
Internet Archive snapshots of rubric pages; YouTube/PFF show transcripts where
analysts describe grading (cite video + timestamp).

---

## TARGET 3 — SumerSports: the proprietary charting + new position tables

**Who:** SumerSports app (sumersports.com) — @tejfbanalytics / @QBgami post
under-center rate vs. under-center EPA/play and similar charting-backed splits.
On 2026-09-18 they announced linebacker, defensive-interior, and edge-rusher
tables plus preseason/postseason filters back to 2022 (announced on X; not
independently confirmed on the public site).

**What I have:** Pricing only ($10/week, $20/month, $100/year, 7-day trial,
verified live 2026-09-18). No public API found. Candidate formulas are trivial
(`under_center_rate = under-center snaps / eligible snaps`) — the value is the
tags, not the math.

**What I need you to extract:**
1. Full sitemap crawl of sumersports.com: every public page, especially
   methodology, glossary, features, and table/column documentation.
2. Table schemas: for EVERY public stats table (passing, rushing, receiving,
   and the new LB / defensive-interior / edge tables if publicly visible):
   every column name, its definition, and any published formula. If tables sit
   behind the trial gate, record the gate and extract only what's public
   (feature lists, column previews, screenshots' visible headers).
3. Metric glossary: Sumer's own definitions for pressure, hurry, coverage
   shells, box counts, alignment tags, under-center vs. pistol vs. shotgun.
4. Any API surface: JS bundle endpoint strings, mobile-app API references in
   public docs, `openapi.json`/`swagger` probes (record 404s honestly).
5. Pricing/feature matrix: exactly which tables and filters each tier unlocks;
   trial terms; any promo references (e.g., WELCOME15) and their terms.
6. Blog/changelog: the 2026-09-18 launch claims (LB/DI/edge tables,
   preseason/postseason from 2022) — confirm or deny each against the public
   site and quote the evidence.

**Where to dig:** sumersports.com sitemap + robots; app.sumersports.com or
similar subdomains (public landing pages only); pricing page; blog; JS bundles
of public pages; Archive snapshots of the features page.

---

## TARGET 4 — StatRankings: the undisclosed provider behind @MagicSportsGuy

**Who:** @MagicSportsGuy posts alignment shares, target share, first-read
share, TPRR (targets per route run), YPRR (yards per route run), coverage-shell
splits, and projected WR/CB assignment overlap, sourced to "StatRankings."

**What I have:** The standard formulas are trivially reproducible once route
and coverage charting exist (`TPRR = targets / routes`,
`YPRR = receiving yards / routes`,
`alignment_share = routes at alignment / total routes`; projected overlap ≈
receiver-alignment distribution × defender-assignment distribution). What is
missing: WHO StatRankings is, who supplies their charting, and whether any
public API or data surface exists.

**What I need you to extract:**
1. The identity: StatRankings' about page, company registration traces,
   founder/team bios, launch announcements, terms/privacy pages (company name,
   address, contact) — anything establishing who operates it.
2. The provider disclosure: any statement of their data supplier (charting
   vendor, feed partner). If none exists, say so explicitly after checking
   about/FAQ/terms/blog.
3. Site architecture: sitemap, page inventory, every public report/table type
   and its columns (schema extraction).
4. Embedded data: page-source JSON on report pages; JS bundle endpoint
   strings (label UNVERIFIED); any developers/docs surface (record 404s).
5. Pricing and access tiers: free vs. paid features, trial terms.
6. Methodology pages: definitions of first-read share, alignment buckets
   (wide/slot/inline/backfield), coverage-shell buckets (Cover 1/2/3/4/6,
   2-man), and how WR/CB assignment overlap is computed.

**Where to dig:** the StatRankings domain (find it via search if needed —
   verify you are on the real domain before extracting); sitemap/robots;
   launch press release; Archive snapshots from launch to present.

---

## TARGET 5 — Fantasy Points Data Suite: Advanced Matchups

**Who:** @RyanJ_Heath's Advanced Matchups (fantasypoints.com) — proprietary
coverage/schematic charting driving matchup edges. The 2026 formula is
paywalled (do not touch it).

**What I have:** From his public podcast transcript: the system forecasts the
opponent's coverage-shell mix, combines it with player performance by shell,
then applies coverage/pressure/line mismatch adjustments. Coverage-agnostic
approximations are buildable; shell-specific replication is not.

**What I need you to extract (free surfaces only):**
1. Every free article, glossary entry, and help page describing Advanced
   Matchups inputs, shell definitions, and adjustment factors — full text.
2. The coverage-shell taxonomy: Fantasy Points' own shell buckets and
   definitions (extract the glossary verbatim).
3. Podcast/video transcripts (YouTube, show notes): every passage where Heath
   or colleagues describe the model's inputs or weighting — cite video +
   timestamp.
4. Feature matrix: what the free vs. paid Data Suite tiers expose (table
   names, columns visible in previews/screenshots).
5. Any public methodology PDFs, whitepapers, or conference talks.

**Where to dig:** fantasypoints.com articles archive (search "Advanced
Matchups"); glossary; YouTube channel transcripts; podcast feeds; help docs.

---

## TARGET 6 — RotoBaller: the ThunderDanDFS grade weights

**Who:** @ThunderDanDFS publishes 0–100 pass/rush matchup grades and RB grades
via RotoBaller's NFL Matchup methodology. Inputs confirmed: PFF grades/O-line
data + FTN DVOA; the blend is a black box.

**What I need you to extract:**
1. RotoBaller's methodology articles: every page describing how matchup grades
   are computed — full text, with any stated input list, weight hints,
   or worked examples.
2. The grade scale documentation: what 0–100 means, update cadence (weekly?
   daily?), and whether grades are opponent-adjusted, and how.
3. Role/scheme/script adjustments: any public description of how player role,
   offensive scheme, or expected game script modifies a grade.
4. The implied-total pipeline: how RotoBaller sources spreads/totals (which
   book, what refresh cadence).
5. Author archives: everything ThunderDanDFS has published on methodology.

**Where to dig:** rotoballer.com methodology/how-it-works pages; author
archive; help/FAQ; sitemap; Archive snapshots of methodology pages.

---

## TARGET 7 — Ben Baldwin: the futures-blend weights

**Who:** @benbbaldwin's Team Tiers: market-implied win probability vs. a
league-average team on a neutral field (e.g., 2026-09-18: LAR 72.8, BAL 68.4
… MIA 24.2), blending near-term DraftKings lines with DraftKings futures.

**What I need you to extract:**
1. Every methodology writeup: his blog/Substack/site posts explaining the
   tier construction — full text. Especially: the exact futures markets
   blended, their weights, and the home-field adjustment.
2. The power-rating regression spec: any published description of regressing
   spreads on a team-incidence matrix (or equivalent) to estimate latent team
   strength.
3. De-vig method: any stated overround-removal approach (e.g., logarithmic,
   Shin, or power method).
4. Historical methodology changelogs: how the blend changed across seasons.
5. Any public code repos (his or others') implementing the described method.

**Where to dig:** his site/blog/Substack archive (search "tiers"
"methodology" "power ratings"); X threads describing construction (public
posts only — read, don't interact); Archive snapshots.

---

## TARGET 8 — DraftKings sportsbook: the public odds surfaces

**Who:** The underlying market data. DraftKings' internal sportsbook SPA calls
are UNDOCUMENTED — never present them as a supported API.

**What I need you to extract:**
1. DraftKings' documented public offerings: developer/affiliate/API program
   pages — what officially exists for odds access (record URLs or honest
   404s/absences).
2. Public JS bundle endpoint strings on sportsbook.draftkings.com — extract
   the URL patterns you actually observe and label every one UNVERIFIED /
   undocumented; do not present them as usable or supported.
3. DK's published house rules / grading rules that affect how lines should
   be interpreted (dead-heat rules, postponement handling).

---

## TARGET 9 — nflverse: formation + kickoff field verification

**Who:** The free foundation. The previous pass mapped EPA/WP/WPA but could
not verify exact field names for formations and kickoffs.

**What I need you to extract:**
1. The nflverse data dictionary: exact field names and definitions for
   shotgun vs. under-center vs. pistol indicators, and every kickoff/return
   field (kickoff team, return yardline, touchback flag, penalties on the
   play) — from the official dictionary/docs, with URLs.
2. Sample values and known quirks documented for those fields.
3. The release/format docs: file layouts for the current season's
   play-by-play releases.

**Where to dig:** nflverse.com data dictionary; the nflverse-data GitHub repo
docs; nflfastR documentation.

---

## TARGET 10 — @sfdata9ers kickoff study: the exclusion rules

**Who:** Kickoff average starting-field-position charts.

**What I need you to extract:**
1. Any methodology note, reply, or article from @sfdata9ers (public X posts —
   read only, no interaction) stating how penalties, onside kicks, return
   touchdowns, safeties, and end-of-half kickoffs are handled.
2. Whether the study uses nflverse or FTN sourcing (any statement of source).

---

## TARGET 11 — The Odds API: full doc extraction

**Who:** api.the-odds-api.com/v4 — our newly connected odds feed (free tier).

**What I need you to extract:**
1. The complete endpoint inventory from the official docs
   (the-odds-api.com): `/sports`, `/sports/{sport}/odds`,
   `/sports/{sport}/events`, `/sports/{sport}/scores`,
   `/historical/...` — every parameter, allowed values, and response schema.
2. The credit-cost schedule: exact credit cost per endpoint/market/region
   combination; which endpoints are free; what happens at quota exhaustion.
3. Bookmaker key list: every `bookmaker_key` value and its region mapping.
4. Sport key list: all current `sport_key` values.
5. Terms-of-service constraints relevant to analytics use (caching rules,
   redistribution limits) — quote the operative clauses.

---

## Extraction techniques (use aggressively — all public)

- `sitemap.xml` and `robots.txt` enumeration on every target domain; follow
  every sitemap index.
- JS bundle string mining: fetch the site's JavaScript and extract strings
  matching `/api/`, `/v1/`, `/v2/`, `/v3/`, `/v4/`, `/graphql`, `apiKey=`,
  `fetch("`, `axios.` patterns. Report each string with the bundle URL.
- Embedded JSON: `__NEXT_DATA__`, `__NUXT__`, `window.__STATE__`,
  `window.__PRELOADED_STATE__`, JSON-LD blocks — dump the relevant objects.
- API-doc probes: `/openapi.json`, `/swagger.json`, `/swagger/`,
  `/api/docs`, `/docs`, `/developers`, `/redoc` — record hits AND 404s.
- Subdomain sweep via certificate-transparency-style public indexes and
  search engines: `docs.`, `developers.`, `api.`, `support.`, `help.`,
  `status.`, `blog.`, `app.` — only visit what resolves publicly.
- Internet Archive snapshots of methodology/glossary/pricing pages (cite the
  snapshot timestamp; prefer the freshest snapshot that shows the content).
- GitHub public code search for the target's domain/endpoint strings (public
  repos only; never use, test, or republish leaked keys — report endpoint
  strings only, and note the repo URL + date).
- Pricing/feature matrices, changelogs, status pages, app-store listings
  (feature descriptions are public product documentation).
- YouTube transcripts and podcast show notes where the creators explain
  their methods (cite video/podcast + timestamp).
- Terms of service / privacy policy (company identity, data-use clauses).

---

## Output format

### Per target (11 sections)
1. **Endpoint inventory table** — method, path, parameters, auth requirement,
   verdict (CONFIRMED/INFERRED/UNVERIFIED), evidence URL + timestamp.
2. **Schema/field dictionary** — every field or column you confirmed, with the
   target's own definition quoted.
3. **Formula reconstructions** — each metric's computation with evidence
   quotes; mark every unknown with WHAT is unknown and WHY it matters.
4. **Explicit gap list** — what remains proprietary or unverifiable, and the
   cheapest legitimate way to obtain it (buy the product, license the feed,
   or build the charting in-house — with the target's own pricing quoted).

### Master deliverable: PROP-INPUT COVERAGE MATRIX
One table mapping each prop-model input to the best source you found:

| Prop input | Best public source | Confidence | What stays proprietary |
|---|---|---|---|
| routes run | … | … | … |
| targets | … | … | … |
| first-read share | … | … | … |
| TPRR | … | … | … |
| YPRR | … | … | … |
| alignment shares | … | … | … |
| coverage shells | … | … | … |
| motion rate | … | … | … |
| screen rate | … | … | … |
| play-action rate | … | … | … |
| RPO rate | … | … | … |
| no-huddle rate | … | … | … |
| implied totals | … | … | … |
| pass matchup grade | … | … | … |
| rush matchup grade | … | … | … |
| pressure rate | … | … | … |
| OL/DL composites | … | … | … |
| kickoff start position | … | … | … |
| projected plays / drives | … | … | … |

For each row: the source, the exact endpoint or table, the verdict, and the
evidence URL. Where no public source exists, say so and name the paid or
build-it-yourself path with pricing.

Begin with Target 1 and do not stop until all eleven are exhausted. Depth over
speed: the operator will decide what to use — your job is to make sure nothing
publicly reachable is left on the table.
