# Chrome Extension — MVP Specification

**Status:** Phase 4 build. Per master plan Part 2.E, this is "the highest-leverage distribution move" — overlays Galaxy's Edge Index on DraftKings / FanDuel / BetMGM directly while users are looking at lines.
**Owner of code:** Codex.
**Owner of in-extension UX copy + voice:** Claude.
**Location:** `apps/extension/` (new workspace package).

---

## TL;DR

When a user is logged into DraftKings / FanDuel / BetMGM / Caesars and looking at a line on a Galaxy-tracked game, the extension renders a small Galaxy badge next to the line showing the Edge Index. Tap the badge for the factor breakdown.

Free + browser-native. Zero friction. Users see Galaxy's read on the bet they're about to place, on the page they're already on.

This is Galaxy's chrome (no pun) on top of every sportsbook's interface — a value-add the books cannot block without explicitly banning the extension category.

---

## Why this matters

Most Galaxy users will read picks on Galaxy and then place bets elsewhere. The friction between "read pick" and "place bet" is a leak. The extension closes it.

More importantly: most sportsbook users will NEVER visit Galaxy first. They land on DK, browse lines, place a bet, leave. The extension is Galaxy's foothold inside that workflow. Every bet they're about to place gets contextualized by Galaxy's score before they click.

Even users who don't sign up for Galaxy get value (Edge Index visible, no login required for the public score). Pro+ users get the factor breakdown inline.

---

## Supported sportsbooks (MVP)

Phase 4 ships with support for:

1. **DraftKings Sportsbook** (`sportsbook.draftkings.com`)
2. **FanDuel Sportsbook** (`sportsbook.fanduel.com`)
3. **BetMGM** (`sports.betmgm.com`)
4. **Caesars Sportsbook** (`www.caesars.com/sportsbook-and-casino/`)

Phase 5+ adds:
- BetRivers, Underdog Fantasy, PrizePicks, ESPN BET, Hard Rock Bet.

---

## Extension behavior

### Game detection

The extension runs a content script on supported sportsbook URLs. The script:

1. Identifies game tiles on the page via DOM selectors specific to each book.
2. Extracts the matchup (home / away / sport / start time).
3. Calls Galaxy's `/api/extension/match-game` endpoint with the extracted matchup.
4. Receives back either `{ matched: true, gameId, edgeIndex, ... }` or `{ matched: false }`.

If matched, the extension injects a small Galaxy badge next to the line.

### Badge UX

```
┌──────────────────────────────────────────────────────┐
│  [DK pre-existing game tile]                         │
│                                                      │
│  BOS @ NYY   -3.5   -110                             │
│                                                      │
│  [⌗ EDGE 2.7]   ← Galaxy badge injected here        │
└──────────────────────────────────────────────────────┘
```

Badge details:
- Size: 24px height max, no taller than the existing line label.
- Color: ultraviolet `#7B61FF` (brand palette) with white text.
- Icon: ⌗ or a small Galaxy mark.
- Text: `EDGE 2.7` or `GATED` or `BOOTSTRAP`.
- Hover/tap: expands to a tooltip-style card with factor breakdown (PRO+) or simple Edge Index detail (FREE).

### Expanded card

On click/hover:

```
┌─────────────────────────────────────────────────────┐
│  Galaxy Edge Index: 2.7  ·  SOLID_PLAY               │
│  Published at 73% confidence at 8:00 PM ET           │
│                                                      │
│  Top contributing factors:                           │
│    1. Rest advantage (0.81)                          │
│    2. Schedule stress (0.74)                         │
│    3. Consensus (0.72)                               │
│                                                      │
│  What would change our mind:                         │
│    • If rest advantage flips ...                     │
│    • If sharp money moves the line >2 pts ...        │
│                                                      │
│  [View Game Room] [Methodology]                      │
└─────────────────────────────────────────────────────┘
```

FREE tier sees only the Edge Index value + game outcome.
PRO+ sees the full factor breakdown + pre-mortem preview.

---

## Auth

Two modes:

### Anonymous mode

Default. Anyone with the extension installed sees Edge Index on tracked games. No account needed.

### Linked mode (Pro+)

The extension settings let users link a Galaxy account via OAuth flow:

1. User clicks "Connect Galaxy account" in the extension popup.
2. New browser tab opens to `galaxysportsedge.com/integrations/extension/connect`.
3. User signs in (or signs up) via Galaxy's NextAuth flow.
4. Galaxy redirects back to the extension with a one-time token.
5. Token is exchanged for a long-lived refresh token, stored in `chrome.storage.sync`.
6. Subsequent extension calls authenticate with the refresh token.

Pro+ tier authentication unlocks the full factor breakdown + pre-mortem preview inline on the extension.

---

## API endpoints

### `POST /api/extension/match-game`

