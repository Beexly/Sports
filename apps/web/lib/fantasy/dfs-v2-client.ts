/**
 * Pure deterministic DFS v2 Tournament Portfolio client (`dfs-v2-client.ts`).
 *
 * Uses seeded `mulberry32` PRNG (never `Math.random()`) so client/server runs
 * are 100% reproducible. When `GSE_ML_SERVICE_URL` is configured, calls the
 * stateless Python sidecar at `/optimize/dfs-v2`; otherwise computes deterministic
 * stacked lineups locally with pairwise overlap diversity and uniqueness scoring.
 */

import { DFS_SLATE, DFS_SLOTS, SALARY_CAP, type DfsPlayer, type DfsPos } from "./dfs-slate";

export type DfsV2Mode = "CLASSIC" | "SHOWDOWN";

export interface DfsV2Slot {
  readonly slot: string;
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly opponent: string;
  readonly salary: number;
  readonly projectedPoints: number;
  readonly projectedOwnership: number;
}

export interface DfsV2Lineup {
  readonly lineupIndex: number;
  readonly mode: DfsV2Mode;
  readonly totalSalary: number;
  readonly totalProjectedPoints: number;
  readonly cumulativeOwnership: number;
  readonly expectedDuplicatesPer10k: number;
  readonly uniquenessScore: number;
  readonly stackSummary: string;
  readonly slots: readonly DfsV2Slot[];
}

export interface OptimizeDfsV2Input {
  readonly mode?: DfsV2Mode;
  readonly numLineups?: number;
  readonly salaryCap?: number;
  readonly byeTeams?: readonly string[];
  readonly outPlayers?: readonly string[];
  readonly maxOverlap?: number;
  readonly seed?: number;
  readonly players?: readonly DfsPlayer[];
}

