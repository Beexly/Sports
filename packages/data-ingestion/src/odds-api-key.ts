/**
 * Resolve The Odds API key from common env aliases.
 * Never invents a key. Empty string = ABSENT (free-path law).
 *
 * Canonical: THE_ODDS_API_KEY
 * Aliases cover free-tier dashboard renames and founder typos so board fill
 * does not depend on a single exact env name.
 */
export const ODDS_API_KEY_ENV_NAMES = [
  "THE_ODDS_API_KEY",
  "ODDS_API_KEY",
  "THEODDS_API_KEY",
  "THE_ODDS_API",
  "ODDS_API_KEY_FREE",
  "FREE_ODDS_API_KEY",
  "ODDSAPI_KEY",
  "ODDS_API_IO_KEY",
  // Founder "switched keys" renames seen in dashboards
  "ODDS_KEY",
  "THE_ODDS_KEY",
  "ODDSAPI",
  "THEODDSAPI_KEY",
  "THE_ODDS_API_TOKEN",
  "ODDS_API_TOKEN",
  "THEODDS_KEY",
  "API_KEY_ODDS",
  "ODDSAPIKEY",
] as const;

export type OddsApiKeyEnvName = (typeof ODDS_API_KEY_ENV_NAMES)[number];

export function resolveOddsApiKey(
  env: Record<string, string | undefined> = process.env,
): string {
  for (const name of ODDS_API_KEY_ENV_NAMES) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return "";
}

/** Boolean presence only — never returns secret material. */
export function oddsApiKeyPresence(
  env: Record<string, string | undefined> = process.env,
): { present: boolean; matchedEnv: OddsApiKeyEnvName | null } {
  for (const name of ODDS_API_KEY_ENV_NAMES) {
    if (env[name]?.trim()) return { present: true, matchedEnv: name };
  }
  return { present: false, matchedEnv: null };
}
