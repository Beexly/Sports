/**
 * Draft Assistant — a transparent (glass-box) pick-recommendation engine.
 *
 * Given who's on your roster and who's available, it scores every available
 * player on a blend of: value over replacement, your positional need, tier-cliff
 * scarcity, bye-week stacking risk, injury, and trend — and returns the reasons,
 * not just a number. Pure functions; illustrative data.
 */

import { PLAYERS, POSITIONS, vor, tier, byPosition, type Player, type Pos } from "./players";

/** Standard 1-QB, 2-RB, 2-WR, 1-TE, 1-FLEX starting requirements. */
export const STARTERS: Record<Pos, number> = { QB: 1, RB: 2, WR: 2, TE: 1 };
const FLEX_FROM: Pos[] = ["RB", "WR", "TE"];

export type RosterNeed = { pos: Pos; have: number; need: number; starters: number };

export function rosterNeeds(roster: readonly Player[]): RosterNeed[] {
  return POSITIONS.map((pos) => {
    const have = roster.filter((p) => p.pos === pos).length;
    return { pos, have, need: Math.max(0, STARTERS[pos] - have), starters: STARTERS[pos] };
  });
}

/** Does this roster still owe a FLEX (one extra RB/WR/TE beyond the base starters)? */
function flexUnfilled(roster: readonly Player[]): boolean {
  const surplus = FLEX_FROM.reduce((s, pos) => s + Math.max(0, roster.filter((p) => p.pos === pos).length - STARTERS[pos]), 0);
  return surplus < 1;
}

function needMultiplier(pos: Pos, roster: readonly Player[]): number {
  const have = roster.filter((p) => p.pos === pos).length;
  const req = STARTERS[pos];
  if (have < req) return 1 + (req - have) * 0.28; // short of starters → boost
  if ((pos === "QB" || pos === "TE") && have >= 1) return 0.62; // one is enough early
  if (flexUnfilled(roster) && FLEX_FROM.includes(pos)) return 1.08; // FLEX still open
  return 0.86; // depth pick
}

/**
 * Is this the last player in their position-tier among the available pool? (a
 * cliff). `universe` is the full pool VOR/tiers are scored against — defaults to
 * the illustrative PLAYERS so existing callers are unchanged; a live feed passes
 * its own pool so the replacement baseline is correct.
 */
function isTierCliff(player: Player, available: readonly Player[], universe: readonly Player[] = PLAYERS): boolean {
  const samePos = available.filter((p) => p.pos === player.pos).sort((a, b) => vor(b, universe) - vor(a, universe));
  const idx = samePos.findIndex((p) => p.id === player.id);
  const next = samePos[idx + 1];
  return !next || tier(next, universe) > tier(player, universe);
}

function byeStackRisk(player: Player, roster: readonly Player[]): number {
  const sameBye = roster.filter((p) => p.bye === player.bye && (STARTERS[p.pos] ?? 0) > 0).length;
  return sameBye; // 0,1,2…
}

export type PickRec = {
  readonly player: Player;
  readonly score: number;
  readonly reasons: readonly string[];
};

