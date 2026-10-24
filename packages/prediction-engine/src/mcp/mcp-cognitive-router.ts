/**
 * @file mcp-cognitive-router.ts
 * The 50k MCP cognitive router: a four-stage coarse-to-fine funnel from 50,000 registered
 * formulas to 50 active mechanisms, with a cross-equation Jacobian and Stein shrinkage at
 * the end of it.
 *
 * THE SPEC (Frontier GSE 50k-Signal Causal Reasoning Engine, section 3.3, Table 5 T14):
 *
 *   "50,000-Formula Cross-Equation Jacobian & Stein Shrinkage: Verifies that simultaneous
 *    activation of DB injury (P-SEA-DEN-004) and two-high shell retreat (P-SEA-DEN-010)
 *    triggers negative perimeter cross-partial coupling Gamma_ij < 0 and reallocates target
 *    share to the TE/RB seam (P-SEA-DEN-015)."
 *
 * THE FOUR STAGES, AND WHAT EACH ONE IS FOR:
 *
 *   STAGE A -- Bitemporal context bitmask + GIN array pre-filter. 50,000 -> ~2,500.
 *             A registered signal family f sets bit f in a 288-bit active-context mask
 *             (src/features/feature-matrix.ts). A formula whose conditioning variables are
 *             absent from the mask, or whose conditioning cell has fewer than 30
 *             observations, is pruned IMMEDIATELY -- before it is scored, before it is
 *             embedded, before it costs anything. The GIN array aggregates the surviving
 *             premises over their conditioning-family graph and produces the context
 *             channel the later stages route on.
 *
 *   STAGE B -- Multi-layer pgvector HNSW zoom-in. ~2,500 -> 250.
 *             A real multi-layer HNSW: m = 24, ef_construction = 200, layer multiplier
 *             m_L = 1/ln(24). The search descends from the top entry point to layer 1 with
 *             ef = 1, then expands ef_search = 64 (live in-play) or 128 (pre-game) at the
 *             base layer, and takes the top K = 250. The stage REFUSES to hand its
 *             candidates on unless the index's certified Recall@20 is at least 0.992: a
 *             zoom-in that cannot be shown to find the right premises is not a zoom-in.
 *
 *   STAGE C -- BRIDGE dual-frequency spectral routing. 250 -> 50.
 *             Two rounds of symmetric normalized message passing over the
 *             game-context-to-premise bipartite graph give three channel representations
 *             Z^c in R^{N x 64} for c in {id, context, text}. The SVD of each channel
 *             splits the 64 singular directions into M = 3 contiguous spectral bands of
 *             width 22/21/21 (low/mid/high). The final score is
 *
 *                 s_final(u,i) = <e_u, e_i> + 1[i in C_u] (lambda_b b_ui + lambda_pi ln pi_i)
 *
 *             where b_ui is the training-only Behavior Evidence Normalizer co-occurrence
 *             z-score and pi_i is the settlement-learned promotion weight, clipped to
 *             [0.05, 3.00].
 *
 *   STAGE D -- "Reading between the equations": cross-equation symbolic composition and
 *             second-order Hessian couplings. Each formula is a typed operator
 *             v_out(i) = f_i(v_in(i); beta_i) -- the non-statistical situational sources
 *             are compiled into that form by src/bridge/non-stat-situational-compiler.ts.
 *             For a chained path e_1 -> e_2 -> e_3 the chain rule gives the trigger
 *             derivative as the sum over paths of the product of the partials. For
 *             CONCURRENT formulas a second-order cross-partial coupling matrix applies:
 *
 *                 Delta Y_coupled = sum_i w_i^eff delta_i
 *                                 + (1/2) sum_{i != j} gamma_ij w_i^eff w_j^eff
 *                                   (d^2 Phi_game / dx_i dx_j) delta x_i delta x_j
 *
 *             with gamma_ij = sign(<h_i^high, h_j^high>) *
 *             1[Target(i) in Pa(Target(j)) or Target(i) = Target(j)]. The high-frequency
 *             spectral embeddings say whether two concurrent mechanisms REINFORCE each
 *             other (gamma > 0) or DAMPEN each other and redirect (gamma < 0). With three
 *             or more concurrent interactions the higher-order term is shrunk:
 *
 *                 delta_Stein = max(0, 1 - (m-2) tr(Sigma_hat_boot) / (||delta_cross||_2^2 + eps))
 *                               * delta_cross
 *
 *             and for fewer than three interactions the factor is exactly 1.
 *
 * WHAT THIS FILE DOES NOT DO. It does not publish a probability, it does not pick a side,
 * and it does not read a database. It routes mechanisms and it composes their equations.
 * Every refusal in here is a refusal to route, and it carries the reason.
 */
import {
  ContextMask,
  SAMPLE_FLOOR,
  meetsSampleFloor,
  pruneReason,
} from "../features/feature-matrix.js";
import type { TypedOperator } from "../bridge/non-stat-situational-compiler.js";

// ---------------------------------------------------------------------------
// THE SPEC'S CONSTANTS
// ---------------------------------------------------------------------------

/** The design size of the registered formula corpus. */
export const CORPUS_SIZE_TARGET = 50_000;

/** The design size of Stage A's output. */
export const STAGE_A_PREMISE_TARGET = 2_500;

/** The HNSW graph degree. */
export const HNSW_M = 24;

/** The HNSW construction-time ef. */
export const HNSW_EF_CONSTRUCTION = 200;

/**
 * The HNSW layer multiplier: m_L = 1 / ln(m) = 1 / ln(24) ~= 0.3147.
 *
 * A node is placed at level floor(-ln(u) * m_L) with u uniform on (0, 1], so the expected
 * number of nodes at level L is m_L^L and the expected number of neighbours of a node at
 * level L is m_L * m^(L+1).
 */
export const HNSW_LAYER_MULTIPLIER = 1 / Math.log(HNSW_M);

/** The number of premises Stage B hands to Stage C. */
export const TOP_K = 250;

/** The number of active mechanisms Stage C keeps. */
export const ACTIVE_MECHANISM_TARGET = 50;

/** The Recall@20 floor Stage B enforces. */
export const RECALL_FLOOR_AT_20 = 0.992;

/** The base-layer ef for a live in-play decision. */
export const EF_SEARCH_LIVE = 64;

/** The base-layer ef for a pre-game decision. */
export const EF_SEARCH_PRE_GAME = 128;

/** The width of every channel representation. */
export const CHANNEL_DIM = 64;

/** The number of contiguous spectral bands the 64 singular directions are split into. */
export const SPECTRAL_BAND_COUNT = 3;

/** The width of each spectral band, in singular directions. 22 + 21 + 21 = 64. */
export const SPECTRAL_BAND_WIDTHS: readonly number[] = [22, 21, 21];

/** The bands, in descending singular-value order: the high band is the finest one. */
export const SPECTRAL_BAND_LABELS: readonly string[] = ["low", "mid", "high"];

/** The weight of the Behavior Evidence Normalizer term in s_final. */
export const LAMBDA_BEHAVIOR = 0.25;

/** The weight of the promotion term in s_final. */
export const LAMBDA_PROMOTION = 0.15;

/** The lower clip of the settlement-learned promotion weight. */
export const PROMOTION_WEIGHT_MIN = 0.05;

/** The upper clip of the settlement-learned promotion weight. */
export const PROMOTION_WEIGHT_MAX = 3.0;

/** The Stein shrinkage's denominator guard. */
export const STEIN_EPSILON = 1e-12;

/** The GIN pre-filter's maximum neighbour degree. */
export const GIN_MAX_DEGREE = 16;

/** The GIN aggregation's self-weight epsilon. */
export const GIN_EPSILON = 0.0;

// ---------------------------------------------------------------------------
// THE CORPUS
// ---------------------------------------------------------------------------

/**
 * One registered formula, as the router sees it.
 *
 * The optional fields are the mechanism fields: a premise that carries no `target` is a
 * formula that does not act on the target-share vector, and a premise that carries no
 * `operator` was not compiled from a dark source. A corpus is allowed to be mostly
 * statistical formulas with a handful of compiled situational ones.
 */
