# FREE APIS FOR GALAXY SPORTS EDGE
*Research date: 2026-06-19 · Compiled for GSE velocity sprint*

---

## WIRE-NOW SHORTLIST
*Keyless APIs — zero account, zero key, build-verifiable tonight*

These drop straight into the existing pool/registry patterns (`registry.ts`, `image-pool.ts`) with no owner provisioning and no new dependencies.

| # | Name | Base URL / Endpoint | What it adds to GSE | Registry fit |
|---|------|---------------------|---------------------|--------------|
| 1 | **ESPN Site API** | `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/{resource}` | Live scores, schedules, standings, news — NFL/NBA/MLB/NHL/MLS/Soccer/Golf/Tennis/MMA. No auth. | New `sports-data` module; same fetch pattern as The Odds API |
| 2 | **Open-Meteo** | `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&hourly=…` | Game-day weather for any stadium on earth — temp, rain probability, wind, 16-day window | New `weather` utility; pure GET, confirmed live above |
| 3 | **NWS (api.weather.gov)** | `https://api.weather.gov/points/{lat},{lon}` → then `/gridpoints/{wfo}/{x},{y}/forecast` | US-only backup to Open-Meteo; public domain NOAA data, alerts, hourly | Second entry in a `weather-pool` alongside Open-Meteo |
| 4 | **Pollinations TTS** | `https://gen.pollinations.ai/audio/{text}` (GET) or `POST /v1/audio/speech` | Audio pick summaries, voice alerts — 20+ voices, mp3/wav/opus — OpenAI TTS-compatible | New `tts-pool.ts` (same shape as `registry.ts`) |
| 5 | **Thum.io screenshot** | `https://image.thum.io/get/width/1200/crop/630/{url}` | Game page / article thumbnails → OG images; 1,000 impressions/mo free, no key | Add as provider 3 in `image-pool.ts` after Pollinations+Picsum |
| 6 | **Nominatim (OSM)** | `https://nominatim.openstreetmap.org/search?q={venue}&format=json` | Stadium/venue lat-lon lookup for weather chaining; confirmed live above | Inline utility in weather enrichment module |
| 7 | **timeapi.io** | `https://timeapi.io/api/time/current/coordinate?latitude=…&longitude=…` | Timezone-aware kickoff time display; confirmed live above | Inline in game-card formatter |
| 8 | **ipwho.is** | `https://ipwho.is/{ip}` | Reader geo → surface region-appropriate sport slate; 60 req/min, no key | Edge middleware enrichment |
| 9 | **QuickChart** | `https://quickchart.io/chart?c={chartjs-json}` | Confidence sparklines, calibration curves in blog posts and email; 60 charts/min free | New `chart-url.ts` URL builder, same approach as image-pool |
| 10 | **QR Server** | `https://api.qrserver.com/v1/create-qr-code/?data={url}&size=150x150` | Share-pick QR codes for social content; truly keyless, no account | One-liner utility |
| 11 | **FlagCDN** | `https://flagcdn.com/w40/{iso2}.png` | Country/league flag icons in UI (soccer leagues, international); all 254 countries, no key | Direct `<img>` src in components |
| 12 | **REST Countries** | `https://restcountries.com/v3.1/alpha/{code}` | Country metadata (timezone, flag URL, calling code) for international game context | Inline lookup utility |
| 13 | **Microlink** | `https://api.microlink.io?url={url}` | Link-preview JSON (title, description, image, favicon) for the blog/news feed; 50 req/day | `link-preview` utility in blog/news components |
| 14 | **Picsum (already in pool)** | `https://picsum.photos/seed/{seed}/{w}/{h}` | Already in `image-pool.ts` — confirmed as deterministic placeholder | Already wired |

---

## WIRE-NOW: DETAIL SHEETS

### 1. ESPN Site API (Sports Data)
**Base URL:** `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/`
**Also:** `https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{league}/`

**Key endpoints (all keyless, JSON):**

| Endpoint | Path | Notes |
|----------|------|-------|
| Scoreboard (live) | `scoreboard?dates=YYYYMMDD` | Live + final scores, per-period linescores. Confirmed working |
| Standings | `standings` (or `v2/sports/football/leagues/nfl/seasons/{YEAR}/types/2/groups/{conf}/standings`) | Win-loss, PCT, streak |
| Schedule | `schedule?dates=YYYYMMDD` | Upcoming games |
| Game summary | `summary?event={gameId}` | Box score, play-by-play, player stats |
| Teams | `teams` / `teams/{teamId}` | Roster, injuries, depth chart |
| News | `news` | Headlines per sport |
| Athletes | `athletes/{id}/statistics` | Per-player stats |

