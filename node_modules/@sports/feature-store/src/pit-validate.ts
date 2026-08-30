/**
 * PIT (point-in-time) validation — single law for asOf correctness.
 *
 * Refuse-default rules:
 *  1. asOf must parse as finite UTC millis (ISO-8601)
 *  2. Query asOf must not be in the future beyond allowed skew (wall-clock)
 *  3. Stored feature.asOf must be <= query.asOf (no future leak)
 *  4. Writes claiming pitCorrect must pass structural checks
 *  5. Equal timestamps are allowed (asOf <= query is closed on the right)
 */

export type PitCode =
  | "ok"
  | "asof_missing"
  | "asof_invalid"
  | "asof_future"
  | "future_leak"
  | "entity_missing"
  | "feature_missing"
  | "pit_flag_false"
  | "rights_public_conflict";

export interface PitOk {
  readonly ok: true;
  readonly code: "ok";
  readonly asOfMs: number;
  readonly asOfIso: string;
}

export interface PitFail {
  readonly ok: false;
  readonly code: Exclude<PitCode, "ok">;
  readonly error: string;
  readonly asOfMs?: number;
}

export type PitResult = PitOk | PitFail;

export interface PitClock {
  /** Wall clock now in ms. Inject for tests. */
  nowMs(): number;
}

export const systemClock: PitClock = {
  nowMs: () => Date.now(),
};

/** Default: allow 2 minutes clock skew for distributed writers. */
export const DEFAULT_FUTURE_SKEW_MS = 120_000;

/**
 * Parse asOf string → ms. Rejects empty, non-ISO, and NaN.
 * Accepts trailing Z or offset; rejects date-only if Date.parse is NaN in engine
 * (we require explicit time for decision asOf — date-only is ambiguous).
 */
export function parseAsOfMs(asOf: string | null | undefined): PitResult {
  if (asOf == null || !String(asOf).trim()) {
    return { ok: false, code: "asof_missing", error: "asOf required (ISO-8601)" };
  }
  const raw = String(asOf).trim();
  // Prefer full datetime; allow Date.parse but reject pure dates without time for decisions
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      ok: false,
      code: "asof_invalid",
      error: "asOf must include time (date-only is ambiguous for PIT decisions)",
    };
  }
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    return { ok: false, code: "asof_invalid", error: `asOf not parseable: ${raw}` };
  }
  return { ok: true, code: "ok", asOfMs: ms, asOfIso: new Date(ms).toISOString() };
}

/**
 * Validate query asOf against wall clock — refuse future beyond skew.
 */
export function validateQueryAsOf(
  asOf: string | null | undefined,
  opts?: { clock?: PitClock; futureSkewMs?: number; allowFuture?: boolean },
): PitResult {
  const parsed = parseAsOfMs(asOf);
  if (!parsed.ok) return parsed;
  if (opts?.allowFuture) return parsed;
  const skew = opts?.futureSkewMs ?? DEFAULT_FUTURE_SKEW_MS;
  const now = (opts?.clock ?? systemClock).nowMs();
  if (parsed.asOfMs > now + skew) {
    return {
      ok: false,
      code: "asof_future",
      error: `asOf ${parsed.asOfIso} is in the future (skew ${skew}ms)`,
      asOfMs: parsed.asOfMs,
    };
  }
  return parsed;
}

/**
 * True iff recordAsOf <= queryAsOf (closed interval — equality allowed).
 */
export function isAsOfOnOrBefore(recordAsOf: string, queryAsOf: string): boolean {
  const r = parseAsOfMs(recordAsOf);
  const q = parseAsOfMs(queryAsOf);
  if (!r.ok || !q.ok) return false;
  return r.asOfMs <= q.asOfMs;
}

/**
 * Detect future leak: any record with asOf > query asOf for same feature+entity.
 */
