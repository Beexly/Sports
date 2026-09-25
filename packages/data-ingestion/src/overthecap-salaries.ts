/**
 * OverTheCap (OTC) salary adapter — player -> cap hit, env-gated and
 * injectable for the ethandojo handoff suite.
 *
 * Scope (additive only):
 *  - Does NOT modify `source-registry.ts` or any live ingestion path.
 *  - Env-gated default OFF via `OVERTHECAP_SALARIES_INGEST` (explicit
 *    true/1/yes/on only). Fail-closed: without the flag the client
 *    returns empty results and never fetches.
 *  - Every upstream request goes through `noStoreFetch` so Next.js's
 *    persistent Data Cache cannot freeze live cap tables (see
 *    `no-store-fetch.ts` for the production incident this prevents).
 *  - Fetch is injectable so the suite tests run against a fixture with
 *    zero network.
 *
 * Implements the `SalaryDataProvider` contract expected by
 * `@sports/prediction-engine`'s ethandojo handoff suite, so the adapter
 * is injectable without creating a circular package dependency.
 */

import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

// ─── Env gate ────────────────────────────────────────────────────────────────

/** Canonical env flag. Default OFF — explicit true/1/yes/on only. */
export const OVERTHECAP_ENV_FLAG = "OVERTHECAP_SALARIES_INGEST";

export function isOverTheCapSalariesIngestEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, OVERTHECAP_ENV_FLAG);
}

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Salary provider contract consumed by the engine handoff suite.
 * Structurally compatible with `SalaryDataProvider` in
 * `@sports/prediction-engine/src/ethandojo/handoff-suite.ts` — kept
 * local so this package stays free of a reverse dependency.
 */
export interface SalaryDataProvider {
  /** Cap hit in millions for a player in a season; null when unknown. */
  getCapHitMillions(playerName: string, season: number): Promise<number | null>;
  /** All cap hits for a season, keyed by player name (millions). */
  getAllCapHits(season: number): Promise<ReadonlyMap<string, number>>;
  /** True when the adapter is configured and usable. */
  isAvailable(): boolean;
}

/** One parsed OTC cap-hit row. */
export interface OverTheCapCapHit {
  readonly playerName: string;
  readonly team: string | null;
  readonly position: string | null;
  /** Cap hit in dollars as listed on the page. */
  readonly capHitDollars: number;
  /** Cap hit in millions (capHitDollars / 1e6). */
  readonly capHitMillions: number;
  readonly season: number;
}

export class OverTheCapSalariesError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OverTheCapSalariesError";
  }
}

// ─── Fixture parsing ─────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://overthecap.com";

/** A player row as it appears in an OTC salary-cap table. */
export interface OverTheCapTableRow {
  readonly playerName: string;
  readonly team?: string | null;
  readonly position?: string | null;
  /** Cap hit in dollars, or a "$45,000,000" / "45,000,000" / "45.0" string. */
  readonly capHit: number | string;
}

/** Shape of the JSON payload the fixture / page extract yields. */
export interface OverTheCapTablePayload {
  readonly season: number;
  readonly rows: readonly OverTheCapTableRow[];
}

/**
 * Parse a dollar amount into dollars. Accepts 45000000, "45,000,000",
 * "$45,000,000", "45.5" (millions when small), "$45.5M".
 * Returns NaN when unparseable.
 */
export function parseCapHitDollars(raw: number | string): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return Number.NaN;
    // Small numbers are already millions (e.g. 12.5).
    return raw > 0 && raw < 1_000_000 ? raw * 1_000_000 : raw;
  }
  const cleaned = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (cleaned.length === 0) return Number.NaN;
  const millions = /^([\d.]+)\s*m$/i.exec(cleaned);
  if (millions !== null && typeof millions[1] === "string") {
    return Number.parseFloat(millions[1]) * 1_000_000;
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return Number.NaN;
  return value > 0 && value < 1_000_000 ? value * 1_000_000 : value;
}

/**
 * Parse an OTC table payload (fixture JSON or an extracted page object)
 * into typed cap-hit rows. Unparseable rows are dropped, never invented.
 */
export function parseOverTheCapTable(
  payload: OverTheCapTablePayload,
): OverTheCapCapHit[] {
  const season = payload.season;
  if (!Number.isInteger(season) || season < 2000 || season > 2100) {
    throw new OverTheCapSalariesError(`parseOverTheCapTable: bad season ${String(season)}`);
  }
  const out: OverTheCapCapHit[] = [];
  for (const row of payload.rows) {
    const name = typeof row.playerName === "string" ? row.playerName.trim() : "";
    if (name.length === 0) continue;
    const dollars = parseCapHitDollars(row.capHit);
    if (!Number.isFinite(dollars)) continue;
    out.push({
      playerName: name,
      team: row.team ?? null,
      position: row.position ?? null,
      capHitDollars: dollars,
      capHitMillions: dollars / 1_000_000,
      season,
    });
  }
  return out;
}

