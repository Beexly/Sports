/**
 * GALILEO ENGINE — Coherence Constraint Engine (Phase 2).
 *
 * The market surface should be internally consistent: the spread, total and team totals
 * must satisfy algebra; a QB's passing line and his receivers' yardage lines must roughly
 * conserve; when the game total moves, the player props it implies should move too. When
 * they DON'T, the surface contains a contradiction — and a contradiction is information
 * the single-book interface never shows you. This module detects those contradictions.
 *
 * It does NOT emit a bet. It emits FLAGS: structural inconsistencies with the subjects and
 * the magnitude. Whether a flag is an exploitable edge is decided much later, after the
 * evidence gates. Pure + deterministic.
 *
 * STATIC checks read one surface (a single timestamp). TEMPORAL checks read a before/after
 * pair — and both snapshots must be pre-decision; the "consensus moved first" staleness rule
 * never uses future data, it only observes that one book lagged a move that already happened.
 */

import {
  type MarketSurface,
  getInstance,
  outcomeOf,
} from "./market-surface.js";

export type CoherenceCheck =
  | "spread_total_team_total"
  | "qb_receiver_conservation"
  | "rb_role_coherence"
  | "total_to_prop_transmission"
  | "book_staleness";

export type CoherenceSeverity = "info" | "warn" | "contradiction";

export interface CoherenceFlag {
  readonly check: CoherenceCheck;
  readonly severity: CoherenceSeverity;
  readonly detail: string;
  /** Instance keys / books / players implicated. */
  readonly subjects: readonly string[];
  /** Magnitude of the inconsistency (units depend on the check). */
  readonly metric: number;
}

// ── 1. Spread / total / team-total algebra ─────────────────────────────────────────

export interface ImpliedTeamTotals {
  readonly homeTotal: number;
  readonly awayTotal: number;
  readonly spreadHome: number;
  readonly total: number;
}

/**
 * From the game spread (home-perspective handicap) and total, the implied team totals are
 *   home = (total − spreadHome) / 2,  away = (total + spreadHome) / 2
 * (home favored ⇒ spreadHome < 0 ⇒ home scores more). Returns null if either is unpriced.
 */
export function impliedTeamTotals(surface: MarketSurface): ImpliedTeamTotals | null {
  const spreadHome = outcomeOf(getInstance(surface, "spread"), "HOME")?.consensusPoint;
  const total =
    outcomeOf(getInstance(surface, "total"), "OVER")?.consensusPoint ??
    outcomeOf(getInstance(surface, "total"), "UNDER")?.consensusPoint;
  if (spreadHome == null || total == null) return null;
  return {
    homeTotal: (total - spreadHome) / 2,
    awayTotal: (total + spreadHome) / 2,
    spreadHome,
    total,
  };
}

/**
 * Reconcile any explicit team-total markets against the spread+total algebra. A team-total
 * market that disagrees with its implied value by more than `tolerance` points is flagged —
 * a candidate stale team-total surface (or a stale side/total). Names are the team labels
 * used as the `team` field on team_total quotes (e.g. "KC", "SF").
 */
export function checkSpreadTotalTeamTotal(
  surface: MarketSurface,
  args: { homeTeam: string; awayTeam: string; tolerance?: number },
): CoherenceFlag[] {
  const tol = args.tolerance ?? 1.0;
  const implied = impliedTeamTotals(surface);
  if (!implied) return [];
  const flags: CoherenceFlag[] = [];
  const sides: Array<[string, number]> = [
    [args.homeTeam, implied.homeTotal],
    [args.awayTeam, implied.awayTotal],
  ];
  for (const [team, impliedTT] of sides) {
    const inst = getInstance(surface, `team_total:${team}`);
    const marketTT =
      outcomeOf(inst, "OVER")?.consensusPoint ?? outcomeOf(inst, "UNDER")?.consensusPoint;
    if (marketTT == null) continue;
    const diff = marketTT - impliedTT;
    if (Math.abs(diff) > tol) {
      flags.push({
        check: "spread_total_team_total",
        severity: Math.abs(diff) > tol * 2 ? "contradiction" : "warn",
        detail: `${team} team total ${marketTT} vs spread/total-implied ${impliedTT.toFixed(1)} (Δ${diff.toFixed(1)}).`,
        subjects: [`team_total:${team}`, "spread", "total"],
        metric: Math.abs(diff),
      });
    }
  }
  return flags;
}

// ── 2. QB → receiver yardage conservation ──────────────────────────────────────────