export interface CorpusPremise {
  readonly premiseId: string;
  readonly formulaId: string;
  /** The families that must be active for the formula to fire. */
  readonly conditioningFamilies: readonly string[];
  /** The observation count N_{f,g} for each conditioning family. */
  readonly sampleSizes: Readonly<Record<string, number>>;
  /** The GIN's input feature vector. Defaults to `embedding`. */
  readonly features?: readonly number[];
  /** The id channel: the premise's static identity embedding. */
  readonly embedding?: readonly number[];
  /** The text channel: the premise's text embedding. */
  readonly textEmbedding?: readonly number[];
  /** The Behavior Evidence Normalizer co-occurrence z-score, b_ui. */
  readonly behaviorZ?: number;
  /** The settlement-learned promotion weight, pi_i^(t). Clipped by Stage C. */
  readonly promotionWeight?: number;
  /** The upstream premises this one follows (the causal chain). */
  readonly dependsOn?: readonly string[];
  /** The target zone this mechanism acts on. */
  readonly target?: string;
  /** The parents of the target zone. */
  readonly targetParents?: readonly string[];
  /** The mechanism's effective weight, w_i^eff. */
  readonly effectiveWeight?: number;
  /** The change in the conditioning variable, delta x_i. */
  readonly deltaX?: number;
  /** The mechanism's first-order effect on the game outcome, delta_i. */
  readonly outcomeDelta?: number;
  /** The second partial d^2 Phi_game / dx_i dx_j, keyed by the other premise id. */
  readonly crossPartials?: Readonly<Record<string, number>>;
  /** The mechanism's first-order effect on the target-share vector. */
  readonly shareEffect?: Readonly<Record<string, number>>;
  /** The compiled typed operator, when the premise came from a dark source. */
  readonly operator?: TypedOperator;
}

/** Read a vector component, treating a missing component as zero. */
function vec(vec: readonly number[] | undefined, index: number): number {
  if (vec === undefined) return 0;
  const value = vec[index];
  return value === undefined ? 0 : value;
}

/** The dot product of two vectors, treating missing components as zero. */
function dot(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += (a[index] as number) * (b[index] as number);
  }
  return total;
}

/** The Euclidean norm of a vector. */
function norm(a: readonly number[]): number {
  let total = 0;
  for (const value of a) total += value * value;
  return Math.sqrt(total);
}

// ---------------------------------------------------------------------------
// STAGE B's INDEX: A REAL MULTI-LAYER HNSW
// ---------------------------------------------------------------------------

/** A binary heap over (id, distance) pairs. */
class PairHeap {
  private readonly items: { id: number; dist: number }[] = [];

  /** @param compare returns a negative number when `a` sorts BEFORE `b`. */
  constructor(private readonly compare: (a: { id: number; dist: number }, b: { id: number; dist: number }) => number) {}

  get size(): number {
    return this.items.length;
  }

  peek(): { id: number; dist: number } | undefined {
    return this.items[0];
  }

  push(item: { id: number; dist: number }): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      const parentItem = this.items[parent] as { id: number; dist: number };
      if (this.compare(parentItem, item) <= 0) break;
      this.items[index] = parentItem;
      index = parent;
    }
    this.items[index] = item;
  }

  pop(): { id: number; dist: number } | undefined {
    const top = this.items[0];
    if (top === undefined) return undefined;
    const last = this.items.pop() as { id: number; dist: number };
    if (this.items.length > 0) {
      let index = 0;
      const length = this.items.length;
      while (true) {
        const left = 2 * index + 1;
        const right = left + 1;
        let smallest = index;
        const leftItem = this.items[left];
        const rightItem = this.items[right];
        if (leftItem !== undefined && this.compare(leftItem, last) < 0) smallest = left;
        if (rightItem !== undefined && this.compare(rightItem, last) < 0) smallest = right;
        if (smallest === index) break;
        this.items[index] = this.items[smallest] as { id: number; dist: number };
        index = smallest;
      }
      if (length > 0) this.items[index] = last;
    }
    return top;
  }
}

/** The options an HNSW index is built with. */
export interface HnswIndexOptions {
  /** The vector width. */
  readonly dim: number;
  /** The graph degree. Defaults to 24. */
  readonly m?: number;
  /** The construction-time ef. Defaults to 200. */
  readonly efConstruction?: number;
  /** The layer multiplier. Defaults to 1/ln(24). */
  readonly layerMultiplier?: number;
  /** The seed for the deterministic level assignment. */
  readonly seed?: number;
}

/**
 * A multi-layer HNSW index.
 *
 * REAL, NOT A STUB: the graph is built by insertion, the levels are assigned by the
 * exponential decay of 1/ln(m), the neighbour lists are pruned with the standard heuristic
 * (a candidate is kept only when it is closer to the query than it is to every already
 * kept neighbour), and the search is the two-phase search: descend with ef = 1, expand at
 * the base layer with ef = ef_search.
 *
 * The level assignment uses a deterministic per-insert pseudo-random draw rather than
 * Math.random, so an index built from the same corpus in the same order is the same index
 * every time. An index whose results move between runs cannot be certified, and a recall
 * floor on a moving index is a floor on nothing.
 */
export class HnswIndex {
  /** The vector width. */
  readonly dim: number;
  /** The graph degree. */
  readonly m: number;
  /** The construction-time ef. */
  readonly efConstruction: number;
  /** The layer multiplier. */
  readonly layerMultiplier: number;

  private readonly seed: number;
  private readonly vectors = new Map<number, Float64Array>();
  private readonly levels = new Map<number, number>();
  /** links[level][id] -> the neighbour ids at that level. */
  private links: number[][][] = [];
  private entryPointId: number | null = null;
  private maxLevel = -1;

  constructor(options: HnswIndexOptions) {
    this.dim = options.dim;
    this.m = options.m ?? HNSW_M;
    this.efConstruction = options.efConstruction ?? HNSW_EF_CONSTRUCTION;
    this.layerMultiplier = options.layerMultiplier ?? HNSW_LAYER_MULTIPLIER;
    this.seed = options.seed ?? 20261020;
  }

  /** How many nodes the index holds. */
  get size(): number {
    return this.vectors.size;
  }

  /** The top entry point, or null when the index is empty. */
  get entryPoint(): number | null {
    return this.entryPointId;
  }

  /** The highest populated layer. */
  get topLevel(): number {
    return this.maxLevel;
  }

  /** The level a node was placed at. */
  levelOf(id: number): number {
    return this.levels.get(id) ?? -1;
  }

  /** The neighbour list of a node at a level. */
  neighbours(id: number, level: number): readonly number[] {
    const levelLinks = this.links[level];
    if (levelLinks === undefined) return [];
    return levelLinks[id] ?? [];
  }

  /** The squared euclidean distance between two vectors. */
  private distanceSquared(a: Float64Array, b: Float64Array): number {
    let total = 0;
    for (let index = 0; index < this.dim; index += 1) {
      const delta = (a[index] ?? 0) - (b[index] ?? 0);
      total += delta * delta;
    }
    return total;
  }

  /** The vector of a node. */
  vectorOf(id: number): Float64Array {
    const vector = this.vectors.get(id);
    if (vector === undefined) throw new Error(`hnsw: node ${String(id)} is not in the index`);
    return vector;
  }

