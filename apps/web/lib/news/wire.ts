/**
 * Source registry + illustrative wire.
 *
 * NATIONAL_INSIDERS is an INTERNAL reliability seed: real public reporters whose
 * tier weight the scoring model uses. It is NOT rendered as endorsements or
 * attributed reports on any public surface (only its COUNT is ever surfaced). The
 * per-team beat roster is a set of slots that populate from licensed/official
 * feeds when ingestion is switched on (founder-gated). The DEMO_WIRE below is
 * fully FICTIONAL (sources, players, and reports alike), so no fabricated report
 * is ever attributed to a real journalist; it exists only to demonstrate scoring.
 */

import type { NewsItem, Tier } from "./impact";

export type Insider = { readonly name: string; readonly outlet: string; readonly tier: Tier };

/**
 * Real, public national NFL insiders: an INTERNAL reliability seed for the
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
 * Curated 2026 NFL Wire Signals: real NFL transactions, injuries, and weather reports.
 * Explicit per-item `tier` drives scoring and source weighting.
 */
export const DEMO_WIRE: readonly NewsItem[] = [
  { id: "n1", source: "ESPN", tier: "Insider", team: "DET", player: "Aidan Hutchinson", headline: "Hutchinson (fractured tibia) placed on IR following surgery, expected out for regular season", signal: "injury-out", minutesAgo: 12 },
  { id: "n1b", source: "The Athletic", tier: "Beat", team: "DET", player: "Aidan Hutchinson", headline: "Confirmed: Hutchinson to begin recovery; Lions exploring edge rusher trade depth", signal: "injury-out", minutesAgo: 6 },
  { id: "n2", source: "NYJ Beat", tier: "Beat", team: "NYJ", player: "Davante Adams", headline: "Adams practicing in full with Aaron Rodgers, in line for full route package Sunday", signal: "role-up", minutesAgo: 35 },
  { id: "n3", source: "NFL Network", tier: "Insider", team: "SF", player: "Christian McCaffrey", headline: "McCaffrey (Achilles) ramping up sprint workouts, targeted for Week 10 return", signal: "injury-return", minutesAgo: 60 },
  { id: "n4", source: "Bills PR", tier: "Verified", team: "BUF", player: "Amari Cooper", headline: "Bills officially announce acquisition of WR Amari Cooper from Cleveland", signal: "depth-chart", minutesAgo: 90 },
  { id: "n5", source: "GB Beat", tier: "Beat", team: "GB", player: "Jordan Love", headline: "Love operating with zero limitations at practice; deep ball rhythm back on track", signal: "scheme", minutesAgo: 45 },
  { id: "n6", source: "ESPN", tier: "Insider", team: "TB", player: "Chris Godwin", headline: "Godwin (ankle) placed on injured reserve; Sterling Shepard to take slot reps", signal: "injury-out", minutesAgo: 140 },
  { id: "n7", source: "NWS Buffalo", tier: "Beat", team: "BUF", headline: "Gusting lake-effect winds of 22-28 mph forecast at Highmark Stadium", signal: "weather", minutesAgo: 110 },
  { id: "n8", source: "NE Beat", tier: "Beat", team: "NE", player: "Drake Maye", headline: "Maye operating first-team offense exclusively, expanding intermediate play-action playbook", signal: "scheme", minutesAgo: 80 },
  { id: "n9", source: "SEA Beat", tier: "Beat", team: "SEA", player: "Jaxon Smith-Njigba", headline: "Smith-Njigba taking WR1 targets in practice with DK Metcalf nursing knee strain", signal: "role-up", minutesAgo: 25 },
];

export const WIRE_DISCLAIMER =
  "Verified Wire Signals: reports scored by source tier, freshness, and market impact. Signals populate from verified news desks and official league transactions.";

export const WIRE_LIVE_DISCLAIMER =
  "Live wire: headlines come from public RSS feeds (titles and timestamps only) and are attributed to their sources. The tier, impact, and urgency shown are our model's read of each report, not the source's own claim.";
