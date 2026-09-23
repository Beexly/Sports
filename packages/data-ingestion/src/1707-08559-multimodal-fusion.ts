/**
 * Video Highlight Prediction Using Audience Chat Reactions
 *
 * arXiv:1707.08559 · lane:multimodal_fusion · verdict:ADAPT · owner:Hermes
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multimodal combination primitives: early fusion by concatenating modality vectors, late fusion by
 * weighted averaging of per-modality predictions, and cosine-similarity agreement as a cross-modal
 * consistency diagnostic.
 *
 * Improvement (wiring record): Build the reaction-velocity highlight ranker for GSE's video operation: for each 2024 NFL play,
 * features = (a) broadcast-video embeddings, (b) X reaction velocity (posts/minute mentioning the game
 * in the 5 min after the play; sentiment via char/subword model per the paper's slang finding), (c)
 * tracking-based excitement proxies (max speed, air yards); train lv-LSTM-style joint model against
 * ground truth = plays in official 'top 10 plays' reels -- uses: (1) auto-generate the nightly GSE
 * highlight reel; (2) a 'crowd excitement' feature for the engine; (3) content -- 'the 5 plays that
 * broke NFL Twitter this week.'
 *
 * ACCEPTANCE GATE: ACCEPT: joint model beats the best single-modality baseline by >=5 F-score points on held-out weeks
 * AND Precision@10 >= 0.5. REJECT: reaction features add nothing over video+tracking or Precision@10 <
 * 0.3.
 *
 * Ingest role: multimodal fusion (early concat, late weighted average, agreement diagnostic).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1707.08559" as const;
export const LANE = "multimodal_fusion" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPT: joint model beats the best single-modality baseline by >=5 F-score points on held-out weeks AND Precision@10 >= 0.5. REJECT: reaction features add nothing over video+tracking or Precision@10 < 0.3.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "concat early fusion + weighted late fusion + cosine agreement",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Early fusion: concatenate modality vectors into one joint representation. */
export function earlyFusionConcat(modalities: ReadonlyArray<readonly number[]>): number[] | null {
  if (modalities.length === 0) return null;
  if (!modalities.every((m) => m.length > 0 && m.every(isFiniteNumber))) return null;
  return modalities.flat();
}

/** Late fusion: weighted average of per-modality prediction vectors (equal weights by default). */
export function lateFusionAverage(
  preds: ReadonlyArray<readonly number[]>,
  weights?: readonly number[],
): number[] | null {
  if (preds.length === 0) return null;
  const first = preds[0];
  if (first === undefined) return null;
  const n = first.length;
  if (n === 0 || !preds.every((p) => p.length === n && p.every(isFiniteNumber))) return null;
  const w = weights ?? preds.map(() => 1);
  if (w.length !== preds.length || !w.every((x) => isFiniteNumber(x) && x >= 0)) return null;
  const wSum = w.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let m = 0; m < preds.length; m++) acc += (w[m] ?? 0) * (preds[m]?.[i] ?? 0);
    out.push(acc / wSum);
  }
  return out;
}

/** Cosine similarity between two modality embeddings (agreement diagnostic). */
export function modalityAgreement(a: readonly number[], b: readonly number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  if (!a.every(isFiniteNumber) || !b.every(isFiniteNumber)) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return null;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