**Sports/league path matrix:**

| Sport | Path |
|-------|------|
| NFL | `football/nfl` |
| NBA | `basketball/nba` |
| MLB | `baseball/mlb` |
| NHL | `hockey/nhl` |
| EPL | `soccer/eng.1` |
| MLS | `soccer/usa.1` |
| Champions League | `soccer/uefa.champions` |
| Golf PGA | `golf/pga` |
| WNBA | `basketball/wnba` |
| College FB | `football/college-football` |
| 2026 World Cup | `soccer/fifa.world` |

**GSE surface:** Game cards, pick context ("Game at 7PM ET, NYK vs. SAS"), schedule views, line-movement context.
**ToS / rights:** Unofficial/undocumented — ESPN does not grant a commercial license. **Facts (scores, schedules, standings) are not copyrightable in the US** — extract data only, never reproduce article text or video. Add `User-Agent: GSE/1.0 (contact@galaxysportsedge.com)` to all requests. Rate-limit defensively to ≤ 30 req/min.
**Adopt-mode:** WIRE-NOW

---

### 2. Open-Meteo (Weather)
**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Required params:** `latitude`, `longitude`
**Useful hourly vars:** `temperature_2m`, `precipitation_probability`, `wind_speed_10m`, `relative_humidity_2m`, `visibility`, `weather_code`
**Useful daily vars:** `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `wind_speed_10m_max`, `uv_index_max`
**Other params:** `forecast_days` (1–16), `timezone` (IANA name)

**Confirmed live:** Response received in < 150ms with full 24h hourly + daily data for NYC, no auth header required.
**GSE surface:** Game-day weather badge on outdoor game cards ("Outdoor · 78°F · 12% rain · 14mph SW wind"). Affects dome/outdoor distinction, ATS relevance signals.
**ToS:** Free for non-commercial use. Commercial use requires a `customer-` prefixed key (paid plan). Monitor GSE's commercial status as it scales.
**Adopt-mode:** WIRE-NOW (non-commercial threshold). Revisit at commercial scale.

---

### 3. NWS / api.weather.gov (Weather — US only)
**Two-step pattern:**
1. `GET https://api.weather.gov/points/{lat},{lon}` → returns grid metadata including `properties.forecast` URL
2. `GET {forecastUrl}` → 12-hour period forecasts; or `properties.forecastHourly` URL for hourly

**Key fields:** `temperature`, `probabilityOfPrecipitation`, `windSpeed`, `windDirection`, `shortForecast`, `detailedForecast`
**Also:** `https://api.weather.gov/alerts/active?point={lat},{lon}` for severe weather alerts

**GSE surface:** US-game weather backup to Open-Meteo; severe weather alerts for postponement risk signals.
**ToS:** US Federal Government public domain data, unlimited use.
**Adopt-mode:** WIRE-NOW — build as second entry in a `weather-pool` array, fallback if Open-Meteo returns error.

---

### 4. Pollinations TTS (Voice)
**Endpoint (simple GET):** `https://gen.pollinations.ai/audio/{url-encoded-text}`
**Endpoint (OpenAI-compatible POST):** `POST https://gen.pollinations.ai/v1/audio/speech`
  - Body: `{ "model": "tts-1", "input": "text here", "voice": "alloy" }`
  - Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` + 30+ ElevenLabs-named voices
  - Output formats: `mp3` (default), `opus`, `aac`, `flac`, `wav`, `pcm`
  - Max input: 4096 characters

**GSE surface:** Audio pick summaries ("Today's top NBA pick..."), voice-over for short-form video content, accessibility. Fits in a `tts-pool.ts` alongside any future keyed providers (Groq Whisper TTS, etc.).
**ToS:** Pollinations is open-access, keyless at gen.pollinations.ai. No commercial restrictions stated for audio generation. Verify at scale.
**Adopt-mode:** WIRE-NOW — model `tts-pool.ts` exactly after `registry.ts` Provider interface with `keyless: true`.

---

### 5. Thum.io Screenshot / Thumbnail
**Endpoint:** `https://image.thum.io/get/{options}/{target-url}`

