/**
 * Stored-signal environment bridge — closes the silent weather gap.
 *
 * THE LEAK (verified 2026-10-13): the production slate (generateSignalSlate,
 * cron every 15 min) passes `env: process.env` to the signal registry, but
 * the weather cron (game-weather-capture, 3x/day) writes wind/temp/precip to
 * the DB `signals` table — never to env. The wind-elasticity signal reads
 * ctx.env.WIND_MPH, finds nothing, returns null, and the continuous-tilt path
 * applies NOTHING — silently, in production, for months.
 *
 * THE BRIDGE: read the stored signal rows for a game (same
 * (gameId, sourceCategory, sourceName, signalKey) contract the weather cron
 * writes, expiring at kickoff) and present them in the env-shaped dictionary
 * the registry signals already speak (WIND_MPH, WIND_GUST_MPH, TEMP_F,
 * PRECIP_PCT, IS_DOME). DB-first, env-fallback: an explicitly-set env var
 * still wins (ops override semantics preserved).
 *
 * Fail-open: any read error returns the env dictionary untouched, with the
 * miss recorded by the caller. Never invents a weather number.
 */

import { db } from "@sports/db";

const WEATHER_KEY_TO_ENV: Record<string, string> = {
  wind_mph: "WIND_MPH",
  wind_gust_mph: "WIND_GUST_MPH",
  temp_f: "TEMP_F",
  precip_pct: "PRECIP_PCT",
};

/** SignalCategory enum members usable in the where-clause (schema: WEATHER exists). */

export interface StoredEnvResult {
  /** merged env-shaped dictionary (DB values + process.env fallbacks) */
  readonly env: Record<string, string | undefined>;
  /** which keys came from the stored signals table */
  readonly fromDb: string[];
  /** human-readable note for the slate log */
  readonly note: string;
}

/**
 * Build the env-shaped context for one game: stored signal rows first
 * (wind/temp/precip from the weather capture cron), process.env fallbacks
 * beneath. Non-weather keys pass through from process.env unchanged.
 */
export async function envWithStoredSignals(
  gameId: string,
  baseEnv: Record<string, string | undefined>,
): Promise<StoredEnvResult> {
  const env: Record<string, string | undefined> = { ...baseEnv };
  const fromDb: string[] = [];
  try {
    // GameSignal rows: one current value per (gameId, sourceName, signalKey).
    // signalValue is Json (number | string | object) - unwrap numerics honestly.
    const rows = await db.gameSignal.findMany({
      where: {
        gameId,
        sourceName: "nws",
        signalKey: { in: Object.keys(WEATHER_KEY_TO_ENV) },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { signalKey: true, signalValue: true },
    });
    for (const row of rows) {
      const envKey = WEATHER_KEY_TO_ENV[row.signalKey];
      if (!envKey) continue;
      const raw = row.signalValue;
      const num =
        typeof raw === "number" ? raw
        : typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw)
        : (raw && typeof raw === "object" && typeof (raw as { value?: unknown }).value === "number"
            ? (raw as { value: number }).value
            : null);
      if (num == null || !Number.isFinite(num)) continue;
      // DB value wins only where ops did not set an explicit env override
      if (baseEnv[envKey] == null) {
        env[envKey] = String(num);
        fromDb.push(envKey);
      }
    }
  } catch {
    // fail-open: env-only context, caller sees an empty fromDb
    return { env, fromDb, note: "stored-signal bridge: DB read failed; env-only context" };
  }
  const note = fromDb.length
    ? `stored-signal bridge: ${fromDb.join(",")} injected from signals table (game ${gameId})`
    : "stored-signal bridge: no stored weather rows for this game; env-only context";
  return { env, fromDb, note };
}
