/**
 * Props slate â€” GSE 4-Beat live path.
 *
 * Wires gse-four-beat (shinDevig, gateProp, buildPassList, kellyStake,
 * monteCarloProp, buildBoard, autopsySettled) into a callable slate the
 * cron/board can run. Fail-closed on missing inputs. No invented odds.
 */

import {
  gseShinDevig,
  gateProp,
  buildPassList,
  kellyStake,
  monteCarloProp,
  buildBoard,
  autopsySettled,
  kalmanUpdate,
  GATE_THRESHOLDS,
  type BookOdds,
  type PlayerProp,
  type GateResult,
  type PassListEntry,
  type BoardEntry,
  type AutopsyRecord,
  type KalmanState,
} from "@sports/prediction-engine";

export interface PropsSlateResult {
  readonly ok: boolean;
  readonly propsConsidered: number;
  readonly passed: number;
  readonly board: readonly BoardEntry[];
  readonly passList: readonly PassListEntry[];
  readonly gateResults: readonly GateResult[];
  readonly errors: readonly string[];
  readonly note: string;
}

export interface PropsSlateInput {
  readonly props: readonly PlayerProp[];
  /** Model P(over) per prop, keyed by `${playerId}:${propType}`. */
  readonly modelProbOver: Readonly<Record<string, number>>;
  readonly lineFreshnessMinutes: number;
  readonly bankroll: number;
  readonly projectedMean: number;
  readonly projectedStdDev: number;
}

/**
 * Run the GSE 4-Beat props pipeline over a prop slate.
 *
 * Beat 1: shin-devig the book odds (no invented prices).
 * Beat 2: gate each prop (EV, sample, calibration, line integrity).
 * Beat 3: build the pass list.
 * Beat 4: build the board + Monte Carlo sanity.
 */
export function runPropsSlate(input: PropsSlateInput): PropsSlateResult {
  const errors: string[] = [];
  const props = input.props;
  if (!Array.isArray(props) || props.length === 0) {
    return {
      ok: false,
      propsConsidered: 0,
      passed: 0,
      board: [],
      passList: [],
      gateResults: [],
      errors: ["props slate is empty"],
      note: "no props â€” nothing minted (fail-closed)",
    };
  }

  const gateResults: GateResult[] = [];
  for (const prop of props) {
    const key = `${prop.playerId}:${prop.propType}`;
    const modelProbOver = input.modelProbOver[key];
    if (modelProbOver == null || !Number.isFinite(modelProbOver)) {
      errors.push(`${key}: missing modelProbOver â€” not imputed`);
      continue;
    }
    try {
      const g = gateProp(prop, modelProbOver, input.lineFreshnessMinutes);
      gateResults.push(g);
    } catch (err) {
      errors.push(
        `${key}: gateProp threw â€” ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  let passList: readonly PassListEntry[] = [];
  try {
    passList = buildPassList(gateResults, props);
  } catch (err) {
    errors.push(`buildPassList threw â€” ${err instanceof Error ? err.message : String(err)}`);
    passList = [];
  }

  let board: readonly BoardEntry[] = [];
  try {
    // buildBoard uses the first gated prop's model prob / projection as the
    // slate-level projection. Fail-closed when no gate results exist.
    const firstProb = gateResults.length > 0 ? input.modelProbOver[gateResults[0]!.propId] : null;
    if (firstProb != null) {
      board = buildBoard(
        gateResults,
        props,
        input.bankroll,
        firstProb,
        input.projectedMean,
        input.projectedStdDev,
      );
    }
  } catch (err) {
    errors.push(`buildBoard threw â€” ${err instanceof Error ? err.message : String(err)}`);
    board = [];
  }

  return {
    ok: errors.length === 0,
    propsConsidered: props.length,
    passed: passList.length,
    board,
    passList,
    gateResults,
    errors,
    note:
      errors.length === 0
        ? `4-beat complete: ${passList.length}/${props.length} props passed gates`
        : `4-beat finished with ${errors.length} error(s); fail-closed on those rows`,
  };
}

/**
 * Devig a two-way prop book using the GSE shin method.
 * Fail-closed when either side is missing â€” never invents a price.
 */
export function devigPropBook(
  overOdds: number | null,
  underOdds: number | null,
): ReturnType<typeof gseShinDevig> | null {
  if (
    overOdds == null ||
    underOdds == null ||
    !Number.isFinite(overOdds) ||
    !Number.isFinite(underOdds) ||
    overOdds <= 1 ||
    underOdds <= 1
  ) {
    return null;
  }
  return gseShinDevig(overOdds, underOdds);
}

/**
 * Kelly stake for a passed prop. Returns null when edge is absent or
 * inputs are invalid â€” never invents a stake.
 */
export function propKellyStake(
  modelProb: number | null,
  impliedProb: number | null,
  bankroll: number,
  fraction = 0.25,
): { stakePct: number; stakeDollars: number } | null {
  if (
    modelProb == null ||
    impliedProb == null ||
    !Number.isFinite(modelProb) ||
    !Number.isFinite(impliedProb) ||
    modelProb <= 0 ||
    modelProb >= 1 ||
    impliedProb <= 0 ||
    impliedProb >= 1 ||
    !Number.isFinite(bankroll) ||
    bankroll <= 0
  ) {
    return null;
  }
  try {
    return kellyStake(modelProb, impliedProb, bankroll, fraction);
  } catch {
    return null;
  }
}

/**
 * Monte Carlo a prop distribution. Returns null on invalid inputs.
 */
export function propMonteCarlo(
  projectedMean: number,
  projectedStdDev: number,
  line: number,
  isOver: boolean,
  simulations = 10000,
): ReturnType<typeof monteCarloProp> | null {
  if (
    !Number.isFinite(projectedMean) ||
    !Number.isFinite(projectedStdDev) ||
    projectedStdDev <= 0 ||
    !Number.isFinite(line) ||
    !Number.isFinite(simulations) ||
    simulations <= 0
  ) {
    return null;
  }
  try {
    return monteCarloProp(projectedMean, projectedStdDev, line, isOver, simulations);
  } catch {
    return null;
  }
}

export {
  gseShinDevig,
  gateProp,
  buildPassList,
  kellyStake,
  monteCarloProp,
  buildBoard,
  autopsySettled,
  kalmanUpdate,
  GATE_THRESHOLDS,
};
export type {
  BookOdds,
  PlayerProp,
  GateResult,
  PassListEntry,
  BoardEntry,
  AutopsyRecord,
  KalmanState,
};
