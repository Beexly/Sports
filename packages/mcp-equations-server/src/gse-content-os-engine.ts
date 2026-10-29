/**
 * @file gse-content-os-engine.ts
 * GSE Content OS v1.4 Autonomous Engine
 *
 * Implements the 9-stage pipeline, 18-job automation contracts, tiered gates (Gate 0/1/2),
 * Earshot audio QA, humanization pass (§U6), LLMLingua compression (W-11),
 * untrusted input screening (W-24), W-16 visual pack builder, W-38 approval digest,
 * H48 retention / A-B verdict evaluator, and ECE calibration wording restrictions (W-23).
 *
 * Grounded in:
 * - GSE-CONTENT-OS-2026-10-27 (2).md (v1.0 + v1.1 + v1.2 + v1.3)
 * - CONTENT-STACK-AUDIT-2026-10-28 (1).md (v1.4 amendments & stack audit)
 */

// ============================================================================
// 1. CONSTANTS & THRESHOLDS (v1.2 §2, v1.3 §1/N9, §0.3)
// ============================================================================

export const DEFAULT_CONTENT_OS_THRESHOLDS = {
  // Gate 1 Scored Thresholds (§1A - §1E, §2)
  "gate1.x.composite": 9.2,
  "gate1.x.first_screen_density": 8,
  "gate1.x.bait": 9,
  "gate1.carousel.composite": 9.0,
  "gate1.carousel.hook": 8,
  "gate1.carousel.number_discipline": 9,
  "gate1.carousel.flow": 7,
  "gate1.carousel.design": 8,
  "gate1.carousel.cta": 7,
  "gate1.short_video.composite": 9.0,
  "gate1.short_video.hook": 8.5,
  "gate1.long_video.composite": 9.0,
  "gate1.long_video.hook": 8.5,
  "gate1.long_video.proof_density": 8.5,
  "gate1.article.composite": 8.8,
  "gate1.article.number_discipline": 9,
  "gate1.irreplaceability": 6,
  "gate1.humanity": 6,

  // Rewrite & Kill Bands (§1.4, §2)
  "rewrite.soft_band": 0.7,
  "rewrite.hard_fail": 0.7,
  "gate0.fails_per_piece_day": 2,
  "format.kill_escalation": 3,
  "digest.marginal_flag": 0.3,

  // Gate 0 & Format Integrity Standards (§0C, §2)
  "gate0.graphics.contrast": 4.5,
  "gate0.graphics.min_body_text_px": 28,
  "platform.x.max_chars": 280,
  "platform.ig.max_slides": 20,
  "board.max_plays_per_card": 6,
  "routeA.clip_seconds_min": 2.0,
  "routeA.clip_seconds_max": 4.0,
  "production.held_expiry_hours": 48,

  // Measurement & Verdict Values (Consumed by J9b & J12)
  "measure.verdict_window_h": 48,
  "measure.min_sample.video_carousel": 500,
  "measure.min_sample.x_text": 1000,
  "retention.keep_band": 0.85,
  "retention.change_band_low": 0.70,
  "retention.change_band_high": 0.85,
  "retention.cut_band": 0.70,
  "retention.hook_cut": 0.40,
  "ab.winner_margin": 0.20,

  // Exact N9 corrected spelling — NEVER fakdoor.wait_days (v1.3 §1/N9, E11)
  "fakedoor.wait_days": 3,

  // Calibration Restriction (W-23, §4)
  "calibration.ece_restriction": 0.08,

  // Earshot Audio QA (W-22, §3)
  "earshot.wer_max_pct": 2.0,
  "earshot.music_bed_max_db": -20,

  // LLMLingua Compression Budget (W-11)
  "context.compression_token_budget": 4000
} as const;

export type ContentOsThresholdKey = keyof typeof DEFAULT_CONTENT_OS_THRESHOLDS;

// ============================================================================
// 2. PIECE STATE MACHINE & STATUS TYPES (§0.3, C8, C10)
// ============================================================================

export type PieceStatus =
  | "DRAFTED"
  | "HUMANIZED"
  | "GATED"
  | "AWAITING_SPEND_APPROVAL"
  | "PRODUCED"
  | "SCHEDULED"
  | "APPROVED"
  | "PUBLISHED"
  | "MEASURED"
  | "SCORED"
  | "REWRITE"
  | "HELD"
  | "KILLED";

export type ProductionRoute = "FOOTAGE" | "RENDER" | "HIGGSFIELD" | "TEXT";

/**
 * Enforces legal state transitions across the 9-stage pipeline.
 * Structural rule C10 / W-62: Higgsfield (Route C) pieces at GATED must enter
 * AWAITING_SPEND_APPROVAL before PRODUCED unless spendApproved === true.
 */
