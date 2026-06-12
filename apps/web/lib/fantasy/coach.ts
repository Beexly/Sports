/**
 * Fantasy coach — the inline teaching layer for every fantasy tool.
 *
 * One concise glossary per tool: what each number means and the move it
 * should trigger. Rendered by <FantasyCoach /> inside FantasyShell so a
 * first-time player never meets "leverage" or "VOR" without a definition
 * one tap away. Coaching voice: the rule, the number, the move — nothing
 * else. Pure data, server-safe.
 */

export type CoachToolKey = "dfs" | "draft" | "trade" | "lineup" | "waivers";

export interface CoachTerm {
  /** The metric or concept exactly as the tool's UI labels it. */
  readonly term: string;
  /** What it is — one sentence, no jargon-on-jargon. */
  readonly meaning: string;
  /** The action it should trigger — one sentence, imperative. */
  readonly move: string;
}

export interface ToolCoach {
  readonly tool: CoachToolKey;
  /** One-line "how to drive this" — replaces multi-line in-tool instructions. */
  readonly quickStart: string;
  readonly terms: readonly CoachTerm[];
  /** Academy lesson id to go deeper (lib/academy/curriculum.ts). */
  readonly lessonId: string;
}

export const FANTASY_COACH: Record<CoachToolKey, ToolCoach> = {
  dfs: {
    tool: "dfs",
    quickStart: "Pick an objective, pin or fade anyone, then Generate.",
    lessonId: "fd-leverage-ownership",
    terms: [
      {
        term: "Projection / Floor / Ceiling",
        meaning: "Median expected points, the bad night, and the great night.",
        move: "Cash games pay the floor; tournaments pay the ceiling.",
      },
      {
        term: "Ownership",
        meaning: "The share of the field expected to roster the player.",
        move: "High ownership is fine in cash — it's a tax on upside in GPPs.",
      },
      {
        term: "Leverage",
        meaning: "Ceiling relative to ownership — upside the field is skipping.",
        move: "In tournaments, prefer the same ceiling at half the ownership.",
      },
      {
        term: "Stack",
        meaning: "QB paired with his own pass-catcher so one TD pays you twice.",
        move: "Stack in GPPs to concentrate a team's good night onto your roster.",
      },
      {
        term: "Exposure",
        meaning: "How many of your lineups share one player.",
        move: "Cap exposure so one dud can't sink the whole portfolio.",
      },
    ],
  },
  draft: {
    tool: "draft",
    quickStart: "Mark players off the board; we recommend your next pick with reasons.",
    lessonId: "fd-vor",
    terms: [
      {
        term: "VOR",
        meaning: "Points above the best replacement you could get at that position later.",
        move: "Draft the biggest gap, not the biggest name.",
      },
      {
        term: "Tier cliff",
        meaning: "A sharp value drop between one player and the next at a position.",
        move: "Take the last player before a cliff even if another position looks shinier.",
      },
      {
        term: "Positional run",
        meaning: "Several picks in a row at one position — panic is contagious.",
        move: "Don't chase a run late; take the value the panic left behind.",
      },
      {
        term: "Bye stack",
        meaning: "Multiple starters off the same week.",
        move: "Two shared byes is fine; three is a forfeit you scheduled yourself.",
      },
    ],
  },
  trade: {
    tool: "trade",
    quickStart: "Add one player to each side — verdict and reasons appear instantly.",
    lessonId: "fd-trade-value",
    terms: [
      {
        term: "Trade value",
        meaning: "Projection blended with VOR, trend, and injury risk — not name value.",
        move: "Judge the points gap, not the jersey sales.",
      },
      {
        term: "Consolidation",
        meaning: "Trading two good players for one great one.",
        move: "The side getting the best player usually wins — depth is replaceable, elite isn't.",
      },
      {
        term: "Fairness band",
        meaning: "Value ratio between sides; inside ±11% reads as fair.",
        move: "A fair trade that fixes your weakest slot is still a win.",
      },
      {
        term: "Buying injury",
        meaning: "Acquiring a hurt player below his healthy value.",
        move: "Buy the discount only if your playoff weeks match his return.",
      },
    ],
  },
  lineup: {
    tool: "lineup",
    quickStart: "Set your roster; we flag every start/sit call with the reason.",
    lessonId: "fd-leverage-ownership",
    terms: [
      {
        term: "Floor vs ceiling start",
        meaning: "Favored teams' steady producers vs boom-bust upside plays.",
        move: "Projected to win your week? Start floors. Underdog? You need ceilings.",
      },
      {
        term: "Usage",
        meaning: "Snaps, routes, and touches — opportunity before talent.",
        move: "Start the player the offense is actually using this month, not last year.",
      },
      {
        term: "Matchup",
        meaning: "How the opposing defense treats this player's role.",
        move: "Downgrade WR1s vs shadow corners; upgrade RBs vs stacked-box-light fronts.",
      },
    ],
  },
  waivers: {
    tool: "waivers",
    quickStart: "Rank the wire by upside; bid what the roster hole is worth.",
    lessonId: "fd-vor",
    terms: [
      {
        term: "FAAB",
        meaning: "Your season-long free-agent budget — spent dollars never come back.",
        move: "Pay up for league-winners; pay nothing for two-week fill-ins.",
      },
      {
        term: "Stash",
        meaning: "Rostering upside now that pays off in later weeks.",
        move: "Stash handcuffs and returning injuries before the week they matter.",
      },
      {
        term: "Upside vs fill-in",
        meaning: "A player who could become a weekly starter vs one who plugs a bye.",
        move: "Bid on roles that can grow; stream the rest for free.",
      },
    ],
  },
};

/** All coaches, in display order. */
export const ALL_COACHES: readonly ToolCoach[] = [
  FANTASY_COACH.dfs,
  FANTASY_COACH.draft,
  FANTASY_COACH.trade,
  FANTASY_COACH.lineup,
  FANTASY_COACH.waivers,
];
