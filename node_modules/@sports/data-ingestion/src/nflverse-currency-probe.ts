/**
 * Lightweight nflverse currency probe for health / free-spine.
 *
 * Unlike scripts/check-nflverse-currency.ts (full download + season scan),
 * this only HEAD/GET-checks a few catalog assets for the completed REG floor
 * season. No body retained — safe for /api/health serverless budget.
 *
 * Honesty:
 *   - Never invents currency. Missing assets → not ok.
 *   - Uses resolveFootballStatsSeason (2025 floor until newer REG exists).
 *   - Failures are labelled, not green-washed.
 */

import { NFLVERSE_CATALOG, nflverseUrl, type NflverseDatasetKey } from "./nflverse-source.js";
import { resolveFootballStatsSeason } from "./nflverse-season.js";

export type NflverseCurrencyAssetResult = {
  readonly key: NflverseDatasetKey;
  readonly url: string;
  readonly ok: boolean;
  /** HTTP status, or error string when the request failed. */
  readonly status: number | string;
};

export type NflverseCurrencyProbeResult = {
  readonly ok: boolean;
  readonly season: number;
  readonly labelledCurrent: number;
  readonly completedFloor: number;
  readonly probedAt: string;
  readonly assets: readonly NflverseCurrencyAssetResult[];
  readonly reason: string;
};

export type NflverseCurrencyProbeOptions = {
  readonly now?: Date;
  /** Injectable for tests. Defaults to globalThis.fetch. */
  readonly fetcher?: typeof fetch;
  /** Per-asset timeout. Default 4000ms. */
  readonly timeoutMs?: number;
  /**
   * Hard assets that must respond 2xx for ok=true.
   * Default: rosters (seasonal floor) + schedules (combined game master).
   */
  readonly hardKeys?: readonly NflverseDatasetKey[];
};

const DEFAULT_HARD: readonly NflverseDatasetKey[] = ["rosters", "schedules"];

async function probeAsset(
  key: NflverseDatasetKey,
  season: number,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<NflverseCurrencyAssetResult> {
  const url = nflverseUrl(key, season);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Prefer HEAD (cheap). Some hosts reject HEAD — fall back to GET range.
    let res = await fetcher(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetcher(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        signal: controller.signal,
        cache: "no-store",
      });
    }
    const ok = res.status >= 200 && res.status < 400;
    return { key, url, ok, status: res.status };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timeout>${timeoutMs}ms`
          : err.message
        : String(err);
    return { key, url, ok: false, status: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe whether free nflverse catalog assets for the stats season are reachable.
 * Pure network check — no parse, no cache write, no invented seasons.
 */
export async function probeNflverseSourceCurrency(
  options: NflverseCurrencyProbeOptions = {},
): Promise<NflverseCurrencyProbeResult> {
  const now = options.now ?? new Date();
  const resolution = resolveFootballStatsSeason(now);
  const season = resolution.season;
  const timeoutMs = options.timeoutMs ?? 4000;
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const hardKeys = options.hardKeys ?? DEFAULT_HARD;

  // Validate keys exist in catalog so typos fail at probe time, not silently.
  for (const key of hardKeys) {
    if (!(key in NFLVERSE_CATALOG)) {
      return {
        ok: false,
        season,
        labelledCurrent: resolution.labelledCurrent,
        completedFloor: resolution.completedFloor,
        probedAt: now.toISOString(),
        assets: [],
        reason: `Unknown catalog key in hardKeys: ${String(key)}`,
      };
    }
  }

  const assets: NflverseCurrencyAssetResult[] = [];
  for (const key of hardKeys) {
    assets.push(await probeAsset(key, season, fetcher, timeoutMs));
  }

  const failed = assets.filter((a) => !a.ok);
  const ok = failed.length === 0;
  const reason = ok
    ? `nflverse hard assets reachable for stats season ${season} (${resolution.reason})`
    : `nflverse hard assets unreachable for season ${season}: ${failed
        .map((f) => `${f.key}→${f.status}`)
        .join(", ")}`;

  return {
    ok,
    season,
    labelledCurrent: resolution.labelledCurrent,
    completedFloor: resolution.completedFloor,
    probedAt: new Date().toISOString(),
    assets,
    reason,
  };
}
