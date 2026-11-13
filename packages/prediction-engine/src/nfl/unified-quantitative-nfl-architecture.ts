/**
 * unified-quantitative-nfl-architecture.ts
 *
 * TypeScript implementation of `Unified_Quantitative_NFL_Projection_Architecture.docx`
 * + `2026-11-09-PM` X Sweep (`nflfastR PR #618` coupled `(V, W)` net-EP & `CFBD`
 * opponent-adjusted line yards) + `2026-11-10-AM` IG Sweep (`AM-01` model routing
 * deadline & `AM-05` cached-input economics) + Hermes Oct 30 `epaDropoffTable` fix.
 *
 * Wired into `zero-orphan-expected-metrics-bridge.ts` under Zero-Orphan Engine Doctrine.
 */

export interface SixMethodDevigResult {
  readonly Multiplicative: readonly number[];
  readonly Additive: readonly number[];
  readonly Cheung_Odds_Ratio: readonly number[];
  readonly Probit: readonly number[];
  readonly Power: readonly number[];
  readonly Shin: readonly number[];
}

export interface VictoryFormationRule4Result {
  readonly initialClockSeconds: number;
  readonly defensiveTimeoutsInitial: number;
  readonly totalSecondsBurned: number;
  readonly maxBleedCapacitySeconds: number;
  readonly clockRemainingAtTurnoverSeconds: number;
  readonly clockExhaustedDeterministic: boolean;
  readonly kneelSnapLossProbPerKneel: number;
}

export interface NflfastrPr618NetEpResult {
  readonly vKickoffEp: number;
  readonly wSafetyFreeKickEp: number;
  readonly tdNetScoreValue: number;
  readonly fgNetScoreValue: number;
  readonly safetyNetScoreValue: number;
  readonly legacyStateEp: number;
  readonly pr618StateEp: number;
  readonly epDeltaPr618MinusLegacy: number;
}

export interface CircadianPerformanceResult {
  readonly biologicalHour24: number;
  readonly harmonicPhase: number;
  readonly residualJetLagZones: number;
  readonly cpi: number;
}

export interface UnifiedArchitectureOverlayReceipt {
  readonly devig2WayUnderdogShin: number;
  readonly devig2WayUnderdogPower: number;
  readonly pr618NetEp: NflfastrPr618NetEpResult;
  readonly cfbdCarryLineYardsSample: number;
  readonly circadianIndex: CircadianPerformanceResult;
  readonly victoryFormation201TrapRemainingS: number;
  readonly victoryFormation200ClockExhausted: boolean;
  readonly studentT4UpperTailDependenceRho055: number;
  readonly injuryBucketMappingVerified: boolean;
  readonly combinedArchitectureLogOddsDelta: number;
}

/**
 * Standard normal CDF via Abramowitz-Stegun 7.1.26 (`|err| < 1.5e-7`).
 */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erfApprox = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return 0.5 * (1 + sign * erfApprox);
}

/**
 * Acklam rational normal quantile `Phi^{-1}(p)` accurate to `< 1.15e-9`.
 */
export function normalPpf(p: number): number {
  const pc = Math.max(1e-15, Math.min(1 - 1e-15, p));
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239,
  ] as const;
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572,
  ] as const;
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ] as const;
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416,
  ] as const;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (pc < pLow) {
    const q = Math.sqrt(-2 * Math.log(pc));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (pc <= pHigh) {
    const q = pc - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - pc));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

export function americanToRawImpliedProb(americanOdds: number): number {
  if (americanOdds < 0) {
    const a = Math.abs(americanOdds);
    return a / (a + 100);
  }
  return 100 / (americanOdds + 100);
}

/**
 * Six-Method Devigging Engine (`Multiplicative`, `Additive`, `Cheung_Odds_Ratio`, `Probit`, `Power`, `Shin`).
 */
