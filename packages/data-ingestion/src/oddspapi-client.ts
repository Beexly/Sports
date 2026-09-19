/**
 * OddsPapi (55 Tech, oddspapi.io) REST client — the SECONDARY odds source that
 * complements The Odds API as primary.
 *
 * CONTRACT (CONFIRMED from official docs, accessed 2026-09-18):
 *   - Base: https://api.oddspapi.io/v4
 *   - Auth: `apiKey` QUERY parameter — never a header.
 *   - Per-endpoint cooldowns: /odds 500ms, /fixtures 2000ms, /markets 1000ms,
 *     /settlements 2000ms, /historical-odds 5000ms.
 *   - 429 body is valid JSON with `error.retryMs` — honor it before retrying.
 *   - /historical-odds: max 3 bookmaker slugs per call (4+ → TOO_MANY_BOOKMAKERS);
 *     UNMETERED (does not increment request usage); finished fixtures return
 *     ETag + Cache-Control 3d — conditional requests get 304 Not Modified.
 *   - Dict keys that look numeric ("101", "0") are STRINGS; "0" player = game line.
 *
 * LICENSING (CONFIRMED at https://oddspapi.io/en/legal/terms, 2026-09-18):
 *   OddsPapi terms forbid reselling / repackaging / redistributing the data as
 *   a standalone product. GSE uses this feed for INTERNAL analytics only —
 *   CLV reconstruction, prop discovery, Pinnacle limit data, disagreement
 *   checks. Any public display or redistribution needs a legal read first.
 *
 * QUOTA (free tier: 250 requests/month; per-request flat billing; /account is
 * unmetered and stays available after exhaustion):
 *   The credit governor in ./oddspapi-credit-governor.ts decides whether a
 *   billable call may go out. This client enforces the mechanics: cooldowns,
 *   429 backoff, client-side guards that refuse to burn quota on calls the
 *   vendor would reject (e.g. >3 books on /historical-odds).
 *
 * SECRET HYGIENE: the key lives only in this instance. Error messages and
 * logs carry the endpoint PATH only — never the query string, never the key.
 */

export const ODDSPAPI_BASE_URL = "https://api.oddspapi.io/v4";
export const ODDSPAPI_TIMEOUT_MS = 15_000;

/** NFL identifiers (CONFIRMED, measured 2026-09-18 from the live coverage pages). */
export const ODDSPAPI_NFL_SPORT_ID = 14;
export const ODDSPAPI_NFL_TOURNAMENT_ID = 31;
export const ODDSPAPI_NCAA_TOURNAMENT_ID = 27653;

/**
 * 21 NFL player-prop families observed on one Week-1 fixture (official NFL
 * props study, 2026-09-09). Kept as documentation of the prop surface; the
 * adapter resolves market IDs by NAME from /v4/markets, never by hardcode.
 */
export const ODDSPAPI_NFL_PROP_FAMILIES = [
  "Over Under Player Receiving Yards",
  "Over Under Rush Yards",
  "Over Under Pass Yards",
  "Player To Score TD",
  "Over Under Player Receptions",
  "Player To Score First TD",
  "Over Under Player TD Passes",
  "Rush Yards",
  "Over Under Rush TD",
  "Pass Yards",
  "Over Under Player TD",
  "To Score TD Second Half",
  "To Score TD First Half",
  "To Score TD First Quarter",
  "Over Under Player Interceptions",
  "Over Under Longest Rush Yards",
  "Over Under Longest Pass Completion",
  "Over Under Field Goals",
  "Over Under Kicking Points",
  "Over Under Pass Attempts",
  "Over Under Pass Completions",
] as const;

/** Per-endpoint minimum spacing between calls (CONFIRMED, official docs). */
export const ODDSPAPI_COOLDOWNS_MS: Record<string, number> = {
  odds: 500,
  fixtures: 2000,
  markets: 1000,
  settlements: 2000,
  "historical-odds": 5000,
};

export class OddsPapiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    /** error.retryMs from a 429 body, when the vendor supplied one. */
    public readonly retryMs?: number | null,
  ) {
    super(message);
    this.name = "OddsPapiError";
  }
}

export interface OddsPapiFetchResult<T> {
  readonly data: T;
  /** True when a conditional historical request returned 304 (no new data). */
  readonly notModified: boolean;
}

/* ------------------------------------------------------------------ */
/* Wire types (subset of the official schemas — fixtures, odds,        */
/* historical snapshots, settlements, markets, account).               */
/* ------------------------------------------------------------------ */