/**
 * Extract a `OverTheCapTablePayload` from an OTC HTML page. Looks for a
 * JSON blob in a `<script id="otc-cap-data">` tag (fixture-friendly) and
 * falls back to scanning `<table>` rows with a player cell and a dollar
 * cell. Returns null when nothing parseable is found — never fabricates.
 */
export function extractOverTheCapPayload(html: string, season: number): OverTheCapTablePayload | null {
  const scriptRe = /<script[^>]+id=["']otc-cap-data["'][^>]*>([\s\S]*?)<\/script>/i;
  const scriptMatch = scriptRe.exec(html);
  if (scriptMatch !== null && typeof scriptMatch[1] === "string") {
    try {
      const parsed: unknown = JSON.parse(scriptMatch[1].trim());
      if (parsed !== null && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        const rowsRaw = obj.rows;
        if (Array.isArray(rowsRaw)) {
          return {
            season: typeof obj.season === "number" ? obj.season : season,
            rows: rowsRaw as OverTheCapTableRow[],
          };
        }
      }
    } catch {
      // fall through to table scan
    }
  }

  // Minimal HTML table scan: <tr>...<td>Name</td>...<td>$45,000,000</td>...
  const rows: OverTheCapTableRow[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const cellsHtml = typeof trMatch[1] === "string" ? trMatch[1] : "";
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(cellsHtml)) !== null) {
      const raw = typeof tdMatch[1] === "string" ? tdMatch[1] : "";
      cells.push(raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim());
    }
    if (cells.length < 2) continue;
    const name = cells[0] ?? "";
    if (name.length === 0 || /^(player|name)$/i.test(name)) continue;
    // Find the first cell that parses as a cap hit.
    for (let i = 1; i < cells.length; i++) {
      const dollars = parseCapHitDollars(cells[i] ?? "");
      if (Number.isFinite(dollars)) {
        rows.push({ playerName: name, capHit: dollars });
        break;
      }
    }
  }
  if (rows.length === 0) return null;
  return { season, rows };
}

// ─── Client ──────────────────────────────────────────────────────────────────

export interface OverTheCapSalariesOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const POLITE_USER_AGENT = "GSE-DataIngestion/1.0";

/**
 * OverTheCap salaries client. Env-gated, no-store, fixture-testable.
 * Structurally implements `SalaryDataProvider` for engine-suite injection.
 */
export class OverTheCapSalariesClient implements SalaryDataProvider {
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: OverTheCapSalariesOptions = {}) {
    this.env = options.env ?? process.env;
    this.fetchImpl = options.fetchImpl ?? noStoreFetch;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** True when the env gate is open. */
  isAvailable(): boolean {
    return isOverTheCapSalariesIngestEnabled(this.env);
  }

  /**
   * Fetch and parse one season's cap table.
   * Returns [] (and never fetches) when the env gate is closed.
   */
  async fetchSeasonCapHits(season: number): Promise<readonly OverTheCapCapHit[]> {
    if (!this.isAvailable()) return [];
    const url = `${this.baseUrl}/cap/${season}/`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          "User-Agent": POLITE_USER_AGENT,
          Accept: "text/html,application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new OverTheCapSalariesError(`OverTheCap HTTP ${res.status}`, res.status);
      }
      const body = await res.text();
      const payload = extractOverTheCapPayload(body, season);
      if (payload === null) return [];
      return parseOverTheCapTable(payload);
    } finally {
      clearTimeout(timer);
    }
  }

  /** SalaryDataProvider: cap hit in millions, or null when unknown. */
  async getCapHitMillions(playerName: string, season: number): Promise<number | null> {
    const hits = await this.fetchSeasonCapHits(season);
    const needle = playerName.trim().toLowerCase();
    for (const hit of hits) {
      if (hit.playerName.toLowerCase() === needle) return hit.capHitMillions;
    }
    return null;
  }

  /** SalaryDataProvider: every cap hit for a season, name -> millions. */
  async getAllCapHits(season: number): Promise<ReadonlyMap<string, number>> {
    const hits = await this.fetchSeasonCapHits(season);
    const map = new Map<string, number>();
    for (const hit of hits) {
      map.set(hit.playerName, hit.capHitMillions);
    }
    return map;
  }
}

/** Factory used by the ethandojo handoff adapters. */
export function createOverTheCapSalariesClient(
  options: OverTheCapSalariesOptions = {},
): OverTheCapSalariesClient {
  return new OverTheCapSalariesClient(options);
}
