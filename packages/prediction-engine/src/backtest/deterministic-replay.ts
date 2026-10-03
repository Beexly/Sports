/**
 * Deterministic replay backtester (V4).
 *
 * Source: Edgerunner — deterministic low-latency prediction-market trading
 * engine with live/replay sharing one engine path. Learn-only.
 *
 * - Same StrategyFn for live and replay
 * - Seeded RNG → byte-identical decision journals
 * - Explicit inactive state (never invents prices)
 * - Inline risk gates (maxExposure, killSwitch)
 *
 * COMPOSES WITH: sealed-split.mjs, prereg-eval.ts.
 */

export interface MarketSnapshot {
  readonly t: number;
  readonly eventId: string;
  readonly price: number | null;
  readonly volume: number;
}

export interface GameEvent {
  readonly t: number;
  readonly eventId: string;
  readonly type: string;
  readonly data: Record<string, unknown>;
}

export type ReplayEvent = MarketSnapshot | GameEvent;

export interface Decision {
  readonly t: number;
  readonly state: string;
  readonly decision: string;
  readonly reason: string;
  readonly skipped?: boolean;
}

export interface RiskConfig {
  readonly maxExposure: number;
  readonly killSwitch?: (reason: string) => boolean;
}

export interface ReplayConfig {
  readonly seed: number;
  readonly risk: RiskConfig;
}

export type StrategyFn = (
  events: readonly ReplayEvent[],
  rng: () => number,
  exposure: number,
) => { decision: string; reason: string; stake: number };

export interface ReplayResult {
  readonly journal: readonly Decision[];
  readonly pnl: number;
  readonly skipped: number;
  readonly state: "ACTIVE" | "INACTIVE_NO_CONFIG" | "KILLED";
}

/** Deterministic seeded RNG (mulberry32). */
export function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ReplayEngine: takes an event stream and a strategy function.
 * The SAME strategy function is used for live and replay.
 * Determinism: seeded RNG threaded through every stochastic draw.
 */
export class ReplayEngine {
  private config: ReplayConfig | null = null;
  private state: "ACTIVE" | "INACTIVE_NO_CONFIG" | "KILLED" = "INACTIVE_NO_CONFIG";

  configure(config: ReplayConfig): void {
    this.config = config;
    this.state = "ACTIVE";
  }

  getState(): "ACTIVE" | "INACTIVE_NO_CONFIG" | "KILLED" {
    return this.state;
  }

  killSwitch(reason: string): void {
    this.state = "KILLED";
    void reason;
  }

  /**
   * Replay an event stream through the strategy function.
   * Returns a deterministic decision journal.
   */
  replay(events: readonly ReplayEvent[], strategy: StrategyFn): ReplayResult {
    if (!this.config) {
      return { journal: [], pnl: 0, skipped: 0, state: "INACTIVE_NO_CONFIG" };
    }
    if (this.state === "KILLED") {
      return { journal: [], pnl: 0, skipped: 0, state: "KILLED" };
    }

    const rng = seededRng(this.config.seed);
    const journal: Decision[] = [];
    let exposure = 0;
    let pnl = 0;
    let skipped = 0;

    // Sort events by timestamp for deterministic replay
    const sorted = [...events].sort((a, b) => a.t - b.t);

    for (const event of sorted) {
      // Risk gates
      if (this.config.risk.killSwitch?.("gate-check")) {
        this.state = "KILLED";
        journal.push({
          t: event.t,
          state: "KILLED",
          decision: "KILL",
          reason: "Risk gate killSwitch fired",
        });
        break;
      }

      // Never invents prices: skip if market snapshot is missing
      if ("price" in event && event.price === null) {
        journal.push({
          t: event.t,
          state: this.state,
          decision: "SKIPPED_NO_MARKET",
          reason: "Market snapshot missing — no price interpolation allowed",
          skipped: true,
        });
        skipped++;
        continue;
      }

      // Run strategy
      const result = strategy(sorted, rng, exposure);

      // Exposure check
      if (exposure + result.stake > this.config.risk.maxExposure) {
        journal.push({
          t: event.t,
          state: this.state,
          decision: "SKIPPED_EXPOSURE",
          reason: `Exposure limit: ${exposure + result.stake} > ${this.config.risk.maxExposure}`,
          skipped: true,
        });
        skipped++;
        continue;
      }

      exposure += result.stake;
      journal.push({
        t: event.t,
        state: this.state,
        decision: result.decision,
        reason: result.reason,
      });
    }

    return { journal, pnl, skipped, state: this.state };
  }
}
