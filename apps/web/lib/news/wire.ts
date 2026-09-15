/**
 * Source registry for the news wire.
 *
 * NATIONAL_INSIDERS is an INTERNAL reliability seed: real public reporters whose
 * tier weight the scoring model uses. It is NOT rendered as endorsements or
 * attributed reports on any public surface (only its COUNT is ever surfaced).
 *
 * C-416: the fictional DEMO_WIRE sample is gone. The Beat and `/the-beat`
 * render stored Signal rows via `lib/news/wire-store.ts`; an empty store is an
 * honest empty state.
 */

import type { Tier } from "./impact";

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

export const WIRE_LIVE_DISCLAIMER =
  "Live wire: headlines come from public RSS feeds (titles and timestamps only) and are attributed to their sources. The tier, impact, and urgency shown are our model's read of each report, not the source's own claim.";
