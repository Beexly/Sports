/**
 * TextGrad pipeline optimization — arXiv 2406.07496v1
 * ("TextGrad: Automatic 'Differentiation' via Text").
 *
 * ADDITIVE invention module (packages/prediction-engine/src/invention).
 * Optimizes the signal-discovery pipeline itself; the backward-engine LLM
 * calls stay outside the repo (this module is the deterministic graph
 * substrate). Not wired into any production path.
 *
 * Paper mechanism: graph: SignalCode = LLM(IdeaPrompt + SignalHypothesis)
 * -> BacktestResult = Executor(SignalCode) -> Loss = -DeltaBrier
 * (deterministic — NOT an LLM judge). Variables with requires_grad:
 * IdeaPrompt, SignalCode. Backward: the backward engine receives the
 * backtest diagnostics (which folds failed, sample sizes, calibration
 * slope — the structured evaluator output) as the "gradient" on
 * BacktestResult, producing criticisms for SignalCode ("the wind
 * interaction fails because...") AND for IdeaPrompt ("hypotheses about
 * weather need a minimum-games guard..."); chain rule = one backward call
 * per edge. TGD.step updates SignalCode and IdeaPrompt with the Eq.-9-style
 * prompt; 5 iterations max per idea (the paper's budget). Minibatch mode:
 * batch 4 ideas, tg.sum their losses, concatenate gradients — improving the
 * IdeaPrompt across ideas, not just one. Gradient-clip analogue: cap each
 * TGD.step to changing at most K tokens of IdeaPrompt / K lines of
 * SignalCode per iteration.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT if arm B clears the 0.002
 * gate on >=5/8 ideas vs <=3/8 for arm A, AND the transferred IdeaPrompt
 * improves first-attempt DeltaBrier on 4 held-out hypotheses by >=0.001 on
 * average, AND total LLM calls per idea <= 20; REJECT if arm B ~= arm A,
 * the IdeaPrompt drifts into prompt-bloat, or any iteration's "gradient"
 * contradicts the deterministic backtest numbers.
 */

export interface TextVariable {
  readonly name: string;
  readonly value: string;
  readonly requiresGrad: boolean;
}

/** Structured evaluator diagnostics: the "gradient" on BacktestResult. */
export interface BacktestDiagnostics {
  readonly deltaBrier: number;
  readonly failedFolds: ReadonlyArray<string>;
  readonly sampleSizes: Readonly<Record<string, number>>;
  readonly calibrationSlope: number;
}

/** Criticism produced by one backward call (one graph edge). */
export interface Criticism {
  readonly targetVariable: string;
  readonly text: string;
}

/**
 * Backward pass over one edge: turn structured diagnostics into a
 * textual criticism for the upstream variable. Chain rule = one call per
 * edge (BacktestResult -> SignalCode -> IdeaPrompt).
 */
export function backwardStep(
  targetVariable: string,
  diagnostics: BacktestDiagnostics,
): Criticism {
  const parts: string[] = [];
  if (diagnostics.failedFolds.length > 0) {
    parts.push(
      `fails on folds [${diagnostics.failedFolds.join(", ")}]; ` +
        `add a minimum-games guard per fold before trusting the signal`,
    );
  }
  const small = Object.entries(diagnostics.sampleSizes).filter(([, n]) => n < 30);
  if (small.length > 0) {
    parts.push(
      `small samples in ${small.map(([k]) => k).join(", ")}; ` +
        `shrink or drop the interaction terms fitted there`,
    );
  }
  if (Math.abs(diagnostics.calibrationSlope - 1) > 0.15) {
    parts.push(
      `calibration slope ${diagnostics.calibrationSlope.toFixed(2)} != 1; ` +
        `recalibrate the probability mapping before sizing`,
    );
  }
  if (parts.length === 0) {
    parts.push(
      `deltaBrier ${diagnostics.deltaBrier.toFixed(4)} holds; ` +
        `keep the structure, tighten constants`,
    );
  }
  return { targetVariable, text: parts.join(". ") + "." };
}

/** Word-count token proxy for the gradient-clip analogue. */
export function countTokens(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/**
 * TGD.step (Eq.-9 style): apply the criticism to the variable's value,
 * capped at maxTokensChanged new tokens (gradient-clip analogue). The
 * deterministic substrate records the edit as a revision block; the
 * backward-engine LLM rendering stays outside the repo.
 */
export function tgdStep(
  variable: TextVariable,
  criticism: Criticism,
  maxTokensChanged: number,
): TextVariable {
  if (!variable.requiresGrad) return variable;
  const words = criticism.text.split(/\s+/);
  const clipped = words.slice(0, Math.max(maxTokensChanged, 0)).join(" ");
  const block = `\n\n[REVISION for ${variable.name}: ${clipped}]`;
  return { ...variable, value: variable.value + block };
}

/**
 * Line-clip analogue for SignalCode: keep at most maxLines of the
 * proposed replacement (like gradient clipping in SGD); the kept lines
 * are the first maxLines (the most salient edits come first).
 */
export function clipLineChanges(proposedCode: string, maxLines: number): string {
  return proposedCode.split("\n").slice(0, Math.max(maxLines, 0)).join("\n");
}

/** Minibatch: tg.sum of per-idea losses (negative deltaBrier each). */
export function minibatchLoss(deltaBriers: readonly number[]): number {
  const s = -deltaBriers.reduce((a, b) => a + b, 0);
  return s === 0 ? 0 : s; // normalize -0 to 0
}

/** Concatenate per-idea gradients (criticisms) for the shared IdeaPrompt. */
export function concatGradients(criticisms: ReadonlyArray<Criticism>): Criticism {
  const targets = [...new Set(criticisms.map((c) => c.targetVariable))].join("+");
  return {
    targetVariable: targets,
    text: criticisms.map((c) => c.text).join(" "),
  };
}

/** Iteration budget: 5 max per idea (the paper's budget). */
export function iterationsExhausted(iteration: number, maxIterations = 5): boolean {
  return iteration >= maxIterations;
}
