/**
 * T14 -- THE 50k MCP COGNITIVE ROUTER: the cross-equation Jacobian and the Stein
 * shrinkage, on the DB injury + two-high shell scenario.
 *
 * THE SPEC'S T14 ROW, VERBATIM (Frontier GSE 50k-Signal Causal Reasoning Engine, Table 5):
 *
 *   "50,000-Formula Cross-Equation Jacobian & Stein Shrinkage: Verifies that simultaneous
 *    activation of DB injury (P-SEA-DEN-004) and two-high shell retreat (P-SEA-DEN-010)
 *    triggers negative perimeter cross-partial coupling Gamma_ij < 0 and reallocates target
 *    share to the TE/RB seam (P-SEA-DEN-015)."
 *
 * AND THE SPEC'S STEP 7 (Table 6), which T14 is part of:
 *
 *   "Step 7 -- 50k MCP Router, Dark Proxies & Surface Fence | src/mcp/mcp-cognitive-router.ts
 *    src/features/feature-matrix.ts src/bridge/non-stat-situational-compiler.ts
 *    apps/web/lib/fences/no-raw-ngs-fence.ts | Wire the 4-Stage Coarse-to-Fine MCP Funnel,
 *    Cross-Equation Symbolic Jacobian, and Stein-Belief shrinkage (spec section 3.3); wire
 *    PIT dark-source proxies and SPEC-C compiler (section 4.2); enforce no-raw-ngs-fence.ts
 *    across all 13 internal routes (T1, T14, T15 green)."
 *
 * WHY THE HEADLINE TEST ASSERTS TWO THINGS AND NOT ONE. "Gamma_ij < 0" on its own is a
 * statement about a number. The spec's claim is about a MECHANISM: the two concurrent
 * mechanisms dampen each other AND the target share moves to the TE/RB seam. A sign
 * assertion alone would pass for a router that computed a negative coupling for a
 * completely unrelated reason, or for one that computed the coupling and then never used
 * it. So the headline test asserts the sign AND the reallocation AND the amount, and it
 * asserts that the reallocation is CAUSED BY the dampening pair.
 *
 * WHY THE STEIN SHRINKAGE IS NOT DECORATIVE. Two claims are made about it, and they are
 * different claims:
 *
 *   1. With three or more concurrent interactions the cross-delta is strictly smaller than
 *      the unshrunk cross-delta, and a large bootstrap trace deflates it to zero.
 *   2. The factor is EXACTLY 1 when there are fewer than three interactions -- including
 *      for a REINFORCING pair. A reinforcing pair that is deflated would mean the
 *      shrinkage is a proxy for the sign of gamma, and the whole "dampen and redirect"
 *      reading would collapse into "shrink the negative ones".
 *
 * And a third, sharper one: a reinforcing TRIPLE (three concurrent mechanisms whose
 * coupling is reinforcing) IS shrunk, by the same rule, with the same formula. That is the
 * assertion that pins the factor to the spec's formula rather than to the sign of gamma.
 *
 * THE BOUNDARIES ARE LITERALS. Every threshold in this file is written as the number the
 * spec names, not as the constant the module exports. A test written as
 * `expect(n).toBe(SAMPLE_FLOOR)` proves nothing: move the constant and the test moves
 * with it, still passing. So the sample floor is 30 and 29, the recall floor is 0.992 and
 * 0.9919, the layer multiplier is 1/ln(24), the promotion clip is 0.05 and 3.00.
 *
 * THE CORPUS IS SCALED, AND HERE IS EXACTLY HOW. The funnel's DESIGN TARGETS are the
 * spec's: 50,000 registered formulas, ~2,500 after Stage A, 250 after Stage B, 50 active
 * mechanisms. The fixture corpus is 1,200 records with 300 survivors, because a real
 * 2,500-node HNSW build costs minutes per mutation round and the sweep runs this gate
 * nine times. The DESIGN TARGETS are asserted as constants; the funnel's BEHAVIOUR is
 * asserted on the scaled corpus. Nothing in this file pretends the scaled corpus is the
 * 50,000-premise one.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CONTEXT_MASK_BITS,
  CONTEXT_MASK_WORD_COUNT,
  ContextMask,
  SAMPLE_FLOOR,
  SIGNAL_FAMILY_COUNT,
  familyIndex,
} from "../src/features/feature-matrix.js";
import {
  SPEC_C_COMPILER_ID,
  compileNonStatSituational,
  compileNonStatSituationalBatch,
  type DarkSourceProxy,
  type TypedOperator,
} from "../src/bridge/non-stat-situational-compiler.js";
import {
  ACTIVE_MECHANISM_TARGET,
  CORPUS_SIZE_TARGET,
  EF_SEARCH_LIVE,
  EF_SEARCH_PRE_GAME,
  HNSW_EF_CONSTRUCTION,
  HNSW_LAYER_MULTIPLIER,
  HNSW_M,
  PROMOTION_WEIGHT_MAX,
  PROMOTION_WEIGHT_MIN,
  RECALL_FLOOR_AT_20,
  SPECTRAL_BANDS,
  STAGE_A_PREMISE_TARGET,
  TOP_K,
  HnswIndex,
  certifyRecallAt20,
  runCognitiveRouter,
  stageAContextBitmask,
  stageBHnswZoomIn,
  stageCbridgeSpectralRouting,
  stageDCrossEquationComposition,
  steinShrinkageFactor,
  type CorpusPremise,
  type StageDMechanism,
} from "../src/mcp/mcp-cognitive-router.js";

// ---------------------------------------------------------------------------
// THE PREMISE IDS, LITERALLY
// ---------------------------------------------------------------------------

/** The spec's DB injury premise. */
const DB_INJURY = "P-SEA-DEN-004";
/** The spec's two-high shell retreat premise. */
const TWO_HIGH_SHELL = "P-SEA-DEN-010";
/** The spec's TE/RB seam: where the target share is reallocated TO. */
const TE_RB_SEAM = "P-SEA-DEN-015";
/** A third concurrent mechanism, on a different target: it makes the interaction count 4. */
const SEAM_MECHANISM = "P-SEA-DEN-021";
/** The reinforcing partner: same target as the DB injury, same high-frequency direction. */
const MOTION_STRESS = "P-SEA-DEN-022";
/** The fourth rare-direction premise. It exists so the rare axis is exactly orthogonal. */
const RARE_PARTNER = "P-SEA-DEN-023";

/** The zone the perimeter mechanisms act on. */
const ZONE_PERIMETER = "PERIMETER_WR";
/** The zone the dampening coupling redirects the share INTO. */
const ZONE_SEAM = "TE_RB_SEAM";
/** The zone the first-order effects park the share in. */
const ZONE_OTHER = "OTHER";

