/**
 * Resolve the OddsPapi API key from common env aliases.
 * Never invents a key. Empty string = ABSENT.
 *
 * Canonical: ODDSPAPI_KEY
 *
 * Vendor: 55 Tech (oddspapi.io), base https://api.oddspapi.io/v4, auth via the
 * `apiKey` QUERY parameter — never a header (same contract shape as The Odds
 * API). Spec: docs/research/2026-09-18-props-reverse-engineering/firecrawl/ODDSPAPI-DEEP-DIVE.md
 */
export const ODDSPAPI_KEY_ENV_NAMES = [
  "ODDSPAPI_KEY",
  "ODDS_PAPI_KEY",
  "ODDSPAPI_API_KEY",
  "ODDSPAPI_TOKEN",
] as const;

export type OddsPapiKeyEnvName = (typeof ODDSPAPI_KEY_ENV_NAMES)[number];

export function resolveOddsPapiKey(
  env: Record<string, string | undefined> = process.env,
): string {
  for (const name of ODDSPAPI_KEY_ENV_NAMES) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return "";
}

/** Boolean presence only — never returns secret material. */
export function oddsPapiKeyPresence(
  env: Record<string, string | undefined> = process.env,
): { present: boolean; matchedEnv: OddsPapiKeyEnvName | null } {
  for (const name of ODDSPAPI_KEY_ENV_NAMES) {
    if (env[name]?.trim()) return { present: true, matchedEnv: name };
  }
  return { present: false, matchedEnv: null };
}
