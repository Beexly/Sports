/**
 * Line movement analytics — pure, zero dependencies.
 *
 * Steam move detection, reverse line movement, line trend analysis,
 * and key number proximity for sports betting intelligence.
 * All pure functions. Does not modify picks or model weights.
 */

export interface OddsSnapshot {
  readonly timestamp: number;       // Unix ms
  readonly spread?: number;         // e.g., -3.5
  readonly total?: number;          // e.g., 47.5
  readonly moneylineHome?: number;  // American odds, e.g., -150
  readonly moneylineAway?: number;  // American odds, e.g., +130
  readonly bookmaker?: string;
}

export interface LineMove {
  readonly from: OddsSnapshot;
  readonly to: OddsSnapshot;
  readonly spreadMove: number | null;   // to.spread - from.spread (null if either undefined)
  readonly totalMove: number | null;    // to.total - from.total
  readonly durationMs: number;
  readonly spreadMovePerHour: number | null;  // spreadMove / (durationMs / 3600000)
}

export type MovementLabel =
  | "steam"        // fast sharp-money move (>= 0.5 pts in < 30 min)
  | "sharp"        // slower deliberate move by sharps
  | "public"       // slow drift toward popular side
  | "correction"   // reversal of prior move
  | "neutral"      // no significant move
  | "opening";     // first line set

export interface MovementEvent {
  readonly timestamp: number;
  readonly label: MovementLabel;
  readonly spreadMove: number | null;
  readonly confidence: number;         // 0-1, how confident in the label
  readonly description: string;
}

export interface ReverseLineMovement {
  readonly detected: boolean;
  readonly pickSide: "home" | "away";
  readonly bettingPercentage: number;  // 0-1, fraction of tickets on the other side
  readonly lineMovedAgainst: boolean;  // line moved toward pick (against ticket %s)
  readonly strength: "strong" | "moderate" | "weak";
}

// ─── computeLineMove ─────────────────────────────────────────────────────────

/**
 * Compute the line movement between two odds snapshots.
 */
export function computeLineMove(from: OddsSnapshot, to: OddsSnapshot): LineMove {
  const spreadMove =
    from.spread !== undefined && to.spread !== undefined
      ? to.spread - from.spread
      : null;

  const totalMove =
    from.total !== undefined && to.total !== undefined
      ? to.total - from.total
      : null;

  const durationMs = to.timestamp - from.timestamp;

  let spreadMovePerHour: number | null = null;
  if (spreadMove !== null && durationMs > 0) {
    const hours = durationMs / 3_600_000;
    spreadMovePerHour = spreadMove / hours;
  }

  return { from, to, spreadMove, totalMove, durationMs, spreadMovePerHour };
}

// ─── labelMovement ────────────────────────────────────────────────────────────

const THIRTY_MIN_MS = 30 * 60 * 1_000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1_000;
const ONE_HOUR_MS = 60 * 60 * 1_000;

/**
 * Classify a line move into a movement label.
 * Priority: steam > sharp > public > neutral
 */
export function labelMovement(move: LineMove): MovementLabel {
  const { spreadMove, durationMs } = move;

  if (spreadMove === null) return "neutral";

  const absMove = Math.abs(spreadMove);

  // steam: |spreadMove| >= 0.5 AND durationMs < 30 min
  if (absMove >= 0.5 && durationMs < THIRTY_MIN_MS) {
    return "steam";
  }

  // sharp: |spreadMove| >= 1.0 AND duration > 1 hour (slow big move)
  if (absMove >= 1.0 && durationMs > ONE_HOUR_MS) {
    return "sharp";
  }

  // public: |spreadMove| >= 0.5 AND duration >= 4 hours
  if (absMove >= 0.5 && durationMs >= FOUR_HOURS_MS) {
    return "public";
  }

  // neutral: |spreadMove| < 0.5 or none of the above
  return "neutral";
}

// ─── detectSteamMoves ────────────────────────────────────────────────────────

function formatSpreadMove(from: OddsSnapshot, to: OddsSnapshot, durationMs: number): string {
  const fromSpread = from.spread !== undefined ? from.spread : "?";
  const toSpread = to.spread !== undefined ? to.spread : "?";
  const minutes = Math.round(durationMs / 60_000);
  return `${fromSpread} → ${toSpread} in ${minutes} min`;
}

/**
 * Process a sequence of snapshots to find significant movement events.
 * Returns only non-neutral events.
 */
