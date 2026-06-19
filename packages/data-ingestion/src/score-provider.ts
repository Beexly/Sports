/**
 * Free, keyless SETTLEMENT score providers — the provider-agnostic interface.
 *
 * WHY: settlement (recording final scores so picks can be graded) and schedules
 * do NOT need a paid odds key — the facts (who played, the final score, whether
 * the game is over) are available from free, already-rights-cleared sources
 * (ESPN public API, nflverse open data). This layer lets settlement fall back to
 * those sources when the paid Odds-API path is unavailable, WITHOUT touching the
 * Odds-API primary and WITHOUT introducing a live odds dependency.
 *
 * SCOPE BOUNDARY (read before wiring anything): this is SCORES + SCHEDULES only.
 * Live odds/lines remain the paid Odds API's job — none of this prices a market.
 *
 * RIGHTS BOUNDARY: every provider here is gated by the Scraping Clearance Engine.
 * Because this package is a standalone workspace that does not depend on
 * `apps/web`, the real `checkClearance` is INJECTED by the caller (its shape is
 * mirrored structurally below). A provider that is not granted clearance returns
 * `{ healthy: false }` and extracts NOTHING — it never throws and never falls back
 * to extracting without a decision (fail-closed).
 *
 * PURITY: `fetchFn` (and the clearance fn, on the pool) are injectable so the
 * whole layer unit-tests against a mocked fetch with NO live network.
 */

// ─── Structural clearance types ────────────────────────────────────────────────
// These mirror apps/web/lib/scraping/clearance-engine.ts + source-rights-registry.ts
// by SHAPE so the real functions satisfy them structurally when injected. We do
// NOT re-implement the engine here; we only describe the surface a provider needs.

/** Mirrors RightsSnapshot from the source-rights registry (point-in-time capture). */
export interface ScoreRightsSnapshot {
  readonly source_id: string;
  readonly source_url: string;
  readonly status: string;
  readonly automation_allowed: boolean;
  readonly public_logged_off_allowed: boolean;
  readonly commercial_display_allowed: boolean;
  readonly storage_allowed: boolean;
  readonly derived_analytics_allowed: boolean;
  readonly model_training_allowed: boolean;
  readonly attribution_required: boolean;
  readonly attribution_text: string | null;
  readonly reviewed_at: string;
  readonly snapshotted_at: string;
}

/** Mirrors ClearanceRequest. `mode`/`tool_id`/intents kept as widened literals. */
export interface ScoreClearanceRequest {
  readonly source_id: string;
  readonly mode: string;
  readonly tool_id: string;
  readonly intents: readonly string[];
}

/** Mirrors the subset of ClearanceResult a provider consumes. */
export interface ScoreClearanceResult {
  readonly allowed: boolean;
  readonly rightsSnapshot: ScoreRightsSnapshot | null;
}

/**
 * The injectable clearance function. The real `checkClearance` from
 * `apps/web/lib/scraping/clearance-engine.ts` satisfies this structurally.
 */
export type CheckClearanceFn = (request: ScoreClearanceRequest) => ScoreClearanceResult;

// ─── Normalized score shape ────────────────────────────────────────────────────

/**
 * One normalized final-score record. Mirrors the fields settlement actually
 * reads: a stable key, the two teams, the score, completion flag and start time.
 * Scores are `number | null` (null when a game is not yet final or the source
 * reports a non-numeric placeholder — settlement leaves such picks PENDING).
 */
export interface NormalizedScore {
  /** Stable per-game key (provider-native id or a derived key). */
  readonly gameKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly completed: boolean;
  /** Scheduled start (ISO 8601) when the source provides it; null otherwise. */
  readonly commenceTime: string | null;
}

/** A normalized result from ONE score provider for one sport fetch. */
export interface NormalizedScoreResult {
  /** Provider id (also its rights-registry source_id). */
  readonly provider: string;
  readonly scores: readonly NormalizedScore[];
  /** False when clearance was denied, the source errored, or the payload was unusable. */
  readonly healthy: boolean;
  /** Diagnostic reason when unhealthy. Never contains secrets. */
  readonly error?: string;
  /** Rights snapshot captured at extraction time; null when not extracted. */
  readonly rightsSnapshot?: ScoreRightsSnapshot | null;
}

// ─── Provider interface ─────────────────────────────────────────────────────────

/** Options threaded into a provider fetch (all optional/injectable). */
export interface ScoreProviderOptions {
  /** Injectable fetch (defaults to globalThis.fetch). Tests pass a mock. */
  readonly fetchFn?: typeof fetch;
  /**
   * Injectable clearance check. When omitted the provider FAILS CLOSED
   * (healthy:false) — it never extracts without a clearance decision.
   */
  readonly checkClearance?: CheckClearanceFn;
}

/** A source of normalized final scores for a sport. All free adapters implement this. */
export interface ScoreProvider {
  /** Human/log label. */
  readonly name: string;
  /** Rights-registry source_id this provider is gated by. */
  readonly sourceId: string;
  /**
   * Fetch + normalize final scores for `sportKey`, looking back `daysBack` days.
   * MUST NOT throw on a bad payload, a network error, or a clearance denial —
   * it returns `{ healthy: false }` instead. The pool relies on this contract.
   */
  fetchScores(
    sportKey: string,
    daysBack: number,
    options?: ScoreProviderOptions,
  ): Promise<NormalizedScoreResult>;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────────

/** Build an empty, unhealthy result for a provider (used on any failure). */
export function unhealthyScoreResult(
  provider: string,
  error: string,
  rightsSnapshot: ScoreRightsSnapshot | null = null,
): NormalizedScoreResult {
  return { provider, scores: [], healthy: false, error, rightsSnapshot };
}

/**
 * Run the injected clearance check and return the snapshot when allowed, or a
 * typed denial reason. Centralizes the fail-closed behavior: when no clearance
 * function is injected, extraction is DENIED.
 */
export function resolveClearance(
  request: ScoreClearanceRequest,
  checkClearance: CheckClearanceFn | undefined,
):
  | { readonly allowed: true; readonly rightsSnapshot: ScoreRightsSnapshot | null }
  | { readonly allowed: false; readonly reason: string } {
  if (!checkClearance) {
    return { allowed: false, reason: "clearance-fn-not-injected" };
  }
  let result: ScoreClearanceResult;
  try {
    result = checkClearance(request);
  } catch (err) {
    return {
      allowed: false,
      reason: `clearance-threw:${err instanceof Error ? err.name : "unknown"}`,
    };
  }
  if (!result.allowed) {
    return { allowed: false, reason: "clearance-denied" };
  }
  return { allowed: true, rightsSnapshot: result.rightsSnapshot };
}

/** Coerce an unknown score value to `number | null` (non-finite → null). */
export function coerceScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
