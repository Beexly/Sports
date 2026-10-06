/**
 * Situational reasoning trace.
 *
 * This is not a pick, not a price, and not a claim about a bookmaker.
 * It takes premises the bridges have already accepted or refused, and it
 * writes down what follows. A wind multiplier is not a win probability.
 * A refused kernel is not a zero. Two probabilities that disagree are not
 * averaged into a consensus. A target fit on the same rows as the question
 * is reverse-Stein and the conclusion is withheld.
 *
 * `publishablePick` is false on every path. `beatsBookClaim` is false on
 * every path. Closing-line value is not an input and not an output.
 */

export type ReasoningReadingKind =
  | "PROBABILITY"
  | "RATE"
  | "PHYSICAL_MODIFIER"
  | "SIGNED_TILT"
  | "INDEX"
  | "CATEGORICAL"
  | "ACTION_QUALITY";

export type Interference = "NONE" | "PRESENT" | "UNKNOWN";

export interface ReasoningPremise {
  readonly id: string;
  readonly readingKind: ReasoningReadingKind;
  /** Required to count, and only when readingKind is PROBABILITY. Strictly inside (0, 1). */
  readonly probability?: number;
  /** Required for a probability to count. Two premises with different outcomes are not a blend. */
  readonly outcome?: string;
  /** Observations behind the premise. A probability with no sample does not count. */
  readonly sampleCount?: number;
  readonly claim: string;
  /** Set when a bridge refused the kernel. Absence of a number, not a zero. */
  readonly refused?: string;
  /** Optional. Does not change withholding. Used only for the market-alignment metric. */
  readonly role?: "MARKET" | "SIGNAL";
  /** Optional ISO-8601. Does not change withholding. */
  readonly evidenceTimestamp?: string;
  /** Optional. Does not change withholding. Defaults to 1 for staleness pressure. */
  readonly declaredWeight?: number;
}

export interface BlockedKernel {
  readonly name: string;
  readonly reason: string;
}

export interface ReasoningQuestion {
  readonly question: string;
  /** What one row is. A game, a drive, a player-game. */
  readonly unit: string;
  readonly interference: Interference;
  /**
   * True when any number in the premises was shrunk toward, or fit on, the
   * same rows this question asks about.
   */
  readonly targetFitOnQuestionSample: boolean;
  readonly blockedKernels?: readonly BlockedKernel[];
  /** Optional. Does not change withholding. */
  readonly decisionTimestamp?: string;
  readonly decisionWindowMs?: number;
}

export interface DiscardedPremise {
  readonly id: string;
  readonly reason: string;
}

export interface ReasoningConflict {
  readonly a: string;
  readonly b: string;
  readonly gap: number;
}

export type ReasoningConclusion = "WITHHELD" | "ASSOCIATION_ONLY" | "INSUFFICIENT";

export interface ReasoningTrace {
  readonly publishablePick: false;
  readonly beatsBookClaim: false;
  readonly conclusion: ReasoningConclusion;
  /** Why the conclusion is that and not a pick. */
  readonly reason: string;
  readonly causalClaim: false;
  readonly interference: Interference;
  readonly unit: string;
  readonly usedPremises: readonly string[];
  readonly contextPremises: readonly string[];
  readonly discarded: readonly DiscardedPremise[];
  readonly unknowns: readonly DiscardedPremise[];
  readonly conflicts: readonly ReasoningConflict[];
  /**
   * Sample-size weighted mean of the agreeing probability premises.
   * Null when there is nothing to summarize. Not a published probability
   * and not an edge against a book.
   */
  readonly agreementSummary: number | null;
  readonly agreementSummaryIsPublishable: false;
  /** How many probability premises entered the summary. 1 is not agreement. */
  readonly sourceCount: number;
  /**
   * Empty unless conclusion is WITHHELD. Each entry is one cause. This does
   * not decide the withhold; the branches below do.
   */
  readonly withheldReasons: readonly string[];
  readonly derivedMetrics: DerivedMetrics;
  readonly reasoningTraceBrand: "GSE_REASONING_TRACE";
  readonly trace: readonly string[];
}

/**
 * Measurements that are not a decision.
 * signal_agreement_index: 1 - (max - min) over usable probabilities that all
 * name one outcome. Null if fewer than two share that outcome. Range (0, 1].
 * conflict_density: same-outcome pairs past the disagreement gap, divided by
 * all same-outcome pairs. Null if there is no such pair. Range [0, 1].
 * market_alignment_score: 1 - |mean of non-market usable probabilities - the
 * market probability|. Null if either side is missing. Range (0, 1].
 * staleness_pressure: stale declared weight divided by weight that carried a
 * timestamp. Null if the question has no decision time. Range [0, 1].
 */
export interface DerivedMetrics {
  readonly signal_agreement_index: number | null;
  readonly conflict_density: number | null;
  readonly market_alignment_score: number | null;
  readonly staleness_pressure: number | null;
}

export type ReasoningEval =
  | { readonly ok: true; readonly data: ReasoningTrace }
  | { readonly ok: false; readonly reason: string };

