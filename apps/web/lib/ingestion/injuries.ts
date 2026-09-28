/**
 * Injury-report ingestion (nflverse `injuries` → Injury).
 *
 * Weekly injury/practice report status per player. Clearance-gated and
 * rights/freshness-stamped. Idempotent per season (the season's rows are
 * replaced on each run). Carries the gsis id and RESOLVES `playerId` against the
 * Player table, plus the already-ingested depth-chart roster so injured linemen
 * and defensive backs resolve too — see the crosswalk comment below for the
 * measured reason that second source is necessary.
 *
 * NOTE: nflverse injuries are the lagged weekly *report*, not a live inactives
 * feed. They are facts as published; nothing here is a forecast.
 */
import { fetchNflverse, type NflverseDatasetKey } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type TableFetcher = (key: NflverseDatasetKey, season: number, variant?: string) => Promise<{ records: readonly CsvRow[] }>;

// Keep Postgres bound-parameter count well under its limit (same pattern and
// value as historical-games.ts and depth-charts.ts). A full-season report
// accumulates across every team and week, so batch defensively rather than
// wait for it to actually exceed the limit in production.
const CREATE_CHUNK = 2000;

export interface InjuryIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  /**
   * Player rows created for injured linemen/DBs this run, via the depth-chart
   * roster crosswalk. Reported so a zero is visible: a silent 0 means either the
   * depth chart has not been ingested yet (so §1/§2/§3 stay disabled) or the
   * Player table is already complete. Before this existed, 70% of out-rows
   * resolved to nothing and no layer could see that.
   */
  readonly playersBackfilled?: number;
  /** Rows whose gsisId resolved to a Player this run — the rules can fire. */
  readonly rowsResolved?: number;
  /** Rows still unresolvable (gsisId unknown to both sources). Honest gap. */
  readonly rowsUnresolved?: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

