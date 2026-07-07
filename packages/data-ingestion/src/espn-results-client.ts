/**
 * ESPN results client — READ-ONLY ingestion of final game scores from ESPN's
 * public scoreboard endpoints. Free, no key, broad coverage.
 *
 * ROLE / PROVENANCE BOUNDARY (read before wiring anything):
 *   ESPN's site.api endpoints are first-party data but UNOFFICIAL / undocumented,
 *   with no commercial-use license. Use this ONLY as a settlement/results signal
 *   and engine INPUT — facts that are independently verifiable. Do NOT cite ESPN
 *   as the provenance source behind a public, tamper-evident claim; that is the
 *   same provenance hazard that disqualified scraped feeds (SportDB / SerpApi).
 *   Corroborate a result before it backs a published settled-pick record.
 *
 * SAFETY: GET only — no key, no auth, no writes. A hung call must never block the
 * settlement cron (timeout + bounded retries). Wiring this into settlement / CLV
 * is a separate, founder-gated step (it is MODEL_VERSION-affecting).
 */

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const ESPN_TIMEOUT_MS = 15 * 1000;

export type EspnLeague = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab";

/** Map an internal league key to ESPN's {sport}/{league} path segments. */
const LEAGUE_PATH: Record<EspnLeague, { readonly sport: string; readonly league: string }> = {
  nfl: { sport: "football", league: "nfl" },
  nba: { sport: "basketball", league: "nba" },
  mlb: { sport: "baseball", league: "mlb" },
  nhl: { sport: "hockey", league: "nhl" },
  ncaaf: { sport: "football", league: "college-football" },
  ncaab: { sport: "basketball", league: "mens-college-basketball" },
};

export interface EspnTeamScore {
  readonly abbr: string | null;
  readonly name: string | null;
  readonly score: number | null;
}

export interface EspnGameResult {
  readonly id: string;
  readonly league: EspnLeague;
  /** Scheduled start (ISO) as ESPN reports it; null if absent. */
  readonly startUtc: string | null;
  readonly completed: boolean;
  readonly home: EspnTeamScore;
  readonly away: EspnTeamScore;
  /** Winning side's abbreviation; null if not completed or tied. */
  readonly winnerAbbr: string | null;
}

// Defensive raw shapes — every field optional; ESPN payloads vary by sport/state.
interface EspnStatusRaw {
  readonly type?: { readonly state?: string; readonly completed?: boolean };
}
interface EspnCompetitorRaw {
  readonly homeAway?: string;
  readonly score?: string;
  readonly winner?: boolean;
  readonly team?: { readonly abbreviation?: string; readonly displayName?: string };
}
interface EspnCompetitionRaw {
  readonly competitors?: readonly EspnCompetitorRaw[];
  readonly status?: EspnStatusRaw;
}
interface EspnEventRaw {
  readonly id?: string;
  readonly date?: string;
  readonly status?: EspnStatusRaw;
  readonly competitions?: readonly EspnCompetitionRaw[];
}
interface EspnScoreboardResponse {
  readonly events?: readonly EspnEventRaw[];
}

export class EspnError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "EspnError";
  }
}

function toTeamScore(competitor: EspnCompetitorRaw | undefined): EspnTeamScore {
  const rawScore = competitor?.score;
  // ESPN emits "" (and occasionally whitespace) for a competitor with no posted
  // score yet. Number("")===0 and Number("  ")===0 are both finite, so coercing
  // directly fabricates a 0. Require a non-empty numeric string before trusting it.
  const trimmed = typeof rawScore === "string" ? rawScore.trim() : rawScore;
  const numeric =
    trimmed != null && trimmed !== "" && Number.isFinite(Number(trimmed))
      ? Number(trimmed)
      : null;
  return {
    abbr: competitor?.team?.abbreviation ?? null,
    name: competitor?.team?.displayName ?? null,
    score: numeric,
  };
}

/**
 * Pure parser: ESPN scoreboard payload → normalized results. Exported so it can
 * be unit-tested against a fixture without any network.
 */
export function parseEspnScoreboard(
  payload: EspnScoreboardResponse,
  league: EspnLeague,
): EspnGameResult[] {
  return (payload.events ?? []).map((event) => {
    const competition = event.competitions?.[0];
    const status = competition?.status ?? event.status;
    const completed = Boolean(status?.type?.completed);
    const competitors = competition?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    const winner = competitors.find((c) => c.winner === true);

    return {
      id: event.id ?? "",
      league,
      startUtc: event.date ?? null,
      completed,
      home: toTeamScore(home),
      away: toTeamScore(away),
      winnerAbbr: completed ? (winner?.team?.abbreviation ?? null) : null,
    };
  });
}

interface EspnClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  /** Injectable fetch for tests. Defaults to globalThis.fetch. */
  readonly fetchImpl?: typeof fetch;
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

/** Read-only client for ESPN public scoreboard data. No credentials; GET only. */
export class EspnResultsClient {
  private readonly opts: Required<Omit<EspnClientOptions, "fetchImpl">> & { fetchImpl: typeof fetch };

  constructor(options: EspnClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      maxDelayMs: options.maxDelayMs ?? DEFAULTS.maxDelayMs,
      jitterRatio: options.jitterRatio ?? DEFAULTS.jitterRatio,
      random: options.random ?? DEFAULTS.random,
      sleep: options.sleep ?? DEFAULTS.sleep,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
    };
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response | null = null;

    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await this.opts.fetchImpl(`${ESPN_BASE_URL}${path}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(ESPN_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new EspnError(`ESPN request timed out after ${ESPN_TIMEOUT_MS}ms`, 408);
        }
        throw new EspnError(
          `ESPN request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;

      const exp = Math.min(this.opts.baseDelayMs * 2 ** attempt, this.opts.maxDelayMs);
      const jitter = Math.round(exp * this.opts.jitterRatio * this.opts.random());
      await this.opts.sleep(exp + jitter);
    }

    if (!response) throw new EspnError("ESPN request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new EspnError(`ESPN error: ${response.status} — ${body}`, response.status);
    }
    return (await response.json()) as T;
  }

  /**
   * Fetch the scoreboard for a league, optionally for a specific date
   * (YYYYMMDD). Returns normalized results; completed games carry final scores.
   */
  async getResults(league: EspnLeague, dateYyyymmdd?: string): Promise<EspnGameResult[]> {
    const { sport, league: leaguePath } = LEAGUE_PATH[league];
    const query = dateYyyymmdd ? `?dates=${encodeURIComponent(dateYyyymmdd)}` : "";
    const payload = await this.get<EspnScoreboardResponse>(
      `/${sport}/${leaguePath}/scoreboard${query}`,
    );
    return parseEspnScoreboard(payload, league);
  }
}
