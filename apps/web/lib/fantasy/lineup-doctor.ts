/**
 * Stage-0-Verified DraftKings Lineup Doctor (`Classic $50K 2-TE` & `Showdown CPT`).
 *
 * Audits a submitted lineup in <50ms against active `stage0_truth_s*_w*.json`
 * exclusions, confirmed QB1 starters, $50,000 salary cap, roster slot geometry
 * (including legal 2-TE Classic Flex + latest-kickoff FLEX placement), and computes
 * an optimal salary-legal repair while redacting paid repairs for FREE viewers.
 */

import fs from "node:fs";
import path from "node:path";
import { STAGE0_VERIFIED_DFS_CORE_POOL } from "@/lib/engine/engine-live-bridge";
import { DFS_SLATE, SALARY_CAP, type DfsPos } from "@/lib/fantasy/dfs-slate";

export type ContestFormat = "classic" | "showdown";

export interface Stage0ExcludedEntry {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly reason: string;
}

export interface Stage0TruthSnapshot {
  readonly season: number;
  readonly week: number;
  readonly confirmedQb1: Readonly<Record<string, string>>;
  readonly excludedPlayers: readonly Stage0ExcludedEntry[];
  readonly kickoffByTeam: Readonly<Record<string, string>>;
}

export interface LineupDoctorPoolPlayer {
  readonly id: string;
  readonly name: string;
  readonly pos: DfsPos;
  readonly team: string;
  readonly opp: string;
  readonly salary: number;
  readonly projectedPoints: number;
  readonly kickoffUtc: string;
}

export interface LineupDoctorSubmittedPlayer {
  readonly name: string;
  readonly slot?: string;
  readonly salary?: number;
}

export interface LineupDoctorInput {
  readonly contestType: ContestFormat;
  readonly players: readonly (string | LineupDoctorSubmittedPlayer)[];
}

export interface LineupDoctorSlotResult {
  readonly assignedSlot: string;
  readonly inputName: string;
  readonly resolvedName: string;
  readonly pos: DfsPos | "UNKNOWN";
  readonly team: string;
  readonly salary: number;
  readonly projectedPoints: number;
  readonly kickoffUtc: string;
  readonly status: "OK" | "EXCLUDED" | "BACKUP_QB" | "UNRESOLVED";
  readonly warning: string | null;
}

export interface LineupDoctorRepairMove {
  readonly slot: string;
  readonly dropName: string;
  readonly dropSalary: number;
  readonly addName: string;
  readonly addPos: DfsPos;
  readonly addTeam: string;
  readonly addSalary: number;
  readonly projectedGain: number;
}

export interface LineupDoctorReport {
  readonly ok: boolean;
  readonly contestType: ContestFormat;
  readonly season: number;
  readonly week: number;
  readonly totalSalary: number;
  readonly salaryCap: number;
  readonly remainingSalary: number;
  readonly teamCount: number;
  readonly lateSwapOptimal: boolean;
  readonly recommendedFlexPlayer: string | null;
  readonly issues: readonly string[];
  readonly slots: readonly LineupDoctorSlotResult[];
  readonly projectedPoints: number | null;
  readonly suggestedSwaps: readonly LineupDoctorRepairMove[] | null;
  readonly repairedLineup: readonly LineupDoctorSlotResult[] | null;
  readonly requiresUpgradeForRepairs: boolean;
}

const NAME_ALIASES: Readonly<Record<string, string>> = {
  cmc: "christian mccaffrey",
  lamb: "ceedee lamb",
  ceedee: "ceedee lamb",
  chase: "jamarr chase",
  "jamar chase": "jamarr chase",
  jsn: "jaxon smithnjigba",
  aj: "aj brown",
  stroud: "cj stroud",
  jeanty: "ashton jeanty",
  cook: "james cook iii",
  "james cook": "james cook iii",
  schultz: "dalton schultz",
  vikings: "vikings dst",
  jets: "jets dst",
  falcons: "falcons dst",
  steelers: "steelers dst",
  rams: "rams dst",
  broncos: "broncos dst",
  titans: "titans dst",
  chargers: "chargers dst",
};

