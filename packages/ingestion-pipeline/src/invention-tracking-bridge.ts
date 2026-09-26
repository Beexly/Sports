/**
 * Invention + tracking bridge — this layer decides how much invention budget
 * tonight earns (MCTS vs round-robin), whether a candidate metric family is
 * signal or chance, and how much expected drive value a tracked play carried
 * before anything is acted on.
 *
 * Wires the pure computation families that are NOT yet in the engine barrel
 * (they are imported by deep path, never through the shared index):
 *   - AI Feynman separability front end (1905.11481v2): Delta_sep additive /
 *     multiplicative probes, pace normalization, group recombination, and the
 *     >=5% RMSE / <=20% node improvement gate.
 *   - Dual-margin Thompson-sampling contextual bandit (2409.00629v2):
 *     regret-minimizing arm assignment, revenue-per-visitor vs conversion-rate
 *     guardrail, and the offline-vs-live CATE replication check.
 *   - SELA hierarchical MCTS (2410.17238v1): UCB1 selection, progressive
 *     widening, round-robin baseline at equal budget, Spearman value-vs-truth,
 *     and the >=1.5x discovery / >=30% waste-drop acceptance gate.
 *   - DS-Agent case bank (2402.17453v5): embedding retrieval, ReviseRank
 *     demotion, counter-case retrieval, Stage-2 retain gate, best production
 *     case.
 *   - Meta-analytics QA (1609.09830v1): discrimination D, stability S,
 *     Gaussian-copula independence I, empirical-Bayes shrinkage, reliability
 *     report.
 *   - Expected Drive Value (2406.00814v1): time-decayed scoring-play
 *     aggregation, actor attribution, possession-risk adjustment.
 *   - Cluster-bootstrap EPV error scaling: se -> error-scaled threshold -> act.
 *
 * Fail-closed on missing or invalid input. It never invents a frontier, a
 * Delta_sep, a posterior, a bound, a leaf, a case, a score, a value or a
 * standard error, and it never substitutes a default RNG: `Math.random`
 * defaults in the underlying modules (and any unreproducible generator the
 * caller passes) would make a published number unfalsifiable, so every
 * RNG-driven computation takes an explicit caller-supplied generator here.
 */

import {
  deltaSepAdditive,
  deltaSepMultiplicative,
  normalizeByPace,
  passesImprovementGate,
  probeSeparability,
  recombine,
  type FeatureGroup,
  type RecombinedEquation,
  type Sample,
  type SeparabilityResult,
} from "@sports/prediction-engine/src/invention/1905-11481v2-ai-feynman-separability.js";
import {
  NUM_ARMS,
  assignArm,
  computeDualMargin,
  passesDualMarginGate,
  cateReplicatesLive,
  initialArmState,
  recordOutcome,
  type BanditArmState,
  type DualMarginResult,
  type ExperimentSpec,
} from "@sports/prediction-engine/src/invention/2409-00629v2-dualmargin-bandit-experiment.js";
import {
  meanValue,
  passesSelaGate,
  runMCTSSearch,
  runRoundRobin,
  ucbScore,
  valueEstimateVsTruth,
  wastedRolloutRate,
  spearman,
  wideningLimit,
  type HypothesisNode,
  type MCTSConfig,
  type MCTSNode,
} from "@sports/prediction-engine/src/invention/2410-17238v1-sela-mcts.js";
import {
  cosineSimilarity,
  retrieveCounterCase,
  retrieveTopK,
  reviseRank,
  retainGate,
  selectBestProductionCase,
  type DiscoveryCase,
} from "@sports/prediction-engine/src/invention/case-bank.js";
import {
  discriminationIndex,
  ebShrink,
  independenceIndices,
  reliabilityReport,
  stabilityIndex,
  type MetricAudit,
} from "@sports/prediction-engine/src/invention/meta-analytics.js";
import {
  attributeEdv,
  edv,
  riskAdjustedEdv,
  type PlayActor,
  type ScoringPlay,
} from "@sports/prediction-engine/src/tracking/expected-drive-value.js";
import {
  actOnEpv,
  bootstrapSe,
  errorScaledThreshold,
} from "@sports/prediction-engine/src/tracking/bootstrap-epv-scaling.js";

export type InventEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): InventEval<never> {
  return { ok: false, reason };
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function allFinite(xs: readonly number[]): boolean {
  for (const v of xs) {
    if (!Number.isFinite(v)) return false;
  }
  return true;
}

/** Iteration caps: a caller must never be able to hang the ingestion process. */
const MAX_BANDIT_PULLS = 200_000;
const MAX_MCTS_BUDGET = 50_000;
const MAX_BOOTSTRAP_RESAMPLES = 20_000;
const MAX_BOOTSTRAP_ITERS = 100_000;

const PLAY_ACTORS: readonly PlayActor[] = ["passer", "receiver", "rusher", "other"];

/**
 * Draw from a caller-supplied generator and insist it is a usable uniform.
 * This is what keeps `discriminationIndex`'s `rand = Math.random` default and
 * any degenerate generator from silently producing an unreproducible number.
 */
function probeRng(rand: unknown, label: string): InventEval<null> {
  if (typeof rand !== "function") return fail(`${label} must be a function`);
  const fn = rand as () => number;
  for (let i = 0; i < 8; i++) {
    const v = fn();
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= 1) {
      return fail(`${label} must return a finite number in [0, 1); draw ${i} returned ${String(v)}`);
    }
  }
  return { ok: true, data: null };
}

/** Validate an RNG factory (two independent streams keep MCTS vs RR comparable). */
function probeRandFactory(factory: unknown, label: string): InventEval<null> {
  if (typeof factory !== "function") return fail(`${label} must be a function`);
  let produced: unknown;
  try {
    produced = (factory as () => unknown)();
  } catch (e) {
    return fail(`${label} threw: ${describe(e)}`);
  }
  if (typeof produced !== "function") return fail(`${label} must return a function`);
  return probeRng(produced, label);
}

function validateSamples(
  samples: readonly Sample[] | undefined,
): InventEval<number> {
  if (!Array.isArray(samples) || samples.length === 0) {
    return fail("samples must be a non-empty array");
  }
  let width = -1;
  for (const s of samples) {
    if (!s || !Array.isArray(s.x) || s.x.length === 0) {
      return fail("every sample needs a non-empty feature vector x");
    }
    if (!allFinite(s.x)) return fail("sample feature vectors must be finite");
    if (!Number.isFinite(s.y)) return fail("sample targets y must be finite");
    if (width === -1) width = s.x.length;
    else if (s.x.length !== width) return fail("sample feature vectors must be rectangular");
  }
  return { ok: true, data: width };
}

function validateGroup(
  group: FeatureGroup | undefined,
  width: number,
  label: string,
): InventEval<readonly number[]> {
  if (!group || typeof group !== "object") return fail(`${label} must be an object`);
  if (typeof group.name !== "string" || group.name.length === 0) {
    return fail(`${label}.name must be a non-empty string`);
  }
  if (!Array.isArray(group.indices) || group.indices.length === 0) {
    return fail(`${label}.indices must be non-empty`);
  }
  for (const idx of group.indices) {
    if (!Number.isSafeInteger(idx) || idx < 0 || idx >= width) {
      return fail(`${label}.indices must be integers within [0, ${width})`);
    }
  }
  return { ok: true, data: group.indices };
}

// ─── AI Feynman separability front end ───────────────────────────────────────

export interface SeparabilityProbeResult {
  readonly separability: SeparabilityResult;
  readonly sampleCount: number;
  readonly featureWidth: number;
}

/**
 * Probe whether a target decomposes additively (or multiplicatively) across
 * two feature groups, via the AI Feynman Delta_sep cross-partial statistic.
 */