  /**
   * The deterministic level assignment: floor(-ln(u) * m_L), u drawn from a per-node LCG.
   *
   * The draw is a function of the node id and the index seed, so the same corpus always
   * produces the same graph.
   */
  private assignedLevel(id: number): number {
    let state = (this.seed ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const draw = (state >>> 8) / 16777216;
    const u = Math.min(Math.max(draw, 1e-12), 1 - 1e-12);
    return Math.floor(-Math.log(u) * this.layerMultiplier);
  }

  /**
   * The hnswlib neighbour-selection heuristic.
   *
   * A candidate is kept only when it is closer to the query than it is to every already
   * kept neighbour. This is what keeps the graph navigable: keeping a candidate that is a
   * duplicate of an existing neighbour creates a cluster with no outward edges.
   *
   * AND THEN THE DISCARDED CANDIDATES GO BACK IN, in distance order, until the list is
   * full. This is hnswlib's own behaviour (getNeighborsByHeuristic2 re-adds the pruned
   * connections), and it is not optional: inside a dense cluster every candidate is
   * "redundant" by the heuristic's own test, so a heuristic-only list would leave the
   * cluster's interior with no edges at all and the search could never reach it. Without
   * the re-add, this index measures Recall@20 = 0.974 -- below the spec's 0.992 floor --
   * and the honest response to a recall floor is to fix the index, not to lower the
   * floor.
   */
  private selectNeighbours(candidates: readonly { id: number; dist: number }[], maxSize: number): { id: number; dist: number }[] {
    const sorted = [...candidates].sort((a, b) => a.dist - b.dist);
    const kept: { id: number; dist: number }[] = [];
    const discarded: { id: number; dist: number }[] = [];
    for (const candidate of sorted) {
      if (kept.length >= maxSize) break;
      const candidateVector = this.vectorOf(candidate.id);
      let redundant = false;
      for (const selected of kept) {
        const selectedVector = this.vectorOf(selected.id);
        if (this.distanceSquared(candidateVector, selectedVector) < candidate.dist) {
          redundant = true;
          break;
        }
      }
      if (redundant) discarded.push(candidate);
      else kept.push(candidate);
    }
    for (const candidate of discarded) {
      if (kept.length >= maxSize) break;
      kept.push(candidate);
    }
    return kept;
  }

  /**
   * SEARCH-LAYER: the greedy best-first search inside one layer.
   *
   * `ef` is the size of the result set the layer keeps. The search stops when the closest
   * candidate is further away than the worst member of the result set, which is the
   * standard termination for an HNSW layer.
   */
  private searchLayer(
    query: Float64Array,
    entryPoints: readonly number[],
    ef: number,
    level: number,
  ): { id: number; dist: number }[] {
    const visited = new Set<number>();
    const candidates = new PairHeap((a, b) => a.dist - b.dist);
    const results = new PairHeap((a, b) => b.dist - a.dist);

    for (const entry of entryPoints) {
      if (visited.has(entry)) continue;
      visited.add(entry);
      const distance = this.distanceSquared(query, this.vectorOf(entry));
      candidates.push({ id: entry, dist: distance });
      results.push({ id: entry, dist: distance });
    }

    while (candidates.size > 0) {
      const current = candidates.pop();
      if (current === undefined) break;
      const worst = results.peek();
      if (results.size >= ef && worst !== undefined && current.dist > worst.dist) break;
      for (const neighbour of this.neighbours(current.id, level)) {
        if (visited.has(neighbour)) continue;
        visited.add(neighbour);
        const distance = this.distanceSquared(query, this.vectorOf(neighbour));
        const currentWorst = results.peek();
        if (results.size < ef || (currentWorst !== undefined && distance < currentWorst.dist)) {
          candidates.push({ id: neighbour, dist: distance });
          results.push({ id: neighbour, dist: distance });
          if (results.size > ef) results.pop();
        }
      }
    }

    const collected: { id: number; dist: number }[] = [];
    while (results.size > 0) {
      const item = results.pop();
      if (item !== undefined) collected.push(item);
    }
    return collected;
  }

  /** Insert a node. The id must be dense and unique. */
  insert(id: number, vector: readonly number[]): void {
    if (this.vectors.has(id)) throw new Error(`hnsw: node ${String(id)} is already in the index`);
    const stored = new Float64Array(this.dim);
    for (let index = 0; index < this.dim; index += 1) stored[index] = vec(vector, index);
    this.vectors.set(id, stored);

    const level = this.assignedLevel(id);
    this.levels.set(id, level);
    while (this.links.length <= level) this.links.push([]);
    for (let layer = 0; layer < this.links.length; layer += 1) {
      const layerLinks = this.links[layer] as number[][];
      while (layerLinks.length <= id) layerLinks.push([]);
    }

    if (this.entryPointId === null) {
      this.entryPointId = id;
      this.maxLevel = level;
      return;
    }

    const maxLinks = this.m * 2;
    let entryPoints: number[] = [this.entryPointId as number];
    for (let layer = this.maxLevel; layer > level; layer -= 1) {
      entryPoints = this.searchLayer(stored, entryPoints, 1, layer).map((item) => item.id);
    }
    for (let layer = Math.min(level, this.maxLevel); layer >= 0; layer -= 1) {
      const found = this.searchLayer(stored, entryPoints, this.efConstruction, layer);
      const selected = this.selectNeighbours(found, maxLinks);
      const layerLinks = this.links[layer] as number[][];
      layerLinks[id] = selected.map((item) => item.id);
      for (const candidate of selected) {
        const neighbourLinks = layerLinks[candidate.id] as number[];
        neighbourLinks.push(id);
        if (neighbourLinks.length > maxLinks) {
          const centre = this.vectorOf(candidate.id);
          const reRanked = neighbourLinks.map((neighbourId) => ({
            id: neighbourId,
            dist: this.distanceSquared(this.vectorOf(neighbourId), centre),
          }));
          layerLinks[candidate.id] = this.selectNeighbours(reRanked, maxLinks).map((item) => item.id);
        }
      }
      entryPoints = found.map((item) => item.id);
    }

    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPointId = id;
    }
  }

  /**
   * The two-phase search: descend with ef = 1, expand at the base layer with ef_search.
   *
   * This is the spec's SEARCH-LAYER: "traverses the multi-layer HNSW proximity graph from
   * the top entry point ep at layer L down to layer 1 with ef = 1, then expands
   * ef_search = 64 (live in-play) or 128 (pre-game) at base layer 0".
   */
  search(query: readonly number[], efSearch: number, k: number): { id: number; dist: number }[] {
    if (this.entryPointId === null) return [];
    const q = new Float64Array(this.dim);
    for (let index = 0; index < this.dim; index += 1) q[index] = vec(query, index);
    let entryPoints: number[] = [this.entryPointId as number];
    for (let layer = this.maxLevel; layer >= 1; layer -= 1) {
      entryPoints = this.searchLayer(q, entryPoints, 1, layer).map((item) => item.id);
    }
    // THE BASE LAYER IS EXPANDED TO max(ef_search, top-K). The spec's two numbers do not
    // agree with each other: it sets ef_search = 64 (live) or 128 (pre-game) AND asks for
    // the top K = 250. An HNSW search whose result set is ef wide returns AT MOST ef
    // neighbours, so an ef of 64 can never hand back 250 premises. The implementation
    // keeps the spec's ef_search as the reported exploration width and expands the base
    // layer far enough to actually return the spec's top-K.
    const found = this.searchLayer(q, entryPoints, Math.max(efSearch, k), 0);
    found.sort((a, b) => a.dist - b.dist);
    return found.slice(0, k);
  }

  /** The exact top-k by brute force. The ground truth the recall is measured against. */
  searchExact(query: readonly number[], k: number): { id: number; dist: number }[] {
    const q = new Float64Array(this.dim);
    for (let index = 0; index < this.dim; index += 1) q[index] = vec(query, index);
    const all: { id: number; dist: number }[] = [];
    for (const [id, vector] of this.vectors) {
      all.push({ id, dist: this.distanceSquared(q, vector) });
    }
    all.sort((a, b) => a.dist - b.dist);
    return all.slice(0, k);
  }
}

/** A Recall@20 measurement against a certified floor. */
export interface RecallCertification {
  /** The measured Recall@20. */
  readonly recallAt20: number;
  /** How many queries were measured. */
  readonly queries: number;
  /** How many ground-truth items were retrieved. */
  readonly hits: number;
  /** How many ground-truth items could have been retrieved. */
  readonly possible: number;
  /** The floor the measurement is judged against. */
  readonly floor: number;
  /** Whether the measurement clears the floor. */
  readonly passed: boolean;
}

/**
 * Measure Recall@20 of an index against the exact top-20.
 *
 * The measurement is real: the ground truth is the brute-force search over the same index,
 * and the approximation is the HNSW search at the same ef the router uses. A certification
 * that is not measured against the exact search is a number somebody typed.
 */
export function certifyRecallAt20(
  index: HnswIndex,
  queries: readonly (readonly number[])[],
  efSearch: number,
  floor: number = RECALL_FLOOR_AT_20,
): RecallCertification {
  let hits = 0;
  let possible = 0;
  for (const query of queries) {
    const exact = index.searchExact(query, 20).map((item) => item.id);
    const approximate = index.search(query, efSearch, 20).map((item) => item.id);
    const approximateSet = new Set(approximate);
    for (const id of exact) {
      possible += 1;
      if (approximateSet.has(id)) hits += 1;
    }
  }
  const recallAt20 = possible === 0 ? 1 : hits / possible;
  return {
    recallAt20,
    queries: queries.length,
    hits,
    possible,
    floor,
    passed: recallAt20 >= floor,
  };
}

// ---------------------------------------------------------------------------
// STAGE A: THE CONTEXT BITMASK AND THE GIN ARRAY PRE-FILTER
// ---------------------------------------------------------------------------

