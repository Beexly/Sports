/**
 * DATA INTELLIGENCE MESH — Coverage Gap Radar.
 *
 * Given the facts GSE's modules REQUIRE and the endpoints it actually has, find the missing
 * decision-relevant facts — and how urgent each gap is (how many modules it blocks). This turns
 * "we need some stats" into a ranked, named list of exactly what is missing and what it unlocks.
 * Pure + deterministic.
 */

import type { FactType } from "./fact-type.js";
import type { EndpointGenome } from "./endpoint-genome.js";

export interface ModuleRequirement {
  readonly module: string;
  readonly requiredFacts: readonly FactType[];
}

export interface CoverageGap {
  readonly factType: FactType;
  readonly modulesBlocked: readonly string[];
  readonly urgency: number; // modules blocked, normalized 0..1
}

export interface CoverageRadarResult {
  readonly gaps: readonly CoverageGap[];          // uncovered, worst-first
  readonly coveredFacts: readonly FactType[];
  readonly note: string;
}

/** The facts GSE's headline modules need — the demand side of the coverage equation. */
export const DEFAULT_MODULE_REQUIREMENTS: readonly ModuleRequirement[] = [
  { module: "Book DNA / Absorption Half-Life", requiredFacts: ["odds_history", "book_update", "closing_line", "player_prop", "alt_prop"] },
  { module: "Market Twin / Tradability", requiredFacts: ["moneyline", "spread", "total", "live_odds", "odds_history"] },
  { module: "Role State Vector / Opportunity Conservation", requiredFacts: ["snap_share", "route_rate", "target_share", "carry_share", "air_yards", "red_zone_touch"] },
  { module: "Fantasy Absorption / Manager DNA", requiredFacts: ["platform_projection", "analyst_rank", "adp", "roster_pct", "start_pct", "add_drop_velocity"] },
  { module: "DFS Leverage Lab / Contest Reflexivity", requiredFacts: ["dfs_salary", "dfs_slate", "ownership_projection", "actual_ownership"] },
  { module: "Information Light Cone / Narrative Gravity", requiredFacts: ["injury_report", "inactive_status", "practice_status", "beat_report", "weather"] },
];

/** Detect which required facts no available endpoint covers, ranked by how many modules they block. */
export function detectCoverageGaps(requirements: readonly ModuleRequirement[], endpoints: readonly EndpointGenome[]): CoverageRadarResult {
  const covered = new Set<FactType>(endpoints.flatMap((e) => e.factTypes));
  const blockedBy = new Map<FactType, string[]>();
  const coveredFacts = new Set<FactType>();

  for (const req of requirements) {
    for (const fact of req.requiredFacts) {
      if (covered.has(fact)) {
        coveredFacts.add(fact);
      } else {
        const arr = blockedBy.get(fact) ?? [];
        arr.push(req.module);
        blockedBy.set(fact, arr);
      }
    }
  }

  const totalModules = requirements.length || 1;
  const gaps: CoverageGap[] = [...blockedBy.entries()]
    .map(([factType, modules]) => ({ factType, modulesBlocked: modules, urgency: Number((modules.length / totalModules).toFixed(4)) }))
    .sort((a, b) => b.modulesBlocked.length - a.modulesBlocked.length || a.factType.localeCompare(b.factType));

  return {
    gaps,
    coveredFacts: [...coveredFacts],
    note: `${gaps.length} fact type(s) uncovered across ${requirements.length} modules; ${coveredFacts.size} covered.`,
  };
}