export function evalSeparabilityProbe(input: {
  readonly samples: readonly Sample[];
  readonly f: (x: readonly number[]) => number;
  readonly groupA: FeatureGroup;
  readonly groupB: FeatureGroup;
  readonly threshold?: number;
}): InventEval<SeparabilityProbeResult> {
  const { samples, f, groupA, groupB, threshold } = input;
  if (typeof f !== "function") return fail("f must be a function");
  const shape = validateSamples(samples);
  if (!shape.ok) return fail(shape.reason);
  const a = validateGroup(groupA, shape.data, "groupA");
  if (!a.ok) return fail(a.reason);
  const b = validateGroup(groupB, shape.data, "groupB");
  if (!b.ok) return fail(b.reason);
  const overlap = a.data.filter((i) => b.data.includes(i));
  if (overlap.length > 0) {
    return fail(
      `groupA and groupB share feature index ${overlap[0]}; the cross-partial would be undefined`,
    );
  }
  if (groupA.name === groupB.name) return fail("groupA.name and groupB.name must differ");
  const thr = threshold ?? 0.1;
  if (!Number.isFinite(thr) || thr <= 0) return fail("threshold must be finite > 0");

  try {
    const separability = probeSeparability(
      [...samples],
      (x) => f(x),
      { name: groupA.name, indices: [...a.data] },
      { name: groupB.name, indices: [...b.data] },
      thr,
    );
    for (const key of ["deltaSepAdditive", "deltaSepMultiplicative"] as const) {
      const v = separability[key];
      if (!Number.isFinite(v) || v < 0) return fail(`${key} is not a finite non-negative number`);
    }
    if (separability.additiveSeparable !== separability.deltaSepAdditive < thr) {
      return fail("additiveSeparable disagrees with deltaSepAdditive < threshold");
    }
    if (separability.multiplicativeSeparable !== separability.deltaSepMultiplicative < thr) {
      return fail("multiplicativeSeparable disagrees with deltaSepMultiplicative < threshold");
    }
    return {
      ok: true,
      data: { separability, sampleCount: samples.length, featureWidth: shape.data },
    };
  } catch (e) {
    return fail(`probeSeparability threw: ${describe(e)}`);
  }
}

export interface DeltaSepResult {
  readonly groupA: string;
  readonly groupB: string;
  readonly epsilon: number;
  readonly deltaSepAdditive: number;
  readonly deltaSepMultiplicative: number;
}

/**
 * Raw Delta_sep statistics at a caller-chosen finite-difference step.
 * `probeSeparability` fixes epsilon at 1e-3 internally and only reports the
 * boolean verdict, so this is the only way to see whether a near-threshold
 * result is stable or an artifact of the step size.
 */
export function evalDeltaSep(input: {
  readonly samples: readonly Sample[];
  readonly f: (x: readonly number[]) => number;
  readonly groupA: FeatureGroup;
  readonly groupB: FeatureGroup;
  readonly epsilon?: number;
}): InventEval<DeltaSepResult> {
  const { samples, f, groupA, groupB, epsilon } = input;
  if (typeof f !== "function") return fail("f must be a function");
  const shape = validateSamples(samples);
  if (!shape.ok) return fail(shape.reason);
  const a = validateGroup(groupA, shape.data, "groupA");
  if (!a.ok) return fail(a.reason);
  const b = validateGroup(groupB, shape.data, "groupB");
  if (!b.ok) return fail(b.reason);
  const overlap = a.data.filter((i) => b.data.includes(i));
  if (overlap.length > 0) {
    return fail(
      `groupA and groupB share feature index ${overlap[0]}; the cross-partial would be undefined`,
    );
  }
  // The statistic is a second finite difference divided by epsilon^2, so it
  // degrades at both ends: tiny steps amplify rounding, large steps blur the
  // curvature. 0.1 is the coarsest step that still measures a second derivative.
  const eps = epsilon ?? 1e-3;
  if (!Number.isFinite(eps) || eps <= 0 || eps > 0.1) {
    return fail("epsilon must be a finite value in (0, 0.1]");
  }
  const groupAArg: FeatureGroup = { name: groupA.name, indices: [...a.data] };
  const groupBArg: FeatureGroup = { name: groupB.name, indices: [...b.data] };
  try {
    const add = deltaSepAdditive([...samples], (x) => f(x), groupAArg, groupBArg, eps);
    const mul = deltaSepMultiplicative([...samples], (x) => f(x), groupAArg, groupBArg, eps);
    for (const [k, v] of [
      ["deltaSepAdditive", add],
      ["deltaSepMultiplicative", mul],
    ] as const) {
      if (!Number.isFinite(v) || v < 0) return fail(`${k} is not a finite non-negative number`);
    }
    return {
      ok: true,
      data: {
        groupA: groupA.name,
        groupB: groupB.name,
        epsilon: eps,
        deltaSepAdditive: add,
        deltaSepMultiplicative: mul,
      },
    };
  } catch (e) {
    return fail(`deltaSep threw: ${describe(e)}`);
  }
}

export interface RecombineResult {
  readonly equation: RecombinedEquation;
  readonly separability: SeparabilityResult;
}

/**
 * Recombine per-group symbolic equations. The separability verdict is probed
 * here from real data — a caller cannot hand the recombiner a fabricated
 * SeparabilityResult and get a "separability fired" expression out of it.
 */
export function evalRecombineGroups(input: {
  readonly samples: readonly Sample[];
  readonly f: (x: readonly number[]) => number;
  readonly groupA: FeatureGroup;
  readonly groupB: FeatureGroup;
  readonly groupEquations: readonly {
    readonly group: string;
    readonly expression: string;
    readonly nodes: number;
  }[];
  readonly threshold?: number;
}): InventEval<RecombineResult> {
  const { samples, f, groupA, groupB, groupEquations, threshold } = input;
  if (!Array.isArray(groupEquations) || groupEquations.length === 0) {
    return fail("groupEquations must be non-empty");
  }
  const probe = evalSeparabilityProbe({ samples, f, groupA, groupB, threshold });
  if (!probe.ok) return probe;
  const names = new Set<string>([groupA.name, groupB.name]);
  for (const g of groupEquations) {
    if (typeof g.group !== "string" || g.group.length === 0) {
      return fail("every groupEquation needs a non-empty group name");
    }
    if (!names.has(g.group)) {
      return fail(`groupEquation "${g.group}" does not match a probed feature group`);
    }
    if (typeof g.expression !== "string" || g.expression.length === 0) {
      return fail("every groupEquation needs a non-empty expression");
    }
    if (!Number.isSafeInteger(g.nodes) || g.nodes < 0) {
      return fail("every groupEquation needs a non-negative integer node count");
    }
    names.delete(g.group);
  }
  if (names.size > 0) {
    return fail(`no equation supplied for probed group "${[...names][0] ?? "?"}"`);
  }
  try {
    const equation = recombine(
      groupEquations.map((g) => ({ group: g.group, expression: g.expression, nodes: g.nodes })),
      probe.data.separability,
    );
    if (equation.totalNodes < 0 || !Number.isFinite(equation.totalNodes)) {
      return fail("recombine produced a non-finite node count");
    }
    if (equation.separabilityFired && equation.totalNodes === 0) {
      return fail("recombine reported separability fired with zero nodes");
    }
    return { ok: true, data: { equation, separability: probe.data.separability } };
  } catch (e) {
    return fail(`recombine threw: ${describe(e)}`);
  }
}

export interface PaceRow {
  readonly x: readonly number[];
  readonly y: number;
}

export interface PaceNormalizationResult {
  readonly rows: readonly PaceRow[];
  readonly rowsAtLeagueMeanPace: number;
  readonly leagueMeanPace: number;
}

/**
 * Scale-free target for the separability front end: points-per-drive divided
 * by the team's pace index relative to the league mean.
 */