export function normalizePlayerKey(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:cpt|captain|flex|dst|d\/st)\b/g, (m) => (m === "dst" || m === "d/st" ? "dst" : " "))
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return NAME_ALIASES[cleaned] ?? cleaned;
}

function parseSeasonWeekSortKey(filename: string): number {
  const m = /s(\d{4})_w(\d{1,2})/.exec(filename);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number(m[2]);
}

function resolveRepoPath(rel: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), rel),
    path.resolve(process.cwd(), "../..", rel),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

function parseSalaryString(raw: string): number {
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? Math.round(num) : 0;
}

/**
 * Loads the latest Stage-0 truth file (`data/nflverse/stage0_truth_s*_w*.json`)
 * and merges verified active pool rows with `DFS_SLATE` without ever inventing
 * fake injuries or overriding explicit exclusions.
 */
export function loadActiveStage0AndDfsPool(): {
  readonly stage0: Stage0TruthSnapshot;
  readonly pool: readonly LineupDoctorPoolPlayer[];
} {
  let season = 2026;
  let week = 10;
  let confirmedQb1: Record<string, string> = {};
  const excludedPlayers: Stage0ExcludedEntry[] = [];
  const kickoffByTeam: Record<string, string> = {};

  try {
    const dir = resolveRepoPath("data/nflverse");
    if (dir) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => /^stage0_truth_s\d{4}_w\d{1,2}\.json$/.test(f))
        .sort((a, b) => parseSeasonWeekSortKey(b) - parseSeasonWeekSortKey(a));
      const targetFile = files[0];
      if (targetFile) {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, targetFile), "utf8")) as Record<string, unknown>;
        if (typeof raw["season"] === "number") season = raw["season"];
        if (typeof raw["week"] === "number") week = raw["week"];
        const qbMap = raw["confirmed_qb1"];
        if (qbMap && typeof qbMap === "object") {
          confirmedQb1 = { ...(qbMap as Record<string, string>) };
        }
        const exList = raw["excluded_players"];
        if (Array.isArray(exList)) {
          for (const item of exList) {
            if (typeof item === "string") {
              excludedPlayers.push({ name: item, team: "", position: "UNKNOWN", reason: "Stage-0 OUT/IR" });
            } else if (item && typeof item === "object") {
              const rec = item as Record<string, unknown>;
              if (typeof rec["name"] === "string") {
                excludedPlayers.push({
                  name: rec["name"],
                  team: typeof rec["team"] === "string" ? rec["team"] : "",
                  position: typeof rec["position"] === "string" ? rec["position"] : "UNKNOWN",
                  reason: typeof rec["reason"] === "string" ? rec["reason"] : "Stage-0 excluded",
                });
              }
            }
          }
        }
        const events = raw["events"];
        if (Array.isArray(events)) {
          for (const ev of events) {
            if (!ev || typeof ev !== "object") continue;
            const rec = ev as Record<string, unknown>;
            const kickoff = typeof rec["kickoff_utc"] === "string" ? rec["kickoff_utc"] : "";
            const teams = Array.isArray(rec["teams"]) ? rec["teams"] : [];
            for (const tm of teams) {
              if (typeof tm === "string" && kickoff) {
                kickoffByTeam[tm.toUpperCase()] = kickoff;
              }
            }
          }
        }
      }
    }
  } catch {
    // Safe fallback to empty Stage-0 overlay when filesystem is restricted.
  }

  const byKey = new Map<string, LineupDoctorPoolPlayer>();

  for (const row of STAGE0_VERIFIED_DFS_CORE_POOL) {
    const pos = (["QB", "RB", "WR", "TE", "DST"].includes(row.pos) ? row.pos : "WR") as DfsPos;
    const teamMatch = /\bWeek \d+ ([A-Z]{2,3})\b/.exec(row.why);
    const team = teamMatch?.[1] ?? "NFL";
    const key = normalizePlayerKey(row.player);
    byKey.set(key, {
      id: `core_${key.replace(/\s+/g, "_")}`,
      name: row.player,
      pos,
      team,
      opp: "",
      salary: parseSalaryString(row.sal),
      projectedPoints: Number(row.proj) || 0,
      kickoffUtc: kickoffByTeam[team] ?? "2026-11-15T18:00:00Z",
    });
  }

  for (const p of DFS_SLATE) {
    const key = normalizePlayerKey(p.name);
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: p.id,
        name: p.name,
        pos: p.pos,
        team: p.team,
        opp: p.opp,
        salary: p.salary,
        projectedPoints: p.proj,
        kickoffUtc: kickoffByTeam[p.team] ?? "2026-11-15T18:00:00Z",
      });
    }
  }

  return {
    stage0: { season, week, confirmedQb1, excludedPlayers, kickoffByTeam },
    pool: Array.from(byKey.values()),
  };
}

