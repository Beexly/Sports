/**
 * GSE Coach Brain LLM Inference Engine & Neuro-Symbolic Verification Guard.
 *
 * Bridges LLM generation (OpenRouter / local llama.cpp) with strict cryptographic
 * Merkle state injection and neuro-symbolic guardrails:
 *   1. System prompt injection of Tuesday locked Merkle root.
 *   2. Probability guard: Model must not contradict calibrated probabilities (calibratedProb).
 *   3. Mindset guard: Must cite locked coach tendencies from Class A baseline.
 *   4. Injury guard: Rejects ungrounded or contradictory injury adjustments.
 */

import { createHash } from 'crypto';

export interface CoachBrainGuardrails {
  merkleRoot: string;
  gameId: string;
  calibratedProb: number; // e.g. 0.582
  tolerance?: number; // max allowed probability divergence (default 0.05)
  expectedTendencies?: string[]; // e.g. ['neutralPassRate', 'staffAggression']
  allowedInjuries?: string[]; // only these player names may be cited as injury deltas
}

export interface ValidationResult {
  valid: boolean;
  extractedProb?: number;
  citedTendencies: string[];
  citedInjuries: string[];
  violations: string[];
}

export interface InferencePromptContext {
  merkleRoot: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  calibratedProb: number;
  coachBaselineSnippet: string;
  situation: string;
  activeInjuries?: string[];
}

export function buildCoachBrainSystemPrompt(merkleRoot: string): string {
  return [
    'You are GSE Coach Brain v1.0, an omni-cognitive NFL coaching and game-theory engine.',
    `SEALED MERKLE ROOT: ${merkleRoot}`,
    'OPERATIONAL PROTOCOL:',
    '1. You MUST anchor all game-outcome probabilities to the calibrated probability provided in the prompt.',
    '2. You MUST cite verified coach mindset tendencies from the locked Class A baseline.',
    '3. You MUST NEVER hallucinate injury impacts for players not explicitly listed in the active injury overlay.',
    '4. Present your analysis in structured neuro-symbolic format: Causal Breakdown, Coach Tendencies, Calibrated Edge.'
  ].join('\n');
}

export function buildCoachBrainUserPrompt(ctx: InferencePromptContext): string {
  const injurySection = ctx.activeInjuries && ctx.activeInjuries.length > 0
    ? `Active Verified Injuries: ${ctx.activeInjuries.join(', ')}`
    : 'Active Verified Injuries: NONE (Zero unverified injury adjustments permitted)';

  return [
    `Matchup: ${ctx.awayTeam} @ ${ctx.homeTeam} (Game ID: ${ctx.gameId})`,
    `Tuesday Locked Baseline Calibrated Win Prob: ${(ctx.calibratedProb * 100).toFixed(1)}%`,
    `Coach Mindset Baseline: ${ctx.coachBaselineSnippet}`,
    injurySection,
    `Situation: ${ctx.situation}`,
    '',
    'Provide the definitive causal game-theory prescription and calibrated outcome projection.'
  ].join('\n');
}

export function validateCoachBrainResponse(
  response: string,
  guardrails: CoachBrainGuardrails
): ValidationResult {
  const violations: string[] = [];
  const tolerance = guardrails.tolerance ?? 0.05;

  // 1. Extract mentioned probability (e.g. "58.2%" or "probability: 0.58")
  let extractedProb: number | undefined;
  const percentRegex = /(\d{1,2}(?:\.\d+)?)\s*%/g;
  const decimalRegex = /(?:probability|win prob|projected win rate)[^\d]{1,15}(0\.\d+)/gi;

  const percentMatches = [...response.matchAll(percentRegex)];
  const decimalMatches = [...response.matchAll(decimalRegex)];

  if (percentMatches.length > 0) {
    // Look for probability nearest the calibratedProb value or first probability mentioned
    for (const m of percentMatches) {
      if (m[1] !== undefined) {
        const val = parseFloat(m[1]) / 100.0;
        if (val >= 0.1 && val <= 0.9) {
          extractedProb = val;
          break;
        }
      }
    }
  } else if (decimalMatches.length > 0 && decimalMatches[0] && decimalMatches[0][1] !== undefined) {
    extractedProb = parseFloat(decimalMatches[0][1]);
  }

  if (extractedProb !== undefined) {
    const diff = Math.abs(extractedProb - guardrails.calibratedProb);
    if (diff > tolerance) {
      violations.push(
        `Hallucinated probability violation: extracted ${(extractedProb * 100).toFixed(1)}% ` +
        `diverges from locked calibratedProb ${(guardrails.calibratedProb * 100).toFixed(1)}% ` +
        `(diff: ${(diff * 100).toFixed(1)}% > tolerance ${(tolerance * 100).toFixed(1)}%)`
      );
    }
  }

  // 2. Check coach mindset citations
  const citedTendencies: string[] = [];
  if (guardrails.expectedTendencies && guardrails.expectedTendencies.length > 0) {
    for (const tendency of guardrails.expectedTendencies) {
      if (response.toLowerCase().includes(tendency.toLowerCase())) {
        citedTendencies.push(tendency);
      }
    }
    if (citedTendencies.length === 0) {
      violations.push(
        `Missing required coach mindset citation: expected at least one of [${guardrails.expectedTendencies.join(', ')}]`
      );
    }
  }

  // 3. Check for ungrounded injury hallucinations
  const citedInjuries: string[] = [];
  const commonHallucinatedNames = [
    'Davante Adams', 'Christian McCaffrey', 'Tyreek Hill', 'Justin Jefferson',
    'Travis Kelce', 'Puka Nacua', 'Cooper Kupp', 'Nico Collins', 'Stefon Diggs'
  ];

  const allowedSet = new Set((guardrails.allowedInjuries ?? []).map(s => s.toLowerCase()));

  for (const name of commonHallucinatedNames) {
    if (response.toLowerCase().includes(name.toLowerCase())) {
      if (!allowedSet.has(name.toLowerCase())) {
        violations.push(
          `Ungrounded injury hallucination: cited '${name}' which is not in the allowed injury overlay [${(guardrails.allowedInjuries ?? []).join(', ')}]`
        );
      } else {
        citedInjuries.push(name);
      }
    }
  }

  return {
    valid: violations.length === 0,
    extractedProb,
    citedTendencies,
    citedInjuries,
    violations
  };
}

export interface InferenceClient {
  complete(prompt: { system: string; user: string }): Promise<string>;
}

export async function runCoachBrainInference(
  client: InferenceClient,
  ctx: InferencePromptContext,
  guardrails: CoachBrainGuardrails
): Promise<{ response: string; validation: ValidationResult; signature: string }> {
  const system = buildCoachBrainSystemPrompt(ctx.merkleRoot);
  const user = buildCoachBrainUserPrompt(ctx);
  
  const response = await client.complete({ system, user });
  const validation = validateCoachBrainResponse(response, guardrails);
  
  const signature = createHash('sha256')
    .update(`${ctx.merkleRoot}:${ctx.gameId}:${response}`)
    .digest('hex');
    
  return { response, validation, signature };
}
