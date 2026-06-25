/**
 * GALILEO ENGINE — Shock Absorption Engine (Phase 4).
 *
 * An event study for market shocks (injury news, inactives, role changes, weather, QB
 * status, OL/DL injury clusters). Given the shock time and a pre-decision observation
 * series, it measures: the pre- and post-shock state, the first market and first book to
 * move, the laggards, the move magnitude, the absorption half-life, and whether the market
 * over- or under-reacted — the raw material for "after news, can a specific prop be caught
 * before it corrects."
 *
 * HARD RULES (fail loudly): the shock timestamp must exist and must be at or before the
 * decision time. No observation after the decision time is ever used — features are
 * strictly pre-decision. Pure + deterministic.
 */

export type ShockType =
  | "injury_report"
  | "practice_status"
  | "inactive"
  | "role_change"
  | "weather"
  | "depth_chart"
  | "beat_writer_news"
  | "qb_status"
  | "ol_injury_cluster"
  | "dl_injury_cluster";

export interface ShockEvent {
  readonly type: ShockType;
  readonly timestamp: string;
  readonly subject?: string;
}

export interface MarketObservation {
  /** Tracked market/outcome label, e.g. "total:OVER" or "player_rush_yds:RB1:OVER". */
  readonly market: string;
  readonly book: string;
  readonly point: number;
  readonly timestamp: string;
}

export interface MarketShockPath {
  readonly market: string;
  readonly preState: number;
  readonly postState: number;
  readonly magnitude: number;
  readonly firstBookToMove: string | null;
  readonly firstMoveMs: number | null;
  readonly halfLifeMs: number | null;
  readonly laggingBooks: readonly string[];
  readonly reaction: "overreaction" | "underreaction" | "settled" | "no_move";
}

export interface ShockStudyResult {
  readonly shock: ShockEvent;
  readonly decisionTime: string;
  readonly usedObservations: number;
  readonly ignoredPostDecision: number;
  readonly firstMarketToMove: string | null;
  readonly laggingMarkets: readonly string[];
  readonly paths: readonly MarketShockPath[];
}

const ms = (iso: string): number => Date.parse(iso);

export class ShockTimestampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShockTimestampError";
  }
}

/** Consensus (median across books' latest points ≤ t) at each observation time. */
function consensusPath(obs: MarketObservation[]): Array<{ t: number; value: number }> {
  const sorted = [...obs].sort((a, b) => ms(a.timestamp) - ms(b.timestamp) || (a.book < b.book ? -1 : 1));
  const latest = new Map<string, number>();
  const path: Array<{ t: number; value: number }> = [];
  for (const o of sorted) {
    latest.set(o.book, o.point);
    const vals = [...latest.values()].sort((a, b) => a - b);
    const m = Math.floor(vals.length / 2);
    const value = vals.length % 2 ? vals[m]! : (vals[m - 1]! + vals[m]!) / 2;
    path.push({ t: ms(o.timestamp), value });
  }
  return path;
}

