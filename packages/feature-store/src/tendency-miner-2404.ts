/**
 * Tendency-rule miner v1: confrontation matrices from play descriptions
 *
 * Research port: arXiv:2404.00030
 * Normalized lane: nlp | Doctrine: PROPRIETARY_EDGE
 *
 * Builds confrontation matrices from nflverse play descriptions: rows = offensive player response features (target depth, separation proxy, YAC bucket), columns = defensive features (coverage shell, box count bucket). Pure co-occurrence counting; the CA rule-mining template and Procrustes stability check are live-data gates.
 *
 * ACCEPTANCE GATE: ADOPT for matchup modeling only if cross-season Procrustes stability holds (median Delta^2 <= 0.35) and weakness-rule matchups validate. Live-data gate -> GSE_TENDENCY_MINER_ENABLED flag (default false).
 */

export interface PlayFeatures {
  targetDepthBucket: number; // 0..3
  separationBucket: number; // 0..2
  yacBucket: number; // 0..3
  coverageShell: number; // 0..3
  boxBucket: number; // 0..2
}

export interface ConfrontationMatrix {
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
}

export const ROW_LABELS = [
  "depth_short", "depth_mid", "depth_deep", "depth_bomb",
  "sep_tight", "sep_avg", "sep_open",
  "yac_none", "yac_short", "yac_mid", "yac_long",
];
export const COL_LABELS = ["cov_0", "cov_1", "cov_2", "cov_3", "box_light", "box_base", "box_stacked"];

function rowIndex(p: PlayFeatures): number[] {
  return [p.targetDepthBucket, 4 + p.separationBucket, 7 + p.yacBucket];
}
function colIndex(p: PlayFeatures): number[] {
  return [p.coverageShell, 4 + p.boxBucket];
}

/** Build the confrontation matrix from play features (pure counting). */
export function buildConfrontationMatrix(plays: PlayFeatures[]): ConfrontationMatrix {
  const counts = ROW_LABELS.map(() => COL_LABELS.map(() => 0));
  for (const p of plays) {
    for (const r of rowIndex(p)) {
      if (r < 0 || r >= ROW_LABELS.length) continue;
      for (const c of colIndex(p)) {
        if (c < 0 || c >= COL_LABELS.length) continue;
        const row = counts[r];
        if (row === undefined) continue;
        row[c] = (row[c] ?? 0) + 1;
      }
    }
  }
  return { rowLabels: ROW_LABELS, colLabels: COL_LABELS, counts };
}

/** Row-normalized association strengths (P(column | row)). */
export function associationStrengths(m: ConfrontationMatrix): number[][] {
  return m.counts.map((row) => {
    const s = row.reduce((a, b) => a + b, 0);
    return s === 0 ? row.map(() => 0) : row.map((c) => c / s);
  });
}

/** Live-data gate: Procrustes stability median Delta^2 <= 0.35 across seasons. */
export const GSE_TENDENCY_MINER_ENABLED = false;