**Key options (path segments):**
- `width/{px}` — resize to px wide
- `crop/{px}` — crop height in pixels
- `maxAge/{hours}` — cache control

**Example for OG image (1200×630):**
`https://image.thum.io/get/width/1200/crop/630/https://www.example.com/`

**Free tier:** 1,000 impressions/month, no signup required.
**GSE surface:** Dynamic OG/social images for blog posts — screenshot the article URL and serve as `og:image`. Also team/stadium banners. Fits as provider 3 in `image-pool.ts`.
**ToS:** Free tier requires no agreement. Rendering third-party URLs is your responsibility; only render your own pages or licensed sources.
**Adopt-mode:** WIRE-NOW — add after Picsum in `imageSourcePool()`.

---

### 6. Nominatim / OpenStreetMap (Venue Geocoding)
**Endpoint:** `https://nominatim.openstreetmap.org/search?q={venue+name+city}&format=json&limit=1`
**Returns:** `lat`, `lon`, `display_name`, `type` (`stadium`), `boundingbox`
**Reverse:** `https://nominatim.openstreetmap.org/reverse?lat=…&lon=…&format=json`

**Confirmed live:** Madison Square Garden returns `lat: 40.7505, lon: -73.9934`.
**GSE surface:** Convert team venue name → coordinates → feed into Open-Meteo or NWS for game-day weather. Build a small `venue-geo-cache.ts` (cache results in DB to respect Nominatim's 1 req/sec guideline).
**ToS:** ODbL license, attribution required ("Map data © OpenStreetMap contributors"). Rate limit: max 1 request/second, add `User-Agent` header.
**Adopt-mode:** WIRE-NOW with rate-limit guard and DB caching.

---

### 7. timeapi.io (Timezone)
**Endpoint:** `https://timeapi.io/api/time/current/coordinate?latitude=…&longitude=…`
**Returns:** `dateTime`, `date`, `time`, `timeZone` (IANA), `dayOfWeek`, `dstActive`
**Also:** `https://timeapi.io/api/conversion/convertTimeZone` for cross-timezone display

**Confirmed live:** NYC coordinates returned `"timeZone":"America/New_York"`, `"dstActive":true`, full datetime.
**GSE surface:** Display kickoff times in user's local timezone on game cards. Chain: game venue → Nominatim lat/lon → timeapi.io timezone.
**Adopt-mode:** WIRE-NOW — one utility function, zero dependencies.

---

### 8. ipwho.is (IP Geolocation)
**Endpoint:** `https://ipwho.is/{ip}` (or `https://ipwho.is/` to detect caller IP)
**Returns:** `country`, `country_code`, `region`, `city`, `lat`, `lon`, `timezone.id`, `flag.emoji`, `connection.isp`
**Rate limit:** 60 req/min, no key required.

**GSE surface:** Edge middleware — detect reader's region to surface sport-appropriate default slate (NFL for US, soccer for UK/EU). Also personalise timezone display. Use `ipwho.is/` (no IP param) in edge functions to auto-detect.
**Adopt-mode:** WIRE-NOW — edge middleware utility.

---

### 9. QuickChart (Sparklines & Charts)
**Endpoint:** `https://quickchart.io/chart?c={chartjs-json}&w={px}&h={px}&bkg={color}`
**c param:** Any Chart.js config object, URL-encoded JSON
**Free tier:** 60 charts/min, 1,000 charts/month
**Keyless:** Yes, no auth header required. Confirmed PNG returned on test request.

**Example sparkline for confidence trend:**
```
https://quickchart.io/chart?c={"type":"line","data":{"labels":["W1","W2","W3","W4","W5"],"datasets":[{"data":[58,61,63,60,65],"fill":false,"borderColor":"#22d3ee","pointRadius":0}]},"options":{"scales":{"x":{"display":false},"y":{"display":false}},"plugins":{"legend":{"display":false}}}}&w=120&h=40&bkg=transparent
```

**GSE surface:** Inline confidence trend spark in pick cards, calibration curve in `/track-record` page, historical win-rate micro-charts in blog posts and email newsletters. Never needs a JS chart library in the response — just an `<img>`.
**Adopt-mode:** WIRE-NOW — `chart-url.ts` builder, no npm dependency.

---

### 10. QR Server (QR Codes)
**Endpoint:** `https://api.qrserver.com/v1/create-qr-code/?data={url}&size={w}x{h}&format={png|svg}`
**Optional params:** `ecc` (error correction: L/M/Q/H), `color`, `bgcolor`, `margin`
**Decode endpoint:** `https://api.qrserver.com/v1/read-qr-code/?fileurl={image-url}`

**GSE surface:** Shareable pick QR codes for social posts ("Scan for today's top pick"), referral links, email campaign assets.
**Adopt-mode:** WIRE-NOW — one-liner utility.

---

### 11. FlagCDN (Country Flags)
**Endpoint:** `https://flagcdn.com/{size}/{iso2-code}.{format}`
**Sizes (px):** `16x12`, `20x15`, `24x18`, `28x21`, `32x24`, `40x30`, `48x36`, `56x42`, `64x48`, `160x120`, `320x240`, `w20`, `w40`, `w80`, `w160`, `w320`, `w640`, `w1280`
**Formats:** `png`, `svg`, `webp`
**Example:** `https://flagcdn.com/w40/gb.png` → England flag 40px wide

**GSE surface:** Soccer league flags (EPL = `gb-eng`, La Liga = `es`, Bundesliga = `de`, etc.), international sport context, player nationality badges.
**Adopt-mode:** WIRE-NOW — direct `<img>` src, no JS required.

---

### 12. REST Countries (Country Metadata)
**Endpoint:** `https://restcountries.com/v3.1/alpha/{iso2-or-iso3}`
**All:** `https://restcountries.com/v3.1/all?fields=name,cca2,flag,flags,timezones`
**Returns per country:** `name.common`, `cca2`, `cca3`, `capital`, `region`, `population`, `flag` (emoji), `flags.png`, `flags.svg`, `timezones`, `languages`, `currencies`, `borders`

**GSE surface:** International game context enrichment — "Manchester City (England) at Lyon (France)". Cache the `/all` endpoint at build time — 250 countries, ~120KB JSON.
**Adopt-mode:** WIRE-NOW — build-time static import or cached edge fetch.

---

### 13. Microlink (Link Preview / Unfurl)
**Endpoint:** `https://api.microlink.io?url={target-url}`
**Returns:** `title`, `description`, `image.url`, `image.width`, `image.height`, `logo.url`, `publisher`, `author`, `date`
**Free:** 50 requests/day, no key, no signup.

**GSE surface:** News feed link previews in blog sidebar, "related reading" cards with auto-fetched thumbnails. Currently GSE has no link-unfurl capability.
**Adopt-mode:** WIRE-NOW (50/day is enough for editorial workflow; upgrade path is a $9/mo Microlink key for unlimited).

---

## FREE-TIER LIST
*Requires owner to register for a free API key — no credit card needed*

### Sports Data

**TheSportsDB v1** (key = literal string `"123"`)
- **Base:** `https://www.thesportsdb.com/api/v1/json/123/`
- **Best free endpoints:** `eventsday.php?d=YYYY-MM-DD` (3 calls free), `lookuptable.php?l={leagueId}&s={season}` (5 free), `lookupeventstats.php?id={eventId}` (5 free)
- **Value:** Deep stats (lineups, timelines, event statistics), team artwork, player photos — supplements ESPN's thinner coverage
- **Limits:** Free tier severely rate-restricted (1 result on search endpoints); useful for lookups by known ID
- **Adopt-mode:** FREE-TIER (key = `"123"` requires no real account, literally type it in)

**API-Sports.io** (100 req/day per sport, no credit card)
- **Register:** https://api-sports.io/ → Dashboard → free plan
- **Base:** `https://v1.nfl.api-sports.io/` (NFL), `https://v2.nba.api-sports.io/` (NBA), `https://v3.football.api-sports.io/` (soccer), etc.
- **Header:** `x-rapidapi-key: {YOUR_KEY}` or `x-apisports-key: {YOUR_KEY}`
- **Endpoints:** `/games`, `/standings`, `/players/statistics`, `/injuries`, `/predictions`, `/odds`
- **Value:** 12 sports, all endpoints accessible on free tier — predictions, odds, injuries all included. Best structured alternative to ESPN for stats depth.
- **Limits:** 100 req/day per sport (resets midnight UTC). No historical beyond current season on free.
- **Adopt-mode:** FREE-TIER

**Highlightly** (100 req/day, no credit card)
- **Register:** https://highlightly.net/sport-api/
- **Value:** Adds video highlights to structured data — unique differentiation for blog/social
- **Sports:** Football, NFL, NBA, NHL, MLB, cricket, rugby, volleyball
- **Adopt-mode:** FREE-TIER

**MySportsFeeds** (non-commercial use, free key)
- **Register:** https://www.mysportsfeeds.com/ (register, "I'm a hobbyist")
- **Auth:** Basic auth — `{api_key}:MYSPORTSFEEDS`
- **Base:** `https://api.mysportsfeeds.com/v2.1/pull/{sport}/{season}/`
- **Value:** Consistent feed for NFL/MLB/NBA/NHL — schedules, scores, boxscores, standings, play-by-play, lineups, injuries, DFS, odds. 100 req/day.
- **ToS:** Non-commercial only on free tier
- **Adopt-mode:** FREE-TIER (note non-commercial constraint)

### LLM Providers (to widen existing pool)

GSE already has Pollinations (keyless) + Cerebras/Groq/DeepSeek/OpenRouter/Together/Gemini. These add capacity and model diversity:

| Provider | Model | Free Limits | Key env to add |
|----------|-------|-------------|----------------|
| **GitHub Models** | GPT-4o, Claude 3.5 Sonnet, Llama 3.3 70B | 15 RPM, 150–1,000 RPD | `GITHUB_MODELS_API_KEY` |
| **Cloudflare Workers AI** | Llama 3.3 70B, Mistral 7B, Gemma 2B | 10,000 neurons/day (~200 avg requests) | `CLOUDFLARE_AI_KEY` + `CLOUDFLARE_ACCOUNT_ID` |
| **NVIDIA NIM** | Nemotron Ultra, Llama 3.1 70B | ~1,000 RPD | `NVIDIA_NIM_API_KEY` |
| **Mistral (La Plateforme)** | Mistral Small, Codestral | ~1B tokens/mo (opt-in data training) | `MISTRAL_API_KEY` |
| **Cohere** | Command R+ | 10–20 RPM, ~100 RPD | `COHERE_API_KEY` |

All are OpenAI-compatible (`/chat/completions`). Drop into `registry.ts` with the same Provider interface.

### Odds / Lines

**SportsGameOdds** (2,500 objects/month free, best-in-class developer UX)
- **Register:** https://sportsgameodds.com/
- **Value:** 80+ bookmakers including Pinnacle, player/game/team props, alternate lines — more bookmakers than The Odds API
- **Adopt-mode:** FREE-TIER — strong complement to The Odds API

**odds-api.io** (100 req/hour free)
- **Register:** https://odds-api.io/
- **Value:** Alternative pipeline if The Odds API quota is exhausted
- **Adopt-mode:** FREE-TIER

---

## PARK LIST
*Heavier setup, paid plans, or lower fit for current GSE phase*

| Name | Why Parked | Revisit when |
|------|------------|--------------|
| **BallDontLie** | Requires free account; strong for NBA deep stats (advanced metrics, hustle stats). Worth provisioning later. | NBA season depth coverage becomes priority |
| **SharpAPI odds** | Free tier: 12 req/min, 2 sportsbooks only — narrower than SportsGameOdds free tier | Already have The Odds API |
| **OddsPapi** | 350+ bookmakers but free tier unclear; likely paid-first | When CLV tracking needs EU/Asian bookmaker coverage |
| **Bannerbear OG** | Paid. Beautiful templates but $49+/mo | Revenue milestone or a sponsor covers it |
| **ElevenLabs TTS** | Best voice quality; $5/mo after trial | When audio content is validated as a growth lever |
| **Google Cloud TTS** | 1M chars/mo free but requires GCP project + billing setup | When Pollinations TTS quality doesn't meet bar |
| **screenshotone.com** | Paid; better for rendering JS-heavy pages than Thum.io | When Thum.io impressions are exhausted |
| **ApiFlash screenshot** | Free tier exists but key required; consider if Thum.io 1k/mo is limiting | Post-launch volume growth |
| **SportsDataIO** | Strong data quality but primarily paid; free trial only | Revenue milestone, needs budget allocation |
| **Sportmonks** | Premium football/soccer API; excellent CLV-relevant data | When soccer becomes top-3 sport for GSE |

---

## ADOPTION GUIDE: HOW TO WIRE TONIGHT

### Pattern A — Add to `registry.ts` (LLM pool)
```typescript
// apps/web/lib/claude-api/providers/registry.ts
{
  id: "github-models",
  label: "GitHub Models (GPT-4o free)",
  baseUrl: "https://models.inference.ai.azure.com",
  model: "gpt-4o",
  apiKeyEnv: "GITHUB_MODELS_API_KEY",
},
{
  id: "cloudflare-ai",
  label: "Cloudflare Workers AI",
  baseUrl: "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1",
  model: "@cf/meta/llama-3.3-70b-instruct",
  apiKeyEnv: "CLOUDFLARE_AI_KEY",
},
```

### Pattern B — Add to `image-pool.ts` (image pool)
```typescript
// apps/web/lib/media/image-pool.ts — add before branded-fallback
{
  id: "thum-screenshot",
  label: "Thum.io page screenshot",
  url: `https://image.thum.io/get/width/${w}/crop/${h}/https://galaxysportsedge.com/picks`,
},
```

### Pattern C — New `weather-pool.ts` (modeled on image-pool.ts)
```typescript
// apps/web/lib/weather/weather-pool.ts
export async function getGameDayWeather(lat: number, lon: number) {
  // Try Open-Meteo first (global, fast)
  // Fall back to NWS (US-only, authoritative)
}
```

### Pattern D — New `sports-data/espn.ts`
```typescript
// apps/web/lib/sports-data/espn.ts
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