export interface OddsPapiExternalProviders {
  readonly betradarId?: string | null;
  readonly mollybetId?: string | null;
  readonly opticoddsId?: string | null;
  readonly lsportsId?: string | null;
  readonly txoddsId?: string | null;
  readonly sofascoreId?: string | null;
  readonly betgeniusId?: string | null;
  readonly flashscoreId?: string | null;
  readonly pinnacleId?: string | null;
  readonly oddinId?: string | null;
}

/** Free cross-vendor ID crosswalk — one of the highest-value free fields. */
export interface OddsPapiFixture {
  readonly fixtureId: string;
  readonly participant1Id: string;
  readonly participant2Id: string;
  readonly sportId: number;
  readonly tournamentId: number;
  readonly seasonId: string;
  readonly statusId: number;
  readonly hasOdds: boolean;
  readonly startTime: string;
  readonly trueStartTime: string | null;
  readonly trueEndTime: string | null;
  readonly updatedAt: string;
  readonly statusName: string;
  readonly participant1Name: string;
  readonly participant2Name: string;
  readonly participant1ShortName?: string;
  readonly participant2ShortName?: string;
  readonly participant1Abbr?: string;
  readonly participant2Abbr?: string;
  readonly sportName: string;
  readonly tournamentName: string;
  readonly tournamentSlug: string;
  readonly categoryName: string;
  readonly categorySlug: string;
  readonly externalProviders?: OddsPapiExternalProviders | null;
}

/** One price cell. `price` is decimal; priceAmerican is the string "(-110)". */
export interface OddsPapiPrice {
  readonly price: number;
  readonly priceAmerican: string;
  readonly priceFractional: string;
  readonly active: boolean;
  readonly betslip: string;
  readonly bookmakerOutcomeId: string;
  readonly bookmakerChangedAt: string | null;
  readonly changedAt: string;
  readonly limit: number | null;
  readonly playerName: string;
  readonly mainLine: boolean;
  readonly exchangeMeta?: unknown;
}

export interface OddsPapiOutcome {
  /** Keyed by player ID STRING. "0" = game line; otherwise prop player. */
  readonly players: Record<string, OddsPapiPrice>;
}

export interface OddsPapiMarket {
  readonly bookmakerMarketId: string;
  readonly marketActive: boolean;
  /** Keyed by outcome ID string. */
  readonly outcomes: Record<string, OddsPapiOutcome>;
}

export interface OddsPapiBookmakerOdds {
  readonly bookmakerIsActive: boolean;
  readonly bookmakerFixtureId: string;
  readonly fixturePath: string;
  readonly suspended: boolean;
  /** Keyed by market ID string. */
  readonly markets: Record<string, OddsPapiMarket>;
}

export interface OddsPapiOddsResponse extends OddsPapiFixture {
  /** Keyed by bookmaker slug. */
  readonly bookmakerOdds: Record<string, OddsPapiBookmakerOdds>;
}

/** One historical snapshot. Derive "the close" as the last active snapshot with createdAt < startTime; dedupe consecutive identical prices (heartbeats). */
export interface OddsPapiHistoricalSnapshot {
  readonly id: string;
  readonly createdAt: string;
  readonly price: number;
  readonly limit: number | null;
  readonly active: boolean;
  readonly exchangeMeta?: unknown;
}

export interface OddsPapiHistoricalBook {
  /** Keyed by market ID string. */
  readonly markets: Record<string, {
    readonly outcomes: Record<string, {
      readonly players: Record<string, OddsPapiHistoricalSnapshot[]>;
    }>;
  }>;
}

export interface OddsPapiHistoricalResponse {
  /** NOTE: top-level key is `bookmakers` here, vs `bookmakerOdds` on /odds. */
  readonly bookmakers: Record<string, OddsPapiHistoricalBook>;
}

export type OddsPapiSettlementResult =
  | "WIN"
  | "LOSE"
  | "HALFWIN"
  | "HALFLOSS"
  | "PUSH"
  | "CANCELLED"
  | "UNDECIDED";

export interface OddsPapiSettlement {
  readonly result: OddsPapiSettlementResult;
  readonly playerName?: string;
}

export interface OddsPapiMarketCatalogEntry {
  readonly marketId: string;
  readonly marketLength: number;
  readonly marketName: string;
  readonly playerProp: boolean;
  readonly sportId: number;
  readonly handicap: number | null;
  readonly period: string;
  readonly marketType: string;
  readonly outcomes: ReadonlyArray<{ readonly outcomeId: string; readonly outcomeName: string }>;
}