export function evalPaceNormalization(input: {
  readonly samples: readonly Sample[];
  readonly paceIndexInX: number;
  readonly leagueMeanPace: number;
}): InventEval<PaceNormalizationResult> {
  const { samples, paceIndexInX, leagueMeanPace } = input;
  const shape = validateSamples(samples);
  if (!shape.ok) return fail(shape.reason);
  if (!Number.isSafeInteger(paceIndexInX) || paceIndexInX < 0 || paceIndexInX >= shape.data) {
    return fail(`paceIndexInX must be an integer within [0, ${shape.data})`);
  }
  if (!Number.isFinite(leagueMeanPace) || leagueMeanPace <= 0) {
    return fail("leagueMeanPace must be finite > 0");
  }
  try {
    const rows = normalizeByPace([...samples], paceIndexInX, leagueMeanPace);
    let atMean = 0;
    for (const s of samples) {
      if ((s.x[paceIndexInX] ?? Number.NaN) === leagueMeanPace) atMean++;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const src = samples[i];
      if (!row || !src) return fail("normalizeByPace returned a row with no source sample");
      if (!Number.isFinite(row.y)) return fail("normalizeByPace produced a non-finite target");
      if (!Array.isArray(row.x) || row.x.length !== shape.data) {
        return fail("normalizeByPace changed the feature width");
      }
      if ((src.x[paceIndexInX] ?? Number.NaN) === leagueMeanPace && row.y !== src.y) {
        return fail("a sample at league-mean pace was rescaled; the target is not scale-free");
      }
    }
    return { ok: true, data: { rows, rowsAtLeagueMeanPace: atMean, leagueMeanPace } };
  } catch (e) {
    return fail(`normalizeByPace threw: ${describe(e)}`);
  }
}

export interface ImprovementGateResult {
  readonly passes: boolean;
  readonly rmseImprovement: number;
  readonly nodeGrowth: number;
}

/**
 * The separability front end's own accept/reject: >=5% held-out RMSE
 * improvement at no more than 20% node growth.
 */
export function evalImprovementGate(input: {
  readonly flatRmse: number;
  readonly recombinedRmse: number;
  readonly flatNodes: number;
  readonly recombinedNodes: number;
}): InventEval<ImprovementGateResult> {
  const { flatRmse, recombinedRmse, flatNodes, recombinedNodes } = input;
  for (const [k, v] of [
    ["flatRmse", flatRmse],
    ["recombinedRmse", recombinedRmse],
    ["flatNodes", flatNodes],
    ["recombinedNodes", recombinedNodes],
  ] as const) {
    if (!Number.isFinite(v)) return fail(`${k} must be finite`);
  }
  if (flatRmse <= 0) return fail("flatRmse must be > 0; the lift is undefined at zero");
  if (flatNodes <= 0) return fail("flatNodes must be > 0; node growth is undefined at zero");
  if (recombinedRmse < 0) return fail("recombinedRmse must be >= 0");
  if (!Number.isSafeInteger(flatNodes) || !Number.isSafeInteger(recombinedNodes)) {
    return fail("node counts must be safe integers");
  }
  if (recombinedNodes < 0) return fail("recombinedNodes must be >= 0");
  try {
    const passes = passesImprovementGate(flatRmse, recombinedRmse, flatNodes, recombinedNodes);
    // Recompute the published arithmetic so a silent change to the module's
    // constants surfaces as a fail-closed mismatch instead of a flipped gate.
    const rmseImprovement = (flatRmse - recombinedRmse) / flatRmse;
    const nodeGrowth = (recombinedNodes - flatNodes) / flatNodes;
    const expected = rmseImprovement >= 0.05 && nodeGrowth <= 0.2;
    if (passes !== expected) {
      return fail(
        `improvement gate disagrees with the published rule (lift ${rmseImprovement}, growth ${nodeGrowth})`,
      );
    }
    return { ok: true, data: { passes, rmseImprovement, nodeGrowth } };
  } catch (e) {
    return fail(`passesImprovementGate threw: ${describe(e)}`);
  }
}

// ─── Dual-margin Thompson-sampling contextual bandit ─────────────────────────

export interface BanditOutcomeContext {
  readonly arm: number;
  readonly armName: string;
  readonly segment: string;
  readonly visitorIndex: number;
}

export interface BanditOutcome {
  readonly converted: boolean;
  readonly revenue: number;
}

export interface BanditGateThresholds {
  readonly name?: string;
  readonly minRevenueLift: number;
  readonly maxConversionDeclinePp: number;
  readonly minWeeks: number;
  /** Caller-supplied pre-registration stamp; the bridge never invents a timestamp. */
  readonly registeredAt: string;
}

export interface ArmSummary {
  readonly arm: string;
  readonly pulls: number;
  readonly conversion: number;
  readonly revenuePerVisitor: number;
}

export interface BanditExperimentResult {
  readonly controlArm: number;
  readonly bestArm: number;
  readonly bestArmName: string;
  readonly arms: readonly ArmSummary[];
  readonly result: DualMarginResult;
  readonly gate: boolean;
  readonly spec: ExperimentSpec;
}

/**
 * Run the dual-margin experiment: Thompson-sampling contextual assignment for
 * `pulls` visitors, real Beta/posterior updates from the caller's outcome
 * oracle, then the pre-registered revenue-vs-conversion gate.
 */