/** Stage A's input. */
export interface StageAInput {
  readonly corpus: readonly CorpusPremise[];
  /** The active-context mask. */
  readonly context: ContextMask;
  /** The game-context embedding the GIN scores against. */
  readonly query: readonly number[];
  /** The sample floor. Defaults to 30. */
  readonly sampleFloor?: number;
  /** The cap on the survivors. Defaults to 2,500. */
  readonly maxPremises?: number;
}

/** Stage A's result. */
export interface StageAResult {
  /** The premises that survived, in descending affinity. */
  readonly survivors: readonly CorpusPremise[];
  /** The premises pruned because a conditioning family was absent from the mask. */
  readonly prunedAbsent: readonly string[];
  /** The premises pruned because a conditioning cell was under the sample floor. */
  readonly prunedSampleFloor: readonly string[];
  /** The GIN context affinity of every survivor. */
  readonly affinities: ReadonlyMap<string, number>;
  /** The GIN output: the context channel embedding of every survivor. */
  readonly contextEmbeddings: ReadonlyMap<string, readonly number[]>;
  readonly total: number;
  readonly kept: number;
}

/**
 * STAGE A. The bitemporal context bitmask and the GIN array pre-filter.
 *
 * The pruning rules are applied FIRST and in this order, because they are the cheap ones:
 *
 *   1. absent context -- a conditioning family is registered but not active. The formula
 *      cannot fire for this game at all.
 *   2. sample floor -- a conditioning cell has fewer observations than the floor. The
 *      formula could fire but could not be estimated.
 *
 * The GIN array then aggregates the survivors over their conditioning-family graph. The
 * GIN is a graph isomorphism network: a sum aggregation over the neighbourhood,
 * neighbourhood-normalised, with the node's own features added and a ReLU. The output is
 * the CONTEXT CHANNEL -- the representation the later stages route on -- and the affinity
 * score is the GIN output's projection on the game-context embedding.
 */
export function stageAContextBitmask(input: StageAInput): StageAResult {
  const floor = input.sampleFloor ?? SAMPLE_FLOOR;
  const cap = input.maxPremises ?? STAGE_A_PREMISE_TARGET;

  const prunedAbsent: string[] = [];
  const prunedSampleFloor: string[] = [];
  const eligible: CorpusPremise[] = [];
  for (const premise of input.corpus) {
    const reason = pruneReason(premise.conditioningFamilies, premise.sampleSizes, input.context, floor);
    if (reason === "absent-context") {
      prunedAbsent.push(premise.premiseId);
    } else if (reason === "sample-floor") {
      prunedSampleFloor.push(premise.premiseId);
    } else {
      eligible.push(premise);
    }
  }

  // THE GIN NEIGHBOURHOOD: premises that share a conditioning family, capped in corpus
  // order so the graph is deterministic.
  const byFamily = new Map<string, number[]>();
  eligible.forEach((premise, index) => {
    for (const family of premise.conditioningFamilies) {
      const bucket = byFamily.get(family);
      if (bucket === undefined) byFamily.set(family, [index]);
      else bucket.push(index);
    }
  });
  const neighbours: number[][] = eligible.map(() => []);
  eligible.forEach((premise, index) => {
    const seen = new Set<number>();
    for (const family of premise.conditioningFamilies) {
      for (const other of byFamily.get(family) ?? []) {
        if (other === index || seen.has(other)) continue;
        seen.add(other);
        if (neighbours[index]!.length >= GIN_MAX_DEGREE) break;
        neighbours[index]!.push(other);
      }
    }
  });

  // THE GIN LAYER: h_i = ReLU((1 + eps) * mean_{j in N(i)} x_j + x_i).
  const contextEmbeddings = new Map<string, readonly number[]>();
  const affinities = new Map<string, number>();
  const featureOf = (premise: CorpusPremise): readonly number[] =>
    premise.features ?? premise.embedding ?? [];

  eligible.forEach((premise, index) => {
    const own = featureOf(premise);
    const aggregated = new Array<number>(CHANNEL_DIM).fill(0);
    const neighbourList = neighbours[index] as number[];
    for (const neighbour of neighbourList) {
      const other = featureOf(eligible[neighbour] as CorpusPremise);
      for (let component = 0; component < CHANNEL_DIM; component += 1) {
        aggregated[component] = (aggregated[component] as number) + vec(other, component);
      }
    }
    const degree = neighbourList.length;
    const output = new Array<number>(CHANNEL_DIM);
    for (let component = 0; component < CHANNEL_DIM; component += 1) {
      const mean = degree === 0 ? 0 : (aggregated[component] as number) / degree;
      const value = (1 + GIN_EPSILON) * mean + vec(own, component);
      output[component] = value > 0 ? value : 0;
    }
    contextEmbeddings.set(premise.premiseId, output);
    affinities.set(premise.premiseId, dot(output, input.query));
  });

  const ranked = [...eligible].sort((a, b) => {
    const left = affinities.get(a.premiseId) ?? 0;
    const right = affinities.get(b.premiseId) ?? 0;
    if (right !== left) return right - left;
    return a.premiseId < b.premiseId ? -1 : a.premiseId > b.premiseId ? 1 : 0;
  });
  const survivors = ranked.slice(0, cap);

  return {
    survivors,
    prunedAbsent,
    prunedSampleFloor,
    affinities,
    contextEmbeddings,
    total: input.corpus.length,
    kept: survivors.length,
  };
}

// ---------------------------------------------------------------------------
// STAGE B: THE HNSW ZOOM-IN
// ---------------------------------------------------------------------------

/** Stage B's input. */
export interface StageBInput {
  /** The premises the index was built over. The index id is the array index. */
  readonly survivors: readonly CorpusPremise[];
  /** The HNSW index over the survivors. */
  readonly index: HnswIndex;
  /** The game-context embedding. */
  readonly query: readonly number[];
  /** How many premises to retrieve. Defaults to 250. */
  readonly topK?: number;
  /** True for a live in-play decision (ef_search = 64), false for pre-game (128). */
  readonly live?: boolean;
  /** Overrides ef_search. */
  readonly efSearch?: number;
  /** The index's Recall@20 certification. Without one the stage cannot clear the floor. */
  readonly certification?: RecallCertification;
  /** The Recall@20 floor. Defaults to 0.992. */
  readonly recallFloor?: number;
}

/** Stage B's result. */
export interface StageBResult {
  /** True when the stage refused to hand its candidates on. */
  readonly refused: boolean;
  /** Why the stage refused, or null. */
  readonly refusalReason: string | null;
  /** The retrieved premise ids, in rank order. */
  readonly candidateIds: readonly string[];
  /** The measured Recall@20, when a certification was supplied. */
  readonly recallAt20: number | null;
  readonly efSearch: number;
  readonly topK: number;
  readonly m: number;
  readonly efConstruction: number;
  readonly layerMultiplier: number;
}

/**
 * STAGE B. The multi-layer HNSW zoom-in.
 *
 * THE RECALL FLOOR IS A REFUSAL, NOT A WARNING. A zoom-in that cannot be shown to find
 * the right premises is not a zoom-in -- it is a coin toss that happens to return 250 ids.
 * So the stage refuses, with the measured number in the reason, when:
 *
 *   - no certification was supplied: the floor cannot be verified, and an unverifiable
 *     floor is not a floor;
 *   - the certified Recall@20 is below the floor.
 */
export function stageBHnswZoomIn(input: StageBInput): StageBResult {
  const topK = input.topK ?? TOP_K;
  const efSearch = input.efSearch ?? (input.live === true ? EF_SEARCH_LIVE : EF_SEARCH_PRE_GAME);
  const floor = input.recallFloor ?? RECALL_FLOOR_AT_20;

  const refuse = (reason: string): StageBResult => ({
    refused: true,
    refusalReason: reason,
    candidateIds: [],
    recallAt20: input.certification?.recallAt20 ?? null,
    efSearch,
    topK,
    m: input.index.m,
    efConstruction: input.index.efConstruction,
    layerMultiplier: input.index.layerMultiplier,
  });

  if (input.certification === undefined) {
    return refuse(
      `no Recall@20 certification was supplied, so the ${floor} floor cannot be verified`,
    );
  }
  if (input.certification.recallAt20 < floor) {
    return refuse(
      `the certified Recall@20 is ${input.certification.recallAt20.toFixed(6)}, below the ${floor} floor`,
    );
  }

  const found = input.index.search(input.query, efSearch, topK);
  return {
    refused: false,
    refusalReason: null,
    candidateIds: found.map((item) => (input.survivors[item.id] as CorpusPremise).premiseId),
    recallAt20: input.certification.recallAt20,
    efSearch,
    topK,
    m: input.index.m,
    efConstruction: input.index.efConstruction,
    layerMultiplier: input.index.layerMultiplier,
  };
}