export interface OddsPapiAccount {
  readonly request_limit: number;
  readonly request_count: number;
}

export interface OddsPapiFixturesParams {
  readonly tournamentId?: number;
  readonly sportId?: number;
  readonly participantId?: number;
  readonly from?: string;
  readonly to?: string;
  readonly statusId?: 0 | 1 | 2 | 3;
  readonly hasOdds?: boolean;
  readonly language?: string;
}

export interface OddsPapiOddsParams {
  readonly fixtureId: string;
  readonly bookmakers?: readonly string[];
  readonly oddsFormat?: "fractional" | "decimal" | "american";
  readonly language?: string;
  readonly verbosity?: number;
}

export interface OddsPapiHistoricalParams {
  readonly fixtureId: string;
  /** Max 3 — the vendor rejects 4+ with TOO_MANY_BOOKMAKERS. */
  readonly bookmakers: readonly string[];
  readonly playerId?: string;
  readonly outcomeId?: string;
  readonly active?: boolean;
  readonly id?: string;
}

export interface OddsPapiSettlementsParams {
  readonly fixtureId: string;
  readonly playerId?: string;
  readonly outcomeId?: string;
}

interface OddsPapiRetryOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
}

interface ResolvedRetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitterRatio: number;
  readonly random: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
}

const DEFAULT_RETRY_OPTIONS: ResolvedRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
  jitterRatio: 0.35,
  random: Math.random,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/** Parse the 429 JSON body: { error: { retryMs } }. Null when absent/unparseable. */
export function parseRetryMs(bodyText: string): number | null {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { retryMs?: unknown } };
    const ms = parsed?.error?.retryMs;
    return typeof ms === "number" && Number.isFinite(ms) && ms >= 0
      ? Math.round(ms)
      : null;
  } catch {
    return null;
  }
}

