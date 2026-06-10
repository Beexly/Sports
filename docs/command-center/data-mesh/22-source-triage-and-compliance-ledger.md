# 22 — Source Triage + Compliance Ledger

> **Status:** Compliance/triage doc. Written 2026-06-10 against the deploy clone
> `C:/Users/Garrett/Sports`. No code/schema/env change. Verdicts below are recommendations
> for the mesh registry (docs 20-21); **flipping anything live remains a founder action.**
>
> **Hard lines (binding on every verdict):**
> 1. Only **free** or **already-configured** sources may be RECOMMENDED.
> 2. **No login-wall scraping. No TOS/robots/rate-limit bypass.** A source whose access path
>    requires any of those is **NOT**, full stop.
> 3. **The Odds API stays the standing primary** (founder decision). The mesh demotes the
>    single-provider *risk*; it does not relitigate the provider (`provider-registry.ts:96-105`).
> 4. **Approval rule:** any High-risk source needs owner/legal approval before automation,
>    paid display, or launch; blocked value cannot silently enter the model
>    (`docs/research/gse-source-risk-register.md:17-19`).
> 5. Do-not-touch flags and public filters stay untouched regardless of source work
>    (`docs/research/gse-current-data-state.md:101-105`).

**Verdict vocabulary:**
- **RECOMMENDED** — compliant access path verified or corpus-graded low-risk; build behind
  the standard gates (shadow-first, env-gated, fail-closed).
- **CONDITIONS** — usable only after the named condition(s) are met (terms verification,
  legal approval, attribution wiring, founder sign-off).
- **NOT** — do not build. Reason given (TOS/login-wall/rate-limit violations are automatic NOT).

---

## 1. Triage table — odds & market lane