/**
 * A QB's passing-yards line should be broadly conserved by the receiving-yards lines of his
 * pass catchers (most passing yards become receiving yards). If the receiver lines sum to far
 * less than the QB line, the receiver surface is likely STALE or incomplete; if they sum to
 * MORE than the QB line, that is a hard contradiction. `band` sets the acceptable ratio window
 * (default 0.55–1.05 of the QB line).
 */
export function checkQbReceiverConservation(
  surface: MarketSurface,
  args: { qbKey: string; receiverKeys: readonly string[]; band?: readonly [number, number] },
): CoherenceFlag[] {
  const [lo, hi] = args.band ?? [0.55, 1.05];
  const qbYds = outcomeOf(getInstance(surface, args.qbKey), "OVER")?.consensusPoint;
  if (qbYds == null || qbYds <= 0) return [];
  let recSum = 0;
  let counted = 0;
  for (const k of args.receiverKeys) {
    const v = outcomeOf(getInstance(surface, k), "OVER")?.consensusPoint;
    if (v != null) {
      recSum += v;
      counted += 1;
    }
  }
  if (counted === 0) return [];
  const ratio = recSum / qbYds;
  if (ratio > hi) {
    return [
      {
        check: "qb_receiver_conservation",
        severity: "contradiction",
        detail: `Receiver yards sum ${recSum.toFixed(0)} exceeds QB passing line ${qbYds.toFixed(0)} (ratio ${ratio.toFixed(2)}) — impossible without another passer.`,
        subjects: [args.qbKey, ...args.receiverKeys],
        metric: ratio,
      },
    ];
  }
  if (ratio < lo) {
    return [
      {
        check: "qb_receiver_conservation",
        severity: "warn",
        detail: `Receiver yards sum ${recSum.toFixed(0)} is only ${(ratio * 100).toFixed(0)}% of QB line ${qbYds.toFixed(0)} — receiver surface likely stale/incomplete.`,
        subjects: [args.qbKey, ...args.receiverKeys],
        metric: ratio,
      },
    ];
  }
  return [];
}

// ── 3. RB role coherence (basic structural form) ───────────────────────────────────

/**
 * A high rushing line for an RB whose team is implied to be a sizeable underdog is suspect:
 * trailing teams pass and abandon the run, so game script caps carries. Flags a rush line
 * that sits above `highLine` while the RB's team's implied total is below `lowTeamTotal`
 * (a weak-offense / likely-trailing script). This is a STRUCTURAL prior, not a verdict —
 * the role-state engine (Phase 5) refines it with usage signals.
 */
export function checkRbRoleCoherence(
  surface: MarketSurface,
  args: { rbRushKey: string; rbTeam: string; homeTeam: string; awayTeam: string; highLine?: number; lowTeamTotal?: number },
): CoherenceFlag[] {
  const highLine = args.highLine ?? 65;
  const lowTeamTotal = args.lowTeamTotal ?? 18;
  const rush = outcomeOf(getInstance(surface, args.rbRushKey), "OVER")?.consensusPoint;
  const implied = impliedTeamTotals(surface);
  if (rush == null || !implied) return [];
  const teamTotal =
    args.rbTeam === args.homeTeam ? implied.homeTotal : args.rbTeam === args.awayTeam ? implied.awayTotal : null;
  if (teamTotal == null) return [];
  if (rush >= highLine && teamTotal <= lowTeamTotal) {
    return [
      {
        check: "rb_role_coherence",
        severity: "warn",
        detail: `${args.rbTeam} RB rush line ${rush} is high while implied team total ${teamTotal.toFixed(1)} signals a likely-trailing script (carry suppression).`,
        subjects: [args.rbRushKey, "spread", "total"],
        metric: rush - highLine,
      },
    ];
  }
  return [];
}

// ── 4. Total → prop transmission (temporal pair) ────────────────────────────────────

export interface PropLag {
  readonly key: string;
  readonly beforePoint: number;
  readonly afterPoint: number;
  readonly moved: boolean;
}

export interface TransmissionResult {
  readonly totalMove: number;
  readonly lagging: readonly PropLag[];
  readonly flags: readonly CoherenceFlag[];
}

/**
 * When the game total moves by ≥ `totalThreshold` between two pre-decision snapshots, the
 * player props it drives should move too. This returns the props that did NOT move — the
 * lagging surface a faster actor would exploit. Pure pair comparison; both snapshots are
 * historical relative to any decision.
 */
