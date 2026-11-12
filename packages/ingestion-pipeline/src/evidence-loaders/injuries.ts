/**
 * Injury evidence loader — ESPN injuries under the evidence contract.
 *
 * The underlying client returns an EMPTY MAP both when a team genuinely has
 * no injuries and when the fetch failed (HTTP error, network error, source
 * not ingestible). An empty injury report for a Week 10 NFL game is not
 * credible, and the client cannot prove which case happened, so an absent or
 * empty entry is reported as MISSING — never as an empty REAL array.
 */

import type {
  Evidence,
  InjuryRecord,
} from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import {
  canonicalTeamCode,
  tryCanonicalTeamCode,
} from "@sports/prediction-engine/src/evidence/team-codes.js";
import {
  fetchEspnInjuries,
  type NormalizedInjuryRecord,
} from "@sports/data-ingestion/src/espn-injuries-client.js";

const SOURCE = "espn:injuries";

export interface InjuryLoadOptions {
  readonly sportKey?: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Newest valid record date as the source wrote it, or null when none parse. */
function newestRecordDate(
  records: readonly NormalizedInjuryRecord[],
): string | null {
  let newestMs: number | null = null;
  let newestIso: string | null = null;
  for (const record of records) {
    if (record.date === undefined) continue;
    const ms = Date.parse(record.date);
    if (Number.isNaN(ms)) continue;
    if (newestMs === null || ms > newestMs) {
      newestMs = ms;
      newestIso = record.date;
    }
  }
  return newestIso;
}

export async function loadInjuries(
  team: string,
  opts: InjuryLoadOptions = {},
): Promise<Evidence<readonly InjuryRecord[]>> {
  const now = opts.now ?? new Date();

  let code: string;
  try {
    code = canonicalTeamCode(team);
  } catch (err) {
    return missing(`unknown team "${team}": ${errorMessage(err)}`, SOURCE);
  }

  let injuryMap: Map<string, NormalizedInjuryRecord[]>;
  try {
    injuryMap = await fetchEspnInjuries(
      opts.sportKey ?? "americanfootball_nfl",
      opts.fetchImpl,
    );
  } catch (err) {
    return missing(`ESPN injuries fetch failed: ${errorMessage(err)}`, SOURCE);
  }

  // Match on the canonical team code of each record's teamName — never on
  // string equality: feeds say "Los Angeles Rams", "LA" and "LAR" for one
  // team, and the map key is a normalized display name, not a code.
  const matched: NormalizedInjuryRecord[] = [];
  for (const records of injuryMap.values()) {
    for (const record of records) {
      if (tryCanonicalTeamCode(record.teamName) === code) matched.push(record);
    }
  }

  if (matched.length === 0) {
    return missing(
      `ESPN injuries returned no entry for ${code} — cannot distinguish 'no injuries' from a failed fetch`,
      SOURCE,
    );
  }

  const records: readonly InjuryRecord[] = matched.map((record) => ({
    playerName: record.athleteName,
    team: code,
    position: record.position,
    reportStatus: record.status,
    // The ESPN injuries feed carries no practice participation field.
    practiceStatus: null,
    primaryInjury:
      record.shortComment.trim().length > 0 ? record.shortComment : null,
  }));

  const asOf = newestRecordDate(matched) ?? now.toISOString();
  return real(
    records,
    SOURCE,
    asOf,
    "practiceStatus not carried by the ESPN injuries feed; primaryInjury taken from the report comment",
  );
}
