/**
 * Galaxy Slate Twin — illustrative slate (DEMO DATA, not live).
 *
 * The spatial twin's whole point is that the picture encodes REAL relationships,
 * not decoration. So each game carries the metrics the visualization reads:
 *   signalDensity   — how many independent factors align (→ star brightness/size)
 *   contradictionMass — credible counter-evidence (→ orbital instability/wobble)
 *   volatility      — how fragile the read is (→ size of the volatility halo)
 *   marketGravity   — how hard price/volume pulls (→ inward pull on satellites)
 *   confidence[t]   — how confidence evolves across the timeline (→ confidence orbit)
 *   verdict         — PLAY / WATCHLIST / NO-BET (→ core colour)
 *
 * DOCTRINE: this is explicitly illustrative. No real teams, no real odds, no
 * claimed result. Labels are coded ("NBA · Game 02") so nothing is mistaken for
 * a live, real-money signal. The live engine will populate the same shape from
 * real estimators/sources behind the calibration gate.
 */

export type TwinLeague = "NFL" | "NBA" | "MLB" | "NHL";
export type TwinVerdict = "PLAY" | "WATCHLIST" | "NO-BET";
export type TwinMarketKey = "Spread" | "Total" | "Moneyline";

export type TwinMarket = {
  readonly key: TwinMarketKey;
  /** orbital radius (relative units) */
  readonly radius: number;
  /** 0..1 — fragility of this specific market */
  readonly volatility: number;
};

export type TwinImpact = { readonly step: number; readonly label: string };

export type TwinGame = {
  readonly id: string;
  readonly league: TwinLeague;
  /** Coded, non-attributed label. */
  readonly label: string;
  readonly signalDensity: number; // 0..1
  readonly contradictionMass: number; // 0..1
  readonly volatility: number; // 0..1
  readonly marketGravity: number; // 0..1
  readonly verdict: TwinVerdict;
  readonly markets: readonly TwinMarket[];
  /** Confidence at each timeline step (0..1), length === TIMELINE.length. */
  readonly confidence: readonly number[];
  /** One-line read shown in the inspector. */
  readonly note: string;
  /** Position in galaxy space. */
  readonly pos: readonly [number, number, number];

  // ── Optional encodings — present for demo; OMITTED for live when the data
  // source isn't yet instrumented (public/sharp splits don't exist yet). The
  // visualization degrades honestly when these are undefined. ──
  readonly oddsPath?: readonly number[]; // line-movement path (0..1, 0.5=open)
  readonly publicMoney?: number; // 0..1 public pressure — undefined if not instrumented
  readonly sharp?: number; // 0..1 sharp-vs-public divergence — undefined if not instrumented
  readonly impact?: TwinImpact | null;
  /** Live board posture — present only on live slates (board cross-ref). */
  readonly boardStatus?: "SCORING_NOW" | "PUBLISHED_TODAY" | "GATED_TODAY";
  readonly gateReason?: string | null;
};

export type TwinSlate = {
  /** True for demo/illustrative slates — surfaces must label these. */
  readonly illustrative: boolean;
  /** True when assembled from real data behind an open readiness gate. */
  readonly live: boolean;
  readonly generatedLabel: string;
  readonly timeline: readonly string[];
  readonly games: readonly TwinGame[];
  /** Honest note about what isn't yet instrumented for live slates. */
  readonly dataNote?: string;
};

/** The 4D axis — the same steps every game scrubs through. */
export const TIMELINE = [
  "Opening line",
  "Overnight",
  "Injury report",
  "Public money",
  "Sharp move",
  "Model re-run",
  "Final",
  "Result",
] as const;

export const LEAGUE_CENTERS: Record<TwinLeague, readonly [number, number, number]> = {
  NFL: [-6.5, 1.4, -1.5],
  NBA: [5.6, 2.2, -3.0],
  MLB: [-3.2, -3.4, 2.6],
  NHL: [6.2, -2.2, 2.2],
};