/** The target-share vector before the reallocation. Sums to 1. */
const BASE_SHARE: Readonly<Record<string, number>> = {
  [ZONE_PERIMETER]: 0.3,
  [ZONE_SEAM]: 0.45,
  [ZONE_OTHER]: 0.25,
};

/** The rare-axis amplitude. The high-frequency embedding of a rare premise is +/- this. */
const RARE_AMPLITUDE = 0.05;

// ---------------------------------------------------------------------------
// THE FIXTURE
// ---------------------------------------------------------------------------

/** A deterministic 24-bit LCG, matching the repo's own generators. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state >>> 8) / 16777216;
  };
}

/** The number of records in the fixture corpus. */
const CORPUS_SIZE = 1200;
/** The cluster members that survive Stage A. */
const CLUSTER_MEMBERS = 300;
/** The records that survive Stage A: the cluster members plus the TE/RB seam premise. */
const SURVIVOR_COUNT = CLUSTER_MEMBERS + 1;
/** The number of clusters the survivors are spread over. */
const CLUSTER_COUNT = 30;
/** The width of the dominant subspace the id channel lives in. */
const DOMINANT_DIM = 43;
/** The dimension of the rare axis that carries the high-frequency identity. */
const RARE_DIM = 63;

/** The active families. WEATHER is deliberately NOT active: it prunes a block of the corpus. */
const ACTIVE_FAMILIES: readonly string[] = [
  "INJURY",
  "SCHEME",
  "SITUATIONAL",
  "TACTIC",
  "GAME_SCRIPT",
  "ROSTER",
  "POSITION",
  "USAGE",
  "MARKET",
  "EFFICIENCY",
];

/**
 * The id channel of one premise.
 *
 * The structure is deliberate and it is what makes the high-frequency band EXACT rather
 * than approximately right:
 *
 *   dims 0..42   the dominant subspace: the cluster structure plus a within-cluster
 *                perturbation. Its 43 singular values are all far above the rare axis's.
 *   dims 43..62  ZERO for every premise.
 *   dim 63       the RARE AXIS. Exactly four premises carry a value on it, with signs
 *                that sum to zero, and they share an IDENTICAL dominant vector.
 *
 * The consequence: the rare-axis column is EXACTLY orthogonal to the dominant columns
 * (the four premises' dominant rows are identical, so the sign-weighted sum of their
 * dominant rows is exactly zero), so the channel's Gram matrix is exactly block
 * diagonal, so the SVD is exact, so the high band's principal component IS the rare axis
 * and the high-frequency embedding of a rare premise is exactly +/- the amplitude on that
 * axis. The sign of the coupling is therefore MEASURED, not asserted by the fixture.
 */
function idEmbedding(
  dominant: readonly number[],
  rareValue: number,
): number[] {
  const embedding = new Array<number>(64).fill(0);
  for (let index = 0; index < DOMINANT_DIM; index += 1) {
    embedding[index] = dominant[index] ?? 0;
  }
  embedding[RARE_DIM] = rareValue;
  return embedding;
}

/** The compiled situational operator for a dark source. */
function darkProxy(
  sourceId: string,
  premiseId: string,
  familyId: string,
  kind: DarkSourceProxy["kind"],
  beta: readonly number[],
  value: number,
): DarkSourceProxy {
  return {
    sourceId,
    premiseId,
    familyId,
    asOf: "2026-10-20T18:00:00.000Z",
    observedAt: "2026-10-20T17:55:00.000Z",
    value,
    kind,
    beta,
    statistical: false,
    provenance: "PIT_DARK_PROXY",
  };
}

/** The four compiled operators the mechanism fixtures use. */
const COMPILED: {
  readonly dbInjury: TypedOperator;
  readonly twoHigh: TypedOperator;
  readonly motion: TypedOperator;
  readonly seam: TypedOperator;
} = (() => {
  const dbInjury = compileNonStatSituational(
    darkProxy("SRC-DB-INJURY", DB_INJURY, "INJURY", "SATURATING", [0, 0.6], 1),
  );
  const twoHigh = compileNonStatSituational(
    darkProxy("SRC-TWO-HIGH", TWO_HIGH_SHELL, "SCHEME", "SATURATING", [0, 0.5], 1),
  );
  const motion = compileNonStatSituational(
    darkProxy("SRC-MOTION", MOTION_STRESS, "TACTIC", "LINEAR", [0, 0.4], 1),
  );
  const seam = compileNonStatSituational(
    darkProxy("SRC-SEAM", SEAM_MECHANISM, "SITUATIONAL", "LINEAR", [0, 0.3], 1),
  );
  if (!dbInjury.ok || !twoHigh.ok || !motion.ok || !seam.ok) {
    throw new Error(`the fixture's operators did not compile: ${JSON.stringify([dbInjury, twoHigh, motion, seam])}`);
  }
  return {
    dbInjury: dbInjury.operator,
    twoHigh: twoHigh.operator,
    motion: motion.operator,
    seam: seam.operator,
  };
})();

/** The fixture corpus, the query, and the mask. */
interface Fixture {
  readonly corpus: readonly CorpusPremise[];
  readonly query: readonly number[];
  readonly mask: ContextMask;
  readonly behaviorZ: Readonly<Record<string, number>>;
  readonly promotionWeights: Readonly<Record<string, number>>;
}

