/**
 * Polymarket Gamma — INTERNAL independent fair-value estimator ONLY.
 *
 * COMPLIANCE HOLD (docs/agent-skills/polymarket-hold):
 *   • NOT a product surface. NOT a cron clear. NOT markets/trading.
 *   • Default OFF. Runs only when INDEPENDENT_POLYMARKET=1|true.
 *   • Public Gamma read-only (no CLOB orders, no API key).
 *   • source tag: "polymarket_gamma_internal" so product routers never
 *     treat this as a cleared quote-plane path.
 *
 * Integrity: soft-fail → null. Never invent prices. Exact-ish team match
 * on question text only (both home and away tokens must appear).
 */

import type { IndependentMarketFairValue } from "@sports/types";
import { noStoreFetch } from "./no-store-fetch.js";

export const POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com";
const TIMEOUT_MS = 12_000;

/** Env gate — default OFF. */
export function isPolymarketIndependentEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = (env.INDEPENDENT_POLYMARKET ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export class PolymarketIndependentError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PolymarketIndependentError";
  }
}

interface GammaMarketRaw {
  readonly id?: string;
  readonly question?: string;
  readonly slug?: string;
  readonly outcomePrices?: string | string[] | number[];
  readonly outcomes?: string | string[];
  readonly closed?: boolean;
  readonly active?: boolean;
  readonly endDate?: string;
  readonly updatedAt?: string;
  readonly sportsMarketType?: string;
}

function parsePrices(m: GammaMarketRaw): number[] | null {
  let prices: unknown = m.outcomePrices;
  if (typeof prices === "string") {
    try {
      prices = JSON.parse(prices);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(prices) || prices.length < 1) return null;
  const nums = prices.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return nums.length ? nums : null;
}

function parseOutcomes(m: GammaMarketRaw): string[] {
  let o: unknown = m.outcomes;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return ["Yes", "No"];
    }
  }
  if (Array.isArray(o)) return o.map(String);
  return ["Yes", "No"];
}

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distinctive tokens (≥4 chars) from a team name for question matching. */
export function teamMatchTokens(teamName: string): string[] {
  const n = norm(teamName);
  const stop = new Set([
    "fc",
    "cf",
    "sc",
    "ac",
    "the",
    "and",
    "club",
    "united",
    "city",
    "town",
    "real",
    "sporting",
  ]);
  return n
    .split(" ")
    .filter((t) => t.length >= 4 && !stop.has(t));
}

function questionMatchesBoth(question: string, home: string, away: string): boolean {
  const q = norm(question);
  if (!q) return false;
  const homeTokens = teamMatchTokens(home);
  const awayTokens = teamMatchTokens(away);
  // Need at least one distinctive token per side (or full name substring).
  const homeOk =
    homeTokens.some((t) => q.includes(t)) || q.includes(norm(home));
  const awayOk =
    awayTokens.some((t) => q.includes(t)) || q.includes(norm(away));
  return homeOk && awayOk;
}

/**
 * Map a binary/two-outcome gamma market to home/away fair probs.
 * Prefer outcomes that name the teams; else Yes=home / No=away when question
 * is "Will HOME win…" style — only when both teams appear in question.
 */
export function gammaMarketToIndependent(
  m: GammaMarketRaw,
  homeTeam: string,
  awayTeam: string,
  capturedAt: string,
): IndependentMarketFairValue | null {
  if (m.closed === true) return null;
  if (m.active === false) return null;
  const prices = parsePrices(m);
  if (!prices || prices.length < 2) return null;
  const outcomes = parseOutcomes(m);
  const q = m.question ?? "";
  if (!questionMatchesBoth(q, homeTeam, awayTeam)) return null;

  const homeN = norm(homeTeam);
  const awayN = norm(awayTeam);
  let homeIdx = outcomes.findIndex((o) => {
    const on = norm(o);
    return on.includes(homeN) || homeN.includes(on) || teamMatchTokens(homeTeam).some((t) => on.includes(t));
  });
  let awayIdx = outcomes.findIndex((o) => {
    const on = norm(o);
    return on.includes(awayN) || awayN.includes(on) || teamMatchTokens(awayTeam).some((t) => on.includes(t));
  });

  // Binary Yes/No — only when question clearly names home as the Yes subject.
  if (homeIdx < 0 && awayIdx < 0 && outcomes.length >= 2) {
    const qn = norm(q);
    if (
      (qn.startsWith("will ") || qn.includes(" winner")) &&
      teamMatchTokens(homeTeam).some((t) => qn.includes(t))
    ) {
      homeIdx = 0;
      awayIdx = 1;
    } else {
      return null;
    }
  }
  if (homeIdx < 0 || awayIdx < 0 || homeIdx === awayIdx) return null;

  const rawH = prices[homeIdx]!;
  const rawA = prices[awayIdx]!;
  if (!(rawH > 0) || !(rawA > 0)) return null;
  const sum = rawH + rawA;
  if (!(sum > 0)) return null;
  return {
    source: "polymarket_gamma_internal",
    homeFairProb: Number((rawH / sum).toFixed(4)),
    awayFairProb: Number((rawA / sum).toFixed(4)),
    capturedAt,
  };
}

