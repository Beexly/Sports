/**
 * @file feature-matrix.ts
 * The signal-family registry and the 288-bit ACTIVE-CONTEXT BITMASK.
 *
 * WHY THIS FILE EXISTS. The MCP cognitive router (src/mcp/mcp-cognitive-router.ts) has to
 * answer one question fifty thousand times a second: "which of the 50,000 registered
 * formulas are even ADDRESSABLE given the game context in front of me?" A formula whose
 * conditioning variables are not present in the context cannot fire, no matter how
 * attractive its score is. A formula whose conditioning cell has fewer than 30 observations
 * cannot be estimated, no matter how attractive its score is.
 *
 * The spec (Frontier GSE 50k-Signal Causal Reasoning Engine, section 3.3, Stage A) puts the
 * addressability test in front of a 288-bit bitmask:
 *
 *   "A registered signal family f sets bit f in a 288-bit active context mask; any formula
 *    whose conditioning variables are absent or fail the sample floor (N_{f,g} < 30) is
 *    pruned immediately."
 *
 * TWO NUMBERS, AND THEY ARE NOT THE SAME NUMBER. The spec names 279 signal families and a
 * 288-bit mask. This file keeps BOTH numbers, and the difference is deliberate and
 * documented rather than papered over:
 *
 *   - SIGNAL_FAMILY_COUNT = 279 -- how many families the registry actually defines. Family
 *     f occupies bit f, so the families live in bits 0..278.
 *   - CONTEXT_MASK_BITS = 288 -- the width of the mask itself. Bits 279..287 are RESERVED
 *     HEADROOM: they are always zero, they are addressable, and writing to them is allowed
 *     (they are the extension points for families that have not been registered yet) but no
 *     registered family can ever set them.
 *
 * The mask is wider than the family count on purpose. A mask that is exactly as wide as the
 * family list would have to be rewritten every time a family is added; the headroom is what
 * makes the registry extensible without touching the mask. The important property is not the
 * width -- it is that the mask is a REAL BITMASK and not an array of booleans, because a
 * boolean array is O(families) per membership test and O(families) per allocation, and the
 * whole point of the bitmask is that Stage A prunes 50,000 formulas in well under a
 * millisecond.
 *
 * THE STORAGE. 288 bits is stored as a `bigint` -- one immutable value, O(1) membership,
 * O(1) set. The task's own arithmetic in the spec's summary ("four 64-bit words") is off:
 * 4 x 64 = 256, which is 32 bits short of 288. 288 divides evenly by 32 (nine 32-bit
 * words), so `toWords32()` exposes the mask as exactly nine words, and the ninth word holds
 * only its low 32 bits. The bigint is the source of truth; the words are a view.
 */

/** The width of the active-context mask, in bits. */
export const CONTEXT_MASK_BITS = 288;

/** The width of one exposed word, in bits. 288 = 9 x 32 exactly. */
export const CONTEXT_MASK_WORD_BITS = 32;

/** The number of 32-bit words the 288-bit mask is exposed as. */
export const CONTEXT_MASK_WORD_COUNT = CONTEXT_MASK_BITS / CONTEXT_MASK_WORD_BITS;

/**
 * How many signal families the registry defines.
 *
 * The spec names 279 families and a 288-bit mask. The extra nine bits are reserved
 * headroom -- see the file header. Families occupy bits 0..278.
 */
export const SIGNAL_FAMILY_COUNT = 279;

/**
 * The sample floor N_{f,g} >= 30.
 *
 * A conditioning cell with fewer than 30 observations cannot support the estimator the
 * formula claims, so the formula is pruned before it is ever scored. The floor is INCLUSIVE:
 * exactly 30 observations passes. See `meetsSampleFloor`.
 */
export const SAMPLE_FLOOR = 30;

/** One registered signal family. */
export interface SignalFamilySpec {
  /** The bit this family occupies in the 288-bit mask. Equal to its position in the registry. */
  readonly index: number;
  /** The stable family id used by formulas to name a conditioning variable. */
  readonly familyId: string;
  /** A human-readable label. */
  readonly label: string;
  /** The grouping `g` in the sample floor N_{f,g}. */
  readonly group: string;
}

/**
 * The families that carry a name.
 *
 * The first eight are the repo's canonical `SignalFamily` values (see
 * src/reasoning/signal-registry.ts). They are repeated here because THIS registry is a
 * different thing: the canonical list is the eight top-level buckets the reasoning layer
 * reports on, while this registry is the formula-level conditioning vocabulary the MCP
 * router prunes against. The two overlap; they are not the same list.
 */
