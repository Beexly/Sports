/**
 * Package-level rights gate for independent probability sources.
 *
 * Why this exists (decision recorded 2026-09-05):
 *   The rights registry (apps/web/lib/scraping/source-rights-registry.ts,
 *   entry "espn-public-api") clears ESPN FACTS only: scores and fixtures,
 *   attribution required, commercial_display_allowed false. The ESPN Power
 *   Index (FPI) is a proprietary prediction, which .claude/rules/scraping.md
 *   lists under "Never extract". The same rule notes that packages/* cannot
 *   import the app clearance engine and had no package-level gate; this module
 *   is that gate for the FPI independent source.
 *
 * Posture: FAIL CLOSED. FPI is not fetched unless the deploy environment sets
 * ESPN_POWERINDEX_LICENSED to the exact string "true". Setting that variable is
 * a founder action taken only after an ESPN data license exists; it is recorded
 * in docs/ops/OPERATOR.md section 5. Agents never set it (AGENTS.md law 3).
 *
 * The predicate is deliberately strict: "1", "TRUE", "yes", "on" all read as
 * closed so a half-configured environment cannot open the source by accident.
 */

export const ESPN_POWERINDEX_LICENSE_ENV = "ESPN_POWERINDEX_LICENSED" as const;

/**
 * True only when the founder has recorded an ESPN license by setting
 * ESPN_POWERINDEX_LICENSED="true" (exact string). Everything else is closed.
 */
export function isEspnPowerIndexCleared(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ESPN_POWERINDEX_LICENSE_ENV] === "true";
}