export interface OptimizeDfsV2Result {
  readonly source: "ml-service" | "local-deterministic";
  readonly mode: DfsV2Mode;
  readonly eligibleCount: number;
  readonly blockedCount: number;
  readonly seed: number;
  readonly lineups: readonly DfsV2Lineup[];
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normCode(s: string): string {
  const u = s.trim().toUpperCase();
  if (u === "JAC") return "JAX";
  if (u === "WSH") return "WAS";
  if (u === "LVR") return "LV";
  if (u === "LA") return "LAR";
  return u;
}

function slotEligible(player: DfsPlayer, slot: DfsPos): boolean {
  if (slot === ("FLEX" as DfsPos)) {
    return player.pos === "RB" || player.pos === "WR" || player.pos === "TE";
  }
  return player.pos === slot;
}

function buildDeterministicLocalLineup(
  pool: readonly DfsPlayer[],
  priorLineups: readonly DfsV2Lineup[],
  maxOverlap: number,
  salaryCap: number,
  rand: () => number,
  lineupIndex: number,
): DfsV2Lineup | null {
  const minSalary = pool.reduce((m, p) => Math.min(m, p.salary), Infinity);
  const previousSets = priorLineups.map((lu) => new Set(lu.slots.map((s) => s.playerId)));

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const picked: DfsPlayer[] = [];
    const usedIds = new Set<string>();
    let failed = false;

    for (let i = 0; i < DFS_SLOTS.length; i += 1) {
      const slot = DFS_SLOTS[i]!;
      const usedSalary = picked.reduce((acc, p) => acc + p.salary, 0);
      const remainingSlots = DFS_SLOTS.length - 1 - i;
      const maxAffordable = salaryCap - usedSalary - minSalary * remainingSlots;

      const cands = pool
        .filter((p) => !usedIds.has(p.id) && slotEligible(p, slot) && p.salary <= maxAffordable)
        .sort((a, b) => {
          const scoreB = b.proj + 0.12 * (b.ceiling - b.proj) - 2.2 * b.own;
          const scoreA = a.proj + 0.12 * (a.ceiling - a.proj) - 2.2 * a.own;
          return scoreB - scoreA;
        });

      if (cands.length === 0) {
        failed = true;
        break;
      }
      const topN = Math.min(attempt < 5 && lineupIndex === 1 ? 1 : 4, cands.length);
      const choice = cands[Math.floor(rand() * topN)]!;
      picked.push(choice);
      usedIds.add(choice.id);
    }

    if (failed || picked.length !== DFS_SLOTS.length) continue;

    const totalSal = picked.reduce((acc, p) => acc + p.salary, 0);
    if (totalSal > salaryCap) continue;

    const overlapsOk = previousSets.every((prev) => {
      let overlap = 0;
      for (const p of picked) {
        if (prev.has(p.id)) overlap += 1;
      }
      return overlap <= maxOverlap;
    });
    if (!overlapsOk) continue;

    const qb = picked.find((p) => p.pos === "QB");
    const stackMates = qb
      ? picked.filter((p) => p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length
      : 0;
    const totalPts = picked.reduce((acc, p) => acc + p.proj, 0);
    const cumOwn = picked.reduce((acc, p) => acc + p.own, 0);
    const dups = Number(Math.max(0.1, Math.min(250, cumOwn * 18.5)).toFixed(2));

    return {
      lineupIndex,
      mode: "CLASSIC",
      totalSalary: totalSal,
      totalProjectedPoints: Number(totalPts.toFixed(2)),
      cumulativeOwnership: Number(cumOwn.toFixed(4)),
      expectedDuplicatesPer10k: dups,
      uniquenessScore: Math.round(Math.max(10, Math.min(99, 100 - cumOwn * 42))),
      stackSummary: qb
        ? `${qb.name} (${qb.team}) + ${stackMates} pass-${stackMates === 1 ? "catcher" : "catchers"}`
        : "Balanced core",
      slots: picked.map((p, idx) => ({
        slot: String(DFS_SLOTS[idx]),
        playerId: p.id,
        name: p.name,
        team: p.team,
        opponent: p.opp,
        salary: p.salary,
        projectedPoints: p.proj,
        projectedOwnership: p.own,
      })),
    };
  }
  return null;
}

export async function optimizeDfsV2Portfolio(
  input: OptimizeDfsV2Input = {},
): Promise<OptimizeDfsV2Result> {
  const mode: DfsV2Mode = input.mode === "SHOWDOWN" ? "SHOWDOWN" : "CLASSIC";
  const numLineups = Math.max(1, Math.min(10, Math.floor(input.numLineups ?? 3)));
  const salaryCap = Math.max(10_000, Math.floor(input.salaryCap ?? SALARY_CAP));
  const maxOverlap = Math.max(0, Math.min(8, Math.floor(input.maxOverlap ?? 6)));
  const seed = Math.floor(input.seed ?? 20261120) >>> 0;
  const rawPlayers = input.players ?? DFS_SLATE;

  const byeSet = new Set((input.byeTeams ?? []).map(normCode));
  const outSet = new Set((input.outPlayers ?? []).map((n) => n.trim().toLowerCase()));

  const eligible: DfsPlayer[] = [];
  let blockedCount = 0;
  const seenIds = new Set<string>();
  for (const p of rawPlayers) {
    const tm = normCode(p.team);
    const opp = normCode(p.opp);
    if (byeSet.has(tm) || byeSet.has(opp) || outSet.has(p.name.trim().toLowerCase()) || seenIds.has(p.id)) {
      blockedCount += 1;
      continue;
    }
    seenIds.add(p.id);
    eligible.push(p);
  }

  const serviceUrl = process.env.GSE_ML_SERVICE_URL?.trim();
  if (serviceUrl) {
    try {
      const resp = await fetch(`${serviceUrl.replace(/\/+$/, "")}/optimize/dfs-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          mode,
          num_lineups: numLineups,
          salary_cap: salaryCap,
          bye_teams: [...byeSet],
          out_player_names: [...outSet],
          max_overlap: maxOverlap,
          seed,
          players: eligible.map((p) => ({
            player_id: p.id,
            name: p.name,
            team: p.team,
            opponent: p.opp,
            positions: [p.pos],
            salary: p.salary,
            projected_points: p.proj,
            projected_ownership: p.own,
            ceiling_points: p.ceiling,
          })),
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          mode: DfsV2Mode;
          eligible_count: number;
          blocked_count: number;
          seed: number;
          lineups: Array<{
            lineup_index: number;
            mode: DfsV2Mode;
            total_salary: number;
            total_projected_points: number;
            cumulative_ownership: number;
            expected_duplicates_per_10k: number;
            slots: Array<{
              slot: string;
              player_id: string;
              name: string;
              team: string;
              opponent: string;
              salary: number;
              projected_points: number;
              projected_ownership: number;
            }>;
          }>;
        };
        return {
          source: "ml-service",
          mode: data.mode,
          eligibleCount: data.eligible_count,
          blockedCount: data.blocked_count + blockedCount,
          seed: data.seed,
          lineups: data.lineups.map((lu) => {
            const qb = lu.slots.find((s) => s.slot === "QB");
            const mates = qb
              ? lu.slots.filter((s) => s.team === qb.team && (s.slot === "WR" || s.slot === "TE" || s.slot === "FLEX")).length
              : 0;
            return {
              lineupIndex: lu.lineup_index,
              mode: lu.mode,
              totalSalary: lu.total_salary,
              totalProjectedPoints: lu.total_projected_points,
              cumulativeOwnership: lu.cumulative_ownership,
              expectedDuplicatesPer10k: lu.expected_duplicates_per_10k,
              uniquenessScore: Math.round(Math.max(10, Math.min(99, 100 - lu.cumulative_ownership * 42))),
              stackSummary: qb ? `${qb.name} (${qb.team}) + ${mates} teammates` : "Showdown pairing",
              slots: lu.slots.map((s) => ({
                slot: s.slot,
                playerId: s.player_id,
                name: s.name,
                team: s.team,
                opponent: s.opponent,
                salary: s.salary,
                projectedPoints: s.projected_points,
                projectedOwnership: s.projected_ownership,
              })),
            };
          }),
        };
      }
    } catch {
      // Sidecar unavailable; fall back cleanly to deterministic local builder
    }
  }

  const rand = mulberry32(seed);
  const lineups: DfsV2Lineup[] = [];
  for (let i = 1; i <= numLineups; i += 1) {
    const lu = buildDeterministicLocalLineup(eligible, lineups, maxOverlap, salaryCap, rand, i);
    if (!lu) break;
    lineups.push(lu);
  }

  return {
    source: "local-deterministic",
    mode: "CLASSIC",
    eligibleCount: eligible.length,
    blockedCount,
    seed,
    lineups,
  };
}