export function transitionPieceState(
  current: PieceStatus,
  next: PieceStatus,
  route: ProductionRoute,
  spendApproved?: boolean
): PieceStatus {
  if (current === "KILLED") {
    throw new Error("Cannot transition from terminal state KILLED");
  }

  // Idempotent
  if (current === next) {
    return next;
  }

  // Any non-terminal state may be HELD or KILLED
  if (next === "HELD" || next === "KILLED") {
    return next;
  }

  // Resuming from HELD
  if (current === "HELD") {
    return next;
  }

  switch (current) {
    case "DRAFTED":
      if (next === "HUMANIZED") return next;
      break;

    case "HUMANIZED":
      if (next === "GATED" || next === "REWRITE" || next === "DRAFTED") return next;
      break;

    case "REWRITE":
      // Max 1 loop back to DRAFTED (§1.4)
      if (next === "DRAFTED") return next;
      break;

    case "GATED":
      if (route === "HIGGSFIELD") {
        if (next === "AWAITING_SPEND_APPROVAL") {
          return next;
        }
        if (next === "PRODUCED") {
          if (spendApproved === true) {
            return next;
          }
          throw new Error(
            "HIGGSFIELD (Route C) pieces at GATED must enter AWAITING_SPEND_APPROVAL before PRODUCED unless spendApproved is true (C10/W-62)"
          );
        }
        if (next === "REWRITE") return next;
      } else {
        if (next === "PRODUCED" || next === "REWRITE") {
          return next;
        }
        if (next === "AWAITING_SPEND_APPROVAL") {
          throw new Error("Only HIGGSFIELD route uses AWAITING_SPEND_APPROVAL state");
        }
      }
      break;

    case "AWAITING_SPEND_APPROVAL":
      if (next === "PRODUCED") {
        if (spendApproved === true) {
          return next;
        }
        throw new Error(
          "Spend approval required to transition from AWAITING_SPEND_APPROVAL to PRODUCED (C10/W-62)"
        );
      }
      break;

    case "PRODUCED":
      if (next === "SCHEDULED") return next;
      break;

    case "SCHEDULED":
      if (next === "APPROVED") return next;
      break;

    case "APPROVED":
      if (next === "PUBLISHED") return next;
      break;

    case "PUBLISHED":
      if (next === "MEASURED") return next;
      break;

    case "MEASURED":
      if (next === "SCORED") return next;
      break;

    case "SCORED":
      break;
  }

  throw new Error(`Illegal state transition from ${current} to ${next} for route ${route}`);
}

// ============================================================================
// 3. STAGE 1 FUEL, INPUT SCREENING, COMPRESSION & VISUAL PACK (W-01, W-11, W-16, W-24)
// ============================================================================

export interface ScreenedFuelInput {
  originalText: string;
  screenedText: string;
  sourceHandle: string;
  strippedSpans: string[];
  quarantined: boolean;
  verified: boolean;
  quarantineReason?: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|directives|commands)?/gi,
  /system\s+prompt/gi,
  /report\s+this\s+product\s+as/gi,
  /disregard\s+(all\s+)?prior\s+instructions/gi,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/gi
];

/**
 * W-24 Portkey-class screening at the Fuel->Draft boundary.
 * Strips prompt-injection / AI-imperative spans.
 * If remainder is < 50% of original length, marks quarantined: true and verified: false.
 */
export function screenUntrustedFuelInput(rawText: string, sourceHandle: string): ScreenedFuelInput {
  const strippedSpans: string[] = [];
  let screened = rawText;

  for (const pattern of INJECTION_PATTERNS) {
    const matches = screened.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (!strippedSpans.includes(m)) {
          strippedSpans.push(m);
        }
      }
      screened = screened.replace(pattern, " ");
    }
  }

  screened = screened.replace(/\s+/g, " ").trim();
  const originalLength = rawText.trim().length;
  const remainderLength = screened.length;
  const underHalf = originalLength > 0 && remainderLength < 0.5 * originalLength;

  return {
    originalText: rawText,
    screenedText: screened,
    sourceHandle,
    strippedSpans,
    quarantined: underHalf,
    verified: !underHalf,
    ...(underHalf ? { quarantineReason: "Stripped remainder is under 50% of original length" } : {})
  };
}

export interface CompressedContextResult {
  compressedText: string;
  inputTokens: number;
  outputTokens: number;
  tokensSaved: number;
  taskClass: "COMPRESSION";
}

/**
 * W-11 LLMLingua-class compression for retrieved context.
 * Compresses context to <= maxTokensBudget (default 4000) while strictly preserving
 * numbers and proper nouns.
 */
