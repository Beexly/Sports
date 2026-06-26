/**
 * DATA INTELLIGENCE MESH — The Odds API credit economics.
 *
 * `data-ingestion` calls the API; THIS module is the accountant that tells you, BEFORE you spend a
 * credit, what a coverage plan will cost per month and which quota tier it needs. It encodes The Odds
 * API's published quota math as facts (no secrets, no key, no network):
 *
 *   • GET /sports ............................. 0 credits (catalogue is free)
 *   • GET /sports/{sport}/odds ................ [markets] × [regions] credits per call
 *   • GET /sports/{sport}/scores .............. 1 credit (2 with daysFrom history)
 *   • GET /sports/{sport}/events .............. 1 credit (event list for player props)
 *   • GET …/events/{id}/odds (player props) ... [markets] × [regions] credits PER EVENT
 *   • any /historical/… endpoint .............. 10× the equivalent live cost
 *
 * Everything here is a pure function over a plan description. It authorizes no spend, reads no env, and
 * makes no call — it only does the arithmetic the owner needs to decide. LIVE execution requires a key
 * AND owner approval, neither of which this package can supply.
 */

// ── the published cost model ────────────────────────────────────────────────

export type OddsApiEndpoint =
  | "SPORTS" // catalogue — free
  | "ODDS" // featured markets for a sport
  | "SCORES" // live + recent scores
  | "EVENTS" // event list (precursor to player props)
  | "EVENT_ODDS"; // per-event odds incl. player props / additional markets

export interface OddsApiCallSpec {
  readonly endpoint: OddsApiEndpoint;
  /** Number of markets requested (h2h, spreads, totals, player_points, …). */
  readonly markets: number;
  /** Number of regions requested (us, us2, uk, eu, au). */
  readonly regions: number;
  /** Historical endpoints cost 10× the equivalent live call. */
  readonly historical?: boolean;
  /** /scores with daysFrom (recent history) costs 2 instead of 1. */
  readonly scoresWithHistory?: boolean;
}

export const HISTORICAL_MULTIPLIER = 10;

/** Credits a single API call consumes, per the published model. Deterministic; never negative. */
export function creditCostOfCall(spec: OddsApiCallSpec): number {
  const markets = Math.max(0, Math.floor(spec.markets));
  const regions = Math.max(0, Math.floor(spec.regions));
  let base: number;
  switch (spec.endpoint) {
    case "SPORTS":
      base = 0; // catalogue is always free
      break;
    case "SCORES":
      base = spec.scoresWithHistory ? 2 : 1;
      break;
    case "EVENTS":
      base = 1;
      break;
    case "ODDS":
    case "EVENT_ODDS":
      base = Math.max(1, markets) * Math.max(1, regions); // at least 1 market × 1 region
      break;
  }
  return base * (spec.historical ? HISTORICAL_MULTIPLIER : 1);
}

// ── quota tiers (credit allotments are published facts; prices are NOT encoded) ──
// We rank by monthly credit allotment only and recommend the smallest tier that fits. We deliberately
// do NOT hard-code a dollar price — pricing changes and must be verified at purchase time, never implied
// here as current (same posture as the bonus-integrity layer).

export interface OddsApiTier {
  readonly id: string;
  readonly label: string;
  readonly monthlyCredits: number;
  readonly note: string;
}

export const ODDS_API_TIERS: readonly OddsApiTier[] = [
  { id: "free", label: "Free", monthlyCredits: 500, note: "Evaluation only — a single sport at a slow cadence." },
  { id: "20k", label: "Starter", monthlyCredits: 20_000, note: "One or two sports, featured markets, modest cadence." },
  { id: "100k", label: "Growth", monthlyCredits: 100_000, note: "A few sports with regular refresh." },
  { id: "5m", label: "Business", monthlyCredits: 5_000_000, note: "Many sports, frequent refresh, some player props." },
  { id: "15m", label: "Business+", monthlyCredits: 15_000_000, note: "Broad multi-sport coverage with props." },
];