export function devigAllSixMethods(rawImpliedProbs: readonly number[]): SixMethodDevigResult {
  const q = rawImpliedProbs.map((v) => Math.max(1e-12, Math.min(1 - 1e-12, v)));
  const n = q.length;
  const s = q.reduce((acc, v) => acc + v, 0);

  const mult = q.map((v) => v / s);
  const rawAdd = q.map((v) => Math.max(1e-6, v - (s - 1) / n));
  const sumAdd = rawAdd.reduce((a, b) => a + b, 0);
  const add = rawAdd.map((v) => v / sumAdd);

  // Cheung Odds-Ratio: sum(q_i / (c + (1 - c)*q_i)) = 1
  let loC = 0.05;
  let hiC = 50.0;
  for (let it = 0; it < 90; it++) {
    const mid = 0.5 * (loC + hiC);
    const val = q.reduce((acc, qi) => acc + qi / (mid + (1 - mid) * qi), 0);
    if (val > 1) loC = mid;
    else hiC = mid;
  }
  const cStar = 0.5 * (loC + hiC);
  const orProbs = q.map((qi) => qi / (cStar + (1 - cStar) * qi));

  // Probit: sum(Phi(Phi^{-1}(q_i) - delta)) = 1
  const zScores = q.map((qi) => normalPpf(qi));
  let loD = -4.0;
  let hiD = 4.0;
  for (let it = 0; it < 90; it++) {
    const mid = 0.5 * (loD + hiD);
    const val = zScores.reduce((acc, zi) => acc + normalCdf(zi - mid), 0);
    if (val > 1) loD = mid;
    else hiD = mid;
  }
  const dStar = 0.5 * (loD + hiD);
  const probit = zScores.map((zi) => normalCdf(zi - dStar));

  // Power: sum(q_i^k) = 1
  let loK = 0.05;
  let hiK = 25.0;
  for (let it = 0; it < 90; it++) {
    const mid = 0.5 * (loK + hiK);
    const val = q.reduce((acc, qi) => acc + Math.pow(qi, mid), 0);
    if (val > 1) loK = mid;
    else hiK = mid;
  }
  const kStar = 0.5 * (loK + hiK);
  const power = q.map((qi) => Math.pow(qi, kStar));

  // Shin (1993) with numerically stable conjugate form for deep longshots
  const shinEval = (zVal: number): number[] =>
    q.map((qi) => {
      const aTerm = qi * qi / s;
      const disc = Math.sqrt(Math.max(0, zVal * zVal + 4 * (1 - zVal) * aTerm));
      return (2 * aTerm) / (disc + zVal);
    });

  let shin: number[];
  if (n === 2 || s <= 1) {
    shin = [...add];
  } else {
    let loZ = 0.0;
    let hiZ = Math.min(0.999999, (s - 1) / (n - 1) + 0.25);
    for (let it = 0; it < 100; it++) {
      const mid = 0.5 * (loZ + hiZ);
      const val = shinEval(mid).reduce((a, b) => a + b, 0);
      if (val > 1) loZ = mid;
      else hiZ = mid;
    }
    const rawShin = shinEval(0.5 * (loZ + hiZ));
    const sumShin = rawShin.reduce((a, b) => a + b, 0);
    shin = rawShin.map((v) => v / sumShin);
  }

  return {
    Multiplicative: mult,
    Additive: add,
    Cheung_Odds_Ratio: orProbs,
    Probit: probit,
    Power: power,
    Shin: shin,
  };
}

/**
 * Exact NFL Rule 4 Victory Formation Clock-Bleed Automaton (`2:01.0` trap vs `2:00.0` kill).
 */
