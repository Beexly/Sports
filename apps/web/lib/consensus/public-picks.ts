import { assertIngestible, fetchWithFailover } from '@sports/data-ingestion';

/**
 * Shape of public betting consensus data from a cleared source.
 * The factor engine expects `consensus: { overCount, underCount }`.
 */
export interface PublicConsensus {
  /** Number of public bets on the OVER side. */
  overCount: number;
  /** Number of public bets on the UNDER side. */
  underCount: number;
}

/**
 * Parse public consensus JSON into the expected shape.
 * Pure function: easy to test, no side effects.
 *
 * @param raw - Parsed JSON from a public consensus endpoint.
 * @returns PublicConsensus with overCount/underCount, or null if absent/invalid.
 */
export function parsePublicConsensus(raw: unknown): PublicConsensus | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Try to extract overCount and underCount from common field names
  const getNum = (key: string): number | null => {
    const val = obj[key];
    if (typeof val === 'number' && !isNaN(val) && val >= 0) {
      return val;
    }
    return null;
  };

  const overCount =
    getNum('overCount') ??
    getNum('over') ??
    getNum('overBets') ??
    getNum('overPicks') ??
    getNum('over') ?? // fallback for percentage-style fields (will be handled below)
    null;

  const underCount =
    getNum('underCount') ??
    getNum('under') ??
    getNum('underBets') ??
    getNum('underPicks') ??
    getNum('under') ??
    null;

  // If we have raw counts, return them directly
  if (overCount !== null && underCount !== null) {
    return { overCount, underCount };
  }

  // If we have percentages and a total, derive counts
  const overPct = getNum('overPct') ?? getNum('overPercent') ?? getNum('overPercentage');
  const underPct = getNum('underPct') ?? getNum('underPercent') ?? getNum('underPercentage');
  const totalBets = getNum('totalBets') ?? getNum('total') ?? getNum('sampleSize');

  if (
    overPct !== null &&
    underPct !== null &&
    totalBets !== null &&
    overPct >= 0 &&
    overPct <= 100 &&
    underPct >= 0 &&
    underPct <= 100 &&
    Math.abs(overPct + underPct - 100) < 1 // allow small rounding differences
  ) {
    const overCount = Math.round((overPct / 100) * totalBets);
    const underCount = totalBets - overCount;
    return { overCount, underCount };
  }

  // Absent or malformed data -> null (honest absent-data contract)
  return null;
}

/**
 * Fetch public betting consensus for a given event from Action Network.
 * Guarded by assertIngestible; returns null when data is absent or source blocked.
 *
 * @param eventId - The external event ID (e.g., Action Network game ID).
 * @param marketType - The market type (e.g., 'spread', 'total', 'moneyline').
 * @returns PublicConsensus with over/under counts, or null if absent.
 */
export async function fetchPublicConsensus(
  eventId: string,
  marketType: string = 'total'
): Promise<PublicConsensus | null> {
  try {
    // Guard: ensure we're allowed to ingest from this source
    assertIngestible('action-network');

    // UNVERIFIED ENDPOINT — Action Network blocks automated requests (403 on curl).
    // The endpoint shape below is a placeholder; the founder must confirm the actual
    // API path by inspecting the browser network tab on an actionnetwork.com page.
    // Returns null when absent (honest absent-data contract, never fabricates).
    const url = `https://www.actionnetwork.com/api/v1/event/${eventId}/consensus?market=${marketType}`;

    // Fetch with failover: (urls, fetcher, options)
    // No retryOn — the failover handler tries alternate hosts; caller gets
    // the first OK response or an error after all hosts exhausted.
    const failoverResult = await fetchWithFailover([url], fetch, {
      timeoutMs: 15_000,
      init: { headers: { Accept: 'application/json' } },
    });

    if (!failoverResult.response.ok) {
      // HTTP error status (4xx/5xx) means data is absent or source is blocking
      // Per honest contract: return null, never fabricate
      return null;
    }

    const json = await failoverResult.response.json();
    return parsePublicConsensus(json);
  } catch {
    // Catch-all for any unexpected errors (should be rare with failover)
    // Per honest contract: treat as absent data
    return null;
  }
}

/**
 * Type guard for PublicConsensus.
 */
export function isPublicConsensus(
  val: unknown
): val is PublicConsensus {
  return (
    typeof val === 'object' &&
    val !== null &&
    'overCount' in val &&
    'underCount' in val &&
    typeof (val as PublicConsensus).overCount === 'number' &&
    typeof (val as PublicConsensus).underCount === 'number' &&
    (val as PublicConsensus).overCount >= 0 &&
    (val as PublicConsensus).underCount >= 0
  );
}