export function detectSteamMoves(snapshots: readonly OddsSnapshot[]): MovementEvent[] {
  if (snapshots.length < 2) return [];

  const events: MovementEvent[] = [];

  for (let i = 1; i < snapshots.length; i++) {
    const from = snapshots[i - 1];
    const to = snapshots[i];
    const move = computeLineMove(from, to);
    const label = labelMovement(move);

    if (label === "neutral") continue;

    const absMove = move.spreadMove !== null ? Math.abs(move.spreadMove) : 0;

    let confidence: number;
    switch (label) {
      case "steam":
        confidence = Math.min(1, absMove / 1.0);
        break;
      case "sharp":
        confidence = 0.7;
        break;
      case "public":
        confidence = 0.4;
        break;
      default:
        confidence = 0.1;
    }

    const moveDescription = formatSpreadMove(from, to, move.durationMs);
    let description: string;
    switch (label) {
      case "steam":
        description = `Steam: ${moveDescription}`;
        break;
      case "sharp":
        description = `Sharp: ${moveDescription}`;
        break;
      case "public":
        description = `Public: ${moveDescription}`;
        break;
      default:
        description = `Move: ${moveDescription}`;
    }

    events.push({
      timestamp: to.timestamp,
      label,
      spreadMove: move.spreadMove,
      confidence,
      description,
    });
  }

  return events;
}

// ─── reverseLineMovement ─────────────────────────────────────────────────────

/**
 * Detect reverse line movement (RLM).
 *
 * RLM occurs when the majority of public tickets are on the opposite side,
 * yet the line moves in favor of our pick (sharp money pushing).
 */
export function reverseLineMovement(
  pickSide: "home" | "away",
  bettingPercentageOnPickSide: number,
  openingSpread: number,
  currentSpread: number
): ReverseLineMovement {
  const spreadChange = currentSpread - openingSpread;
  const absSpreadChange = Math.abs(spreadChange);

  // lineMovedFavorably: line moved to give our pick a better number
  // For "home": currentSpread < openingSpread means home covers less (better for home)
  // For "away": currentSpread > openingSpread means favorite covers more (away dog better number)
  let lineMovedFavorably: boolean;
  if (pickSide === "home") {
    lineMovedFavorably = currentSpread < openingSpread;
  } else {
    lineMovedFavorably = currentSpread > openingSpread;
  }

  const lowTicketPercentage = bettingPercentageOnPickSide < 0.4;
  const detected = lowTicketPercentage && lineMovedFavorably;

  let strength: "strong" | "moderate" | "weak";
  if (detected && bettingPercentageOnPickSide < 0.3 && absSpreadChange > 0.5) {
    strength = "strong";
  } else if (detected) {
    strength = "moderate";
  } else {
    strength = "weak";
  }

  return {
    detected,
    pickSide,
    bettingPercentage: bettingPercentageOnPickSide,
    lineMovedAgainst: lineMovedFavorably,
    strength,
  };
}

// ─── keyNumberProximity ──────────────────────────────────────────────────────

// NFL key numbers (positive values; we check both signs)
const NFL_KEY_NUMBERS = [3, 7, 10, 14, 17];

/**
 * Determine proximity to key NFL spread numbers.
 */
export function keyNumberProximity(spread: number): {
  nearKeyNumber: boolean;
  keyNumber: number | null;
  distanceFromKey: number;
} {
  let closestKey: number | null = null;
  let minDistance = Infinity;

  for (const key of NFL_KEY_NUMBERS) {
    // Check both positive and negative key numbers
    for (const candidate of [key, -key]) {
      const distance = Math.abs(spread - candidate);
      if (distance < minDistance) {
        minDistance = distance;
        closestKey = candidate;
      }
    }
  }

  return {
    nearKeyNumber: minDistance <= 0.5,
    keyNumber: closestKey,
    distanceFromKey: minDistance,
  };
}

// ─── openingToCurrentMove ─────────────────────────────────────────────────────

/**
 * Full opening-to-current movement summary.
 */
