/**
 * Pathway: a fast and flexible unified stream data processing framework
 *
 * arXiv:2307.13116v1 · lane:data_infra · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * No immediate build - GSE's signal ingestion is batch (weekly). Adopt the parity principle as GSE
 * policy: any future real-time feature path (live odds ticks, injury-news feeds) must run the same
 * logic as the batch path (unified engine, replay-identical results; lambda architecture rejected
 * by precedent) - backfilling as the feature-definition workflow (backfill-then-resume when a
 * feature bug is found) - and formalize a 'frozen-prefix contract' for the feature layer: pin
 * snapshot hashes of weeks 1-17, allow recomputation only of the head week, assert prefix-hash
 * equality in CI (a 1-day test harness giving Pathway's replay determinism on the existing batch
 * pipeline without adopting any new engine).
 *
 * ACCEPTANCE GATE: For any future real-time GSE path: ADOPT a streaming approach iff a candidate passes the parity
 * test (bit-identical batch prefix + resumed stream vs from-scratch batch) AND its 95th-percentile
 * event-to-feature latency on GSE's tick rate is <= 1 second at sustained throughput; REJECT any
 * design requiring separate batch and streaming logic.
 *
 * Ingest role: schemas (Pathway stream-processing harness: schema + watermark + windowed aggregates).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2307.13116v1" as const;
export const LANE = "data_infra" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `For any future real-time GSE path: ADOPT a streaming approach iff a candidate passes the parity
 * test (bit-identical batch prefix + resumed stream vs from-scratch batch) AND its 95th-percentile
 * event-to-feature latency on GSE's tick rate is <= 1 second at sustained throughput; REJECT any
 * design requiring separate batch and streaming logic.`;

export const CONFIG = {
  enabled: false,
  framework: "Pathway",
  mode: "streaming",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface StreamEvent {
  readonly key: string;
  readonly eventAt: string;
  readonly value: number;
}

export function isStreamEvent(x: unknown): x is StreamEvent {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["key"] === "string" &&
    typeof o["eventAt"] === "string" && Number.isFinite(Date.parse(o["eventAt"] as string)) &&
    isFiniteNumber(o["value"])
  );
}

/** Watermark: max event time minus allowed lateness. */
export function watermark(events: readonly unknown[], allowedLatenessMs: number): number | null {
  if (!isFiniteNumber(allowedLatenessMs) || allowedLatenessMs < 0) return null;
  let max = -Infinity;
  let n = 0;
  for (const e of events) {
    if (!isStreamEvent(e)) continue;
    const t = Date.parse(e.eventAt);
    if (t > max) max = t;
    n++;
  }
  if (n === 0) return null;
  return max - allowedLatenessMs;
}

/** Tumbling window aggregates keyed by window start. */
export function tumblingWindows(
  events: readonly unknown[],
  windowMs: number,
): Map<number, { n: number; sum: number; mean: number }> | null {
  if (!isFiniteNumber(windowMs) || windowMs <= 0) return null;
  const acc = new Map<number, { n: number; sum: number }>();
  for (const e of events) {
    if (!isStreamEvent(e)) continue;
    const t = Date.parse(e.eventAt);
    const w = Math.floor(t / windowMs) * windowMs;
    const slot = acc.get(w) ?? { n: 0, sum: 0 };
    slot.n++;
    slot.sum += e.value;
    acc.set(w, slot);
  }
  const out = new Map<number, { n: number; sum: number; mean: number }>();
  for (const [w, s] of acc) out.set(w, { n: s.n, sum: s.sum, mean: s.sum / s.n });
  return out;
}

/** Late-event filter: drop events behind the watermark. */
export function dropLate(events: readonly unknown[], wmMs: number): StreamEvent[] {
  if (!isFiniteNumber(wmMs)) return [];
  const out: StreamEvent[] = [];
  for (const e of events) {
    if (!isStreamEvent(e)) continue;
    if (Date.parse(e.eventAt) >= wmMs) out.push(e);
  }
  return out;
}