interface PolymarketIndependentClientOptions {
  readonly baseUrl?: string;
  readonly now?: () => Date;
  readonly fetchImpl?: typeof fetch;
  /** Offline fixtures for tests. */
  readonly fixtures?: readonly GammaMarketRaw[];
}

export class PolymarketIndependentClient {
  private readonly baseUrl: string;
  private readonly now: () => Date;
  private readonly fetchImpl: typeof fetch;
  private readonly fixtures?: readonly GammaMarketRaw[];

  constructor(options: PolymarketIndependentClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? POLYMARKET_GAMMA_BASE;
    this.now = options.now ?? (() => new Date());
    this.fetchImpl = options.fetchImpl ?? noStoreFetch;
    this.fixtures = options.fixtures;
  }

  private async getMarkets(query: string): Promise<GammaMarketRaw[]> {
    if (this.fixtures) {
      return this.fixtures.filter((m) =>
        questionMatchesBoth(m.question ?? "", query, query),
      );
    }
    const path = `/markets?active=true&closed=false&limit=50&_q=${encodeURIComponent(query)}`;
    // Gamma also supports /public-search; try markets list with text filter via tag/slug fallback.
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new PolymarketIndependentError(
        `Polymarket request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!response.ok) {
      // Fallback: public-search endpoint
      try {
        const alt = await this.fetchImpl(
          `${this.baseUrl}/public-search?q=${encodeURIComponent(query)}&limit_per_type=25`,
          {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
          },
        );
        if (!alt.ok) {
          throw new PolymarketIndependentError(
            `Polymarket error: ${response.status}`,
            response.status,
          );
        }
        const body = (await alt.json()) as {
          events?: { markets?: GammaMarketRaw[] }[];
          markets?: GammaMarketRaw[];
        };
        if (Array.isArray(body.markets)) return body.markets;
        if (Array.isArray(body.events)) {
          return body.events.flatMap((e) => e.markets ?? []);
        }
        return [];
      } catch (e) {
        if (e instanceof PolymarketIndependentError) throw e;
        throw new PolymarketIndependentError(
          `Polymarket error: ${response.status}`,
          response.status,
        );
      }
    }
    const body = (await response.json()) as GammaMarketRaw[] | { markets?: GammaMarketRaw[] };
    if (Array.isArray(body)) return body;
    return body.markets ?? [];
  }

  /**
   * Find a moneyline-style gamma market for home vs away.
   * Returns null when gate is conceptually on but no clean match (honest).
   */
  async getFairValue(input: {
    readonly homeTeam: string;
    readonly awayTeam: string;
  }): Promise<IndependentMarketFairValue | null> {
    const capturedAt = this.now().toISOString();
    const tokens = [
      ...teamMatchTokens(input.homeTeam).slice(0, 2),
      ...teamMatchTokens(input.awayTeam).slice(0, 2),
    ];
    const query =
      tokens.length >= 2
        ? `${tokens[0]} ${tokens[1]}`
        : `${input.homeTeam} ${input.awayTeam}`;

    let markets: GammaMarketRaw[];
    try {
      if (this.fixtures) {
        markets = [...this.fixtures];
      } else {
        markets = await this.getMarkets(query);
      }
    } catch {
      return null;
    }

    for (const m of markets) {
      const fv = gammaMarketToIndependent(m, input.homeTeam, input.awayTeam, capturedAt);
      if (fv) return fv;
    }
    return null;
  }
}
