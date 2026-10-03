/**
 * FTN Charting API — OpenAPI spec only (machine-readable map of the data API).
 *
 * VERIFIED LIVE 2026-09-18 (registry evidence):
 *   - ftn-charting-openapi → https://charting.ftntools.com/api/openapi.json :
 *     HTTP 200, 599,785 bytes, 145 paths.
 *     Verified fixture shape: { info: { title: "FTN Charting 1.0.0",
 *     version: "1.0.0" }, paths: { "/api/participants/player_profile/bulk": {},
 *     "/api/participants/schedule/previous": {} } } → pathCount 2.
 *
 * LEGAL / SAFETY (registry: use-with-caution, ENV-GATED OFF):
 *   - Attribution: "API map via FTN Charting public docs."
 *   - The spec itself is public, but runtime auth per DATA endpoint is
 *     UNVERIFIED — so this client maps the API only (title/version/path
 *     list) and never calls a data endpoint. Default OFF behind
 *     FTN_CHARTING_SPEC_INGEST.
 *   - assertIngestible("ftn-charting-openapi") runs before any network when
 *     the flag is on; GET only, no-store fetch.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const FTN_CHARTING_SPEC_SOURCE_ID = "ftn-charting-openapi";
export const FTN_CHARTING_BASE = "https://charting.ftntools.com/api";
export const FTN_CHARTING_SPEC_ATTRIBUTION = "API map via FTN Charting public docs.";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class FtnChartingSpecError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FtnChartingSpecError";
  }
}

/** Machine-readable map of the FTN Charting data API (no data endpoints called). */
export interface FtnChartingOpenApiSummary {
  readonly title: string | null;
  readonly version: string | null;
  readonly pathCount: number;
  readonly paths: readonly string[];
}

export function isFtnChartingSpecIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "FTN_CHARTING_SPEC_INGEST");
}

/** Parse an OpenAPI document into a path summary. Pure: exported for testing. */
export function summarizeOpenApiSpec(spec: unknown): FtnChartingOpenApiSummary {
  if (!spec || typeof spec !== "object") {
    return { title: null, version: null, pathCount: 0, paths: [] };
  }
  const s = spec as { info?: unknown; paths?: unknown };
  let title: string | null = null;
  let version: string | null = null;
  if (s.info && typeof s.info === "object") {
    const info = s.info as { title?: unknown; version?: unknown };
    title = typeof info.title === "string" ? info.title : null;
    version = typeof info.version === "string" ? info.version : null;
  }
  const paths: string[] =
    s.paths && typeof s.paths === "object" ? Object.keys(s.paths) : [];
  return { title, version, pathCount: paths.length, paths };
}

export class FtnChartingSpecClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * Fetch the public OpenAPI spec and return a machine-readable map
   * (title/version/path list). Returns null when the ingest flag is off.
   * Data endpoints are never called — runtime auth is unverified.
   */
  async getOpenApiSpec(): Promise<FtnChartingOpenApiSummary | null> {
    if (!isFtnChartingSpecIngestEnabled(this.env)) return null;
    assertIngestible(FTN_CHARTING_SPEC_SOURCE_ID);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${FTN_CHARTING_BASE}/openapi.json`, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new FtnChartingSpecError(`FTN Charting spec HTTP ${res.status}`, res.status);
      const spec: unknown = await res.json();
      return summarizeOpenApiSpec(spec);
    } finally {
      clearTimeout(timer);
    }
  }
}