const m = (key: TwinMarketKey, radius: number, volatility: number): TwinMarket => ({ key, radius, volatility });

const DEMO_BASE = {
  games: [
    {
      id: "nfl-01",
      league: "NFL",
      label: "NFL · Game 01",
      signalDensity: 0.82,
      contradictionMass: 0.18,
      volatility: 0.22,
      marketGravity: 0.55,
      verdict: "PLAY",
      markets: [m("Spread", 1.0, 0.2), m("Total", 1.5, 0.3), m("Moneyline", 2.0, 0.25)],
      confidence: [0.34, 0.4, 0.46, 0.5, 0.62, 0.68, 0.71, 0.71],
      note: "Independents diverge from the price and agree on direction; little public heat behind the number.",
      pos: [-6.5, 1.4, -1.5],
    },
    {
      id: "nfl-02",
      league: "NFL",
      label: "NFL · Game 02",
      signalDensity: 0.54,
      contradictionMass: 0.62,
      volatility: 0.7,
      marketGravity: 0.78,
      verdict: "WATCHLIST",
      markets: [m("Spread", 1.1, 0.7), m("Total", 1.7, 0.5)],
      confidence: [0.5, 0.58, 0.64, 0.42, 0.46, 0.5, 0.49, 0.49],
      note: "Real edge, but a questionable status sits upstream and public money is heavy on the favourite.",
      pos: [-7.8, 0.2, -0.4],
    },
    {
      id: "nfl-03",
      league: "NFL",
      label: "NFL · Game 03",
      signalDensity: 0.27,
      contradictionMass: 0.74,
      volatility: 0.55,
      marketGravity: 0.84,
      verdict: "NO-BET",
      markets: [m("Spread", 1.0, 0.6), m("Total", 1.6, 0.65), m("Moneyline", 2.1, 0.6)],
      confidence: [0.3, 0.28, 0.26, 0.24, 0.25, 0.23, 0.22, 0.22],
      note: "Nothing independent survives the price. The honest verdict is silence.",
      pos: [-5.4, 2.4, -2.6],
    },
    {
      id: "nba-01",
      league: "NBA",
      label: "NBA · Game 01",
      signalDensity: 0.71,
      contradictionMass: 0.3,
      volatility: 0.34,
      marketGravity: 0.5,
      verdict: "PLAY",
      markets: [m("Spread", 1.0, 0.3), m("Total", 1.5, 0.35)],
      confidence: [0.38, 0.44, 0.52, 0.58, 0.6, 0.66, 0.67, 0.67],
      note: "Rest and pace edges line up with a number that drifted on information, not noise.",
      pos: [5.6, 2.2, -3.0],
    },
    {
      id: "nba-02",
      league: "NBA",
      label: "NBA · Game 02",
      signalDensity: 0.48,
      contradictionMass: 0.5,
      volatility: 0.66,
      marketGravity: 0.6,
      verdict: "WATCHLIST",
      markets: [m("Spread", 1.1, 0.6), m("Total", 1.6, 0.7), m("Moneyline", 2.0, 0.55)],
      confidence: [0.46, 0.5, 0.55, 0.52, 0.44, 0.5, 0.52, 0.52],
      note: "A late lineup question keeps the edge fragile — one shock breaks it.",
      pos: [6.7, 3.1, -3.8],
    },
    {
      id: "mlb-01",
      league: "MLB",
      label: "MLB · Game 01",
      signalDensity: 0.64,
      contradictionMass: 0.36,
      volatility: 0.48,
      marketGravity: 0.42,
      verdict: "PLAY",
      markets: [m("Moneyline", 1.0, 0.4), m("Total", 1.6, 0.55)],
      confidence: [0.36, 0.42, 0.48, 0.5, 0.56, 0.6, 0.62, 0.62],
      note: "Pitching matchup and park factors agree; weather is stable through first pitch.",
      pos: [-3.2, -3.4, 2.6],
    },
    {
      id: "mlb-02",
      league: "MLB",
      label: "MLB · Game 02",
      signalDensity: 0.31,
      contradictionMass: 0.68,
      volatility: 0.72,
      marketGravity: 0.7,
      verdict: "NO-BET",
      markets: [m("Moneyline", 1.0, 0.7), m("Total", 1.5, 0.75)],
      confidence: [0.32, 0.3, 0.34, 0.28, 0.26, 0.25, 0.24, 0.24],
      note: "Unstable weather and thin closing-line history; the read can't be trusted.",
      pos: [-2.0, -2.4, 3.6],
    },
    {
      id: "nhl-01",
      league: "NHL",
      label: "NHL · Game 01",
      signalDensity: 0.6,
      contradictionMass: 0.4,
      volatility: 0.5,
      marketGravity: 0.46,
      verdict: "WATCHLIST",
      markets: [m("Moneyline", 1.0, 0.45), m("Total", 1.6, 0.55)],
      confidence: [0.4, 0.46, 0.5, 0.54, 0.52, 0.55, 0.56, 0.56],
      note: "Goalie confirmation would upgrade this; until then it stays on the watchlist.",
      pos: [6.2, -2.2, 2.2],
    },
    {
      id: "nhl-02",
      league: "NHL",
      label: "NHL · Game 02",
      signalDensity: 0.78,
      contradictionMass: 0.22,
      volatility: 0.28,
      marketGravity: 0.5,
      verdict: "PLAY",
      markets: [m("Moneyline", 1.0, 0.25), m("Total", 1.55, 0.35), m("Spread", 2.0, 0.3)],
      confidence: [0.36, 0.44, 0.5, 0.56, 0.64, 0.68, 0.7, 0.7],
      note: "Confirmed starters and special-teams edge; the number moved toward the thesis cleanly.",
      pos: [7.4, -1.2, 1.4],
    },
  ] satisfies readonly TwinGame[],
};