const NAMED_FAMILIES: readonly SignalFamilySpec[] = [
  { index: 0, familyId: "MARKET", label: "market price and microstructure", group: "PRICE" },
  { index: 1, familyId: "EFFICIENCY", label: "play efficiency and expected value", group: "MODEL" },
  { index: 2, familyId: "TRENCHES", label: "trench reports and personnel notes", group: "SCOUTING" },
  { index: 3, familyId: "SITUATIONAL", label: "game situation and script", group: "SITUATION" },
  { index: 4, familyId: "MICROCLIMATE", label: "venue microclimate", group: "VENUE" },
  { index: 5, familyId: "MARKET_MICROSTRUCTURE", label: "order book and market structure", group: "PRICE" },
  { index: 6, familyId: "LUCK", label: "variance and luck", group: "MODEL" },
  { index: 7, familyId: "NARRATIVE", label: "news and narrative", group: "TEXT" },
  { index: 8, familyId: "INJURY", label: "player availability reports", group: "ROSTER" },
  { index: 9, familyId: "SCHEME", label: "defensive scheme and shell", group: "TACTIC" },
  { index: 10, familyId: "TACTIC", label: "offensive and defensive tactics", group: "TACTIC" },
  { index: 11, familyId: "WEATHER", label: "weather and roof state", group: "VENUE" },
  { index: 12, familyId: "ROSTER", label: "roster and depth chart", group: "ROSTER" },
  { index: 13, familyId: "DEPTH_CHART", label: "depth chart position", group: "ROSTER" },
  { index: 14, familyId: "GAME_SCRIPT", label: "game script state", group: "SITUATION" },
  { index: 15, familyId: "VENUE", label: "venue characteristics", group: "VENUE" },
  { index: 16, familyId: "SURFACE", label: "playing surface", group: "VENUE" },
  { index: 17, familyId: "OFFICIATING", label: "officiating crew", group: "SITUATION" },
  { index: 18, familyId: "TRAVEL", label: "travel and schedule density", group: "SITUATION" },
  { index: 19, familyId: "REST", label: "rest and recovery", group: "SITUATION" },
  { index: 20, familyId: "FATIGUE", label: "workload and fatigue", group: "SITUATION" },
  { index: 21, familyId: "POSITION", label: "positional matchup", group: "TACTIC" },
  { index: 22, familyId: "USAGE", label: "snap and usage shares", group: "MODEL" },
  { index: 23, familyId: "VEGAS_LINE", label: "consensus and closing lines", group: "PRICE" },
];

/**
 * The remaining families, generated deterministically so the registry is a fixed-size
 * vocabulary rather than a hand-maintained list of 279 lines. The ids are stable
 * (`SYN-024` .. `SYN-278`) and the indices are contiguous, so bit f always belongs to the
 * family at position f.
 */
const SYNTHETIC_FAMILIES: readonly SignalFamilySpec[] = Array.from(
  { length: SIGNAL_FAMILY_COUNT - NAMED_FAMILIES.length },
  (_unused, offset) => {
    const index = NAMED_FAMILIES.length + offset;
    return {
      index,
      familyId: `SYN-${String(index).padStart(3, "0")}`,
      label: `synthetic conditioning family ${index}`,
      group: "SYNTHETIC",
    };
  },
);

/** Every registered signal family, in bit order. */
export const SIGNAL_FAMILY_REGISTRY: readonly SignalFamilySpec[] = [
  ...NAMED_FAMILIES,
  ...SYNTHETIC_FAMILIES,
];

/** familyId -> bit index. */
const FAMILY_INDEX: ReadonlyMap<string, number> = new Map(
  SIGNAL_FAMILY_REGISTRY.map((family) => [family.familyId, family.index]),
);

/**
 * The bit index of a registered family, or -1 when the family is not registered.
 *
 * A non-registered family is a caller error, not a silent miss: the router has to be able
 * to tell "this family is not in the mask" (prune) from "this family does not exist" (a
 * bug in the caller), and collapsing the two would let a typo prune a formula forever with
 * no diagnostic.
 */
export function familyIndex(familyId: string): number {
  return FAMILY_INDEX.get(familyId) ?? -1;
}

/** True when the family is in the registry. */
export function isRegisteredFamily(familyId: string): boolean {
  return FAMILY_INDEX.has(familyId);
}

/**
 * The 288-bit active-context mask.
 *
 * Immutable. Every mutator returns a new mask. The bit pattern lives in a single `bigint`,
 * so membership is a shift and a mask, and the whole mask is one allocation.
 */
export class ContextMask {
  /** The private constructor keeps the invariant "the bit pattern is in range". */
  private constructor(private readonly bits: bigint) {}

  /** The empty mask: no family is active. */
  static empty(): ContextMask {
    return new ContextMask(0n);
  }

