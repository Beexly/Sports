/**
 * TRIALS REGISTRY — handoff §5's "honest registry of EVERY threshold/feature
 * tried". The registry is append-only and hash-chained so the trial history
 * itself is tamper-evident: multiple-testing corrections are only valid when
 * they see the TRUE trial count, and "an incomplete registry voids the
 * guarantee." Start it complete (today only reference features exist) and
 * every future τ grid, calibration candidate, feature probe, and model
 * admission gets recorded BEFORE its result can influence anything.
 *
 * Included controls: Benjamini–Hochberg FDR over a registered family, and the
 * per-feature market-conditional-MI admission trial (I(feature; Y | q_close)
 * against a permutation null) — the standing stop-rule that keeps Phase-3
 * feature search from laundering false discoveries. Deflated-Sharpe / White
 * Reality Check / Hansen-SPA base-MODEL admission remains QUEUED and is
 * deliberately not faked here; record model trials with kind
 * "model_admission" so the count is honest when those tests land.
 */

import { canonicalJson, sha256Hex, type Canonical } from "./provenance.js";
import { conditionalMiProbe } from "./placebo.js";

// ── Chain ────────────────────────────────────────────────────────────────────

export const TRIALS_GENESIS_HASH = sha256Hex("gse-edge-lab-trials-registry-genesis-v1");

export type TrialKind =
  | "feature_admission"
  | "threshold_grid"
  | "calibration_candidate"
  | "model_admission"
  | "other";

export type TrialOutcome = "admitted" | "rejected" | "recorded";

export interface TrialInput {
  /** Globally unique within the registry — duplicates throw. */
  readonly trialId: string;
  /** FDR family: corrections run over EVERY trial sharing this key. */
  readonly family: string;
  readonly kind: TrialKind;
  /** Caller-supplied ISO instant (kept explicit for reproducibility). */
  readonly recordedAt: string;
  /** Canonical description of what was tried (grid, feature, config…). */
  readonly params: Canonical;
  /** Valid p-value for this trial, or null when the trial has none. */
  readonly pValue: number | null;
  /** Optional raw statistic backing pValue (e.g. MI in nats). */
  readonly statistic?: number | null;
  readonly outcome: TrialOutcome;
  readonly notes?: string;
}

export interface TrialEntry extends TrialInput {
  readonly seq: number;
  readonly prevHash: string;
  readonly hash: string;
}

export class TrialsRegistryError extends Error {}

function entryHash(entry: Omit<TrialEntry, "hash">): string {
  return sha256Hex(
    canonicalJson({
      family: entry.family,
      kind: entry.kind,
      notes: entry.notes ?? null,
      outcome: entry.outcome,
      pValue: entry.pValue,
      params: entry.params,
      prevHash: entry.prevHash,
      recordedAt: entry.recordedAt,
      seq: entry.seq,
      statistic: entry.statistic ?? null,
      trialId: entry.trialId,
    }),
  );
}

function validateInput(input: TrialInput): void {
  if (!input.trialId) throw new TrialsRegistryError("trialId is required");
  if (!input.family) throw new TrialsRegistryError("family is required");
  if (Number.isNaN(Date.parse(input.recordedAt))) {
    throw new TrialsRegistryError(`recordedAt is not a valid instant: ${input.recordedAt}`);
  }
  if (input.pValue !== null && !(input.pValue >= 0 && input.pValue <= 1)) {
    throw new TrialsRegistryError(`pValue out of [0,1]: ${input.pValue}`);
  }
}

export interface TrialsRegistry {
  append(input: TrialInput): TrialEntry;
  entries(): readonly TrialEntry[];
  family(family: string): readonly TrialEntry[];
  verify(): { valid: boolean; brokenSeq: number | null };
}