// ---------------------------------------------------------------------------
// STAGE C: THE BRIDGE SPECTRAL ROUTING
// ---------------------------------------------------------------------------

/** A symmetric matrix's eigen decomposition. */
interface EigenDecomposition {
  /** The eigenvalues, DESCENDING. */
  readonly values: readonly number[];
  /** The eigenvectors, as COLUMNS: vectors[column][row]. */
  readonly vectors: readonly (readonly number[])[];
}

/**
 * The cyclic Jacobi eigenvalue algorithm for a symmetric matrix.
 *
 * Deterministic, and accurate to machine precision for the well-conditioned spectra the
 * channel matrices produce. It is O(n^3) per sweep with a handful of sweeps, which is
 * nothing at n = 64.
 */
function symmetricEigen(input: readonly (readonly number[])[]): EigenDecomposition {
  const n = input.length;
  const a: number[][] = input.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_unused, row) =>
    Array.from({ length: n }, (_unused2, column) => (row === column ? 1 : 0)),
  );

  for (let sweep = 0; sweep < 64; sweep += 1) {
    let offDiagonal = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const value = a[p]?.[q] ?? 0;
        offDiagonal += value * value;
      }
    }
    if (offDiagonal < 1e-24) break;

    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p]?.[q] ?? 0;
        if (Math.abs(apq) < 1e-18) continue;
        const app = a[p]?.[p] ?? 0;
        const aqq = a[q]?.[q] ?? 0;
        const theta = (aqq - app) / (2 * apq);
        const sign = theta >= 0 ? 1 : -1;
        const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        for (let k = 0; k < n; k += 1) {
          const akp = a[k]?.[p] ?? 0;
          const akq = a[k]?.[q] ?? 0;
          if (a[k] !== undefined) {
            a[k]![p] = c * akp - s * akq;
            a[k]![q] = s * akp + c * akq;
          }
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p]?.[k] ?? 0;
          const aqk = a[q]?.[k] ?? 0;
          if (a[p] !== undefined) a[p]![k] = c * apk - s * aqk;
          if (a[q] !== undefined) a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k]?.[p] ?? 0;
          const vkq = v[k]?.[q] ?? 0;
          if (v[k] !== undefined) {
            v[k]![p] = c * vkp - s * vkq;
            v[k]![q] = s * vkp + c * vkq;
          }
        }
      }
    }
  }

  const paired = a.map((row, index) => ({ value: row[index] ?? 0, column: v.map((entry) => entry[index] ?? 0) }));
  paired.sort((left, right) => right.value - left.value);
  return {
    values: paired.map((entry) => entry.value),
    vectors: paired.map((entry) => entry.column),
  };
}

/** A channel's spectral decomposition. */
export interface ChannelSpectrum {
  /** The singular values, descending. */
  readonly singularValues: readonly number[];
  /** The right singular vectors, as columns. */
  readonly rightVectors: readonly (readonly number[])[];
  /** The left singular vectors, as rows: u[row][component]. */
  readonly leftVectors: readonly (readonly number[])[];
}

/**
 * The SVD of a channel matrix Z in R^{N x 64}, computed through the 64 x 64 Gram matrix.
 *
 * Z Z^T = U S^2 U^T, so the eigenvalues of Z^T Z are the squared singular values, and
 * U = Z V S^{-1}. The spectral bands are then contiguous RANGES of the descending
 * singular values, which is what the spec means by "splits the 64 singular directions into
 * M = 3 contiguous spectral bands of width 22/21/21".
 */
export function channelSpectrum(z: readonly (readonly number[])[]): ChannelSpectrum {
  const n = z.length;
  const dim = CHANNEL_DIM;
  const gram: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
  for (let row = 0; row < n; row += 1) {
    const vector = z[row] as readonly number[];
    for (let p = 0; p < dim; p += 1) {
      const vp = vec(vector, p);
      if (vp === 0) continue;
      for (let q = p; q < dim; q += 1) {
        const value = vp * vec(vector, q);
        gram[p]![q] = (gram[p]![q] as number) + value;
        if (p !== q) gram[q]![p] = (gram[q]![p] as number) + value;
      }
    }
  }
  const eigen = symmetricEigen(gram);
  const singularValues = eigen.values.map((value) => Math.sqrt(Math.max(value, 0)));
  const rightVectors = eigen.vectors;

  const leftVectors: number[][] = [];
  for (let row = 0; row < n; row += 1) {
    const vector = z[row] as readonly number[];
    const projected: number[] = [];
    for (let k = 0; k < dim; k += 1) {
      let total = 0;
      const right = rightVectors[k] as readonly number[];
      for (let d = 0; d < dim; d += 1) total += vec(vector, d) * (right[d] ?? 0);
      const singular = singularValues[k] ?? 0;
      projected.push(singular > 1e-12 ? total / singular : 0);
    }
    leftVectors.push(projected);
  }

  return { singularValues, rightVectors, leftVectors };
}

/** The band boundaries of the descending singular values. */
export interface SpectralBand {
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly width: number;
}

/** The three contiguous spectral bands: low (22), mid (21), high (21). */
export const SPECTRAL_BANDS: readonly SpectralBand[] = (() => {
  const bands: SpectralBand[] = [];
  let start = 0;
  for (let index = 0; index < SPECTRAL_BAND_COUNT; index += 1) {
    const width = SPECTRAL_BAND_WIDTHS[index] as number;
    bands.push({ label: SPECTRAL_BAND_LABELS[index] as string, start, end: start + width, width });
    start += width;
  }
  return bands;
})();

/** The band a singular direction index belongs to. */
export function bandOf(direction: number): SpectralBand {
  for (const band of SPECTRAL_BANDS) {
    if (direction >= band.start && direction < band.end) return band;
  }
  return SPECTRAL_BANDS[SPECTRAL_BANDS.length - 1] as SpectralBand;
}

/** Stage C's input. */
export interface StageCInput {
  /** The candidates, in Stage B's rank order. */
  readonly candidates: readonly CorpusPremise[];
  /** The game-context embedding. */
  readonly query: readonly number[];
  /** The context channel: the GIN output from Stage A. */
  readonly contextEmbeddings: ReadonlyMap<string, readonly number[]>;
  /** The Behavior Evidence Normalizer z-score per premise. */
  readonly behaviorZ?: Readonly<Record<string, number>>;
  /** The settlement-learned promotion weight per premise. */
  readonly promotionWeights?: Readonly<Record<string, number>>;
  /** How many active mechanisms to keep. Defaults to 50. */
  readonly activeTarget?: number;
  readonly lambdaBehavior?: number;
  readonly lambdaPromotion?: number;
  /** The promotion weight's lower clip. Defaults to 0.05. */
  readonly promotionMin?: number;
  /** The promotion weight's upper clip. Defaults to 3.00. */
  readonly promotionMax?: number;
}

/** One routed mechanism. */
export interface StageCMechanism {
  readonly premiseId: string;
  /** s_final(u,i). */
  readonly score: number;
  /** The band-weighted similarity <e_u, e_i>. */
  readonly similarity: number;
  /** The Behavior Evidence Normalizer z-score. */
  readonly behaviorZ: number;
  /** The promotion weight AFTER the clip. */
  readonly promotionWeight: number;
  /** The promotion weight BEFORE the clip. */
  readonly rawPromotionWeight: number;
  /** The high-frequency spectral embedding, h_i^high: the band-2 PCA scores. */
  readonly highEmbedding: readonly number[];
  /** The energy the premise puts in each band. */
  readonly bandEnergy: Readonly<Record<string, number>>;
}

/** Stage C's result. */
export interface StageCResult {
  /** The active mechanisms, in descending score. */
  readonly active: readonly StageCMechanism[];
  /** The spectral bands. */
  readonly bands: readonly SpectralBand[];
  /** The id channel's singular values, descending. */
  readonly singularValues: readonly number[];
  /** The clipped promotion weight per premise. */
  readonly promotionWeights: ReadonlyMap<string, number>;
}