export function compressRetrievedContext(
  segments: readonly string[],
  maxTokensBudget: number = DEFAULT_CONTENT_OS_THRESHOLDS["context.compression_token_budget"]
): CompressedContextResult {
  const combined = segments.filter(s => s && s.trim().length > 0).join("\n\n");
  const words = combined.split(/\s+/).filter(Boolean);
  const estInputTokens = Math.ceil(words.length * 1.3);

  if (estInputTokens <= maxTokensBudget) {
    return {
      compressedText: combined,
      inputTokens: estInputTokens,
      outputTokens: estInputTokens,
      tokensSaved: 0,
      taskClass: "COMPRESSION"
    };
  }

  // Preserve sentences containing numbers or proper nouns
  const sentences = combined.split(/(?<=[.?!])\s+/);
  const preservedSentences: string[] = [];
  let tokenCount = 0;

  for (const sentence of sentences) {
    const sTokens = Math.ceil(sentence.split(/\s+/).length * 1.3);
    const hasNumber = /\b\d+(\.\d+)?%?|\b[+\-]\d+(\.\d+)?u?\b/.test(sentence);
    const hasProperNoun = /\b[A-Z][a-z]+\b/.test(sentence);

    if (hasNumber || hasProperNoun) {
      if (tokenCount + sTokens <= maxTokensBudget) {
        preservedSentences.push(sentence);
        tokenCount += sTokens;
      }
    }
  }

  // Fill remainder up to budget if space remains
  if (tokenCount < maxTokensBudget) {
    for (const sentence of sentences) {
      if (!preservedSentences.includes(sentence)) {
        const sTokens = Math.ceil(sentence.split(/\s+/).length * 1.3);
        if (tokenCount + sTokens <= maxTokensBudget) {
          preservedSentences.push(sentence);
          tokenCount += sTokens;
        }
      }
    }
  }

  const compressedText = preservedSentences.join(" ");
  const outputTokens = Math.ceil(compressedText.split(/\s+/).filter(Boolean).length * 1.3);
  const tokensSaved = Math.max(0, estInputTokens - outputTokens);

  return {
    compressedText,
    inputTokens: estInputTokens,
    outputTokens,
    tokensSaved,
    taskClass: "COMPRESSION"
  };
}

export interface VisualPackInput {
  gameId: string;
  packetVersion: number;
  matchup: string;
  marketLine: string;
  price: string;
  recordLineUnits: string;
  reasoningOneLiner: string;
  proofStat: string;
}

export interface VisualPackGame {
  readonly gameId: string;
  readonly packetVersion: number;
  readonly matchup: string;
  readonly marketLine: string;
  readonly price: string;
  readonly recordLineUnits: string;
  readonly reasoningOneLiner: string;
  readonly proofStat: string;
  readonly frozenAt: string;
  readonly immutable: true;
}

/**
 * W-16 builds the immutable visual pack JSON for a featured game.
 * All Route B renderers bind to this pack directly, never deriving values.
 */
export function buildVisualPackForGame(input: VisualPackInput): VisualPackGame {
  const pack: VisualPackGame = {
    gameId: input.gameId,
    packetVersion: input.packetVersion,
    matchup: input.matchup,
    marketLine: input.marketLine,
    price: input.price,
    recordLineUnits: input.recordLineUnits,
    reasoningOneLiner: input.reasoningOneLiner,
    proofStat: input.proofStat,
    frozenAt: new Date().toISOString(),
    immutable: true
  };
  return Object.freeze(pack);
}

// ============================================================================
// 4. STAGE 2B HUMANIZATION PASS (J16, Section 4 §U6, C8)
// ============================================================================

export interface HumanizationInput {
  pieceId: string;
  draftText: string;
  hasSpecificNameNumberMoment?: boolean;
  vividImageCount?: number;
  hasUncertaintyBeat?: boolean;
  hasMemoryCallback?: boolean;
  empathyBeatBeforeCta?: boolean;
  variedSentenceRhythm?: boolean;
  passesWarmthFloor?: boolean;
  ctaPresent?: boolean;
}

export interface HumanizationResult {
  pieceId: string;
  nextStatus: "DRAFTED" | "HUMANIZED";
  passed: boolean;
  failedChecks: string[];
  passedChecks: string[];
}

/**
 * Stage 2B Humanization pass (J16).
 * Evaluates the 7 §U6 requirements on a draft.
 * If failedChecks.length >= 3, returns nextStatus: "DRAFTED" (pass failed).
 * Otherwise returns nextStatus: "HUMANIZED".
 */
