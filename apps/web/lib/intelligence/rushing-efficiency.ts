/**
 * Rushing efficiency — reading the backfield the way it actually predicts.
 *
 * RB value is a different equation than WR value: volume is king (carries are
 * sticky and coach-driven), while per-carry efficiency is noisy and regresses.
 * So we read two Next Gen signals against each other:
 *   • rush yards over expected / attempt (RYOE) — efficiency vs a tracking model.
 *   • rush attempts — the volume the role actually delivers.
 * …with the % of carries into a STACKED BOX (8+ defenders) as context: positive
 * RYOE earned against loaded fronts is real; efficiency on light boxes is the
 * kind that regresses.
 *
 * The read (how we USE it, and how we differ): efficient-on-light-volume is a
 * BUY-LOW if the role can grow; high-volume-low-efficiency is a VOLUME-DEPENDENT
 * floor play, not a fade (the touches keep it alive). We surface the split; we
 * don't collapse it into one number. Real nflverse Next Gen data; not a pick.
 */

import { loadNflverseNextGenStats, type NgsRushingLine } from "@/lib/nflverse/next-gen-stats";
import { percentileRanks } from "./qb-consensus";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type RushingRead = "bell-cow" | "buy-low" | "volume-dependent" | "limited";

export interface RushingEfficiencyRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly attempts: number;
  readonly ryoePerAtt: number; // rush yards over expected per attempt
  readonly efficiency: number; // NGS efficiency
  readonly pctStackedBox: number; // % carries vs 8+ in the box
  readonly ryoePct: number; // efficiency percentile in the pool
  readonly volPct: number; // volume percentile in the pool
  readonly read: RushingRead;
  readonly note: string;
}

export interface RushingEfficiency {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly rows: readonly RushingEfficiencyRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly error: string | null;
}

const TOP_N = 40;
const HIGH = 60; // percentile threshold
const STACKED_BOX_HIGH = 20; // % carries vs a loaded front that counts as "earning it"

function round(value: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

function readFor(ryoePct: number, volPct: number, ryoePerAtt: number, pctStackedBox: number): { read: RushingRead; note: string } {
  const earned = pctStackedBox >= STACKED_BOX_HIGH && ryoePerAtt > 0
    ? " He's earning it against loaded boxes — that efficiency is real, not schemed."
    : ryoePerAtt > 0 && pctStackedBox < STACKED_BOX_HIGH
      ? " Light boxes are helping the efficiency — expect some regression."
      : "";

  if (ryoePct >= HIGH && volPct >= HIGH) {
    return { read: "bell-cow", note: `Elite on both — efficient AND heavily used. The safest backfield asset.${earned}` };
  }
  if (ryoePct >= HIGH && volPct < HIGH) {
    return { read: "buy-low", note: `Efficient on limited work — the breakout is a bigger role, not better play. Buy-low if the touches come.${earned}` };
  }
  if (volPct >= HIGH && ryoePct < HIGH) {
    return { read: "volume-dependent", note: "Carried by volume, not efficiency — a floor play that lives on touches; ceiling needs a script or a long score." };
  }
  return { read: "limited", note: "Neither volume nor efficiency stands out yet — bench/deep-league profile until the role changes." };
}

/** Build rushing-efficiency rows from Next Gen rushing lines. Pure. */
export function buildRushingEfficiency(rushing: readonly NgsRushingLine[]): RushingEfficiencyRow[] {
  if (rushing.length === 0) return [];
  const ryoePcts = percentileRanks(rushing.map((r) => r.ryoePerAtt));
  const volPcts = percentileRanks(rushing.map((r) => r.rushAttempts));

  const rows = rushing.map((r, i): RushingEfficiencyRow => {
    const ryoePct = ryoePcts[i] ?? 0;
    const volPct = volPcts[i] ?? 0;
    const { read, note } = readFor(ryoePct, volPct, r.ryoePerAtt, r.pctStackedBox);
    return {
      playerId: r.playerId,
      name: r.playerName,
      team: r.team,
      attempts: r.rushAttempts,
      ryoePerAtt: round(r.ryoePerAtt),
      efficiency: round(r.efficiency),
      pctStackedBox: round(r.pctStackedBox, 1),
      ryoePct,
      volPct,
      read,
      note,
    };
  });

  // Lead with the workload that matters, then efficiency.
  rows.sort((a, b) => b.attempts - a.attempts || b.ryoePerAtt - a.ryoePerAtt);
  return rows.slice(0, TOP_N);
}

export async function loadRushingEfficiency({
  timeoutMs = 15000,
  fetcher = fetch,
}: { timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<RushingEfficiency> {
  const ngs = await loadNflverseNextGenStats({ timeoutMs, fetcher });
  if (ngs.status === "source-error") {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "Next Gen rushing data could not load. The board shows an empty state instead of fabricated efficiency.",
      error: ngs.error,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: ngs.season,
    sourceRows: ngs.rushing.length,
    rows: buildRushingEfficiency(ngs.rushing),
    canPublishProjections: false,
    note: "Real Next Gen rushing: yards over expected per carry vs. volume, with stacked-box context. We read volume as the floor and efficiency as the (regression-prone) ceiling. Context, not a pick.",
    error: null,
  };
}
