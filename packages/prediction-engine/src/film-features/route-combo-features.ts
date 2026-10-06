/**
 * Route-combination features: what route groupings recur, from which
 * formations, with what results.
 *
 * Wraps Stream D's routeCombinationFrequency in the bridge's feature
 * contract (provenance, weight 0, UNCALIBRATED) and adds the result
 * dimension: average yards per combo, so the engine can ask "when they
 * run go+slant+out from trips-right, what happens?"
 *
 * Coverage shells are a reserved v2 dimension: broadcast film does not
 * yet classify the defensive shell, so every combo records
 * coverageShell 'unknown' rather than a guess.
 *
 * Original implementation for GSE.
 */

import {
  routeCombinationFrequency,
  type TendencyFilter,
} from "../perception/cv-tendencies.js";
import type { FilmPlayInput } from "./film-types.js";
import { filmProvenance, type FilmProvenance } from "./film-provenance.js";

export interface RouteComboFeature {
  readonly combo: string;
  /** Formation distribution the combo was run from. */
  readonly formation: string | null;
  /** Defensive coverage shell — v2; always 'unknown' in v1. */
  readonly coverageShell: "unknown";
  readonly n: number;
  readonly share: number;
  /** Mean result yards when observed; null when results unobserved. */
  readonly avgResultYards: number | null;
  readonly provenance: FilmProvenance;
}

/**
 * Route-combo features for plays matching the filter. Combos are
 * computed per formation family so the same combo from trips vs 2x2
 * stays distinct.
 */
export function extractRouteComboFeatures(
  plays: readonly FilmPlayInput[],
  filter: TendencyFilter = {},
): RouteComboFeature[] {
  const formations = new Set<string>();
  for (const p of plays) formations.add(p.distribution ?? "unknown");

  const out: RouteComboFeature[] = [];
  for (const formation of formations) {
    const famFilter: TendencyFilter = {
      ...filter,
      distribution: formation === "unknown" ? undefined : formation,
    };
    const combos = routeCombinationFrequency(plays, famFilter);
    for (const c of combos) {
      const famPlays = plays.filter(
        (p) =>
          p.routeCombo === c.combo &&
          (p.distribution ?? "unknown") === formation,
      );
      const yards = famPlays
        .map((p) => p.resultYards)
        .filter((y): y is number => y != null);
      const confidences = famPlays
        .map((p) => p.playConfidence)
        .filter((v): v is number => v != null);
      out.push({
        combo: c.combo,
        formation: formation === "unknown" ? null : formation,
        coverageShell: "unknown",
        n: c.n,
        share: c.share,
        avgResultYards:
          yards.length > 0
            ? Math.round(
                (yards.reduce((a, b) => a + b, 0) / yards.length) * 100,
              ) / 100
            : null,
        provenance: filmProvenance(
          c.n,
          confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0.5,
        ),
      });
    }
  }
  return out.sort((a, b) => b.n - a.n);
}
