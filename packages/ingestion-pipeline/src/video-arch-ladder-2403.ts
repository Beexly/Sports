/**
 * Architecture-selection ladder for the video action-recognition lane
 *
 * Research port: arXiv:2403.12385
 * Normalized lane: sports_cv | Doctrine: PROPRIETARY_EDGE
 *
 * Ports the paper's architecture-selection ladder: reproduce the published ranking (ST-GCN/PoseC3D top at 10-50 shots; SlowFast/Swin top at full data), then re-run the ladder with player-disjoint splits. Registry records per-regime results; adoption needs the ranking reproduced within +/-3pp.
 *
 * ACCEPTANCE GATE: Adopt the ladder only if the reproduced ranking matches the paper's within +/-3pp; if not, treat the paper as non-reproduced. Reproduction is a lab run, not this registry.
 */

export type DataRegime = "few_shot_10" | "few_shot_50" | "full_data";

export interface ArchResult {
  architecture: string;
  regime: DataRegime;
  top1: number; // fraction 0..1
  playerDisjoint: boolean;
  runId: string;
}

export const PAPER_RANKING: Record<DataRegime, string[]> = {
  few_shot_10: ["ST-GCN", "PoseC3D"],
  few_shot_50: ["ST-GCN", "PoseC3D"],
  full_data: ["SlowFast", "Swin"],
};

const TOLERANCE_PP = 3;

/** Check one regime: paper's top architectures must be within tol of the reproduced best. */
export function regimeReproduces(
  regime: DataRegime,
  paperTop1: Record<string, number>,
  reproduced: ArchResult[],
  tolPp = TOLERANCE_PP,
): { ok: boolean; detail: string } {
  const expected = PAPER_RANKING[regime];
  const byArch = new Map(reproduced.filter((r) => r.regime === regime).map((r) => [r.architecture, r.top1]));
  const best = Math.max(...[...byArch.values()], 0);
  const gaps = expected.map((a) => {
    const t = byArch.get(a);
    return t === undefined ? Infinity : (best - t) * 100;
  });
  const worst = Math.max(...gaps);
  return {
    ok: worst <= tolPp,
    detail: `worst gap to paper top in ${regime}: ${worst === Infinity ? "missing" : worst.toFixed(2) + "pp"} (tol ${tolPp}pp)`,
  };
}

/** Full ladder verdict across all regimes. */
export function ladderVerdict(
  paperTop1: Record<DataRegime, Record<string, number>>,
  reproduced: ArchResult[],
): { adopted: boolean; regimes: Record<DataRegime, boolean> } {
  const regimes = {} as Record<DataRegime, boolean>;
  let all = true;
  for (const regime of Object.keys(PAPER_RANKING) as DataRegime[]) {
    const r = regimeReproduces(regime, paperTop1[regime], reproduced);
    regimes[regime] = r.ok;
    if (!r.ok) all = false;
  }
  return { adopted: all, regimes };
}


/** Live-data gate: stays off until video architecture ladder validated on GSE data. */
export const GSE_VIDEO_ARCH_LADDER_ENABLED = false;
