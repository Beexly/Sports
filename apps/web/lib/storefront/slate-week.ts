import { WEEK8_GAME_DAY_CATALOG_METADATA } from "@/lib/packages/catalog";

/**
 * The active slate week, read from the catalogue's slate window label instead
 * of being typed into each maintenance route. "Week 10 · TNF WSH @ NYG ..."
 * yields 10. Fails closed: a label that names no week is a broken catalogue,
 * not a route that should guess.
 */
export function activeSlateWeek(): number {
  const match = /Week\s+(\d+)/i.exec(WEEK8_GAME_DAY_CATALOG_METADATA.slateWindowLabel);
  if (!match) throw new Error("catalog slateWindowLabel must name the active week");
  return Number(match[1]);
}

/** The cockpit's slate token, e.g. WEEK_10_LIVE. */
export function slateWeekToken(week: number): string {
  return `WEEK_${String(week).padStart(2, "0")}_LIVE`;
}

/**
 * Every shape a prior week leaves behind: kebab slugs, WEEK_NN slugs, and
 * "Week N" headlines. The storefront has written all three over its life.
 */
export function priorWeekMatchers(week: number): { slugs: string[]; headlines: string[] } {
  return {
    slugs: [`week-${week}`, `WEEK_${String(week).padStart(2, "0")}`],
    headlines: [`Week ${week}`],
  };
}