export async function getScoreboard(sport: string, league: string, date: string) {
  const res = await fetch(`${ESPN_BASE}/${sport}/${league}/scoreboard?dates=${date}`, {
    headers: { "User-Agent": "GSE/1.0 (contact@galaxysportsedge.com)" },
    next: { revalidate: 60 }, // 1-min cache in Next.js
  });
  return res.json();
}
```

### Pattern E — `tts-pool.ts` (voice)
```typescript
// apps/web/lib/media/tts-pool.ts
export interface TTSProvider {
  id: string;
  label: string;
  keyless?: boolean;
  apiKeyEnv?: string;
  synthesize(text: string, voice?: string): Promise<ArrayBuffer>;
}

export const TTS_PROVIDERS: readonly TTSProvider[] = [
  {
    id: "pollinations-tts",
    label: "Pollinations TTS (keyless)",
    keyless: true,
    async synthesize(text, voice = "alloy") {
      const res = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1", input: text, voice }),
      });
      return res.arrayBuffer();
    },
  },
];
```

---

## RIGHTS / LEGAL SUMMARY

| API | License / ToS status | Facts-only safe? |
|-----|----------------------|------------------|
| ESPN (undocumented) | No commercial license granted; reverse-engineered endpoints | Yes — scores/schedules/standings are facts, not copyrightable |
| Open-Meteo | Free for non-commercial; commercial needs paid key | N/A — meteorological data |
| NWS | US Federal public domain, unlimited | Yes |
| TheSportsDB | Community DB, CC-BY license for facts | Yes |
| API-Sports.io | Free tier TOS — personal/dev use | Yes |
| Nominatim | ODbL license — attribution required | Yes, with attribution |
| Microlink | Free tier, no restrictions stated | Metadata only (title/desc/image URL) — never reproduce article bodies |
| ipwho.is | Free public API | Yes |

**Critical reminder:** The CLAUDE.md scraping posture applies — all ESPN/sports-data fetches must pass through or be pre-cleared by the scraping clearance framework (`apps/web/lib/scraping/clearance-engine.ts`). ESPN should be registered in `source-rights-registry.ts` as `approved_public_logged_off` (facts only, no login, no contract) before any ingestion job goes live.

---

*Sources consulted: ESPN API community gists (akeaswaran, nntrn, pseudo-r), Open-Meteo docs, api.weather.gov OpenAPI spec, TheSportsDB docs, Pollinations APIDOCS.md, QuickChart docs, Microlink docs, Thum.io landing page, ipwho.is, timeapi.io, goqr.me/api, flagcdn.com, restcountries.com, openrouter.ai free-tier comparison, wetheflywheel.com free-LLM-tier-2026, api-sports.io, sportsgameodds.com.*
