/**
 * Season-matched player identity crosswalk (PFR / ESPN → GSIS).
 *
 * Canonical identity is GSIS (`Player.gsisId`). Snap counts only expose
 * `pfr_player_id`; some ESPN-derived tables only expose ESPN numeric ids.
 * Rosters (and the all-time players table) carry the crosswalk columns.
 *
 * Law:
 *   - Never invent a GSIS id.
 *   - Prefer the season that matches the stats grain; optionally merge a
 *     prior season without overwriting keys already present.
 *   - Empty vendor id → no map entry; lookup returns null.
 */

export type IdVendor = "gsis" | "pfr" | "espn";

export type CrosswalkRow = Readonly<Record<string, string>>;

export type IdCrosswalk = {
  /** Season used for the primary roster load (inspection / stats season). */
  readonly primarySeason: number;
  /** Seasons actually merged into the maps (primary first). */
  readonly seasonsUsed: readonly number[];
  readonly pfrToGsis: ReadonlyMap<string, string>;
  readonly espnToGsis: ReadonlyMap<string, string>;
  readonly gsisToPfr: ReadonlyMap<string, string>;
  readonly gsisToEspn: ReadonlyMap<string, string>;
  readonly stats: {
    readonly rosterRows: number;
    readonly withGsis: number;
    readonly withPfr: number;
    readonly withEspn: number;
    readonly pfrBridged: number;
    readonly espnBridged: number;
  };
};

function cell(row: CrosswalkRow, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Build maps from already-fetched roster (or players) rows.
 * Pure — no I/O. First write wins when the same vendor id appears twice
 * (callers should pass primary-season rows before prior-season rows).
 */
export function buildIdCrosswalk(
  primarySeason: number,
  rosterBatches: readonly { readonly season: number; readonly rows: readonly CrosswalkRow[] }[],
): IdCrosswalk {
  const pfrToGsis = new Map<string, string>();
  const espnToGsis = new Map<string, string>();
  const gsisToPfr = new Map<string, string>();
  const gsisToEspn = new Map<string, string>();

  let rosterRows = 0;
  let withGsis = 0;
  let withPfr = 0;
  let withEspn = 0;
  const seasonsUsed: number[] = [];

  for (const batch of rosterBatches) {
    seasonsUsed.push(batch.season);
    for (const row of batch.rows) {
      rosterRows += 1;
      const gsis = cell(row, "gsis_id") || cell(row, "player_id") || cell(row, "player_gsis_id");
      const pfr = cell(row, "pfr_id") || cell(row, "pfr_player_id");
      const espn = cell(row, "espn_id");

      if (gsis) withGsis += 1;
      if (pfr) withPfr += 1;
      if (espn) withEspn += 1;

      if (gsis && pfr) {
        // Primary batch first: once a GSIS owns a PFR, later seasons must not
        // register alternate historical PFR slugs for the same player (stale
        // slug → wrong bridge if the id was reused). First write still wins
        // when the same PFR appears twice.
        if (!gsisToPfr.has(gsis)) {
          gsisToPfr.set(gsis, pfr);
        }
        const canonicalPfr = gsisToPfr.get(gsis);
        if (canonicalPfr === pfr && !pfrToGsis.has(pfr)) {
          pfrToGsis.set(pfr, gsis);
        }
      }
      if (gsis && espn) {
        if (!gsisToEspn.has(gsis)) {
          gsisToEspn.set(gsis, espn);
        }
        const canonicalEspn = gsisToEspn.get(gsis);
        if (canonicalEspn === espn && !espnToGsis.has(espn)) {
          espnToGsis.set(espn, gsis);
        }
      }
    }
  }

  return {
    primarySeason,
    seasonsUsed,
    pfrToGsis,
    espnToGsis,
    gsisToPfr,
    gsisToEspn,
    stats: {
      rosterRows,
      withGsis,
      withPfr,
      withEspn,
      pfrBridged: pfrToGsis.size,
      espnBridged: espnToGsis.size,
    },
  };
}

/**
 * Resolve a vendor id to GSIS. Returns null when the vendor id is empty or
 * absent from the crosswalk — callers must not invent a substitute.
 */
export function resolveGsisId(
  crosswalk: IdCrosswalk,
  vendor: Exclude<IdVendor, "gsis">,
  vendorId: string | null | undefined,
): string | null {
  const id = (vendorId ?? "").trim();
  if (!id) return null;
  if (vendor === "pfr") return crosswalk.pfrToGsis.get(id) ?? null;
  return crosswalk.espnToGsis.get(id) ?? null;
}

/**
 * Prefer an already-GSIS id; otherwise try PFR then ESPN columns on the same row.
 * Never fabricates — returns "" when nothing resolves.
 */
export function resolveGsisFromRow(
  crosswalk: IdCrosswalk | null,
  row: CrosswalkRow,
): string {
  const direct =
    cell(row, "gsis_id") || cell(row, "player_id") || cell(row, "player_gsis_id");
  if (direct.startsWith("00-")) return direct;
  if (direct) return direct;

  if (!crosswalk) return "";

  const pfr = cell(row, "pfr_player_id") || cell(row, "pfr_id");
  const fromPfr = resolveGsisId(crosswalk, "pfr", pfr);
  if (fromPfr) return fromPfr;

  const espn = cell(row, "espn_id");
  const fromEspn = resolveGsisId(crosswalk, "espn", espn);
  return fromEspn ?? "";
}