export function simulateVictoryFormationRule4(
  clockSecondsRemaining: number,
  defensiveTimeouts: number,
  startingDown = 1,
  tauKneelS = 1.6,
  playClockS = 40.0,
): VictoryFormationRule4Result {
  let t = Math.max(0, clockSecondsRemaining);
  const t0 = t;
  let tosLeft = Math.max(0, Math.min(3, Math.trunc(defensiveTimeouts)));
  let twoMinCrossed = t <= 120.0;

  for (let down = startingDown; down <= 4; down++) {
    if (t <= 0) break;
    const preSnapT = t;
    const tAfterKneel = Math.max(0, t - tauKneelS);
    const crossedOnPlay = !twoMinCrossed && preSnapT > 120.0 && tAfterKneel <= 120.0;
    if (crossedOnPlay) twoMinCrossed = true;

    let runoff = 0;
    if (down < 4 && tAfterKneel > 0) {
      if (crossedOnPlay) {
        runoff = 0;
      } else if (tosLeft > 0) {
        tosLeft -= 1;
        runoff = 0;
      } else if (!twoMinCrossed && tAfterKneel > 120.0 && tAfterKneel - playClockS <= 120.0) {
        runoff = tAfterKneel - 120.0;
        twoMinCrossed = true;
      } else {
        runoff = Math.min(tAfterKneel, playClockS);
      }
    }
    t = Math.max(0, tAfterKneel - runoff);
  }

  const maxCap = Math.max(0, 4 * tauKneelS + Math.max(0, 3 - defensiveTimeouts) * playClockS);
  return {
    initialClockSeconds: Number(t0.toFixed(1)),
    defensiveTimeoutsInitial: defensiveTimeouts,
    totalSecondsBurned: Number((t0 - t).toFixed(1)),
    maxBleedCapacitySeconds: Number(maxCap.toFixed(1)),
    clockRemainingAtTurnoverSeconds: Number(t.toFixed(1)),
    clockExhaustedDeterministic: t <= 0,
    kneelSnapLossProbPerKneel: 0.000085,
  };
}

/**
 * Exact `nflverse/nflfastR` PR #618 (`guga31bb`, Nov 5, 2026) Coupled `(V, W)` Net-EP Solver.
 */
export function solveNflfastrPr618NetEp(
  kickoffProbs: {
    readonly td: number;
    readonly oppTd: number;
    readonly fg: number;
    readonly oppFg: number;
    readonly safety: number;
    readonly oppSafety: number;
  },
  season = 2026,
  halfSecondsRemaining = 900,
): NflfastrPr618NetEpResult {
  const xp = season <= 2014 ? 0.99 : season <= 2022 ? 0.94 : 0.96;
  const koYd100 = season < 2016 ? 80 : season < 2024 ? 75 : season === 2024 ? 70 : 69;
  const fkYd100 = 61;
  const fkSlope = 0.05;

  let vVal = 0;
  let wVal = 0;
  if (halfSecondsRemaining > 0) {
    const tdK = kickoffProbs.td - kickoffProbs.oppTd;
    const fgK = kickoffProbs.fg - kickoffProbs.oppFg;
    const sfK = kickoffProbs.safety - kickoffProbs.oppSafety;
    const aK = tdK * (6 + xp) + 3 * fgK + 2 * sfK;
    const bK = -(tdK + fgK);
    const dK = sfK;
    const deltaW = fkSlope * (koYd100 - fkYd100);
    const denom = 1 - bK - dK;
    vVal = Math.abs(denom) > 1e-12 ? (aK + dK * deltaW) / denom : aK;
    wVal = vVal + deltaW;
  }

  const tdNet = 6 + xp - vVal;
  const fgNet = 3 - vVal;
  const safNet = 2 + wVal;

  const legacyEp =
    7 * (kickoffProbs.td - kickoffProbs.oppTd) +
    3 * (kickoffProbs.fg - kickoffProbs.oppFg) +
    2 * (kickoffProbs.safety - kickoffProbs.oppSafety);
  const pr618Ep =
    tdNet * (kickoffProbs.td - kickoffProbs.oppTd) +
    fgNet * (kickoffProbs.fg - kickoffProbs.oppFg) +
    safNet * (kickoffProbs.safety - kickoffProbs.oppSafety);

  return {
    vKickoffEp: Number(vVal.toFixed(4)),
    wSafetyFreeKickEp: Number(wVal.toFixed(4)),
    tdNetScoreValue: Number(tdNet.toFixed(4)),
    fgNetScoreValue: Number(fgNet.toFixed(4)),
    safetyNetScoreValue: Number(safNet.toFixed(4)),
    legacyStateEp: Number(legacyEp.toFixed(4)),
    pr618StateEp: Number(pr618Ep.toFixed(4)),
    epDeltaPr618MinusLegacy: Number((pr618Ep - legacyEp).toFixed(4)),
  };
}