| Source | Verdict | Conditions / Reason | Grounding |
|---|---|---|---|
| **The Odds API** | **RECOMMENDED (standing primary)** | Already configured + live. Condition retained from corpus: re-verify current plan quota, NFL market availability, and display/cache rights before expanding usage (free tier ~500 credits/mo per provider site) | SRC-001 (`gse-free-source-inventory.md:7`); `gse-source-validation-notes.md:22`; [the-odds-api.com](https://the-odds-api.com/); live at `odds-api-client.ts:65-146` |
| **odds-api.io** | **CONDITIONS** | (a) Registry stub already exists — adapter is the founder-sanctioned fallback #1 (`provider-registry.ts:118-127`). (b) Free tier = 2 bookmakers / 100 req-hr — fine for liveness + sanity reference, NOT production polling. (c) TOS permits analytical/modeling use; **no resale/redistribution of the raw feed**; no multi-free-account stacking. (d) Confirm in-dashboard *which* 2 books the free tier serves before relying on it | [pricing](https://odds-api.io/pricing); [terms](https://odds-api.io/terms); [props docs](https://docs.odds-api.io/examples/player-props) |
| **API-Sports (NFL)** | **CONDITIONS** | (a) Registry stub exists (`provider-registry.ts:135-144`). (b) Free 100 req/day per API; $19-39/mo paid tiers — but pricing pages returned **HTTP 403 to direct fetch from this network**, so tiers are search-corroborated only: verify first-hand in dashboard before wiring limits. (c) Corpus flags terms as requiring current verification. (d) Treat as schedule/scores/stats fallback first; odds last (bookmaker-sparse) | SRC-033 (`gse-free-source-inventory.md:39`); `gse-source-validation-notes.md:23`; [api-sports.io/sports/nfl](https://api-sports.io/sports/nfl); [api-football pricing](https://www.api-football.com/pricing) |
| **Kalshi public market data** | **RECOMMENDED with conditions** | Officially no-auth public read: `GET /trade-api/v2/markets` declares `security: []` in the OpenAPI spec — not a TOS gray area. Conditions: (a) read-only market-data lane only (no trading — hard line: no autonomous money); (b) unauthenticated rate cap is unpublished — poll politely (≤1 req/s); (c) label as market-implied probability on event contracts, **never** as sportsbook lines; (d) it is absent from the SRC inventory and this clone's code — add a corpus entry + registry row before build | [Get Markets](https://docs.kalshi.com/api-reference/market/get-markets); [rate limits](https://docs.kalshi.com/getting_started/rate_limits); [help article](https://help.kalshi.com/en/articles/13823854-kalshi-api); zero in-clone code (grep 2026-06-10) |
| **SportsGameOdds** | **CONDITIONS** | Free tier/trial claimed in docs; verify current terms, display/cache rights, and provider overlap before evaluation; never double-count with The Odds API | SRC-031 (`gse-free-source-inventory.md:37`) |
| **DraftKings / FanDuel public pages** | **NOT** | Automated extraction prohibited/restricted by terms — sportsbook scraping is deny-listed. TOS violation = automatic NOT | SRC-038 (`gse-free-source-inventory.md:44`); `gse-source-risk-register.md:10` |
| **Pinnacle (or other named sharp book) as closing reference** | **CONDITIONS** | `closingRef` plumbing is ready (config-not-schema), but a named-book reference requires confirming the odds provider's license permits storing/derived use of that book's lines (BUILD-032) + founder sign-off | `closing-line.ts:31-44`; `15-clv-closing-line-defer-note.md:76-84` |

## 2. Triage table — stats, context, and signal lanes

| Source | Verdict | Conditions / Reason | Grounding |
|---|---|---|---|
| **nflverse releases (nflreadr/nflreadpy/nflfastR/nflverse-data)** | **RECOMMENDED** | CC-BY-4.0 (repo-tagged); conditions baked into the build: attribution UI, release pinning, and the corpus caveat that package license ≠ underlying data rights — don't imply NFL licensed anything | SRC-002..006 (`gse-free-source-inventory.md:8-12`); [nflverse-data](https://github.com/nflverse/nflverse-data); [nflreadr](https://nflreadr.nflverse.com/) |
| **FTN-attributed participation slice (2023+)** | **CONDITIONS** | CC-BY-SA 4.0 with required credit "FTN Data via nflverse"; share-alike obligations reviewed before derived public display | SRC-012 (`gse-free-source-inventory.md:18`); [changelog](https://nflreadr.nflverse.com/news/index.html) |
| **NGS via nflverse mirror** (`load_nextgen_stats`) | **RECOMMENDED** | Weekly aggregates 2016+, nightly in-season; attribution as nflverse | [reference](https://nflreadr.nflverse.com/reference/load_nextgen_stats.html) |
| **NFL.com / nextgenstats.nfl.com direct endpoints** | **NOT** | Unofficial/undocumented endpoints; SRC-017 grades scraping High; the mirror makes it unnecessary — same reasoning as the ESPN deny | SRC-017 (`gse-free-source-inventory.md:23`); `gse-source-risk-register.md:5` |
| **Big Data Bowl tracking datasets** | **CONDITIONS** | Offline R&D only under contest terms (Kaggle account); never a live production feed | SRC-019 (`gse-free-source-inventory.md:25`) |
| **api.weather.gov (NWS)** | **RECOMMENDED** | Public-domain US-gov data; conditions baked in: unique User-Agent header, cache by endpoint metadata, retry-after-~5s on 429, pluggable-key client design (docs note a future API key) | SRC-021 (`gse-free-source-inventory.md:27`); [NWS API docs](https://www.weather.gov/documentation/services-web-api) |
| **Open-Meteo** | **CONDITIONS** | Free for non-commercial; GSE is commercial — confirm plan/terms before production use (backfill lane only until then) | SRC-022 (`gse-free-source-inventory.md:28`); `gse-source-validation-notes.md:25` |
| **Wikidata SPARQL** | **RECOMMENDED** | CC0; validate venue facts against official sources; service etiquette | SRC-023 (`gse-free-source-inventory.md:29`) |
| **OpenStreetMap Overpass** | **CONDITIONS** | ODbL attribution/share-alike obligations accepted first; endpoint etiquette | SRC-024 (`gse-free-source-inventory.md:30`) |
| **Wikimedia Pageviews** | **RECOMMENDED** | Open; attention baseline only — never equate pageviews with intent | SRC-030 (`gse-free-source-inventory.md:36`) |
| **Sleeper API** | **RECOMMENDED** | Free/no token; stay under stated call guidance, cache the players endpoint; attention proxy, not truth | SRC-025 (`gse-free-source-inventory.md:31`) |
| **GDELT DOC 2.0** | **RECOMMENDED** | Open API; narrative-pressure proxy with disclaimers; source-volume bias noted | SRC-027 (`gse-free-source-inventory.md:33`) |
| **CollegeFootballData** | **RECOMMENDED** | Free key, ~1,000 calls/month observed — quota-respecting batch use for prospect/CFB priors | SRC-020 (`gse-free-source-inventory.md:26`) |
| **YouTube Data API v3** | **CONDITIONS** | 10k units/day quota; metadata-only (no downloading/transcript copying); API terms + auditability review | SRC-028 (`gse-free-source-inventory.md:34`); `gse-source-risk-register.md:12` |
| **Reddit API** | **CONDITIONS** | Commercial terms must be checked before ANY automation; aggregated attention only; deletion/privacy obligations. Until reviewed: no build | SRC-029 (`gse-free-source-inventory.md:35`); `gse-source-risk-register.md:11`; `gse-source-validation-notes.md:24` |
| **Official NFL injury reports (nfl.com/injuries)** | **CONDITIONS** | Free public *viewing*; no confirmed bulk API. Manual/approved official-status precedence is fine; **crawler-first ingestion is not** — High risk, owner/legal approval required before automation | SRC-007 (`gse-free-source-inventory.md:13`); `gse-source-risk-register.md:14,17-19` |
| **nflreadr injuries (historical)** | **RECOMMENDED** | Backtest/feature-store lane; no-diagnosis language required | SRC-008 (`gse-free-source-inventory.md:14`) |
| **Team sites / press releases** | **CONDITIONS** | Human-reviewed claim cards with source URLs only; no crawler-first bulk ingest; quote limits + marks | SRC-036 (`gse-free-source-inventory.md:42`) |
| **Beat-writer / publisher RSS** | **CONDITIONS** | Claim cards with source confidence; no full-text copying; no paywall bypass (login-wall = NOT for the bypass path) | SRC-037 (`gse-free-source-inventory.md:43`); `gse-source-risk-register.md:13` |
| **Yahoo Fantasy API** | **CONDITIONS** | User-consent OAuth opt-in lane only; privacy review | SRC-026 (`gse-free-source-inventory.md:32`) |
| **StatsBomb open data / fastRhockey** | **RECOMMENDED (R&D only)** | Pattern-transfer research, attribution per license; never NFL production data | SRC-040/041 (`gse-free-source-inventory.md:46-47`) |
| **SiriusXM Ch 87 live capture** | **NOT until legal sign-off** | Built founder-gated/illustrative per doc 12; live audio capture/transcription requires legal approval first. The gated/illustrative lane may continue | `12-siriusxm-ch87-source-catalog-and-ingestion.md`; doc 10 author-lane note (`10-…md:11-13`) |

## 3. Triage table — deny-listed and paid/contract lanes

| Source | Verdict | Reason | Grounding |
|---|---|---|---|
| **ESPN public pages / hidden API (site.api.espn.com)** | **NOT** (automated extraction) | Disney terms restrict automated extraction, copying, commercial reuse, and AI/data uses — corpus deny-lists it ("Blocked"). The hidden scoreboard API is unofficial, no SLA, no published limits; it cannot carry a truth contract. Manual reference viewing only. Any future best-effort results cross-check would need owner/legal approval first (High-risk rule) and must never be load-bearing | SRC-039 (`gse-free-source-inventory.md:45`); `gse-source-risk-register.md:6`; [Zuplo guide](https://zuplo.com/learning-center/espn-hidden-api-guide); [community docs](https://github.com/pseudo-r/Public-ESPN-API) |
| **Pro Football Reference / Stathead (bulk)** | **NOT** (bulk scraping) | No bulk scrape; paid product exists for richer access. Manual validation reference is acceptable | SRC-035 (`gse-free-source-inventory.md:41`) |
| **Any sportsbook page scraping** (DK/FD/etc.) | **NOT** | Terms prohibit automated extraction; deny-listed regardless of outage pressure | SRC-038 (`gse-free-source-inventory.md:44`); `gse-source-risk-register.md:10` |
| **Any login-walled / paywalled endpoint crawl** | **NOT** | Hard line; no exceptions | header rules; `gse-source-validation-notes.md:16` (precedent: none performed) |
| **SportsDataIO** | **CONDITIONS (paid/contract)** | Trial may be scrambled/limited; production is contract-gated — founder decision + contract metadata, usage metering, audit calendar | SRC-032 (`gse-free-source-inventory.md:38`); `gse-source-risk-register.md:7` |
| **Sportradar** | **CONDITIONS (paid/contract)** | Elite licensed candidate; cost/audit/sublicensing terms — founder contract decision | SRC-034 (`gse-free-source-inventory.md:40`) |
| **EA/Madden ratings or assets** | **NOT** (copying) | Original GSE public-data estimates only; no EA marks/ratings/assets/affiliation language | `gse-source-risk-register.md:15` |

---

## 4. Honest limits — where free parity is UNREALISTIC (do not promise it)

1. **Historical odds / closing-line archives: not free, period.** The Odds API's historical
   snapshots are paid-plan-only at 10 credits per region per market
   ([historical odds](https://the-odds-api.com/historical-odds-data/), [v4 docs](https://the-odds-api.com/liveapi/guides/v4/)).
   No free source offers timestamped multi-book history. Consequence: GSE's own
   `captureClosingLine()` archive is the only free CLV path — capture in real time or it's
   gone (`closing-line.ts:26-44`).
2. **Continuous multi-book polling: not free.** The Odds API free tier (~500 credits/mo,
   [the-odds-api.com](https://the-odds-api.com/)) and odds-api.io free (2 books / 100 req-hr,
   [pricing](https://odds-api.io/pricing)) cannot sustain production-cadence line shopping.
   Cheapest real ladder: The Odds API 20K @ ~$30/mo → odds-api.io Starter @ £99/mo.
3. **Push/streaming odds: paid-only.** odds-api.io WebSocket is a +100%-of-plan add-on;
   The Odds API is poll-based ([pricing](https://odds-api.io/pricing)).
4. **Full player-prop boards: effectively paid** — per-event endpoints, partial coverage,
   high credit cost on every provider checked ([v4 docs](https://the-odds-api.com/liveapi/guides/v4/),
   [odds-api.io props](https://docs.odds-api.io/examples/player-props)).
5. **Raw player tracking: never free.** Public NGS is aggregate-only; raw tracking is
   league-controlled (SRC-017/018, `gse-free-source-inventory.md:23-24`).
6. **PBWR/RBWR-class trench metrics: ESPN-proprietary** (computed on raw tracking). The
   Trenches category ships on PBP-derived proxies, honestly labeled (doc 21 §2.5).
7. **What IS realistically free at full quality:** post-game results/stats (nflverse, CC-BY),
   NGS weekly aggregates (mirror), weather (public domain), market-implied probabilities
   (Kalshi no-auth read), and GSE's own accumulating closing-line/CLV archive. The mesh's
   honest shape: **free spine for everything except live multi-book odds**, where The Odds
   API stays primary and paid fallbacks are warm-standby.

---

## 5. Verification-debt ledger (open items before the matching build card runs)

| # | Debt | Owner action | Source of the flag |
|---|---|---|---|
| V-1 | The Odds API current plan quota / NFL availability / display-cache rights | check account dashboard + terms | `gse-free-source-inventory.md:7,61`; `gse-source-validation-notes.md:22` |
| V-2 | odds-api.io free-tier bookmaker identity (which 2 books) | confirm in dashboard | [pricing](https://odds-api.io/pricing) (not published) |
| V-3 | API-Sports tiers/per-minute cap — pricing pages 403'd to direct fetch; numbers are search-corroborated only | first-hand dashboard check | this triage, 2026-06-10 |
| V-4 | Fallback providers' 429 header semantics — the quota-vs-throttle classifier leans on The Odds API's `x-requests-remaining` | verify per provider when adapter is built | `provider-status.ts:110-137` |
| V-5 | Kalshi unauthenticated rate cap (unpublished; ~30 req/s figure is secondary-source only) | poll conservatively; confirm with Kalshi docs/support | [rate limits](https://docs.kalshi.com/getting_started/rate_limits) |
| V-6 | Open-Meteo commercial terms | plan/terms confirmation | SRC-022; `gse-source-validation-notes.md:25` |
| V-7 | Reddit/YouTube/social/publisher commercial-use terms | owner/legal review before any automation | `gse-source-validation-notes.md:24` |
| V-8 | SportsGameOdds / SportsDataIO / Sportradar trial+contract terms | founder contract review | `gse-source-validation-notes.md:23` |
| V-9 | Named-sharp-book closing reference license (BUILD-032) | provider-terms check + founder sign-off | `15-clv-closing-line-defer-note.md:82-84` |
| V-10 | Kalshi corpus entry missing — add an SRC row + fallback-map reference before building | docs update | absent from `gse-free-source-inventory.md` and `gse-source-fallback-map.jsonl` (verified 2026-06-10) |
| V-11 | `.env.example` lacks `ODDS_API_IO_KEY` / `API_SPORTS_KEY` despite the registry documenting them as enable switches | add alongside the R2 adapter build (doc 20 §4.1) | `.env.example:41` + grep (no matches); `provider-registry.ts:123,140` |
| V-12 | Corpus URL drift: `api.theoddsapi.com` vs live `api.the-odds-api.com/v4` | prefer the code URL | `gse-free-source-inventory.md:7` vs `config.ts:62` |

---

## 6. Grounding ledger

| Claim class | Anchors |
|---|---|
| All SRC rows | `docs/research/gse-free-source-inventory.md:7-48` (read in full 2026-06-10) |
| Family allow/deny rules + approval rule | `docs/research/gse-source-risk-register.md:5-19` |
| Corpus's own verification debts | `docs/research/gse-source-validation-notes.md:13-25` |
| Registry stubs + env switches | `packages/data-ingestion/src/provider-registry.ts:96-144` |
| Classifier header dependence | `packages/data-ingestion/src/provider-status.ts:110-137` |
| CLV reference plumbing + BUILD-032 | `packages/data-ingestion/src/closing-line.ts:31-44`; `15-clv-closing-line-defer-note.md:76-92` |
| Web-verified provider facts | URLs inline per row (fetched/corroborated 2026-06-10; 403-blocked fetches disclosed in V-3) |
| Do-not-touch flags | `docs/research/gse-current-data-state.md:101-105` |