export function runHumanizationPass(input: HumanizationInput): HumanizationResult {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  // 1. Anyone test: specific name, number, moment
  const hasSpecific =
    input.hasSpecificNameNumberMoment !== undefined
      ? input.hasSpecificNameNumberMoment
      : /[A-Z][a-z]+/.test(input.draftText) && /\b\d+(\.\d+)?\b/.test(input.draftText);
  if (hasSpecific) {
    passedChecks.push("hasSpecificNameNumberMoment");
  } else {
    failedChecks.push("hasSpecificNameNumberMoment");
  }

  // 2. Vivid concrete visual: exactly 1 vivid image
  const vividCount = input.vividImageCount !== undefined ? input.vividImageCount : 1;
  if (vividCount === 1) {
    passedChecks.push("vividImageCount");
  } else {
    failedChecks.push("vividImageCount");
  }

  // 3. Uncertainty beat: honest limit stated plainly
  const hasUncertainty =
    input.hasUncertaintyBeat !== undefined
      ? input.hasUncertaintyBeat
      : /\b(i know|small sample|intent|uncertainty|variance|honest|not a lock|tape says)\b/i.test(
          input.draftText
        );
  if (hasUncertainty) {
    passedChecks.push("hasUncertaintyBeat");
  } else {
    failedChecks.push("hasUncertaintyBeat");
  }

  // 4. Memory callback: references prior position or miss
  const hasMemory =
    input.hasMemoryCallback !== undefined
      ? input.hasMemoryCallback
      : /\b(i was wrong|last week|prior miss|graded ledger|previously|re-checked)\b/i.test(
          input.draftText
        );
  if (hasMemory) {
    passedChecks.push("hasMemoryCallback");
  } else {
    failedChecks.push("hasMemoryCallback");
  }

  // 5. Empathy beat before CTA
  const hasEmpathy =
    input.empathyBeatBeforeCta !== undefined
      ? input.empathyBeatBeforeCta
      : !input.ctaPresent ||
        /\b(bankroll|grind|sweat|tough night|cold week|variance|hard lesson)\b/i.test(
          input.draftText
        );
  if (hasEmpathy) {
    passedChecks.push("empathyBeatBeforeCta");
  } else {
    failedChecks.push("empathyBeatBeforeCta");
  }

  // 6. Varied sentence rhythm: no robot cadence
  const variedRhythm =
    input.variedSentenceRhythm !== undefined ? input.variedSentenceRhythm : true;
  if (variedRhythm) {
    passedChecks.push("variedSentenceRhythm");
  } else {
    failedChecks.push("variedSentenceRhythm");
  }

  // 7. Warmth floor: respect for the grind, player-first
  const hasWarmth =
    input.passesWarmthFloor !== undefined
      ? input.passesWarmthFloor
      : /\b(grind|respect|player-first|work|sweat|earn|honest)\b/i.test(input.draftText);
  if (hasWarmth) {
    passedChecks.push("passesWarmthFloor");
  } else {
    failedChecks.push("passesWarmthFloor");
  }

  const passed = failedChecks.length < 3;
  return {
    pieceId: input.pieceId,
    nextStatus: passed ? "HUMANIZED" : "DRAFTED",
    passed,
    failedChecks,
    passedChecks
  };
}

// ============================================================================
// 5. STAGE 3 TIERED GATE (J4, Gate 0 / 1 / 2, W-20, C7, C11, W-72)
// ============================================================================

export type ContentFormat =
  | "X"
  | "CAROUSEL"
  | "SHORT_VIDEO"
  | "LONG_VIDEO"
  | "ARTICLE"
  | "BOARD"
  | "ROUNDUP"
  | "FILMROOM"
  | "EXPLAINER";

export interface ContentGateInput {
  pieceId: string;
  format: ContentFormat;
  route?: ProductionRoute;
  draftText: string;
  draftNumbers: number[];
  packetNumbers: number[];
  uniqueElement: string; // Must cite U2- or FND-
  uniqueElementInHookOrProof: boolean;
  clipSeconds?: number[]; // Route A: 2.0 <= clipSeconds <= 4.0
  drafterModel: string;
  scorerModel: string;
  scores: {
    composite: number;
    firstScreenDensity?: number;
    bait?: number;
    hook?: number;
    numberDiscipline?: number;
    flow?: number;
    design?: number;
    cta?: number;
    proofDensity?: number;
    irreplaceability: number;
    humanity: number;
  };
  siteMetadata?: {
    hasStructuredData: boolean;
    internalLinksCount: number;
    hasOneSentenceAnswerTop: boolean;
    titleLength: number;
    llmsTxtCurrent: boolean;
  };
}

export interface ContentGateResult {
  pieceId: string;
  gate0: {
    passed: boolean;
    violations: string[];
  };
  gate1: {
    passed: boolean;
    scorerIndependent: boolean;
    composite: number;
    threshold: number;
    verdict: "PASS" | "REWRITE" | "KILL";
    violations: string[];
  };
  gate2: {
    passed: boolean;
    finishItems: string[];
  };
  finalVerdict: "PASS" | "REWRITE" | "KILL";
}

