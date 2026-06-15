/**
 * Plain-language glossary — the single source of truth for explaining our terms
 * to customers in ONE jargon-free sentence each.
 *
 * The product shows a lot of intelligence; the numbers should speak, but every
 * branded metric / insider term must be explainable in a few seconds. This is
 * that copy, in one place, so it stays consistent everywhere it appears (the
 * inline <Term> explainer, the metrics page, tooltips). Keep each `plain` to a
 * single sentence a casual fan understands; put any second sentence in `more`.
 */

export interface GlossaryEntry {
  /** Stable key used by <Term term="gpi" />. */
  readonly id: string;
  /** How it's labeled to customers. */
  readonly label: string;
  /** ONE jargon-free sentence — what it is + why it matters. */
  readonly plain: string;
  /** Optional second sentence for a deeper read (glossary page only). */
  readonly more?: string;
}

const ENTRIES: readonly GlossaryEntry[] = [
  {
    id: "gpi",
    label: "Galaxy Index",
    plain: "One 0–100 score blending how much a player is used, how efficient he is, and his role — higher means a stronger all-around bet.",
    more: "It's a composite, not a single stat, so a player can rank high on volume, efficiency, or both.",
  },
  {
    id: "confidence",
    label: "Confidence",
    plain: "How much real, recent data we have on this player — higher means more official sources, lower means we're inferring from less.",
    more: "It rates our DATA, not the player. Low confidence is a 'trust this number less' flag, not a knock on the player.",
  },
  {
    id: "volatility",
    label: "Volatility",
    plain: "How shaky the read is — high volatility means the signals disagree or the role is unsettled, so treat it with more caution.",
  },
  {
    id: "clv",
    label: "Closing Line Value (CLV)",
    plain: "Did you beat where the betting line ended up? Consistently beating the close is the clearest public proof of a real edge.",
    more: "If you bet a team at +3 and it closed at +1, you got CLV — the market moved your way after you were in.",
  },
  {
    id: "edge",
    label: "Edge",
    plain: "Where our model and the betting market disagree enough to matter — the gap we think the market has mispriced.",
  },
  {
    id: "marketMap",
    label: "Galaxy Twin (market map)",
    plain: "A live map of the day's games showing where the betting market is moving, how much the books agree, and where the money is sharp vs casual.",
    more: "Each game is shown as a star: brighter = more signal, a wider halo = more uncertainty, and the ring tracks our confidence.",
  },
  {
    id: "sharpVsPublic",
    label: "Sharp vs public",
    plain: "Sharp money is from professional bettors; public money is casual bettors — when they split, the sharp side is usually the smarter one.",
  },
  {
    id: "wopr",
    label: "Receiving opportunity (WOPR)",
    plain: "How much of a team's passing game (targets plus downfield air yards) flows to this player — higher means more chances to produce.",
  },
  {
    id: "cpoe",
    label: "Completion % Over Expected (CPOE)",
    plain: "How much more accurate a quarterback is than an average passer would be on the exact same throws.",
  },
  {
    id: "ryoe",
    label: "Rush Yards Over Expected (RYOE)",
    plain: "How many more yards a runner gains than an average back would on the same carries — credit to the player, not the blocking.",
  },
  {
    id: "epa",
    label: "Expected Points Added (EPA)",
    plain: "How much a single play moved a team toward scoring — the cleanest measure of per-play efficiency.",
  },
  {
    id: "snapShare",
    label: "Snap share",
    plain: "The share of his team's plays a player is on the field for — the cleanest measure of his workload.",
  },
  {
    id: "targetShare",
    label: "Target share",
    plain: "The share of a team's passes thrown his way.",
  },
  {
    id: "airYards",
    label: "Air yards",
    plain: "How far downfield a player's targets travel — it measures the opportunity he's given, not just the catches he makes.",
  },
  {
    id: "kelly",
    label: "Kelly staking",
    plain: "A bankroll formula that sizes each bet to the size of your edge — bigger edge, bigger bet — without risking going broke.",
  },
  {
    id: "noVig",
    label: "No-vig probability",
    plain: "The 'true' win chance implied by a betting line once the sportsbook's built-in cut is removed.",
  },
  {
    id: "kingStandard",
    label: "King Standard",
    plain: "Our honesty score for the stats engine itself — how complete, fresh, and proven the underlying data is right now.",
  },
];

const BY_ID: ReadonlyMap<string, GlossaryEntry> = new Map(ENTRIES.map((e) => [e.id, e]));

/** Every glossary entry, in display order. */
export function glossaryEntries(): readonly GlossaryEntry[] {
  return ENTRIES;
}

/** Look up one entry by id (e.g. "gpi"). Returns undefined if unknown. */
export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}