/** Recursively freeze an entry so post-append mutation (including nested
 *  params) throws in strict mode instead of silently diverging from the hash. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

export function createTrialsRegistry(seed: readonly TrialEntry[] = []): TrialsRegistry {
  // Clone-and-freeze the seed so external references cannot mutate the chain.
  const chain: TrialEntry[] = seed.map((e) => deepFreeze(JSON.parse(JSON.stringify(e)) as TrialEntry));
  const seenIds = new Set(chain.map((e) => e.trialId));
  {
    const check = verifyTrialEntries(chain);
    if (!check.valid) {
      throw new TrialsRegistryError(`seed chain invalid at seq ${check.brokenSeq}`);
    }
  }
  return {
    append(input: TrialInput): TrialEntry {
      validateInput(input);
      if (seenIds.has(input.trialId)) {
        throw new TrialsRegistryError(`duplicate trialId: ${input.trialId}`);
      }
      const seq = chain.length;
      const prevHash = seq === 0 ? TRIALS_GENESIS_HASH : chain[seq - 1]!.hash;
      // Canonical clone severs caller references (params included) BEFORE
      // hashing, so what is hashed is exactly what is stored — then the sealed
      // entry is deep-frozen: the append-only guarantee is enforced by the
      // object itself, not by caller discipline.
      const params = JSON.parse(canonicalJson(input.params)) as Canonical;
      const unsealed = { ...input, params, seq, prevHash };
      const entry: TrialEntry = deepFreeze({ ...unsealed, hash: entryHash(unsealed) });
      chain.push(entry);
      seenIds.add(input.trialId);
      return entry;
    },
    entries: () => [...chain],
    family: (family: string) => chain.filter((e) => e.family === family),
    verify: () => verifyTrialEntries(chain),
  };
}

/** Standalone verifier so an exported registry can be independently checked. */
export function verifyTrialEntries(
  entries: readonly TrialEntry[],
): { valid: boolean; brokenSeq: number | null } {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    const expectedPrev = i === 0 ? TRIALS_GENESIS_HASH : entries[i - 1]!.hash;
    if (e.seq !== i || e.prevHash !== expectedPrev) return { valid: false, brokenSeq: i };
    const { hash, ...rest } = e;
    if (entryHash(rest) !== hash) return { valid: false, brokenSeq: i };
  }
  return { valid: true, brokenSeq: null };
}

// ── Benjamini–Hochberg FDR (step-up) ─────────────────────────────────────────

export interface BhResult {
  /** Number of non-null p-values the correction ran over. */
  readonly m: number;
  readonly q: number;
  /** Per input position: rejected (discovery) under BH at level q. */
  readonly rejected: readonly boolean[];
  /** Per input position: BH-adjusted p-value (null where input was null). */
  readonly adjusted: readonly (number | null)[];
}

export function benjaminiHochberg(pValues: readonly (number | null)[], q: number): BhResult {
  if (!(q > 0 && q < 1)) throw new TrialsRegistryError(`q out of (0,1): ${q}`);
  for (const p of pValues) {
    if (p !== null && !(p >= 0 && p <= 1)) throw new TrialsRegistryError(`pValue out of [0,1]: ${p}`);
  }
  const idx = pValues.flatMap((p, i) => (p === null ? [] : [i]));
  const m = idx.length;
  const rejected = new Array<boolean>(pValues.length).fill(false);
  const adjusted = new Array<number | null>(pValues.length).fill(null);
  if (m === 0) return { m, q, rejected, adjusted };

  const sorted = [...idx].sort((a, b) => (pValues[a] ?? 0) - (pValues[b] ?? 0));
  // Step-up: largest k with p_(k) <= k·q/m; reject the first k order statistics.
  let k = 0;
  sorted.forEach((pos, i) => {
    if ((pValues[pos] ?? 1) <= ((i + 1) * q) / m) k = i + 1;
  });
  for (let i = 0; i < k; i++) rejected[sorted[i]!] = true;
  // Adjusted p: cumulative min from the largest order statistic down.
  let running = 1;
  for (let i = m - 1; i >= 0; i--) {
    const pos = sorted[i]!;
    running = Math.min(running, ((pValues[pos] ?? 1) * m) / (i + 1));
    adjusted[pos] = running;
  }
  return { m, q, rejected, adjusted };
}

// ── Registered admission trials ──────────────────────────────────────────────

/**
 * Record ONE candidate feature's market-conditional-MI admission trial. The
 * probe asks whether the feature carries information about Y beyond q_close;
 * the p-value is against a within-stratum permutation null. Outcome is always
 * "recorded" — admission is decided at FAMILY level by decideFamilyAdmissions
 * so the FDR correction sees every sibling trial.
 */