export function evalBanditExperiment(input: {
  readonly arms: readonly string[];
  readonly controlArm: number;
  readonly bestArm: number;
  readonly pulls: number;
  readonly weeks: number;
  readonly segments: readonly string[];
  readonly outcome: (ctx: BanditOutcomeContext) => BanditOutcome;
  readonly rand: () => number;
  readonly segmentWeights?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly gate: BanditGateThresholds;
}): InventEval<BanditExperimentResult> {
  const {
    arms, controlArm, bestArm, pulls, weeks, segments, outcome, rand, segmentWeights, gate,
  } = input;

  if (!Array.isArray(arms) || arms.length < 2) {
    return fail("arms must list at least a control and one treatment");
  }
  const armNames = new Set<string>();
  for (const a of arms) {
    if (typeof a !== "string" || a.length === 0) return fail("every arm needs a non-empty name");
    if (armNames.has(a)) return fail(`duplicate arm name "${a}"`);
    armNames.add(a);
  }
  if (arms.length > NUM_ARMS) {
    return fail(`arms must not exceed the pre-registered arm count (${NUM_ARMS})`);
  }
  if (!Number.isSafeInteger(controlArm) || controlArm < 0 || controlArm >= arms.length) {
    return fail("controlArm must be an integer index within arms");
  }
  // computeDualMargin hardcodes index 0 as the control; a caller asking for
  // another index would silently be graded against the wrong baseline.
  if (controlArm !== 0) {
    return fail("computeDualMargin reads arm index 0 as the control; pass controlArm = 0");
  }
  if (!Number.isSafeInteger(bestArm) || bestArm < 0 || bestArm >= arms.length) {
    return fail("bestArm must be an integer index within arms");
  }
  if (bestArm === controlArm) return fail("bestArm must differ from the control arm");
  if (!Number.isSafeInteger(pulls) || pulls < 1 || pulls > MAX_BANDIT_PULLS) {
    return fail(`pulls must be an integer in [1, ${MAX_BANDIT_PULLS}]`);
  }
  if (!Number.isFinite(weeks) || weeks < 0) return fail("weeks must be finite >= 0");
  if (!Array.isArray(segments) || segments.length === 0) return fail("segments must be non-empty");
  for (const s of segments) {
    if (typeof s !== "string" || s.length === 0) return fail("every segment needs a name");
  }
  if (typeof outcome !== "function") return fail("outcome must be a function");
  const rng = probeRng(rand, "rand");
  if (!rng.ok) return rng;
  if (!gate || typeof gate !== "object") return fail("gate thresholds are required");
  if (!Number.isFinite(gate.minRevenueLift) || gate.minRevenueLift < 0) {
    return fail("gate.minRevenueLift must be finite >= 0");
  }
  if (!Number.isFinite(gate.maxConversionDeclinePp) || gate.maxConversionDeclinePp < 0) {
    return fail("gate.maxConversionDeclinePp must be finite >= 0");
  }
  if (!Number.isFinite(gate.minWeeks) || gate.minWeeks < 0) {
    return fail("gate.minWeeks must be finite >= 0");
  }
  if (typeof gate.registeredAt !== "string" || gate.registeredAt.length === 0) {
    return fail("gate.registeredAt is required; the bridge will not invent a timestamp");
  }

  const weights: Record<string, Record<string, number>> = {};
  if (segmentWeights !== undefined) {
    if (typeof segmentWeights !== "object" || segmentWeights === null) {
      return fail("segmentWeights must be a record keyed by arm name");
    }
    for (const [arm, bySeg] of Object.entries(segmentWeights)) {
      if (!armNames.has(arm)) return fail(`segmentWeights names unknown arm "${arm}"`);
      if (typeof bySeg !== "object" || bySeg === null) {
        return fail(`segmentWeights["${arm}"] must be a record of segment -> weight`);
      }
      const bucket: Record<string, number> = {};
      for (const [seg, w] of Object.entries(bySeg)) {
        if (!Number.isFinite(w) || w <= 0) {
          return fail(`segmentWeights["${arm}"]["${seg}"] must be finite > 0`);
        }
        bucket[seg] = w;
      }
      weights[arm] = bucket;
    }
  }

  const spec: ExperimentSpec = {
    name: gate.name ?? "ingestion-dualmargin-v1",
    arms: [...arms],
    primaryMetric: "revenue_per_visitor",
    guardrailMetric: "conversion_rate",
    minRevenueLift: gate.minRevenueLift,
    maxConversionDeclinePp: gate.maxConversionDeclinePp,
    minWeeks: gate.minWeeks,
    registeredAt: gate.registeredAt,
  };

  try {
    const states: BanditArmState[] = arms.map((name) => {
      const s = initialArmState();
      const armWeights = weights[name];
      if (armWeights) s.segmentWeights = { ...armWeights };
      return s;
    });

    for (let i = 0; i < pulls; i++) {
      const segment = segments[i % segments.length] ?? "";
      const assignment = assignArm(states, segment, rand);
      if (!Number.isSafeInteger(assignment.arm) || assignment.arm < 0 || assignment.arm >= states.length) {
        return fail(`assignArm returned out-of-range arm ${String(assignment.arm)} at visitor ${i}`);
      }
      if (!Number.isFinite(assignment.sampledConversionProb)) {
        return fail(`assignArm produced a non-finite sampled probability at visitor ${i}`);
      }
      const armName = arms[assignment.arm] ?? "";
      const observed = outcome({
        arm: assignment.arm,
        armName,
        segment,
        visitorIndex: i,
      });
      if (!observed || typeof observed.converted !== "boolean") {
        return fail(`outcome must return a boolean 'converted' (visitor ${i}, arm ${armName})`);
      }
      if (!Number.isFinite(observed.revenue) || observed.revenue < 0) {
        return fail(`outcome must return a finite non-negative revenue (visitor ${i}, arm ${armName})`);
      }
      recordOutcome(states, assignment.arm, observed.converted, observed.revenue);
    }

    const control = states[controlArm];
    if (!control) return fail("control arm state is missing after the run");
    if (control.pulls === 0) {
      return fail(
        "the control arm received no visitors, so revenue lift is undefined; the bandit starved the baseline",
      );
    }
    const treated = states[bestArm];
    if (!treated) return fail("best arm state is missing after the run");
    if (treated.pulls === 0) {
      return fail("the best arm received no visitors, so the treatment effect is unmeasured");
    }
    if (control.revenueSum <= 0) {
      return fail("the control arm booked zero revenue, so relative lift is undefined");
    }

    const result = computeDualMargin(states, bestArm, weeks);
    if (!Number.isFinite(result.revenueLift) || !Number.isFinite(result.conversionChangePp)) {
      return fail("computeDualMargin produced a non-finite margin");
    }
    if (result.totalPulls !== pulls) {
      return fail(`computeDualMargin counted ${result.totalPulls} pulls; the run recorded ${pulls}`);
    }

    const summaries: ArmSummary[] = states.map((s, i) => {
      const name = arms[i] ?? "";
      return {
        arm: name,
        pulls: s.pulls,
        conversion: s.pulls > 0 ? s.alpha / (s.alpha + s.beta) : 0,
        revenuePerVisitor: s.pulls > 0 ? s.revenueSum / s.pulls : 0,
      };
    });

    return {
      ok: true,
      data: {
        controlArm,
        bestArm,
        bestArmName: arms[bestArm] ?? "",
        arms: summaries,
        result,
        gate: passesDualMarginGate(spec, result),
        spec,
      },
    };
  } catch (e) {
    return fail(`bandit experiment threw: ${describe(e)}`);
  }
}

export interface CateReplicationResult {
  readonly replicates: boolean;
  readonly signAgrees: boolean;
  readonly relativeError: number;
}

/**
 * The paper's CATE rule: keep contextual assignment only if the live A/B
 * uplift replicates the offline estimate in sign and magnitude.
 */
export function evalCateReplication(input: {
  readonly offlineUplift: number;
  readonly liveUplift: number;
  readonly tolerance?: number;
}): InventEval<CateReplicationResult> {
  const { offlineUplift, liveUplift, tolerance } = input;
  if (!Number.isFinite(offlineUplift) || !Number.isFinite(liveUplift)) {
    return fail("offlineUplift and liveUplift must be finite");
  }
  const tol = tolerance ?? 0.5;
  if (!Number.isFinite(tol) || tol < 0) return fail("tolerance must be finite >= 0");
  try {
    const replicates = cateReplicatesLive(offlineUplift, liveUplift, tol);
    const signAgrees = Math.sign(offlineUplift) === Math.sign(liveUplift);
    const relativeError =
      Math.abs(liveUplift - offlineUplift) / Math.max(Math.abs(offlineUplift), 1e-12);
    if (!Number.isFinite(relativeError)) return fail("relative error is not finite");
    // A zero offline estimate with a matching-sign live estimate is the module's
    // "both effectively zero" branch; only that case may replicate with a
    // relative error that is not meaningful.
    const bothZero = Math.abs(offlineUplift) < 1e-12 && Math.abs(liveUplift) < 1e-12;
    if (replicates && !signAgrees && !bothZero) {
      return fail("cateReplicatesLive reports replication across a sign flip");
    }
    if (replicates && !signAgrees && bothZero) return fail("both uplifts cannot have a sign flip at zero");
    if (!replicates && signAgrees && !bothZero && relativeError <= tol) {
      return fail("cateReplicatesLive rejects an in-tolerance same-sign estimate");
    }
    return { ok: true, data: { replicates, signAgrees, relativeError } };
  } catch (e) {
    return fail(`cateReplicatesLive threw: ${describe(e)}`);
  }
}

// ─── SELA hierarchical MCTS ──────────────────────────────────────────────────

export interface SelaSearchResult {
  readonly mctsGatePassers: readonly string[];
  readonly roundRobinGatePassers: readonly string[];
  readonly mctsWastedRolloutRate: number;
  readonly roundRobinWastedSlotRate: number;
  readonly spearmanRho: number;
  readonly valueEstimates: readonly number[];
  readonly trueQualities: readonly number[];
  readonly rolloutsSpent: number;
  readonly gate: boolean;
}

/**
 * Run SELA-style hierarchical MCTS at a bounded budget and grade it against
 * the round-robin baseline on the same budget. `makeRand` is a required
 * FACTORY so the two searches get independent, reproducible streams — sharing
 * one generator would make the MCTS-vs-round-robin comparison depend on call
 * order, which is not a comparison.
 */
