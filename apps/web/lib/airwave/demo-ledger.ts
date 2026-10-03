/**
 * Airwave Ledger — illustrative demo data.
 *
 * DOCTRINE: these are FICTIONAL personas and generic, illustrative matchups —
 * no real pundit, no real team, no fabricated record of an actual person. The
 * point this data makes is real (a take can be held to an outcome); the names
 * are invented so nothing here is a claim about a living person. Until the
 * founder gate and the legal checklist in docs/airwave-ledger.md are cleared,
 * this is the ONLY data any public Airwave surface renders.
 *
 * Assertions are paraphrases. Timestamps sit inside the 05:00-23:00 CT airing
 * window. `sourceClipRef` values are internal placeholders and are stripped by
 * ./redact before anything reaches a public surface.
 */

import type { Pundit, PunditClaim } from "./types";

export const DEMO_GENERATED_LABEL = "Illustrative ledger · fictional personas";

export const DEMO_PUNDITS: readonly Pundit[] = [
  { id: "p_brooks", name: "Nyla Brooks", show: "First Whistle", network: "Illustrative Streaming", sourceKind: "youtube" },
  { id: "p_marsh", name: "Della Marsh", show: "Marsh on Markets", network: "Illustrative Podcast Network", sourceKind: "podcast" },
  { id: "p_tannen", name: "Brick Tannen", show: "The Overreaction Hour", network: "Illustrative Sports Radio", sourceKind: "satellite-radio" },
  { id: "p_pellman", name: "Gus Pellman", show: "The Parlay Pulpit", network: "Illustrative Sports Radio", sourceKind: "satellite-radio" },
  { id: "p_donnelly", name: "Rip Donnelly", show: "The Rip Report", network: "Illustrative Broadcast", sourceKind: "broadcast-tv" },
];