export function recordFeatureAdmissionTrial(args: {
  readonly registry: TrialsRegistry;
  readonly family: string;
  readonly featureKey: string;
  readonly recordedAt: string;
  readonly values: readonly number[];
  readonly outcomes: readonly (0 | 1)[];
  readonly qClose: readonly number[];
  readonly strata?: number;
  readonly scoreBins?: number;
  readonly permutations?: number;
  readonly seed?: number;
  readonly notes?: string;
}): TrialEntry {
  const probe = conditionalMiProbe({
    scores: args.values,
    outcomes: args.outcomes,
    qClose: args.qClose,
    ...(args.strata !== undefined ? { strata: args.strata } : {}),
    ...(args.scoreBins !== undefined ? { scoreBins: args.scoreBins } : {}),
    ...(args.permutations !== undefined ? { permutations: args.permutations } : {}),
    ...(args.seed !== undefined ? { seed: args.seed } : {}),
  });
  return args.registry.append({
    trialId: `${args.family}:feature:${args.featureKey}`,
    family: args.family,
    kind: "feature_admission",
    recordedAt: args.recordedAt,
    params: {
      featureKey: args.featureKey,
      n: probe.n,
      permutations: probe.permutations,
      strata: probe.strata,
    },
    pValue: probe.pValue,
    statistic: probe.miNats,
    outcome: "recorded",
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  });
}

/** Record a threshold/hyperparameter grid scan as ONE honest trial record. */
export function recordThresholdGrid(args: {
  readonly registry: TrialsRegistry;
  readonly family: string;
  readonly gridName: string;
  readonly recordedAt: string;
  readonly candidates: Canonical;
  readonly chosen: Canonical;
  readonly pValue?: number | null;
  readonly notes?: string;
}): TrialEntry {
  return args.registry.append({
    trialId: `${args.family}:grid:${args.gridName}`,
    family: args.family,
    kind: "threshold_grid",
    recordedAt: args.recordedAt,
    params: { candidates: args.candidates, chosen: args.chosen, gridName: args.gridName },
    pValue: args.pValue ?? null,
    outcome: "recorded",
    ...(args.notes !== undefined ? { notes: args.notes } : {}),
  });
}

export interface FamilyAdmissionDecision {
  readonly trialId: string;
  readonly featureKey: string | null;
  readonly pValue: number | null;
  readonly adjustedP: number | null;
  readonly admitted: boolean;
}

export interface FamilyAdmissionsResult {
  readonly family: string;
  readonly q: number;
  readonly decisions: readonly FamilyAdmissionDecision[];
  readonly admittedKeys: readonly string[];
  /** Canonical hash of the admitted feature set — stamp it into downstream provenance. */
  readonly admittedSetHash: string;
}

/**
 * Family-level admission: BH-FDR over EVERY feature_admission trial recorded
 * for the family. Trials without a p-value are never admitted (and are not
 * counted in m). Admitting from a partial family is exactly the violation the
 * registry exists to prevent — always record first, decide once.
 */
export function decideFamilyAdmissions(
  registry: TrialsRegistry,
  family: string,
  q: number,
): FamilyAdmissionsResult {
  const trials = registry.family(family).filter((e) => e.kind === "feature_admission");
  const bh = benjaminiHochberg(trials.map((t) => t.pValue), q);
  const decisions: FamilyAdmissionDecision[] = trials.map((t, i) => {
    const params = t.params as { featureKey?: string } | null;
    return {
      trialId: t.trialId,
      featureKey: typeof params?.featureKey === "string" ? params.featureKey : null,
      pValue: t.pValue,
      adjustedP: bh.adjusted[i] ?? null,
      admitted: bh.rejected[i] ?? false,
    };
  });
  const admittedKeys = decisions
    .filter((d) => d.admitted && d.featureKey !== null)
    .map((d) => d.featureKey as string)
    .sort();
  return {
    family,
    q,
    decisions,
    admittedKeys,
    admittedSetHash: sha256Hex(canonicalJson({ admittedKeys, family, q })),
  };
}