Body:
```json
{
  "book": "draftkings" | "fanduel" | "betmgm" | "caesars",
  "matchup": {
    "homeTeamHint": "string",
    "awayTeamHint": "string",
    "sportHint": "NBA" | "NFL" | "MLB" | "NHL" | ...,
    "startsAtHint": "ISO string or null"
  }
}
```

Response (matched):
```json
{
  "matched": true,
  "gameId": "string",
  "edgeIndex": 2.7,
  "gateState": "PUBLISHED" | "GATED" | "BOOTSTRAP",
  "modelVersion": "string",
  "roomUrl": "string"
}
```

Response (no match):
```json
{
  "matched": false,
  "reason": "GAME_NOT_TRACKED" | "BOOK_NOT_SUPPORTED" | "MATCHUP_UNCLEAR"
}
```

Cache: edge-cache 30 seconds. Rate-limit per extension install (anonymous): 60 requests/minute.

### `POST /api/extension/factor-breakdown`

Authenticated (Pro+). Returns the full factor breakdown for the given `gameId`. Same shape as the Game Room data, projected for the extension surface.

### `POST /api/extension/connect`

OAuth completion. Exchanges one-time token for a refresh token.

---

## DOM detection

Each supported book gets a dedicated parser at `apps/extension/parsers/<book>.ts`.

Codex picks the implementation but the parser must:
- Identify game tiles via stable DOM selectors.
- Extract matchup metadata.
- Re-detect on DOM mutations (sportsbooks are SPAs that re-render frequently).
- Handle missing or partially-loaded data gracefully (extension never crashes the host page).
- Inject the badge into a position that does not break the book's layout.

When a book ships a layout change that breaks the parser, the extension detects the failure rate spike via the `/api/extension/parser-health` endpoint (Codex builds this) and surfaces an in-extension warning that an update is needed.

---

## Privacy + compliance

- Extension does NOT read any user data from the sportsbook (no bets placed, no account balance, no bet history).
- Extension only reads the public game tiles + line displays.
- Extension does NOT write to the sportsbook page beyond injecting the Galaxy badge.
- Extension does NOT auto-place bets or modify any input on the sportsbook page.
- Extension's affiliate-link behavior: the badge's expanded card may include an affiliate deeplink (per master plan Part 6 DEC-012), but ONLY when the user explicitly enables affiliate links in extension settings. Default is OFF.

Privacy policy:
- Anonymous mode sends only the matchup hint to Galaxy. No browser fingerprint, no user identification, no session tracking.
- Linked mode sends the matchup + the refresh token. Galaxy correlates to user account.

---

## Install + update flow

- Chrome Web Store as primary distribution.
- Firefox Add-ons as secondary (Phase 4 ships Chrome; Firefox follow-on Phase 5).
- Auto-update via the standard browser extension mechanism.
- In-extension changelog surfaced on first run after update.

---

## Anti-patterns we're avoiding

- **No interstitial nags.** The extension does not block the sportsbook page with a Galaxy popup.
- **No badge spam.** One badge per game tile, nowhere else.
- **No "click here to bet smarter" CTAs.** The badge is informational. The link is to the Game Room.
- **No analytics on user betting behavior.** The extension does not track which lines the user clicks or which bets they place. Galaxy never sees that data.

---

## Acceptance criteria (Phase 4 extension MVP → green)

1. Chrome extension package builds.
2. Parsers for all 4 supported books functional.
3. Badge renders on tracked games without breaking host page layout.
4. Expanded card on hover/tap renders factor info correctly.
5. Anonymous mode works without auth.
6. Linked mode OAuth flow + Pro+ feature gating works.
7. Privacy policy + extension settings UI in place.
8. Auto-update flow tested.
9. Affiliate link toggle defaults OFF.
10. No host-page breakage observed across the four books' main game-listing views.

When all 10 hold, the extension MVP is shippable to Chrome Web Store.

---

## Open items

- **OPEN-EXT-1:** Should the extension support in-play / live-game lines? Default: yes for the badge (Edge Index updates live), but expanded card only shows the snapshot at last pre-game publish. Phase 5+ may add live factor updates.
- **OPEN-EXT-2:** Should there be a per-book on/off toggle (e.g., I only want to see this on DK, not on FD)? Default: yes, toggle per supported book in settings.
- **OPEN-EXT-3:** Should the extension cache the matched-game lookup locally for offline use? Default: no — extension always queries fresh to respect 30s edge cache. Codex confirms perf is acceptable.
- **OPEN-EXT-4:** Should there be a Firefox build in Phase 4 or wait for Phase 5? Default: wait for Phase 5; Chrome first. Confirm.

---

*Spec authored by Claude. Codex implements. Privacy default: minimal data collection. Galaxy badge is informational, never interruptive.*