export function evalSelaSearch(input: {
  readonly families: readonly string[];
  readonly candidates: Readonly<Record<string, readonly HypothesisNode[]>>;
  readonly config: MCTSConfig;
  readonly gateThreshold: number;
  readonly makeRand: () => () => number;
}): InventEval<SelaSearchResult> {
  const { families, candidates, config, gateThreshold, makeRand } = input;
  if (!Array.isArray(families) || families.length === 0) {
    return fail("families must be non-empty; an empty tree never rolls out");
  }
  const familySet = new Set<string>();
  for (const f of families) {
    if (typeof f !== "string" || f.length === 0) return fail("every family needs a name");
    if (familySet.has(f)) return fail(`duplicate family "${f}"`);
    familySet.add(f);
  }
  if (typeof candidates !== "object" || candidates === null) {
    return fail("candidates must be a record keyed by family name");
  }
  const seenIds = new Set<string>();
  const map = new Map<string, HypothesisNode[]>();
  for (const fam of families) {
    const pool = candidates[fam];
    if (!Array.isArray(pool) || pool.length === 0) {
      return fail(`family "${fam}" has no candidate hypotheses; that budget would be wasted`);
    }
    for (const h of pool) {
      if (!h || typeof h.id !== "string" || h.id.length === 0) {
        return fail(`family "${fam}" has a hypothesis without an id`);
      }
      if (seenIds.has(h.id)) return fail(`duplicate hypothesis id "${h.id}"`);
      seenIds.add(h.id);
      if (h.family !== fam) {
        return fail(`hypothesis "${h.id}" claims family "${h.family}" but is filed under "${fam}"`);
      }
      if (typeof h.hypothesis !== "string" || h.hypothesis.length === 0) {
        return fail(`hypothesis "${h.id}" needs a hypothesis description`);
      }
      if (!Number.isFinite(h.trueQuality)) {
        return fail(`hypothesis "${h.id}" needs a finite trueQuality`);
      }
    }
    map.set(fam, [...pool]);
  }
  if (!config || typeof config !== "object") return fail("config is required");
  if (!Number.isFinite(config.exploration) || config.exploration < 0) {
    return fail("config.exploration must be finite >= 0");
  }
  if (!Number.isFinite(config.wideningC) || config.wideningC <= 0) {
    return fail("config.wideningC must be finite > 0");
  }
  if (!Number.isFinite(config.wideningAlpha) || config.wideningAlpha <= 0) {
    return fail("config.wideningAlpha must be finite > 0");
  }
  if (
    !Number.isSafeInteger(config.budget) ||
    config.budget < 1 ||
    config.budget > MAX_MCTS_BUDGET
  ) {
    return fail(`config.budget must be an integer in [1, ${MAX_MCTS_BUDGET}]`);
  }
  if (!Number.isFinite(gateThreshold)) return fail("gateThreshold must be finite");
  const factory = probeRandFactory(makeRand, "makeRand");
  if (!factory.ok) return factory;

  try {
    const mcts = runMCTSSearch(
      [...families],
      map,
      config,
      gateThreshold,
      makeRand(),
    );
    const rr = runRoundRobin([...families], map, config.budget, gateThreshold, makeRand());
    const mctsWaste = wastedRolloutRate(mcts.root);
    const { estimates, truths } = valueEstimateVsTruth(mcts.root);
    const rho = spearman(estimates, truths);
    for (const v of [...estimates, ...truths, rho]) {
      if (!Number.isFinite(v)) return fail("MCTS produced a non-finite value or rank correlation");
    }
    if (mctsWaste < 0 || mctsWaste > 1) {
      return fail("wastedRolloutRate is outside [0, 1]");
    }
    // Stated bridge-level definition: a round-robin slot that clears the gate
    // is productive; a slot that fails the gate OR lands on an exhausted pool
    // is wasted. It is measured over the whole budget, not over distinct
    // leaves, and that denominator difference is deliberate and documented.
    const rrWaste = (config.budget - rr.length) / config.budget;
    if (rrWaste < 0 || rrWaste > 1) {
      return fail("round-robin wasted-slot rate is outside [0, 1]");
    }
    const gate = passesSelaGate(
      mcts.gatePassers.length,
      rr.length,
      mctsWaste,
      rrWaste,
      rho,
    );
    return {
      ok: true,
      data: {
        mctsGatePassers: mcts.gatePassers.map((h) => h.id),
        roundRobinGatePassers: rr.map((h) => h.id),
        mctsWastedRolloutRate: mctsWaste,
        roundRobinWastedSlotRate: rrWaste,
        spearmanRho: rho,
        valueEstimates: estimates,
        trueQualities: truths,
        rolloutsSpent: mcts.root.visits,
        gate,
      },
    };
  } catch (e) {
    return fail(`SELA search threw: ${describe(e)}`);
  }
}

export interface UcBalanceResult {
  readonly nodeId: string;
  readonly meanValue: number;
  readonly ucb: number;
  readonly wideningLimit: number;
}

/**
 * UCB1 balance of a single tree node: its posterior mean, its selection score
 * against the parent, and how many hypothesis children progressive widening
 * permits at its current visit count.
 */
export function evalUcBalance(input: {
  readonly nodeId: string;
  readonly visits: number;
  readonly totalReward: number;
  readonly parentVisits: number;
  readonly exploration?: number;
  readonly wideningC?: number;
  readonly wideningAlpha?: number;
}): InventEval<UcBalanceResult> {
  const {
    nodeId, visits, totalReward, parentVisits, exploration, wideningC, wideningAlpha,
  } = input;
  if (typeof nodeId !== "string" || nodeId.length === 0) return fail("nodeId is required");
  if (!Number.isSafeInteger(visits) || visits < 1) {
    return fail("visits must be a safe integer >= 1; an unvisited node has no finite UCB to publish");
  }
  if (!Number.isFinite(totalReward)) return fail("totalReward must be finite");
  if (!Number.isSafeInteger(parentVisits) || parentVisits < 1) {
    return fail("parentVisits must be a safe integer >= 1");
  }
  const c = exploration ?? Math.SQRT2;
  if (!Number.isFinite(c) || c < 0) return fail("exploration must be finite >= 0");
  const wc = wideningC ?? 1.5;
  const wa = wideningAlpha ?? 0.5;
  if (!Number.isFinite(wc) || wc <= 0) return fail("wideningC must be finite > 0");
  if (!Number.isFinite(wa) || wa <= 0) return fail("wideningAlpha must be finite > 0");
  try {
    const node: MCTSNode = {
      id: nodeId,
      hypothesis: null,
      family: null,
      visits,
      totalReward,
      children: [],
      rolledOut: true,
      gatePassed: false,
    };
    const mean = meanValue(node);
    const ucb = ucbScore(node, parentVisits, c);
    if (!Number.isFinite(mean) || !Number.isFinite(ucb)) {
      return fail("ucbScore produced a non-finite value for a visited node");
    }
    if (mean > totalReward / visits) return fail("meanValue disagrees with totalReward / visits");
    const limit = wideningLimit(visits, wc, wa);
    if (!Number.isSafeInteger(limit) || limit < 1) {
      return fail("wideningLimit must be a safe integer >= 1");
    }
    return { ok: true, data: { nodeId, meanValue: mean, ucb, wideningLimit: limit } };
  } catch (e) {
    return fail(`ucbScore threw: ${describe(e)}`);
  }
}

// ─── DS-Agent case bank ──────────────────────────────────────────────────────

export interface RetrievedCase {
  readonly caseId: string;
  readonly similarity: number;
  readonly devScore: number;
  readonly retainedFlag: boolean;
}

export interface CaseRetrievalResult {
  readonly retrieved: readonly RetrievedCase[];
  readonly revisedOrder: readonly string[];
  readonly bestProductionCaseId: string | null;
}

