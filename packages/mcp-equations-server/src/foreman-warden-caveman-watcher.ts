/**
 * Foreman Arbiter, Token Warden, Caveman Compressor & Free-Tier Canary Watcher
 * ==============================================================================
 * Implements fleet governance systems from the consolidated research archive
 * (`docs/data-sources/research/2026-10-29/INSTAGRAM-ALL-SWEEPS-CONSOLIDATED.md`):
 *
 * 1. Stream E2 Foreman Deterministic Arbiter (`thruwire/foreman`):
 *    - 10-check deterministic priority arbiter (1000 down to 0) with the hard
 *      Evidence-Gated FINISH Race Fix (blocking premature finish before verification).
 *
 * 2. Stream E3 22-Watch Free-Tier & Provider Canary Watcher:
 *    - Real-time hash drift and canary health evaluator across directory, provider, and meta watches.
 *
 * 3. Stream D-1 Token Warden Budget Guard & Caveman Frugal Prompt Compressor:
 *    - Budget utilization state transitions (OK -> SOFT_ALERT >= 0.70 -> HARD_PAUSE >= 0.90 -> QUEUE_FREEZE >= 1.00).
 *    - Caveman token compressor: strips polite filler and prose articles across lite/full/ultra modes
 *      while rigorously preserving numbers, mathematical expressions, and code identifiers.
 */

export interface ForemanArbiterInput {
  humanEscalationRequested?: boolean;
  invariantViolation?: boolean;
  loopBounceCount: number;
  budgetExhausted?: boolean;
  verificationStarted: boolean;
  verificationCompleted: boolean;
  verificationPassed: boolean;
  retryableErrorCount: number;
  pendingSubagentHandoff?: boolean;
  taskWorkCompleted: boolean;
}

export type ForemanDecision =
  | "ESCALATE_HUMAN"
  | "ABORT_INVARIANT"
  | "BREAK_LOOP_BOUNCE"
  | "HALT_BUDGET"
  | "REPAIR_FAILED_VERIFICATION"
  | "CONTINUE_VERIFY_LOCK"
  | "RETRY_STEP"
  | "DELEGATE_SUBAGENT"
  | "FINISH_VERIFIED"
  | "CONTINUE_WORK";

export interface ForemanArbiterResult {
  priority: number;
  decision: ForemanDecision;
  raceConditionBlocked: boolean;
}

/**
 * Evaluates the 10-check Foreman deterministic priority arbiter (1000 down to 0),
 * strictly enforcing the Evidence-Gated FINISH guard to prevent race conditions
 * where work is claimed complete before verification has completed.
 */
export function evaluateForeman10CheckDeterministicArbiter(
  input: ForemanArbiterInput
): ForemanArbiterResult {
  const raceConditionBlocked = Boolean(
    input.taskWorkCompleted &&
      (!input.verificationStarted || !input.verificationCompleted)
  );

  // Check 1 (Priority 1000): Explicit human escalation request
  if (input.humanEscalationRequested) {
    return { priority: 1000, decision: "ESCALATE_HUMAN", raceConditionBlocked };
  }

  // Check 2 (Priority 900): Invariant or safety violation
  if (input.invariantViolation) {
    return { priority: 900, decision: "ABORT_INVARIANT", raceConditionBlocked };
  }

  // Check 3 (Priority 800): Repeated loop bounce detection
  if (input.loopBounceCount >= 3) {
    return { priority: 800, decision: "BREAK_LOOP_BOUNCE", raceConditionBlocked };
  }

  // Check 4 (Priority 700): Spend/token budget exhaustion
  if (input.budgetExhausted) {
    return { priority: 700, decision: "HALT_BUDGET", raceConditionBlocked };
  }

  // Check 5 (Priority 600): Verification ran and failed
  if (input.verificationCompleted && !input.verificationPassed) {
    return {
      priority: 600,
      decision: "REPAIR_FAILED_VERIFICATION",
      raceConditionBlocked,
    };
  }

  // Check 6 (Priority 500): Work claimed complete but verification not started or not completed
  // (Hard race-condition guard: NEVER allow FINISH before verification completes!)
  if (
    input.taskWorkCompleted &&
    (!input.verificationStarted || !input.verificationCompleted)
  ) {
    return {
      priority: 500,
      decision: "CONTINUE_VERIFY_LOCK",
      raceConditionBlocked: true,
    };
  }

  // Check 7 (Priority 400): Retryable transient error bounded below threshold
  if (input.retryableErrorCount > 0 && input.retryableErrorCount < 3) {
    return { priority: 400, decision: "RETRY_STEP", raceConditionBlocked };
  }

  // Check 8 (Priority 300): Work awaiting subagent delegation handoff
  if (input.pendingSubagentHandoff) {
    return { priority: 300, decision: "DELEGATE_SUBAGENT", raceConditionBlocked };
  }

  // Check 9 (Priority 100): Work completed AND fully verified green
  if (
    input.taskWorkCompleted &&
    input.verificationStarted &&
    input.verificationCompleted &&
    input.verificationPassed
  ) {
    return { priority: 100, decision: "FINISH_VERIFIED", raceConditionBlocked: false };
  }

  // Check 10 (Priority 0): Default continuation of normal in-progress work
  return { priority: 0, decision: "CONTINUE_WORK", raceConditionBlocked };
}

