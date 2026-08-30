# Discord Bot — Specification

**Status:** Phase 3 build. Free-tier picks pipe to community Discord servers.
**Owner of code:** Codex.
**Owner of post templates + voice:** Claude.
**Location:** `workers/discord-bot/`, `apps/web/lib/discord-bot/templates/`.
**Decision reference:** master plan Part 2.E (distribution surfaces).

---

## TL;DR

A Discord bot mirrors the Twitter/X bot's free-pick feed but uses Discord-native primitives — embeds, threads, slash commands, ephemeral replies. Same content scope: free picks, slate state, settlements, post-mortems. Same refusals.

Distribution model: server owners install the bot. Galaxy does not own the servers (no Galaxy-operated mega-server in v0). The bot acts as a content pipe inside community-run sportsbooks-and-betting Discords.

---

## What the bot does

Identical content to the Twitter bot, format adjusted for Discord:

1. **Slate state updates** — posted to a designated channel as embeds with thumbnail + Edge Index field + link to Game Room.
2. **Free pick publications** — posted with full factor preview in the embed.
3. **Free pick settlements** — posted with outcome emoji + biggest contributor / biggest miss.
4. **Free pick post-mortems on losses** — threaded post with the full autopsy walkthrough.

Plus Discord-specific surfaces:

5. **Slash commands** — `/pick today`, `/board status`, `/methodology`, `/explain [gameId]`, `/calibration`.
6. **Daily morning digest** — single embed in the designated channel, 7am ET, summarizing the day's slate.
7. **Reaction-based engagement (read-only)** — users can react to bot posts, the bot doesn't react to user posts.

---

## Installation flow

1. Server owner clicks "Add to Discord" on `/integrations/discord` on the website.
2. Discord OAuth flow grants the bot permission to: read messages in designated channels, send messages, create threads, use slash commands.
3. Server owner picks a "pick feed" channel and a "calibration discussion" channel.
4. Optionally links a Galaxy account for tier-aware behavior in slash commands.
5. Bot posts a welcome embed in the pick feed channel:

```
[Galaxy Sports Edge bot embed]
We're not AI. We're math you can read.

This bot posts free picks, slate updates, and settlement post-mortems
in this channel.

Most days, fewer than five picks. Some days, none.

Try:
  /pick today
  /board status
  /methodology

galaxysportsedge.com
```

---

## Embed format (post template)

Codex implements; Claude owns the structure.

### Pick publication embed

```
Title:        Published BOS -3.5 (SOLID_PLAY)
Description:  Confidence 73%. Factor breakdown in the Game Room.
Fields:
  - Edge Index:    2.7
  - Sport:         NBA
  - Game time:     7:30 PM ET
Footer:       Model v6.0.4 · galaxysportsedge.com
Image:        [optional: factor-breakdown summary card; Phase 4]
URL:          https://galaxysportsedge.com/room/<gameId>
Color:        #7B61FF (ultraviolet, from brand palette)
Timestamp:    publishedAt
```

### Slate state (gated) embed

```
Title:        Just gated MIA @ NYY
Description:  Spread balanced at 51% consensus across 8 books.
Fields:
  - Edge Index:    0.4
  - Gate reason:   Edge below publish threshold
  - Sport:         MLB
Footer:       Model v6.0.4 · galaxysportsedge.com
URL:          https://galaxysportsedge.com/room/<gameId>
Color:        #888888 (muted grey for gated)
Timestamp:    gateDecisionAt
```

### Settlement embed

```
Title:        Settled CLE -7 ✅ WIN
Description:  Schedule stress signal was the heaviest contributor.
Fields:
  - Result:        Final score 24-13
  - At publish:    73% confidence
  - Outcome:       WIN by 4
Footer:       Model v6.0.4 · galaxysportsedge.com · Full snapshot
URL:          https://galaxysportsedge.com/room/<gameId>
Color:        #4CAF50 (win green) or #E53935 (loss red) or #FFB300 (push amber)
Timestamp:    settledAt
```

### Post-mortem thread (losses only)

Posted as a single embed with a "View thread" link, then the autopsy expands in a thread. Thread structure:

```
Parent embed: settlement embed with ❌ LOSS
Thread reply 1: At publish, the heaviest signals were:
                - [factor 1]: [score]
                - [factor 2]: [score]
                - [factor 3]: [score]
Thread reply 2: What changed: [event between publish and settlement]
Thread reply 3: What we got wrong: [factor that misread]
Thread reply 4: What this updates: [factor-weight change or "this is variance"]
Thread reply 5: Full autopsy: [link to /performance/losses/[id]]
```

---

## Slash commands

### `/pick today`

Returns today's published free picks as embeds. Ephemeral by default (visible only to the requester). User can specify `public: true` to post to channel.

### `/board status`

Returns Live State Strip data as an embed: sports watched, books polled, open picks, gated today, last refresh, model version.

### `/methodology`

Returns a short embed linking to `/methodology` with the three-pillar summary.

### `/explain [gameId]`

If the bot is connected to a Galaxy account, this passes through to the Model Court conversational layer (Phase 4 feature). Returns "Open the Game Room" link if Model Court isn't yet enabled.

### `/calibration`

Returns the Live Calibration chart as a rendered image embed. Phase 4 — requires chart-to-image rendering. Phase 3 ships as a link to `/board#calibration`.

---

## Rate limiting + content rules

- **Channel posts:** max 20 per day per server (configurable by server owner).
- **Slash command responses:** unlimited but rate-limited per user (10 per 5 minutes).
- **Ephemeral preference:** slash commands default to ephemeral. Channel posts are public.

Same refusals as the Twitter bot:

1. No paid picks.
2. No engagement bait.
3. No predictions about games not yet scored.
4. No comparisons to other services.
5. No betting certainty language.
6. No editorial sports commentary.
7. `MUTE_BOT=true` env flag halts all posts (including slash commands return an "Engine in maintenance" message).

---

## Auth + account linking

Optional Galaxy account linkage via OAuth:

- A Discord user runs `/galaxy connect`.
- Bot DMs a one-time-code + link to `galaxysportsedge.com/integrations/discord/link`.
- User logs in via Galaxy NextAuth + confirms the link.
- Discord user → Galaxy user binding stored.

When linked:

- Tier-aware slash command output (PRO+ sees factor breakdowns inline; FREE sees the same content as the public bot post).
- Personal calibration data accessible via `/calibration me` (Phase 4 — radical #5).
- Programmable alerts firing into DM (Phase 5).

Without linkage, all slash commands return public-tier output only.

---

## Compliance scanner

Same scanner as Twitter bot. Hard refuse on banned vocabulary, unsupported claims, etc. Red scan halts the post, logs to `AgentRunLog`, surfaces in cockpit.

---

## Eval coverage

Required evals at `docs/ops/evals/discord-bot-*.md`:

- One per post template (publication, gated state, settlement-win, settlement-loss, post-mortem-thread).
- One per slash command (/pick today, /board status, /methodology, /explain, /calibration).
- One per refusal trigger.
- One per OAuth state (unlinked, linked-free, linked-pro, linked-elite).

---

## Account management

- One Galaxy-controlled bot account.
- Bot is verified via Discord's bot verification process.
- Server install scope minimal (read in pick channel, write in pick channel, slash commands).
- Bot does NOT read DMs by default.
- Bot does NOT join voice channels.

---

## Acceptance criteria (Phase 3 Discord bot v0 → green)

1. Bot installable via OAuth.
2. Pick publication embeds posting on every free pick.
3. Gated-state embeds posting on operationally-significant gates.
4. Settlement embeds posting on every settlement.
5. Post-mortem threads firing on losses within 24h.
6. Slash commands working (5 commands minimum).
7. Account linkage flow functional.
8. Compliance scanner running on every post.
9. Rate limits enforced.
10. `MUTE_BOT` flag halts all activity.
11. Eval suite passing.

When all 11 hold, the Discord bot is v0-live.

---

## Open items

- **OPEN-DISC-1:** Should the bot support DM-only alerts for linked Galaxy accounts? Default: yes, in Phase 5 once programmable alerts ship. Phase 3 ships channel-only.
- **OPEN-DISC-2:** Should server owners be able to configure which sports show in their channel? Default: yes, channel-level filters configurable at install. Codex confirms.
- **OPEN-DISC-3:** Should we maintain a Galaxy-operated official server? Default: no in v0 — distribute to community servers first. Reconsider in Phase 5 if there's clear demand.

---

*Spec authored by Claude. Codex implements bot. Voice rules locked. Same refusal semantics as Twitter bot.*