const BANNED_STRINGS = [
  "WE DETECT. YOU DECIDE.",
  "guaranteed",
  "free money",
  "lock of the century",
  "model edge",
  "CLV",
  "algorithm"
];

/**
 * Runs the Tiered Content Gate (Gate 0 deterministic floor -> Gate 1 scoring -> Gate 2 finish).
 */
export function runTieredContentGate(input: ContentGateInput): ContentGateResult {
  const g0Violations: string[] = [];

  // Gate 0A: Numbers check
  for (const num of input.draftNumbers) {
    const match = input.packetNumbers.some(p => Math.abs(p - num) < 0.001);
    if (!match) {
      g0Violations.push(`Number ${num} in draft does not exist in packet numbers`);
    }
  }

  // Gate 0B: Banned strings scan
  const lowerText = input.draftText.toLowerCase();
  for (const banned of BANNED_STRINGS) {
    if (lowerText.includes(banned.toLowerCase())) {
      g0Violations.push(`Banned string detected: "${banned}"`);
    }
  }

  // Gate 0B: Raw dollar unit claims check ($X is forbidden, must be in units 'u')
  if (/\$\s*\d+/.test(input.draftText)) {
    g0Violations.push("Raw dollar amounts forbidden; results must be stated in units (u)");
  }

  // Gate 0C: Uniqueness element check (must cite U2- or FND- and be in hook/proof)
  const isUniqueValid =
    input.uniqueElement &&
    (input.uniqueElement.startsWith("U2-") || input.uniqueElement.startsWith("FND-"));
  if (!isUniqueValid) {
    g0Violations.push(`uniqueElement must cite U2- or FND- (received: "${input.uniqueElement}")`);
  }
  if (!input.uniqueElementInHookOrProof) {
    g0Violations.push("uniqueElement must appear in hook or proof slot");
  }

  // Gate 0C: Route A clip duration check
  if (input.clipSeconds && input.clipSeconds.length > 0) {
    for (const clip of input.clipSeconds) {
      if (clip < 2.0 || clip > 4.0) {
        g0Violations.push(`Route A clip length ${clip}s violates 2.0s - 4.0s bounds`);
      }
    }
  }

  const gate0Passed = g0Violations.length === 0;

  // Gate 1: Scorer Independence and Numeric Scoring
  const g1Violations: string[] = [];
  const scorerIndependent = input.drafterModel !== input.scorerModel;
  if (!scorerIndependent) {
    g1Violations.push(
      `Scorer independence violation: drafterModel (${input.drafterModel}) === scorerModel (${input.scorerModel}) (C11)`
    );
  }

  // Determine format threshold
  let formatThreshold = 9.0;
  let hookFloor = 7.0;

  if (input.format === "X") {
    formatThreshold = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.x.composite"];
    if (
      input.scores.firstScreenDensity !== undefined &&
      input.scores.firstScreenDensity < DEFAULT_CONTENT_OS_THRESHOLDS["gate1.x.first_screen_density"]
    ) {
      g1Violations.push("firstScreenDensity below floor (8)");
    }
    if (
      input.scores.bait !== undefined &&
      input.scores.bait < DEFAULT_CONTENT_OS_THRESHOLDS["gate1.x.bait"]
    ) {
      g1Violations.push("bait below floor (9)");
    }
  } else if (input.format === "CAROUSEL" || input.format === "ROUNDUP") {
    formatThreshold = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.carousel.composite"];
    hookFloor = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.carousel.hook"];
  } else if (input.format === "SHORT_VIDEO" || input.format === "FILMROOM") {
    formatThreshold = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.short_video.composite"];
    hookFloor = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.short_video.hook"];
  } else if (input.format === "LONG_VIDEO") {
    formatThreshold = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.long_video.composite"];
    hookFloor = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.long_video.hook"];
  } else if (input.format === "ARTICLE" || input.format === "BOARD" || input.format === "EXPLAINER") {
    formatThreshold = DEFAULT_CONTENT_OS_THRESHOLDS["gate1.article.composite"];
  }

  // Humanity & Irreplaceability floors
  if (input.scores.irreplaceability < DEFAULT_CONTENT_OS_THRESHOLDS["gate1.irreplaceability"]) {
    g1Violations.push("irreplaceability below floor (6)");
  }
  if (input.scores.humanity < DEFAULT_CONTENT_OS_THRESHOLDS["gate1.humanity"]) {
    g1Violations.push("humanity below floor (6)");
  }
  if (input.scores.hook !== undefined && input.scores.hook < hookFloor) {
    g1Violations.push(`hook score ${input.scores.hook} below floor ${hookFloor}`);
  }

  // Verdict calculation
  let gate1Verdict: "PASS" | "REWRITE" | "KILL" = "KILL";
  const compositeDelta = formatThreshold - input.scores.composite;

  if (scorerIndependent && input.scores.composite >= formatThreshold && g1Violations.length === 0) {
    gate1Verdict = "PASS";
  } else if (
    scorerIndependent &&
    compositeDelta <= DEFAULT_CONTENT_OS_THRESHOLDS["rewrite.soft_band"] &&
    (input.scores.hook === undefined || input.scores.hook >= 7.0)
  ) {
    gate1Verdict = "REWRITE";
  } else {
    gate1Verdict = "KILL";
  }

  const gate1Passed = gate1Verdict === "PASS";

  // Gate 2: Finish & Site Discoverability (W-72)
  const g2FinishItems: string[] = [];
  if (input.siteMetadata) {
    if (!input.siteMetadata.hasStructuredData) {
      g2FinishItems.push("Missing structured data (Schema.org)");
    }
    if (input.siteMetadata.internalLinksCount < 2) {
      g2FinishItems.push("Less than 2 internal links to live GSE pages");
    }
    if (!input.siteMetadata.hasOneSentenceAnswerTop) {
      g2FinishItems.push("Missing one-sentence answer paragraph at top");
    }
    if (input.siteMetadata.titleLength > 60) {
      g2FinishItems.push(`Title length (${input.siteMetadata.titleLength}) exceeds 60 characters`);
    }
    if (!input.siteMetadata.llmsTxtCurrent) {
      g2FinishItems.push("llms.txt at site root is not current");
    }
  }

  const gate2Passed = g2FinishItems.length === 0;

  // Overall final verdict
  let finalVerdict: "PASS" | "REWRITE" | "KILL" = "KILL";
  if (!gate0Passed) {
    finalVerdict = "KILL";
  } else {
    finalVerdict = gate1Verdict;
  }

  return {
    pieceId: input.pieceId,
    gate0: {
      passed: gate0Passed,
      violations: g0Violations
    },
    gate1: {
      passed: gate1Passed,
      scorerIndependent,
      composite: input.scores.composite,
      threshold: formatThreshold,
      verdict: gate1Verdict,
      violations: g1Violations
    },
    gate2: {
      passed: gate2Passed,
      finishItems: g2FinishItems
    },
    finalVerdict
  };
}

