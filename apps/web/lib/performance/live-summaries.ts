import type { PickTier, PickType } from "@sports/types";
import { winRatePct } from "@/lib/format/stat";

export interface SettledPerformancePick {
  id: string;
  result: "WIN" | "LOSS" | "PUSH";
  pickType: PickType;
  tier: PickTier;
  modelVersion: string;
  settledAt: Date | null;
  game: { sport: { name: string } };
}

export interface PerformanceSummary {
  id: string;
  sport: string;
  league: string | null;
  pickType: PickType | null;
  tier: PickTier | null;
  modelVersion: string;
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  period: string;
  computedAt: Date;
}

type MutableSummary = Omit<PerformanceSummary, "winRate">;

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function groupKey(pick: SettledPerformancePick, period: string): string {
  return [period, pick.game.sport.name, pick.pickType, pick.tier, pick.modelVersion].join("|");
}

function addPick(
  groups: Map<string, MutableSummary>,
  pick: SettledPerformancePick,
  period: string
): void {
  const key = groupKey(pick, period);
  const settledAt = pick.settledAt ?? new Date(0);
  const group = groups.get(key) ?? {
    id: key,
    sport: pick.game.sport.name,
    league: null,
    pickType: pick.pickType,
    tier: pick.tier,
    modelVersion: pick.modelVersion,
    totalPicks: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    period,
    computedAt: settledAt,
  };

  group.totalPicks += 1;
  if (pick.result === "WIN") group.wins += 1;
  else if (pick.result === "LOSS") group.losses += 1;
  else group.pushes += 1;
  if (settledAt > group.computedAt) group.computedAt = settledAt;
  groups.set(key, group);
}

export function summarizePerformancePicks(
  picks: readonly SettledPerformancePick[]
): PerformanceSummary[] {
  const groups = new Map<string, MutableSummary>();

  for (const pick of picks) {
    addPick(groups, pick, "all-time");
    if (pick.settledAt) addPick(groups, pick, monthKey(pick.settledAt));
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      winRate: winRatePct(group.wins, group.losses) ?? 0,
    }))
    .sort((a, b) => {
      if (a.period !== b.period) return b.period.localeCompare(a.period);
      if (a.totalPicks !== b.totalPicks) return b.totalPicks - a.totalPicks;
      return a.id.localeCompare(b.id);
    });
}
