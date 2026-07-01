/**
 * Source registry + illustrative wire.
 *
 * NATIONAL_INSIDERS is an INTERNAL reliability seed — real public reporters whose
 * tier weight the scoring model uses. It is NOT rendered as endorsements or
 * attributed reports on any public surface (only its COUNT is ever surfaced). The
 * per-team beat roster is a set of slots that populate from licensed/official
 * feeds when ingestion is switched on (founder-gated). The DEMO_WIRE below is
 * fully FICTIONAL — sources, players, and reports alike — so no fabricated report
 * is ever attributed to a real journalist; it exists only to demonstrate scoring.
 */

import type { NewsItem, Tier } from "./impact";

export type Insider = { readonly name: string; readonly outlet: string; readonly tier: Tier };

/**
 * Real, public national NFL insiders — an INTERNAL reliability seed for the
 * Insider tier, used for tier weighting + counts only. These names are NEVER
 * rendered on a public surface as an endorsement or an attributed report.
 */
export const NATIONAL_INSIDERS: readonly Insider[] = [
  { name: "Adam Schefter", outlet: "ESPN", tier: "Insider" },
  { name: "Ian Rapoport", outlet: "NFL Network", tier: "Insider" },
  { name: "Tom Pelissero", outlet: "NFL Network", tier: "Insider" },
  { name: "Mike Garafolo", outlet: "NFL Network", tier: "Insider" },
  { name: "Jeremy Fowler", outlet: "ESPN", tier: "Insider" },
  { name: "Dianna Russini", outlet: "The Athletic", tier: "Insider" },
  { name: "Field Yates", outlet: "ESPN", tier: "Insider" },
];

/**
 * Per-team beat coverage. The roster of who covers each team in the building.
 * `slots` is how many licensed beat sources we wire per team when ingestion is on.
 * Names populate from licensed/official feeds, not from us. We never invent them.
 */
export type TeamBeat = { readonly team: string; readonly market: string; readonly slots: number };

export const NFL_TEAMS: readonly string[] = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LV", "LAC", "LAR", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SF", "SEA", "TB",
  "TEN", "WAS",
];

/** Every team gets official-feed + beat-writer slots; populated from licensed sources. */
export const TEAM_BEATS: readonly TeamBeat[] = NFL_TEAMS.map((team) => ({ team, market: team, slots: 3 }));

/**
 * Illustrative wire — FICTIONAL sources, players, and reports; real signal types.
 * Every `source` here is invented (never a real journalist), so no fabricated
 * report is attributed to a real person. Explicit per-item `tier` drives scoring,
 * so these display names carry no reliability meaning on their own.
 */
export const DEMO_WIRE: readonly NewsItem[] = [
  { id: "n1", source: "Dana Frost", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Vale (ankle) ruled OUT for Sunday after no practice all week", signal: "injury-out", minutesAgo: 12 },
  { id: "n1b", source: "Marcus Kline", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Confirmed: Vale will not play; the team is elevating depth at the position", signal: "injury-out", minutesAgo: 6 },
  { id: "n2", source: "PHI beat", tier: "Beat", team: "PHI", player: "Tariq Bell", headline: "Bell taking clear lead-back reps with the starter limited", signal: "role-up", minutesAgo: 40 },
  { id: "n3", source: "Priya Anand", tier: "Insider", team: "DET", player: "Deon Pryce", headline: "Pryce (hamstring) trending toward a return, expected to play", signal: "injury-return", minutesAgo: 75 },
  { id: "n4", source: "Team release", tier: "Verified", team: "ATL", player: "Quentin Ash", headline: "Ash elevated to RB2 on the official depth chart", signal: "depth-chart", minutesAgo: 95 },
  { id: "n5", source: "@rumormill", tier: "Aggregator", team: "MIA", player: "Julian Roe", headline: "Hearing Roe could see a reduced role. Unconfirmed", signal: "role-down", minutesAgo: 22 },
  { id: "n6", source: "Marcus Kline", tier: "Insider", team: "KC", player: "Rocco Vance", headline: "Vance facing a one-game suspension, appeal pending", signal: "suspension", minutesAgo: 200 },
  { id: "n7", source: "BUF beat", tier: "Beat", team: "BUF", headline: "Heavy wind and rain in the forecast at kickoff", signal: "weather", minutesAgo: 160 },
  { id: "n8", source: "Wes Okafor", tier: "Insider", team: "CIN", player: "DeShawn Kemp", headline: "Kemp moving into the primary slot role under the new coordinator", signal: "scheme", minutesAgo: 30 },
  { id: "n9", source: "single source", tier: "Unconfirmed", team: "SEA", player: "Tobias Frey", headline: "Whisper of a possible trade. No corroboration", signal: "trade", minutesAgo: 8 },
];

export const WIRE_DISCLAIMER =
  "Sample feed: the sources, players, and reports shown here are fictional, used only to demonstrate how the impact engine scores news by source tier and freshness. Real reports populate from licensed and official feeds when ingestion is enabled (founder-gated).";