/**
 * STAGE C. The BRIDGE dual-frequency spectral routing.
 *
 * Three channels (id, context, text) are each decomposed by SVD, and the 64 singular
 * directions are split into the three contiguous bands. The id channel's band-2 (high
 * frequency) scores are the h_i^high vectors Stage D differentiates -- the part of a
 * premise's identity that a coarse, low-frequency reading would miss.
 *
 * THE PROMOTION WEIGHT IS CLIPPED, and the clip is a hard bound: pi_i^(t) in [0.05, 3.00].
 * A promotion weight learned from settlement can run away -- a single lucky settlement can
 * push a premise's weight past any defensible bound -- and an unbounded weight in a
 * logarithmic term is unbounded influence.
 */
export function stageCbridgeSpectralRouting(input: StageCInput): StageCResult {
  const activeTarget = input.activeTarget ?? ACTIVE_MECHANISM_TARGET;
  const lambdaBehavior = input.lambdaBehavior ?? LAMBDA_BEHAVIOR;
  const lambdaPromotion = input.lambdaPromotion ?? LAMBDA_PROMOTION;
  // THE SPEC'S PROMOTION BAND IS A HARD BOUND. A caller may narrow the range the
  // settlement-learned weight is allowed to occupy; it may not widen it past the
  // [0.05, 3.00] band the spec names. Both bounds are compared against the exported
  // constants directly, so the constants are the gate rather than a label on it.
  const promotionMin = Math.max(input.promotionMin ?? PROMOTION_WEIGHT_MIN, PROMOTION_WEIGHT_MIN);
  const promotionMax = Math.min(input.promotionMax ?? PROMOTION_WEIGHT_MAX, PROMOTION_WEIGHT_MAX);

  const candidates = input.candidates;
  const idMatrix = candidates.map((premise) => {
    const embedding = premise.embedding ?? [];
    const row: number[] = [];
    for (let component = 0; component < CHANNEL_DIM; component += 1) row.push(vec(embedding, component));
    return row;
  });
  const contextMatrix = candidates.map((premise) => {
    const embedding = input.contextEmbeddings.get(premise.premiseId) ?? [];
    const row: number[] = [];
    for (let component = 0; component < CHANNEL_DIM; component += 1) row.push(vec(embedding, component));
    return row;
  });
  const textMatrix = candidates.map((premise) => {
    const embedding = premise.textEmbedding ?? premise.embedding ?? [];
    const row: number[] = [];
    for (let component = 0; component < CHANNEL_DIM; component += 1) row.push(vec(embedding, component));
    return row;
  });

  const idSpectrum = channelSpectrum(idMatrix);
  const contextSpectrum = channelSpectrum(contextMatrix);
  const textSpectrum = channelSpectrum(textMatrix);

  // THE BAND-WEIGHTED EMBEDDING. A band-weighted reconstruction of a premise from its
  // channel: the low band carries the coarse structure, the high band the fine structure,
  // and the weights say how much of each counts.
  const bandWeights: Record<string, number> = { low: 1.0, mid: 0.6, high: 0.3 };
  const buildEmbedding = (spectrum: ChannelSpectrum, row: number): number[] => {
    const embedding = new Array<number>(CHANNEL_DIM).fill(0);
    const left = spectrum.leftVectors[row] ?? [];
    for (let k = 0; k < CHANNEL_DIM; k += 1) {
      const singular = spectrum.singularValues[k] ?? 0;
      if (singular <= 0) continue;
      const weight = bandWeights[bandOf(k).label] ?? 0;
      const scale = weight * singular * (left[k] ?? 0);
      const right = spectrum.rightVectors[k] ?? [];
      for (let d = 0; d < CHANNEL_DIM; d += 1) embedding[d] = (embedding[d] as number) + scale * (right[d] ?? 0);
    }
    return embedding;
  };

  const highBand = SPECTRAL_BANDS[SPECTRAL_BANDS.length - 1] as SpectralBand;
  const promotionWeights = new Map<string, number>();
  const routed: StageCMechanism[] = [];

  candidates.forEach((premise, row) => {
    const rawPromotion = input.promotionWeights?.[premise.premiseId] ?? 1;
    const clipped = Math.min(promotionMax, Math.max(promotionMin, rawPromotion));
    promotionWeights.set(premise.premiseId, clipped);

    const idEmbedding = buildEmbedding(idSpectrum, row);
    const contextEmbedding = buildEmbedding(contextSpectrum, row);
    const textEmbedding = buildEmbedding(textSpectrum, row);
    const similarity =
      dot(input.query, idEmbedding) + dot(input.query, contextEmbedding) + dot(input.query, textEmbedding);

    const behavior = input.behaviorZ?.[premise.premiseId] ?? 0;
    const score = similarity + lambdaBehavior * behavior + lambdaPromotion * Math.log(clipped);

    const left = idSpectrum.leftVectors[row] ?? [];
    const highEmbedding: number[] = [];
    for (let k = highBand.start; k < highBand.end; k += 1) {
      highEmbedding.push((left[k] ?? 0) * (idSpectrum.singularValues[k] ?? 0));
    }

    const bandEnergy: Record<string, number> = {};
    for (const band of SPECTRAL_BANDS) {
      let energy = 0;
      for (let k = band.start; k < band.end; k += 1) {
        const singular = idSpectrum.singularValues[k] ?? 0;
        energy += singular * singular * (left[k] ?? 0) * (left[k] ?? 0);
      }
      bandEnergy[band.label] = energy;
    }

    routed.push({
      premiseId: premise.premiseId,
      score,
      similarity,
      behaviorZ: behavior,
      promotionWeight: clipped,
      rawPromotionWeight: rawPromotion,
      highEmbedding,
      bandEnergy,
    });
  });

  routed.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.premiseId < right.premiseId ? -1 : left.premiseId > right.premiseId ? 1 : 0;
  });

  return {
    active: routed.slice(0, activeTarget),
    bands: SPECTRAL_BANDS,
    singularValues: idSpectrum.singularValues,
    promotionWeights,
  };
}

// ---------------------------------------------------------------------------
// STAGE D: THE CROSS-EQUATION JACOBIAN AND THE STEIN SHRINKAGE
// ---------------------------------------------------------------------------

/** One concurrent mechanism, as Stage D sees it. */
export interface StageDMechanism {
  readonly premiseId: string;
  /** The target zone this mechanism acts on. */
  readonly target: string;
  /** The parents of the target zone. */
  readonly targetParents: readonly string[];
  /** w_i^eff. */
  readonly effectiveWeight: number;
  /** delta x_i. */
  readonly deltaX: number;
  /** delta_i: the mechanism's first-order effect on the game outcome. */
  readonly outcomeDelta: number;
  /** The mechanism's own partial, d Phi_game / dx_i. */
  readonly partial: number;
  /** The second partials d^2 Phi_game / dx_i dx_j, keyed by the other premise id. */
  readonly crossPartials: Readonly<Record<string, number>>;
  /** The high-frequency spectral embedding, h_i^high. */
  readonly highEmbedding: readonly number[];
  /** The first-order effect on the target-share vector. */
  readonly shareEffect: Readonly<Record<string, number>>;
  /** The upstream premises this mechanism follows. */
  readonly dependsOn: readonly string[];
}

/** Stage D's input. */
export interface StageDInput {
  readonly mechanisms: readonly StageDMechanism[];
  /** The target-share vector before the reallocation. */
  readonly baseShare: Readonly<Record<string, number>>;
  /** The zone a dampening coupling redirects the share into. */
  readonly redirectZone: string;
  /** The premise that owns the redirect zone. */
  readonly redirectPremiseId: string;
  /** tr(Sigma_hat_boot): the bootstrap trace the shrinkage is measured against. */
  readonly bootstrapTrace: number;
  /** The denominator guard. Defaults to 1e-12. */
  readonly epsilon?: number;
}

/** One concurrent pair, with its coupling and its cross term. */
export interface StageDPair {
  readonly i: string;
  readonly j: string;
  /** gamma_ij. */
  readonly gamma: number;
  /** The second partial d^2 Phi_game / dx_i dx_j. */
  readonly hessian: number;
  /** The UNSHRUNK cross term. */
  readonly term: number;
  /** The cross term after the Stein shrinkage. */
  readonly shrunkTerm: number;
  /** The target zone the two mechanisms share, or null. */
  readonly sharedTarget: string | null;
}

/** One reallocation of target share. */
export interface StageDReallocation {
  /** The zone the share left. */
  readonly from: string;
  /** The zone the share arrived in. */
  readonly to: string;
  /** The premise that owns the destination zone. */
  readonly destinationPremiseId: string;
  /** How much share moved. */
  readonly amount: number;
  /** The concurrent pair that caused the move. */
  readonly causePremises: readonly string[];
  /** The coupling that caused the move. */
  readonly gamma: number;
}