/** Smallest tier whose monthly allotment covers the burn, or null if none does. */
export function recommendTier(monthlyCredits: number): OddsApiTier | null {
  const fitting = ODDS_API_TIERS.filter((t) => t.monthlyCredits >= monthlyCredits).sort((a, b) => a.monthlyCredits - b.monthlyCredits);
  return fitting[0] ?? null;
}

// ── a coverage plan → a monthly credit burn ──────────────────────────────────

export interface OddsApiPlanInput {
  /** How many sports the plan refreshes. */
  readonly sports: number;
  /** Featured markets requested per /odds call (e.g. h2h+spreads+totals = 3). */
  readonly markets: number;
  /** Regions per call. */
  readonly regions: number;
  /** Refresh interval in minutes for featured odds (smaller = more calls = more credits). */
  readonly refreshIntervalMinutes: number;
  /** Hours per day the system actively refreshes (e.g. 16 for a waking window). */
  readonly activeHoursPerDay: number;
  /** Pull live/recent scores too? (1 credit/sport/refresh) */
  readonly includeScores: boolean;
  /** Player-prop pulls are per-event and event-listed first. 0 disables props. */
  readonly playerPropEventsPerDay: number;
  /** Markets requested per event-odds (player-prop) call. */
  readonly playerPropMarkets: number;
  /** One-off historical backfill: number of historical snapshots to pull this month. */
  readonly historicalSnapshots: number;
  /** Days in the planning month. */
  readonly daysPerMonth: number;
}

export interface OddsApiPlanLine {
  readonly label: string;
  readonly callsPerMonth: number;
  readonly creditsPerCall: number;
  readonly creditsPerMonth: number;
}

export interface OddsApiPlan {
  readonly lines: readonly OddsApiPlanLine[];
  readonly monthlyCredits: number;
  readonly recommendedTier: OddsApiTier | null;
  readonly tierHeadroomCredits: number | null; // allotment − burn (null if no tier fits)
  readonly warnings: readonly string[];
  readonly capsApplied: readonly string[];
  readonly mode: "PLAN_ONLY";
  readonly spendUsd: 0;
}

/**
 * Cap on one-off historical player-prop style burn. Historical is 10× and per-event — a few hundred
 * snapshots can dwarf a month of live refresh — so we cap the planned historical snapshots and SAY so,
 * rather than silently planning a runaway bill. (Owner can raise the cap deliberately.)
 */
export const HISTORICAL_SNAPSHOT_CAP = 200;

const round = (n: number) => Math.round(n);

