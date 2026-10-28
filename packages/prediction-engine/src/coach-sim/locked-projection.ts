/**
 * Locked Coach Projection — the play is produced before any book is read.
 *
 * Doctrine: we are the bookmakers. We review the game, the coaches, the
 * players, the schemes, the usage, the injuries, the matchups. We form a
 * projection. Only after that projection is locked do we look at the lines.
 * If our total is 43 and the market is 50, we bet. We do not chase.
 *
 * This function takes only coach inputs. It does not accept OddsInput.
 * The fence rejects any market token inside this directory.
 */
import { createHash } from "node:crypto";
import { simulateCoachGame, type CoachSimInput, type CoachProjection } from "./markov-simulator.js";
import {
  allocateTargets,
  sinkhornTargetAllocation,
  applyShadowHaircut,
  type EligibleTarget,
  type TargetAllocation,
} from "./sinkhorn-targets.js";
import { sealLock, type CadenceVersion, type SnapshotLock } from "../public-baseline/cadence.js";

/**
 * Canonical JSON matching Python's `json.dumps(sort_keys=True, separators=(",",":"))`.
 *
 * Emits the string directly rather than rebuilding an object and calling JSON.stringify.
 * That matters: a JS object enumerates integer-like keys ("2", "10") in ascending numeric
 * order before all other keys, so `{"10":..,"2":..}` round-trips to `{"2":..,"10":..}` while
 * Python sorts lexicographically to `"10","2"`. Any config keyed by week or family id hits it.
 *
 * Also throws on values that cannot round-trip identically (NaN, Infinity, functions,
 * symbols, non-plain objects) instead of silently sealing a corrupted digest.
 */
