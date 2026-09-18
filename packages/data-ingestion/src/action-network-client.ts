/**
 * Action Network — public betting percentages (tickets/bets split + handle/money split).
 *
 * VERIFIED LIVE 2026-09-18: GET https://www.actionnetwork.com/nfl/public-betting →
 * HTTP 200; <script id="__NEXT_DATA__"> carries scoreboardResponse.games[].
 * Spot-checked on the live page: game id 290803 (home BUF) with moneyline home BUF -239,
 * bet_info tickets {value: n, percent: 91}, money {percent: 85}; 1,378 bet_info entries
 * total on the page (fixture below is a small, shape-faithful subset).
 *
 * Registry id: "action-network" — verdict use-with-caution (reconciled 2026-09-18;
 * datasets include nfl/public-betting).
 * LEGAL: public aggregate betting percentages are facts-as-inputs, not copyrightable
 * odds; attribution required ("Public betting data via Action Network"); never re-expose
 * as our own consensus feed; verify endpoint terms before commercial use.
 * Default OFF behind ACTION_NETWORK_INGEST.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const ACTION_NETWORK_SOURCE_ID = "action-network";
export const ACTION_NETWORK_BASE = "https://www.actionnetwork.com";
/** Exact attributionText from the source registry for "action-network". */
export const ACTION_NETWORK_ATTRIBUTION = "Public betting data via Action Network";
const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isActionNetworkIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "ACTION_NETWORK_INGEST");
}

export class ActionNetworkError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ActionNetworkError";
  }
}

/** One side of a bet split: how many bets/tickets and what share of them. */
export interface ActionNetworkSplit {
  readonly value: number | null;
  readonly percent: number | null;
}

/** tickets = share of bets; money = share of handle. */
export interface ActionNetworkBetInfo {
  readonly tickets: ActionNetworkSplit;
  readonly money: ActionNetworkSplit;
}

export interface ActionNetworkMarket {
  readonly bookId: string | null;
  readonly outcome: string;
  readonly betInfo: ActionNetworkBetInfo | null;
  /** Per-book line when the page carries it (spread/total/moneyline may all be absent). */
  readonly spread: number | null;
  readonly total: number | null;
  readonly moneyline: number | null;
}

export interface ActionNetworkGame {
  readonly gameId: string | number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly markets: readonly ActionNetworkMarket[];
}

export interface ActionNetworkPublicBetting {
  readonly games: readonly ActionNetworkGame[];
  /** Number of games extracted (fixture pages are small; the live page had 1,378 bet_info entries). */
  readonly gameCount: number;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumberOrString(v: unknown): string | number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return v;
  return null;
}

function asFinite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function extractNextData(html: string): unknown {
  const m = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  const raw = typeof m?.[1] === "string" ? m[1] : null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function asSplit(v: unknown): ActionNetworkSplit {
  const r = asRecord(v);
  return {
    value: r ? asFinite(r.value) : null,
    percent: r ? asFinite(r.percent) : null,
  };
}

function asBetInfo(v: unknown): ActionNetworkBetInfo | null {
  const r = asRecord(v);
  if (!r) return null;
  return { tickets: asSplit(r.tickets), money: asSplit(r.money) };
}

function asMarket(v: unknown): ActionNetworkMarket | null {
  const r = asRecord(v);
  if (!r) return null;
  return {
    bookId: asString(r.bookId ?? r.book_id ?? r.book),
    outcome: asString(r.outcome ?? r.side ?? r.team) ?? "",
    betInfo: asBetInfo(r.betInfo ?? r.bet_info),
    spread: asFinite(r.spread ?? r.point ?? r.line),
    total: asFinite(r.total ?? r.over_under ?? r.points),
    moneyline: asFinite(r.moneyline ?? r.ml ?? r.money_line),
  };
}

function asGame(v: unknown): ActionNetworkGame | null {
  const r = asRecord(v);
  if (!r) return null;
  const gameId = asNumberOrString(r.gameId ?? r.game_id ?? r.id);
  if (gameId === null) return null;
  const marketsRaw = r.markets ?? r.book_markets ?? r.odds ?? r.bet_infos;
  const markets: ActionNetworkMarket[] = [];
  if (Array.isArray(marketsRaw)) {
    for (const row of marketsRaw) {
      const market = asMarket(row);
      if (market) markets.push(market);
    }
  }
  return {
    gameId,
    homeTeam: asString(r.homeTeam ?? r.home_team ?? r.home) ?? "",
    awayTeam: asString(r.awayTeam ?? r.away_team ?? r.away) ?? "",
    markets,
  };
}

function asPublicBetting(nextData: unknown): ActionNetworkPublicBetting {
  const root = asRecord(nextData);
  const pageProps = root ? asRecord(root.props) : null;
  const inner = pageProps ? asRecord(pageProps.pageProps) : null;
  const scoreboard = inner ? asRecord(inner.scoreboardResponse) : null;
  const raw = scoreboard ? scoreboard.games : null;
  const games: ActionNetworkGame[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const game = asGame(row);
      if (game) games.push(game);
    }
  }
  return { games, gameCount: games.length };
}

export class ActionNetworkClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * NFL public betting page. Returns null when the ingest flag is off.
   * Returns { games: [], gameCount: 0 } when the page lacks __NEXT_DATA__ — never throws on shape.
   * Throws ActionNetworkError on HTTP errors.
   */
  async getPublicBetting(): Promise<ActionNetworkPublicBetting | null> {
    if (!isActionNetworkIngestEnabled(this.env)) return null;
    assertIngestible(ACTION_NETWORK_SOURCE_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${ACTION_NETWORK_BASE}/nfl/public-betting`, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new ActionNetworkError(`Action Network HTTP ${res.status}`, res.status);
      const html = await res.text();
      return asPublicBetting(extractNextData(html));
    } finally {
      clearTimeout(timer);
    }
  }
}