function findBestPoolMatch(rawName: string, poolByKey: Map<string, LineupDoctorPoolPlayer>): LineupDoctorPoolPlayer | null {
  const key = normalizePlayerKey(rawName);
  if (!key) return null;
  const exact = poolByKey.get(key);
  if (exact) return exact;
  for (const [k, player] of poolByKey.entries()) {
    if (k.includes(key) || (key.length >= 5 && key.includes(k))) {
      return player;
    }
  }
  return null;
}

/**
 * Pure, sub-50ms Stage-0 lineup audit + single-swap salary-legal repair engine.
 */
export function auditAndRepairDfsLineup(
  input: LineupDoctorInput,
  stage0: Stage0TruthSnapshot,
  pool: readonly LineupDoctorPoolPlayer[],
): LineupDoctorReport {
  const expectedCount = input.contestType === "showdown" ? 6 : 9;
  const issues: string[] = [];

  if (input.players.length !== expectedCount) {
    issues.push(
      `Expected ${expectedCount} players for ${input.contestType} mode, received ${input.players.length}.`,
    );
  }

  const excludedMap = new Map<string, Stage0ExcludedEntry>();
  for (const entry of stage0.excludedPlayers) {
    excludedMap.set(normalizePlayerKey(entry.name), entry);
  }

  const poolByKey = new Map<string, LineupDoctorPoolPlayer>();
  for (const player of pool) {
    poolByKey.set(normalizePlayerKey(player.name), player);
  }

  const seenKeys = new Set<string>();
  const resolvedSlots: LineupDoctorSlotResult[] = [];
  const teamsSeen = new Set<string>();

  for (let i = 0; i < input.players.length; i++) {
    const rawItem = input.players[i]!;
    const rawName = typeof rawItem === "string" ? rawItem : rawItem.name;
    const explicitSlot = typeof rawItem === "string" ? undefined : rawItem.slot?.toUpperCase();
    const explicitSalary = typeof rawItem === "string" ? undefined : rawItem.salary;

    const normKey = normalizePlayerKey(rawName);
    if (!normKey) {
      issues.push(`Slot ${i + 1} is empty.`);
      continue;
    }
    if (seenKeys.has(normKey)) {
      issues.push(`Duplicate player in lineup: ${rawName}.`);
    }
    seenKeys.add(normKey);

    const matched = findBestPoolMatch(rawName, poolByKey);
    const resolvedName = matched?.name ?? rawName.trim();
    const team = matched?.team ?? "";
    const pos: DfsPos | "UNKNOWN" = matched?.pos ?? "UNKNOWN";
    const baseSalary = explicitSalary ?? matched?.salary ?? 0;
    const isCaptain = input.contestType === "showdown" && (explicitSlot === "CPT" || (explicitSlot === undefined && i === 0));
    const effectiveSalary = isCaptain ? Math.round(baseSalary * 1.5) : baseSalary;
    const effectiveProj = isCaptain ? Number(((matched?.projectedPoints ?? 0) * 1.5).toFixed(2)) : matched?.projectedPoints ?? 0;
    const kickoffUtc = matched?.kickoffUtc ?? stage0.kickoffByTeam[team] ?? "2026-11-15T18:00:00Z";

    if (team && team !== "NFL") {
      teamsSeen.add(team);
    }

    let status: LineupDoctorSlotResult["status"] = matched ? "OK" : "UNRESOLVED";
    let warning: string | null = matched ? null : `Player '${rawName.trim()}' was not found on the active pool.`;

    const excluded = excludedMap.get(normalizePlayerKey(resolvedName)) ?? excludedMap.get(normKey);
    if (excluded) {
      status = "EXCLUDED";
      warning = `${resolvedName} is Stage-0 excluded (${excluded.reason}).`;
      issues.push(warning);
    } else if (pos === "QB" && team && stage0.confirmedQb1[team]) {
      const expectedQb = stage0.confirmedQb1[team]!;
      if (normalizePlayerKey(expectedQb) !== normalizePlayerKey(resolvedName)) {
        status = "BACKUP_QB";
        warning = `${resolvedName} is not confirmed ${team} QB1 (starter is ${expectedQb}).`;
        issues.push(warning);
      }
    }

    if (status === "UNRESOLVED" && warning) {
      issues.push(warning);
    }

    resolvedSlots.push({
      assignedSlot: explicitSlot ?? (input.contestType === "showdown" ? (i === 0 ? "CPT" : "FLEX") : pos),
      inputName: rawName.trim(),
      resolvedName,
      pos,
      team,
      salary: effectiveSalary,
      projectedPoints: effectiveProj,
      kickoffUtc,
      status,
      warning,
    });
  }

  let recommendedFlexPlayer: string | null = null;
  let lateSwapOptimal = true;

  if (input.contestType === "classic" && resolvedSlots.length > 0) {
    const qbCount = resolvedSlots.filter((s) => s.pos === "QB").length;
    const rbCount = resolvedSlots.filter((s) => s.pos === "RB").length;
    const wrCount = resolvedSlots.filter((s) => s.pos === "WR").length;
    const teCount = resolvedSlots.filter((s) => s.pos === "TE").length;
    const dstCount = resolvedSlots.filter((s) => s.pos === "DST").length;

    const unknownCount = resolvedSlots.filter((s) => s.pos === "UNKNOWN").length;
    if (unknownCount === 0) {
      const validClassicShape =
        qbCount === 1 &&
        dstCount === 1 &&
        rbCount >= 2 &&
        rbCount <= 3 &&
        wrCount >= 3 &&
        wrCount <= 4 &&
        teCount >= 1 &&
        teCount <= 2 &&
        rbCount + wrCount + teCount === 7;
      if (!validClassicShape) {
        issues.push(
          `Classic requires 1 QB, 2-3 RB, 3-4 WR, 1-2 TE, 1 DST (received QB:${qbCount} RB:${rbCount} WR:${wrCount} TE:${teCount} DST:${dstCount}).`,
        );
      }

      // Compute late-swap FLEX recommendation (skill position above positional minimum).
      const flexCandidates = resolvedSlots.filter(
        (s) =>
          (s.pos === "RB" && rbCount > 2) ||
          (s.pos === "WR" && wrCount > 3) ||
          (s.pos === "TE" && teCount > 1),
      );
      if (flexCandidates.length > 0) {
        const latest = [...flexCandidates].sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc))[0]!;
        recommendedFlexPlayer = latest.resolvedName;
        const currentFlex = resolvedSlots.find((s) => s.assignedSlot === "FLEX");
        if (currentFlex && currentFlex.kickoffUtc < latest.kickoffUtc) {
          lateSwapOptimal = false;
        }
        // Assign normalized Classic slots while placing latest-kickoff candidate into FLEX.
        let flexAssigned = false;
        for (let idx = 0; idx < resolvedSlots.length; idx++) {
          const slot = resolvedSlots[idx]!;
          if (!flexAssigned && slot.resolvedName === latest.resolvedName) {
            resolvedSlots[idx] = { ...slot, assignedSlot: "FLEX" };
            flexAssigned = true;
          } else if (slot.pos !== "UNKNOWN") {
            resolvedSlots[idx] = { ...slot, assignedSlot: slot.pos };
          }
        }
      }
    }
  }

  const totalSalary = resolvedSlots.reduce((acc, s) => acc + s.salary, 0);
  if (totalSalary > SALARY_CAP) {
    issues.push(`Lineup salary $${totalSalary.toLocaleString()} exceeds $50,000 DraftKings cap.`);
  }

  if (resolvedSlots.length >= 2 && teamsSeen.size < 2) {
    issues.push("DraftKings lineups must include players from at least 2 NFL teams.");
  }

  // Compute salary-legal 1-swap repair suggestions for invalid slots.
  const swaps: LineupDoctorRepairMove[] = [];
  const repaired = resolvedSlots.map((s) => ({ ...s }));
  const brokenIndices = resolvedSlots
    .map((s, idx) => (s.status === "EXCLUDED" || s.status === "BACKUP_QB" ? idx : -1))
    .filter((idx) => idx >= 0);

  if (brokenIndices.length > 0) {
    const usedRepairKeys = new Set(seenKeys);
    let runningSalary = totalSalary;
    for (const idx of brokenIndices) {
      const broken = repaired[idx]!;
      const targetPos: DfsPos = broken.pos === "UNKNOWN" ? "WR" : broken.pos;
      const isCpt = broken.assignedSlot === "CPT";
      const mult = isCpt ? 1.5 : 1;
      const budgetForSlot = SALARY_CAP - (runningSalary - broken.salary);

      const candidates = pool
        .filter((cand) => {
          const k = normalizePlayerKey(cand.name);
          if (usedRepairKeys.has(k) || excludedMap.has(k)) return false;
          if (cand.pos !== targetPos) return false;
          if (cand.pos === "QB" && stage0.confirmedQb1[cand.team]) {
            if (normalizePlayerKey(stage0.confirmedQb1[cand.team]!) !== k) return false;
          }
          return Math.round(cand.salary * mult) <= budgetForSlot && cand.projectedPoints > 0;
        })
        .sort((a, b) => b.projectedPoints - a.projectedPoints);

      const best = candidates[0];
      if (best) {
        const addSal = Math.round(best.salary * mult);
        const addProj = Number((best.projectedPoints * mult).toFixed(2));
        usedRepairKeys.add(normalizePlayerKey(best.name));
        runningSalary = runningSalary - broken.salary + addSal;
        swaps.push({
          slot: broken.assignedSlot,
          dropName: broken.resolvedName,
          dropSalary: broken.salary,
          addName: best.name,
          addPos: best.pos,
          addTeam: best.team,
          addSalary: addSal,
          projectedGain: Number((addProj - broken.projectedPoints).toFixed(2)),
        });
        repaired[idx] = {
          assignedSlot: broken.assignedSlot,
          inputName: best.name,
          resolvedName: best.name,
          pos: best.pos,
          team: best.team,
          salary: addSal,
          projectedPoints: addProj,
          kickoffUtc: best.kickoffUtc,
          status: "OK",
          warning: null,
        };
      }
    }
  }

  const totalProjected = Number(
    resolvedSlots.reduce((acc, s) => acc + s.projectedPoints, 0).toFixed(2),
  );

  return {
    ok: issues.length === 0,
    contestType: input.contestType,
    season: stage0.season,
    week: stage0.week,
    totalSalary,
    salaryCap: SALARY_CAP,
    remainingSalary: SALARY_CAP - totalSalary,
    teamCount: teamsSeen.size,
    lateSwapOptimal,
    recommendedFlexPlayer,
    issues: Array.from(new Set(issues)),
    slots: resolvedSlots,
    projectedPoints: totalProjected,
    suggestedSwaps: swaps,
    repairedLineup: swaps.length > 0 ? repaired : null,
    requiresUpgradeForRepairs: false,
  };
}

/**
 * Redacts proprietary projection sums and optimal repair swaps on the server
 * for unentitled FREE viewers while preserving free Stage-0 safety diagnostics.
 */
export function redactLineupDoctorForFreeViewer(
  report: LineupDoctorReport,
  hasFullAccess: boolean,
): LineupDoctorReport {
  if (hasFullAccess) return report;
  const redactedSlots = report.slots.map((s) => ({
    ...s,
    projectedPoints: 0,
  }));
  return {
    ...report,
    slots: redactedSlots,
    projectedPoints: null,
    suggestedSwaps: null,
    repairedLineup: null,
    requiresUpgradeForRepairs: true,
  };
}