export function canonicalizeForSeal(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error(`canonicalizeForSeal: non-finite number ${String(value)}`);
    }
    if (!Number.isSafeInteger(value as number) && Number.isInteger(value as number)) {
      throw new Error(`canonicalizeForSeal: integer beyond MAX_SAFE_INTEGER ${String(value)}`);
    }
    return JSON.stringify(value);
  }
  if (t === "string" || t === "boolean") return JSON.stringify(value);
  if (t === "function" || t === "symbol" || t === "bigint" || t === "undefined") {
    throw new Error(`canonicalizeForSeal: unsupported ${t}`);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? "null" : canonicalizeForSeal(v))).join(",")}]`;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("canonicalizeForSeal: non-plain object (Date/Map/Set/typed array)");
  }
  const rec = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(rec).sort()) {
    const v = rec[k];
    if (v === undefined) continue;
    parts.push(`${JSON.stringify(k)}:${canonicalizeForSeal(v)}`);
  }
  return `{${parts.join(",")}}`;
}

/** SHA-256 over the canonical form. Cross-runtime stable. */
export function computeCanonicalSealDigest(payload: unknown): string {
  return createHash("sha256").update(canonicalizeForSeal(payload), "utf8").digest("hex");
}

import { PROB_PER_POINT } from "../constants.js";
import {
  assertTauSealed,
  recoverTau,
  type FourthDownDecisionSample,
} from "../2309-00756-inverse-mdp-fourth-down.js";

export type { FourthDownDecisionSample };

export interface LockedCoachProjection extends CoachProjection {
  lockedAt: string;
  inputHash: string;
  // No market fields. Comparison happens later, in Class B, at Step N.
}

export type PureCoachInput = Omit<CoachSimInput, "injuryDropOff">;

export type TuesdayCoachInput = PureCoachInput & {
  /**
   * Observed 4th-down go/kick decisions for this coach. When absent, tau
   * falls back to the documented 0.5 prior and the lock records
   * coachTauSource = "prior" so no caller mistakes it for a recovery.
   */
  readonly fourthDownDecisions?: readonly FourthDownDecisionSample[];
};

export interface TuesdayTargetRooms {
  readonly homeTargets: readonly EligibleTarget[];
  readonly awayTargets: readonly EligibleTarget[];
}

export interface TuesdayCoachBaselineLock extends LockedCoachProjection {
  readonly coachMindsetHash: string;
  readonly cadenceLock: SnapshotLock;
  readonly frozenCoachInput: Readonly<PureCoachInput>;
  readonly baseRooms: TuesdayTargetRooms;
  readonly homeTargetAllocations: readonly TargetAllocation[];
  readonly awayTargetAllocations: readonly TargetAllocation[];
  /** Recovered risk-preference quantile, sealed at v1.0 and immutable. */
  readonly coachTau: number;
  /** Total inverse-MDP residual at the recovered tau. */
  readonly coachTauResidual: number;
  readonly coachTauSource: "recovered" | "prior";
}

export interface CadenceInjuryOverlayInput {
  readonly version: Exclude<CadenceVersion, "v1.0">;
  readonly recordedAtIso: string;
  readonly inactivePlayerIds: readonly string[];
  /** Points-equivalent EPA dropoff credited to the home side. */
  readonly homeInjuryPointsDelta?: number;
  /** Points-equivalent EPA dropoff credited to the away side. */
  readonly awayInjuryPointsDelta?: number;
}

/**
 * Canonical SHA-256 of the immutable coach mindset. injuryDropOff and any
 * wall-clock value are excluded by construction. tau is included because it
 * is a stable coach trait, not a weekly input.
 */
export function computeCoachMindsetSha256(
  input: PureCoachInput,
  coachTau = 0.5,
): string {
  const canonical = canonicalizeForSeal({
    home: input.homeTeam,
    away: input.awayTeam,
    week: input.week,
    support: input.coachSupport,
    pass: input.neutralPassRate ?? null,
    staff: input.staffAggression ?? null,
    staffAway: input.staffAggressionAway ?? null,
    shadows: (input.shadows ?? []).map((s) => `${s.wr}:${s.shadowRate}`).sort(),
    belichickHome: input.belichickHome ?? null,
    belichickAway: input.belichickAway ?? null,
    tau: coachTau,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function lockTuesdayCoachBaseline(
  input: TuesdayCoachInput,
  rooms: TuesdayTargetRooms = { homeTargets: [], awayTargets: [] },
  lockedAtIso: string = new Date().toISOString(),
): TuesdayCoachBaselineLock {
  // TuesdayCoachInput already omits injuryDropOff by construction, so there is
  // nothing to strip here; the simulateCoachGame call below pins it to 0 so a
  // caller that widens the type at runtime still cannot seed the hash with an
  // injury term. Only the 4th-down decision sample set is separated out.
  const { fourthDownDecisions, ...pureCoachInput } = input;

  const recovered = fourthDownDecisions && fourthDownDecisions.length > 0
    ? { ...recoverTau([...fourthDownDecisions]), source: "recovered" as const }
    : { tau: 0.5, totalResidual: Number.NaN, source: "prior" as const };

  const projection = simulateCoachGame({ ...pureCoachInput, injuryDropOff: 0 });
  const coachMindsetHash = computeCoachMindsetSha256(pureCoachInput, recovered.tau);
  const shadows = pureCoachInput.shadows ?? [];
  const homeTargetAllocations = applyShadowHaircut(
    allocateTargets([...rooms.homeTargets]),
    shadows,
  );
  const awayTargetAllocations = applyShadowHaircut(
    allocateTargets([...rooms.awayTargets]),
    shadows,
  );
  const cadenceLock = sealLock(
    "v1.0",
    {
      coachMindsetHash,
      coachTau: recovered.tau,
      scoreMean: projection.scoreMean,
      marginMean: projection.marginMean,
      winProbHome: projection.winProbHome,
    },
    lockedAtIso,
    lockedAtIso,
  );

  return Object.freeze({
    ...projection,
    lockedAt: lockedAtIso,
    inputHash: hashInput({ ...pureCoachInput, injuryDropOff: 0 }),
    coachMindsetHash,
    cadenceLock,
    frozenCoachInput: Object.freeze({ ...pureCoachInput }),
    baseRooms: Object.freeze({
      homeTargets: Object.freeze([...rooms.homeTargets]),
      awayTargets: Object.freeze([...rooms.awayTargets]),
    }),
    homeTargetAllocations: Object.freeze(homeTargetAllocations),
    awayTargetAllocations: Object.freeze(awayTargetAllocations),
    coachTau: recovered.tau,
    coachTauResidual: recovered.totalResidual,
    coachTauSource: recovered.source,
  });
}

/**
 * Apply a mid-week injury overlay. Sinkhorn target reallocation plus a
 * bounded points-equivalent EPA dropoff. The sealed mindset, its hash, and
 * tau are carried over byte-for-byte. Throws if tau moved.
 *
 * The reallocation now runs through `sinkhornTargetAllocation`, so the active
 * set's shares are the column marginal of an entropy-regularized transport plan
 * rather than a bare softmax normalization. Both the source marginal (survivors'
 * raw base shares) and the demand marginal (the coach cost model over survivors)
 * are explicit, and the plan's marginals are enforced by the solver. The seal is
 * unaffected either way: target allocations are not part of the cadence-lock
 * payload, so no seal check reads them.
 */
export function applyInjuryOverlay(
  baselineLock: TuesdayCoachBaselineLock,
  overlay: CadenceInjuryOverlayInput,
): TuesdayCoachBaselineLock {
  // SEAL CHECK 0: verify the incoming lock's cadence seal before trusting
  // coachTau. The internal checks below recompute the mindset hash from the
  // lock's own fields, so a crafted lock carrying a recomputed hash would pass
  // them. Recomputing the cadence seal over the payload catches a mutated
  // tau/hash/projection triple; a v2.0+ input is refused so an overlay cannot
  // be stacked on another overlay.
  if (baselineLock.cadenceLock.version !== "v1.0") {
    throw new Error(
      `CRITICAL: injury overlay must be applied to a v1.0 Tuesday baseline, got ${baselineLock.cadenceLock.version}`,
    );
  }
  const verifiedSeal = sealLock(
    "v1.0",
    {
      coachMindsetHash: baselineLock.coachMindsetHash,
      coachTau: baselineLock.coachTau,
      scoreMean: baselineLock.scoreMean,
      marginMean: baselineLock.marginMean,
      winProbHome: baselineLock.winProbHome,
    },
    baselineLock.cadenceLock.validTime,
    baselineLock.cadenceLock.transactionTime,
  );
  if (verifiedSeal.merkle !== baselineLock.cadenceLock.merkle) {
    throw new Error(
      "CRITICAL: baseline cadence seal does not match its payload (hash/tau consistency failed)",
    );
  }

  const scratched = new Set(overlay.inactivePlayerIds);
  const shadows = baselineLock.frozenCoachInput.shadows ?? [];
  const activeHome = baselineLock.baseRooms.homeTargets.filter(
    (t) => !scratched.has(t.playerId),
  );
  const activeAway = baselineLock.baseRooms.awayTargets.filter(
    (t) => !scratched.has(t.playerId),
  );
  const homeTargetAllocations = applyShadowHaircut(
    sinkhornTargetAllocation(activeHome),
    shadows,
  );
  const awayTargetAllocations = applyShadowHaircut(
    sinkhornTargetAllocation(activeAway),
    shadows,
  );

  const homeDelta = overlay.homeInjuryPointsDelta ?? 0;
  const awayDelta = overlay.awayInjuryPointsDelta ?? 0;
  const netMarginShift = homeDelta - awayDelta;
  const totalShift = homeDelta + awayDelta;

  const marginMean = Number((baselineLock.marginMean + netMarginShift).toFixed(2));
  const scoreMean = Number(Math.max(27, baselineLock.scoreMean + totalShift).toFixed(2));
  // Points-to-win-probability slope. PROB_PER_POINT is the one shared binding
  // (constants.ts) that mind-reasoning's situational HFA prior also consumes, so
  // the injury overlay and the HFA prior speak the same units — one margin point
  // is worth the same win probability in both. It used to be a bare literal here
  // with only a "Must match" comment holding the two surfaces together.
  const winProbHome = Number(
    Math.min(
      0.96,
      Math.max(0.04, baselineLock.winProbHome + netMarginShift * PROB_PER_POINT),
    ).toFixed(4),
  );

  // SEAL CHECK 1: tau must not move on an injury path.
  const nextTau = baselineLock.coachTau;
  if (!assertTauSealed(baselineLock.coachTau, nextTau)) {
    throw new Error("CRITICAL: recovered coach tau mutated during injury overlay");
  }

  // SEAL CHECK 2: the sealed mindset hash must recompute to the same value.
  const recomputedHash = computeCoachMindsetSha256(
    baselineLock.frozenCoachInput,
    nextTau,
  );
  if (recomputedHash !== baselineLock.coachMindsetHash) {
    throw new Error("CRITICAL: CoachMindsetHash mutated during injury overlay");
  }

  const cadenceLock = sealLock(
    overlay.version,
    {
      coachMindsetHash: baselineLock.coachMindsetHash,
      coachTau: nextTau,
      inactivePlayerIds: overlay.inactivePlayerIds,
      marginMean,
      scoreMean,
      winProbHome,
    },
    overlay.recordedAtIso,
    overlay.recordedAtIso,
  );

  return Object.freeze({
    ...baselineLock,
    marginMean,
    scoreMean,
    winProbHome,
    cadenceLock,
    homeTargetAllocations: Object.freeze(homeTargetAllocations),
    awayTargetAllocations: Object.freeze(awayTargetAllocations),
    coachTau: nextTau,
  });
}

/** Alias kept for the plan's cadence naming. */
export const applyCadenceInjuryOverlay = applyInjuryOverlay;

export function verifyCoachMindsetUnchanged(
  a: TuesdayCoachBaselineLock,
  b: TuesdayCoachBaselineLock,
): boolean {
  return (
    a.coachMindsetHash === b.coachMindsetHash &&
    a.coachTau === b.coachTau &&
    computeCoachMindsetSha256(b.frozenCoachInput, b.coachTau) === a.coachMindsetHash
  );
}

export function lockCoachProjection(
  input: CoachSimInput,
  lockedAtIso?: string,
): LockedCoachProjection {
  // Pin injuryDropOff to 0 for the sealed projection. Injury is an execution
  // weight applied on top of the lock (applyCadenceInjuryOverlay), not part of
  // the coach's identity — matching lockTuesdayCoachBaseline and the contract
  // documented on hashInput. Feeding the injury term into the simulator here
  // made marginMean/scoreMean depend on injury while inputHash did not, so the
  // hash stopped identifying the projection and a receipt keyed on it could
  // not detect an injury revision. See locked-projection.test.ts.
  const projection = simulateCoachGame({ ...input, injuryDropOff: 0 });
  return {
    ...projection,
    // Pinned when the caller supplies a time so a re-run reproduces the lock.
    // Falls back to wall-clock only for backward compatibility with callers
    // that have not adopted the pinned path yet.
    lockedAt: lockedAtIso ?? new Date().toISOString(),
    inputHash: hashInput({ ...input, injuryDropOff: 0 }),
  };
}

function hashInput(input: CoachSimInput): string {
  // Deterministic hash of the coach inputs only. No market numbers.
  //
  // injuryDropOff is deliberately excluded. Injury state is an execution
  // weight applied on top of the sealed projection, not part of the coach's
  // identity. Including it made the "sealed" projection non-reproducible
  // across injury revisions — the same game with the same coach inputs would
  // hash differently when only the injury estimate changed.
  const raw = canonicalizeForSeal({
    home: input.homeTeam,
    away: input.awayTeam,
    week: input.week,
    support: input.coachSupport,
    pass: input.neutralPassRate ?? null,
    staff: input.staffAggression ?? null,
    shadows: (input.shadows ?? []).map((s) => s.wr + ":" + s.shadowRate).sort(),
  });
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

