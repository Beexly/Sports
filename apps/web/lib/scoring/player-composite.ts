/**
 * Player composite Galaxy Index — the central single-source-of-truth score.
 *
 * Reads weekly PlayerGameStat ONCE and blends every available signal into one
 * 0–100 score with attributed drivers (so tools can say WHY and never disagree):
 *   - production: per-game PPR as a z-score vs the player's position (high conf).
 *   - workload:   touches/game — opportunity is value.
 *   - snapShare:  offense snap share — disambiguates volume on the field vs on
 *                 the stat sheet (a 15-touch game on 95% of snaps is a feature,
 *                 a 15-touch game on 60% is a role). Folded in only when snap
 *                 data exists, so the score is unchanged when it is absent.
 *   - momentum:   recent (last-4) form vs season (the movers signal).
 *   - availability: injury report + practice + concussion flag (discounted).
 *
 * The framework takes more (scheme fit, rumors, coachspeak) — each just another
 * WeightedSignal. Read-only; honest empty state until the backfill runs.
 */
import { db } from "@sports/db";
import { compositeScore, type WeightedSignal, type SignalContribution } from "@sports/prediction-engine";

export interface PlayerScoreRow {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly score: number; // 0–100 Galaxy Index
  readonly composite: number; // raw blended value (z-scale)
  readonly games: number;
  readonly seasonPpg: number;
  readonly recentPpg: number;
  readonly touchesPerGame: number;
  readonly snapShare: number | null; // avg offense snap share (0–100) when snap data exists
  readonly depthRank: number | null; // best (lowest) depth-chart rank when depth data exists
  readonly drivers: readonly SignalContribution[];
}

export interface PlayerScoresReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly generatedAt: string;
  readonly playerCount: number;
  readonly top: readonly PlayerScoreRow[];
  readonly note: string;
}

interface WeekRow {
  readonly playerId: string;
  readonly week: number;
  readonly fantasyPointsPpr: number | null;
  readonly carries: number | null;
  readonly receptions: number | null;
}
interface InjuryRow {
  readonly playerId: string | null;
  readonly week: number;
  readonly reportStatus: string | null;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
}
interface SnapRow {
  readonly playerId: string | null;
  readonly offensePct: number | null;
}
interface DepthRow {
  readonly playerId: string | null;
  readonly depthRank: number | null;
}

const RECENT_N = 4;