export function recommend(available: readonly Player[], roster: readonly Player[], limit = 6, universe: readonly Player[] = PLAYERS): PickRec[] {
  const recs = available.map((player) => {
    const base = Math.max(8, vor(player, universe) + 40); // shift so depth picks stay positive
    const need = needMultiplier(player.pos, roster);
    const cliff = isTierCliff(player, available, universe) ? 1.22 : 1;
    const byeN = byeStackRisk(player, roster);
    const byePenalty = byeN >= 2 ? 0.86 : 1;
    const inj = player.injury === "out" ? 0.7 : player.injury === "questionable" ? 0.93 : 1;
    const trend = player.trend === "up" ? 1.05 : player.trend === "down" ? 0.95 : 1;
    const score = base * need * cliff * byePenalty * inj * trend;

    const reasons: string[] = [];
    const v = vor(player, universe);
    if (need >= 1.2) reasons.push(`Fills your biggest need at ${player.pos}.`);
    else if (need <= 0.7) reasons.push(`Depth/luxury — you've covered ${player.pos}.`);
    if (cliff > 1) reasons.push(`Last player in Tier ${tier(player, universe)} at ${player.pos} — a cliff after this.`);
    reasons.push(`Value over replacement: ${v >= 0 ? "+" : ""}${v}.`);
    if (byeN >= 2) reasons.push(`Bye stack risk — you'd have ${byeN + 1} starters on Week ${player.bye}.`);
    if (player.injury !== "healthy") reasons.push(`Injury flag: ${player.injury}.`);
    if (player.trend !== "flat") reasons.push(`Trend ${player.trend === "up" ? "↑" : "↓"} — ${player.role}.`);

    return { player, score, reasons };
  });

  return recs.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** A board snapshot grouped by position with tiers — for the draft UI. */
export function boardByPosition(taken: ReadonlySet<string>): Record<Pos, Player[]> {
  const out = {} as Record<Pos, Player[]>;
  for (const pos of POSITIONS) out[pos] = byPosition(pos).filter((p) => !taken.has(p.id));
  return out;
}

// ── Positional scarcity ──────────────────────────────────────────────────────

export type ScarcityLevel = "critical" | "tight" | "ok";
export type PositionScarcity = {
  readonly pos: Pos;
  readonly remaining: number;
  /** Available players still above replacement value (startable). */
  readonly startersLeft: number;
  /** The best tier still on the board, and how many sit in it (a cliff if 1). */
  readonly topTier: number;
  readonly topTierLeft: number;
  readonly level: ScarcityLevel;
};

/**
 * How thin is each position right now? `topTierLeft <= 1` is a cliff (draft now
 * or fall a tier); few startable players left is "tight". Pure.
 */
export function positionalScarcity(available: readonly Player[], universe: readonly Player[] = PLAYERS): PositionScarcity[] {
  return POSITIONS.map((pos) => {
    const pool = available.filter((p) => p.pos === pos).sort((a, b) => vor(b, universe) - vor(a, universe));
    const startersLeft = pool.filter((p) => vor(p, universe) >= 0).length;
    const topTier = pool.length ? tier(pool[0]!, universe) : 0;
    const topTierLeft = pool.filter((p) => tier(p, universe) === topTier).length;
    const level: ScarcityLevel =
      pool.length === 0 ? "ok" : topTierLeft <= 1 ? "critical" : startersLeft <= 3 ? "tight" : "ok";
    return { pos, remaining: pool.length, startersLeft, topTier, topTierLeft, level };
  });
}

// ── Positional run alerts ────────────────────────────────────────────────────

export type RunAlert = { readonly pos: Pos; readonly count: number; readonly window: number; readonly message: string };

/**
 * Detect a positional run from the recent pick order — e.g. "4 of the last 5
 * picks were RB." Conservative: only flags positions hit at/above `threshold`
 * inside the trailing `window`. Pure.
 */
export function detectRuns(recentPositions: readonly Pos[], window = 5, threshold = 3): RunAlert[] {
  const slice = recentPositions.slice(-window);
  if (slice.length === 0) return [];
  const counts = {} as Record<Pos, number>;
  for (const pos of POSITIONS) counts[pos] = 0;
  for (const pos of slice) counts[pos] = (counts[pos] ?? 0) + 1;
  return POSITIONS.filter((pos) => counts[pos] >= threshold)
    .map((pos) => ({
      pos,
      count: counts[pos],
      window: slice.length,
      message: `${pos} run — ${counts[pos]} of the last ${slice.length} picks. The tier may break; draft ${pos} now or pivot to value.`,
    }))
    .sort((a, b) => b.count - a.count);
}

// ── ADP overlay (legal path: user CSV import) ────────────────────────────────

/**
 * Parse a user-provided ADP CSV. ADP feeds can't be scraped from the books that
 * publish them, so the legal path is a CSV the user exports/owns. Tolerant of a
 * header row and of `name,adp` or `adp,name` column order. Returns a map keyed
 * by lowercased player name. Pure.
 */
export function parseAdpCsv(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return out;

  const cells = (line: string) => line.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
  let nameCol = 0;
  let adpCol = 1;
  const header = cells(lines[0]!).map((c) => c.toLowerCase());
  const looksLikeHeader = header.some((c) => /name|player|adp|rank|pick/.test(c)) && header.every((c) => !/^\d+(\.\d+)?$/.test(c));
  if (looksLikeHeader) {
    const ni = header.findIndex((c) => /name|player/.test(c));
    const ai = header.findIndex((c) => /adp|rank|pick|avg/.test(c));
    if (ni >= 0) nameCol = ni;
    if (ai >= 0) adpCol = ai;
  }

  for (const line of lines.slice(looksLikeHeader ? 1 : 0)) {
    const row = cells(line);
    const name = row[nameCol]?.toLowerCase();
    const adp = Number(row[adpCol]);
    if (name && Number.isFinite(adp) && adp > 0) out.set(name, adp);
  }
  return out;
}

// ── Auction draft values ─────────────────────────────────────────────────────

export type AuctionConfig = {
  readonly teams: number;
  readonly budget: number;
  /** Roster spots per team (determines how many players have positive VOR). */
  readonly rosterSpots: number;
  /** Minimum bid per player (reserve price; subtracts from spendable pool). */
  readonly reserveSlots: number;
};

export const AUCTION_DEFAULTS: AuctionConfig = { teams: 12, budget: 200, rosterSpots: 15, reserveSlots: 3 };

export type AuctionValue = {
  readonly player: Player;
  readonly dollars: number;
  readonly pos: Player["pos"];
};

/**
 * Standard auction-value formula: distribute the league's total spendable
 * budget across draftable players proportional to their positive VOR. Players
 * with VOR ≤ 0 are assigned the reserve price ($1). Pure; pool-injectable.
 */
export function auctionValues(
  pool: readonly Player[] = PLAYERS,
  cfg: AuctionConfig = AUCTION_DEFAULTS,
): AuctionValue[] {
  const { teams, budget, rosterSpots, reserveSlots } = cfg;
  const spendablePerTeam = budget - reserveSlots;
  const totalSpendable = teams * spendablePerTeam;

  const draftable = pool.slice(0, teams * rosterSpots);
  const vors = draftable.map((p) => Math.max(0, vor(p, pool)));
  const totalVor = vors.reduce((s, v) => s + v, 0);

  return draftable.map((p, i) => {
    const v = vors[i]!;
    const raw = totalVor > 0 ? (v / totalVor) * totalSpendable : 0;
    return { player: p, dollars: Math.max(1, Math.round(raw)), pos: p.pos };
  });
}

export type AdpLabel = "steal" | "value" | "on-time" | "reach" | "none";
export type AdpValue = { readonly adp: number | null; readonly delta: number | null; readonly label: AdpLabel };

/**
 * Compare a player's imported ADP to the current overall pick. Positive delta =
 * still available past ADP = a steal. Pure. `none` when no ADP was imported for
 * the player.
 */
export function valueVsAdp(player: Player, adp: Map<string, number>, currentPick: number): AdpValue {
  const a = adp.get(player.name.toLowerCase());
  if (a == null) return { adp: null, delta: null, label: "none" };
  const delta = Math.round(a - currentPick);
  const label: AdpLabel = delta >= 10 ? "steal" : delta >= 3 ? "value" : delta <= -10 ? "reach" : "on-time";
  return { adp: a, delta, label };
}