// ============================================================================
// 6. STAGE 4 EARSHOT PRODUCE-EXIT AUDIO QA (W-22, §3)
// ============================================================================

export interface EarshotQaInput {
  pieceId: string;
  wordErrorRatePct: number;
  properNounsAndNumeralsExact: boolean;
  voiceprintMatchesReference: boolean;
  musicBedDbUnderNarration: number;
  hasLyricArtifacts: boolean;
}

export interface EarshotQaResult {
  pieceId: string;
  passed: boolean;
  status: "PRODUCED" | "HELD";
  killReason?: string;
  failedChecks: string[];
}

/**
 * Stage 4 Earshot Produce-exit audio QA check (W-22).
 * Verifies transcription accuracy, voiceprint fidelity, and audio bed mix levels.
 */
export function runEarshotProduceExitQa(input: EarshotQaInput): EarshotQaResult {
  const failedChecks: string[] = [];

  if (input.wordErrorRatePct > DEFAULT_CONTENT_OS_THRESHOLDS["earshot.wer_max_pct"]) {
    failedChecks.push(`wordErrorRatePct (${input.wordErrorRatePct}%) > 2.0%`);
  }
  if (!input.properNounsAndNumeralsExact) {
    failedChecks.push("properNounsAndNumeralsExact is false");
  }
  if (!input.voiceprintMatchesReference) {
    failedChecks.push("voiceprintMatchesReference is false");
  }
  if (
    input.musicBedDbUnderNarration > DEFAULT_CONTENT_OS_THRESHOLDS["earshot.music_bed_max_db"]
  ) {
    failedChecks.push(
      `musicBedDbUnderNarration (${input.musicBedDbUnderNarration}dB) > -20dB under narration`
    );
  }
  if (input.hasLyricArtifacts) {
    failedChecks.push("hasLyricArtifacts is true (competes with speech)");
  }

  const passed = failedChecks.length === 0;
  return {
    pieceId: input.pieceId,
    passed,
    status: passed ? "PRODUCED" : "HELD",
    ...(passed ? {} : { killReason: `audio-qa:${failedChecks[0]}` }),
    failedChecks
  };
}