/**
 * Canonical CFBD Piecewise Line Yards (`120%` losses, `100%` `0-4`, `50%` `5-10`, `0%` `>10`).
 */
export function cfbdPiecewiseLineYards(yardsGained: number): number {
  if (yardsGained < 0) return 1.2 * yardsGained;
  if (yardsGained <= 4) return yardsGained;
  if (yardsGained <= 10) return 4 + 0.5 * (yardsGained - 4);
  return 7.0;
}

/**
 * Fixes the Oct 30 Hermes `epaDropoffTable` role-key mismatch (`LT` -> `OL`, `WR1` -> `SKILL`, `CB1`/`EDGE1` -> `DEF`).
 */
export function mapInjuryDesignationToDropoffBucket(roleKey: string): "QB1" | "QB_QUESTIONABLE" | "OL" | "SKILL" | "DEF" {
  const rk = roleKey.trim().toUpperCase();
  if (rk === "QB1" || rk === "QB") return "QB1";
  if (rk === "QB_QUESTIONABLE" || rk === "QB_Q") return "QB_QUESTIONABLE";
  if (rk === "OL" || rk === "LT" || rk === "LG" || rk === "C" || rk === "RG" || rk === "RT") return "OL";
  if (rk.startsWith("WR") || rk.startsWith("TE") || rk.startsWith("RB") || rk === "SKILL") return "SKILL";
  if (
    rk.startsWith("CB") ||
    rk.startsWith("EDGE") ||
    rk.startsWith("DE") ||
    rk.startsWith("DT") ||
    rk.startsWith("IDL") ||
    rk.startsWith("NT") ||
    rk.startsWith("LB") ||
    rk.startsWith("ILB") ||
    rk.startsWith("OLB") ||
    rk.startsWith("S") ||
    rk.startsWith("FS") ||
    rk.startsWith("SS") ||
    rk === "DEF"
  ) {
    return "DEF";
  }
  return "SKILL";
}

/**
 * Circadian Performance Index `CPI_k(t_kick)` (`phi_peak = 17.5` body-clock hours).
 */
export function computeCircadianPerformanceIndex(params: {
  readonly kickoffUtcHour: number;
  readonly teamBodyClockUtcOffset: number;
  readonly timezoneZonesCrossed?: number;
  readonly daysSinceArrival?: number;
  readonly travelDirection?: "EAST" | "WEST" | "NONE";
  readonly psiJet?: number;
}): CircadianPerformanceResult {
  const rawBio = (params.kickoffUtcHour + params.teamBodyClockUtcOffset) % 24;
  const tBio = rawBio < 0 ? rawBio + 24 : rawBio;
  const harmonic = Math.cos((2 * Math.PI * (tBio - 17.5)) / 24);
  const rDir = params.travelDirection === "EAST" ? 1.0 : 1.5;
  const zones = Math.abs(params.timezoneZonesCrossed ?? 0);
  const days = params.daysSinceArrival ?? 3;
  const residual = Math.max(0, zones - days * rDir);
  const cpi = harmonic - (params.psiJet ?? 0.045) * residual;
  return {
    biologicalHour24: Number(tBio.toFixed(2)),
    harmonicPhase: Number(harmonic.toFixed(4)),
    residualJetLagZones: Number(residual.toFixed(2)),
    cpi: Number(cpi.toFixed(4)),
  };
}

/**
 * Student-`t_nu` upper-tail dependence coefficient `lambda_U` for SGP multi-leg copula (`nu = 4` -> `df = 5` -> `0.2822` at `rho = 0.55`).
 */
