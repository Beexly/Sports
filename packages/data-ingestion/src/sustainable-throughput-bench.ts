/**
 * Benchmarking Distributed Stream Data Processing Systems
 *
 * arXiv:1802.08496v2 · lane:data_infra · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port the sustainable-throughput methodology to GSE's serving layer evaluation (the paper's
 * concepts, not its systems): (1) sustainable-throughput test for the feature server: standing
 * gate p99 <= 50 ms -- ramp QPS in the driver (separate load-generator process, never in-process)
 * until p99 degrades, then define sustainable serving throughput as 90% of that knee; (2) event-
 * time latency for stateful serving paths: if the serving path ever joins live odds with point-in-
 * time features, measure end-to-end latency externally in the load driver -- never trust in-
 * process timers; (3) skew stress test: the paper's single-key-skew result is GSE's playoff/Super-
 * Bowl scenario -- test under 80/20 and single-key skew and verify the p99 gate holds; (4) spike
 * test: replay the paper's 0.84->0.28->0.84 fluctuation profile against the serving layer around
 * simulated game-time traffic spikes.
 *
 * ACCEPTANCE GATE: ADOPT the sustainable-throughput methodology as GSE's serving evaluation standard iff: (a)
 * sustainable QPS >= 2x peak expected game-day QPS; (b) under single-key skew, p99 <= 50 ms up to
 * >=50% of sustainable QPS; (c) spike recovery within 60 seconds. REJECT the absolute 2018 engine
 * numbers as decision inputs -- methodology only.
 *
 * Ingest role: schemas (serving-layer evaluation standard: knee test, skew, spike).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1802.08496v2" as const;
export const LANE = "data_infra" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the sustainable-throughput methodology as GSE's serving evaluation standard iff: (a)
 * sustainable QPS >= 2x peak expected game-day QPS; (b) under single-key skew, p99 <= 50 ms up to
 * >=50% of sustainable QPS; (c) spike recovery within 60 seconds. REJECT the absolute 2018 engine
 * numbers as decision inputs -- methodology only.`;

export const CONFIG = {
  enabled: false,
  p99GateMs: 50,
  skewScenarios: ["80/20", "single-key"],
  spikeProfile: [0.84, 0.28, 0.84],
  spikeRecoverySec: 60,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface LatencySample {
  readonly qps: number;
  readonly p99Ms: number;
}

export function isLatencySample(x: unknown): x is LatencySample {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["qps"]) && (o["qps"] as number) >= 0 && isFiniteNumber(o["p99Ms"]) && (o["p99Ms"] as number) >= 0;
}

/**
 * Sustainable throughput = 90% of the knee QPS where p99 first breaches the gate.
 * Null when the gate never breaches (no knee observed) or input malformed.
 */
export function sustainableThroughput(samples: readonly unknown[], p99GateMs = 50): number | null {
  const valid: LatencySample[] = [];
  for (const s of samples) if (isLatencySample(s)) valid.push(s);
  if (valid.length < 2 || !isFiniteNumber(p99GateMs) || p99GateMs <= 0) return null;
  const sorted = [...valid].sort((a, b) => a.qps - b.qps);
  for (const s of sorted) {
    if (s.p99Ms > p99GateMs) return 0.9 * s.qps;
  }
  return null;
}

/** Skew gate: p99 holds under the skew scenario up to frac of sustainable QPS. */
export function skewGateHolds(
  skewSamples: readonly unknown[],
  sustainableQps: number,
  frac: number,
  p99GateMs = 50,
): boolean | null {
  const valid: LatencySample[] = [];
  for (const s of skewSamples) if (isLatencySample(s)) valid.push(s);
  if (valid.length === 0 || !isFiniteNumber(sustainableQps) || !isFiniteNumber(frac) || frac <= 0) return null;
  const limit = frac * sustainableQps;
  const inScope = valid.filter((s) => s.qps <= limit);
  if (inScope.length === 0) return null;
  return inScope.every((s) => s.p99Ms <= p99GateMs);
}

/** Spike recovery: p99 returns under gate within maxSeconds after the spike. */
export function spikeRecovered(
  timeline: ReadonlyArray<{ tSec: number; p99Ms: number }>,
  spikeEndSec: number,
  p99GateMs = 50,
  maxSeconds = 60,
): boolean | null {
  if (timeline.length === 0 || ![spikeEndSec, p99GateMs, maxSeconds].every(isFiniteNumber)) return null;
  for (const p of timeline) {
    if (!isFiniteNumber(p.tSec) || !isFiniteNumber(p.p99Ms)) return null;
    if (p.tSec >= spikeEndSec && p.tSec <= spikeEndSec + maxSeconds && p.p99Ms <= p99GateMs) return true;
  }
  return false;
}

/** Full gate verdict (a)+(b)+(c) from the ledger. */
export function servingEvalVerdict(
  samples: readonly unknown[],
  skewSamples: readonly unknown[],
  timeline: ReadonlyArray<{ tSec: number; p99Ms: number }>,
  peakGameDayQps: number,
  spikeEndSec: number,
): { sustainableQps: number | null; qpsHeadroom2x: boolean; skewOk: boolean | null; spikeOk: boolean | null } {
  const sustainableQps = sustainableThroughput(samples);
  return {
    sustainableQps,
    qpsHeadroom2x: sustainableQps !== null && sustainableQps >= 2 * peakGameDayQps,
    skewOk: sustainableQps !== null ? skewGateHolds(skewSamples, sustainableQps, 0.5) : null,
    spikeOk: spikeRecovered(timeline, spikeEndSec),
  };
}
