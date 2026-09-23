/**
 * A Unified Taxonomy and Multimodal Dataset for Events in Invasion Games
 *
 * arXiv:2108.11149 · lane:multimodal_fusion · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Multimodal combination primitives: early fusion by concatenating modality vectors, late fusion by
 * weighted averaging of per-modality predictions, and cosine-similarity agreement as a cross-modal
 * consistency diagnostic.
 *
 * Improvement (wiring record): Build an NFL event taxonomy refined from the paper's base (game status: whistle/dead-ball vs live;
 * possession: change-of-possession events; individual ball events: snap, handoff, dropback,
 * throw/release [intentional pass/throwaway vs unintentional fumble/strip], reception
 * [catch/drop/breakup], tackle; attributes: yard line, down, coverage shell), a gold-standard
 * multimodal annotation set (broadcast video + tracking + audio) for ~10 games, and an
 * expert-vs-provider audit of one charting source — then train a multimodal event spotter (video +
 * tracking + audio jointly, ablating modalities per event type): tracking gives exact ball-carrier
 * kinematics, audio gives whistle/crowd cues for game-status changes (the video baseline's weakness
 * from cuts/replays).
 *
 * ACCEPTANCE GATE: ACCEPT: (a) annotator agreement meets the >=0.9/>=0.7 bar (top-level / leaf); AND (b) the provider
 * audit finds >=5% label disagreement on at least one high-leverage event type (pass/rush/TD
 * attribution) — proving the audit adds value over blind trust. REJECT if annotators can't agree at
 * leaf level (<0.6) or providers agree >=99% with experts.
 *
 * Ingest role: multimodal fusion (early concat, late weighted average, agreement diagnostic).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2108.11149" as const;
export const LANE = "multimodal_fusion" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ACCEPT: (a) annotator agreement meets the >=0.9/>=0.7 bar (top-level / leaf); AND (b) the provider audit finds >=5% label disagreement on at least one high-leverage event type (pass/rush/TD attribution) — proving the audit adds value over blind trust. REJECT if annotators can't agree at leaf level (<0.6) or providers agree >=99% with experts.`;

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