/** Availability signal value (<= 0; more negative = less available). */
export function availabilitySignalValue(inj: { reportStatus: string | null; practiceStatus: string | null; primaryInjury: string | null }): number {
  const report = (inj.reportStatus ?? "").toLowerCase();
  const practice = (inj.practiceStatus ?? "").toLowerCase();
  const injury = (inj.primaryInjury ?? "").toLowerCase();
  let v = 0;
  if (report.includes("out")) v -= 2;
  else if (report.includes("doubtful")) v -= 1.5;
  else if (report.includes("questionable")) v -= 0.5;
  if (practice.includes("did not") || practice === "dnp") v -= 1;
  else if (practice.includes("limited")) v -= 0.5;
  if (injury.includes("concussion")) v -= 0.5;
  return Math.max(-2.5, v);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

interface PlayerAgg {
  ppr: { week: number; v: number }[];
  carries: number;
  receptions: number;
}

/**
 * Maps an offense snap share (0–100) onto the composite's shared -1..1 scale,
 * using 50% as the neutral baseline (a below-50% offensive role is negative;
 * above-50% is positive). Clamped so outliers can't dominate a single signal.
 */
function snapShareValue(pct: number): number {
  return clamp((pct - 50) / 50, -1, 1);
}

/**
 * Maps a depth-chart rank onto the composite's shared -1..1 scale. Rank 1
 * (weekly starter) is the strongest positive; depth ranks fall off from
 * there, crossing neutral around rank 3 and bottoming out by rank 8. Clamped
 * so even a deep-bench rank can't dominate a single signal. Only emitted when
 * real depth data exists, so the score is unchanged when it is absent.
 */
function depthRoleValue(rank: number): number {
  if (rank <= 1) return 1;
  return clamp(1 - (rank - 1) / 7, -1, 1 - 6 / 7);
}

export async function loadPlayerCompositeScores(season: number, limit = 100): Promise<PlayerScoresReport> {
  const generatedAt = new Date().toISOString();

  const weekly = (await db.playerGameStat.findMany({
    where: { season },
    select: { playerId: true, week: true, fantasyPointsPpr: true, carries: true, receptions: true },
  })) as WeekRow[] | null;
  const rows = (Array.isArray(weekly) ? weekly : []).filter((r) => r.fantasyPointsPpr !== null);

  if (rows.length === 0) {
    return { status: "no-data", season, generatedAt, playerCount: 0, top: [], note: "No player stats for this season yet. Run the player-data backfill." };
  }

  const agg = new Map<string, PlayerAgg>();
  for (const r of rows) {
    const a = agg.get(r.playerId) ?? { ppr: [], carries: 0, receptions: 0 };
    a.ppr.push({ week: r.week, v: r.fantasyPointsPpr! });
    a.carries += r.carries ?? 0;
    a.receptions += r.receptions ?? 0;
    agg.set(r.playerId, a);
  }

  const players = await db.player.findMany({ select: { id: true, fullName: true, position: true, recentTeam: true } });
  const info = new Map((Array.isArray(players) ? players : []).map((p) => [p.id, p]));

  // Per-position baselines (mean/std of season PPG) for the production z-score.
  const seasonPpgBy = new Map<string, number>();
  const byPos = new Map<string, number[]>();
  for (const [playerId, a] of agg) {
    const ppg = mean(a.ppr.map((x) => x.v));
    seasonPpgBy.set(playerId, ppg);
    const pos = info.get(playerId)?.position ?? "UNK";
    const arr = byPos.get(pos) ?? [];
    arr.push(ppg);
    byPos.set(pos, arr);
  }
  const baseline = new Map<string, { mean: number; std: number }>();
  for (const [pos, vals] of byPos) {
    const m = mean(vals);
    baseline.set(pos, { mean: m, std: Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) });
  }

  const injuries = (await db.injury.findMany({
    where: { season },
    select: { playerId: true, week: true, reportStatus: true, practiceStatus: true, primaryInjury: true },
  })) as InjuryRow[] | null;
  const latestInjury = new Map<string, InjuryRow>();
  for (const inj of Array.isArray(injuries) ? injuries : []) {
    if (inj.playerId === null) continue;
    const prev = latestInjury.get(inj.playerId);
    if (!prev || inj.week > prev.week) latestInjury.set(inj.playerId, inj);
  }

  // Snap counts: peak offense snap share per player for this season.
  // offensePct is the player's share of the team's offensive snaps (0–100). Joined
  // on playerId (the resolved gsis link); rows without a resolved playerId are
  // skipped so we never attribute another player's snap share by name guesswork.
  // Takes the peak (max) share, treating a single high-snap week as the player's
  // established role ceiling — bounded by the signal weight below, not unbounded.
  const snaps = (await db.snapCount.findMany({
    where: { season },
    select: { playerId: true, offensePct: true },
  })) as SnapRow[] | null;
  const snapShareByPlayer = new Map<string, number>();
  for (const s of Array.isArray(snaps) ? snaps : []) {
    if (!s.playerId || s.offensePct == null) continue;
    const prev = snapShareByPlayer.get(s.playerId);
    if (prev === undefined || s.offensePct > prev) snapShareByPlayer.set(s.playerId, s.offensePct);
  }

  // Depth chart: best (lowest) depth rank per resolved player for this season.
  // depthRank 1 = starter; deeper ranks are a softer role. Joined on playerId;
  // rows without a resolved playerId are skipped so we never name-guess a
  // player's role. Only the best (shallowest) rank is kept — established role,
  // not a one-week demotion — bounded by the signal weight below.
  const depths = (await db.depthChartEntry.findMany({
    where: { season },
    select: { playerId: true, depthRank: true },
  })) as DepthRow[] | null;
  const depthRankByPlayer = new Map<string, number>();
  for (const d of Array.isArray(depths) ? depths : []) {
    if (!d.playerId || d.depthRank == null) continue;
    const prev = depthRankByPlayer.get(d.playerId);
    if (prev === undefined || d.depthRank < prev) depthRankByPlayer.set(d.playerId, d.depthRank);
  }

  const result: PlayerScoreRow[] = [];
  for (const [playerId, a] of agg) {
    const meta = info.get(playerId);
    const pos = meta?.position ?? "UNK";
    const base = baseline.get(pos)!;
    const games = a.ppr.length;
    const seasonPpg = seasonPpgBy.get(playerId)!;
    const sorted = [...a.ppr].sort((x, y) => x.week - y.week);
    const recentPpg = mean(sorted.slice(-RECENT_N).map((x) => x.v));
    const touchesPerGame = (a.carries + a.receptions) / Math.max(1, games);
    const snapShare = snapShareByPlayer.get(playerId) ?? null;
    const depthRank = (depthRankByPlayer.get(playerId) ?? null) as number | null;

    const signals: WeightedSignal[] = [
      { key: "production", value: base.std > 0 ? (seasonPpg - base.mean) / base.std : 0, weight: 3, confidence: 1 },
      { key: "workload", value: clamp((touchesPerGame - 10) / 8, -1, 1.5), weight: 1.5, confidence: 1 },
    ];
    // Snap share is additive: only emitted when real snap data exists, so the
    // score is byte-identical to before when snap data is absent.
    if (snapShare !== null) {
      signals.push({ key: "snapShare", value: snapShareValue(snapShare), weight: 1, confidence: 0.8 });
    }
    // Depth role is additive (P14-05): only emitted when real depth-chart data
    // exists, so the score is unchanged when it is absent. No existing weight
    // is reduced — scores are untouched where depth data is missing.
    if (depthRank !== null) {
      signals.push({ key: "depthRole", value: depthRoleValue(depthRank), weight: 0.75, confidence: 0.7 });
    }
    if (games >= RECENT_N + 1) {
      signals.push({ key: "momentum", value: clamp((recentPpg - seasonPpg) / 5, -1.5, 1.5), weight: 1.5, confidence: 0.9 });
    }
    const inj = latestInjury.get(playerId);
    if (inj) signals.push({ key: "availability", value: availabilitySignalValue(inj), weight: 2, confidence: 0.9 });

    const blended = compositeScore(signals);
    result.push({
      playerId,
      name: meta?.fullName ?? playerId,
      position: meta?.position ?? null,
      team: meta?.recentTeam ?? null,
      score: clamp(round2(50 + 15 * blended.score), 0, 100),
      composite: blended.score,
      games,
      seasonPpg: round2(seasonPpg),
      recentPpg: round2(recentPpg),
      touchesPerGame: round2(touchesPerGame),
      snapShare: snapShare !== null ? round2(snapShare) : null,
      depthRank: depthRank !== null ? depthRank : null,
      drivers: blended.contributions,
    });
  }
  result.sort((p, q) => q.score - p.score);

  return {
    status: "ok",
    season,
    generatedAt,
    playerCount: result.length,
    top: result.slice(0, limit),
    note: "Galaxy Index: production (z vs position) + workload + snap share + momentum + availability, blended via the composite matrix. Single source of truth for all player tools.",
  };
}