export function detectFutureLeak(input: {
  queryAsOf: string;
  records: ReadonlyArray<{ asOf: string; featureId?: string; entityId?: string }>;
  featureId?: string;
  entityId?: string;
}): { leak: boolean; offenders: string[] } {
  const q = parseAsOfMs(input.queryAsOf);
  if (!q.ok) return { leak: false, offenders: [] };
  const offenders: string[] = [];
  for (const rec of input.records) {
    if (input.featureId != null && rec.featureId != null && rec.featureId !== input.featureId) {
      continue;
    }
    if (input.entityId != null && rec.entityId != null && rec.entityId !== input.entityId) {
      continue;
    }
    const r = parseAsOfMs(rec.asOf);
    if (!r.ok) continue;
    if (r.asOfMs > q.asOfMs) offenders.push(rec.asOf);
  }
  return { leak: offenders.length > 0, offenders };
}

/**
 * Pure select: latest record with asOf <= query among candidates.
 * Never returns a future-leaked row.
 */
export function selectLatestAsOf<T extends { asOf: string }>(
  candidates: readonly T[],
  queryAsOf: string,
): T | null {
  const q = parseAsOfMs(queryAsOf);
  if (!q.ok) return null;
  let best: T | null = null;
  let bestT = -Infinity;
  for (const c of candidates) {
    const r = parseAsOfMs(c.asOf);
    if (!r.ok || r.asOfMs > q.asOfMs) continue;
    if (r.asOfMs >= bestT) {
      bestT = r.asOfMs;
      best = c;
    }
  }
  return best;
}

export interface WriteAdmissionInput {
  featureId?: string;
  entityId?: string;
  asOf?: string;
  pitCorrect?: boolean;
  publicApiEligible?: boolean;
  sourceRights?: string;
}

/**
 * Validate a feature write for store admission.
 */
export function validateFeatureWrite(
  write: WriteAdmissionInput,
  opts?: { clock?: PitClock; futureSkewMs?: number },
): PitResult {
  if (!write.featureId?.trim()) {
    return { ok: false, code: "feature_missing", error: "featureId required" };
  }
  if (!write.entityId?.trim()) {
    return { ok: false, code: "entity_missing", error: "entityId required" };
  }
  if (write.pitCorrect !== true) {
    return {
      ok: false,
      code: "pit_flag_false",
      error: "pitCorrect must be true for store admission",
    };
  }
  if (write.sourceRights === "rights_hold" && write.publicApiEligible === true) {
    return {
      ok: false,
      code: "rights_public_conflict",
      error: "rights_hold cannot be public_api_eligible",
    };
  }
  // Write asOf may be historical; still must be valid ISO and not absurdly future
  return validateQueryAsOf(write.asOf, {
    clock: opts?.clock,
    futureSkewMs: opts?.futureSkewMs ?? DEFAULT_FUTURE_SKEW_MS,
  });
}

/**
 * Validate a PIT read query.
 */
export function validatePitQuery(
  q: { featureId?: string; entityId?: string; asOf?: string },
  opts?: { clock?: PitClock; futureSkewMs?: number; allowFuture?: boolean },
): PitResult {
  if (!q.featureId?.trim()) {
    return { ok: false, code: "feature_missing", error: "featureId required" };
  }
  if (!q.entityId?.trim()) {
    return { ok: false, code: "entity_missing", error: "entityId required" };
  }
  return validateQueryAsOf(q.asOf, opts);
}

/** Map pit fail code → HTTP-ish status for API layers. */
export function pitFailHttpStatus(code: Exclude<PitCode, "ok">): 400 | 403 | 422 {
  switch (code) {
    case "future_leak":
    case "pit_flag_false":
    case "rights_public_conflict":
      return 403;
    case "asof_future":
      return 422;
    default:
      return 400;
  }
}

/**
 * Assert selected record does not leak past query — belt after selectLatestAsOf.
 */
export function assertNoLeak(recordAsOf: string, queryAsOf: string): PitResult {
  if (!isAsOfOnOrBefore(recordAsOf, queryAsOf)) {
    return {
      ok: false,
      code: "future_leak",
      error: `record asOf ${recordAsOf} > query asOf ${queryAsOf}`,
    };
  }
  const q = parseAsOfMs(queryAsOf);
  if (!q.ok) return q;
  return q;
}
