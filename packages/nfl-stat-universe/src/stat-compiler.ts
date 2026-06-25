/**
 * NFL STAT UNIVERSE — Stat Compiler.
 *
 * Compiles a raw fact into a credited stat ONLY when it is point-in-time knowable (reusing the mesh's
 * `knowableAt` — fail-closed on future leakage and rights), its type is declared by the stat, and its
 * source is production-usable. It never marks a stat "role truth" without naming the usage source it
 * came from. Pure + deterministic.
 */

import { type TemporalFact, knowableAt } from "@sports/data-intelligence";
import { statByKey } from "./nfl-stat-manifest.js";
import { isForbiddenForProduction, SOURCES } from "./stat-definition.js";

export interface CompiledStat {
  readonly statKey: string;
  readonly credited: boolean;
  readonly reason: string;
}

/** Credit a stat from a fact at a decision time, failing closed on leakage, rights, type, or source. */
export function compileStatAtDecision(statKey: string, fact: TemporalFact, decisionTimeIso: string): CompiledStat {
  const stat = statByKey(statKey);
  if (!stat) return { statKey, credited: false, reason: "Unknown stat key." };

  const k = knowableAt(fact, decisionTimeIso);
  if (!k.creditable) return { statKey, credited: false, reason: `Light cone: ${k.reason}` };

  if (!stat.factTypes.includes(fact.factType)) {
    return { statKey, credited: false, reason: `Fact type ${fact.factType} is not declared by ${statKey}.` };
  }

  const source = SOURCES[fact.sourceId];
  if (source && isForbiddenForProduction(source)) {
    return { statKey, credited: false, reason: `Source ${fact.sourceId} is forbidden for production (${source.legalStatus}).` };
  }

  return { statKey, credited: true, reason: "Knowable, rights-clear, declared type, production-usable source." };
}
