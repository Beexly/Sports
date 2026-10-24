/**
 * L0 USAGE — the coach's Monday question.
 *
 * "Who got the ball last week, and is that the offense we are preparing for?"
 *
 * A coach does not average the season. A coach looks at the last game and asks
 * whether the script changed. This module emits that reading as a named claim
 * the reasoning trail can render. It does not invent numbers. If the data is
 * missing, it says so.
 */

import type { FactorDetail } from "@sports/types";

export interface UsageShift {
  readonly team: string;
  readonly player: string;
  readonly role: string;
  readonly priorShare: number;
  readonly recentShare: number;
  readonly delta: number;
  readonly situation: string;
  readonly source: string;
  readonly fetchedAt: string;
}

export interface UsageInput {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly week: number;
  readonly shifts: readonly UsageShift[];
  readonly pickedSide: "HOME" | "AWAY";
}

export function usageFactors(input: UsageInput): FactorDetail[] {
  const out: FactorDetail[] = [];
  const material = 0.08;

  for (const s of input.shifts) {
    if (Math.abs(s.delta) < material) continue;
    const isHome = s.team === input.homeTeam;
    const isAway = s.team === input.awayTeam;
    if (!isHome && !isAway) continue;

    const onOurSide = (input.pickedSide === "HOME" && isHome) || (input.pickedSide === "AWAY" && isAway);
    const direction = s.delta > 0 ? "uptick" : "downtick";
    const impact = onOurSide
      ? (s.delta > 0 ? "positive" : "negative")
      : (s.delta > 0 ? "negative" : "positive");
    const weight = onOurSide ? (s.delta > 0 ? 6 : -6) : (s.delta > 0 ? -6 : 6);

    out.push({
      name: `Usage: ${s.player}`,
      impact,
      weight,
      description: `${s.player} (${s.role}, ${s.team}) ${direction} in ${s.situation}: ${s.priorShare.toFixed(2)} → ${s.recentShare.toFixed(2)} (Δ${s.delta > 0 ? "+" : ""}${s.delta.toFixed(2)}). Source: ${s.source}, fetched ${s.fetchedAt}.`,
    });
  }

  if (out.length === 0) {
    out.push({
      name: "Usage",
      impact: "neutral",
      weight: 0,
      description: `No material usage shifts (|Δ| ≥ 0.08) for ${input.homeTeam} or ${input.awayTeam} entering week ${input.week}. Source: ${input.shifts[0]?.source ?? "none"}.`,
    });
  }

  return out;
}


/** One row of nflverse snap_counts (offense_pct/defense_pct are 0-100). */
export interface SnapRow {
  readonly team: string;
  readonly week: string;
  readonly player: string;
  readonly position: string;
  readonly offensePct: number;
  readonly defensePct: number;
}

const pct = (v: number): number => Math.round(v) / 100;

/**
 * Role-change shifts from snap counts: emit when a player's share moves at least
 * 20 percentage points between windows — the audit's role-change rule. Shares are
 * fractions (0-1) to match UsageShift. Sourced per row.
 */
export function usageShiftsFromSnaps(
  rows: readonly SnapRow[],
  recentWeeks: readonly string[],
  priorWeeks: readonly string[],
  source: string,
  fetchedAt: string,
): UsageShift[] {
  const out: UsageShift[] = [];
  const byPlayer = new Map<string, SnapRow[]>();
  for (const r of rows) {
    const k = r.team + "|" + r.player;
    if (!byPlayer.has(k)) byPlayer.set(k, []);
    byPlayer.get(k)!.push(r);
  }
  for (const [, rs] of byPlayer) {
    for (const side of ["offensePct", "defensePct"] as const) {
      const avg = (w: readonly string[]) => {
        const v = rs.filter((r) => w.includes(r.week)).map((r) => pct(r[side])).filter((x) => x > 0);
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
      };
      const prior = avg(priorWeeks);
      const recent = avg(recentWeeks);
      if (prior === null) continue;
      // Prior snaps + zero recent rows is the loudest role change there is
      // (benched, injured, waived) — emit at 0, never skip.
      const recentFinal = recent ?? 0;
      const delta = Math.round((recentFinal - prior) * 100) / 100;
      if (Math.abs(delta) < 0.2) continue;
      const sample = rs[0]!;
      const role = side === "offensePct" ? sample.position + " (offense snaps)" : sample.position + " (defense snaps)";
      out.push({
        team: sample.team,
        player: sample.player,
        role,
        priorShare: prior,
        recentShare: recentFinal,
        delta,
        situation: "snap share, weeks " + priorWeeks.join("/") + " v " + recentWeeks.join("/"),
        source,
        fetchedAt,
      });
    }
  }
  return out;
}