  /**
   * Build a mask from raw bit indices.
   *
   * Throws when an index is outside the 288-bit mask. A mask wider than the declared width
   * would silently make the headroom unreachable, and a negative index would throw inside
   * the shift, so both are refused here, at the boundary, where the caller can see them.
   */
  static fromBitIndices(indices: readonly number[]): ContextMask {
    let bits = 0n;
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= CONTEXT_MASK_BITS) {
        throw new RangeError(
          `context mask: bit index ${String(index)} is outside the ${CONTEXT_MASK_BITS}-bit mask`,
        );
      }
      bits |= 1n << BigInt(index);
    }
    return new ContextMask(bits);
  }

  /**
   * Build a mask from registered family ids.
   *
   * Throws on an unknown family: a family id that is not in the registry cannot be given a
   * bit, and inventing one would let a typo change which formulas are addressable.
   */
  static fromFamilyIds(familyIds: readonly string[]): ContextMask {
    const indices: number[] = [];
    for (const familyId of familyIds) {
      const index = familyIndex(familyId);
      if (index < 0) {
        throw new Error(`context mask: family "${familyId}" is not registered`);
      }
      indices.push(index);
    }
    return ContextMask.fromBitIndices(indices);
  }

  /** The bit index of a family, or -1 when it is not registered. */
  static indexOf(familyId: string): number {
    return familyIndex(familyId);
  }

  /** True when the family is registered AND active. */
  hasFamily(familyId: string): boolean {
    const index = familyIndex(familyId);
    if (index < 0) return false;
    return this.hasBit(index);
  }

  /** True when the bit is set. */
  hasBit(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= CONTEXT_MASK_BITS) return false;
    return ((this.bits >> BigInt(index)) & 1n) === 1n;
  }

  /** A new mask with the family set. */
  withFamily(familyId: string): ContextMask {
    const index = familyIndex(familyId);
    if (index < 0) throw new Error(`context mask: family "${familyId}" is not registered`);
    return this.withBit(index);
  }

  /** A new mask with the bit set. */
  withBit(index: number): ContextMask {
    if (!Number.isInteger(index) || index < 0 || index >= CONTEXT_MASK_BITS) {
      throw new RangeError(
        `context mask: bit index ${String(index)} is outside the ${CONTEXT_MASK_BITS}-bit mask`,
      );
    }
    return new ContextMask(this.bits | (1n << BigInt(index)));
  }

  /** How many families are active. */
  get activeCount(): number {
    let count = 0;
    for (const word of this.toWords32()) {
      let value = word >>> 0;
      while (value !== 0) {
        value &= value - 1;
        count += 1;
      }
    }
    return count;
  }

  /** The position of the highest set bit plus one; zero for the empty mask. */
  get bitLength(): number {
    if (this.bits === 0n) return 0;
    return this.bits.toString(2).length;
  }

  /** The raw bit pattern. */
  toBigInt(): bigint {
    return this.bits;
  }

  /**
   * The mask as nine 32-bit words, least significant first.
   *
   * Nine is exact: 288 = 9 x 32. The ninth word holds only its low 32 bits, which is why
   * the reserved headroom (bits 279..287) is visible in word 8 and nowhere else.
   */
  toWords32(): readonly number[] {
    const words: number[] = [];
    for (let word = 0; word < CONTEXT_MASK_WORD_COUNT; word += 1) {
      words.push(Number((this.bits >> BigInt(word * CONTEXT_MASK_WORD_BITS)) & 0xffffffffn));
    }
    return words;
  }

  /** The mask as a 72-character hex string, most significant word first. */
  toHex(): string {
    const words = this.toWords32();
    let hex = "";
    for (let word = words.length - 1; word >= 0; word -= 1) {
      hex += (words[word] as number).toString(16).padStart(8, "0");
    }
    return hex;
  }

  /** The active family ids, in bit order. */
  toFamilyIds(): readonly string[] {
    const ids: string[] = [];
    for (const family of SIGNAL_FAMILY_REGISTRY) {
      if (this.hasBit(family.index)) ids.push(family.familyId);
    }
    return ids;
  }
}

/**
 * The sample floor test, INCLUSIVE.
 *
 * `n = 30` passes; `n = 29` is pruned. The comparison is written the way the spec writes
 * it -- the floor is a MINIMUM, so a cell at the floor is admitted.
 */
export function meetsSampleFloor(n: number, floor: number = SAMPLE_FLOOR): boolean {
  if (!Number.isFinite(n)) return false;
  return n >= floor;
}

/**
 * Prune a formula on the two Stage A rules.
 *
 * Returns the reason the formula was pruned, or null when it survives.
 *
 *   - "absent-context": a conditioning family is registered but not active in the mask.
 *   - "sample-floor": a conditioning cell has fewer observations than the floor.
 *
 * The two rules are reported separately because they are different failures: an absent
 * family means the formula cannot fire for this game, and a thin cell means the formula
 * could fire but could not be estimated.
 */
export function pruneReason(
  conditioningFamilies: readonly string[],
  sampleSizes: Readonly<Record<string, number>>,
  mask: ContextMask,
  floor: number = SAMPLE_FLOOR,
): "absent-context" | "sample-floor" | null {
  for (const family of conditioningFamilies) {
    if (!mask.hasFamily(family)) return "absent-context";
  }
  for (const family of conditioningFamilies) {
    const n = sampleSizes[family];
    if (n === undefined || !meetsSampleFloor(n, floor)) return "sample-floor";
  }
  return null;
}
