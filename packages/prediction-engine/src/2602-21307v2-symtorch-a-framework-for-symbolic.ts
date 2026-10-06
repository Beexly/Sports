/**
 * arXiv:2602.21307v2 — SymTorch: A Framework for Symbolic Distillation of Deep Neural Networks
 *
 * Glass-box distillation: a closed-form equation (<=10 terms via PySR) of the neural win-probability head,
 * linked from every public pick so followers can audit exactly what the model does — trust infrastructure.
 *
 * Improvement: GSE publishes a distilled closed-form 'glass box' equation (<=10 terms via PySR) of its neural win-probability head, linked from every public pick so followers can audit exactly what the model does — trust infrastructure, not alpha.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT if the distilled equation uses <=10 terms AND matches the neural head within 0.01 MAE on the held-out 2025 Weeks 1-4 window AND beats the linear baseline by >=20% MAE; REJECT on lookahead features or unreadable output.
 */

/** One term of the distilled glass-box equation. */
export interface GlassTerm {
  /** Human-readable term, e.g. "0.42 * epa_play". */
  text: string;
  /** Absolute coefficient magnitude (for the readability audit). */
  absCoef: number;
}

/** Distilled equation: ordered term list. */
export interface GlassBox {
  terms: GlassTerm[];
  /** MAE vs the neural head on the audit window. */
  maeVsHead: number;
  /** MAE of the linear baseline on the same window. */
  baselineMae: number;
}

/** Term-count gate: <= 10 terms. */
export function termCountOk(g: GlassBox): boolean {
  return g.terms.length <= 10 && g.terms.length > 0;
}

/** Fidelity gate: MAE vs head within 0.01. */
export function fidelityOk(g: GlassBox, tol = 0.01): boolean {
  return g.maeVsHead <= tol;
}

/** Improvement gate: beats the linear baseline by >= 20% MAE. */
export function beatsBaseline(g: GlassBox, improvement = 0.2): boolean {
  if (g.baselineMae <= 0) throw new Error("beatsBaseline: baselineMae > 0");
  return (g.baselineMae - g.maeVsHead) / g.baselineMae >= improvement;
}

/** Readability audit: no lookahead features, no unreadable terms. */
export function readabilityOk(g: GlassBox, banned: ReadonlySet<string>): boolean {
  return g.terms.every((t) => {
    const lower = t.text.toLowerCase();
    for (const b of banned) if (lower.includes(b)) return false;
    return t.absCoef > 0;
  });
}

/** Full ADOPT gate for the glass-box equation. */
export function glassBoxGate(g: GlassBox, banned: ReadonlySet<string>): boolean {
  return termCountOk(g) && fidelityOk(g) && beatsBaseline(g) && readabilityOk(g, banned);
}