// ============================================================================
// 7. STAGES 6–9 MEASUREMENT VERDICT & CALIBRATION WORDING (W-23, W-38, J9b)
// ============================================================================

export interface H48MeasurementInput {
  pieceId: string;
  format: "X_TEXT" | "VIDEO" | "CAROUSEL" | "ARTICLE";
  sampleSize: number;
  retentionBands5s?: number[];
  hookLossPct?: number;
  abComparison?: {
    kpiA: number;
    kpiB: number;
    versionBIsCheaper: boolean;
  };
}

export interface H48VerdictResult {
  pieceId: string;
  verdict: "KEEP" | "CHANGE" | "CUT" | "NO_CALL";
  abVerdict?: "WINNER_A" | "WINNER_B" | "NO_WINNER";
  defaultVersion?: "A" | "B";
  reQueue: boolean;
  passageVerdicts?: Array<{ bandIndex: number; holdRatio: number; call: "KEEP" | "CHANGE" | "CUT" }>;
  reason?: string;
}

/**
 * Stage 8 H48 measurement verdict calculation (J9b).
 * Enforces minimum sample sizes, 5-second retention bands, and A/B lift margins.
 */
export function evaluateH48MeasurementVerdict(input: H48MeasurementInput): H48VerdictResult {
  const minSample =
    input.format === "X_TEXT"
      ? DEFAULT_CONTENT_OS_THRESHOLDS["measure.min_sample.x_text"]
      : DEFAULT_CONTENT_OS_THRESHOLDS["measure.min_sample.video_carousel"];

  if (input.sampleSize < minSample) {
    return {
      pieceId: input.pieceId,
      verdict: "NO_CALL",
      reQueue: true,
      reason: `Sample size ${input.sampleSize} is below required minimum ${minSample}`
    };
  }

  // Hook loss cut check (> 40% loss in first 0-3s)
  if (
    input.hookLossPct !== undefined &&
    input.hookLossPct > DEFAULT_CONTENT_OS_THRESHOLDS["retention.hook_cut"]
  ) {
    return {
      pieceId: input.pieceId,
      verdict: "CUT",
      reQueue: false,
      reason: `Hook band lost ${(input.hookLossPct * 100).toFixed(1)}% of viewers (>40%)`
    };
  }

  // 5-second retention band holds
  const passageVerdicts: Array<{ bandIndex: number; holdRatio: number; call: "KEEP" | "CHANGE" | "CUT" }> = [];
  let worstCall: "KEEP" | "CHANGE" | "CUT" = "KEEP";

  if (input.retentionBands5s && input.retentionBands5s.length > 1) {
    for (let i = 1; i < input.retentionBands5s.length; i++) {
      const prev = input.retentionBands5s[i - 1];
      const curr = input.retentionBands5s[i];
      const holdRatio = prev > 0 ? curr / prev : 0;

      let call: "KEEP" | "CHANGE" | "CUT" = "KEEP";
      if (holdRatio < DEFAULT_CONTENT_OS_THRESHOLDS["retention.cut_band"]) {
        call = "CUT";
        worstCall = "CUT";
      } else if (holdRatio < DEFAULT_CONTENT_OS_THRESHOLDS["retention.change_band_high"]) {
        call = "CHANGE";
        if (worstCall !== "CUT") worstCall = "CHANGE";
      }
      passageVerdicts.push({ bandIndex: i, holdRatio, call });
    }
  }

  // A/B comparison lift
  let abVerdict: "WINNER_A" | "WINNER_B" | "NO_WINNER" | undefined = undefined;
  let defaultVersion: "A" | "B" | undefined = undefined;

  if (input.abComparison) {
    const { kpiA, kpiB, versionBIsCheaper } = input.abComparison;
    if (kpiB > kpiA) {
      const lift = kpiA > 0 ? (kpiB - kpiA) / kpiA : 1.0;
      if (lift >= DEFAULT_CONTENT_OS_THRESHOLDS["ab.winner_margin"]) {
        abVerdict = "WINNER_B";
      } else {
        abVerdict = "NO_WINNER";
        defaultVersion = versionBIsCheaper ? "B" : "A";
      }
    } else if (kpiA > kpiB) {
      const lift = kpiB > 0 ? (kpiA - kpiB) / kpiB : 1.0;
      if (lift >= DEFAULT_CONTENT_OS_THRESHOLDS["ab.winner_margin"]) {
        abVerdict = "WINNER_A";
      } else {
        abVerdict = "NO_WINNER";
        defaultVersion = versionBIsCheaper ? "B" : "A";
      }
    } else {
      abVerdict = "NO_WINNER";
      defaultVersion = versionBIsCheaper ? "B" : "A";
    }
  }

  return {
    pieceId: input.pieceId,
    verdict: worstCall,
    abVerdict,
    defaultVersion,
    reQueue: false,
    passageVerdicts
  };
}