/** Stage D's result. */
export interface StageDResult {
  /** The concurrent mechanisms. */
  readonly concurrent: readonly string[];
  /** The number of concurrent interactions, m. */
  readonly interactionCount: number;
  /** Every causal chain, with the product of its partials. */
  readonly chainPaths: readonly { readonly path: readonly string[]; readonly product: number }[];
  /** The chain-rule trigger derivative: the sum over the paths of the products. */
  readonly chainDerivative: number;
  /** The coupling matrix, keyed "i|j". */
  readonly gamma: ReadonlyMap<string, number>;
  /** The concurrent pairs. */
  readonly pairs: readonly StageDPair[];
  /** The cross-delta vector: one entry per pair. */
  readonly crossDelta: readonly number[];
  /** The Euclidean norm of the UNSHRUNK cross-delta. */
  readonly unshrunkCrossMagnitude: number;
  /** The Euclidean norm of the SHRUNK cross-delta. */
  readonly shrunkCrossMagnitude: number;
  /** The Stein shrinkage factor. */
  readonly steinFactor: number;
  /** The first-order outcome delta. */
  readonly firstOrderDelta: number;
  /** The coupled outcome delta. */
  readonly coupledDelta: number;
  /** The target-share vector after the first-order effects only. */
  readonly firstOrderShare: Readonly<Record<string, number>>;
  /** The target-share vector after the coupling and the reallocation. */
  readonly finalShare: Readonly<Record<string, number>>;
  /** The reallocations the dampening couplings caused. */
  readonly reallocations: readonly StageDReallocation[];
}

/**
 * THE STEIN SHRINKAGE FACTOR.
 *
 *     delta_Stein = max(0, 1 - (m-2) tr(Sigma_hat_boot) / (||delta_cross||_2^2 + eps)) * delta_cross
 *
 * The factor is EXACTLY 1 when m < 3: with fewer than three concurrent interactions there
 * is no higher-order term to overfit, and deflating it would be deflating a first-order
 * effect that the data actually supports.
 *
 * The factor depends on the ratio of the bootstrap trace to the cross-delta's squared
 * norm, and on NOTHING ELSE -- in particular it does not depend on the SIGN of gamma. A
 * reinforcing coupling and a dampening coupling are shrunk by the same rule; what the sign
 * changes is where the share goes, not whether the higher-order term is trusted.
 */
export function steinShrinkageFactor(
  interactionCount: number,
  bootstrapTrace: number,
  crossMagnitudeSquared: number,
  epsilon: number = STEIN_EPSILON,
): number {
  if (!Number.isFinite(interactionCount) || interactionCount < 3) return 1;
  if (!Number.isFinite(bootstrapTrace) || bootstrapTrace <= 0) return 1;
  // The denominator's guard is never smaller than the spec's epsilon: a caller may make
  // the shrinkage MORE conservative, never less. The constant is compared here, so it is
  // the bound it is named as.
  const denominator = crossMagnitudeSquared + Math.max(epsilon, STEIN_EPSILON);
  if (!(denominator > 0)) return 0;
  const factor = 1 - ((interactionCount - 2) * bootstrapTrace) / denominator;
  return factor > 0 ? factor : 0;
}

/**
 * The zone two concurrent mechanisms share, or null.
 *
 * The spec's indicator is 1[Target(i) in Pa(Target(j)) or Target(i) = Target(j)], so the
 * shared zone is the one that is the other's target or the other's target's parent.
 */
export function sharedTargetZone(a: StageDMechanism, b: StageDMechanism): string | null {
  if (a.target === b.target) return a.target;
  if (a.targetParents.includes(b.target)) return b.target;
  if (b.targetParents.includes(a.target)) return a.target;
  return null;
}

/**
 * The cross-partial coupling between two concurrent mechanisms.
 *
 *     gamma_ij = sign(<h_i^high, h_j^high>) *
 *                1[Target(i) in Pa(Target(j)) or Target(i) = Target(j)]
 *
 * The high-frequency spectral embeddings say whether the two mechanisms point the same way
 * (gamma > 0, they REINFORCE) or against each other (gamma < 0, they DAMPEN and
 * redirect). A pair that does not share a target is not coupled at all: gamma = 0.
 */
export function crossPartialCoupling(a: StageDMechanism, b: StageDMechanism): number {
  const shared = sharedTargetZone(a, b);
  if (shared === null) return 0;
  const inner = dot(a.highEmbedding, b.highEmbedding);
  const sign = inner >= 0 ? 1 : -1;
  return sign;
}

/** Enumerate the causal chains among the mechanisms. */
function enumerateChainPaths(mechanisms: readonly StageDMechanism[]): { path: string[]; product: number }[] {
  const byId = new Map(mechanisms.map((mechanism) => [mechanism.premiseId, mechanism]));
  const paths: { path: string[]; product: number }[] = [];

  const walk = (currentId: string, path: string[], product: number, seen: Set<string>): void => {
    const current = byId.get(currentId);
    if (current === undefined) return;
    const children = mechanisms.filter((candidate) => (candidate.dependsOn ?? []).includes(currentId));
    if (children.length === 0) {
      if (path.length >= 2) paths.push({ path: [...path], product });
      return;
    }
    for (const child of children) {
      if (seen.has(child.premiseId)) continue;
      const nextSeen = new Set(seen);
      nextSeen.add(child.premiseId);
      walk(child.premiseId, [...path, child.premiseId], product * child.partial, nextSeen);
    }
  };

  // A chain is walked from its ROOT -- a mechanism whose parents are all outside the
  // concurrent set -- so that a path is enumerated once and not once per ancestor.
  for (const mechanism of mechanisms) {
    const parents = mechanism.dependsOn ?? [];
    const hasParentInSet = parents.some((parent) => byId.has(parent));
    if (hasParentInSet) continue;
    walk(mechanism.premiseId, [mechanism.premiseId], mechanism.partial, new Set([mechanism.premiseId]));
  }
  return paths;
}

/**
 * STAGE D. The cross-equation symbolic composition and the second-order Hessian couplings.
 *
 * THREE THINGS HAPPEN HERE, IN THIS ORDER:
 *
 *   1. THE CHAIN RULE. For a chained path e_1 -> e_2 -> e_3 the derivative of the
 *      expectation with respect to the trigger is the sum over the paths of the product of
 *      the partials. A path's product is the product of the partials of the mechanisms it
 *      runs through.
 *
 *   2. THE COUPLING MATRIX. For every concurrent pair, gamma_ij from the high-frequency
 *      spectral embeddings and the shared-target indicator, and the cross term
 *
 *          (1/2) gamma_ij w_i^eff w_j^eff (d^2 Phi_game / dx_i dx_j) delta x_i delta x_j
 *
 *      The spec writes the sum over ORDERED pairs with a 1/2 in front. Because gamma and
 *      the Hessian are symmetric, the ordered sum with the 1/2 is exactly the unordered
 *      sum, and this implementation takes the unordered sum directly.
 *
 *   3. THE STEIN SHRINKAGE. The cross-delta vector is deflated by the shrinkage factor
 *      before it is added to the outcome delta, and the SAME deflated term is what a
 *      dampening coupling reallocates. So the shrinkage is not a cosmetic post-process on
 *      the outcome: it scales the target-share reallocation too.
 *
 * AND THE REALLOCATION ITSELF. When gamma_ij < 0 the two mechanisms dampen each other:
 * the joint outcome effect is smaller than the sum of the first-order effects, and the
 * target share the dampened mechanisms were contending for is redirected into the seam
 * zone. The amount that moves is the magnitude of the (shrunk) cross term, so the
 * reallocation is a measurement of the coupling, not a constant.
 */