export function studentTUpperTailDependence(rho: number, nu = 4): number {
  const x = Math.sqrt(((nu + 1) * (1 - rho)) / Math.max(1e-12, 1 + rho));
  if (nu === 4) {
    // Exact closed-form survival of Student-t with df = nu + 1 = 5:
    // F_5(-x) = 1/2 - (1/pi) * (arctan(x/sqrt(5)) + (x*sqrt(5))/(5 + x^2) + (2*x*sqrt(5)*5)/(3*(5 + x^2)^2))
    const s5 = Math.sqrt(5);
    const d = 5 + x * x;
    const f5Neg =
      0.5 -
      (1 / Math.PI) *
        (Math.atan(x / s5) + (x * s5) / d + (10 * x * s5) / (3 * d * d));
    return Number((2 * f5Neg).toFixed(4));
  }
  return Number((2 * normalCdf(-x)).toFixed(4));
}

/**
 * Consolidated Unified Architecture overlay evaluated inside `zero-orphan-expected-metrics-bridge.ts`.
 */
export function evaluateUnifiedQuantitativeArchitectureOverlay(input: {
  readonly favoriteAmericanOdds?: number;
  readonly underdogAmericanOdds?: number;
  readonly kickoffUtcHour?: number;
  readonly teamBodyClockUtcOffset?: number;
  readonly timezoneZonesCrossed?: number;
  readonly sampleRushYards?: number;
}): UnifiedArchitectureOverlayReceipt {
  const fav = americanToRawImpliedProb(input.favoriteAmericanOdds ?? -450);
  const dog = americanToRawImpliedProb(input.underdogAmericanOdds ?? 340);
  const devig = devigAllSixMethods([fav, dog]);
  const pr618 = solveNflfastrPr618NetEp({
    td: 0.375,
    oppTd: 0.195,
    fg: 0.235,
    oppFg: 0.135,
    safety: 0.004,
    oppSafety: 0.003,
  });
  const circadian = computeCircadianPerformanceIndex({
    kickoffUtcHour: input.kickoffUtcHour ?? 18.0,
    teamBodyClockUtcOffset: input.teamBodyClockUtcOffset ?? -5.0,
    timezoneZonesCrossed: input.timezoneZonesCrossed ?? 0,
    daysSinceArrival: 3,
    travelDirection: (input.timezoneZonesCrossed ?? 0) > 0 ? "EAST" : "NONE",
  });
  const vf201 = simulateVictoryFormationRule4(121.0, 0);
  const vf200 = simulateVictoryFormationRule4(120.0, 0);
  const tailDep = studentTUpperTailDependence(0.55, 4);
  const bucketsOk =
    mapInjuryDesignationToDropoffBucket("LT") === "OL" &&
    mapInjuryDesignationToDropoffBucket("WR1") === "SKILL" &&
    mapInjuryDesignationToDropoffBucket("CB1") === "DEF" &&
    mapInjuryDesignationToDropoffBucket("EDGE1") === "DEF";

  const logOddsDelta = Number(
    Math.max(-0.04, Math.min(0.04, 0.015 * circadian.cpi + 0.01 * (pr618.pr618StateEp - 1.15))).toFixed(4),
  );

  return {
    devig2WayUnderdogShin: Number((devig.Shin[1] ?? Number.NaN).toFixed(4)),
    devig2WayUnderdogPower: Number((devig.Power[1] ?? Number.NaN).toFixed(4)),
    pr618NetEp: pr618,
    cfbdCarryLineYardsSample: Number(cfbdPiecewiseLineYards(input.sampleRushYards ?? 6).toFixed(3)),
    circadianIndex: circadian,
    victoryFormation201TrapRemainingS: vf201.clockRemainingAtTurnoverSeconds,
    victoryFormation200ClockExhausted: vf200.clockExhaustedDeterministic,
    studentT4UpperTailDependenceRho055: tailDep,
    injuryBucketMappingVerified: bucketsOk,
    combinedArchitectureLogOddsDelta: logOddsDelta,
  };
}
