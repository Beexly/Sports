/**
 * SharpAPI — fail-closed until a paid key AND a licensed registry verdict.
 *
 * HOW (legal sportsbook data, not HTML scrape):
 *   SharpAPI is an official paid aggregator (docs.sharpapi.io). Books include
 *   DK/FD/MGM plus Pinnacle as the sharp reference. POWER de-vig is their
 *   default; GSE already owns first-party powerDevig/shinDevig so we do not
 *   ship their EV SKU as the product.
 *
 * Default OFF. Even with SHARP_API_KEY set, assertIngestible("sharp-api")
 * throws while the registry verdict is paid-required. Founder buys a plan,
 * then flips the verdict to licensed. No fetch happens before that.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled, envSecret } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const SHARP_API_SOURCE_ID = "sharp-api";
export const SHARP_API_BASE = "https://api.sharpapi.io";
const TIMEOUT_MS = 12_000;

export function isSharpApiIngestEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "SHARP_API_INGEST");
}

export class SharpApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SharpApiError";
  }
}

export class SharpApiClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  /**
   * Live odds snapshot. Returns null when the ingest flag is off.
   * Throws (no network) when the registry still says paid-required or the key is missing.
   */
  async getOdds(): Promise<unknown> {
    if (!isSharpApiIngestEnabled(this.env)) return null;
    assertIngestible(SHARP_API_SOURCE_ID);
    const key = envSecret(this.env, "SHARP_API_KEY");
    if (!key) throw new SharpApiError("missing SHARP_API_KEY");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${SHARP_API_BASE}/api/v1/odds`, {
        headers: { "X-API-Key": key, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new SharpApiError(`SharpAPI HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}