function validateBank(
  bank: readonly DiscoveryCase[] | undefined,
  embeddingLength: number | null,
): InventEval<null> {
  if (!Array.isArray(bank) || bank.length === 0) return fail("bank must be non-empty");
  const ids = new Set<string>();
  for (const c of bank) {
    if (!c || typeof c.caseId !== "string" || c.caseId.length === 0) {
      return fail("every case needs a non-empty caseId");
    }
    if (ids.has(c.caseId)) return fail(`duplicate caseId "${c.caseId}"`);
    ids.add(c.caseId);
    if (typeof c.hypothesisText !== "string" || c.hypothesisText.length === 0) {
      return fail(`case "${c.caseId}" needs a hypothesisText`);
    }
    if (typeof c.feedbackLog !== "string") return fail(`case "${c.caseId}" needs a feedbackLog`);
    if (!Number.isFinite(c.devScore)) return fail(`case "${c.caseId}" needs a finite devScore`);
    if (c.stage3Score !== null && !Number.isFinite(c.stage3Score)) {
      return fail(`case "${c.caseId}" stage3Score must be null or finite`);
    }
    if (typeof c.retainedFlag !== "boolean") {
      return fail(`case "${c.caseId}" needs a boolean retainedFlag`);
    }
    if (!Array.isArray(c.embedding) || c.embedding.length === 0) {
      return fail(`case "${c.caseId}" needs a non-empty embedding`);
    }
    if (!allFinite(c.embedding)) return fail(`case "${c.caseId}" embedding must be finite`);
    // cosineSimilarity silently truncates to the shorter vector, which would
    // score a mismatched embedding on a prefix and report that as similarity.
    if (embeddingLength !== null && c.embedding.length !== embeddingLength) {
      return fail(`case "${c.caseId}" embedding length ${c.embedding.length} != query length ${embeddingLength}`);
    }
  }
  return { ok: true, data: null };
}

/**
 * What the discovery loop would be handed tonight: top-k cases by embedding
 * similarity, then the same cases re-ranked with last night's failure feedback
 * injected, plus the case whose code is regenerated on the weekly deployment.
 */
export function evalCaseRetrieval(input: {
  readonly bank: readonly DiscoveryCase[];
  readonly queryEmbedding: readonly number[];
  readonly k: number;
  readonly failureKeywords?: readonly string[];
}): InventEval<CaseRetrievalResult> {
  const { bank, queryEmbedding, k, failureKeywords } = input;
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return fail("queryEmbedding must be non-empty");
  }
  if (!allFinite(queryEmbedding)) return fail("queryEmbedding must be finite");
  const bankCheck = validateBank(bank, queryEmbedding.length);
  if (!bankCheck.ok) return bankCheck;
  if (!Number.isSafeInteger(k) || k < 0) return fail("k must be a safe integer >= 0");
  if (k > (bank?.length ?? 0)) return fail("k must not exceed the bank size");
  let keywords: readonly string[] = [];
  if (failureKeywords !== undefined) {
    if (!Array.isArray(failureKeywords)) return fail("failureKeywords must be an array");
    for (const kw of failureKeywords) {
      if (typeof kw !== "string" || kw.length === 0) {
        return fail("every failure keyword must be a non-empty string");
      }
    }
    keywords = failureKeywords;
  }
  try {
    const top = retrieveTopK([...(bank ?? [])], queryEmbedding, k);
    if (top.length !== Math.min(k, bank?.length ?? 0)) {
      return fail("retrieveTopK returned the wrong number of cases");
    }
    const retrieved: RetrievedCase[] = top.map((c) => ({
      caseId: c.caseId,
      similarity: cosineSimilarity(c.embedding, queryEmbedding),
      devScore: c.devScore,
      retainedFlag: c.retainedFlag,
    }));
    for (let i = 1; i < retrieved.length; i++) {
      const prev = retrieved[i - 1];
      const cur = retrieved[i];
      if (!prev || !cur) return fail("retrieval ranking is malformed");
      if (prev.similarity < cur.similarity) {
        return fail("retrieved cases are not ordered by descending similarity");
      }
    }
    const revised = reviseRank(top, [...keywords]);
    const best = selectBestProductionCase([...(bank ?? [])]);
    return {
      ok: true,
      data: {
        retrieved,
        revisedOrder: revised.map((c) => c.caseId),
        bestProductionCaseId: best ? best.caseId : null,
      },
    };
  } catch (e) {
    return fail(`case retrieval threw: ${describe(e)}`);
  }
}

export interface CaseGateResult {
  readonly devScore: number;
  readonly retained: boolean;
  readonly counterCaseId: string | null;
  readonly counterCaseDevScore: number | null;
}

/**
 * For the case about to be re-run tonight: does it clear the Stage-2 retain
 * gate, and which FAILED case's feedback is injected alongside it.
 */
export function evalCaseGate(input: {
  readonly bank: readonly DiscoveryCase[];
  readonly focusCaseId: string;
  readonly gate?: number;
}): InventEval<CaseGateResult> {
  const { bank, focusCaseId, gate } = input;
  if (typeof focusCaseId !== "string" || focusCaseId.length === 0) {
    return fail("focusCaseId is required");
  }
  const bankCheck = validateBank(bank, null);
  if (!bankCheck.ok) return bankCheck;
  const g = gate ?? 0.002;
  if (!Number.isFinite(g) || g < 0) return fail("gate must be finite >= 0");
  const focus = (bank ?? []).find((c) => c.caseId === focusCaseId);
  if (!focus) return fail(`case "${focusCaseId}" is not in the bank`);
  try {
    const retained = retainGate(focus.devScore, g);
    if (retained !== focus.devScore >= g) {
      return fail("retainGate disagrees with devScore >= gate");
    }
    const counter = retrieveCounterCase([...(bank ?? [])], focus);
    if (counter !== null && !Number.isFinite(counter.devScore)) {
      return fail("counter case has a non-finite devScore");
    }
    return {
      ok: true,
      data: {
        devScore: focus.devScore,
        retained,
        counterCaseId: counter ? counter.caseId : null,
        counterCaseDevScore: counter ? counter.devScore : null,
      },
    };
  } catch (e) {
    return fail(`case gate threw: ${describe(e)}`);
  }
}

// ─── Meta-analytics QA ───────────────────────────────────────────────────────

export interface MetricQualityResult {
  readonly D: number;
  readonly S: number;
  readonly chanceDominated: boolean;
}

/**
 * D (discrimination, within-season) and S (stability, across seasons) for one
 * metric family. The bootstrap inside D is driven by a REQUIRED `rand`:
 * discriminationIndex's own default is Math.random.
 */
export function evalMetricQuality(input: {
  readonly teamGameValues: ReadonlyArray<readonly number[]>;
  readonly seasonValues: readonly number[];
  readonly rand: () => number;
  readonly resamples?: number;
}): InventEval<MetricQualityResult> {
  const { teamGameValues, seasonValues, rand, resamples } = input;
  if (!Array.isArray(teamGameValues) || teamGameValues.length < 2) {
    return fail("teamGameValues needs at least two teams");
  }
  for (const games of teamGameValues) {
    if (!Array.isArray(games) || games.length < 2) {
      return fail("each team needs at least two games for a bootstrap variance");
    }
    if (!allFinite(games)) return fail("team game values must be finite");
  }
  if (!Array.isArray(seasonValues) || seasonValues.length < 2) {
    return fail("seasonValues needs at least two seasons");
  }
  if (!allFinite(seasonValues)) return fail("season values must be finite");
  const r = resamples ?? 200;
  if (!Number.isSafeInteger(r) || r < 2 || r > MAX_BOOTSTRAP_RESAMPLES) {
    return fail(`resamples must be an integer in [2, ${MAX_BOOTSTRAP_RESAMPLES}]`);
  }
  const rng = probeRng(rand, "rand");
  if (!rng.ok) return rng;
  try {
    const D = discriminationIndex(
      teamGameValues.map((g) => [...g]),
      r,
      rand,
    );
    const S = stabilityIndex([...seasonValues]);
    if (!Number.isFinite(D)) {
      return fail("discriminationIndex is undefined (fewer than two teams, or zero total variance)");
    }
    if (!Number.isFinite(S)) return fail("stabilityIndex is undefined");
    if (D < 0 || D > 1) return fail(`discrimination index ${D} is outside [0, 1]`);
    if (S <= 0 || S > 1) return fail(`stability index ${S} is outside (0, 1]`);
    return { ok: true, data: { D, S, chanceDominated: D < 0.5 } };
  } catch (e) {
    return fail(`meta-analytics quality threw: ${describe(e)}`);
  }
}