export interface WatchItem {
  id: string;
  category: "DIRECTORY" | "PROVIDER" | "META";
  previousHash: string;
  currentHash: string;
  canaryLatencyMs: number;
  canaryHealthy: boolean;
}

export interface FreeTierCanaryScanResult {
  totalWatches: number;
  changedWatchIds: string[];
  unhealthyWatchIds: string[];
  allCanariesHealthy: boolean;
}

/**
 * Runs a 22-watch free-tier and provider canary scan, detecting drift in content hashes
 * and reporting provider latency/unhealthy status.
 */
export function runFreeTier22WatchCanaryScan(
  watches: readonly WatchItem[]
): FreeTierCanaryScanResult {
  const changedWatchIds: string[] = [];
  const unhealthyWatchIds: string[] = [];

  for (const w of watches) {
    if (w.previousHash !== w.currentHash) {
      changedWatchIds.push(w.id);
    }
    if (!w.canaryHealthy) {
      unhealthyWatchIds.push(w.id);
    }
  }

  return {
    totalWatches: watches.length,
    changedWatchIds,
    unhealthyWatchIds,
    allCanariesHealthy: unhealthyWatchIds.length === 0,
  };
}

export interface TokenWardenCavemanInput {
  agentId: string;
  spentUsd: number;
  budgetUsd: number;
  rawPrompt: string;
  mode: "lite" | "full" | "ultra";
}

export type BudgetState = "OK" | "SOFT_ALERT" | "HARD_PAUSE" | "QUEUE_FREEZE";

export interface TokenWardenCavemanResult {
  agentId: string;
  utilizationRatio: number;
  budgetState: BudgetState;
  compressedPrompt: string;
  tokenSavingsEstimatePct: number;
}

/**
 * Strips polite filler phrases and prose stop words while strictly preserving
 * numbers, mathematical equations, and code identifiers.
 */
