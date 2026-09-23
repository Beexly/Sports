/**
 * arXiv:2608.06635v2 — Modelling Athletic Ageing Relative to an Estimated Performance Envelope
 *
 * Real-time sports data platform layer: normalized event ingestion with dedupe windows and schema
 * validation, sub-second fan-out latency budgeting, and replay cursors for deterministic backfills.
 *
 * Improvement: Fit STAR age curves (GAMLSS C95 performance envelope plus nonlinear mixed-effects tempo model) per NFL position group and use the per-player BLUP level/tempo estimates as features in fantasy/DFS valuation and dynasty trade models.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT STAR age curves if rolling-origin RMSE on age-30+ WR seasons beats the static age-curve baseline by >=5% AND the near-linearity diagnostic is computed and reported (no silent gamma fitting). Reject if rho-hat(alpha,delta) ~= 0 (no level-tempo structure — the hierarchy buys nothing) or if the envelope is unstable across bootstrap refits.
 */

/** A raw ingested event. */
export interface RawEvent {
  source: string;
  eventId: string;
  ts: number; // epoch ms
  payload: Record<string, unknown>;
}

/** A normalized event ready for consumers. */
export interface NormEvent {
  source: string;
  eventId: string;
  ts: number;
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Normalize + dedupe: drop events whose eventId was seen within the dedupe
 * window, validate required fields, map source types to canonical types.
 */
export function ingest(
  events: readonly RawEvent[],
  seen: Set<string>,
  dedupeWindowMs: number,
  now: number,
  typeMap: ReadonlyMap<string, string>,
): { accepted: NormEvent[]; dropped: number } {
  const accepted: NormEvent[] = [];
  let dropped = 0;
  for (const e of events) {
    if (!e.eventId || !e.source || !(e.ts > 0)) { dropped++; continue; }
    if (seen.has(e.eventId) && now - e.ts < dedupeWindowMs) { dropped++; continue; }
    const type = typeMap.get(e.source) ?? "unknown";
    seen.add(e.eventId);
    accepted.push({ source: e.source, eventId: e.eventId, ts: e.ts, type, payload: e.payload });
  }
  return { accepted, dropped };
}

/**
 * Latency budget check: every accepted event must reach consumers within
 * budgetMs of its source timestamp.
 */
export function withinBudget(events: readonly NormEvent[], deliveredAt: number, budgetMs: number): boolean {
  if (budgetMs <= 0) throw new Error("withinBudget: budgetMs > 0");
  return events.every((e) => deliveredAt - e.ts <= budgetMs);
}

/**
 * Replay cursor: binary-search the first event at/after `from` for
 * deterministic backfills.
 */
export function replayCursor(events: readonly NormEvent[], from: number): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((events[mid]?.ts ?? 0) < from) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
