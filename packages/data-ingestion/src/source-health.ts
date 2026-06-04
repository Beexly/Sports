/**
 * Source-health circuit breaker — pure logic deciding whether a data source is
 * healthy enough to trust right now. A silent upstream outage (ESPN / odds-api /
 * Kalshi / API-Sports) must NOT produce confidently-wrong edges: when a source
 * fails repeatedly or goes stale, we trip the breaker and the pipeline degrades
 * gracefully (skip the source, flag the prediction) instead of guessing.
 *
 * Pairs with prediction-engine/provenance.ts: provenance flags staleness per
 * prediction; this flags it at the source so we stop generating in the first place.
 * Pure, no I/O — timestamps passed in.
 */

export type BreakerState = "closed" | "degraded" | "open";

export interface SourceHealthInput {
  readonly source: string;
  /** Recent call outcomes, oldest → newest (true = success). */
  readonly recentOutcomes: readonly boolean[];
  /** ISO timestamp of the last successful fetch. */
  readonly lastSuccessAt?: string;
  /** Current time (ISO). */
  readonly now: string;
}

export interface SourceHealthOptions {
  /** Consecutive trailing failures that trip the breaker open. Default 3. */
  readonly failuresToOpen?: number;
  /** Minutes since last success beyond which data is stale. Default 30. */
  readonly staleMinutes?: number;
}

export interface SourceHealth {
  readonly source: string;
  readonly state: BreakerState;
  readonly consecutiveFailures: number;
  readonly stalenessMinutes: number | null;
  readonly stale: boolean;
  /** Should the pipeline use this source right now? */
  readonly usable: boolean;
}

export function assessSourceHealth(input: SourceHealthInput, options: SourceHealthOptions = {}): SourceHealth {
  const failuresToOpen = options.failuresToOpen ?? 3;
  const staleMinutes = options.staleMinutes ?? 30;

  // Count trailing failures (a run of the most recent false outcomes).
  let consecutiveFailures = 0;
  for (let i = input.recentOutcomes.length - 1; i >= 0; i--) {
    if (input.recentOutcomes[i] === false) consecutiveFailures += 1;
    else break;
  }

  const anyFailure = input.recentOutcomes.includes(false);
  const state: BreakerState =
    consecutiveFailures >= failuresToOpen ? "open" : anyFailure ? "degraded" : "closed";

  const stalenessMinutes = computeStaleness(input.lastSuccessAt, input.now);
  const stale = stalenessMinutes != null && stalenessMinutes >= staleMinutes;

  return {
    source: input.source,
    state,
    consecutiveFailures,
    stalenessMinutes,
    stale,
    usable: state !== "open" && !stale,
  };
}

function computeStaleness(lastSuccessAt: string | undefined, now: string): number | null {
  if (!lastSuccessAt) return null;
  const last = Date.parse(lastSuccessAt);
  const n = Date.parse(now);
  if (Number.isNaN(last) || Number.isNaN(n)) return null;
  return round2(Math.max(0, (n - last) / 60000));
}

function round2(x: number): number {
  return Number(x.toFixed(2));
}
