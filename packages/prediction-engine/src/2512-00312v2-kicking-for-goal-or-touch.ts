/**
 * arXiv:2512.00312v2 — Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union
 *
 * Expected-points decision framework for 4th downs (ported from rugby penalty decisions): delta-EP/delta-WP
 * indifference frontiers between go and kick, sensitivity grids over kicker strength/weather/team quality,
 * and regret-vs-benchmark auditing.
 *
 * Improvement: GSE ports the expected-points decision framework to 4th-down go/punt/FG and kickoff return-vs-touchback decisions: delta-EP/delta-WP indifference frontiers with sensitivity grids over kicker strength, weather, and team quality.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the delta-frontier/regret framework for the coaching-decision product only if on 2022-2025 4th downs per-team regret rankings are stable year-over-year (Spearman >=0.4 across season pairs) AND delta-WP recommendations beat nfl4th on realized-WP regret by >=0.05 per decision.
 */

/** EV of going for it: pConvert * epIfConvert + (1-pConvert) * epIfFail. */
export function goEV(pConvert: number, epIfConvert: number, epIfFail: number): number {
  if (pConvert < 0 || pConvert > 1) throw new Error("goEV: pConvert in [0,1]");
  return pConvert * epIfConvert + (1 - pConvert) * epIfFail;
}

/** EV of the kick: pMake * epMake + (1-pMake) * epMiss. */
export function kickEV(pMake: number, epMake: number, epMiss: number): number {
  if (pMake < 0 || pMake > 1) throw new Error("kickEV: pMake in [0,1]");
  return pMake * epMake + (1 - pMake) * epMiss;
}

/**
 * Indifference frontier: the conversion probability at which goEV == kickEV,
 * solved in closed form (linear in pConvert).
 */
export function indifferenceP(
  epIfConvert: number,
  epIfFail: number,
  kickEv: number,
): number {
  const denom = epIfConvert - epIfFail;
  if (Math.abs(denom) < 1e-12) throw new Error("indifferenceP: degenerate");
  return (kickEv - epIfFail) / denom;
}

/** Recommended decision given the frontier. */
export function recommend(
  pConvert: number,
  epIfConvert: number,
  epIfFail: number,
  kickEv: number,
): "go" | "kick" {
  return pConvert >= indifferenceP(epIfConvert, epIfFail, kickEv) ? "go" : "kick";
}

/**
 * Sensitivity grid: recommendation over kicker strengths x weather factors
 * x team-quality adjustments (kick make prob and conversion prob shift).
 */
export function sensitivityGrid(
  kickers: readonly number[], // pMake per kicker
  weather: readonly number[], // multiplicative penalty on pMake
  teamQ: readonly number[], // additive bump to pConvert
  base: { pConvert: number; epIfConvert: number; epIfFail: number; epMake: number; epMiss: number },
): ("go" | "kick")[][][] {
  return kickers.map((k) =>
    weather.map((wx) =>
      teamQ.map((q) => {
        const pMake = Math.min(1, Math.max(0, k * wx));
        const kev = kickEV(pMake, base.epMake, base.epMiss);
        const pConv = Math.min(1, Math.max(0, base.pConvert + q));
        return recommend(pConv, base.epIfConvert, base.epIfFail, kev);
      }),
    ),
  );
}

/** Spearman rank correlation (year-over-year stability audit). */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) throw new Error("spearman: need >= 2 pairs");
  const rank = (v: readonly number[]): number[] => {
    const order = v.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
    const r = new Array<number>(v.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]!.x === order[i]!.x) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[order[k]!.i] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const num = rx.reduce((s, x, i) => s + x * (ry[i] ?? 0), 0) - (n * (n + 1) ** 2) / 4;
  const denx = rx.reduce((s, x) => s + x * x, 0) - (n * (n + 1) ** 2) / 4;
  const deny = ry.reduce((s, y) => s + y * y, 0) - (n * (n + 1) ** 2) / 4;
  return denx <= 0 || deny <= 0 ? 0 : num / Math.sqrt(denx * deny);
}

/** Mean per-decision regret vs a benchmark's recommendations. */
export function regretVsBenchmark(
  engineWP: readonly number[],
  benchWP: readonly number[],
): number {
  if (engineWP.length !== benchWP.length || engineWP.length === 0) {
    throw new Error("regretVsBenchmark: length mismatch or empty");
  }
  return engineWP.reduce((s, w, i) => s + ((benchWP[i] ?? 0) - w), 0) / engineWP.length;
}