function buildFixture(): Fixture {
  const rand = makeRng(20261020);
  const corpus: CorpusPremise[] = [];

  // THE CLUSTER CENTROIDS. The dominant subspace is 43-dimensional; the centroid is
  // shared by every premise in the cluster, so the rare-axis column's orthogonality
  // construction below is exact.
  const centroids: number[][] = [];
  for (let cluster = 0; cluster < CLUSTER_COUNT; cluster += 1) {
    const centroid: number[] = [];
    for (let component = 0; component < DOMINANT_DIM; component += 1) centroid.push(rand() * 2 - 1);
    centroids.push(centroid);
  }

  const absentStart = 0;
  const floorStart = absentStart + 600;
  const survivorStart = floorStart + 300;

  // 600 records whose conditioning family is not in the mask.
  for (let index = absentStart; index < floorStart; index += 1) {
    corpus.push({
      premiseId: `P-ABSENT-${String(index).padStart(4, "0")}`,
      formulaId: `F-${String(index).padStart(4, "0")}`,
      conditioningFamilies: ["WEATHER", "SITUATIONAL"],
      sampleSizes: { WEATHER: 400, SITUATIONAL: 400 },
    });
  }
  // 300 records whose conditioning cell is one observation under the floor.
  for (let index = floorStart; index < survivorStart; index += 1) {
    corpus.push({
      premiseId: `P-THIN-${String(index).padStart(4, "0")}`,
      formulaId: `F-${String(index).padStart(4, "0")}`,
      conditioningFamilies: ["SITUATIONAL", "TACTIC"],
      sampleSizes: { SITUATIONAL: 29, TACTIC: 400 },
    });
  }

  // THE SURVIVORS. Four of them share the cluster-0 centroid EXACTLY and carry the rare
  // axis with signs that sum to zero.
  const rareSigns = new Map<number, number>([
    [0, RARE_AMPLITUDE],
    [1, -RARE_AMPLITUDE],
    [2, RARE_AMPLITUDE],
    [3, -RARE_AMPLITUDE],
  ]);
  // Offsets 0..3 carry the rare axis; offset 4 is the seam mechanism, which sits on the
  // same cluster centroid but carries NO rare-axis value, so it does not disturb the
  // orthogonality that makes the high-frequency band exact.
  const specialIds = [DB_INJURY, TWO_HIGH_SHELL, MOTION_STRESS, RARE_PARTNER, SEAM_MECHANISM];
  const specialIndex = new Map<number, string>();
  specialIds.forEach((premiseId, offset) => specialIndex.set(offset, premiseId));

  for (let offset = 0; offset < CLUSTER_MEMBERS; offset += 1) {
    const cluster = Math.floor(offset / (CLUSTER_MEMBERS / CLUSTER_COUNT));
    const centroid = centroids[cluster] as number[];
    const sharesCentroidExactly = offset < 5;
    const dominant = sharesCentroidExactly
      ? [...centroid]
      : centroid.map((value) => value + (rand() * 2 - 1) * 0.2);
    const rareValue = rareSigns.get(offset) ?? 0;
    const embedding = idEmbedding(dominant, rareValue);
    const premiseId = specialIndex.get(offset) ?? `P-GEN-${String(offset).padStart(4, "0")}`;
    const conditioningFamilies =
      offset === 0
        ? ["INJURY", "SITUATIONAL"]
        : offset === 1
          ? ["SCHEME", "SITUATIONAL"]
          : ["SITUATIONAL", "TACTIC"];

    const record: {
      premiseId: string;
      formulaId: string;
      conditioningFamilies: readonly string[];
      sampleSizes: Record<string, number>;
      embedding: number[];
      features: number[];
      textEmbedding: number[];
      behaviorZ: number;
      promotionWeight: number;
      target?: string;
      targetParents?: string[];
      effectiveWeight?: number;
      deltaX?: number;
      outcomeDelta?: number;
      crossPartials?: Record<string, number>;
      shareEffect?: Record<string, number>;
      dependsOn?: string[];
      operator?: TypedOperator;
    } = {
      premiseId,
      formulaId: `F-${String(offset).padStart(4, "0")}`,
      conditioningFamilies,
      sampleSizes: { ...Object.fromEntries(conditioningFamilies.map((family) => [family, 30 + Math.floor(rand() * 200)])) },
      embedding,
      features: embedding,
      textEmbedding: embedding,
      behaviorZ: 0,
      promotionWeight: 1,
    };

    if (premiseId === DB_INJURY) {
      record.target = ZONE_PERIMETER;
      record.targetParents = [];
      record.effectiveWeight = 0.8;
      record.deltaX = 1;
      record.outcomeDelta = 0.05;
      record.crossPartials = { [TWO_HIGH_SHELL]: 0.05, [MOTION_STRESS]: 0.0375 };
      record.shareEffect = { [ZONE_PERIMETER]: -0.01, [ZONE_OTHER]: 0.01 };
      record.dependsOn = [];
      record.operator = COMPILED.dbInjury;
      record.behaviorZ = 2;
      record.promotionWeight = 3;
    } else if (premiseId === TWO_HIGH_SHELL) {
      record.target = ZONE_PERIMETER;
      record.targetParents = [];
      record.effectiveWeight = 0.6;
      record.deltaX = 1;
      record.outcomeDelta = 0.04;
      record.crossPartials = { [DB_INJURY]: 0.05, [MOTION_STRESS]: 0.025 };
      record.shareEffect = { [ZONE_PERIMETER]: -0.006, [ZONE_OTHER]: 0.006 };
      record.dependsOn = [DB_INJURY];
      record.operator = COMPILED.twoHigh;
      record.behaviorZ = 1.5;
      record.promotionWeight = 3;
    } else if (premiseId === MOTION_STRESS) {
      record.target = ZONE_PERIMETER;
      record.targetParents = [];
      record.effectiveWeight = 0.4;
      record.deltaX = 1;
      record.outcomeDelta = 0.03;
      record.crossPartials = { [DB_INJURY]: 0.0375, [TWO_HIGH_SHELL]: 0.025 };
      record.shareEffect = { [ZONE_PERIMETER]: -0.006, [ZONE_OTHER]: 0.006 };
      record.dependsOn = [TWO_HIGH_SHELL];
      record.operator = COMPILED.motion;
      record.behaviorZ = 1;
      record.promotionWeight = 2;
    } else if (premiseId === SEAM_MECHANISM) {
      record.target = ZONE_SEAM;
      record.targetParents = [];
      record.effectiveWeight = 0.5;
      record.deltaX = 1;
      record.outcomeDelta = 0.01;
      record.crossPartials = {};
      record.shareEffect = { [ZONE_SEAM]: -0.01, [ZONE_OTHER]: 0.01 };
      record.dependsOn = [];
      record.operator = COMPILED.seam;
      record.behaviorZ = 0.5;
      record.promotionWeight = 1.5;
    } else if (premiseId === TE_RB_SEAM) {
      record.behaviorZ = 0.5;
      record.promotionWeight = 1.5;
    }

    corpus.push(record as CorpusPremise);
  }

  // The TE/RB seam premise is a corpus member too, in cluster 0.
  const seamEmbedding = idEmbedding(
    (centroids[0] as number[]).map((value) => value + (rand() * 2 - 1) * 0.2),
    0,
  );
  corpus.push({
    premiseId: TE_RB_SEAM,
    formulaId: "F-SEAM-TARGET",
    conditioningFamilies: ["SITUATIONAL", "POSITION"],
    sampleSizes: { SITUATIONAL: 120, POSITION: 120 },
    embedding: seamEmbedding,
    features: seamEmbedding,
    textEmbedding: seamEmbedding,
    behaviorZ: 0.5,
    promotionWeight: 1.5,
  });

  const query = idEmbedding(centroids[0] as number[], 0);

  const behaviorZ: Record<string, number> = {};
  const promotionWeights: Record<string, number> = {};
  for (const premise of corpus) {
    if (premise.behaviorZ !== undefined) behaviorZ[premise.premiseId] = premise.behaviorZ;
    if (premise.promotionWeight !== undefined) promotionWeights[premise.premiseId] = premise.promotionWeight;
  }

  return {
    corpus,
    query,
    mask: ContextMask.fromFamilyIds(ACTIVE_FAMILIES),
    behaviorZ,
    promotionWeights,
  };
}

const FIXTURE = buildFixture();