export const DEMO_CLAIMS: readonly PunditClaim[] = [
  // Nyla Brooks — disciplined, checkable, lands them. (index 90)
  { id: "c_brooks_1", punditId: "p_brooks", airedAt: "2025-11-09T10:14:00-06:00", sport: "NFL", subject: "Road underdog, late window", claimType: "GAME_PICK", direction: "BACKS", assertion: "Takes the road underdog on a rest-and-pass-rush edge the number hasn't priced.", confidence: "EMPHATIC", falsifiable: true, verdict: "HIT", outcomeNote: "Underdog covered by 4.", sourceClipRef: "seg/2025-11-09/first-whistle/0014" },
  { id: "c_brooks_2", punditId: "p_brooks", airedAt: "2025-11-09T10:31:00-06:00", sport: "NFL", subject: "Outdoor total, wind", claimType: "GAME_PICK", direction: "FADES", assertion: "Leans the under as the forecast wind builds through kickoff.", confidence: "LEAN", falsifiable: true, verdict: "HIT", outcomeNote: "Game stayed under by 7.", sourceClipRef: "seg/2025-11-09/first-whistle/0031" },
  { id: "c_brooks_3", punditId: "p_brooks", airedAt: "2025-11-16T09:52:00-06:00", sport: "NBA", subject: "Veteran wing, second night", claimType: "START_SIT", direction: "NEUTRAL", assertion: "Flags the wing as a fade on a back-to-back, but only mildly.", confidence: "HEDGED", falsifiable: true, verdict: "PUSH", outcomeNote: "Landed on his season line. Neither side paid.", sourceClipRef: "seg/2025-11-16/first-whistle/0052" },

  // Della Marsh — checkable, mostly right, one honest miss. (index 73)
  { id: "c_marsh_1", punditId: "p_marsh", airedAt: "2025-11-10T07:05:00-06:00", sport: "NFL", subject: "Home favorite, short week", claimType: "GAME_PICK", direction: "FADES", assertion: "Fades the home favorite giving a touchdown on a short week.", confidence: "EMPHATIC", falsifiable: true, verdict: "HIT", outcomeNote: "Favorite won outright but failed to cover.", sourceClipRef: "seg/2025-11-10/marsh/0705" },
  { id: "c_marsh_2", punditId: "p_marsh", airedAt: "2025-11-10T07:22:00-06:00", sport: "NHL", subject: "Rested goalie, road", claimType: "GAME_PICK", direction: "BACKS", assertion: "Backs the road side behind a confirmed rested starter in net.", confidence: "LEAN", falsifiable: true, verdict: "HIT", outcomeNote: "Road side won in regulation.", sourceClipRef: "seg/2025-11-10/marsh/0722" },
  { id: "c_marsh_3", punditId: "p_marsh", airedAt: "2025-11-17T07:40:00-06:00", sport: "NFL", subject: "Rookie receiver, flex call", claimType: "START_SIT", direction: "BACKS", assertion: "Nudges the rookie receiver into flex lineups against a soft slot.", confidence: "HEDGED", falsifiable: true, verdict: "MISS", outcomeNote: "Three targets, no production.", sourceClipRef: "seg/2025-11-17/marsh/0740" },
  { id: "c_marsh_4", punditId: "p_marsh", airedAt: "2025-11-17T07:58:00-06:00", sport: "NBA", subject: "Division spread", claimType: "GAME_PICK", direction: "BACKS", assertion: "Takes the home side laying a small number in a division game.", confidence: "LEAN", falsifiable: true, verdict: "PUSH", outcomeNote: "Margin landed on the number.", sourceClipRef: "seg/2025-11-17/marsh/0758" },

  // Brick Tannen — loud, checkable, closer to a coin flip than the volume suggests. (index 33)
  { id: "c_tannen_1", punditId: "p_tannen", airedAt: "2025-11-11T15:03:00-06:00", sport: "NFL", subject: "Primetime favorite", claimType: "GAME_PICK", direction: "BACKS", assertion: "Pounds the primetime favorite to cover a full touchdown.", confidence: "EMPHATIC", falsifiable: true, verdict: "HIT", outcomeNote: "Favorite covered comfortably.", sourceClipRef: "seg/2025-11-11/overreaction/1503" },
  { id: "c_tannen_2", punditId: "p_tannen", airedAt: "2025-11-11T15:19:00-06:00", sport: "NFL", subject: "Shootout total", claimType: "GAME_PICK", direction: "BACKS", assertion: "Calls a shootout and hammers the over.", confidence: "EMPHATIC", falsifiable: true, verdict: "MISS", outcomeNote: "Defenses traveled. Under by 11.", sourceClipRef: "seg/2025-11-11/overreaction/1519" },
  { id: "c_tannen_3", punditId: "p_tannen", airedAt: "2025-11-18T15:08:00-06:00", sport: "CBB", subject: "Ranked road team", claimType: "GAME_PICK", direction: "BACKS", assertion: "Backs the ranked road team to win by double digits.", confidence: "LEAN", falsifiable: true, verdict: "MISS", outcomeNote: "Won by 3. Did not cover.", sourceClipRef: "seg/2025-11-18/overreaction/1508" },
  { id: "c_tannen_4", punditId: "p_tannen", airedAt: "2025-11-18T15:26:00-06:00", sport: "NFL", subject: "MVP narrative", claimType: "HOT_TAKE", direction: "NEUTRAL", assertion: "Declares the MVP race already over.", confidence: "EMPHATIC", falsifiable: false, verdict: "UNFALSIFIABLE", outcomeNote: "Opinion with no checkable outcome.", sourceClipRef: "seg/2025-11-18/overreaction/1526" },

  // Gus Pellman — confident, and the checkable calls have not held up. (index 17)
  { id: "c_pellman_1", punditId: "p_pellman", airedAt: "2025-11-12T20:02:00-06:00", sport: "NFL", subject: "Three-team spread parlay", claimType: "GAME_PICK", direction: "BACKS", assertion: "Stacks three road favorites into one ticket and leans in hard.", confidence: "EMPHATIC", falsifiable: true, verdict: "MISS", outcomeNote: "First leg lost outright.", sourceClipRef: "seg/2025-11-12/pulpit/2002" },
  { id: "c_pellman_2", punditId: "p_pellman", airedAt: "2025-11-12T20:18:00-06:00", sport: "NBA", subject: "Star scoring over", claimType: "GAME_PICK", direction: "BACKS", assertion: "Pounds the star's points over against a top defense.", confidence: "EMPHATIC", falsifiable: true, verdict: "MISS", outcomeNote: "Held eight under the number.", sourceClipRef: "seg/2025-11-12/pulpit/2018" },
  { id: "c_pellman_3", punditId: "p_pellman", airedAt: "2025-11-19T20:09:00-06:00", sport: "NHL", subject: "Home dog moneyline", claimType: "GAME_PICK", direction: "BACKS", assertion: "Quietly likes the home dog on the moneyline, but only a little.", confidence: "HEDGED", falsifiable: true, verdict: "HIT", outcomeNote: "Home dog won in overtime.", sourceClipRef: "seg/2025-11-19/pulpit/2009" },
  { id: "c_pellman_4", punditId: "p_pellman", airedAt: "2025-11-23T19:46:00-06:00", sport: "NFL", subject: "Sunday-night spread", claimType: "GAME_PICK", direction: "FADES", assertion: "Fades the home side off a big road win.", confidence: "LEAN", falsifiable: true, verdict: "PENDING", outcomeNote: "Not yet settled.", sourceClipRef: "seg/2025-11-23/pulpit/1946" },

  // Rip Donnelly — trades almost entirely in un-checkable takes. (index 0)
  { id: "c_donnelly_1", punditId: "p_donnelly", airedAt: "2025-11-13T17:30:00-06:00", sport: "NFL", subject: "Coaching seat", claimType: "HOT_TAKE", direction: "NEUTRAL", assertion: "Says the coach has lost the locker room.", confidence: "EMPHATIC", falsifiable: false, verdict: "UNFALSIFIABLE", outcomeNote: "Opinion with no checkable outcome.", sourceClipRef: "seg/2025-11-13/rip/1730" },
  { id: "c_donnelly_2", punditId: "p_donnelly", airedAt: "2025-11-13T17:44:00-06:00", sport: "NBA", subject: "Team identity", claimType: "HOT_TAKE", direction: "NEUTRAL", assertion: "Insists the contender simply does not want it enough.", confidence: "EMPHATIC", falsifiable: false, verdict: "UNFALSIFIABLE", outcomeNote: "Opinion with no checkable outcome.", sourceClipRef: "seg/2025-11-13/rip/1744" },
  { id: "c_donnelly_3", punditId: "p_donnelly", airedAt: "2025-11-20T17:36:00-06:00", sport: "NFL", subject: "Rookie ceiling", claimType: "HOT_TAKE", direction: "NEUTRAL", assertion: "Calls the rookie a future franchise cornerstone, no timeframe.", confidence: "LEAN", falsifiable: false, verdict: "UNFALSIFIABLE", outcomeNote: "No checkable horizon attached.", sourceClipRef: "seg/2025-11-20/rip/1736" },
  { id: "c_donnelly_4", punditId: "p_donnelly", airedAt: "2025-11-20T17:51:00-06:00", sport: "NFL", subject: "Division favorite", claimType: "GAME_PICK", direction: "BACKS", assertion: "Finally makes a checkable call: the division favorite covers at home.", confidence: "LEAN", falsifiable: true, verdict: "MISS", outcomeNote: "Lost outright as a home favorite.", sourceClipRef: "seg/2025-11-20/rip/1751" },
];
