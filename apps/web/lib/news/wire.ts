/**
 * Source registry + illustrative wire.
 *
 * NATIONAL_INSIDERS is an INTERNAL reliability seed: real public reporters whose
 * tier weight the scoring model uses. It is NOT rendered as endorsements or
 * attributed reports on any public surface (only its COUNT is ever surfaced). The
 * per-team beat roster is a set of slots that populate from licensed/official
 * feeds when ingestion is switched on (founder-gated). This module ships no
 * invented reports; nothing it exports may attribute a fabricated report to a real journalist.
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
 * The previously-shipped fictional DEMO_WIRE has been deleted (C-416).
 * The Beat renders from the live RSS wire and the stored Signal wire only;
 * surfaces that need illustrative sample data define their own clearly-labelled
 * sample fixtures locally (see lib/fantasy/host.ts and lib/cockpit/mission-control.ts).
 */

export const WIRE_DISCLAIMER =
  "Verified Wire Signals: reports scored by source tier, freshness, and market impact. Signals populate from verified news desks and official league transactions.";

export const WIRE_LIVE_DISCLAIMER =
  "Live wire: headlines come from public RSS feeds (titles and timestamps only) and are attributed to their sources. The tier, impact, and urgency shown are our model's read of each report, not the source's own claim.";
