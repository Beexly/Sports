/**
 * Model Trees for Identifying Exceptional Players in the NHL Draft
 *
 * arXiv:1802.08765v1 · lane:win_spread_total · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Add a draft-prospect evaluation lane modeled on the paper's logistic model tree (LMT) for
 * identifying exceptional players: data = NFL draft prospects 2000-2025 (college production,
 * combine + RAS, draft position); target = played >=1 NFL snap within 4 years; tree root-splits on
 * draft position / dominator / RAS with logistic leaves. As honest baselining (BASELINE): this
 * only counts if the model tree's SRC beats draft-order SRC by >=0.10 AND beats a global logistic
 * regression by >=0.05 on 2019-2024 drafts -- if draft position alone subsumes the signal, the
 * tree is theater and consensus wins. The GSE improvement goes beyond the paper with a hurdle
 * model tree: keep the logistic tree for P(play>=1 game), then a per-leaf zero-truncated negative-
 * binomial count model for games-given-participation, ranking by E[games] = P(play).E[games|play]
 * -- testing whether the paper's probability-as-ranking shortcut is lossy and producing rookie-
 * projection priors for dynasty/DFS content. If the hurdle beats the pure-binary tree on SRC, it
 * becomes the production spec.
 *
 * ACCEPTANCE GATE: ADOPT the model-tree draft lane only if, on the 2019-2024 test drafts, the logistic model tree's
 * SRC beats draft-order SRC by >=0.10 AND beats the global logistic regression's SRC by >=0.05;
 * REJECT otherwise.
 *
 * Ingest role: schemas (4th-down optimal playbook: break-even + make-vs-brake-even deltas).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1802.08765v1" as const;
export const LANE = "win_spread_total" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the model-tree draft lane only if, on the 2019-2024 test drafts, the logistic model tree's
 * SRC beats draft-order SRC by >=0.10 AND beats the global logistic regression's SRC by >=0.05;
 * REJECT otherwise.`;

export const CONFIG = {
  enabled: false,
  fieldRange: [1, 99] as const,
  distanceRange: [1, 30] as const,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PlayValue {
  readonly value: number;
  readonly winProb: number;
}

export function isPlayValue(x: unknown): x is PlayValue {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["value"]) && isFiniteNumber(o["winProb"]) && (o["winProb"] as number) >= 0 && (o["winProb"] as number) <= 1;
}

/** Break-even conversion rate: solves go = value(go fail)*p + value(go ok)*(1-p). */
export function breakEvenRate(goOk: PlayValue, goFail: PlayValue, alt: PlayValue): number | null {
  if (!isPlayValue(goOk) || !isPlayValue(goFail) || !isPlayValue(alt)) return null;
  const denom = goOk.value - goFail.value;
  if (denom === 0) return null;
  const p = (alt.value - goFail.value) / denom;
  if (!isFiniteNumber(p) || p < 0 || p > 1) return null;
  return p;
}

export interface PlaybookRow {
  readonly yardline: number;
  readonly distance: number;
  readonly recommendation: "go" | "kick" | "punt";
  readonly deltaGo: number;
  readonly breakEven: number | null;
}

/** Optimal recommendation = argmax win prob; delta vs second best. */
export function playbookRow(
  yardline: number,
  distance: number,
  go: PlayValue,
  kick: PlayValue,
  punt: PlayValue,
  goOk?: PlayValue,
  goFail?: PlayValue,
): PlaybookRow | null {
  if (![yardline, distance].every(isFiniteNumber)) return null;
  if (!isPlayValue(go) || !isPlayValue(kick) || !isPlayValue(punt)) return null;
  const cands = [
    { r: "go" as const, v: go },
    { r: "kick" as const, v: kick },
    { r: "punt" as const, v: punt },
  ];
  const sorted = [...cands].sort((a, b) => b.v.winProb - a.v.winProb);
  const top = sorted[0]!;
  const second = sorted[1]!;
  return {
    yardline,
    distance,
    recommendation: top.r,
    deltaGo: top.r === "go" ? top.v.winProb - second.v.winProb : 0,
    breakEven: goOk && goFail ? breakEvenRate(goOk, goFail, kick) : null,
  };
}

/** Build the full 1-99 x 1-30 playbook from a value oracle. */
export function buildPlaybook(
  oracle: (yardline: number, distance: number, play: "go" | "kick" | "punt") => PlayValue | null,
): PlaybookRow[] {
  const rows: PlaybookRow[] = [];
  for (let yd = 1; yd <= 99; yd++) {
    for (let d = 1; d <= 30; d++) {
      const go = oracle(yd, d, "go");
      const kick = oracle(yd, d, "kick");
      const punt = oracle(yd, d, "punt");
      if (!go || !kick || !punt) continue;
      const row = playbookRow(yd, d, go, kick, punt);
      if (row) rows.push(row);
    }
  }
  return rows;
}

/** Aggressiveness index: share of rows recommending 'go' where deltaGo > gate. */
export function aggressivenessIndex(rows: readonly PlaybookRow[], gate = 0.005): number | null {
  if (rows.length === 0 || !isFiniteNumber(gate)) return null;
  return rows.filter((r) => r.recommendation === "go" && r.deltaGo > gate).length / rows.length;
}
