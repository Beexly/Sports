/**
 * Hockey Player Performance via Regularized Logistic Regression
 *
 * arXiv:1510.02172v2 · lane:props_dfs · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build an NFL regularized adjusted plus-minus from the paper's hockey template: L1-penalized
 * logistic regression on 'which team scores the next touchdown/field-goal event' with indicators
 * for the 22 on-field players and unpenalized team-season + down/distance/score/field-position
 * controls, derive NFL PFP (probability team's event given player on field) and partial plus-minus
 * on the EPA scale (PPM_j = snaps_j x (2*PFP_j - 1) x avg EPA per event), and publish a weekly
 * 'true contribution' leaderboard as a prop-market perception-vs-reality screen.
 *
 * ACCEPTANCE GATE: ADOPT the L1 partial-PM as a GSE player metric if on the mover test (players changing teams
 * 2024->2025) partial-PM predicts 2025 team EPA/play contribution better (higher R^2 or rank
 * correlation) than raw on/off EPA and matches or beats nflWAR.
 *
 * Ingest role: feature builder (NFL PFP + partial plus-minus leaderboard).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1510.02172v2" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the L1 partial-PM as a GSE player metric if on the mover test (players changing teams
 * 2024->2025) partial-PM predicts 2025 team EPA/play contribution better (higher R^2 or rank
 * correlation) than raw on/off EPA and matches or beats nflWAR.`;

export const CONFIG = { enabled: false, priorWeight: 10, l1Note: "L1 via external solver; this module ships the shrunk on/off core + PPM accounting" } as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface EventRow {
  readonly playerIds: readonly string[];
  readonly teamScored: 0 | 1;
  readonly epaPerEvent: number;
}

export function isEventRow(x: unknown): x is EventRow {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o["playerIds"]) && (o["playerIds"] as unknown[]).every((p) => typeof p === "string") &&
    (o["teamScored"] === 0 || o["teamScored"] === 1) &&
    isFiniteNumber(o["epaPerEvent"])
  );
}

/** PFP_j = P(team's next scoring event | player j on field), shrunk to prior. */
export function pfpFromCounts(teamEvents: number, totalEvents: number, prior = 0.5, priorWeight = 10): number | null {
  if (![teamEvents, totalEvents, prior, priorWeight].every(isFiniteNumber)) return null;
  if (teamEvents < 0 || totalEvents < 0 || teamEvents > totalEvents || priorWeight < 0) return null;
  if (prior < 0 || prior > 1) return null;
  return (teamEvents + prior * priorWeight) / (totalEvents + priorWeight);
}

/**
 * Shrunk on/off differential for one player (the L1-regularized template's
 * closed-form core): pulls small-sample on/off splits toward the prior.
 */
export function shrunkOnOff(onEpa: number, offEpa: number, nOn: number, nOff: number, prior = 0, k = 25): number | null {
  if (![onEpa, offEpa, nOn, nOff, prior, k].every(isFiniteNumber)) return null;
  if (nOn < 0 || nOff < 0 || k <= 0) return null;
  const wOn = nOn / (nOn + k);
  const wOff = nOff / (nOff + k);
  return wOn * (onEpa - prior) - wOff * (offEpa - prior);
}

/**
 * Partial plus-minus on the EPA scale:
 * PPM_j = snaps_j * (2*PFP_j - 1) * avgEPAperEvent (paper's accounting).
 */
export function partialPlusMinus(pfp: number, snaps: number, avgEpaPerEvent: number): number | null {
  if (![pfp, snaps, avgEpaPerEvent].every(isFiniteNumber)) return null;
  if (pfp < 0 || pfp > 1 || snaps < 0) return null;
  return snaps * (2 * pfp - 1) * avgEpaPerEvent;
}

/** Aggregate event rows into per-player on/off EPA (inputs to the L1 fit). */
export function aggregateOnOff(rows: readonly unknown[]): Map<string, { onEpa: number; nOn: number; offEpa: number; nOff: number }> {
  const agg = new Map<string, { onEpa: number; nOn: number; offEpa: number; nOff: number }>();
  const players = new Set<string>();
  const valid: EventRow[] = [];
  for (const r of rows) {
    if (!isEventRow(r)) continue;
    valid.push(r);
    for (const p of r.playerIds) players.add(p);
  }
  for (const p of players) agg.set(p, { onEpa: 0, nOn: 0, offEpa: 0, nOff: 0 });
  for (const r of valid) {
    const on = new Set(r.playerIds);
    for (const p of players) {
      const e = agg.get(p)!;
      if (on.has(p)) {
        e.onEpa += r.epaPerEvent;
        e.nOn++;
      } else {
        e.offEpa += r.epaPerEvent;
        e.nOff++;
      }
    }
  }
  return agg;
}
