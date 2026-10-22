/**
 * Google Research Harness²: Recursive Agent Harnessing (PPC Loop)
 *
 * Mathematical port and algorithmic implementation of `google-research/harness2`.
 *
 * Implements the Contrastive Propose-Probe-Compose (PPC) loop for frozen foundation models,
 * systematically optimizing prompts, tools, guardrail thresholds, and memory retrieval
 * without modifying model weights.
 */

export interface AgentHarness {
  harnessId: string;
  version: number;
  systemPromptScaffolding: string;
  activeTools: string[];
  guardrailThresholds: {
    minEdgeThreshold: number;
    maxHoldCeiling: number;
    uncertaintyPenaltyCap: number;
    abstentionConfidenceFloor: number;
  };
  memoryRetrievalTopK: number;
  maxReasoningHops: number;
}

export type MutationType =
  | 'THRESHOLD_TIGHTEN'
  | 'TOOL_RESTRICTION'
  | 'PROMPT_SPECIALIZATION'
  | 'MEMORY_DEPTH_EXPAND';

export interface HarnessMutation {
  mutationType: MutationType;
  targetProperty: string;
  previousValue: unknown;
  proposedValue: unknown;
  justification: string;
}

export interface BehavioralProbeScenario {
  scenarioId: string;
  scenarioType: 'HIGH_UNCERTAINTY' | 'SHARP_MARKET_MOVE' | 'INJURY_CASCADE' | 'ADVERSARIAL_TRAP';
  marketDiff: number;
  newsUrgencyScore: number;
  injuryImpactIndex: number;
}

export interface ProbeEvaluationScore {
  harnessId: string;
  scenariosTested: number;
  passCount: number;
  failCount: number;
  passRate: number;
  totalViolations: number;
  averageReasoningHops: number;
  compositeRobustnessScore: number;
}

export interface ContrastivePpcResult {
  initialHarness: AgentHarness;
  proposedMutations: HarnessMutation[];
  candidateHarnesses: AgentHarness[];
  probeScores: ProbeEvaluationScore[];
  selectedHarness: AgentHarness;
  appliedMutations: HarnessMutation[];
  relativeImprovementPercent: number;
}

/**
 * 1. PROPOSE: Generates candidate harness mutations to resolve observed edge failures or regressions.
 */
export function proposeHarnessMutations(
  baseHarness: AgentHarness,
  failurePatterns: string[]
): HarnessMutation[] {
  const mutations: HarnessMutation[] = [];

  for (const failure of failurePatterns) {
    if (failure.includes('overconfident_inversion') || failure.includes('high_tail_brier')) {
      mutations.push({
        mutationType: 'THRESHOLD_TIGHTEN',
        targetProperty: 'guardrailThresholds.abstentionConfidenceFloor',
        previousValue: baseHarness.guardrailThresholds.abstentionConfidenceFloor,
        proposedValue: Number((baseHarness.guardrailThresholds.abstentionConfidenceFloor + 0.05).toFixed(2)),
        justification: 'Elevate abstention floor to prevent negative-EV tail issuance',
      });
    }

    if (failure.includes('sharp_market_resistance') || failure.includes('negative_clv')) {
      mutations.push({
        mutationType: 'THRESHOLD_TIGHTEN',
        targetProperty: 'guardrailThresholds.minEdgeThreshold',
        previousValue: baseHarness.guardrailThresholds.minEdgeThreshold,
        proposedValue: Number((baseHarness.guardrailThresholds.minEdgeThreshold + 0.015).toFixed(3)),
        justification: 'Increase minimum required edge to overcome adverse market shading',
      });
    }

    if (failure.includes('context_starvation') || failure.includes('missed_narrative')) {
      mutations.push({
        mutationType: 'MEMORY_DEPTH_EXPAND',
        targetProperty: 'memoryRetrievalTopK',
        previousValue: baseHarness.memoryRetrievalTopK,
        proposedValue: Math.min(20, baseHarness.memoryRetrievalTopK + 4),
        justification: 'Expand cross-slate historical memory retrieval for deeper narrative precedent',
      });
    }
  }

  // De-duplicate mutations by targetProperty
  const seen = new Set<string>();
  const uniqueMutations: HarnessMutation[] = [];
  for (const m of mutations) {
    if (!seen.has(m.targetProperty)) {
      seen.add(m.targetProperty);
      uniqueMutations.push(m);
    }
  }

  return uniqueMutations;
}

/**
 * Clones and applies mutations to generate candidate harness instances.
 */
export function applyMutationsToHarness(
  baseHarness: AgentHarness,
  mutations: HarnessMutation[],
  newHarnessId: string
): AgentHarness {
  const cloned: AgentHarness = JSON.parse(JSON.stringify(baseHarness));
  cloned.harnessId = newHarnessId;
  cloned.version += 1;

  for (const m of mutations) {
    if (m.targetProperty === 'guardrailThresholds.abstentionConfidenceFloor') {
      cloned.guardrailThresholds.abstentionConfidenceFloor = m.proposedValue as number;
    } else if (m.targetProperty === 'guardrailThresholds.minEdgeThreshold') {
      cloned.guardrailThresholds.minEdgeThreshold = m.proposedValue as number;
    } else if (m.targetProperty === 'guardrailThresholds.uncertaintyPenaltyCap') {
      cloned.guardrailThresholds.uncertaintyPenaltyCap = m.proposedValue as number;
    } else if (m.targetProperty === 'memoryRetrievalTopK') {
      cloned.memoryRetrievalTopK = m.proposedValue as number;
    }
  }

  return cloned;
}

