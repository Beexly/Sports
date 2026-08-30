# Live War Room — Specification

**Status:** Phase 5 build. Radical #10.
**Owner of code:** Codex.
**Owner of overlay UX + show structure:** Claude.
**Location:** `apps/web/app/warroom/`, `apps/web/lib/warroom/`.
**Decision reference:** master plan Part 2.C.8, Part 6 DEC-009 (YouTube Live primary).

---

## TL;DR

Sunday afternoons and major events, the owner streams live on YouTube Live. The model's confidence on each tracked pick updates in real-time as game state changes — overlay rendered on the stream. Subscribers watch the model think, chat about the picks, see in real time when factor reads update.

Community-as-feature. Elite tier gets primary access; Pro tier gets the public version.

---

## What it is

A live broadcast where:

1. The owner is on camera (or audio-only) commenting on the slate.
2. A real-time overlay displays the model's current confidence per pick.
3. The overlay updates whenever the underlying `PickSignalSnapshot` changes (factor scores shift as live data flows in).
4. A chat (Discord or YouTube native) runs alongside.
5. Subscribers can submit questions via the chat; owner addresses them on-stream.

It is NOT a "what's your lock tonight?" call-in show. It is a research broadcast where the data is the star.

---

## Show structure (per episode)

### Pre-game / pre-slate phase (60-90 minutes)

1. Open with the slate state (what's published, what's gated).
2. Walk through each published pick: factor breakdown, pre-mortem, what the model is seeing.
3. Walk through one or two notable gates: why we passed.
4. Chat Q&A interspersed.

### In-game phase (variable)

5. Live updates: when a game's `GameSignal` snapshot updates, the overlay reflects it. Owner narrates the shift if material.
6. Calibration moments: when a pick's score updates by >0.2 mid-game, surface it on-stream.

### Settlement phase (post-game)

7. Quick wrap on settled picks.
8. Note which pre-mortem bullets "called" each loss.
9. Tease next slate.

Cadence: Sundays during NFL season as the headline event; mid-week events (NBA playoffs, big NCAA games) on a case-by-case schedule.

---

## Overlay design

The overlay renders directly on the stream via the owner's broadcasting tool (OBS Studio or similar). It pulls live data from a Galaxy WebSocket or polling endpoint.

### Layout (1920x1080 horizontal stream)

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                   [video / camera]                       │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  GALAXY SPORTS EDGE · MODEL CONFIDENCE LIVE             │
│  ┌────────────────────────────────────────────────┐    │
│  │ BOS @ NYY     -3.5    [confidence: 73 → 71]   │    │
│  │ CLE @ MIA     -7      [confidence: 68 → 72]   │    │
│  │ NYJ @ BUF     o42.5   [confidence: 65 → 65]   │    │
│  └────────────────────────────────────────────────┘    │
│  Last update: 8:42 PM ET · Model v6.0.5                 │
└─────────────────────────────────────────────────────────┘
```

When a confidence changes, the new number flashes briefly. The arrow shows the delta from publish time.

### Visual style

- Same brand palette: ultraviolet `#7B61FF`, deep slate background.
- Mono font for numbers.
- Subtle animations only — no Twitch-style explosions or hype effects.
- The overlay is research, not entertainment.

---

## Data pipeline

The overlay needs a low-latency data source:

1. Galaxy's engine emits `PickSignalSnapshot` updates to a Redis pub/sub channel (or similar).
2. A WebSocket gateway at `wss://galaxysportsedge.com/api/warroom/stream` exposes the channel.
3. The overlay client (running in OBS via a browser source) subscribes and renders updates.

Polling fallback: if WebSocket is unavailable, the overlay polls `/api/warroom/state` every 15 seconds.

**Note:** This is the one place Galaxy WILL use WebSockets — the live stream is the differentiator. Per master plan Part 4 rule 9, "No websockets unless already in the dependency tree" — Codex adds the WebSocket dependency as part of Phase 5 build, with explicit decision-log entry.

---

## Chat integration

Two options. Both supported:

### Option A: Discord embed (preferred for Elite)

A dedicated channel in the Galaxy Discord server. Visible during the stream via an embedded widget (or simply via Discord directly). Elite-tier users can post; Pro+ users can read; FREE users can read on a delay.