function int(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function ingestInjuries(
  season: number,
  options: { now?: Date; fetcher?: TableFetcher } = {},
): Promise<InjuryIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: TableFetcher = options.fetcher ?? fetchNflverse;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, blocks: gate.blocks };

  let rows: readonly CsvRow[];
  try {
    rows = (await fetchTable("injuries", season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  // Resolve playerId from the gsis-keyed Player table (players are ingested
  // first). Stub DB returns no players → playerId stays null.
  //
  // Player rows only exist for positions nflverse `player_stats_week` publishes,
  // i.e. the fantasy-scored ones. MEASURED on live Neon for 2026: of 477 distinct
  // injury gsisIds only 157 resolved — WR 81/82 and RB 57/57, but OL 8/117,
  // SEC 5/144 and DL 3/259. The positions that TRIGGER the total-signal rules
  // (§1 OL_INJURY, §2 SECONDARY_INJURY, §3 PASS_RUSH_INJURY) were precisely the
  // positions that could never resolve, which silently disabled them.
  //
  // `depth_chart_entries` is already ingested from nflverse `depth_charts`, which
  // lists every rostered player including linemen and defensive backs, and
  // carries gsisId for all of them: of the 320 unresolved injury gsisIds, 318
  // appear there (2 do not). So this second crosswalk closes the gap using a
  // source the repo already trusts, with no new credential and no new asset.
  //
  // MATCHED ON gsisId ONLY. A name join would be wrong here: 16 of the 329
  // (injury, depth-chart) name pairs for the same gsisId disagree on spelling, so
  // name is a lossy key and an ambiguous one. gsisId is the league's own
  // identifier. Ambiguous depth rows (one gsisId, several names) are SKIPPED
  // rather than guessed, because attaching an injury to the wrong human is worse
  // than leaving it unresolved and letting the rule stay silent.
  const playerRows = await db.player.findMany({ select: { id: true, gsisId: true } });
  const idByGsis = new Map((Array.isArray(playerRows) ? playerRows : []).map((p) => [p.gsisId, p.id]));

  // gsisId -> { name, team, position } from the depth chart, keeping only
  // gsisIds that are unambiguous in it.
  const depthRows = await db.depthChartEntry.findMany({
    select: { gsisId: true, playerName: true, team: true, position: true },
  });
  const rosterByGsis = new Map<
    string,
    { name: string; team: string | null; position: string | null } | null
  >();
  const depthNamesByGsis = new Map<string, Set<string>>();
  for (const d of depthRows ?? []) {
    if (!d.gsisId) continue;
    const seen = depthNamesByGsis.get(d.gsisId) ?? new Set<string>();
    seen.add(d.playerName);
    depthNamesByGsis.set(d.gsisId, seen);
  }
  for (const d of depthRows ?? []) {
    if (!d.gsisId) continue;
    const names = depthNamesByGsis.get(d.gsisId)!;
    // One gsisId, one name = trustworthy. Anything else is not resolvable here.
    const info =
      names.size === 1
        ? { name: d.playerName, team: d.team ?? null, position: d.position ?? null }
        : null;
    // Prefer a real roster row over an ambiguous marker.
    if (info !== null || !rosterByGsis.has(d.gsisId)) rosterByGsis.set(d.gsisId, info);
  }

  // Only the gsisIds THIS season's injury rows actually reference need a Player
  // row. Backfilling the whole depth chart would create ~1,700 Player rows the
  // fantasy side never asked for and has no stats for; restricting to the
  // injury population keeps the write proportional to the defect being fixed.
  const referenced = new Set<string>();
  for (const r of rows) {
    const gsisId = r["gsis_id"] ?? null;
    if (gsisId) referenced.add(gsisId);
  }
  const missingGsis = [...referenced].filter(
    (g) => rosterByGsis.get(g) != null && !idByGsis.has(g),
  );
  let playersBackfilled = 0;
  for (const gsis of missingGsis) {
    const info = rosterByGsis.get(gsis)!;
    try {
      const created = await db.player.create({
        data: { gsisId: gsis, fullName: info.name, position: info.position, recentTeam: info.team },
        select: { id: true },
      });
      if (created === null || created === undefined) continue;
      idByGsis.set(gsis, created.id);
      playersBackfilled += 1;
    } catch {
      // A concurrent backfill winning the race is fine; anything else leaves
      // this gsis unresolved, which is the pre-existing behavior, never a crash.
    }
  }

  const data = [];
  for (const r of rows) {
    const playerName = r["full_name"];
    if (!playerName) continue;
    const gsisId = r["gsis_id"] ?? null;
    data.push({
      playerId: gsisId ? idByGsis.get(gsisId) ?? null : null,
      gsisId,
      playerName,
      season: int(r["season"]) ?? season,
      week: int(r["week"]) ?? 0,
      team: r["team"] ?? null,
      position: r["position"] ?? null,
      reportStatus: r["report_status"] ?? null,
      practiceStatus: r["practice_status"] ?? null,
      primaryInjury: r["report_primary_injury"] ?? r["practice_primary_injury"] ?? null,
      sourceId: "nflverse",
      rightsSnapshot: gate.rightsSnapshot,
      fetchedAt: now,
    });
  }

  // Idempotent per season: replace the season's rows.
    // Never wipe existing rows on an empty upstream response (transient
  // outage / empty mirror): preserve what's there and report a source-error.
  if (data.length === 0) {
    return { status: "source-error", season, rowsWritten: 0, error: "upstream returned no rows; existing data preserved" };
  }
  // One atomic transaction covering the delete and every insert batch: a
  // createMany failure partway through must not leave the season's rows
  // erased with only some of the replacement written.
  const chunks: (typeof data)[] = [];
  for (let i = 0; i < data.length; i += CREATE_CHUNK) chunks.push(data.slice(i, i + CREATE_CHUNK));
  const [, ...createdChunks] = await db.$transaction([
    db.injury.deleteMany({ where: { season } }),
    ...chunks.map((c) => db.injury.createMany({ data: c })),
  ]);
  const rowsWritten = createdChunks.reduce((sum, c) => sum + c.count, 0);

  // Resolution is a property of the rows we are about to persist, so it is
  // counted here rather than assumed. A caller watching this can tell the
  // difference between "the rules can fire" and "the injury feed is mostly
  // linemen we cannot identify", which were indistinguishable before.
  const rowsResolved = data.filter((d) => d.playerId !== null).length;
  const rowsUnresolved = data.length - rowsResolved;

  return { status: "ok", season, rowsWritten, playersBackfilled, rowsResolved, rowsUnresolved };
}