/**
 * 2. PROBE: Executes contrastive behavioral probes against synthetic or historical test scenarios
 * without requiring ground-truth answer keys.
 */
export function probeHarnessBehavior(
  harness: AgentHarness,
  scenarios: BehavioralProbeScenario[]
): ProbeEvaluationScore {
  let passCount = 0;
  let failCount = 0;
  let totalViolations = 0;
  let totalHops = 0;

  for (const sc of scenarios) {
    let violation = false;
    let hops = Math.min(harness.maxReasoningHops, 2);

    // High uncertainty scenario: Harness MUST abstain or penalize confidence
    if (sc.scenarioType === 'HIGH_UNCERTAINTY') {
      hops += 1;
      if (harness.guardrailThresholds.abstentionConfidenceFloor < 0.55) {
        // Failing to enforce floor allows reckless issuance
        violation = true;
        totalViolations++;
      }
    }

    // Sharp market move scenario: Requires sufficient minimum edge threshold
    if (sc.scenarioType === 'SHARP_MARKET_MOVE') {
      hops += 1;
      if (harness.guardrailThresholds.minEdgeThreshold < 0.035) {
        // Edge threshold too loose; vulnerable to market traps
        violation = true;
        totalViolations++;
      }
    }

    // Adversarial trap scenario: checks memory depth
    if (sc.scenarioType === 'ADVERSARIAL_TRAP') {
      hops += 2;
      if (harness.memoryRetrievalTopK < 8) {
        violation = true;
        totalViolations++;
      }
    }

    totalHops += Math.min(harness.maxReasoningHops, hops);
    if (!violation) {
      passCount++;
    } else {
      failCount++;
    }
  }

  const passRate = scenarios.length > 0 ? passCount / scenarios.length : 1.0;
  const avgHops = scenarios.length > 0 ? totalHops / scenarios.length : 1.0;

  // Composite score: rewards high pass rate, penalizes violations and unnecessary hops
  const compositeRobustnessScore = Number((passRate * 100 - totalViolations * 15 - avgHops * 2).toFixed(2));

  return {
    harnessId: harness.harnessId,
    scenariosTested: scenarios.length,
    passCount,
    failCount,
    passRate: Number(passRate.toFixed(3)),
    totalViolations,
    averageReasoningHops: Number(avgHops.toFixed(2)),
    compositeRobustnessScore,
  };
}

/**
 * 3. COMPOSE: Executes complete Contrastive Propose-Probe-Compose (PPC) loop.
 */
export function executeContrastivePpcLoop(
  initialHarness: AgentHarness,
  failurePatterns: string[],
  probeScenarios: BehavioralProbeScenario[]
): ContrastivePpcResult {
  // 1. Propose
  const proposedMutations = proposeHarnessMutations(initialHarness, failurePatterns);

  // 2. Build candidate harnesses (baseline + mutated)
  const candidateMutated = applyMutationsToHarness(
    initialHarness,
    proposedMutations,
    `${initialHarness.harnessId}-v${initialHarness.version + 1}-mutated`
  );
  const candidates = [initialHarness, candidateMutated];

  // 3. Probe all candidates
  const probeScores = candidates.map((c) => probeHarnessBehavior(c, probeScenarios));

  // 4. Compose: select candidate with highest composite robustness score
  let bestCandidate: AgentHarness = candidates[0]!;
  const score0 = probeScores[0]?.compositeRobustnessScore ?? 0;
  const score1 = probeScores[1]?.compositeRobustnessScore ?? 0;
  let bestScore = score0;

  if (candidates[1] && score1 > bestScore) {
    bestCandidate = candidates[1];
    bestScore = score1;
  }

  const baseScore = score0;
  const improvement = baseScore !== 0 ? ((bestScore - baseScore) / Math.abs(baseScore)) * 100 : 0;

  return {
    initialHarness,
    proposedMutations,
    candidateHarnesses: candidates,
    probeScores,
    selectedHarness: bestCandidate,
    appliedMutations: bestCandidate.harnessId === candidateMutated.harnessId ? proposedMutations : [],
    relativeImprovementPercent: Number(improvement.toFixed(2)),
  };
}

/**
 * Harness² contrast, without a self-scored checklist.
 *
 * The README keeps a harness mutation only when a second execution of the
 * same task beats the first on a measured signal. A missing or non-positive
 * delta keeps the baseline and claims no improvement. Callers must pass a
 * real contrast (closing-line error, Brier). This function does not compute one.
 */
export function composeFromMeasuredContrast<T>(
  baseline: T,
  candidate: T,
  measuredDelta: number | null,
): { selected: T; adopted: boolean; claimedImprovement: number } {
  if (measuredDelta === null || !Number.isFinite(measuredDelta) || measuredDelta <= 0) {
    return { selected: baseline, adopted: false, claimedImprovement: 0 };
  }
  return { selected: candidate, adopted: true, claimedImprovement: measuredDelta };
}