export const VERDICT_HEX: Record<TwinVerdict, string> = {
  PLAY: "#00E5FF",
  WATCHLIST: "#7A5CFF",
  "NO-BET": "#FF2DD6",
};

export const LEAGUES: readonly TwinLeague[] = ["NFL", "NBA", "MLB", "NHL"];

/**
 * Illustrative line-movement paths, per game id, one value per TIMELINE step.
 * Normalized 0..1 where 0.5 = the opening number; the shape tells the story
 * (a clean drift toward the thesis vs. a public reversal vs. noisy whipsaw).
 * Drives the odds-movement trail and the inspector's line-movement sparkline.
 * Illustrative only — not a real line.
 */
export const ODDS_PATHS: Record<string, readonly number[]> = {
  "nfl-01": [0.5, 0.52, 0.55, 0.58, 0.62, 0.64, 0.66, 0.66], // clean drift to thesis
  "nfl-02": [0.5, 0.54, 0.58, 0.5, 0.46, 0.48, 0.47, 0.47], // moved, then public reversal
  "nfl-03": [0.5, 0.46, 0.54, 0.44, 0.52, 0.47, 0.5, 0.5], // noisy whipsaw
  "nba-01": [0.5, 0.53, 0.56, 0.6, 0.61, 0.64, 0.65, 0.65],
  "nba-02": [0.5, 0.52, 0.56, 0.54, 0.48, 0.5, 0.51, 0.51],
  "mlb-01": [0.5, 0.52, 0.54, 0.55, 0.58, 0.6, 0.61, 0.61],
  "mlb-02": [0.5, 0.47, 0.52, 0.46, 0.49, 0.45, 0.48, 0.48],
  "nhl-01": [0.5, 0.53, 0.55, 0.57, 0.55, 0.56, 0.57, 0.57],
  "nhl-02": [0.5, 0.53, 0.56, 0.59, 0.63, 0.66, 0.68, 0.68],
};

export function oddsPathFor(id: string, fallback: readonly number[]): readonly number[] {
  return ODDS_PATHS[id] ?? fallback;
}

