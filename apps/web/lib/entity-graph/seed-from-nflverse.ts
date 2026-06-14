/**
 * Entity Graph Seeder — nflverse rosters → PlayerEntity/EntityAlias
 *
 * Fetches roster data from nflverse for a given NFL season and upserts
 * each player into the canonical PlayerEntity table via resolvePlayer().
 *
 * Rights: nflverse is approved_open_license (CC BY-SA 4.0).
 * Attribution required on all derived outputs:
 *   "Data from nflverse (https://github.com/nflverse), CC BY-SA 4.0"
 *
 * A RightsSnapshot is captured at seed time and returned in the summary
 * so callers can attach it to ingestion run metadata.
 */

import {
  fetchNflverseRosters,
  type NflverseRosterRow,
  type Fetcher,
} from "@/lib/data-sources/nflverse";
import {
  getSourceRightsEntry,
  snapshotRights,
  type RightsSnapshot,
} from "@/lib/scraping/source-rights-registry";
import { resolvePlayer } from "./resolver";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SeedSummary {
  season: number;
  seeded: number;
  skipped: number;
  errors: number;
  rightsSnapshot: RightsSnapshot;
  attribution: string;
  completedAt: string;
}

export interface SeedFromNflverseOptions {
  season: number;
  /**
   * Injectable HTTP fetcher — required in tests so we never hit the network.
   * Production callers can omit this and the default `fetch` will be used.
   */
  fetcher?: Fetcher;
}

// ─── Seeder ───────────────────────────────────────────────────────────────────

/**
 * Seed the entity graph from nflverse roster data for a given season.
 *
 * Each NflverseRosterRow is resolved via resolvePlayer() which is idempotent —
 * running this twice for the same season is safe and will only bump
 * lastVerifiedAt on existing entities.
 *
 * The function does NOT call resolvePlayer when a test stub is detected
 * (fetcher !== undefined and result.ok === false), so unit tests that inject
 * an error-returning stub will receive a summary with errors > 0 but will not
 * touch the database.
 */
export async function seedFromNflverse(options: SeedFromNflverseOptions): Promise<SeedSummary> {
  const { season, fetcher } = options;

  // Capture rights snapshot — nflverse is always approved_open_license.
  const entry = getSourceRightsEntry("nflverse");
  if (!entry) {
    throw new Error(
      "nflverse is not registered in the Source Rights Registry. " +
      "Add it before running this seeder.",
    );
  }
  const rightsSnapshot = snapshotRights(entry);

  // Fetch rosters from nflverse (injectable for tests).
  const result = fetcher
    ? await fetchNflverseRosters(season, fetcher)
    : await fetchNflverseRosters(season);

  if (!result.ok) {
    // Network or parse error — return a summary with 0 seeded and errors=1.
    return {
      season,
      seeded: 0,
      skipped: 0,
      errors: 1,
      rightsSnapshot,
      attribution: entry.attribution_text ?? "Data from nflverse (https://github.com/nflverse), CC BY-SA 4.0",
      completedAt: new Date().toISOString(),
    };
  }

  let seeded = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of result.data) {
    // Skip rows without a usable identifier — we can't deduplicate them.
    if (!row.playerId && !row.playerName) {
      skipped++;
      continue;
    }

    try {
      await resolvePlayerFromRosterRow(row);
      seeded++;
    } catch {
      errors++;
    }
  }

  return {
    season,
    seeded,
    skipped,
    errors,
    rightsSnapshot,
    attribution: entry.attribution_text ?? "Data from nflverse (https://github.com/nflverse), CC BY-SA 4.0",
    completedAt: new Date().toISOString(),
  };
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function resolvePlayerFromRosterRow(row: NflverseRosterRow): Promise<void> {
  // nflverse uses gsis_id as the primary stable identifier.
  await resolvePlayer({
    gsisId: row.playerId || undefined,
    name: row.playerName || undefined,
    position: row.position || undefined,
    source: "nflverse",
  });
}
