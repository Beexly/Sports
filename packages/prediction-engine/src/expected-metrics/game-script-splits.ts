import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { mapNflversePbpToExpectedMetrics, attachOwnEpa, type PbpRow } from "./nflverse-pbp-mapper.js";
import { buildDrives, type DrivePlay, type Drive } from "./drives.js";

export const GAME_SCRIPT_SPLITS_MODEL_VERSION = "gse-game-script-splits-v1";
export const GAME_SCRIPT_SPLITS_FEATURE_KEYS = ["teamId", "half"] as const;

export interface TeamHalfSplits {
    readonly teamId: string;
    readonly season: number;
    readonly windowStartWeek: number;
    readonly windowEndWeek: number;

    readonly epaPerPlay1H: number | null;
    readonly epaPerPlay2H: number | null;
    readonly pointsPerDrive1H: number | null;
    readonly pointsPerDrive2H: number | null;

    readonly epaDifferentialOffense: number | null;
    readonly epaDifferentialDefense: number | null; // Note: "what the team allowed"

    readonly plays1H: number;
    readonly plays2H: number;
    readonly drives1H: number;
    readonly drives2H: number;

    readonly provenance: ExpectedMetricProvenance;
}

function num(value: string | undefined): number {
  if (value === undefined || value === "") return NaN;
  return Number(value);
}

/** 1H = quarters 1-2, 2H = quarters 3-4 plus OT. Null for qtr 0 or null. */
function getHalf(qtr: string | undefined): 1 | 2 | null {
    const q = num(qtr);
    if (!Number.isFinite(q) || q === 0) return null;
    if (q === 1 || q === 2) return 1;
    return 2;
}

const SHRINK_PLAYS = 150; // Empirical prior weight in plays
const SHRINK_DRIVES = 25; // Empirical prior weight in drives