export function openingToCurrentMove(
  opening: OddsSnapshot,
  current: OddsSnapshot
): {
  spreadChange: number | null;
  totalChange: number | null;
  percentChange: number | null;
  direction: "toward_home" | "toward_away" | "none";
} {
  const spreadChange =
    opening.spread !== undefined && current.spread !== undefined
      ? current.spread - opening.spread
      : null;

  const totalChange =
    opening.total !== undefined && current.total !== undefined
      ? current.total - opening.total
      : null;

  // percentChange: for moneyline home if available
  let percentChange: number | null = null;
  if (opening.moneylineHome !== undefined && current.moneylineHome !== undefined && opening.moneylineHome !== 0) {
    percentChange = ((current.moneylineHome - opening.moneylineHome) / Math.abs(opening.moneylineHome)) * 100;
  }

  // direction: spread increased → home covering more → toward_home (sharps on home)
  let direction: "toward_home" | "toward_away" | "none";
  if (spreadChange === null || spreadChange === 0) {
    direction = "none";
  } else if (spreadChange > 0) {
    // Spread went up (e.g., -3 → -4 means home is bigger favorite = toward_home)
    // Wait: -3 → -4 means spreadChange = -1 (more negative = home bigger favorite)
    // Let's re-check: if spread goes from -3 to -4, spreadChange = -4 - (-3) = -1
    // Home is a bigger favorite now → toward_home
    // If spread goes from -3 to -2, spreadChange = +1 → home is smaller favorite → toward_away
    direction = "toward_away";
  } else {
    // spreadChange < 0: home became bigger favorite
    direction = "toward_home";
  }

  return { spreadChange, totalChange, percentChange, direction };
}

// ─── lineMoveTrend ────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1_000;

/**
 * Classify the overall trend of spread movement across snapshots.
 */
export function lineMoveTrend(
  snapshots: readonly OddsSnapshot[]
): "sharply_up" | "sharply_down" | "drifting_up" | "drifting_down" | "stable" | "volatile" {
  if (snapshots.length < 2) return "stable";

  const spreads = snapshots.filter((s) => s.spread !== undefined);
  if (spreads.length < 2) return "stable";

  const first = spreads[0];
  const last = spreads[spreads.length - 1];

  // Total move from first to last
  const totalMove = (last.spread as number) - (first.spread as number);
  const timeSpanMs = last.timestamp - first.timestamp;

  // Max single move between adjacent snapshots
  let maxSingleMove = 0;
  for (let i = 1; i < spreads.length; i++) {
    const move = Math.abs((spreads[i].spread as number) - (spreads[i - 1].spread as number));
    if (move > maxSingleMove) maxSingleMove = move;
  }

  // volatile: max single move >= 1.5 but total < 1.0 absolute (back and forth)
  if (maxSingleMove >= 1.5 && Math.abs(totalMove) < 1.0) {
    return "volatile";
  }

  // sharply_up/down: total move > 1.0 in < 24h
  if (totalMove > 1.0 && timeSpanMs < TWENTY_FOUR_HOURS_MS) {
    return "sharply_up";
  }
  if (totalMove < -1.0 && timeSpanMs < TWENTY_FOUR_HOURS_MS) {
    return "sharply_down";
  }

  // drifting_up/down: total move > 0.5 or < -0.5
  if (totalMove > 0.5) return "drifting_up";
  if (totalMove < -0.5) return "drifting_down";

  // stable: total absolute move < 0.5
  return "stable";
}

// ─── consensusOdds ───────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute consensus (median) spread and total across all snapshots.
 */
export function consensusOdds(snapshots: readonly OddsSnapshot[]): {
  spread: number | null;
  total: number | null;
} {
  const spreads = snapshots
    .filter((s) => s.spread !== undefined)
    .map((s) => s.spread as number);

  const totals = snapshots
    .filter((s) => s.total !== undefined)
    .map((s) => s.total as number);

  return {
    spread: median(spreads),
    total: median(totals),
  };
}

// ─── spreadToImpliedProb ─────────────────────────────────────────────────────

/**
 * Convert a point spread to an approximate win probability.
 *
 * Uses linear approximation for |spread| <= 14.
 * Convention: home spread (negative = home is favorite).
 * A negative spread means the home team is favored; the favorite wins more often.
 *
 * P(home wins) ≈ 0.5 + (-spread) * 0.0187
 *   → when spread = -3 (home favored by 3): P = 0.5 + 3 * 0.0187 ≈ 0.556
 *   → when spread = 0 (pick'em): P = 0.5
 *   → when spread = +3 (home underdog by 3): P = 0.5 - 3 * 0.0187 ≈ 0.444
 */
export function spreadToImpliedProb(spread: number): number {
  // -spread gives us how many points the home team is favored by
  // Positive value = home is favorite
  const prob = 0.5 + (-spread) * 0.0187;
  return Math.max(0.05, Math.min(0.95, prob));
}
