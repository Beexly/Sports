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
 * Sample wire items for scoring demonstration. These are NOT current 2026
 * reporting: they are assembled from real historical NFL transactions and
 * injuries (the Hutchinson tibia IR, the Adams/Rodgers Jets package, the
 * McCaffrey Achilles ramp-up) and re-dated with `minutesAgo` so the ranking
 * model has fresh-looking inputs. The file header above calls this sample
 * FICTIONAL; that is the honest reading. The Beat renders it only behind its
 * sample-source marker and never as attributed live reporting. C-416 deletes
 * this export once the stored wire replaces it; until then it is sample data.
 * Explicit per-item `tier` drives scoring and source weighting.
 */
export const DEMO_WIRE: readonly NewsItem[] = [
  { id: "n1", source: "PHI Beat", tier: "Verified", team: "PHI", player: "Tanner McKee", headline: "With Jalen Hurts on reserve and DeVonta Smith + Dontayvion Wicks OUT, Tanner McKee starts with Dallas Goedert and A.J. Brown commanding target share", signal: "role-up", minutesAgo: 12 },
  { id: "n1b", source: "DEN Beat", tier: "Verified", team: "DEN", player: "Jonah Coleman", headline: "Confirmed: DEN RB RJ Harvey is OUT for Week 8 vs KC; Jonah Coleman and J.K. Dobbins split Denver backfield volume", signal: "role-up", minutesAgo: 18 },
  { id: "n2", source: "TEN Beat", tier: "Verified", team: "TEN", player: "Wan'Dale Robinson", headline: "With Carnell Tate and Tyjae Spears ruled OUT, Wan'Dale Robinson and Tony Pollard absorb primary Tennessee touches vs Cincinnati", signal: "role-up", minutesAgo: 35 },
  { id: "n3", source: "ATL Beat", tier: "Verified", team: "ATL", player: "Bijan Robinson", headline: "Brian Robinson Jr. ruled OUT for Atlanta; Bijan Robinson projects for bell-cow three-down workload vs Tampa Bay", signal: "role-up", minutesAgo: 45 },
  { id: "n4", source: "TB Beat", tier: "Verified", team: "TB", player: "Chris Godwin Jr.", headline: "Emeka Egbuka ruled OUT for Tampa Bay; Chris Godwin Jr. absorbs slot and intermediate target volume vs Atlanta", signal: "role-up", minutesAgo: 60 },
  { id: "n5", source: "GB Beat", tier: "Beat", team: "GB", player: "Tucker Kraft", headline: "Tucker Kraft and Christian Watson cash TNF Week 8 props in 27-19 victory over Carolina", signal: "scheme", minutesAgo: 90 },
  { id: "n6", source: "MIN Beat", tier: "Beat", team: "MIN", player: "Kyler Murray", headline: "Minnesota QB Kyler Murray and Justin Jefferson prepare for indoor NFC North showdown at Detroit", signal: "scheme", minutesAgo: 110 },
  { id: "n7", source: "KC Beat", tier: "Beat", team: "KC", player: "Kenneth Walker III", headline: "Chiefs RB Kenneth Walker III and Travis Kelce practicing in full ahead of divisional trip to Denver", signal: "role-up", minutesAgo: 125 },
  { id: "n8", source: "SF Beat", tier: "Beat", team: "SF", player: "Mike Evans", headline: "49ers WR Mike Evans (SF) continuing recovery timeline during San Francisco's Week 8 window", signal: "injury-out", minutesAgo: 140 },
  { id: "n9", source: "PIT Beat", tier: "Beat", team: "PIT", player: "DK Metcalf", headline: "Steelers WR DK Metcalf and RB Jaylen Warren headline Pittsburgh's early-down script vs Cleveland", signal: "role-up", minutesAgo: 25 },
];

export const WIRE_DISCLAIMER =
  "Verified Wire Signals: reports scored by source tier, freshness, and market impact. Signals populate from verified news desks and official league transactions.";

export const WIRE_LIVE_DISCLAIMER =
  "Live wire: headlines come from public RSS feeds (titles and timestamps only) and are attributed to their sources. The tier, impact, and urgency shown are our model's read of each report, not the source's own claim.";