/**
 * Public-money pressure per game (0..1) — how heavily the crowd is on one side.
 * High pressure visibly distorts the system: the market satellites swing into an
 * eccentric, off-centre orbit (the crowd bending the price) with a magenta
 * pressure lobe on the pulled side. Illustrative.
 */
export const PUBLIC_MONEY: Record<string, number> = {
  "nfl-01": 0.4,
  "nfl-02": 0.82,
  "nfl-03": 0.7,
  "nba-01": 0.45,
  "nba-02": 0.6,
  "mlb-01": 0.4,
  "mlb-02": 0.72,
  "nhl-01": 0.5,
  "nhl-02": 0.45,
};

export function publicMoneyFor(id: string): number {
  return PUBLIC_MONEY[id] ?? 0.5;
}

/**
 * Injury / roster impact-events, per game id. When the scrubber reaches the
 * step, a shockwave fires from the system and a persistent impact ring remains.
 * Ties the time axis to discrete news. Illustrative.
 */
export const IMPACTS: Record<string, TwinImpact> = {
  "nfl-02": { step: 2, label: "Questionable status" }, // Injury report
  "nba-02": { step: 2, label: "Late lineup change" },
  "mlb-02": { step: 3, label: "Weather downgrade" }, // Public money step
  "nhl-01": { step: 4, label: "Goalie TBD" }, // Sharp move step
};

export function impactFor(id: string): TwinImpact | null {
  return IMPACTS[id] ?? null;
}

/**
 * Sharp-vs-public divergence per game (0..1) — how hard sharp action is moving
 * AGAINST the crowd. This is the "dark matter": an unseen mass inferred only by
 * how it bends the system. It pulls the orbit back toward the sharp side (cyan,
 * the signal colour), opposing the magenta public-money lobe — a visible
 * tug-of-war — with a faint lensing ring whose strength tracks the divergence.
 * Edges (PLAY) tend to run high; NO-BETs run low. Illustrative.
 */
export const SHARP_DIVERGENCE: Record<string, number> = {
  "nfl-01": 0.62,
  "nfl-02": 0.5,
  "nfl-03": 0.2,
  "nba-01": 0.55,
  "nba-02": 0.4,
  "mlb-01": 0.5,
  "mlb-02": 0.18,
  "nhl-01": 0.45,
  "nhl-02": 0.68,
};

export function sharpDivergenceFor(id: string): number {
  return SHARP_DIVERGENCE[id] ?? 0.4;
}

/** Centroid of a league's systems in galaxy space (computed from the slate's games). */
export function leagueCentroid(games: readonly TwinGame[], league: TwinLeague): [number, number, number] {
  const inLeague = games.filter((g) => g.league === league);
  if (!inLeague.length) return [...LEAGUE_CENTERS[league]] as [number, number, number];
  const sum = inLeague.reduce(
    (acc, g) => [acc[0] + g.pos[0], acc[1] + g.pos[1], acc[2] + g.pos[2]] as [number, number, number],
    [0, 0, 0] as [number, number, number],
  );
  return [sum[0] / inLeague.length, sum[1] / inLeague.length, sum[2] / inLeague.length];
}

/**
 * The exported demo slate — base games enriched with the illustrative
 * odds/public/sharp/impact encodings. This is the labelled fallback shown
 * whenever the readiness gate is closed (see lib/slate-twin/get-slate-twin).
 */
export const DEMO_SLATE: TwinSlate = {
  illustrative: true,
  live: false,
  generatedLabel: "Illustrative slate · demo data, not live",
  timeline: TIMELINE,
  games: DEMO_BASE.games.map((g) => ({
    ...g,
    oddsPath: ODDS_PATHS[g.id] ?? g.confidence,
    publicMoney: PUBLIC_MONEY[g.id] ?? 0.5,
    sharp: SHARP_DIVERGENCE[g.id] ?? 0.4,
    impact: IMPACTS[g.id] ?? null,
  })),
};
