import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { askStatKing, comparePlayers, loadActiveMetricManifest, loadAudit, loadMediaItems, loadPlayers, loadSourceTargets } from '../lib/statking/product';

const root = path.resolve(__dirname, '../../..');
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

describe('StatKing product depth', () => {
  it('audits real vs stubbed systems honestly', () => {
    const audit = loadAudit();
    expect(audit.summary.real_working).toBeGreaterThan(0);
    expect(audit.summary.stub_only).toBeGreaterThan(0);
    expect(audit.items.every((item) => item.status && item.next_fix && item.priority)).toBe(true);
  });

  it('loads player snapshots and active calculated metrics', () => {
    expect(loadPlayers().length).toBeGreaterThanOrEqual(100);
    const manifest = loadActiveMetricManifest();
    expect(manifest.active_calculated_count).toBeGreaterThanOrEqual(75);
    expect(manifest.metrics.every((metric) => metric.visible_status)).toBe(true);
  });

  it('compares players and supports Ask StatKing templates', () => {
    const comparison = comparePlayers('p001', 'p002');
    expect(comparison.categories.length).toBeGreaterThanOrEqual(6);
    expect(askStatKing('hidden value players').rows.length).toBeGreaterThan(0);
    expect(askStatKing('top YouTube sources').title).toContain('YouTube');
  });

  it('loads source targets and media snapshots', () => {
    expect(loadSourceTargets().top_50_easiest_wins.length).toBe(50);
    expect(loadMediaItems().filter((item) => item.rights_mode === 'metadata_only').length).toBeGreaterThan(0);
  });

  it('has merge readiness and required product pages', () => {
    expect(exists('docs/statking-merge-readiness.md')).toBe(true);
    for (const rel of ['apps/web/app/stats/page.tsx','apps/web/app/stats/players/page.tsx','apps/web/app/stats/compare/page.tsx','apps/web/app/stats/player/[id]/page.tsx','apps/web/app/admin/statking/crown/page.tsx']) {
      expect(exists(rel)).toBe(true);
    }
  });
});