function analyzeMarket(
  market: string,
  obs: MarketObservation[],
  shockMs: number,
  epsilon: number,
): MarketShockPath {
  const path = consensusPath(obs);
  const preEntries = path.filter((p) => p.t < shockMs);
  const preState = (preEntries.at(-1) ?? path[0])?.value ?? NaN;
  const postState = path.at(-1)?.value ?? preState;
  const magnitude = postState - preState;

  // First book to change its own point after the shock.
  const byBook = new Map<string, MarketObservation[]>();
  for (const o of obs) (byBook.get(o.book) ?? byBook.set(o.book, []).get(o.book)!).push(o);
  let firstBookToMove: string | null = null;
  let firstMoveMs: number | null = null;
  const laggingBooks: string[] = [];
  for (const [book, series] of byBook) {
    const s = series.slice().sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
    const pre = s.filter((o) => ms(o.timestamp) < shockMs).at(-1)?.point ?? s[0]!.point;
    const moved = s.find((o) => ms(o.timestamp) >= shockMs && Math.abs(o.point - pre) > epsilon);
    if (moved) {
      const t = ms(moved.timestamp);
      if (firstMoveMs === null || t < firstMoveMs) {
        firstMoveMs = t;
        firstBookToMove = book;
      }
    } else if (Math.abs(magnitude) > epsilon) {
      laggingBooks.push(book); // market moved overall but this book didn't
    }
  }

  // Absorption half-life: first post-shock time reaching pre + 0.5·magnitude.
  let halfLifeMs: number | null = null;
  if (Math.abs(magnitude) > epsilon) {
    const target = preState + 0.5 * magnitude;
    const reached = path.find(
      (p) => p.t >= shockMs && (magnitude > 0 ? p.value >= target : p.value <= target),
    );
    if (reached) halfLifeMs = reached.t - shockMs;
  }

  // Over/underreaction from the post-shock path's peak vs the settled magnitude.
  let reaction: MarketShockPath["reaction"] = "no_move";
  if (Math.abs(magnitude) > epsilon) {
    const postPath = path.filter((p) => p.t >= shockMs);
    const peakDev = Math.max(...postPath.map((p) => Math.abs(p.value - preState)), 0);
    reaction = peakDev > Math.abs(magnitude) * 1.2 ? "overreaction" : "settled";
  }

  return {
    market,
    preState,
    postState,
    magnitude,
    firstBookToMove,
    firstMoveMs,
    halfLifeMs,
    laggingBooks: laggingBooks.sort(),
    reaction,
  };
}

/**
 * Run the event study. Throws ShockTimestampError if the shock timestamp is missing or
 * after the decision time. Observations after the decision time are dropped (never used).
 */
export function studyShock(args: {
  shock: ShockEvent;
  decisionTime: string;
  observations: readonly MarketObservation[];
  epsilon?: number;
}): ShockStudyResult {
  const { shock, decisionTime } = args;
  const epsilon = args.epsilon ?? 1e-9;
  const shockMs = ms(shock?.timestamp ?? "");
  const decMs = ms(decisionTime);
  if (!shock?.timestamp || !Number.isFinite(shockMs)) {
    throw new ShockTimestampError("Shock timestamp is missing or unparseable.");
  }
  if (!Number.isFinite(decMs)) {
    throw new ShockTimestampError("Decision time is missing or unparseable.");
  }
  if (shockMs > decMs) {
    throw new ShockTimestampError(`Shock (${shock.timestamp}) is AFTER the decision time (${decisionTime}).`);
  }

  const used = args.observations.filter((o) => Number.isFinite(ms(o.timestamp)) && ms(o.timestamp) <= decMs);
  const ignoredPostDecision = args.observations.length - used.length;

  const byMarket = new Map<string, MarketObservation[]>();
  for (const o of used) (byMarket.get(o.market) ?? byMarket.set(o.market, []).get(o.market)!).push(o);

  const paths = [...byMarket.entries()]
    .map(([market, obs]) => analyzeMarket(market, obs, shockMs, epsilon))
    .sort((a, b) => (a.market < b.market ? -1 : 1));

  const movers = paths.filter((p) => p.firstMoveMs !== null);
  const firstMarketToMove =
    movers.length === 0 ? null : movers.reduce((a, b) => (a.firstMoveMs! <= b.firstMoveMs! ? a : b)).market;
  const laggingMarkets = paths.filter((p) => Math.abs(p.magnitude) <= epsilon).map((p) => p.market);
  // A market that didn't move while another did is an underreaction candidate.
  const someoneMoved = paths.some((p) => Math.abs(p.magnitude) > epsilon);
  const annotated = paths.map((p) =>
    Math.abs(p.magnitude) <= epsilon && someoneMoved ? { ...p, reaction: "underreaction" as const } : p,
  );

  return {
    shock,
    decisionTime,
    usedObservations: used.length,
    ignoredPostDecision,
    firstMarketToMove,
    laggingMarkets,
    paths: annotated,
  };
}