/** Parse an American-odds string ("-110", "+150") to a number; null when junk. */
export function parseAmericanPrice(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/^\(|\)$/g, "");
  if (!/^[-+]\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

export class OddsPapiClient {
  private readonly apiKey: string;
  private readonly retryOptions: ResolvedRetryOptions;
  /** Endpoint key → epoch ms of the last call. Enforces vendor cooldowns. */
  private readonly lastCallAt = new Map<string, number>();

  constructor(apiKey: string, retryOptions?: OddsPapiRetryOptions) {
    if (!apiKey) {
      throw new Error("ODDSPAPI_KEY is required");
    }
    this.apiKey = apiKey;
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  }

  /** Test seam: inject an ETag for a conditional historical request. */
  etagForFixture(_fixtureId: string): string | null {
    return null;
  }

  private buildUrl(path: string, params: Record<string, string> = {}): URL {
    const url = new URL(`${ODDSPAPI_BASE_URL}${path}`);
    url.searchParams.set("apiKey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url;
  }

  /** Wait until the endpoint's vendor cooldown has elapsed since the last call. */
  private async respectCooldown(endpointKey: string): Promise<void> {
    const cooldownMs = ODDSPAPI_COOLDOWNS_MS[endpointKey];
    if (!cooldownMs) return;
    const last = this.lastCallAt.get(endpointKey);
    const now = this.retryOptions.now();
    if (last != null) {
      const waitMs = last + cooldownMs - now;
      if (waitMs > 0) await this.retryOptions.sleep(waitMs);
    }
    this.lastCallAt.set(endpointKey, this.retryOptions.now());
  }

  private async fetch<T>(
    endpointKey: string,
    path: string,
    params: Record<string, string> = {},
    extraHeaders: Record<string, string> = {},
  ): Promise<OddsPapiFetchResult<T>> {
    // The key must NEVER appear in an error message or log: only the endpoint
    // path is ever surfaced. The full URL (with apiKey query param) stays in
    // this function.
    const logLabel = `oddspapi ${path}`;
    await this.respectCooldown(endpointKey);

    let response: Response | null = null;
    let lastRetryMs: number | null = null;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      const url = this.buildUrl(path, params);
      try {
        response = await fetch(url.toString(), {
          signal: AbortSignal.timeout(ODDSPAPI_TIMEOUT_MS),
          headers: { ...extraHeaders },
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new OddsPapiError(
            `${logLabel}: request timed out after ${ODDSPAPI_TIMEOUT_MS}ms`,
            408,
          );
        }
        throw new OddsPapiError(
          `${logLabel}: request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      if (response.status === 429) {
        const body = await response.text();
        lastRetryMs = parseRetryMs(body);
        // Honor the vendor's own backoff: retryMs + small cushion. Never spin.
        const delayMs =
          (lastRetryMs ?? this.retryOptions.baseDelayMs * 2 ** attempt) +
          300 * this.retryOptions.random();
        if (attempt < this.retryOptions.maxRetries) {
          await this.retryOptions.sleep(Math.min(delayMs, this.retryOptions.maxDelayMs));
          continue;
        }
        throw new OddsPapiError(
          `${logLabel}: rate limited (429); vendor retryMs=${lastRetryMs ?? "absent"}`,
          429,
          lastRetryMs,
        );
      }

      if (
        (response.status >= 500 && response.status <= 599) ||
        response.status === 408
      ) {
        if (attempt < this.retryOptions.maxRetries) {
          const delayMs = Math.min(
            this.retryOptions.baseDelayMs * 2 ** attempt,
            this.retryOptions.maxDelayMs,
          );
          await this.retryOptions.sleep(delayMs);
          continue;
        }
      }
      break;
    }

    if (!response) {
      throw new OddsPapiError(`${logLabel}: no response received`);
    }

    // 304 on a conditional historical request: empty body, nothing new.
    if (response.status === 304) {
      return { data: null as unknown as T, notModified: true };
    }

    if (!response.ok) {
      const body = await response.text();
      // 4xx bodies are vendor error codes (INVALID_PARAMETER,
      // TOO_MANY_BOOKMAKERS, RESTRICTED_ACCESS) — useful for diagnosis, but
      // the body never carries the key, so it is safe to surface. Truncated.
      throw new OddsPapiError(
        `${logLabel}: HTTP ${response.status} — ${body.slice(0, 500)}`,
        response.status,
        lastRetryMs,
      );
    }

    const data = (await response.json()) as T;
    return { data, notModified: false };
  }

  /** Account usage: request_limit / request_count. Unmetered — safe probe. */
  async getAccount(): Promise<OddsPapiFetchResult<OddsPapiAccount>> {
    return this.fetch<OddsPapiAccount>("account", "/account");
  }

  /** Global market catalog (the sportId param does nothing per the vendor). */
  async getMarkets(): Promise<OddsPapiFetchResult<OddsPapiMarketCatalogEntry[]>> {
    return this.fetch<OddsPapiMarketCatalogEntry[]>("markets", "/markets");
  }

  async getSports(): Promise<OddsPapiFetchResult<unknown[]>> {
    return this.fetch<unknown[]>("sports", "/sports");
  }

  async getTournaments(
    sportId?: number,
  ): Promise<OddsPapiFetchResult<unknown[]>> {
    return this.fetch<unknown[]>(
      "tournaments",
      "/tournaments",
      sportId != null ? { sportId: String(sportId) } : {},
    );
  }

  async getFixtures(
    params: OddsPapiFixturesParams = {},
  ): Promise<OddsPapiFetchResult<OddsPapiFixture[]>> {
    const q: Record<string, string> = {};
    if (params.tournamentId != null) q["tournamentId"] = String(params.tournamentId);
    if (params.sportId != null) q["sportId"] = String(params.sportId);
    if (params.participantId != null) q["participantId"] = String(params.participantId);
    if (params.from) q["from"] = params.from;
    if (params.to) q["to"] = params.to;
    if (params.statusId != null) q["statusId"] = String(params.statusId);
    if (params.hasOdds != null) q["hasOdds"] = String(params.hasOdds);
    if (params.language) q["language"] = params.language;
    return this.fetch<OddsPapiFixture[]>("fixtures", "/fixtures", q);
  }

  async getOdds(
    params: OddsPapiOddsParams,
  ): Promise<OddsPapiFetchResult<OddsPapiOddsResponse>> {
    const q: Record<string, string> = {};
    if (params.bookmakers && params.bookmakers.length > 0) {
      q["bookmakers"] = params.bookmakers.join(",");
    }
    if (params.oddsFormat) q["oddsFormat"] = params.oddsFormat;
    if (params.language) q["language"] = params.language;
    if (params.verbosity != null) q["verbosity"] = String(params.verbosity);
    return this.fetch<OddsPapiOddsResponse>("odds", "/odds", {
      ...q,
      fixtureId: params.fixtureId,
    });
  }

  /**
   * Free historical line-movement snapshots. UNMETERED — does not burn quota —
   * but once the plan's request limit is exhausted the vendor blocks ALL
   * endpoints (429) except /account, so the governor still gates it on quota
   * exhaustion. Max 3 bookmaker slugs per call; the vendor rejects 4+ with
   * TOO_MANY_BOOKMAKERS, so we refuse client-side before burning a call.
   */
  async getHistoricalOdds(
    params: OddsPapiHistoricalParams,
  ): Promise<OddsPapiFetchResult<OddsPapiHistoricalResponse>> {
    if (params.bookmakers.length === 0) {
      throw new OddsPapiError(
        "oddspapi /historical-odds: bookmakers is required (1–3 slugs)",
      );
    }
    if (params.bookmakers.length > 3) {
      throw new OddsPapiError(
        `oddspapi /historical-odds: max 3 bookmakers per call, got ${params.bookmakers.length} — refusing before burning quota`,
      );
    }
    const q: Record<string, string> = {
      fixtureId: params.fixtureId,
      bookmakers: params.bookmakers.join(","),
    };
    if (params.playerId) q["playerId"] = params.playerId;
    if (params.outcomeId) q["outcomeId"] = params.outcomeId;
    if (params.active != null) q["active"] = String(params.active);
    if (params.id) q["id"] = params.id;

    const headers: Record<string, string> = {};
    const etag = this.etagForFixture(params.fixtureId);
    if (etag) headers["If-None-Match"] = etag;

    return this.fetch<OddsPapiHistoricalResponse>(
      "historical-odds",
      "/historical-odds",
      q,
      headers,
    );
  }

  async getSettlements(
    params: OddsPapiSettlementsParams,
  ): Promise<OddsPapiFetchResult<Record<string, OddsPapiSettlement>>> {
    const q: Record<string, string> = { fixtureId: params.fixtureId };
    if (params.playerId) q["playerId"] = params.playerId;
    if (params.outcomeId) q["outcomeId"] = params.outcomeId;
    return this.fetch<Record<string, OddsPapiSettlement>>(
      "settlements",
      "/settlements",
      q,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Historical snapshot helpers                                        */
/* ------------------------------------------------------------------ */

/**
 * Dedupe consecutive identical prices (heartbeats, not moves) from a
 * historical snapshot list. CONFIRMED behavior note from the official
 * Bet365 historical guide.
 */
export function dedupeHeartbeatSnapshots(
  snapshots: readonly OddsPapiHistoricalSnapshot[],
): OddsPapiHistoricalSnapshot[] {
  const out: OddsPapiHistoricalSnapshot[] = [];
  for (const s of snapshots) {
    const prev = out[out.length - 1];
    if (prev && prev.price === s.price && prev.active === s.active) continue;
    out.push(s);
  }
  return out;
}

/**
 * Derive the close: the last ACTIVE snapshot with createdAt < startTime.
 * Snapshots may continue in-play — anything at/after kickoff is not the close.
 */
export function deriveClosingSnapshot(
  snapshots: readonly OddsPapiHistoricalSnapshot[],
  startTimeIso: string,
): OddsPapiHistoricalSnapshot | null {
  const kickoff = Date.parse(startTimeIso);
  if (!Number.isFinite(kickoff)) return null;
  let close: OddsPapiHistoricalSnapshot | null = null;
  for (const s of snapshots) {
    const t = Date.parse(s.createdAt);
    if (!Number.isFinite(t) || t >= kickoff) continue;
    if (!s.active) continue;
    close = s;
  }
  return close;
}

/**
 * Resolve market IDs by NAME from the /v4/markets catalog. The vendor ships
 * the same bet under multiple market IDs (e.g. anytime TD under two IDs) and
 * instructs integrators to collect EVERY ID mapping to the name — never
 * hardcode IDs.
 */
export function resolveMarketIdsByName(
  catalog: readonly OddsPapiMarketCatalogEntry[],
  name: string,
): string[] {
  return catalog.filter((m) => m.marketName === name).map((m) => m.marketId);
}

/**
 * Classify a catalog entry into a GSE game-line market by market name.
 * Ladder check: handicap markets (e.g. "Total (incl. overtime)") carry one
 * market ID PER LINE RUNG — callers key on (playerName, handicap), not ID.
 */
export function classifyGameLineMarket(
  marketName: string,
): "H2H" | "SPREADS" | "TOTALS" | null {
  const lower = marketName.toLowerCase();
  if (lower.includes("handicap") || lower.includes("spread")) return "SPREADS";
  if (lower.includes("total") || lower.includes("over under")) return "TOTALS";
  if (
    lower.includes("result") ||
    lower.includes("winner") ||
    lower.includes("moneyline") ||
    lower === "1x2"
  ) {
    return "H2H";
  }
  return null;
}
