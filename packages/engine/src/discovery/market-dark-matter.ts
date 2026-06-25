/**
 * DISCOVERY LAYER — Market Dark Matter Engine (Invention 29).
 *
 * Sometimes prices move before public reality is visible. A naive system says "line moved." This
 * says "observable market behavior implies a hidden causal mass." It infers unobserved information
 * PRESSURE from sharp-before-public movement, asymmetric prop movement, and alt-curvature shifts
 * with no public news — and it is deliberately humble: it infers PRESSURE, not FACT.
 *
 * HARD GOVERNANCE: it can never imply insider information, never publish a rumor, never say "we
 * know." It always routes to RESEARCH_ONLY + rumor quarantine, and publicClaimAllowed is false
 * unless an independent source clears it. Pure + deterministic.
 */

export interface DarkMatterSignals {
  /** Sharp/low-limit book moved before public books (ms lead); higher = stronger hidden signal. */
  readonly sharpBeforePublicMs: number;
  /** Asymmetric movement in related props not explained by any public item [0,1]. */
  readonly asymmetricPropMovement: number;
  /** Alt-ladder curvature shift with no public cause [0,1]. */
  readonly altCurvatureShift: number;
  /** Is there any public news item that explains it? */
  readonly publicNewsPresent: boolean;
  /** Has an independent, rights-cleared source confirmed a cause? */
  readonly sourceCleared: boolean;
}

export interface DarkMatterVerdict {
  readonly hiddenPressureDetected: boolean;
  /** 0..1 — strength of the implied unobserved mass (NOT a probability of any specific fact). */
  readonly pressure: number;
  readonly affectedStateGuess: string | null;
  /** ALWAYS false unless sourceCleared — the engine may not make a public claim. */
  readonly publicClaimAllowed: boolean;
  readonly quarantined: boolean;
  readonly disposition: "RESEARCH_ONLY" | "SOURCE_CLEARED_CANDIDATE" | "NO_SIGNAL";
  readonly note: string;
}

/** Detect hidden information pressure. Routes to research-only + quarantine unless source-cleared. */
export function detectDarkMatter(s: DarkMatterSignals, options: { leadThresholdMs?: number; pressureThreshold?: number } = {}): DarkMatterVerdict {
  const leadThr = options.leadThresholdMs ?? 60_000;
  const pthr = options.pressureThreshold ?? 0.4;

  const leadComponent = Math.min(1, Math.max(0, s.sharpBeforePublicMs) / (5 * 60_000));
  const pressure = Math.min(1, (s.publicNewsPresent ? 0.3 : 1) * (0.4 * leadComponent + 0.3 * s.asymmetricPropMovement + 0.3 * s.altCurvatureShift));
  const detected = pressure >= pthr && s.sharpBeforePublicMs >= leadThr && !s.publicNewsPresent;

  if (!detected) {
    return { hiddenPressureDetected: false, pressure, affectedStateGuess: null, publicClaimAllowed: false, quarantined: false, disposition: "NO_SIGNAL", note: "No hidden-pressure signal above threshold (or a public cause explains it)." };
  }
  if (s.sourceCleared) {
    return { hiddenPressureDetected: true, pressure, affectedStateGuess: "rights-cleared cause", publicClaimAllowed: true, quarantined: false, disposition: "SOURCE_CLEARED_CANDIDATE", note: "Pressure detected AND independently source-cleared — eligible as a candidate (still no certainty language)." };
  }
  return {
    hiddenPressureDetected: true,
    pressure,
    affectedStateGuess: "unobserved information pressure (unidentified)",
    publicClaimAllowed: false,
    quarantined: true,
    disposition: "RESEARCH_ONLY",
    note: "Market behavior suggests unobserved information pressure. NO public claim. Quarantine until independently source-cleared. Infer pressure, not fact.",
  };
}