export interface CopulaIndependenceResult {
  readonly names: readonly string[];
  readonly independence: readonly number[];
  readonly redundant: readonly string[];
}

/**
 * I — independence per metric via the Gaussian copula: 1 minus the largest
 * squared correlation any other metric shares with it.
 */
export function evalCopulaIndependence(input: {
  readonly names: readonly string[];
  readonly columns: ReadonlyArray<readonly number[]>;
}): InventEval<CopulaIndependenceResult> {
  const { names, columns } = input;
  if (!Array.isArray(names) || names.length < 2) {
    return fail("names must list at least two metrics; a lone metric cannot be redundant");
  }
  if (!Array.isArray(columns) || columns.length !== names.length) {
    return fail("columns must be aligned with names");
  }
  const n = columns[0]?.length ?? 0;
  if (n < 2) return fail("each metric needs at least two observations");
  const labelSet = new Set<string>();
  for (let j = 0; j < names.length; j++) {
    const name = names[j];
    if (typeof name !== "string" || name.length === 0) return fail("every metric needs a name");
    if (labelSet.has(name)) return fail(`duplicate metric name "${name}"`);
    labelSet.add(name);
    const col = columns[j];
    if (!Array.isArray(col) || col.length !== n) {
      return fail(`metric "${name}" has ${col?.length ?? 0} observations; expected ${n}`);
    }
    if (!allFinite(col)) return fail(`metric "${name}" must be finite`);
  }
  try {
    const independence = independenceIndices(columns.map((c) => [...c]));
    if (independence.length !== names.length) {
      return fail("independenceIndices returned the wrong number of scores");
    }
    const redundant: string[] = [];
    for (let j = 0; j < independence.length; j++) {
      const v = independence[j];
      const name = names[j] ?? "";
      if (v === undefined || !Number.isFinite(v) || v < 0 || v > 1) {
        return fail(`independence for "${name}" is outside [0, 1]`);
      }
      if (v < 0.2) redundant.push(name);
    }
    return { ok: true, data: { names: [...names], independence, redundant } };
  } catch (e) {
    return fail(`independenceIndices threw: ${describe(e)}`);
  }
}

export interface ReliabilityReportResult {
  readonly report: readonly MetricAudit[];
  readonly flagged: readonly string[];
}

/**
 * Rank the audited metrics by their weakest axis and flag the ones that are
 * chance-dominated (D < 0.5) or redundant (I < 0.2).
 */
export function evalMetricReliability(input: {
  readonly metrics: ReadonlyArray<{
    readonly name: string;
    readonly D: number;
    readonly S: number;
    readonly I: number;
  }>;
}): InventEval<ReliabilityReportResult> {
  const { metrics } = input;
  if (!Array.isArray(metrics) || metrics.length === 0) return fail("metrics must be non-empty");
  const seen = new Set<string>();
  for (const m of metrics) {
    if (!m || typeof m.name !== "string" || m.name.length === 0) {
      return fail("every metric needs a name");
    }
    if (seen.has(m.name)) return fail(`duplicate metric "${m.name}"`);
    seen.add(m.name);
    for (const key of ["D", "S", "I"] as const) {
      const v = m[key];
      if (!Number.isFinite(v) || v < 0 || v > 1) {
        return fail(`metric "${m.name}".${key} must be a finite value in [0, 1]`);
      }
    }
  }
  try {
    const report = reliabilityReport(metrics);
    if (report.length !== metrics.length) {
      return fail("reliabilityReport dropped a metric");
    }
    for (let i = 0; i < report.length; i++) {
      const row = report[i];
      if (!row) return fail("reliability report row is missing");
      if (row.flagged && row.flagReason.length === 0) {
        return fail(`metric "${row.name}" is flagged with no reason`);
      }
      if (!row.flagged && row.flagReason.length > 0) {
        return fail(`metric "${row.name}" carries a flag reason but is not flagged`);
      }
      const original = metrics.find((m) => m.name === row.name);
      if (!original) return fail(`reliabilityReport invented a metric "${row.name}"`);
      if (row.D !== original.D || row.S !== original.S || row.I !== original.I) {
        return fail(`reliabilityReport altered the ${row.name} scores`);
      }
      if (i > 0) {
        const prev = report[i - 1];
        const prevKey = prev ? Math.min(prev.D, prev.S, prev.I) : Number.NaN;
        if (Number.isNaN(prevKey)) return fail("reliability report ordering is malformed");
        if (Math.min(row.D, row.S, row.I) < prevKey - 1e-12) {
          return fail("reliability report is not ranked by the weakest axis");
        }
      }
    }
    return {
      ok: true,
      data: { report, flagged: report.filter((r) => r.flagged).map((r) => r.name) },
    };
  } catch (e) {
    return fail(`reliabilityReport threw: ${describe(e)}`);
  }
}

export interface EbShrinkageResult {
  readonly shrunk: readonly number[];
  readonly weights: readonly number[];
  readonly grandMean: number;
}

/**
 * Empirical-Bayes (DerSimonian-Laird) shrinkage of noisy rate metrics toward
 * the grand mean. A near-zero sampling weight must collapse the estimate onto
 * the grand mean, never past it.
 */
export function evalEbShrinkage(input: {
  readonly values: readonly number[];
  readonly samplingVars: readonly number[];
}): InventEval<EbShrinkageResult> {
  const { values, samplingVars } = input;
  if (!Array.isArray(values) || values.length === 0) return fail("values must be non-empty");
  if (!Array.isArray(samplingVars) || samplingVars.length !== values.length) {
    return fail("samplingVars must be aligned with values");
  }
  if (!allFinite(values)) return fail("values must be finite");
  for (let i = 0; i < samplingVars.length; i++) {
    const v = samplingVars[i];
    if (v === undefined || !Number.isFinite(v) || v <= 0) {
      return fail(`samplingVars[${i}] must be finite > 0`);
    }
  }
  try {
    const shrunk = ebShrink([...values], [...samplingVars]);
    if (shrunk.length !== values.length) return fail("ebShrink returned the wrong length");
    const grandMean = values.reduce((a, b) => a + b, 0) / values.length;
    const weights: number[] = [];
    for (let i = 0; i < shrunk.length; i++) {
      const s = shrunk[i];
      const v = values[i];
      if (s === undefined || v === undefined) return fail("ebShrink dropped an estimate");
      if (!Number.isFinite(s)) return fail("ebShrink produced a non-finite estimate");
      const lo = Math.min(grandMean, v);
      const hi = Math.max(grandMean, v);
      if (s < lo - 1e-9 || s > hi + 1e-9) {
        return fail("ebShrink moved an estimate outside the convex hull of its value and the grand mean");
      }
      // Recover the implied weight so a caller can see how hard each metric
      // was pulled; w = (shrunk - grandMean) / (value - grandMean).
      const denom = v - grandMean;
      const w = Math.abs(denom) < 1e-15 ? 0 : (s - grandMean) / denom;
      if (!Number.isFinite(w) || w < -1e-9 || w > 1 + 1e-9) {
        return fail("empirical-Bayes weight is outside [0, 1]");
      }
      weights.push(w);
    }
    return { ok: true, data: { shrunk, weights, grandMean } };
  } catch (e) {
    return fail(`ebShrink threw: ${describe(e)}`);
  }
}

// ─── Expected Drive Value ────────────────────────────────────────────────────

export interface DriveValueResult {
  readonly edv: number;
  readonly gamma: number;
  readonly futureScoreCount: number;
  readonly riskAdjusted: number | null;
}

/**
 * Time-decayed expected drive value of a play, and (when the caller supplies
 * the opponent's next-drive xP) the possession-risk adjusted figure. A null
 * riskAdjusted means "not computed", never "zero".
 */
