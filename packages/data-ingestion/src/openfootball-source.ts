/**
 * OpenFootball source — READ-ONLY ingestion of openfootball/football.json, a CC0
 * (public-domain) dataset of historical football/soccer results. Free, no key, and
 * CITABLE Tier-A provenance (unlike scraped feeds — public domain, attributable).
 *
 * Why it matters: it yields REAL team scoring rates, which is exactly what the
 * Poisson referee (prediction-engine/poisson.ts) needs to run without violating the
 * "no fabricated stats" rule. Real source in → real λ → honest estimate.
 *
 * Pure parser + a thin read-only client (injectable fetch). Computing match-specific
 * attack/defense λ and wiring into pick-gen are separate, founder-gated steps.
 */

const OPENFOOTBALL_BASE = "https://raw.githubusercontent.com/openfootball/football.json/master";
const OPENFOOTBALL_TIMEOUT_MS = 15 * 1000;

export interface OpenFootballMatch {
  readonly date: string | null;
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly played: boolean;
}

interface OpenFootballRaw {
  readonly matches?: readonly {
    readonly date?: string;
    readonly team1?: string;
    readonly team2?: string;
    readonly score?: { readonly ft?: readonly number[] };
  }[];
}

export class OpenFootballError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OpenFootballError";
  }
}

/** Parse a football.json payload into normalized matches. Pure. */
export function parseOpenFootball(raw: OpenFootballRaw): OpenFootballMatch[] {
  const out: OpenFootballMatch[] = [];
  for (const m of raw.matches ?? []) {
    if (!m.team1 || !m.team2) continue;
    const ft = m.score?.ft;
    const homeGoals = ft && Number.isFinite(ft[0]) ? (ft[0] as number) : null;
    const awayGoals = ft && Number.isFinite(ft[1]) ? (ft[1] as number) : null;
    out.push({
      date: m.date ?? null,
      home: m.team1,
      away: m.team2,
      homeGoals,
      awayGoals,
      played: homeGoals != null && awayGoals != null,
    });
  }
  return out;
}

export interface TeamGoalRates {
  readonly team: string;
  readonly games: number;
  /** Goals scored per game (real, from played matches). */
  readonly scoredPerGame: number;
  /** Goals conceded per game. */
  readonly concededPerGame: number;
}

/** Real per-team scoring/conceding rates over the played matches. Pure. */
export function computeTeamGoalRates(matches: readonly OpenFootballMatch[]): TeamGoalRates[] {
  const acc = new Map<string, { gf: number; ga: number; games: number }>();
  const bump = (team: string, gf: number, ga: number) => {
    const prev = acc.get(team) ?? { gf: 0, ga: 0, games: 0 };
    acc.set(team, { gf: prev.gf + gf, ga: prev.ga + ga, games: prev.games + 1 });
  };
  for (const m of matches) {
    if (!m.played || m.homeGoals == null || m.awayGoals == null) continue;
    bump(m.home, m.homeGoals, m.awayGoals);
    bump(m.away, m.awayGoals, m.homeGoals);
  }
  return [...acc.entries()]
    .map(([team, v]) => ({
      team,
      games: v.games,
      scoredPerGame: v.games > 0 ? Number((v.gf / v.games).toFixed(3)) : 0,
      concededPerGame: v.games > 0 ? Number((v.ga / v.games).toFixed(3)) : 0,
    }))
    .sort((a, b) => a.team.localeCompare(b.team));
}

interface OpenFootballClientOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 400,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Read-only client for openfootball CC0 JSON. No credentials; GET only. */
export class OpenFootballSource {
  private readonly opts: Required<Omit<OpenFootballClientOptions, "fetchImpl">> & { fetchImpl: typeof fetch };

  constructor(options: OpenFootballClientOptions = {}) {
    this.opts = {
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      sleep: options.sleep ?? DEFAULTS.sleep,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
    };
  }

  /**
   * Fetch a season file, e.g. season "2023-24", competition "en.1" (Premier
   * League) → `.../2023-24/en.1.json`. Returns normalized matches.
   */
  async fetchSeason(season: string, competition: string): Promise<OpenFootballMatch[]> {
    const url = `${OPENFOOTBALL_BASE}/${encodeURIComponent(season)}/${encodeURIComponent(competition)}.json`;
    let response: Response | null = null;
    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        response = await this.opts.fetchImpl(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(OPENFOOTBALL_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new OpenFootballError(`OpenFootball request timed out after ${OPENFOOTBALL_TIMEOUT_MS}ms`, 408);
        }
        throw new OpenFootballError(`OpenFootball request failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!isRetryableStatus(response.status) || attempt === this.opts.maxRetries) break;
      await this.opts.sleep(this.opts.baseDelayMs * 2 ** attempt);
    }
    if (!response) throw new OpenFootballError("OpenFootball request failed before a response was received");
    if (!response.ok) {
      const body = await response.text();
      throw new OpenFootballError(`OpenFootball error: ${response.status} — ${body}`, response.status);
    }
    return parseOpenFootball((await response.json()) as OpenFootballRaw);
  }
}
