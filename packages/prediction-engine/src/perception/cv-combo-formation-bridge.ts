/**
 * Bridge: formation classification → route-combination priors.
 *
 * The combination ontology defines pre-snap `tells` (e.g. "bunch", "3x1",
 * "play-action"). This module scores those tells against the classified
 * formation and boosts matching combination hypotheses.
 *
 * Private research fuel — never public, never calibration truth.
 */

import type { Distribution } from "./cv-formation-classify";
import {
  ROUTE_COMBINATIONS,
  hypothesizeCombinations,
  type CombinationHypothesis,
} from "./cv-route-combinations";
import type { RouteName, FieldSide, RouteDepth } from "./cv-route-combinations";

/** Normalize a tell string to match Distribution values. */
function tellMatchesDistribution(tell: string, dist: Distribution): boolean {
  const t = tell.toLowerCase();
  const d = dist.toLowerCase();
  // "3x1" matches "3x1-left" / "3x1-right"; "bunch" matches "bunch-left", etc.
  if (t === "3x1" && d.startsWith("3x1")) return true;
  if (t === "2x2" && d === "2x2") return true;
  if (t === "bunch" && d.startsWith("bunch")) return true;
  if (t === "trips" && d.startsWith("trips")) return true;
  if (d.includes(t) || t.includes(d.replace("-left", "").replace("-right", ""))) return true;
  return false;
}

export interface FormationBoostedHypothesis extends CombinationHypothesis {
  formationBoost: number;
  boostedConfidence: number;
}

/**
 * Score combinations from observed routes, boosted by formation tells.
 * A combination whose tells match the classified distribution gets
 * +0.15 confidence per matching tell (capped at +0.3).
 */
export function hypothesizeWithFormation(
  observed: { route: RouteName; side: FieldSide; depth: RouteDepth }[],
  distribution: Distribution,
): FormationBoostedHypothesis[] {
  const base = hypothesizeCombinations(observed);
  return base
    .map((h) => {
      const combo = ROUTE_COMBINATIONS.find((c) => c.name === h.combination);
      let boost = 0;
      if (combo && distribution !== "unknown") {
        for (const tell of combo.tells) {
          if (tellMatchesDistribution(tell, distribution)) {
            boost += 0.15;
          }
        }
        boost = Math.min(boost, 0.3);
      }
      return {
        ...h,
        formationBoost: Math.round(boost * 100) / 100,
        boostedConfidence: Math.min(1, Math.round((h.confidence + boost) * 100) / 100),
      };
    })
    .sort((a, b) => b.boostedConfidence - a.boostedConfidence);
}