### Option B: YouTube native chat

Default YouTube Live chat. Anyone with a YouTube account can post. Owner moderates.

Phase 5 ships Option A as the primary chat channel; Option B as the public mirror. Phase 6+ may unify.

---

## Access tiers

- **FREE:** can watch the public YouTube Live stream. Can read public YouTube chat. Cannot see the overlay's expanded factor breakdown.
- **PRO:** same as Free but the overlay shows the factor breakdown text inline (overlay variant 2).
- **ELITE:** gets early-access link to a private RTMP feed with the full overlay including pre-mortem text and convergence flags. Discord channel access.

Implementation: the overlay is a parameterized HTML page. The URL accepts an `?overlay_variant=elite` parameter that the OBS browser source uses. The owner sets up multiple OBS scenes per tier.

---

## Schedule + reminders

- Live war room schedule posted at `/warroom/schedule`.
- Calendar (.ics) subscription for upcoming streams.
- Email reminders 1 hour before each stream (transactional via Resend) to subscribed users.
- Discord announcement in the Galaxy server channel.
- Twitter bot posts a "going live in 30 min" tweet automatically when an episode is scheduled.

---

## VOD + replay

Every episode is automatically archived to YouTube. Replays linked at `/warroom/replays`. Phase 6+ may add:
- Time-coded jump-to points (when picks were discussed, when overlays updated).
- Auto-generated transcript via Whisper.
- Searchable archive of discussion topics.

Phase 5 ships replays as a simple YouTube playlist embedded on the replays page.

---

## Voice rules for live show

The owner is on camera or audio. Voice rules apply to ALL on-stream commentary:

**Pass:**

- *"The model is showing 73% on BOS -3.5. The heaviest factor is rest advantage at 0.81. Let's look at the pre-mortem."*
- *"NYK just lost their starting PG to a late scratch. Model's confidence just dropped from 73 to 71. The rest-advantage read just flipped."*

**Fail:**

- *"This is a slam dunk! Hammer it!"*
- *"I'm 100% on this one."*
- *"You CANNOT lose tonight."*
- *"Everyone, get your bets in NOW."*

The show is research with the model. It is not a tout broadcast. Any episode that drifts toward hype gets clipped + flagged.

---

## Compliance scanner

Pre-stream and post-stream:

- Pre-stream: the show description / title / episode notes run through the compliance scanner.
- Post-stream: the auto-generated YouTube description (and any post-stream Twitter posts) run through the scanner.
- During stream: no real-time scanner (live audio is hard to gate); reliance on owner's voice training.

---

## Acceptance criteria (Phase 5 war room v0 → green)

1. WebSocket gateway functional, emitting `PickSignalSnapshot` updates.
2. Overlay HTML page renders correctly in OBS browser source.
3. Three overlay variants (free, pro, elite) parameterized.
4. Schedule + .ics subscription works.
5. Email reminders fire.
6. Discord announcement integration with the Discord bot.
7. Twitter teaser auto-post (via the Twitter bot).
8. YouTube Live stream URL embeddable on `/warroom/[episodeId]`.
9. Discord chat channel scoped to Elite tier.
10. VOD archived to YouTube playlist.

When all 10 hold, the war room is v0-live for the first episode.

---

## Open items

- **OPEN-WR-1:** Should the overlay support custom themes for major events (e.g. NFL conference championship branding)? Default: no in v0 — keep one consistent brand look. Phase 6+ may add.
- **OPEN-WR-2:** Should the stream also fork to Twitch as a secondary mirror (per DEC-009)? Default: only if a community develops there organically. Phase 5 ships YouTube Live only.
- **OPEN-WR-3:** What happens on a slate when no picks are published (the engine gated everything)? Default: shorter episode (15-20 min) focused on the gates — why the model passed. Quiet weeks become research material.
- **OPEN-WR-4:** Should there be a way for Pro/Elite users to "react" to overlay updates in real-time (👍 / 👎)? Default: no in v0 — distraction from the data. Reconsider in Phase 6+.

---

*Spec authored by Claude. Codex implements WebSocket gateway + overlay. Voice rules apply on-stream. The show is research, not theatre.*
