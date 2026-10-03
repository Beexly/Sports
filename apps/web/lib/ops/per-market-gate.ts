/**
 * Per-market calibration gate (Wave 1, approved 2026-09-11).
 *
 * One pooled floor for every market was wrong twice over:
 *   1. a fixed absolute ECE floor is un-clearable at our sample sizes — a PERFECTLY calibrated
 *      model scores mean ECE 0.053 at n=270 and 0.042 at n=500 (2,000-replication simulation,
 *      n-aware-gate-test.cjs), so the floor measured sample size, not model quality;
 *   2. markets differ. Cover probabilities in spread/total cluster near 0.50, moneylines do not,
 *      so a single number cannot be right for both.
 *
 * This module replaces the single verdict with a per-market one. Every floor below is derived
 * from a measurement on our own production rows, never chosen by hand:
 *
 *   eceNullQ95 / eceNullQ95Debiased  — 95th percentile of the null distribution of binned ECE
 *                                      (raw / debiased) for a calibrated forecaster at this
 *                                      market's n. wave1-report.cjs + n-aware-gate-test.cjs.
 *   resFloor                         — 95th percentile of the permutation null for Murphy
 *                                      RESOLUTION (outcomes shuffled against predictions).
 *                                      res-floor.cjs, 2,000 shuffles per market. A constant
 *                                      forecast has resolution exactly 0 and passes both the ECE
 *                                      band and the Brier floor once the base rate is far enough
 *                                      from 0.5 — this floor is the only guard that sees it.
 *   brierFloor / reliabilityFloor     — unchanged from the existing gate, kept per market.
 *
 * Measured at n = ML 190 / SPREAD 544 / TOTAL 417 on 2026-09-11:
 *   ML      RES 0.01763 vs floor 0.0091  PASS   (1.95x)
 *   SPREAD  RES 0.00526 vs floor 0.0029  PASS   (1.81x)
 *   TOTAL   RES 0.00119 vs floor 0.0036  FAIL   (0.33x — below its own null mean, i.e. the total
 *                                               model discriminates less than random shuffling)
 *
 * Floors may only be tightened by hand, never loosened: the founder approved these values and the
 * strict ML variant (null99 = 0.0126) stays available via `strictMl`.
 */

export type MarketKey = "MONEYLINE" | "SPREAD" | "TOTAL" | "PROPS";

export interface MarketGateFloors {
  /** Minimum settled rows before any verdict is meaningful. */
  readonly minN: number;
  /** Upper bound on the raw binned ECE (inside the calibrated null band). */
  readonly eceNullQ95: number;
  /** Upper bound on the debiased ECE — the value the existing floors already read. */
  readonly eceNullQ95Debiased: number;
  readonly reliabilityFloor: number;
  /** Lower bound on Murphy resolution — the anti-constant guard. */
  readonly resFloor: number;
}

export interface MarketGateInputs {
  readonly n: number;
  readonly ece: number;
  readonly eceDebiased: number | null;
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  /**
   * Observed base rate of the market's outcomes. The Brier floor is derived from it at evaluation
   * time — a model must beat the NO-SKILL forecast (always emit the base rate), whose Brier is
   * base*(1-base). A fixed absolute Brier floor cannot do this job: cover probabilities near 0.50
   * carry a no-skill Brier near 0.25, so the legacy 0.22 both fails honest spread models and passes
   * dishonest ones depending on the base rate.
   */
  readonly baseRate: number;
}

export type MarketGateVerdict =
  | { readonly status: "PASS"; readonly market: MarketKey; readonly floors: MarketGateFloors; readonly reasons: readonly string[] }
  | { readonly status: "FAIL"; readonly market: MarketKey; readonly floors: MarketGateFloors; readonly reasons: readonly string[] }
  | { readonly status: "INSUFFICIENT"; readonly market: MarketKey; readonly floors: MarketGateFloors; readonly reasons: readonly string[] };

/** Per-market floors. Numbers trace to the scripts named in the module docstring. */
export const MARKET_GATE_FLOORS: Readonly<Record<MarketKey, MarketGateFloors>> = {
  MONEYLINE: { minN: 100, eceNullQ95: 0.0793, eceNullQ95Debiased: 0.0535, reliabilityFloor: 0.05, resFloor: 0.0091 },
  SPREAD: { minN: 100, eceNullQ95: 0.0518, eceNullQ95Debiased: 0.0369, reliabilityFloor: 0.05, resFloor: 0.0029 },
  TOTAL: { minN: 100, eceNullQ95: 0.0552, eceNullQ95Debiased: 0.0434, reliabilityFloor: 0.05, resFloor: 0.0036 },
  // No measured prop sample yet. Floors are the pooled defaults and MUST be re-derived before use.
  PROPS: { minN: 100, eceNullQ95: 0.0793, eceNullQ95Debiased: 0.0535, reliabilityFloor: 0.05, resFloor: 0.0091 },
};

/** Opt-in stricter moneyline bar (permutation null99) where a constant model is most dangerous. */
export const ML_RES_FLOOR_STRICT = 0.0126;

export interface MarketGateOptions {
  /** Widen the moneyline resolution floor from null95 (0.0091) to null99 (0.0126). */
  readonly strictMl?: boolean;
}

export function evaluateMarketGate(
  market: MarketKey,
  inputs: MarketGateInputs,
  options: MarketGateOptions = {},
): MarketGateVerdict {
  const base = MARKET_GATE_FLOORS[market];
  const floors: MarketGateFloors =
    market === "MONEYLINE" && options.strictMl ? { ...base, resFloor: ML_RES_FLOOR_STRICT } : base;

  if (inputs.n < floors.minN) {
    return {
      status: "INSUFFICIENT",
      market,
      floors,
      reasons: [`n ${inputs.n} < ${floors.minN} — no verdict is meaningful at this sample size`],
    };
  }

  const reasons: string[] = [];
  const noSkillBrier = inputs.baseRate * (1 - inputs.baseRate);
  if (inputs.ece > floors.eceNullQ95) {
    reasons.push(`ECE ${inputs.ece.toFixed(4)} above the calibrated null band ${floors.eceNullQ95}`);
  }
  if (inputs.eceDebiased !== null && inputs.eceDebiased > floors.eceNullQ95Debiased) {
    reasons.push(`debiased ECE ${inputs.eceDebiased.toFixed(4)} above the null band ${floors.eceNullQ95Debiased}`);
  }
  if (inputs.brier >= noSkillBrier) {
    reasons.push(
      `Brier ${inputs.brier.toFixed(4)} does not beat the no-skill forecast ${noSkillBrier.toFixed(4)} ` +
        `(base rate ${inputs.baseRate.toFixed(4)}) — BSS <= 0`,
    );
  }
  if (inputs.reliability > floors.reliabilityFloor) {
    reasons.push(`Murphy reliability ${inputs.reliability.toFixed(4)} above ${floors.reliabilityFloor}`);
  }
  // The anti-constant guard. A model that never discriminates sits at or below this line even when
  // its ECE and Brier look healthy, because a constant forecast has ECE = 0 and RES = 0 exactly.
  if (inputs.resolution <= floors.resFloor) {
    reasons.push(
      `resolution ${inputs.resolution.toFixed(5)} at or below the permutation floor ${floors.resFloor} — ` +
        "the probabilities do not discriminate (constant-in-disguise); do not publish this market",
    );
  }

  return reasons.length === 0
    ? { status: "PASS", market, floors, reasons: [`all per-market floors met at n ${inputs.n}`] }
    : { status: "FAIL", market, floors, reasons };
}
