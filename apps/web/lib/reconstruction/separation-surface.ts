/**
 * Reconstructed-separation surface — the first LIVE consumer of the
 * reconstruction engine, in its honest UNCALIBRATED regime.
 *
 * NGS publishes a receiver's weekly average separation. Raw, those weekly
 * averages are noisy (a 2-week sample is not a 15-week sample). The engine's
 * empirical-Bayes shrinkage de-noises each receiver's separation TENDENCY by
 * pulling thin samples toward the league mean, and we surface the shrunk value
 * WITH its honest interval and a RECONSTRUCTED provenance label — never a raw
 * number dressed as precise, never presented as measured tracking.
 *
 * This is the uncalibrated regime: a player's typical separation, not a
 * per-play claim (no covariate model is fitted here). The pure transform is
 * separated from the DB loader so it is fully testable.
 */

import { fitShrinkage, type GroupObservation } from "./empirical-bayes";
import { reconstructSeparation } from "./separation-reconstruct";
import { inertModel } from "./covariate-model";

export interface SeparationRow {
  readonly gsisId: string;
  readonly playerName: string;
  readonly position: string | null;
  readonly avgSeparation: number; // one player-week
}

export interface ReconstructedSeparationPlayer {
  readonly gsisId: string;
  readonly name: string;
  readonly position: string | null;
  readonly tendency: number; // shrunk separation tendency (yards)
  readonly low: number;
  readonly high: number;
  readonly weeks: number; // sample size behind this player (weeks of data)
  readonly disclosure: string; // the RECONSTRUCTED provenance line
}

export interface ReconstructedSeparationSurface {
  readonly available: boolean;
  readonly players: readonly ReconstructedSeparationPlayer[];
  /** Plain-language note shown when the surface is not yet available. */
  readonly note: string;
}

const MIN_PLAYERS = 8; // need a population to estimate the shrinkage hyperparameters
const MIN_WEEKS = 2; // a 1-week average is not a tendency

/**
 * Pure transform: weekly NGS separation rows -> per-receiver shrunk tendency
 * with an honest interval and provenance. Deterministic; no I/O.
 */
export function buildReconstructedSeparation(
  rows: readonly SeparationRow[],
): ReconstructedSeparationSurface {
  // Group weekly rows by receiver.
  const byPlayer = new Map<string, { name: string; position: string | null; vals: number[] }>();
  for (const r of rows) {
    if (!Number.isFinite(r.avgSeparation)) continue;
    const g = byPlayer.get(r.gsisId);
    if (g) g.vals.push(r.avgSeparation);
    else byPlayer.set(r.gsisId, { name: r.playerName, position: r.position, vals: [r.avgSeparation] });
  }

  // A receiver needs at least MIN_WEEKS to have a tendency worth showing.
  const eligible = [...byPlayer.entries()].filter(([, g]) => g.vals.length >= MIN_WEEKS);
  if (eligible.length < MIN_PLAYERS) {
    return {
      available: false,
      players: [],
      note:
        "Reconstructed separation opens once Next Gen Stats have accrued for enough receivers. " +
        "It is estimated from public aggregates (reconstructed, not measured tracking) and shown with its uncertainty.",
    };
  }

  // Observation per receiver: mean weekly separation, sample size = weeks.
  const observations: GroupObservation[] = eligible.map(([gsisId, g]) => ({
    key: gsisId,
    mean: g.vals.reduce((s, v) => s + v, 0) / g.vals.length,
    count: g.vals.length,
  }));
  const model = fitShrinkage(observations);

  const players: ReconstructedSeparationPlayer[] = [];
  for (const [gsisId, g] of eligible) {
    const tendency = model.estimates.get(gsisId);
    if (!tendency) continue;
    // Uncalibrated regime: inert covariate model -> the honest tendency + its
    // posterior interval, tagged RECONSTRUCTED / not-calibrated.
    const f = reconstructSeparation({ tendency, features: [], model: inertModel(0) });
    players.push({
      gsisId,
      name: g.name,
      position: g.position,
      tendency: round2(f.value),
      low: round2(f.interval[0]),
      high: round2(f.interval[1]),
      weeks: g.vals.length,
      disclosure: f.provenance.disclosure,
    });
  }

  players.sort((a, b) => b.tendency - a.tendency);
  return { available: true, players, note: "" };
}

// ── DB loader ────────────────────────────────────────────────────────────────

export interface LoadableSeparationClient {
  nextGenStat: {
    findMany: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    }) => Promise<Array<{ gsisId: string; playerName: string; position: string | null; avgSeparation: number | null }>>;
  };
}

/**
 * Load the surface from persisted NGS receiving rows (statType "receiving",
 * separation present). Empty/absent data yields the honest not-available state.
 */
export async function loadReconstructedSeparation(
  db: LoadableSeparationClient,
  opts: { season?: number } = {},
): Promise<ReconstructedSeparationSurface> {
  const where: Record<string, unknown> = { statType: "receiving", avgSeparation: { not: null } };
  if (opts.season) where["season"] = opts.season;
  const rows = await db.nextGenStat
    .findMany({ where, select: { gsisId: true, playerName: true, position: true, avgSeparation: true } })
    .catch(() => [] as Array<{ gsisId: string; playerName: string; position: string | null; avgSeparation: number | null }>);

  return buildReconstructedSeparation(
    rows
      .filter((r): r is typeof r & { avgSeparation: number } => r.avgSeparation != null)
      .map((r) => ({ gsisId: r.gsisId, playerName: r.playerName, position: r.position, avgSeparation: r.avgSeparation })),
  );
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