export interface EceWordingBandResult {
  ece: number;
  gradedPlaysCount: number;
  band: "UNRESTRICTED_CONFIDENCE_LANGUAGE" | "RESTRICTED_NUMERIC_PROB_ONLY";
  allowConfidenceWords: boolean;
  numericProbabilityOnly: boolean;
}

/**
 * W-23 Calibration wording band evaluator.
 * While ECE <= 0.08, pieces may use unrestricted confidence language.
 * While ECE > 0.08, pieces are restricted to numeric probabilities only.
 */
export function evaluateEceCalibrationWordingBand(input: {
  ece: number;
  gradedPlaysCount: number;
}): EceWordingBandResult {
  const isRestricted = input.ece > DEFAULT_CONTENT_OS_THRESHOLDS["calibration.ece_restriction"];
  return {
    ece: input.ece,
    gradedPlaysCount: input.gradedPlaysCount,
    band: isRestricted ? "RESTRICTED_NUMERIC_PROB_ONLY" : "UNRESTRICTED_CONFIDENCE_LANGUAGE",
    allowConfidenceWords: !isRestricted,
    numericProbabilityOnly: isRestricted
  };
}

export interface ApprovalDigestPiece {
  pieceId: string;
  format: string;
  route: ProductionRoute;
  hookText: string;
  uniqueElement: string;
  gate1Composite: number;
  scores: Record<string, number | undefined>;
  surfacesCount: number;
  costToDateUsd: number;
  routeRiskFlag?: "FOOTAGE-RISK" | "HF-SPEND" | "OAUTH-UNVERIFIED";
  status: PieceStatus;
  killReason?: string;
}

export interface ApprovalDigestResult {
  digestMarkdown: string;
  activeCount: number;
  heldCount: number;
  killedCount: number;
}

/**
 * W-38 / Opt-U24 daily approval digest builder for Garrett's single tap.
 * Sorted by Gate 1 composite descending.
 */
export function generateApprovalDigest(
  pieces: ApprovalDigestPiece[],
  options?: { yesterdayRecordLine?: string; date?: string }
): ApprovalDigestResult {
  const dateStr = options?.date || new Date().toISOString().split("T")[0];
  const activePieces = pieces
    .filter(p => p.status !== "HELD" && p.status !== "KILLED")
    .sort((a, b) => b.gate1Composite - a.gate1Composite);

  const heldPieces = pieces.filter(p => p.status === "HELD");
  const killedPieces = pieces.filter(p => p.status === "KILLED");

  let md = `# GALAXY SPORTS EDGE — APPROVAL DIGEST (${dateStr})\n\n`;
  md += `## PENDING PIECES (SORTED BY GATE 1 COMPOSITE)\n\n`;

  if (activePieces.length === 0) {
    md += `_No pending pieces in batch._\n\n`;
  } else {
    for (const p of activePieces) {
      const hookWords = p.hookText.trim().split(/\s+/).slice(0, 12).join(" ");
      const isMarginal = Object.entries(p.scores).some(([dim, val]) => {
        if (val === undefined) return false;
        // Flag if within 0.3 of a floor
        return val >= 6.0 && val <= 6.3;
      });
      const marginalTag = isMarginal ? ` [MARGINAL — KILL CANDIDATE]` : "";
      const riskTag = p.routeRiskFlag ? ` [${p.routeRiskFlag}]` : "";

      md += `- **${p.pieceId}** | ${p.format} | ${p.route} | "${hookWords}..." | ${p.uniqueElement} | Composite: ${p.gate1Composite.toFixed(1)}${marginalTag} | Surfaces: ${p.surfacesCount} | Cost: $${p.costToDateUsd.toFixed(2)}${riskTag}\n`;
    }
    md += `\n`;
  }

  md += `## HELD PIECES (${heldPieces.length})\n\n`;
  for (const h of heldPieces) {
    md += `- **${h.pieceId}**: Reason: ${h.killReason || "HELD awaiting manual review"}\n`;
  }
  md += `\n`;

  md += `## KILLED PIECES (${killedPieces.length})\n\n`;
  for (const k of killedPieces) {
    md += `- **${k.pieceId}**: Reason: ${k.killReason || "Floor violation / hard fail"}\n`;
  }
  md += `\n`;

  if (options?.yesterdayRecordLine) {
    md += `## GRADED RECORD LINE\n${options.yesterdayRecordLine}\n\n`;
  }

  return {
    digestMarkdown: md,
    activeCount: activePieces.length,
    heldCount: heldPieces.length,
    killedCount: killedPieces.length
  };
}
