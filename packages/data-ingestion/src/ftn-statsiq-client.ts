/**
 * FTN Fantasy Stats iQ — fail-closed until the registry clears it.
 *
 * WHAT IT FETCHES
 *   GET {BASE}/catalog — the Stats iQ charting taxonomy: tables (stat cards),
 *     each carrying its ordered column definitions (metric key, label,
 *     description, format, decimals, access tier, sortability).
 *   GET {BASE}/home — the leaderboard snapshot: per-card leaderboards with
 *     entity rows (player/team), ranks, and metric values.
 *
 * VERIFIED LIVE 2026-09-18 (unauthenticated probe):
 *   catalog: HTTP 200, 322,566 bytes, 9 categories, 751 columns.
 *   home:    HTTP 200, 14,375 bytes, 2026 regular-season cards.
 *
 * Registry IDs: "ftn-statsiq-catalog" and "ftn-statsiq-home", both
 * verdict use-with-caution.
 *
 * SAFETY / LEGAL
 *   - Default OFF (`FTN_STATSIQ_INGEST`). No fetch happens before
 *     assertIngestible() clears the registry verdict.
 *   - GET only. No credentials, no API keys, no secrets.
 *   - LEGAL NOTE: FTN Fantasy's Terms of Use contain an anti-automation clause
 *     (automated access without prior written consent). The endpoint is openly
 *     served today, but seek FTN's permission before any production ingestion —
 *     this client stays fail-closed by default.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const FTN_STATSIQ_CATALOG_ID = "ftn-statsiq-catalog";
export const FTN_STATSIQ_HOME_ID = "ftn-statsiq-home";
export const FTN_STATSIQ_BASE = "https://stats.ftnfantasy.com/api/v1/stats";
export const FTN_STATSIQ_ATTRIBUTION = "Charting taxonomy via FTN Fantasy Stats iQ.";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export function isFtnStatsIqIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "FTN_STATSIQ_INGEST");
}

export class FtnStatsIqError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FtnStatsIqError";
  }
}

/** One metric column definition from the catalog taxonomy. */
export interface StatsIqColumn {
  readonly key: string;
  readonly metricKey: string;
  readonly metricSlug: string;
  readonly label: string;
  readonly description: string;
  readonly order: number;
  readonly featured: boolean;
  readonly defaultSort: boolean;
  readonly availability: string;
  readonly sortable: boolean;
  readonly format: string;
  readonly decimals: number;
  readonly accessTier: string;
}

/** One stat table (card family) from the catalog. */
export interface StatsIqTable {
  readonly slug: string;
  readonly category: string;
  readonly columns: readonly StatsIqColumn[];
}

/** The full charting taxonomy. */
export interface StatsIqCatalog {
  readonly tables: readonly StatsIqTable[];
  readonly entitlementsPlan: string;
  readonly catalogRevision: number | null;
  readonly generatedAt: string | null;
}

/** One leaderboard row: an entity plus its metric values. */
export interface StatsIqCardRow {
  readonly entityId: number;
  readonly entityName: string;
  readonly entityType: string;
  readonly team: string;
  readonly teamId: string | null;
  readonly value: number | null;
  readonly rank: number | null;
  readonly metrics: Record<string, number | null>;
}

/** One leaderboard card from the home snapshot. */
export interface StatsIqCard {
  readonly slug: string;
  readonly category: string;
  readonly tableSlug: string;
  readonly defaultSort: string;
  readonly columnKeys: readonly string[];
  readonly rows: readonly StatsIqCardRow[];
}

/** The home leaderboard snapshot. */
export interface StatsIqHome {
  readonly season: number;
  readonly seasonType: string;
  readonly cards: readonly StatsIqCard[];
}

/* ---------- defensive parsing: malformed bodies degrade to empty, never throw ---------- */

type RawRecord = Record<string, unknown>;

function isRecord(v: unknown): v is RawRecord {
  return v !== null && typeof v === "object";
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function finiteOr(v: unknown, fallback: number): number {
  const n = finiteOrNull(v);
  return n === null ? fallback : n;
}

function asBool(v: unknown): boolean {
  return v === true;
}

function asMetrics(raw: unknown): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  if (!isRecord(raw)) return out;
  for (const [k, v] of Object.entries(raw)) out[k] = finiteOrNull(v);
  return out;
}

function asColumn(raw: unknown): StatsIqColumn | null {
  if (!isRecord(raw)) return null;
  const key = asString(raw.key);
  const label = asString(raw.label);
  if (key === "" || label === "") return null;
  return {
    key,
    metricKey: asString(raw.metricKey),
    metricSlug: asString(raw.metricSlug),
    label,
    description: asString(raw.description),
    order: finiteOr(raw.order, 0),
    featured: asBool(raw.featured),
    defaultSort: asBool(raw.defaultSort),
    availability: asString(raw.availability),
    sortable: asBool(raw.sortable),
    format: asString(raw.format),
    decimals: finiteOr(raw.decimals, 0),
    accessTier: asString(raw.accessTier),
  };
}