/** Two probability premises further apart than this are a conflict, not a blend. */
export const DEFAULT_DISAGREEMENT = 0.08;

const PUBLICATION =
  "A reasoning trace is not a pick. publishablePick is false. beatsBookClaim is false.";

function fail(reason: string): ReasoningEval {
  return { ok: false, reason };
}

function isProbability(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1;
}

function derivedMetricsOf(
  question: ReasoningQuestion,
  premises: readonly ReasoningPremise[],
  usable: readonly { id: string; probability: number; outcome: string; role?: ReasoningPremise["role"] }[],
  disagreement: number,
): DerivedMetrics {
  const outcomes = new Set(usable.map((item) => item.outcome));
  let signal_agreement_index: number | null = null;
  let conflict_density: number | null = null;
  if (outcomes.size === 1 && usable.length >= 2) {
    const values = usable.map((item) => item.probability);
    signal_agreement_index = 1 - (Math.max(...values) - Math.min(...values));
    let pairs = 0;
    let conflicts = 0;
    for (let i = 0; i < usable.length; i++) {
      for (let j = i + 1; j < usable.length; j++) {
        pairs += 1;
        if (Math.abs(usable[i]!.probability - usable[j]!.probability) > disagreement) conflicts += 1;
      }
    }
    conflict_density = pairs === 0 ? null : conflicts / pairs;
  }

  const market = premises.find((item) => item.role === "MARKET" && isProbability(item.probability));
  const others = usable.filter((item) => item.role !== "MARKET");
  let market_alignment_score: number | null = null;
  if (market && isProbability(market.probability) && others.length > 0) {
    const mean = others.reduce((sum, item) => sum + item.probability, 0) / others.length;
    market_alignment_score = 1 - Math.abs(mean - market.probability);
  }

  let staleness_pressure: number | null = null;
  const decisionMs = question.decisionTimestamp === undefined ? Number.NaN : Date.parse(question.decisionTimestamp);
  if (Number.isFinite(decisionMs) && question.decisionWindowMs !== undefined && question.decisionWindowMs >= 0) {
    let total = 0;
    let stale = 0;
    for (const item of premises) {
      if (item.evidenceTimestamp === undefined) continue;
      const evidenceMs = Date.parse(item.evidenceTimestamp);
      if (!Number.isFinite(evidenceMs)) continue;
      const weight = item.declaredWeight ?? 1;
      if (!Number.isFinite(weight) || weight < 0) continue;
      total += weight;
      if (decisionMs - evidenceMs > question.decisionWindowMs) stale += weight;
    }
    staleness_pressure = total > 0 ? stale / total : null;
  }

  return { signal_agreement_index, conflict_density, market_alignment_score, staleness_pressure };
}

function base(question: ReasoningQuestion, reason: string, conclusion: ReasoningConclusion, extra: Partial<ReasoningTrace> & { trace: readonly string[] }): ReasoningTrace {
  return {
    publishablePick: false,
    beatsBookClaim: false,
    conclusion,
    reason,
    causalClaim: false,
    interference: question.interference,
    unit: question.unit,
    usedPremises: extra.usedPremises ?? [],
    contextPremises: extra.contextPremises ?? [],
    discarded: extra.discarded ?? [],
    unknowns: extra.unknowns ?? [],
    conflicts: extra.conflicts ?? [],
    agreementSummary: extra.agreementSummary ?? null,
    agreementSummaryIsPublishable: false,
    sourceCount: extra.sourceCount ?? 0,
    withheldReasons: conclusion === "WITHHELD" ? (extra.withheldReasons ?? [reason]) : [],
    derivedMetrics: extra.derivedMetrics ?? {
      signal_agreement_index: null,
      conflict_density: null,
      market_alignment_score: null,
      staleness_pressure: null,
    },
    reasoningTraceBrand: "GSE_REASONING_TRACE",
    trace: extra.trace,
  };
}

/**
 * Work through one question. Does not call a kernel and does not read a market.
 * The caller passes what the bridges already decided.
 */
