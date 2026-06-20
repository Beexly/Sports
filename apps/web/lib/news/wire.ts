/**
 * Source registry + illustrative wire.
 *
 * NATIONAL_INSIDERS are real, public NFL reporters. The verifiable top tier we
 * seed with. We deliberately do NOT fabricate local beat-writer names; the
 * per-team roster is a structured set of slots that populates from licensed and
 * official feeds when ingestion is switched on (founder-gated). The wire items
 * below are illustrative, to demonstrate how the impact engine scores real news.
 */

import type { NewsItem, Tier } from "./impact";

export type Insider = { readonly name: string; readonly outlet: string; readonly tier: Tier };

/** Real, public national NFL insiders. The seed of the Insider tier. */
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

/** Illustrative wire. Fictional reports, real signal types, to show the scoring. */
export const DEMO_WIRE: readonly NewsItem[] = [
  { id: "n1", source: "Adam Schefter", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Vale (ankle) ruled OUT for Sunday after no practice all week", signal: "injury-out", minutesAgo: 12 },
  { id: "n1b", source: "Tom Pelissero", tier: "Insider", team: "ATL", player: "Marcus Vale", headline: "Confirmed: Vale will not play; the team is elevating depth at the position", signal: "injury-out", minutesAgo: 6 },
  { id: "n2", source: "PHI beat", tier: "Beat", team: "PHI", player: "Tariq Bell", headline: "Bell taking clear lead-back reps with the starter limited", signal: "role-up", minutesAgo: 40 },
  { id: "n3", source: "Ian Rapoport", tier: "Insider", team: "DET", player: "Deon Pryce", headline: "Pryce (hamstring) trending toward a return, expected to play", signal: "injury-return", minutesAgo: 75 },
  { id: "n4", source: "Falcons", tier: "Verified", team: "ATL", player: "Quentin Ash", headline: "Ash elevated to RB2 on the official depth chart", signal: "depth-chart", minutesAgo: 95 },
  { id: "n5", source: "@nflrumormill", tier: "Aggregator", team: "MIA", player: "Julian Roe", headline: "Hearing Roe could see a reduced role. Unconfirmed", signal: "role-down", minutesAgo: 22 },
  { id: "n6", source: "Tom Pelissero", tier: "Insider", team: "KC", player: "Rocco Vance", headline: "Vance facing a one-game suspension, appeal pending", signal: "suspension", minutesAgo: 200 },
  { id: "n7", source: "BUF beat", tier: "Beat", team: "BUF", headline: "Heavy wind and rain in the forecast at kickoff", signal: "weather", minutesAgo: 160 },
  { id: "n8", source: "Mike Garafolo", tier: "Insider", team: "CIN", player: "DeShawn Kemp", headline: "Kemp moving into the primary slot role under the new coordinator", signal: "scheme", minutesAgo: 30 },
  { id: "n9", source: "single source", tier: "Unconfirmed", team: "SEA", player: "Tobias Frey", headline: "Whisper of a possible trade. No corroboration", signal: "trade", minutesAgo: 8 },
];

export const WIRE_DISCLAIMER =
  "National insiders are real public reporters and the seed of the top tier. Per-team beat sources populate from licensed/official feeds when ingestion is enabled (founder-gated). The wire shown here is illustrative. Fictional reports demonstrating the impact engine.";
