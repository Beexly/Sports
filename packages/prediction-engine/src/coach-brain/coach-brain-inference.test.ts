import { describe, it, expect } from 'vitest';
import {
  buildCoachBrainSystemPrompt,
  buildCoachBrainUserPrompt,
  validateCoachBrainResponse,
  runCoachBrainInference,
  CoachBrainGuardrails,
  InferencePromptContext
} from './coach-brain-inference.js';

describe('Coach Brain LLM Inference Engine & Neuro-Symbolic Guardrails', () => {
  const mockMerkle = '23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b';

  it('injects active Tuesday locked Merkle root into system prompt', () => {
    const sys = buildCoachBrainSystemPrompt(mockMerkle);
    expect(sys).toContain(`SEALED MERKLE ROOT: ${mockMerkle}`);
    expect(sys).toContain('GSE Coach Brain v1.0');
  });

  it('formats user prompt with matchup, baseline win prob, and situation', () => {
    const ctx: InferencePromptContext = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      homeTeam: 'CHI',
      awayTeam: 'NE',
      calibratedProb: 0.582,
      coachBaselineSnippet: 'neutralPassRate: 0.61, staffAggression: 0.74',
      situation: '3rd & 4 at NE 35, trailing 13-14 in Q3',
      activeInjuries: ['Tyreek Hill']
    };
    const userPrompt = buildCoachBrainUserPrompt(ctx);
    expect(userPrompt).toContain('NE @ CHI (Game ID: 2026_W07_CHI_NE)');
    expect(userPrompt).toContain('58.2%');
    expect(userPrompt).toContain('neutralPassRate: 0.61');
    expect(userPrompt).toContain('Active Verified Injuries: Tyreek Hill');
  });

  it('validates compliant response matching calibrated probability and coach tendencies', () => {
    const guardrails: CoachBrainGuardrails = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      calibratedProb: 0.582,
      tolerance: 0.05,
      expectedTendencies: ['neutralPassRate', 'staffAggression'],
      allowedInjuries: ['Tyreek Hill']
    };

    const compliantResponse = [
      '### Causal Breakdown',
      'Bears staffAggression of 0.74 dictates high 4th-down conversion willingness.',
      'neutralPassRate of 0.61 indicates spread passing attacks on early downs.',
      'Accounting for Tyreek Hill absence, our calibrated probability is 58.2% win rate for CHI.'
    ].join('\n');

    const result = validateCoachBrainResponse(compliantResponse, guardrails);
    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.extractedProb).toBeCloseTo(0.582, 3);
    expect(result.citedTendencies).toContain('staffAggression');
    expect(result.citedTendencies).toContain('neutralPassRate');
  });

  it('rejects hallucinated probabilities diverging beyond tolerance', () => {
    const guardrails: CoachBrainGuardrails = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      calibratedProb: 0.582,
      tolerance: 0.05,
      expectedTendencies: ['neutralPassRate']
    };

    const badResponse = 'Based on our analysis, the win probability is 78.5% with neutralPassRate active.';
    const result = validateCoachBrainResponse(badResponse, guardrails);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('Hallucinated probability violation'))).toBe(true);
  });

  it('rejects ungrounded injury hallucinations not in the allowed overlay', () => {
    const guardrails: CoachBrainGuardrails = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      calibratedProb: 0.582,
      expectedTendencies: ['staffAggression'],
      allowedInjuries: [] // No injuries allowed
    };

    const hallucinatedResponse = [
      'staffAggression is 0.74.',
      'However, Christian McCaffrey being sidelined alters the offensive balance.',
      'Calibrated probability remains 58.0%.'
    ].join('\n');

    const result = validateCoachBrainResponse(hallucinatedResponse, guardrails);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.includes('Ungrounded injury hallucination'))).toBe(true);
  });

  it('executes runCoachBrainInference with client and signs output with Merkle state', async () => {
    const ctx: InferencePromptContext = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      homeTeam: 'CHI',
      awayTeam: 'NE',
      calibratedProb: 0.582,
      coachBaselineSnippet: 'staffAggression: 0.74',
      situation: 'Red Zone'
    };
    const guardrails: CoachBrainGuardrails = {
      merkleRoot: mockMerkle,
      gameId: '2026_W07_CHI_NE',
      calibratedProb: 0.582,
      expectedTendencies: ['staffAggression']
    };

    const mockClient = {
      complete: async () => 'staffAggression dominates red-zone play. Projected probability: 58.2%.'
    };

    const output = await runCoachBrainInference(mockClient, ctx, guardrails);
    expect(output.validation.valid).toBe(true);
    expect(output.signature).toHaveLength(64);
  });
});
