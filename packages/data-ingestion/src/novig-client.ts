/**
 * Novig — two legal surfaces, two registry ids.
 *
 * 1) Authenticated REST (api.novig.us) — paid-required, fail-closed.
 *    OAuth trading + market-data. Not a public odds dump.
 *
 * 2) Public daily CSVs (data.novig.com) — use-with-caution.
 *    docs.novig.com/api-reference/trade-data: anonymized trades.csv +
 *    markets.csv, no auth, CDN. Verified live 2026-08-22. Historical tape
 *    only — never a live pick input. Default OFF via NOVIG_PUBLIC_CSV.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled, envSecret } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const NOVIG_REST_SOURCE_ID = "novig";
export const NOVIG_CSV_SOURCE_ID = "novig-public-csv";
export const NOVIG_REST_BASE = "https://api.novig.us/nbx/v2";
export const NOVIG_CSV_BASE = "https://data.novig.com";
const TIMEOUT_MS = 12_000;

export function isNovigRestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "NOVIG_REST");
}

export function isNovigPublicCsvEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "NOVIG_PUBLIC_CSV");
}

export class NovigError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NovigError";
  }
}

export interface NovigPublicCsvIndex {
  readonly dates: readonly string[];
  readonly marketDates: readonly string[];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

export class NovigRestClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  async getMarkets(): Promise<unknown> {
    if (!isNovigRestEnabled(this.env)) return null;
    assertIngestible(NOVIG_REST_SOURCE_ID);
    const token = envSecret(this.env, "NOVIG_ACCESS_TOKEN");
    if (!token) throw new NovigError("missing NOVIG_ACCESS_TOKEN");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${NOVIG_REST_BASE}/markets`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new NovigError(`Novig REST HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class NovigPublicCsvClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /** List published tape dates. Null when the env gate is off. */
  async listIndex(): Promise<NovigPublicCsvIndex | null> {
    if (!isNovigPublicCsvEnabled(this.env)) return null;
    assertIngestible(NOVIG_CSV_SOURCE_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${NOVIG_CSV_BASE}/reporting/trade-data/index.json`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new NovigError(`Novig CSV HTTP ${res.status}`, res.status);
      const body = (await res.json()) as { dates?: unknown; marketDates?: unknown };
      return {
        dates: asStringArray(body.dates),
        marketDates: asStringArray(body.marketDates),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