function asColumns(raw: unknown): StatsIqColumn[] {
  if (!Array.isArray(raw)) return [];
  const out: StatsIqColumn[] = [];
  for (const item of raw) {
    const col = asColumn(item);
    if (col) out.push(col);
  }
  return out;
}

function asTable(raw: unknown): StatsIqTable | null {
  if (!isRecord(raw)) return null;
  const slug = asString(raw.slug);
  if (slug === "") return null;
  return {
    slug,
    category: asString(raw.category),
    columns: asColumns(raw.columns),
  };
}

function asTables(raw: unknown): StatsIqTable[] {
  if (!Array.isArray(raw)) return [];
  const out: StatsIqTable[] = [];
  for (const item of raw) {
    const t = asTable(item);
    if (t) out.push(t);
  }
  return out;
}

function emptyCatalog(): StatsIqCatalog {
  return { tables: [], entitlementsPlan: "", catalogRevision: null, generatedAt: null };
}

function parseCatalog(body: unknown): StatsIqCatalog {
  if (!isRecord(body)) return emptyCatalog();
  return {
    tables: asTables(body.tables),
    entitlementsPlan: asString(body.entitlementsPlan),
    catalogRevision: finiteOrNull(body.catalogRevision),
    generatedAt: asNullableString(body.generatedAt),
  };
}

function asCardRow(raw: unknown): StatsIqCardRow | null {
  if (!isRecord(raw)) return null;
  const entityName = asString(raw.entityName);
  if (entityName === "") return null;
  const entityId = finiteOrNull(raw.entityId);
  return {
    entityId: entityId === null ? 0 : entityId,
    entityName,
    entityType: asString(raw.entityType),
    team: asString(raw.team),
    teamId: asNullableString(raw.teamId),
    value: finiteOrNull(raw.value),
    rank: finiteOrNull(raw.rank),
    metrics: asMetrics(raw.metrics),
  };
}

function asCardRows(raw: unknown): StatsIqCardRow[] {
  if (!Array.isArray(raw)) return [];
  const out: StatsIqCardRow[] = [];
  for (const item of raw) {
    const row = asCardRow(item);
    if (row) out.push(row);
  }
  return out;
}

function asCard(raw: unknown): StatsIqCard | null {
  if (!isRecord(raw)) return null;
  const slug = asString(raw.slug);
  if (slug === "") return null;
  const columnKeys: string[] = [];
  if (Array.isArray(raw.columnKeys)) {
    for (const k of raw.columnKeys) {
      if (typeof k === "string") columnKeys.push(k);
    }
  }
  return {
    slug,
    category: asString(raw.category),
    tableSlug: asString(raw.tableSlug),
    defaultSort: asString(raw.defaultSort),
    columnKeys,
    rows: asCardRows(raw.rows),
  };
}

function asCards(raw: unknown): StatsIqCard[] {
  if (!Array.isArray(raw)) return [];
  const out: StatsIqCard[] = [];
  for (const item of raw) {
    const c = asCard(item);
    if (c) out.push(c);
  }
  return out;
}

function emptyHome(): StatsIqHome {
  return { season: 0, seasonType: "", cards: [] };
}

function parseHome(body: unknown): StatsIqHome {
  if (!isRecord(body)) return emptyHome();
  return {
    season: finiteOr(body.season, 0),
    seasonType: asString(body.seasonType),
    cards: asCards(body.cards),
  };
}

export class FtnStatsIqClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  private async getJson(path: string, sourceId: string): Promise<unknown> {
    assertIngestible(sourceId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${FTN_STATSIQ_BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new FtnStatsIqError(`FTN Stats iQ HTTP ${res.status}`, res.status);
      try {
        return (await res.json()) as unknown;
      } catch {
        return null;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * The charting taxonomy. Returns null when the ingest flag is off.
   * Throws (no network) when the registry still forbids ingestion or the
   * server answers with a non-2xx. Malformed bodies degrade to an empty
   * catalog rather than throwing.
   */
  async getCatalog(): Promise<StatsIqCatalog | null> {
    if (!isFtnStatsIqIngestEnabled(this.env)) return null;
    return parseCatalog(await this.getJson("/catalog", FTN_STATSIQ_CATALOG_ID));
  }

  /**
   * The leaderboard snapshot. Returns null when the ingest flag is off.
   * Throws (no network) when the registry still forbids ingestion or the
   * server answers with a non-2xx. Malformed bodies degrade to an empty
   * snapshot rather than throwing.
   */
  async getHome(): Promise<StatsIqHome | null> {
    if (!isFtnStatsIqIngestEnabled(this.env)) return null;
    return parseHome(await this.getJson("/home", FTN_STATSIQ_HOME_ID));
  }
}