export function compressPromptCaveman(
  prompt: string,
  mode: "lite" | "full" | "ultra"
): string {
  if (!prompt || prompt.trim().length === 0) {
    return "";
  }

  let text = prompt;

  // 1. Polite filler phrases to strip across all modes
  const courtesyPatterns = [
    /\b(?:could\s+you\s+please|would\s+you\s+mind(?:\s+to)?|i\s+would\s+appreciate\s+if\s+you\s+could)\b/gi,
    /\b(?:thank\s+you\s+(?:very\s+much|so\s+much)?|thanks\s+(?:a\s+lot|so\s+much)?)\b/gi,
    /\b(?:hello\s+there|good\s+(?:morning|afternoon|evening)|hi\s+there|hello|hey|hi)\b/gi,
    /\b(?:please|kindly|feel\s+free\s+to|in\s+order\s+to)\b/gi,
  ];

  for (const pattern of courtesyPatterns) {
    text = text.replace(pattern, " ");
  }

  if (mode === "lite") {
    return normalizeWhitespace(text);
  }

  // 2. Stop words sets for full and ultra modes
  const fullWordsList = [
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "and",
    "in", "that", "it", "for", "with", "as", "by", "at", "on", "from",
  ];

  const ultraWordsList = [
    ...fullWordsList,
    "i", "we", "you", "they", "he", "she", "me", "us", "them", "him", "her",
    "my", "our", "your", "their", "his", "this", "these", "those",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "can", "could", "will", "would", "should", "shall", "may", "might", "must",
    "just", "really", "very", "also", "then", "now",
  ];

  const fullStopWords = new Set(fullWordsList);
  const ultraStopWords = new Set(ultraWordsList);

  const targetStopWords = mode === "ultra" ? ultraStopWords : fullStopWords;

  // Tokenize preserving equations, numbers, code identifiers, and strings
  const tokens = text.split(/(\s+)/);
  const filteredTokens: string[] = [];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      filteredTokens.push(token);
      continue;
    }

    // Preserve quoted strings or backticks
    if (/^[`'"].*[`'"]$/.test(token)) {
      filteredTokens.push(token);
      continue;
    }

    // Preserve equations and math/logic operators: =, <, >, +, -, *, /, &, |, !, ^
    if (/[=<>+\-*\/&|!^]/.test(token)) {
      filteredTokens.push(token);
      continue;
    }

    // Preserve numbers, percentages, and scientific notation
    if (/^[+-]?\d+(?:\.\d+)*(?:%|[eE][+-]?\d+)?(?:[.,;:!?])?$/.test(token)) {
      filteredTokens.push(token);
      continue;
    }

    // Preserve code identifiers: snake_case, kebab-case, camelCase, PascalCase, or function calls
    const cleanWord = token.replace(/^[^\w]+|[^\w]+$/g, "");
    const isCodeIdentifier =
      cleanWord.includes("_") ||
      cleanWord.includes("-") ||
      cleanWord.includes(".") ||
      cleanWord.includes("(") ||
      cleanWord.includes(")") ||
      cleanWord.includes("/") ||
      cleanWord.includes("\\") ||
      /[a-z][A-Z]/.test(cleanWord) ||
      (cleanWord.length > 1 &&
        cleanWord === cleanWord.toUpperCase() &&
        /^[A-Z0-9_]+$/.test(cleanWord));

    if (isCodeIdentifier) {
      filteredTokens.push(token);
      continue;
    }

    // If clean word is a filler stop word, strip it (preserving trailing punctuation if any)
    if (targetStopWords.has(cleanWord.toLowerCase())) {
      const trailingPunct = token.match(/[.,;:!?]+$/);
      if (trailingPunct && trailingPunct[0]) {
        filteredTokens.push(trailingPunct[0]);
      }
      continue;
    }

    filteredTokens.push(token);
  }

  return normalizeWhitespace(filteredTokens.join(""));
}

function normalizeWhitespace(str: string): string {
  return str
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/**
 * Implements Token Warden budget guard with softAlert/hardPause/queueFreeze states,
 * coupled with Caveman prompt compression to conserve fleet token spend.
 */
export function evaluateTokenWardenAndCavemanCompression(
  input: TokenWardenCavemanInput
): TokenWardenCavemanResult {
  const utilizationRatio = Number(
    (input.spentUsd / Math.max(1e-6, input.budgetUsd)).toFixed(3)
  );

  let budgetState: BudgetState = "OK";
  if (utilizationRatio >= 1.0) {
    budgetState = "QUEUE_FREEZE";
  } else if (utilizationRatio >= 0.9) {
    budgetState = "HARD_PAUSE";
  } else if (utilizationRatio >= 0.7) {
    budgetState = "SOFT_ALERT";
  } else {
    budgetState = "OK";
  }

  const compressedPrompt = compressPromptCaveman(input.rawPrompt, input.mode);
  const originalLength = input.rawPrompt.length;
  const compressedLength = compressedPrompt.length;

  const tokenSavingsEstimatePct =
    originalLength > 0
      ? Number(
          (
            Math.max(0, 1 - compressedLength / originalLength) * 100
          ).toFixed(1)
        )
      : 0;

  return {
    agentId: input.agentId,
    utilizationRatio,
    budgetState,
    compressedPrompt,
    tokenSavingsEstimatePct,
  };
}
