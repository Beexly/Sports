import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { scoreActivationRoi } from '../../../lib/statking/activation-roi';
import { canFeedActiveMetric, rightsGateLabel } from '../../../lib/statking/rights';
import { classifyMetricReliability } from '../../../lib/statking/proof';
import { explainPlayerScore } from '../../../lib/statking/explanations';
import { loadActivationRoi, loadIntegrityStatus, loadKingGapMap, loadMetricReliability, loadReadinessScores, loadRightsLedger, loadUiContracts } from '../lib/statking/product';

const root = path.resolve(__dirname, '../../..');
const readJson = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as T;

describe('Autonomous StatKing integrity and build sprint', () => {
  it('records integrity gate status and merge recommendation', () => {
    const status = loadIntegrityStatus();
    expect(status.commands.length).toBeGreaterThanOrEqual(5);
    expect(status.final_recommendation).toContain('Merge');
  });

  it('enforces rights gates for active metrics', () => {
    const ledger = loadRightsLedger();
    const metadataOnly = ledger.rights.find((source) => source.source_mode === 'media_metadata' || source.source_mode === 'metadata_only') as any;
    const licenseRequired = ledger.rights.find((source) => source.source_mode === 'activation_license') as any;
    expect(canFeedActiveMetric(metadataOnly)).toBe(false);
    expect(canFeedActiveMetric(licenseRequired)).toBe(false);
    expect(metadataOnly).toBeTruthy();
    expect(rightsGateLabel(metadataOnly)).toContain('metadata');
  });

  it('generates activation ROI, King gaps, proof, and readiness artifacts', () => {
    const roi = loadActivationRoi();
    expect((roi.top_25_activate_now ?? []).length).toBe(25);
    expect(loadKingGapMap().gaps.length).toBeGreaterThanOrEqual(18);
    expect(loadMetricReliability().metrics.length).toBeGreaterThanOrEqual(75);
    expect(loadReadinessScores().pages.length).toBeGreaterThanOrEqual(10);
  });

  it('classifies proof and produces explanations', () => {
    expect(scoreActivationRoi({ value: 90, moat: 80, rightsClarity: 70, technicalComplexity: 30, coverageGain: 85, freshness: 75 })).toBeGreaterThan(70);
    expect(classifyMetricReliability({ stability: 'high', noise_level: 'low' })).toBe('strong');
    expect(explainPlayerScore({ name: 'Sample Player', score: 88, confidence: 76, missingData: ['tracking'] }).missing_data_warning).toContain('tracking');
  });

  it('validates media, expert, owned-signal, and Claude UI contracts', () => {
    expect(readJson<{items: unknown[]}>('data/statking/media/youtube_channels.json').items.length).toBeGreaterThanOrEqual(50);
    expect(readJson<{items: unknown[]}>('data/statking/media/reddit_communities.json').items.length).toBeGreaterThanOrEqual(35);
    expect(readJson<{experts: unknown[]}>('data/statking/experts/expert_registry.json').experts.length).toBeGreaterThan(10);
    expect(readJson<{notes: unknown[]}>('data/statking/owned-signals/internal_analyst_notes.json').notes.length).toBeGreaterThan(0);
    expect(loadUiContracts().contracts.every((contract) => contract.acceptance_criteria)).toBe(true);
  });
});
