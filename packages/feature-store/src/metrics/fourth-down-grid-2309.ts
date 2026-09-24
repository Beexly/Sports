/**
 * 4th-down coach-risk state grid with empirical transitions (gse_coach_risk port)
 *
 * Research port: arXiv:2309.00756
 * Normalized lane: causal_injury | Doctrine: SITUATIONAL
 *
 * Constructs the 4th-down state grid (yardline bin x yards-to-go) from nflverse play-by-play, augments GO transitions with 3rd-down plays, and solves the state value function by value iteration. Pure math; data enters only through the empirical transition estimator.
 *
 * ACCEPTANCE GATE: Acceptance requires the full pre-registered NFL study (tau-hat with bootstrapped uncertainty, coach-level heterogeneity, significant performance asymmetry). Live-data gate -> GSE_COACH_RISK_ENABLED flag (default false).
 */

export type FourthDownAction = "GO" | "PUNT" | "FG";

export interface GridPlay {
  yardline: number; // 0..100
  yardsToGo: number;
  down: 3 | 4;
  isGo: boolean; // 4th down: attempted conversion; 3rd down: any play (augmentation pool)
  nextYardline: number | null; // null = terminal (score/turnover/punt outcome encoded separately)
  reward: number; // expected points delta of the play outcome
}

export interface GridState {
  yardlineBin: number;
  yardsToGo: number;
}

export interface EmpiricalTransition {
  from: GridState;
  action: FourthDownAction;
  /** successor distribution: key "bin:toGo" -> probability */
  successors: Record<string, number>;
  expectedReward: number;
}

export function binYardline(yardline: number, binWidth = 5): number {
  const b = Math.floor(yardline / binWidth);
  return Math.max(0, Math.min(Math.floor(100 / binWidth) - 1, b));
}

const key = (s: GridState): string => `${s.yardlineBin}:${s.yardsToGo}`;

/** Estimate p-hat(s' | s, a): GO rows use 4th-down goes + 3rd-down plays as augmentation. */
export function buildEmpiricalTransitions(plays: GridPlay[], binWidth = 5): EmpiricalTransition[] {
  const counts = new Map<string, { n: number; succ: Map<string, number>; r: number }>();
  for (const p of plays) {
    const s: GridState = { yardlineBin: binYardline(p.yardline, binWidth), yardsToGo: p.yardsToGo };
    const action: FourthDownAction = p.down === 4 ? (p.isGo ? "GO" : p.yardsToGo <= 4 && p.yardline > 65 ? "FG" : "PUNT") : "GO";
    if (p.down === 4 && !p.isGo) continue; // only GO / augmented 3rd-down rows feed GO; kick rows skipped
    const k = `${key(s)}|${action}`;
    let slot = counts.get(k);
    if (!slot) { slot = { n: 0, succ: new Map(), r: 0 }; counts.set(k, slot); }
    slot.n += 1;
    slot.r += p.reward;
    if (p.nextYardline !== null) {
      const sk = key({ yardlineBin: binYardline(p.nextYardline, binWidth), yardsToGo: Math.max(1, p.yardsToGo) });
      slot.succ.set(sk, (slot.succ.get(sk) ?? 0) + 1);
    }
  }
  const out: EmpiricalTransition[] = [];
  for (const [k, v] of counts) {
    const [sk, action] = k.split("|");
    if (sk === undefined) continue;
    const [yardlineBin, yardsToGo] = sk.split(":").map(Number);
    if (yardlineBin === undefined || yardsToGo === undefined) continue;
    const successors: Record<string, number> = {};
    for (const [s2, c] of v.succ) successors[s2] = c / v.n;
    out.push({ from: { yardlineBin, yardsToGo }, action: action as FourthDownAction, successors, expectedReward: v.r / v.n });
  }
  return out;
}

/** Value iteration on the empirical grid: V(s) = max_a [ r(s,a) + gamma * sum p(s'|s,a) V(s') ]. */
export function valueIteration(
  transitions: EmpiricalTransition[],
  gamma = 0.99,
  tol = 1e-6,
  maxIter = 10000,
): Record<string, number> {
  const V: Record<string, number> = {};
  const byState = new Map<string, EmpiricalTransition[]>();
  for (const t of transitions) {
    const k = key(t.from);
    const list = byState.get(k);
    if (list) list.push(t);
    else byState.set(k, [t]);
  }
  for (let iter = 0; iter < maxIter; iter++) {
    let delta = 0;
    for (const [k, ts] of byState) {
      let best = -Infinity;
      for (const t of ts) {
        let q = t.expectedReward;
        for (const [s2, p] of Object.entries(t.successors)) q += gamma * p * (V[s2] ?? 0);
        if (q > best) best = q;
      }
      const prev = V[k] ?? 0;
      V[k] = best === -Infinity ? 0 : best;
      delta = Math.max(delta, Math.abs(V[k] - prev));
    }
    if (delta < tol) break;
  }
  return V;
}

/** Live-study gate: full pre-registered NFL analysis must clear before use in production. */
export const GSE_COACH_RISK_ENABLED = false;