/** Build the HNSW index over Stage A's survivors. */
function buildIndex(survivors: readonly CorpusPremise[]): HnswIndex {
  const index = new HnswIndex({ dim: 64 });
  survivors.forEach((premise, id) => index.insert(id, premise.embedding ?? []));
  return index;
}

/** The high-frequency embedding of a premise, as the band-2 principal coordinates. */
function rareHighEmbedding(sign: number): readonly number[] {
  const embedding = new Array<number>(21).fill(0);
  embedding[0] = sign * RARE_AMPLITUDE;
  return embedding;
}

/** The four concurrent mechanisms, with explicit high-frequency embeddings. */
function mechanismSet(include: readonly string[]): StageDMechanism[] {
  const all: Record<string, StageDMechanism> = {
    [DB_INJURY]: {
      premiseId: DB_INJURY,
      target: ZONE_PERIMETER,
      targetParents: [],
      effectiveWeight: 0.8,
      deltaX: 1,
      outcomeDelta: 0.05,
      partial: COMPILED.dbInjury.dOutDIn,
      crossPartials: { [TWO_HIGH_SHELL]: 0.05, [MOTION_STRESS]: 0.0375 },
      highEmbedding: rareHighEmbedding(1),
      shareEffect: { [ZONE_PERIMETER]: -0.01, [ZONE_OTHER]: 0.01 },
      dependsOn: [],
    },
    [TWO_HIGH_SHELL]: {
      premiseId: TWO_HIGH_SHELL,
      target: ZONE_PERIMETER,
      targetParents: [],
      effectiveWeight: 0.6,
      deltaX: 1,
      outcomeDelta: 0.04,
      partial: COMPILED.twoHigh.dOutDIn,
      crossPartials: { [DB_INJURY]: 0.05, [MOTION_STRESS]: 0.025 },
      highEmbedding: rareHighEmbedding(-1),
      shareEffect: { [ZONE_PERIMETER]: -0.006, [ZONE_OTHER]: 0.006 },
      dependsOn: [DB_INJURY],
    },
    [SEAM_MECHANISM]: {
      premiseId: SEAM_MECHANISM,
      target: ZONE_SEAM,
      targetParents: [],
      effectiveWeight: 0.5,
      deltaX: 1,
      outcomeDelta: 0.01,
      partial: COMPILED.seam.dOutDIn,
      crossPartials: {},
      highEmbedding: new Array<number>(21).fill(0),
      shareEffect: { [ZONE_SEAM]: -0.01, [ZONE_OTHER]: 0.01 },
      dependsOn: [],
    },
    [MOTION_STRESS]: {
      premiseId: MOTION_STRESS,
      target: ZONE_PERIMETER,
      targetParents: [],
      effectiveWeight: 0.4,
      deltaX: 1,
      outcomeDelta: 0.03,
      partial: COMPILED.motion.dOutDIn,
      crossPartials: { [DB_INJURY]: 0.0375, [TWO_HIGH_SHELL]: 0.025 },
      highEmbedding: rareHighEmbedding(1),
      shareEffect: { [ZONE_PERIMETER]: -0.006, [ZONE_OTHER]: 0.006 },
      dependsOn: [TWO_HIGH_SHELL],
    },
  };
  return include.map((premiseId) => all[premiseId] as StageDMechanism);
}

/** The bootstrap trace the fixture uses. Small, so the shrinkage is partial, not total. */
const BOOTSTRAP_TRACE = 0.00005;

// ---------------------------------------------------------------------------
// T14
// ---------------------------------------------------------------------------