export function computeGameScriptSplits(
    rows: readonly PbpRow[],
    fixtureSeason: number,
    fixtureWeek: number,
    minPlays: number = 60
): TeamHalfSplits[] {
    const cutoffId = fixtureSeason * 100 + fixtureWeek;

    const validRows: PbpRow[] = [];
    let windowStartWeek = Infinity;
    let windowEndWeek = -Infinity;

    for (const r of rows) {
        const season = num(r["season"]);
        const week = num(r["week"]);
        if (!Number.isFinite(season) || !Number.isFinite(week)) continue;

        const rowId = season * 100 + week;
        if (rowId < cutoffId) {
            validRows.push(r);
            if (week < windowStartWeek) windowStartWeek = week;
            if (week > windowEndWeek) windowEndWeek = week;
        }
    }

    if (validRows.length === 0) return [];

    const mapped = mapNflversePbpToExpectedMetrics(validRows);

    const playIdToRow = new Map<string, PbpRow>();
    for (const r of validRows) {
        const gameId = r["game_id"] ?? "";
        const playId = r["play_id"] ?? "";
        playIdToRow.set(`${gameId}-${playId}`, r);
    }

    const epaByPlayId = new Map<string, number>();
    for (const p of mapped.drivePlays) {
        const r = playIdToRow.get(p.playId);
        if (r) {
            const epa = num(r["epa"]);
            if (Number.isFinite(epa)) {
                epaByPlayId.set(p.playId, epa);
            }
        }
    }
    const drivePlaysWithEpa = attachOwnEpa(mapped.drivePlays, epaByPlayId);

    // Compose drives
    const drives = buildDrives(drivePlaysWithEpa);

    // Aggregate by team
    const teamState = new Map<string, {
        offPlays1H: number, offEpa1H: number,
        offPlays2H: number, offEpa2H: number,
        offDrives1H: number, offPoints1H: number,
        offDrives2H: number, offPoints2H: number,
        defPlays1H: number, defEpa1H: number,
        defPlays2H: number, defEpa2H: number,
    }>();

    const getTeam = (teamId: string) => {
        if (!teamState.has(teamId)) {
            teamState.set(teamId, {
                offPlays1H: 0, offEpa1H: 0, offPlays2H: 0, offEpa2H: 0,
                offDrives1H: 0, offPoints1H: 0, offDrives2H: 0, offPoints2H: 0,
                defPlays1H: 0, defEpa1H: 0, defPlays2H: 0, defEpa2H: 0,
            });
        }
        return teamState.get(teamId)!;
    };

    let totalPlays1H = 0, totalEpa1H = 0;
    let totalPlays2H = 0, totalEpa2H = 0;

    // 1. Accumulate EPA per play for offenses and defenses
    for (const p of drivePlaysWithEpa) {
        if (p.isSuccess === null) continue;

        const r = playIdToRow.get(p.playId);
        if (!r) continue;

        const half = getHalf(r["qtr"]);
        if (half === null) continue;

        const epa = p.epa ?? 0;
        const offTeam = p.posteam;
        const defTeam = r["defteam"] ?? "";

        if (offTeam) {
            const state = getTeam(offTeam);
            if (half === 1) { state.offPlays1H++; state.offEpa1H += epa; totalPlays1H++; totalEpa1H += epa; }
            else { state.offPlays2H++; state.offEpa2H += epa; totalPlays2H++; totalEpa2H += epa; }
        }

        if (defTeam) {
            const state = getTeam(defTeam);
            if (half === 1) { state.defPlays1H++; state.defEpa1H += epa; }
            else { state.defPlays2H++; state.defEpa2H += epa; }
        }
    }

    let totalDrives1H = 0, totalPoints1H = 0;
    let totalDrives2H = 0, totalPoints2H = 0;

    // 2. Accumulate points per drive per half
    for (const d of drives) {
        if (d.playIds.length === 0) continue;
        const firstPlayId = d.playIds[0];
        const r = playIdToRow.get(firstPlayId!);
        if (!r) continue;

        const half = getHalf(r["qtr"]);
        if (half === null) continue;

        const offTeam = d.posteam;
        if (offTeam) {
            const state = getTeam(offTeam);
            if (half === 1) { state.offDrives1H++; state.offPoints1H += d.points; totalDrives1H++; totalPoints1H += d.points; }
            else { state.offDrives2H++; state.offPoints2H += d.points; totalDrives2H++; totalPoints2H += d.points; }
        }
    }

    const leagueEpaPerPlay1H = totalPlays1H > 0 ? totalEpa1H / totalPlays1H : 0;
    const leagueEpaPerPlay2H = totalPlays2H > 0 ? totalEpa2H / totalPlays2H : 0;
    const leaguePointsPerDrive1H = totalDrives1H > 0 ? totalPoints1H / totalDrives1H : 0;
    const leaguePointsPerDrive2H = totalDrives2H > 0 ? totalPoints2H / totalDrives2H : 0;

    const provenance: ExpectedMetricProvenance = {
        modelVersion: GAME_SCRIPT_SPLITS_MODEL_VERSION,
        method: "deterministic-rule",
        featureKeys: [...GAME_SCRIPT_SPLITS_FEATURE_KEYS],
        featureSchemaHash: computeFeatureSchemaHash(GAME_SCRIPT_SPLITS_FEATURE_KEYS),
        sampleSize: validRows.length,
    };

    const results: TeamHalfSplits[] = [];

    for (const [teamId, state] of teamState.entries()) {
        const hasSample = state.offPlays1H >= minPlays && state.offPlays2H >= minPlays;

        let epaPerPlay1H: number | null = null;
        let epaPerPlay2H: number | null = null;
        let pointsPerDrive1H: number | null = null;
        let pointsPerDrive2H: number | null = null;
        let epaDifferentialOffense: number | null = null;
        let epaDifferentialDefense: number | null = null;

        if (hasSample) {
            epaPerPlay1H = (state.offEpa1H + leagueEpaPerPlay1H * SHRINK_PLAYS) / (state.offPlays1H + SHRINK_PLAYS);
            epaPerPlay2H = (state.offEpa2H + leagueEpaPerPlay2H * SHRINK_PLAYS) / (state.offPlays2H + SHRINK_PLAYS);

            pointsPerDrive1H = (state.offPoints1H + leaguePointsPerDrive1H * SHRINK_DRIVES) / (state.offDrives1H + SHRINK_DRIVES);
            pointsPerDrive2H = (state.offPoints2H + leaguePointsPerDrive2H * SHRINK_DRIVES) / (state.offDrives2H + SHRINK_DRIVES);

            epaDifferentialOffense = epaPerPlay2H - epaPerPlay1H;

            // For defense, we shrink toward league average as well.
            // A defense allowing points is exactly the offense scoring points, so league averages are the same.
            const defEpaPerPlay1H = (state.defEpa1H + leagueEpaPerPlay1H * SHRINK_PLAYS) / (state.defPlays1H + SHRINK_PLAYS);
            const defEpaPerPlay2H = (state.defEpa2H + leagueEpaPerPlay2H * SHRINK_PLAYS) / (state.defPlays2H + SHRINK_PLAYS);
            epaDifferentialDefense = defEpaPerPlay2H - defEpaPerPlay1H;
        }

        results.push({
            teamId,
            season: fixtureSeason,
            windowStartWeek,
            windowEndWeek,
            epaPerPlay1H,
            epaPerPlay2H,
            pointsPerDrive1H,
            pointsPerDrive2H,
            epaDifferentialOffense,
            epaDifferentialDefense,
            plays1H: state.offPlays1H,
            plays2H: state.offPlays2H,
            drives1H: state.offDrives1H,
            drives2H: state.offDrives2H,
            provenance,
        });
    }

    results.sort((a, b) => a.teamId.localeCompare(b.teamId));

    return results;
}