export function reasonAbout(question: ReasoningQuestion, premises: readonly ReasoningPremise[], disagreement = DEFAULT_DISAGREEMENT): ReasoningEval {
  if (question.question.trim().length === 0) return fail("reasoning: question is empty");
  if (question.unit.trim().length === 0) return fail("reasoning: unit is empty");
  if (!Number.isFinite(disagreement) || disagreement <= 0 || disagreement >= 1) {
    return fail(`reasoning: disagreement ${disagreement} must lie in (0, 1)`);
  }
  const ids = new Set<string>();
  for (const p of premises) {
    if (p.id.trim().length === 0) return fail("reasoning: a premise has an empty id");
    if (ids.has(p.id)) return fail(`reasoning: duplicate premise id ${p.id}`);
    ids.add(p.id);
  }

  const unknowns: DiscardedPremise[] = [];
  for (const blocked of question.blockedKernels ?? []) {
    unknowns.push({ id: blocked.name, reason: blocked.reason });
  }

  const discarded: DiscardedPremise[] = [];
  const context: string[] = [];
  const usable: { id: string; probability: number; sampleCount: number; outcome: string; role?: ReasoningPremise["role"] }[] = [];

  for (const p of premises) {
    if (p.refused !== undefined && p.refused.length > 0) {
      unknowns.push({ id: p.id, reason: p.refused });
      continue;
    }
    if (p.readingKind !== "PROBABILITY") {
      context.push(p.id);
      discarded.push({
        id: p.id,
        reason: `${p.readingKind} is context. It is not a probability and is not averaged in.`,
      });
      continue;
    }
    if (!isProbability(p.probability)) {
      discarded.push({
        id: p.id,
        reason: `probability ${String(p.probability)} is not inside (0, 1). It was not clamped.`,
      });
      continue;
    }
    if (p.outcome === undefined || p.outcome.trim().length === 0) {
      discarded.push({
        id: p.id,
        reason: "a probability with no named outcome does not count. It might be the other side.",
      });
      continue;
    }
    if (p.sampleCount === undefined || !Number.isFinite(p.sampleCount) || p.sampleCount < 1) {
      discarded.push({
        id: p.id,
        reason: "a probability with no sample count does not count",
      });
      continue;
    }
    usable.push({ id: p.id, probability: p.probability, sampleCount: p.sampleCount, outcome: p.outcome, role: p.role });
  }

  const derived = derivedMetricsOf(question, premises, usable, disagreement);

  const trace: string[] = [
    PUBLICATION,
    `question: ${question.question}`,
    `unit: ${question.unit}`,
    `interference: ${question.interference}`,
  ];

  if (question.targetFitOnQuestionSample) {
    trace.push("withheld: a target was fit on the same rows as the question (reverse-Stein)");
    return {
      ok: true,
      data: base(question, "reverse-Stein: the target was fit on the question sample", "WITHHELD", {
        discarded,
        unknowns,
        contextPremises: context,
        withheldReasons: ["target was fit on the question sample"],
        derivedMetrics: derived,
        trace,
      }),
    };
  }

  const outcomes = new Set(usable.map((u) => u.outcome));
  if (outcomes.size > 1) {
    trace.push(`withheld: premises name ${outcomes.size} different outcomes`);
    return {
      ok: true,
      data: base(question, "probability premises do not name the same outcome. They were not averaged.", "WITHHELD", {
        discarded,
        unknowns,
        usedPremises: usable.map((u) => u.id),
        contextPremises: context,
        sourceCount: usable.length,
        withheldReasons: [`premises name different outcomes: ${[...outcomes].join(", ")}`],
        derivedMetrics: derived,
        trace,
      }),
    };
  }

  const conflicts: ReasoningConflict[] = [];
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i]!;
      const b = usable[j]!;
      const gap = Math.abs(a.probability - b.probability);
      if (gap > disagreement) conflicts.push({ a: a.id, b: b.id, gap });
    }
  }
  if (conflicts.length > 0) {
    trace.push(`withheld: ${conflicts.length} probability conflict(s) above ${disagreement}`);
    return {
      ok: true,
      data: base(question, "probability premises disagree. They were not averaged.", "WITHHELD", {
        discarded,
        unknowns,
        conflicts,
        usedPremises: usable.map((u) => u.id),
        contextPremises: context,
        sourceCount: usable.length,
        withheldReasons: conflicts.map((pair) => `${pair.a} and ${pair.b} differ by ${pair.gap} on the same outcome`),
        derivedMetrics: derived,
        trace,
      }),
    };
  }

  if (usable.length === 0) {
    trace.push("insufficient: no probability premise survived");
    return {
      ok: true,
      data: base(question, "no usable probability premise. Context and refusals are not a forecast.", "INSUFFICIENT", {
        discarded,
        unknowns,
        contextPremises: context,
        derivedMetrics: derived,
        trace,
      }),
    };
  }

  let weight = 0;
  let weighted = 0;
  for (const u of usable) {
    weight += u.sampleCount;
    weighted += u.probability * u.sampleCount;
  }
  const summary = weighted / weight;
  const single = usable.length === 1;
  const causal = question.interference === "NONE" ? "interference none, still not a causal claim from this trace" : `interference ${question.interference}, association only`;
  trace.push(causal);
  trace.push(
    single
      ? `single source ${summary.toFixed(6)}. This is not agreement.`
      : `agreement summary ${summary.toFixed(6)} from ${usable.length} premise(s), sample weight ${weight}`,
  );
  trace.push("association only. Not a pick. Not a book comparison.");

  return {
    ok: true,
    data: base(
      question,
      single
        ? "one probability source. Not agreement, not a cause, and not a pick."
        : question.interference === "NONE"
          ? "premises name the same outcome and agree. The summary is an association, not a cause and not a pick."
          : "premises name the same outcome and agree. Interference is not cleared, so this is an association only.",
      "ASSOCIATION_ONLY",
      {
        discarded,
        unknowns,
        usedPremises: usable.map((u) => u.id),
        contextPremises: context,
        agreementSummary: summary,
        sourceCount: usable.length,
        derivedMetrics: derived,
        trace,
      },
    ),
  };
}