describe("T14 -- the 50k MCP cognitive router: cross-equation Jacobian and Stein shrinkage", () => {
  /**
   * THE SPEC'S DESIGN TARGETS, AS LITERALS.
   *
   * The funnel is specified as 50,000 -> ~2,500 -> 250 -> 50, over an HNSW with m = 24,
   * ef_construction = 200 and a layer multiplier of 1/ln(24), with a Recall@20 floor of
   * 0.992 and a promotion weight clipped to [0.05, 3.00].
   */
  it("T14: the router publishes the spec's funnel constants and thresholds", () => {
    expect(CORPUS_SIZE_TARGET).toBe(50000);
    expect(STAGE_A_PREMISE_TARGET).toBe(2500);
    expect(TOP_K).toBe(250);
    expect(ACTIVE_MECHANISM_TARGET).toBe(50);
    expect(HNSW_M).toBe(24);
    expect(HNSW_EF_CONSTRUCTION).toBe(200);
    expect(EF_SEARCH_LIVE).toBe(64);
    expect(EF_SEARCH_PRE_GAME).toBe(128);
    expect(RECALL_FLOOR_AT_20).toBe(0.992);
    expect(PROMOTION_WEIGHT_MIN).toBe(0.05);
    expect(PROMOTION_WEIGHT_MAX).toBe(3.0);
    // The layer multiplier is 1/ln(24) ~= 0.3147.
    expect(HNSW_LAYER_MULTIPLIER).toBe(1 / Math.log(24));
    expect(HNSW_LAYER_MULTIPLIER).toBeCloseTo(0.3147, 4);
    // The three contiguous spectral bands are 22 / 21 / 21.
    expect(SPECTRAL_BANDS.map((band) => band.width)).toEqual([22, 21, 21]);
    expect(SPECTRAL_BANDS.map((band) => band.label)).toEqual(["low", "mid", "high"]);
  });

  /**
   * THE MASK IS A REAL BITMASK, NOT AN ARRAY OF BOOLEANS.
   *
   * The spec says 279 families and a 288-bit mask; the mask is wider than the family list
   * on purpose, and the difference is documented rather than papered over. 288 = 9 x 32
   * exactly, so the mask is exposed as nine 32-bit words, and the headroom (bits 279..287)
   * is addressable but is never set by a registered family.
   */
  it("T14: the 288-bit context mask is a real bitmask over 279 families", () => {
    expect(SIGNAL_FAMILY_COUNT).toBe(279);
    expect(CONTEXT_MASK_BITS).toBe(288);
    expect(CONTEXT_MASK_WORD_COUNT).toBe(9);
    expect(SAMPLE_FLOOR).toBe(30);

    // The mask's storage is a bigint, not a boolean array.
    const mask = ContextMask.fromFamilyIds(["INJURY", "SCHEME"]);
    expect(typeof mask.toBigInt()).toBe("bigint");
    expect(mask.toBigInt()).toBe((1n << BigInt(familyIndex("INJURY"))) | (1n << BigInt(familyIndex("SCHEME"))));
    // And it is exposed as NINE 32-bit words, not as 288 booleans.
    const words = mask.toWords32();
    expect(words).toHaveLength(9);
    expect(Array.isArray(words[0])).toBe(false);
    expect(mask.activeCount).toBe(2);
    expect(mask.hasFamily("INJURY")).toBe(true);
    expect(mask.hasFamily("WEATHER")).toBe(false);

    // The reserved headroom is addressable and writable.
    const wide = mask.withBit(287);
    expect(wide.toWords32()).toHaveLength(9);
    expect((wide.toWords32()[8] as number) >>> 0).toBe(0x80000000);
    // And a bit OUTSIDE the 288-bit mask is refused, not silently ignored.
    expect(() => mask.withBit(288)).toThrow();
    expect(() => ContextMask.fromBitIndices([288])).toThrow();
    // An unregistered family has no bit, and asking for one is an error, not a miss.
    expect(familyIndex("NOT_A_FAMILY")).toBe(-1);
    expect(() => ContextMask.fromFamilyIds(["NOT_A_FAMILY"])).toThrow();
  });

  /**
   * STAGE A. THE SAMPLE FLOOR IS 30 AND IT IS INCLUSIVE.
   *
   * N = 30 passes. N = 29 is pruned. Both numbers are literals: a test written against the
   * exported constant would move with the constant and prove nothing.
   */
  it("T14: Stage A prunes on the 288-bit mask and on the sample floor of 30", () => {
    const corpus: CorpusPremise[] = [
      {
        premiseId: "P-AT-FLOOR",
        formulaId: "F-AT-FLOOR",
        conditioningFamilies: ["INJURY"],
        sampleSizes: { INJURY: 30 },
      },
      {
        premiseId: "P-UNDER-FLOOR",
        formulaId: "F-UNDER-FLOOR",
        conditioningFamilies: ["INJURY"],
        sampleSizes: { INJURY: 29 },
      },
      {
        premiseId: "P-ABSENT-FAMILY",
        formulaId: "F-ABSENT-FAMILY",
        conditioningFamilies: ["WEATHER"],
        sampleSizes: { WEATHER: 400 },
      },
    ];
    const result = stageAContextBitmask({
      corpus,
      context: ContextMask.fromFamilyIds(["INJURY"]),
      query: new Array<number>(64).fill(0),
    });

    expect(result.survivors.map((premise) => premise.premiseId)).toEqual(["P-AT-FLOOR"]);
    expect(result.prunedSampleFloor).toContain("P-UNDER-FLOOR");
    expect(result.prunedAbsent).toContain("P-ABSENT-FAMILY");
    expect(result.prunedSampleFloor).not.toContain("P-AT-FLOOR");
  });

  /**
   * STAGE A ON THE WHOLE FIXTURE. The funnel's first hop prunes the absent and the thin
   * records, and the survivors are the ones the HNSW is built over.
   */
  it("T14: Stage A keeps the conditioned, well-sampled premises and prunes the rest", () => {
    const result = stageAContextBitmask({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
    });
    expect(result.total).toBe(CORPUS_SIZE + 1);
    expect(result.prunedAbsent.length).toBe(600);
    expect(result.prunedSampleFloor.length).toBe(300);
    expect(result.kept).toBe(SURVIVOR_COUNT);
    // The spec's own premises survive the pre-filter.
    const kept = result.survivors.map((premise) => premise.premiseId);
    expect(kept).toContain(DB_INJURY);
    expect(kept).toContain(TWO_HIGH_SHELL);
    // The GIN produced a context embedding for every survivor.
    expect(result.contextEmbeddings.size).toBe(SURVIVOR_COUNT);
    for (const survivor of result.survivors) {
      expect((result.contextEmbeddings.get(survivor.premiseId) ?? []).length).toBe(64);
    }
  });

  /**
   * STAGE B. THE RECALL FLOOR IS ENFORCED, AND IT IS A REFUSAL.
   *
   * 0.992 is admitted. 0.9919 -- one ten-thousandth under -- is refused, with the measured
   * number in the reason. And with NO certification at all the stage refuses too, because
   * an unverifiable floor is not a floor.
   */
  it("T14: Stage B refuses a zoom-in that cannot clear the 0.992 Recall@20 floor", () => {
    const stageA = stageAContextBitmask({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
    });
    const index = buildIndex(stageA.survivors);

    const measured = certifyRecallAt20(
      index,
      stageA.survivors.map((premise) => premise.embedding ?? []),
      EF_SEARCH_PRE_GAME,
    );
    // THE MEASUREMENT IS REAL: it is the HNSW's top-20 against the brute-force top-20.
    expect(measured.queries).toBe(SURVIVOR_COUNT);
    expect(measured.recallAt20).toBeGreaterThanOrEqual(0.992);
    expect(measured.passed).toBe(true);

    // AT THE FLOOR: admitted.
    const atFloor = stageBHnswZoomIn({
      survivors: stageA.survivors,
      index,
      query: FIXTURE.query,
      certification: { ...measured, recallAt20: 0.992 },
    });
    expect(atFloor.refused).toBe(false);
    expect(atFloor.candidateIds.length).toBe(TOP_K);
    expect(atFloor.efSearch).toBe(EF_SEARCH_PRE_GAME);
    expect(atFloor.m).toBe(24);
    expect(atFloor.efConstruction).toBe(200);
    expect(atFloor.layerMultiplier).toBe(1 / Math.log(24));

    // JUST BELOW THE FLOOR: refused, with the measurement in the reason.
    const belowFloor = stageBHnswZoomIn({
      survivors: stageA.survivors,
      index,
      query: FIXTURE.query,
      certification: { ...measured, recallAt20: 0.9919 },
    });
    expect(belowFloor.refused).toBe(true);
    expect(belowFloor.candidateIds.length).toBe(0);
    expect(belowFloor.refusalReason).toContain("0.9919");
    expect(belowFloor.refusalReason).toContain("0.992");

    // NO CERTIFICATION: refused, because the floor cannot be verified.
    const uncertified = stageBHnswZoomIn({
      survivors: stageA.survivors,
      index,
      query: FIXTURE.query,
    });
    expect(uncertified.refused).toBe(true);
    expect(uncertified.refusalReason).toContain("certification");
  });

  /**
   * STAGE B. THE LIVE AND PRE-GAME SEARCH WIDTHS ARE DIFFERENT, AND BOTH ARE HONEST.
   */
  it("T14: Stage B uses ef_search 64 in-play and 128 pre-game", () => {
    const stageA = stageAContextBitmask({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
    });
    const index = buildIndex(stageA.survivors);
    const measured = certifyRecallAt20(index, [FIXTURE.query], EF_SEARCH_PRE_GAME);
    const live = stageBHnswZoomIn({
      survivors: stageA.survivors,
      index,
      query: FIXTURE.query,
      live: true,
      certification: measured,
    });
    const preGame = stageBHnswZoomIn({
      survivors: stageA.survivors,
      index,
      query: FIXTURE.query,
      live: false,
      certification: measured,
    });
    expect(live.efSearch).toBe(64);
    expect(preGame.efSearch).toBe(128);
    expect(live.refused).toBe(false);
    expect(preGame.refused).toBe(false);
  });

  /**
   * STAGE C. THE PROMOTION WEIGHT IS CLIPPED AT BOTH ENDS.
   *
   * 0.05 stays 0.05. 3.00 stays 3.00. And 0.01 and 9.0 are pulled back to the bounds. A
   * settlement-learned weight that runs away must not become unbounded influence in the
   * logarithmic term.
   */
  it("T14: Stage C clips the settlement-learned promotion weight to [0.05, 3.00]", () => {
    const corpus: CorpusPremise[] = [
      { premiseId: "P-LOW", formulaId: "F-LOW", conditioningFamilies: ["INJURY"], sampleSizes: { INJURY: 30 } },
      { premiseId: "P-AT-MIN", formulaId: "F-AT-MIN", conditioningFamilies: ["INJURY"], sampleSizes: { INJURY: 30 } },
      { premiseId: "P-AT-MAX", formulaId: "F-AT-MAX", conditioningFamilies: ["INJURY"], sampleSizes: { INJURY: 30 } },
      { premiseId: "P-HIGH", formulaId: "F-HIGH", conditioningFamilies: ["INJURY"], sampleSizes: { INJURY: 30 } },
    ];
    const embeddings = new Map<string, readonly number[]>();
    corpus.forEach((premise, index) => {
      const vector = new Array<number>(64).fill(0);
      vector[index] = 1;
      embeddings.set(premise.premiseId, vector);
    });
    const result = stageCbridgeSpectralRouting({
      candidates: corpus.map((premise) => ({ ...premise, embedding: embeddings.get(premise.premiseId) ?? [] })),
      query: new Array<number>(64).fill(0),
      contextEmbeddings: new Map<string, readonly number[]>(),
      promotionWeights: {
        "P-LOW": 0.01,
        "P-AT-MIN": 0.05,
        "P-AT-MAX": 3.0,
        "P-HIGH": 9,
      },
    });

    expect(result.promotionWeights.get("P-LOW")).toBe(0.05);
    expect(result.promotionWeights.get("P-AT-MIN")).toBe(0.05);
    expect(result.promotionWeights.get("P-AT-MAX")).toBe(3.0);
    expect(result.promotionWeights.get("P-HIGH")).toBe(3.0);
  });

  /**
   * THE HEADLINE. DB INJURY + TWO-HIGH SHELL.
   *
   * THE SPEC'S CLAIM, IN TWO HALVES, AND BOTH ARE ASSERTED:
   *
   *   1. the cross-partial coupling between the two concurrent perimeter mechanisms is
   *      NEGATIVE -- they dampen each other rather than reinforce;
   *   2. the target share is REALLOCATED to the TE/RB seam, P-SEA-DEN-015.
   *
   * The reallocation is asserted as a MEASUREMENT, not as a flag: the seam's share is
   * strictly larger than the first-order share, the perimeter's is strictly smaller, the
   * amount that moved is positive, and the reallocation is attributed to the dampening
   * pair. A router that computed a negative gamma and then never moved any share would
   * fail this test.
   */
  it("T14: DB injury plus two-high shell gives a NEGATIVE coupling AND reallocates the share to the TE/RB seam", () => {
    const stageA = stageAContextBitmask({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
    });
    const index = buildIndex(stageA.survivors);
    const measured = certifyRecallAt20(
      index,
      stageA.survivors.map((premise) => premise.embedding ?? []),
      EF_SEARCH_PRE_GAME,
    );
    const routed = runCognitiveRouter({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
      certification: measured,
      live: false,
      behaviorZ: FIXTURE.behaviorZ,
      promotionWeights: FIXTURE.promotionWeights,
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });

    expect(routed.refused).toBe(false);
    const stageD = routed.stageD;
    expect(stageD).not.toBeNull();
    if (stageD === null) return;

    // BOTH MECHANISMS ARE CONCURRENT. They are in the same routing, at the same time.
    expect(stageD.concurrent).toContain(DB_INJURY);
    expect(stageD.concurrent).toContain(TWO_HIGH_SHELL);
    expect(stageD.interactionCount).toBeGreaterThanOrEqual(3);

    // HALF ONE: THE COUPLING IS NEGATIVE. The spec's own pair.
    const gamma = stageD.gamma.get(`${DB_INJURY}|${TWO_HIGH_SHELL}`);
    expect(gamma).toBeDefined();
    expect(gamma as number).toBeLessThan(0);
    expect(gamma as number).toBe(-1);

    // HALF TWO: THE SHARE IS REALLOCATED TO THE SEAM.
    const reallocation = stageD.reallocations.find(
      (entry) => entry.causePremises.includes(DB_INJURY) && entry.causePremises.includes(TWO_HIGH_SHELL),
    );
    expect(reallocation).toBeDefined();
    if (reallocation === undefined) return;
    expect(reallocation.gamma).toBeLessThan(0);
    expect(reallocation.destinationPremiseId).toBe(TE_RB_SEAM);
    expect(reallocation.to).toBe(ZONE_SEAM);
    expect(reallocation.from).toBe(ZONE_PERIMETER);
    expect(reallocation.amount).toBeGreaterThan(0);

    // The share MOVED: the seam gained, the perimeter lost, and the vector is still a
    // distribution.
    expect(stageD.finalShare[ZONE_SEAM]).toBeGreaterThan(stageD.firstOrderShare[ZONE_SEAM] as number);
    expect(stageD.finalShare[ZONE_PERIMETER]).toBeLessThan(stageD.firstOrderShare[ZONE_PERIMETER] as number);
    const total = Object.values(stageD.finalShare).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);

    // AND THE COUPLING IS WHAT MOVED IT: with the damping pair's cross term removed, the
    // seam would not have gained anything.
    const dampeningTerm = stageD.pairs.find(
      (pair) => pair.i === DB_INJURY && pair.j === TWO_HIGH_SHELL,
    );
    expect(dampeningTerm).toBeDefined();
    expect((dampeningTerm as { shrunkTerm: number }).shrunkTerm).toBeLessThan(0);
  });

  /**
   * THE SAME CLAIM, AT THE STAGE LEVEL, WITH THE COUPLING SIGN AND THE REALLOCATION
   * MEASURED DIRECTLY. This is the stage in isolation: the pipeline test above proves the
   * funnel wires the stage up; this one pins what the stage does.
   */
  it("T14: the concurrent DB injury and two-high shell mechanisms dampen each other", () => {
    const result = stageDCrossEquationComposition({
      mechanisms: mechanismSet([DB_INJURY, TWO_HIGH_SHELL, SEAM_MECHANISM, MOTION_STRESS]),
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });

    const gamma = result.gamma.get(`${DB_INJURY}|${TWO_HIGH_SHELL}`);
    expect(gamma as number).toBeLessThan(0);
    // AND THE REINFORCING PAIR IS POSITIVE. A router that returned -1 for everything
    // would pass the first half of the headline and fail here.
    expect(result.gamma.get(`${DB_INJURY}|${MOTION_STRESS}`)).toBeGreaterThan(0);
    // AND A PAIR THAT SHARES NO TARGET IS NOT COUPLED AT ALL.
    expect(result.gamma.get(`${DB_INJURY}|${SEAM_MECHANISM}`)).toBe(0);

    // THE DAMPENING IS VISIBLE IN THE OUTCOME: the coupled delta is SMALLER than the sum
    // of the first-order deltas, because the two mechanisms overlap.
    const firstOrder = result.firstOrderDelta;
    expect(result.coupledDelta).toBeLessThan(firstOrder);

    // AND THE REALLOCATION IS REAL: the seam GAINED share and the perimeter LOST it. A
    // router that computed the coupling and then never moved the share would fail here.
    const reallocation = result.reallocations.find(
      (entry) => entry.causePremises.includes(DB_INJURY) && entry.causePremises.includes(TWO_HIGH_SHELL),
    );
    expect(reallocation).toBeDefined();
    expect((reallocation as { amount: number }).amount).toBeGreaterThan(0);
    expect((reallocation as { destinationPremiseId: string }).destinationPremiseId).toBe(TE_RB_SEAM);
    expect(result.finalShare[ZONE_SEAM]).toBeGreaterThan(result.firstOrderShare[ZONE_SEAM] as number);
    expect(result.finalShare[ZONE_PERIMETER]).toBeLessThan(result.firstOrderShare[ZONE_PERIMETER] as number);
    const total = Object.values(result.finalShare).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  /**
   * THE STEIN SHRINKAGE SHRINKS.
   *
   * With four concurrent interactions the cross-delta is strictly smaller than the
   * unshrunk cross-delta, and the factor is strictly between 0 and 1.
   */
  it("T14: the Stein shrinkage deflates the cross-delta when m >= 3", () => {
    const result = stageDCrossEquationComposition({
      mechanisms: mechanismSet([DB_INJURY, TWO_HIGH_SHELL, SEAM_MECHANISM, MOTION_STRESS]),
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });
    expect(result.interactionCount).toBe(4);
    expect(result.steinFactor).toBeGreaterThan(0);
    expect(result.steinFactor).toBeLessThan(1);
    expect(result.shrunkCrossMagnitude).toBeLessThan(result.unshrunkCrossMagnitude);
    expect(result.shrunkCrossMagnitude).toBeGreaterThan(0);
    // And the shrinkage SCALES THE REALLOCATION. The share that moved is the shrunk
    // amount, not the unshrunk one.
    const pair = result.pairs.find((entry) => entry.i === DB_INJURY && entry.j === TWO_HIGH_SHELL);
    expect(pair).toBeDefined();
    const reallocation = result.reallocations.find(
      (entry) => entry.causePremises.includes(DB_INJURY) && entry.causePremises.includes(TWO_HIGH_SHELL),
    );
    expect(reallocation).toBeDefined();
    expect((reallocation as { amount: number }).amount).toBeCloseTo(Math.abs((pair as { shrunkTerm: number }).shrunkTerm), 12);
    expect((reallocation as { amount: number }).amount).toBeLessThan(Math.abs((pair as { term: number }).term));
  });

  /**
   * A LARGE BOOTSTRAP TRACE DEFLATES THE CROSS-DELTA TO ZERO.
   *
   * This is the case the shrinkage exists for: the higher-order term is not supported by
   * the data, and the engine should publish nothing rather than publish noise.
   */
  it("T14: a large bootstrap trace deflates the cross-delta to zero", () => {
    const result = stageDCrossEquationComposition({
      mechanisms: mechanismSet([DB_INJURY, TWO_HIGH_SHELL, SEAM_MECHANISM, MOTION_STRESS]),
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: 10,
    });
    expect(result.steinFactor).toBe(0);
    expect(result.shrunkCrossMagnitude).toBe(0);
    // With the cross term gone, the coupled delta IS the first-order delta.
    expect(result.coupledDelta).toBeCloseTo(result.firstOrderDelta, 12);
    // And no share is reallocated: there is no measured coupling left to redirect with.
    expect(result.reallocations.length).toBe(0);
  });

  /**
   * THE FACTOR IS EXACTLY 1 FOR FEWER THAN THREE INTERACTIONS.
   *
   * The number 1, not 0.9999: the assertion is `toBe(1)`.
   */
  it("T14: the Stein factor is exactly 1.0 when m < 3", () => {
    expect(steinShrinkageFactor(0, 1, 1)).toBe(1);
    expect(steinShrinkageFactor(1, 1, 1)).toBe(1);
    expect(steinShrinkageFactor(2, 1, 1)).toBe(1);
    expect(steinShrinkageFactor(2, 1000, 0.000001)).toBe(1);
    // And at three it is not 1.
    expect(steinShrinkageFactor(3, 0.00005, 0.000144)).toBeLessThan(1);
  });

  /**
   * A REINFORCING PAIR DOES NOT SHRINK.
   *
   * Two concurrent mechanisms are fewer than three interactions, so the factor is exactly
   * 1: the cross term survives intact, the coupled delta is LARGER than the first-order
   * sum (the mechanisms compound), and no share is reallocated. A shrinkage that deflated
   * the reinforcing pair would mean the factor was a proxy for the SIGN of gamma, and
   * the "dampen and redirect" reading would collapse into "shrink the negative ones".
   */
  it("T14: a reinforcing pair (gamma > 0) does NOT shrink", () => {
    const result = stageDCrossEquationComposition({
      mechanisms: mechanismSet([DB_INJURY, MOTION_STRESS]),
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });
    expect(result.interactionCount).toBe(2);
    expect(result.gamma.get(`${DB_INJURY}|${MOTION_STRESS}`)).toBeGreaterThan(0);
    expect(result.steinFactor).toBe(1);
    expect(result.shrunkCrossMagnitude).toBe(result.unshrunkCrossMagnitude);
    expect(result.shrunkCrossMagnitude).toBeGreaterThan(0);
    // Reinforcing: the coupled delta is LARGER than the sum of the first-order deltas.
    expect(result.coupledDelta).toBeGreaterThan(result.firstOrderDelta);
    // And a reinforcing pair does not redirect any share.
    expect(result.reallocations.length).toBe(0);
  });

  /**
   * AND THE FACTOR DOES NOT DEPEND ON THE SIGN OF GAMMA.
   *
   * A reinforcing TRIPLE -- three concurrent mechanisms whose only coupling is
   * reinforcing -- IS shrunk, by the spec's formula. If the shrinkage were keyed on the
   * sign of gamma, this factor would be 1 and the cross-delta would survive intact.
   */
  it("T14: the Stein factor follows the spec's formula, not the sign of gamma", () => {
    const result = stageDCrossEquationComposition({
      mechanisms: mechanismSet([DB_INJURY, MOTION_STRESS, SEAM_MECHANISM]),
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });
    expect(result.interactionCount).toBe(3);
    // Every coupling in this set is reinforcing or zero -- none is negative.
    for (const pair of result.pairs) {
      expect(pair.gamma).toBeGreaterThanOrEqual(0);
    }
    // And yet the cross-delta IS shrunk.
    expect(result.steinFactor).toBeLessThan(1);
    expect(result.steinFactor).toBeGreaterThan(0);
    expect(result.shrunkCrossMagnitude).toBeLessThan(result.unshrunkCrossMagnitude);
    // The factor is exactly the spec's ratio: 1 - (m-2) tr(Sigma) / (||delta||^2 + eps).
    const expected =
      1 - ((3 - 2) * BOOTSTRAP_TRACE) / (result.unshrunkCrossMagnitude * result.unshrunkCrossMagnitude + 1e-12);
    expect(result.steinFactor).toBeCloseTo(expected, 12);
  });

  /**
   * THE CHAIN RULE. A CHAINED PATH MULTIPLIES ITS PARTIALS.
   *
   * The fixture's chain is DB injury -> two-high shell -> motion stress, so the trigger
   * derivative is the product of the three partials (which come from the compiled typed
   * operators), and the engine reports the path it walked.
   */
  it("T14: the chain rule sums the product of the partials over the causal chains", () => {
    const mechanisms = mechanismSet([DB_INJURY, TWO_HIGH_SHELL, SEAM_MECHANISM, MOTION_STRESS]);
    const result = stageDCrossEquationComposition({
      mechanisms,
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });

    const chain = result.chainPaths.find(
      (path) => path.path[0] === DB_INJURY && path.path[path.path.length - 1] === MOTION_STRESS,
    );
    expect(chain).toBeDefined();
    const expectedProduct =
      COMPILED.dbInjury.dOutDIn * COMPILED.twoHigh.dOutDIn * COMPILED.motion.dOutDIn;
    expect((chain as { product: number }).product).toBeCloseTo(expectedProduct, 12);
    expect(result.chainDerivative).toBeCloseTo(expectedProduct, 12);
  });

  /**
   * THE SPEC-C COMPILER. A DARK SOURCE COMPILES INTO A TYPED OPERATOR, AND AN
   * UNCOMPILABLE ONE IS REFUSED RATHER THAN ZEROED.
   */
  it("T14: the SPEC-C compiler refuses a dark source that is not point-in-time", () => {
    const good = compileNonStatSituational(
      darkProxy("SRC-OK", "P-OK", "INJURY", "SATURATING", [0, 0.6], 1),
    );
    expect(good.ok).toBe(true);
    if (!good.ok) return;
    expect(good.operator.compiledBy).toBe(SPEC_C_COMPILER_ID);
    expect(good.operator.vIn).toBe(1);
    // The operator's partials are the ones Stage D differentiates.
    expect(good.operator.dOutDIn).toBeCloseTo(0.6 * (1 - Math.tanh(1) ** 2), 12);
    expect(good.operator.d2OutDIn2).toBeLessThan(0);

    // NO POINT-IN-TIME STAMP: refused.
    const noStamp = compileNonStatSituational({
      ...darkProxy("SRC-NO-STAMP", "P-NO-STAMP", "INJURY", "LINEAR", [0, 1], 1),
      asOf: "",
    });
    expect(noStamp.ok).toBe(false);
    if (!noStamp.ok) expect(noStamp.reason).toContain("ISO-8601");

    // LOOK-AHEAD: the evidence was observed after the decision. Refused.
    const lookAhead = compileNonStatSituational({
      ...darkProxy("SRC-LOOK-AHEAD", "P-LOOK-AHEAD", "INJURY", "LINEAR", [0, 1], 1),
      observedAt: "2026-10-20T18:05:00.000Z",
    });
    expect(lookAhead.ok).toBe(false);
    if (!lookAhead.ok) expect(lookAhead.reason).toContain("look-ahead");

    // A STATISTICAL SOURCE DOES NOT BELONG ON THIS PATH.
    const statistical = compileNonStatSituational({
      ...darkProxy("SRC-STAT", "P-STAT", "INJURY", "LINEAR", [0, 1], 1),
      statistical: true as unknown as false,
    });
    expect(statistical.ok).toBe(false);

    // MALFORMED COEFFICIENTS: refused.
    const badBeta = compileNonStatSituational(
      darkProxy("SRC-BAD-BETA", "P-BAD-BETA", "INJURY", "LINEAR", [0], 1),
    );
    expect(badBeta.ok).toBe(false);

    // A BATCH REPORTS ITS REFUSALS. A batch that quietly dropped them would be a batch
    // that reported "everything compiled".
    const batch = compileNonStatSituationalBatch([
      darkProxy("SRC-OK", "P-OK", "INJURY", "LINEAR", [0, 1], 1),
      { ...darkProxy("SRC-BAD", "P-BAD", "INJURY", "LINEAR", [0, 1], 1), asOf: "" },
    ]);
    expect(batch.operators.length).toBe(1);
    expect(batch.refusals.length).toBe(1);
    expect(batch.refusals[0]?.sourceId).toBe("SRC-BAD");
  });

  /**
   * THE FUNNEL REFUSES WITHOUT A CERTIFICATION. A router that routed anyway would be
   * routing on an index whose recall nobody measured.
   */
  it("T14: the whole funnel refuses to route without a Recall@20 certification", () => {
    const routed = runCognitiveRouter({
      corpus: FIXTURE.corpus,
      context: FIXTURE.mask,
      query: FIXTURE.query,
      baseShare: BASE_SHARE,
      redirectZone: ZONE_SEAM,
      redirectPremiseId: TE_RB_SEAM,
      bootstrapTrace: BOOTSTRAP_TRACE,
    });
    expect(routed.refused).toBe(true);
    expect(routed.stageC).toBeNull();
    expect(routed.stageD).toBeNull();
    expect(routed.refusalReason).toContain("certification");
  });

  /**
   * THE MUTATION SWEEP FOR T14 IS PRESENT AND TARGETS THIS GATE.
   *
   * A sweep on disk is a file, not a gate. This asserts the file is there and that it
   * names this gate's tests, so a sweep that is silently pointed at the wrong file is
   * caught here rather than by a human reading a green pipeline.
   */
  it("T14: the mutation sweep for T14 is present and targets this gate", () => {
    const path = resolve(process.cwd(), "reconciliation/_mutation_sweep_t14_mcp.mjs");
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source).toContain("mcp-cognitive-router.ts");
    expect(source).toContain("feature-matrix.ts");
    expect(source).toContain("non-stat-situational-compiler.ts");
    expect(source).toContain("NEGATIVE coupling AND reallocates the share to the TE/RB seam");
    expect(source).toContain("--reporter=json");
  });
});