/** Plan a month of Odds API usage from a coverage description. Pure; spends nothing. */
export function planOddsApiUsage(input: OddsApiPlanInput): OddsApiPlan {
  const warnings: string[] = [];
  const capsApplied: string[] = [];

  const sports = Math.max(0, Math.floor(input.sports));
  const regions = Math.max(1, Math.floor(input.regions));
  const markets = Math.max(1, Math.floor(input.markets));
  const days = Math.max(1, Math.floor(input.daysPerMonth));
  const activeHours = Math.min(24, Math.max(0, input.activeHoursPerDay));
  const interval = Math.max(1, input.refreshIntervalMinutes);

  const refreshesPerDay = activeHours > 0 ? Math.floor((activeHours * 60) / interval) : 0;

  const lines: OddsApiPlanLine[] = [];

  // 1) featured odds: [markets × regions] per call, per sport, per refresh, per day
  const oddsPerCall = creditCostOfCall({ endpoint: "ODDS", markets, regions });
  const oddsCalls = sports * refreshesPerDay * days;
  lines.push({ label: "Featured odds (h2h/spreads/totals)", callsPerMonth: oddsCalls, creditsPerCall: oddsPerCall, creditsPerMonth: oddsCalls * oddsPerCall });

  // 2) scores: 1 credit per sport per refresh
  if (input.includeScores) {
    const scoresPerCall = creditCostOfCall({ endpoint: "SCORES", markets: 0, regions: 0 });
    const scoresCalls = sports * refreshesPerDay * days;
    lines.push({ label: "Scores", callsPerMonth: scoresCalls, creditsPerCall: scoresPerCall, creditsPerMonth: scoresCalls * scoresPerCall });
  }

  // 3) player props: an /events list (1) + per-event odds [propMarkets × regions]
  if (input.playerPropEventsPerDay > 0) {
    const events = Math.max(0, Math.floor(input.playerPropEventsPerDay));
    const propMarkets = Math.max(1, Math.floor(input.playerPropMarkets));
    const eventsListCalls = days; // one events list per active sport-day, kept conservative at 1/day
    const eventsListPerCall = creditCostOfCall({ endpoint: "EVENTS", markets: 0, regions: 0 });
    lines.push({ label: "Event list (for props)", callsPerMonth: eventsListCalls, creditsPerCall: eventsListPerCall, creditsPerMonth: eventsListCalls * eventsListPerCall });

    const eventOddsPerCall = creditCostOfCall({ endpoint: "EVENT_ODDS", markets: propMarkets, regions });
    const eventOddsCalls = events * days;
    lines.push({ label: "Player props (per event)", callsPerMonth: eventOddsCalls, creditsPerCall: eventOddsPerCall, creditsPerMonth: eventOddsCalls * eventOddsPerCall });
    if (propMarkets * regions >= 25) warnings.push("Player-prop calls are expensive (many markets × regions, per event) — consider fewer markets or one region.");
  }

  // 4) one-off historical backfill (10× and per-event): capped, and we say so.
  if (input.historicalSnapshots > 0) {
    let snapshots = Math.max(0, Math.floor(input.historicalSnapshots));
    if (snapshots > HISTORICAL_SNAPSHOT_CAP) {
      capsApplied.push(`Historical snapshots capped ${snapshots} → ${HISTORICAL_SNAPSHOT_CAP} (10× cost; raise deliberately).`);
      snapshots = HISTORICAL_SNAPSHOT_CAP;
    }
    const histPerCall = creditCostOfCall({ endpoint: "ODDS", markets, regions, historical: true });
    lines.push({ label: "Historical backfill (10×)", callsPerMonth: snapshots, creditsPerCall: histPerCall, creditsPerMonth: snapshots * histPerCall });
  }

  const monthlyCredits = round(lines.reduce((s, l) => s + l.creditsPerMonth, 0));
  const recommendedTier = recommendTier(monthlyCredits);
  const tierHeadroomCredits = recommendedTier ? recommendedTier.monthlyCredits - monthlyCredits : null;

  if (!recommendedTier) warnings.push(`Burn (${monthlyCredits.toLocaleString()} credits/mo) exceeds the largest known tier — split coverage or reduce cadence.`);
  if (refreshesPerDay === 0 && sports > 0) warnings.push("Active hours or interval yield 0 refreshes/day — no live odds would be pulled.");

  return {
    lines,
    monthlyCredits,
    recommendedTier,
    tierHeadroomCredits,
    warnings,
    capsApplied,
    mode: "PLAN_ONLY",
    spendUsd: 0,
  };
}

// ── multi-sport coverage map (which sports carry which market depth) ──────────
// Code-grounded facts that inform the economics (player props are not uniformly available). This is a
// coverage map, NOT a price list and NOT a feed.

export interface OddsApiSportGroup {
  readonly key: string; // The Odds API sport group key family
  readonly label: string;
  readonly featuredMarkets: readonly string[];
  readonly hasPlayerProps: boolean;
}

export const ODDS_API_SPORT_GROUPS: readonly OddsApiSportGroup[] = [
  { key: "soccer_*", label: "Soccer (many leagues)", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: true },
  { key: "baseball_mlb", label: "MLB", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: true },
  { key: "americanfootball_cfl", label: "CFL", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: false },
  { key: "americanfootball_nfl", label: "NFL", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: true },
  { key: "basketball_nba", label: "NBA", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: true },
  { key: "icehockey_nhl", label: "NHL", featuredMarkets: ["h2h", "spreads", "totals"], hasPlayerProps: true },
];