export function evalDriveExpectedValue(input: {
  readonly futureScores: readonly ScoringPlay[];
  readonly gamma?: number;
  readonly oppNextDriveXP?: number;
  readonly secondsUntilOppDrive?: number;
}): InventEval<DriveValueResult> {
  const { futureScores, gamma, oppNextDriveXP, secondsUntilOppDrive } = input;
  if (!Array.isArray(futureScores)) return fail("futureScores must be an array");
  for (let i = 0; i < futureScores.length; i++) {
    const s = futureScores[i];
    if (!s) return fail(`futureScores[${i}] is missing`);
    if (!Number.isFinite(s.deltaT) || s.deltaT < 0) {
      return fail(`futureScores[${i}].deltaT must be finite >= 0`);
    }
    if (!Number.isFinite(s.xP) || s.xP < 0) return fail(`futureScores[${i}].xP must be finite >= 0`);
  }
  const g = gamma ?? 0.97;
  if (!Number.isFinite(g) || g <= 0 || g > 1) return fail("gamma must be a finite value in (0, 1]");

  const hasRisk = oppNextDriveXP !== undefined || secondsUntilOppDrive !== undefined;
  if (hasRisk && (oppNextDriveXP === undefined || secondsUntilOppDrive === undefined)) {
    return fail("oppNextDriveXP and secondsUntilOppDrive must be supplied together");
  }
  if (oppNextDriveXP !== undefined && (!Number.isFinite(oppNextDriveXP) || oppNextDriveXP < 0)) {
    return fail("oppNextDriveXP must be finite >= 0");
  }
  if (
    secondsUntilOppDrive !== undefined &&
    (!Number.isFinite(secondsUntilOppDrive) || secondsUntilOppDrive < 0)
  ) {
    return fail("secondsUntilOppDrive must be finite >= 0");
  }

  try {
    const value = edv(futureScores.map((s) => ({ deltaT: s.deltaT, xP: s.xP })), g);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return fail("edv is outside the probability range [0, 1]");
    }
    let risk: number | null = null;
    if (oppNextDriveXP !== undefined && secondsUntilOppDrive !== undefined) {
      risk = riskAdjustedEdv(value, oppNextDriveXP, secondsUntilOppDrive, g);
      if (!Number.isFinite(risk)) return fail("riskAdjustedEdv produced a non-finite value");
    }
    return {
      ok: true,
      data: { edv: value, gamma: g, futureScoreCount: futureScores.length, riskAdjusted: risk },
    };
  } catch (e) {
    return fail(`edv threw: ${describe(e)}`);
  }
}

export interface EdvPlay {
  readonly deltaEdv: number;
  readonly actor: PlayActor;
  readonly isTurnover?: boolean;
}

export interface DriveAttributionResult {
  readonly perActor: Readonly<Record<string, number>>;
  readonly creditedTotal: number;
  readonly rawTotal: number;
  readonly turnoverCount: number;
  readonly playCount: number;
}

/**
 * Credit each play's Delta-EDV to its actor (passer/receiver 60/40, rusher
 * full, turnovers double the debit) and total the ledger.
 */
export function evalDriveAttribution(input: {
  readonly plays: readonly EdvPlay[];
}): InventEval<DriveAttributionResult> {
  const { plays } = input;
  if (!Array.isArray(plays) || plays.length === 0) return fail("plays must be non-empty");
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (!p) return fail(`plays[${i}] is missing`);
    if (!Number.isFinite(p.deltaEdv)) return fail(`plays[${i}].deltaEdv must be finite`);
    if (!PLAY_ACTORS.includes(p.actor)) {
      return fail(`plays[${i}].actor must be one of ${PLAY_ACTORS.join(" | ")}`);
    }
    if (p.isTurnover !== undefined && typeof p.isTurnover !== "boolean") {
      return fail(`plays[${i}].isTurnover must be a boolean`);
    }
  }
  try {
    const perActor: Record<string, number> = {};
    let creditedTotal = 0;
    let rawTotal = 0;
    let turnoverCount = 0;
    for (const p of plays) {
      const share = attributeEdv(p.deltaEdv, p.actor, p.isTurnover ?? false);
      let playTotal = 0;
      for (const [actor, value] of Object.entries(share)) {
        if (!Number.isFinite(value)) return fail(`attributeEdv produced a non-finite ${actor} value`);
        perActor[actor] = (perActor[actor] ?? 0) + value;
        playTotal += value;
      }
      const expected = (p.isTurnover ?? false) ? 2 * p.deltaEdv : p.deltaEdv;
      if (Math.abs(playTotal - expected) > 1e-9) {
        return fail(`attributeEdv did not credit a ${p.actor} play its full Delta-EDV`);
      }
      creditedTotal += playTotal;
      rawTotal += p.deltaEdv;
      if (p.isTurnover ?? false) turnoverCount++;
    }
    if (!Number.isFinite(creditedTotal)) return fail("attributed EDV total is not finite");
    return {
      ok: true,
      data: { perActor, creditedTotal, rawTotal, turnoverCount, playCount: plays.length },
    };
  } catch (e) {
    return fail(`attributeEdv threw: ${describe(e)}`);
  }
}

// ─── Bootstrap EPV error scaling ─────────────────────────────────────────────

export interface EpvBootstrapResult {
  readonly se: number;
  readonly threshold: number;
  readonly act: boolean;
  readonly clusterCount: number;
  readonly observationCount: number;
}

/**
 * Cluster-bootstrap standard error of the mean EPV (clusters = drives), turned
 * into an error-scaled decision bar: act only when the estimated edge clears
 * z standard errors of sampling noise.
 */
export function evalEpvBootstrap(input: {
  readonly values: readonly number[];
  readonly clusters: readonly number[];
  readonly estimatedEdge: number;
  readonly baseEdge?: number;
  readonly z?: number;
  readonly nBoot?: number;
  readonly seed?: number;
}): InventEval<EpvBootstrapResult> {
  const { values, clusters, estimatedEdge, baseEdge, z, nBoot, seed } = input;
  if (!Array.isArray(values) || values.length === 0) return fail("values must be non-empty");
  if (!Array.isArray(clusters) || clusters.length !== values.length) {
    return fail("clusters must be aligned with values");
  }
  if (!allFinite(values)) return fail("values must be finite");
  if (!allFinite(clusters)) return fail("clusters must be finite");
  if (!Number.isFinite(estimatedEdge)) return fail("estimatedEdge must be finite");
  const base = baseEdge ?? 0;
  if (!Number.isFinite(base)) return fail("baseEdge must be finite");
  const zq = z ?? 1.64;
  if (!Number.isFinite(zq) || zq <= 0) return fail("z must be finite > 0");
  const n = nBoot ?? 1000;
  if (!Number.isSafeInteger(n) || n < 2 || n > MAX_BOOTSTRAP_ITERS) {
    return fail(`nBoot must be an integer in [2, ${MAX_BOOTSTRAP_ITERS}]`);
  }
  const sd = seed ?? 12345;
  if (!Number.isSafeInteger(sd) || sd < 0) return fail("seed must be a non-negative safe integer");

  try {
    const se = bootstrapSe([...values], [...clusters], n, sd);
    if (!Number.isFinite(se) || se < 0) return fail("bootstrapSe produced a non-finite standard error");
    const threshold = errorScaledThreshold(base, se, zq);
    if (!Number.isFinite(threshold)) return fail("errorScaledThreshold produced a non-finite bar");
    if (Math.abs(threshold - (base + zq * se)) > 1e-9) {
      return fail("errorScaledThreshold disagrees with baseEdge + z * se");
    }
    const act = actOnEpv(estimatedEdge, se, zq);
    if (act !== estimatedEdge >= threshold) {
      return fail("actOnEpv disagrees with estimatedEdge >= threshold");
    }
    return {
      ok: true,
      data: {
        se,
        threshold,
        act,
        clusterCount: new Set(clusters).size,
        observationCount: values.length,
      },
    };
  } catch (e) {
    return fail(`bootstrap EPV scaling threw: ${describe(e)}`);
  }
}
