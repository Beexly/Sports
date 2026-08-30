/**
 * ProphetX Market Data API — fail-closed partner SKU.
 *
 * HOW: docs.prophetx.co lists a read-only Market Data API for display partners
 * (not the Trading API: no orders, no wallet). There is no self-serve public
 * key; access is partner onboarding. Until GSE has written partner credentials
 * AND the registry verdict is licensed, this client does not fetch.
 *
 * Do not scrape prophetx.co. Do not place orders.
 */

import { assertIngestible } from "./source-registry.js";
import { envFlagEnabled, envSecret } from "./fail-closed-env.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const PROPHETX_SOURCE_ID = "prophetx";
/** Partner base; unused until ingestible. */
export const PROPHETX_MARKET_DATA_BASE = "https://api.prophetx.co";
const TIMEOUT_MS = 12_000;

export function isProphetXMarketDataEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envFlagEnabled(env, "PROPHETX_MARKET_DATA");
}

export class ProphetXError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProphetXError";
  }
}

export class ProphetXMarketDataClient {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly fetchImpl: typeof fetch = noStoreFetch,
  ) {}

  async getMarkets(): Promise<unknown> {
    if (!isProphetXMarketDataEnabled(this.env)) return null;
    assertIngestible(PROPHETX_SOURCE_ID);
    const key = envSecret(this.env, "PROPHETX_API_KEY");
    if (!key) throw new ProphetXError("missing PROPHETX_API_KEY");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await this.fetchImpl(`${PROPHETX_MARKET_DATA_BASE}/v1/markets`, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) throw new ProphetXError(`ProphetX HTTP ${res.status}`, res.status);
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}
