# Data Feeds — Providers, Player Props, and the Trademark Sound

This document answers two recurring questions and lays out the adapter work so it
can ship behind readiness gates without re-architecting ingestion.

> ⚠️ **Secrets.** Several API keys (PandaScore, odds-api.io) and an RSA private key were
> shared in chat during planning. Treat them as compromised: **rotate/regenerate** before use,
> and load the new values from environment variables only (`.env`, never committed) — exactly
> like the existing `THE_ODDS_API_KEY`. No key belongs in source.

---

## 1. "Can we use propfinder.app as a feed? How do they have so much data?"

**No — PropFinder has no public API.** It's a consumer-facing player-prop *research* product.
The reason it "has so much data" is that it **aggregates commercial feeds** (sportsbook lines +
stats/game-logs) from paid providers and presents them. We can't pull *from* PropFinder; to get
the same data we license one of the same upstream providers and build our own research surface
(which is what the Trends page begins, and what player props will extend).

### Provider matrix

| Provider | Coverage | Player props | Historical | Notes |
|---|---|---|---|---|
| **The Odds API** *(integrated)* | US team markets, 7 sports | Some US props | Snapshots from 2020 | Current baseline (`THE_ODDS_API_KEY`). |
| **odds-api.io** *(key in hand)* | 265+ bookmakers | **Yes** | Yes | Strongest props candidate; `api.odds-api.io/v3/*`. |
| **PandaScore** *(key in hand)* | **Esports** (LoL, CS2, Dota 2, Valorant) | Esports props | From 2015 | ⚠️ *Stats* plans are licensed **non-betting-use only** — use the **odds** product for a betting platform, and confirm license terms before shipping. |
| OpticOdds / OddsJam / Unabated | 200+ books, real-time | Yes | Yes | Premium, low-latency; evaluate if odds-api.io coverage is thin. |
| prop-odds.com | Props-focused | Yes | Yes | Cheaper, props-first alternative. |
| SportsDataIO / Sports Game Odds | Broad | Yes | Yes | Stats + odds bundles. |

### Recommendation
Add **odds-api.io** as the player-props source (key already exists). Keep The Odds API as the
team-markets baseline. Treat **PandaScore** as an optional **esports vertical**, gated on a
license check.

### Adapter work (mirrors the existing pattern — no re-architecture)
- `packages/data-ingestion/src/odds-api-io-client.ts` — mirror `odds-api-client.ts`
  (retry/backoff, 15s timeout, request-quota accounting).
- `packages/data-ingestion/src/odds-api-io-normalizer.ts` — mirror `normalizer.ts`; **inherit
  `sanitizeAmericanPrice`** so decimal odds never leak into de-vig math.
- Prisma models (new): `Player`, `PlayerLine`, `PropSnapshot` — see the prediction-engine notes;
  keyed by `(gameId, playerId, bookmaker)` with `isBootstrap` provenance like `TeamGameLog`.
- `workers/data-refresh/src/index.ts` — add a `processPlayerProps()` step in the 30-minute cycle,
  gated by a new `PLAYER_PROPS_ENABLED` flag (same pattern as `DERIVED_MODEL_HISTORY_ENABLED`).
- `.env.example` / `.env.production.example` — add `ODDS_API_IO_KEY`, `PANDASCORE_TOKEN`,
  `PLAYER_PROPS_ENABLED="false"`.
- Roll out through the existing bootstrap gates: collect → validate prices/freshness → enable.

This is the work that unblocks the **"Players — not priced yet"** shadow lane in
`apps/web/components/home/mission-control.tsx`.

---

## 2. "Are trends/history mapped, like scores24?"

**Yes** — and now surfaced publicly at **`/trends`** (`apps/web/app/trends/page.tsx`). It reads
the already-computed history:

- `TeamGameLog` — settled ATS results per team/opponent/venue (the source of truth).
- Game-level context denormalized onto `Game` — rest days, back-to-back, schedule density,
  opening lines, and `lineMovementSpread`.
- The same min-sample discipline as the engine (`MIN_SAMPLE = 5`): a trend only renders once
  enough settled games back it, so we never show an invented streak.

The engine equivalents live in `packages/data-ingestion/src/context-enrichment.ts`
(`getAtsForm`, `getHeadToHeadForm`, schedule/rest signals); the web loader
(`apps/web/lib/trends/load-trends.ts`) mirrors them against the `@sports/db` client.

---

## 3. The trademark sound ("Galaxy Sports Edge — on frequency.")

The boot sequence (`apps/web/components/intro/boot-sequence.tsx`) fires a signature sting on the
ENTER tap via `apps/web/components/intro/use-signature-sound.ts`. Today it plays a **WebAudio
synthesized** sting (no asset needed). To ship the real EA-Sports-style voice line:

1. Generate the voice line with **Google Cloud Text-to-Speech** (you already pay for GCP). Use a
   Chirp 3 HD or Studio voice (or a Custom Voice trained on a recording) and export MP3:

   ```bash
   gcloud auth application-default login
   cat > /tmp/sting.json <<'JSON'
   {
     "input": { "text": "Galaxy Sports Edge. On frequency." },
     "voice": { "languageCode": "en-US", "name": "en-US-Studio-O" },
     "audioConfig": { "audioEncoding": "MP3", "pitch": -2, "speakingRate": 0.92 }
   }
   JSON
   curl -s -X POST \
     -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
     -H "Content-Type: application/json" \
     --data @/tmp/sting.json \
     "https://texttospeech.googleapis.com/v1/text:synthesize" \
     | jq -r '.audioContent' | base64 -d > apps/web/public/audio/gse-voice.mp3
   ```

2. Optionally layer the voice over the synth sting in an audio editor and export
   `apps/web/public/audio/gse-stinger.mp3`.
3. In `use-signature-sound.ts`, set `STINGER_SRC = "/audio/gse-stinger.mp3"`. The hook already
   prefers the file and falls back to the synth if it can't load.

Autoplay note: browsers block audio-with-sound until a user gesture, which is why the sting is
bound to the ENTER tap — never to bare page load. A persisted mute toggle lives on the boot
screen and reduced-motion users get no sound at all.