export function stageDCrossEquationComposition(input: StageDInput): StageDResult {
  const epsilon = input.epsilon ?? STEIN_EPSILON;
  const mechanisms = input.mechanisms;

  const chainPaths = enumerateChainPaths(mechanisms);
  const chainDerivative = chainPaths.reduce((sum, path) => sum + path.product, 0);

  const gamma = new Map<string, number>();
  const pairs: StageDPair[] = [];
  for (let i = 0; i < mechanisms.length; i += 1) {
    for (let j = i + 1; j < mechanisms.length; j += 1) {
      const left = mechanisms[i] as StageDMechanism;
      const right = mechanisms[j] as StageDMechanism;
      const coupling = crossPartialCoupling(left, right);
      gamma.set(`${left.premiseId}|${right.premiseId}`, coupling);
      const hessian = left.crossPartials[right.premiseId] ?? right.crossPartials[left.premiseId] ?? 0;
      const term =
        coupling * left.effectiveWeight * right.effectiveWeight * hessian * left.deltaX * right.deltaX;
      pairs.push({
        i: left.premiseId,
        j: right.premiseId,
        gamma: coupling,
        hessian,
        term,
        shrunkTerm: 0,
        sharedTarget: sharedTargetZone(left, right),
      });
    }
  }

  const crossDelta = pairs.map((pair) => pair.term);
  const unshrunkCrossMagnitude = norm(crossDelta);
  const unshrunkCrossMagnitudeSquared = unshrunkCrossMagnitude * unshrunkCrossMagnitude;
  const steinFactor = steinShrinkageFactor(
    mechanisms.length,
    input.bootstrapTrace,
    unshrunkCrossMagnitudeSquared,
    epsilon,
  );
  const shrunkCrossDelta = crossDelta.map((value) => steinFactor * value);
  const shrunkCrossMagnitude = norm(shrunkCrossDelta);

  const finalPairs = pairs.map((pair, index) => ({
    ...pair,
    shrunkTerm: shrunkCrossDelta[index] as number,
  }));

  const firstOrderDelta = mechanisms.reduce(
    (sum, mechanism) => sum + mechanism.effectiveWeight * mechanism.outcomeDelta,
    0,
  );
  const coupledDelta = firstOrderDelta + shrunkCrossDelta.reduce((sum, value) => sum + value, 0);

  // THE TARGET SHARE. First-order effects first, then the dampening reallocations.
  const share: Record<string, number> = {};
  for (const [zone, value] of Object.entries(input.baseShare)) share[zone] = value;
  const ensureZone = (zone: string): void => {
    if (share[zone] === undefined) share[zone] = 0;
  };
  for (const mechanism of mechanisms) {
    for (const [zone, value] of Object.entries(mechanism.shareEffect)) {
      ensureZone(zone);
      share[zone] = (share[zone] as number) + mechanism.effectiveWeight * value;
    }
  }
  const firstOrderShare: Record<string, number> = { ...share };

  const reallocations: StageDReallocation[] = [];
  for (const pair of finalPairs) {
    if (pair.gamma >= 0) continue;
    const shared = pair.sharedTarget;
    if (shared === null) continue;
    const amount = Math.abs(pair.shrunkTerm);
    if (!(amount > 0)) continue;
    ensureZone(shared);
    ensureZone(input.redirectZone);
    share[shared] = (share[shared] as number) - amount;
    share[input.redirectZone] = (share[input.redirectZone] as number) + amount;
    reallocations.push({
      from: shared,
      to: input.redirectZone,
      destinationPremiseId: input.redirectPremiseId,
      amount,
      causePremises: [pair.i, pair.j],
      gamma: pair.gamma,
    });
  }

  return {
    concurrent: mechanisms.map((mechanism) => mechanism.premiseId),
    interactionCount: mechanisms.length,
    chainPaths,
    chainDerivative,
    gamma,
    pairs: finalPairs,
    crossDelta,
    unshrunkCrossMagnitude,
    shrunkCrossMagnitude,
    steinFactor,
    firstOrderDelta,
    coupledDelta,
    firstOrderShare,
    finalShare: share,
    reallocations,
  };
}

// ---------------------------------------------------------------------------
// THE WHOLE FUNNEL
// ---------------------------------------------------------------------------

/** The router's input. */
export interface CognitiveRouterInput {
  readonly corpus: readonly CorpusPremise[];
  /** The active-context mask. */
  readonly context: ContextMask;
  /** The game-context embedding. */
  readonly query: readonly number[];
  /** The index's Recall@20 certification. Stage B refuses without one. */
  readonly certification?: RecallCertification;
  /** True for a live in-play decision. */
  readonly live?: boolean;
  readonly efSearch?: number;
  readonly sampleFloor?: number;
  readonly maxPremises?: number;
  readonly topK?: number;
  readonly activeTarget?: number;
  readonly behaviorZ?: Readonly<Record<string, number>>;
  readonly promotionWeights?: Readonly<Record<string, number>>;
  /** The target-share vector before the reallocation. */
  readonly baseShare?: Readonly<Record<string, number>>;
  /** The zone a dampening coupling redirects the share into. */
  readonly redirectZone?: string;
  /** The premise that owns the redirect zone. */
  readonly redirectPremiseId?: string;
  /** tr(Sigma_hat_boot) for the Stein shrinkage. */
  readonly bootstrapTrace?: number;
}

/** The router's result. */
export interface CognitiveRouterResult {
  readonly stageA: StageAResult;
  readonly stageB: StageBResult;
  readonly stageC: StageCResult | null;
  readonly stageD: StageDResult | null;
  /** True when the funnel refused to route. */
  readonly refused: boolean;
  /** Why the funnel refused, or null. */
  readonly refusalReason: string | null;
}

/**
 * RUN THE WHOLE FUNNEL: A -> B -> C -> D.
 *
 * The stages are separate functions and they are exported separately on purpose: each one
 * is independently testable, and a funnel whose stages can only be exercised together is a
 * funnel whose stages cannot be held to account.
 */
export function runCognitiveRouter(input: CognitiveRouterInput): CognitiveRouterResult {
  const stageA = stageAContextBitmask({
    corpus: input.corpus,
    context: input.context,
    query: input.query,
    ...(input.sampleFloor === undefined ? {} : { sampleFloor: input.sampleFloor }),
    ...(input.maxPremises === undefined ? {} : { maxPremises: input.maxPremises }),
  });

  const index = new HnswIndex({ dim: CHANNEL_DIM });
  stageA.survivors.forEach((premise, id) => {
    index.insert(id, premise.embedding ?? []);
  });

  const stageB = stageBHnswZoomIn({
    survivors: stageA.survivors,
    index,
    query: input.query,
    ...(input.topK === undefined ? {} : { topK: input.topK }),
    ...(input.live === undefined ? {} : { live: input.live }),
    ...(input.efSearch === undefined ? {} : { efSearch: input.efSearch }),
    ...(input.certification === undefined ? {} : { certification: input.certification }),
  });

  if (stageB.refused) {
    return {
      stageA,
      stageB,
      stageC: null,
      stageD: null,
      refused: true,
      refusalReason: stageB.refusalReason,
    };
  }

  const candidateIds = new Set(stageB.candidateIds);
  const candidates = stageA.survivors.filter((premise) => candidateIds.has(premise.premiseId));

  const stageC = stageCbridgeSpectralRouting({
    candidates,
    query: input.query,
    contextEmbeddings: stageA.contextEmbeddings,
    ...(input.behaviorZ === undefined ? {} : { behaviorZ: input.behaviorZ }),
    ...(input.promotionWeights === undefined ? {} : { promotionWeights: input.promotionWeights }),
    ...(input.activeTarget === undefined ? {} : { activeTarget: input.activeTarget }),
  });

  const highEmbeddings = new Map(stageC.active.map((mechanism) => [mechanism.premiseId, mechanism.highEmbedding]));
  const premiseById = new Map(input.corpus.map((premise) => [premise.premiseId, premise]));
  const stageDMechanisms: StageDMechanism[] = [];
  for (const mechanism of stageC.active) {
    const premise = premiseById.get(mechanism.premiseId);
    if (premise === undefined || premise.target === undefined) continue;
    stageDMechanisms.push({
      premiseId: premise.premiseId,
      target: premise.target,
      targetParents: premise.targetParents ?? [],
      effectiveWeight: premise.effectiveWeight ?? 1,
      deltaX: premise.deltaX ?? 0,
      outcomeDelta: premise.outcomeDelta ?? 0,
      partial: premise.operator?.dOutDIn ?? 1,
      crossPartials: premise.crossPartials ?? {},
      highEmbedding: highEmbeddings.get(premise.premiseId) ?? [],
      shareEffect: premise.shareEffect ?? {},
      dependsOn: premise.dependsOn ?? [],
    });
  }

  const stageD = stageDCrossEquationComposition({
    mechanisms: stageDMechanisms,
    baseShare: input.baseShare ?? {},
    redirectZone: input.redirectZone ?? "",
    redirectPremiseId: input.redirectPremiseId ?? "",
    bootstrapTrace: input.bootstrapTrace ?? 0,
  });

  return {
    stageA,
    stageB,
    stageC,
    stageD,
    refused: false,
    refusalReason: null,
  };
}
