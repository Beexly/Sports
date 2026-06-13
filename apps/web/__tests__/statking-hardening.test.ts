import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { scoreSourceTrust } from '../../../lib/statking/source-trust';
import { summarizeCoverage } from '../../../lib/statking/coverage';
import { detectConflicts } from '../../../lib/statking/conflicts';
import { calculateFreshness } from '../../../lib/statking/freshness';

const root = path.resolve(__dirname, '../../..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

describe('StatKing hardening sprint', () => {
  it('seeds a large source universe with required source fields and no duplicate IDs', () => {
    const registry = readJson('data/source-atlas/source_registry.json');
    expect(registry.source_count).toBeGreaterThanOrEqual(500);
    const ids = new Set(registry.sources.map((source: any) => source.source_id));
    expect(ids.size).toBe(registry.sources.length);
    for (const source of registry.sources) {
      expect(source.canonical_name).toBeTruthy();
      expect(source.source_mode).toBeTruthy();
      expect(source.legal_gate_status).toBeTruthy();
      expect(source.next_action).toBeTruthy();
    }
  });

  it('supports internet-scale discovery artifacts without loading 500k rows', () => {
    const graph = readJson('data/source-atlas/source_candidate_graph.json');
    expect(graph.capacity).toBeGreaterThanOrEqual(500000);
    expect(graph.candidate_count).toBeGreaterThanOrEqual(800);
    expect(fs.readFileSync(path.join(root, 'data/source-atlas/source_discovery_queries.yaml'), 'utf8').match(/  - /g)?.length).toBeGreaterThanOrEqual(2000);
  });

  it('defines a broad metric ontology', () => {
    const ontology = fs.readFileSync(path.join(root, 'data/statking/metric_ontology.yaml'), 'utf8');
    expect(ontology.match(/metric_key:/g)?.length).toBeGreaterThanOrEqual(750);
    expect(ontology).toContain('formula_status');
  });

  it('summarizes coverage, trust, conflicts, and freshness', () => {
    const coverage = readJson('data/statking/coverage/coverage_report.json');
    expect(summarizeCoverage(coverage).missing).toContain('route_data');
    expect(scoreSourceTrust({ source_id: 'src', value_score: 90, uniqueness_score: 90, freshness_score: 80, risk_score: 10, legal_gate_status: 'approved' }).source_trust_score).toBeGreaterThan(70);
    expect(detectConflicts([{ entity_id: 'p1', entity_type: 'player', value: 'Q' }, { entity_id: 'p1', entity_type: 'player', value: 'OUT' }])).toHaveLength(2);
    expect(calculateFreshness(Date.now() - 120 * 60000, 60).freshness_status).toBe('stale');
  });
});
