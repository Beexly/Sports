/**
 * H-F5 / F-10 MVE — frozen side-adaptive asymmetric fractional e-process.
 *
 * Pre-registered in docs/ops/edge/2026-08-20-mve-prereg-v2.md BEFORE any
 * computation. This module is the formula, nothing else: no I/O, no other
 * lambda, no other window, no over-side-only variant.
 *
 *   E_t = 1 + 0.3 · (W_t · (q_bet / m_bet) + (1 − W_t) · (1 − q_bet) − 1)
 *
 * Side-selection (frozen): q_t > m_t → OVER; q_t <= m_t → UNDER (ties UNDER).
 * Capital is the product of increments, starting at 1.
 */

export const MVE_LAMBDA = 0.3;
export const MVE_SEED = 20260820;
export const MVE_N_PARTICLES = 24;
export const MVE_CERT_THRESHOLD = 20;
export const MVE_KILL_THRESHOLD = 0.1;
export const MVE_EARLY_ABORT = 0.01;
export const MVE_CHECKPOINT_EVERY = 50;
export const MVE_FLOOR = 1e-6;

export type BetSide = "OVER" | "UNDER";

export function selectBetSide(qOver: number, mOver: number): BetSide {
  return qOver > mOver ? "OVER" : "UNDER";
}

export function betSideProbs(
  qOver: number,
  mOver: number,
  side: BetSide,
): { readonly qBet: number; readonly mBet: number } {
  if (side === "OVER") return { qBet: qOver, mBet: mOver };
  return { qBet: 1 - qOver, mBet: 1 - mOver };
}

function clampProb(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - MVE_FLOOR, Math.max(MVE_FLOOR, p));
}

/**
 * One increment. Spec: every increment is >= 0.7. Miss term is (1 − q_bet),
 * not (1 − q_bet)/(1 − m_bet) — that is the composite-null form.
 */
export function sideAdaptiveIncrement(input: {
  readonly qBet: number;
  readonly mBet: number;
  readonly hit: boolean;
  readonly lambda?: number;
}): number {
  const lambda = input.lambda ?? MVE_LAMBDA;
  const q = clampProb(input.qBet);
  const m = clampProb(input.mBet);
  const w = input.hit ? 1 : 0;
  const inner = w * (q / m) + (1 - w) * (1 - q) - 1;
  const next = 1 + lambda * inner;
  if (!Number.isFinite(next) || next <= 0) return 1 - lambda;
  return next;
}

export interface MveStep {
  readonly n: number;
  readonly increment: number;
  readonly capital: number;
  readonly side: BetSide;
  readonly hit: boolean;
}

export interface MvePath {
  readonly steps: readonly MveStep[];
  readonly finalCapital: number;
  readonly maxCapital: number;
  readonly maxDrawdown: number;
  readonly crossings: { readonly 2: boolean; readonly 5: boolean; readonly 10: boolean; readonly 20: boolean };
  readonly checkpoints: readonly { readonly n: number; readonly capital: number }[];
  readonly killedAt: number | null;
  readonly certifiedAt: number | null;
  readonly earlyAbort: boolean;
}

export function emptyPath(): MvePath {
  return {
    steps: [],
    finalCapital: 1,
    maxCapital: 1,
    maxDrawdown: 0,
    crossings: { 2: false, 5: false, 10: false, 20: false },
    checkpoints: [],
    killedAt: null,
    certifiedAt: null,
    earlyAbort: false,
  };
}

export function runSideAdaptivePath(
  observations: readonly {
    readonly qOver: number;
    readonly mOver: number;
    readonly y: number;
    readonly line: number;
  }[],
): MvePath {
  let capital = 1;
  let maxCapital = 1;
  let maxDrawdown = 0;
  const steps: MveStep[] = [];
  const checkpoints: { n: number; capital: number }[] = [];
  const crossings = { 2: false, 5: false, 10: false, 20: false };
  let killedAt: number | null = null;
  let certifiedAt: number | null = null;
  let earlyAbort = false;

  for (const obs of observations) {
    if (!(obs.y > obs.line) && !(obs.y < obs.line)) continue; // push — not graded
    const side = selectBetSide(obs.qOver, obs.mOver);
    const { qBet, mBet } = betSideProbs(obs.qOver, obs.mOver, side);
    const hit = side === "OVER" ? obs.y > obs.line : obs.y < obs.line;
    const increment = sideAdaptiveIncrement({ qBet, mBet, hit });
    capital *= increment;
    if (!Number.isFinite(capital) || capital <= 0) capital = MVE_FLOOR;
    if (capital > maxCapital) maxCapital = capital;
    const dd = maxCapital > 0 ? (maxCapital - capital) / maxCapital : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (capital >= 2) crossings[2] = true;
    if (capital >= 5) crossings[5] = true;
    if (capital >= 10) crossings[10] = true;
    if (capital >= 20) crossings[20] = true;
    const n = steps.length + 1;
    steps.push({ n, increment, capital, side, hit });
    if (n % MVE_CHECKPOINT_EVERY === 0) {
      checkpoints.push({ n, capital });
      if (killedAt == null && capital <= MVE_KILL_THRESHOLD) killedAt = n;
      if (certifiedAt == null && capital >= MVE_CERT_THRESHOLD) certifiedAt = n;
      if (n === MVE_CHECKPOINT_EVERY && capital < MVE_EARLY_ABORT) earlyAbort = true;
    }
  }

  return {
    steps,
    finalCapital: capital,
    maxCapital,
    maxDrawdown,
    crossings,
    checkpoints,
    killedAt,
    certifiedAt,
    earlyAbort,
  };
}

export type MveBindingOutcome =
  | "KILL"
  | "CERTIFY_DRAFT"
  | "DID_NOT_CERTIFY_DID_NOT_SURVIVE";

export function bindingOutcome(path: MvePath): MveBindingOutcome {
  if (path.earlyAbort || path.killedAt != null || path.finalCapital <= 2) return "KILL";
  if (path.certifiedAt != null) return "CERTIFY_DRAFT";
  return "DID_NOT_CERTIFY_DID_NOT_SURVIVE";
}