export function checkTotalToPropTransmission(
  before: MarketSurface,
  after: MarketSurface,
  args: { propKeys: readonly string[]; side?: string; totalThreshold?: number; propEpsilon?: number },
): TransmissionResult {
  const side = args.side ?? "OVER";
  const totalThreshold = args.totalThreshold ?? 2;
  const eps = args.propEpsilon ?? 0.01;

  const tBefore = outcomeOf(getInstance(before, "total"), "OVER")?.consensusPoint;
  const tAfter = outcomeOf(getInstance(after, "total"), "OVER")?.consensusPoint;
  if (tBefore == null || tAfter == null) return { totalMove: 0, lagging: [], flags: [] };
  const totalMove = tAfter - tBefore;
  if (Math.abs(totalMove) < totalThreshold) return { totalMove, lagging: [], flags: [] };

  const lagging: PropLag[] = [];
  for (const key of args.propKeys) {
    const b = outcomeOf(getInstance(before, key), side)?.consensusPoint;
    const a = outcomeOf(getInstance(after, key), side)?.consensusPoint;
    if (b == null || a == null) continue;
    const moved = Math.abs(a - b) > eps;
    if (!moved) lagging.push({ key, beforePoint: b, afterPoint: a, moved });
  }

  const flags: CoherenceFlag[] = lagging.length
    ? [
        {
          check: "total_to_prop_transmission",
          severity: "warn",
          detail: `Total moved ${totalMove.toFixed(1)} but ${lagging.length} prop(s) did not adjust: ${lagging.map((l) => l.key).join(", ")}.`,
          subjects: ["total", ...lagging.map((l) => l.key)],
          metric: Math.abs(totalMove),
        },
      ]
    : [];
  return { totalMove, lagging, flags };
}

// ── 6. Book staleness (temporal pair, consensus-moved-first rule) ───────────────────

export interface StaleBook {
  readonly book: string;
  readonly instanceKey: string;
  readonly outcome: string;
  readonly bookPoint: number;
  readonly consensusBefore: number;
  readonly consensusAfter: number;
  readonly lag: number;
}

/**
 * Detect books left off-market AFTER a consensus move. Logic: between two pre-decision
 * snapshots the consensus point for (instanceKey, outcome) moved by ≥ `moveThreshold`; a book
 * whose own point did NOT change and now sits ≥ `staleThreshold` away from the new consensus
 * is flagged stale — it failed to follow a move that already happened. This NEVER uses future
 * data: it compares a book's lagging present value to the consensus that already moved.
 */
export function detectStaleBooks(
  before: MarketSurface,
  after: MarketSurface,
  args: { instanceKey: string; outcome: string; moveThreshold?: number; staleThreshold?: number },
): { flags: CoherenceFlag[]; stale: StaleBook[] } {
  const moveThreshold = args.moveThreshold ?? 0.5;
  const staleThreshold = args.staleThreshold ?? 0.5;
  const ob = outcomeOf(getInstance(before, args.instanceKey), args.outcome);
  const oa = outcomeOf(getInstance(after, args.instanceKey), args.outcome);
  if (!ob || !oa || ob.consensusPoint == null || oa.consensusPoint == null) {
    return { flags: [], stale: [] };
  }
  const consensusMove = oa.consensusPoint - ob.consensusPoint;
  if (Math.abs(consensusMove) < moveThreshold) return { flags: [], stale: [] };

  const beforeByBook = new Map(ob.byBook.map((b) => [b.book, b]));
  const stale: StaleBook[] = [];
  for (const b of oa.byBook) {
    const prior = beforeByBook.get(b.book);
    if (!prior || prior.point == null || b.point == null) continue;
    const bookUnchanged = Math.abs(b.point - prior.point) < 1e-9;
    const offConsensus = Math.abs(b.point - oa.consensusPoint);
    if (bookUnchanged && offConsensus >= staleThreshold) {
      stale.push({
        book: b.book,
        instanceKey: args.instanceKey,
        outcome: args.outcome,
        bookPoint: b.point,
        consensusBefore: ob.consensusPoint,
        consensusAfter: oa.consensusPoint,
        lag: offConsensus,
      });
    }
  }
  const flags: CoherenceFlag[] = stale.map((s) => ({
    check: "book_staleness",
    severity: "warn",
    detail: `${s.book} left ${s.instanceKey} ${s.outcome} at ${s.bookPoint} after consensus moved ${ob.consensusPoint}→${oa.consensusPoint} (lag ${s.lag.toFixed(1)}).`,
    subjects: [s.book, s.instanceKey],
    metric: s.lag,
  }));
  return { flags, stale };
}
