/**
 * Sleeper NFL client — a READ-ONLY public-data source for the fantasy surface.
 *
 * WHY SLEEPER: Sleeper's public HTTP API is a free, keyless source of real NFL
 * facts — weekly per-player box-score stats, current season/week state, and the
 * "trending" add/drop velocity (a genuine market-sentiment signal of which players
 * the fantasy public is moving on). It is FACTS only (no projections, no odds),
 * which fits GSE's "no fabricated stats / real data only" rule.
 *
 * SAFETY / RIGHTS — non-negotiable (mirrors kalshi-client.ts):
 *   • PUBLIC read-only GETs only. No auth, no key, no writes, no league mutation.
 *   • This module is a pure ADAPTER. It is NOT wired into any live ingestion cron.
 *   • Sleeper's terms are permissive for personal use but COMMERCIAL use is a
 *     ToS-gray area — before any production extraction job runs, Sleeper MUST be
 *     registered in apps/web/lib/scraping/source-rights-registry.ts and pass the
 *     Scraping Clearance Engine (checkClearance), with a RightsSnapshot captured
 *     at extraction time. Wiring this to the cron is a separate, operator-gated step.
 *   • Only FACTS are extracted (stats, ids, counts) — never article bodies,
 *     proprietary projections, or protected graphics.
 *
 * Endpoints used (api.sleeper.app/v1):
 *   GET /state/nfl
 *   GET /players/nfl/trending/{add|drop}?lookback_hours=&limit=
 *   GET /stats/nfl/regular/{season}/{week}
 */

const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";
// A hung call must never block a caller's ingestion loop.
const SLEEPER_TIMEOUT_MS = 15 * 1000;

export class SleeperError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SleeperError";
  }
}

/** Current NFL season/week as Sleeper reports it. */
export interface SleeperNflState {
  readonly season: string;
  readonly seasonType: string;
  readonly week: number;
  readonly leg: number;
}

export type SleeperTrendType = "add" | "drop";

/** One trending player: Sleeper player id + the add/drop count over the lookback. */
export interface SleeperTrendingPlayer {
  readonly playerId: string;
  readonly count: number;
}

/** Weekly per-player stats keyed by Sleeper player id; values are stat→number maps. */
export type SleeperWeeklyStats = Readonly<Record<string, Readonly<Record<string, number>>>>;

interface SleeperClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Read-only client for Sleeper public NFL data. No credentials: the endpoints
 * require none, and the client exposes no write/league-mutation methods.
 */
export class SleeperClient {
  private readonly opts: Required<SleeperClientOptions>;

  constructor(options: SleeperClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
      jitterRatio: options.jitterRatio ?? DEFAULTS.jitterRatio,
      random: options.random ?? DEFAULTS.random,
      sleep: options.sleep ?? DEFAULTS.sleep,
    };
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await globalThis.fetch(`${SLEEPER_BASE_URL}${path}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(SLEEPER_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new SleeperError(`Sleeper request timed out after ${SLEEPER_TIMEOUT_MS}ms`, 408);
        }
        throw new SleeperError(
          `Sleeper request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;

      const exp = Math.min(this.opts.baseDelayMs * 2 ** attempt, this.opts.maxDelayMs);
      const jitter = Math.round(exp * this.opts.jitterRatio * this.opts.random());
      await this.opts.sleep(exp + jitter);
    }

    if (!response) throw new SleeperError("Sleeper request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new SleeperError(`Sleeper error: ${response.status} — ${body}`, response.status);
    }
    return (await response.json()) as T;
  }

  /** Current NFL season/week. */
  async getNflState(): Promise<SleeperNflState> {
    const raw = await this.get<Record<string, unknown>>("/state/nfl");
    return {
      season: String(raw.season ?? ""),
      seasonType: String(raw.season_type ?? ""),
      week: Number(raw.week ?? 0),
      leg: Number(raw.leg ?? 0),
    };
  }

  /**
   * Trending added/dropped players over the lookback window — a fantasy-public
   * sentiment signal. Returns ids + counts (enrich names via a separately-cached
   * /players/nfl fetch, which is large; out of scope for this lightweight client).
   */
  async getTrending(
    type: SleeperTrendType,
    options: { lookbackHours?: number; limit?: number } = {},
  ): Promise<readonly SleeperTrendingPlayer[]> {
    const lookbackHours = Math.max(1, Math.floor(options.lookbackHours ?? 24));
    const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 25)));
    const raw = await this.get<Array<{ player_id?: string; count?: number }>>(
      `/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`,
    );
    return (Array.isArray(raw) ? raw : [])
      .filter((r) => typeof r.player_id === "string")
      .map((r) => ({ playerId: r.player_id as string, count: Number(r.count ?? 0) }));
  }

  /** Per-player weekly box-score stats for a regular-season week. */
  async getWeeklyStats(season: number | string, week: number): Promise<SleeperWeeklyStats> {
    const s = String(season);
    const w = Math.max(1, Math.floor(week));
    return this.get<SleeperWeeklyStats>(`/stats/nfl/regular/${s}/${w}`);
  }
}

/** Pull PPR fantasy points for a player from a weekly-stats map; 0 if absent. */
export function pprPointsFor(stats: SleeperWeeklyStats, playerId: string): number {
  const row = stats[playerId];
  const v = row?.["pts_ppr"];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
