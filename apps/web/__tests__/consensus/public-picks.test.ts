import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parsePublicConsensus,
  fetchPublicConsensus,
  isPublicConsensus,
} from '@/lib/consensus/public-picks';

vi.mock('@sports/data-ingestion', () => ({
  assertIngestible: vi.fn(),
  fetchWithFailover: vi.fn(),
}));

import { assertIngestible, fetchWithFailover } from '@sports/data-ingestion';

describe('parsePublicConsensus', () => {
  it('returns null for invalid input', () => {
    expect(parsePublicConsensus(null)).toBeNull();
    expect(parsePublicConsensus(undefined)).toBeNull();
    expect(parsePublicConsensus('')).toBeNull();
    expect(parsePublicConsensus({})).toBeNull();
    expect(parsePublicConsensus({ extra: 'field' })).toBeNull();
  });

  it('parses overCount and underCount from direct fields', () => {
    const input = { overCount: 1200, underCount: 800 };
    const result = parsePublicConsensus(input);
    expect(result).toEqual({ overCount: 1200, underCount: 800 });
    expect(isPublicConsensus(result)).toBe(true);
  });

  it('parses alternative field names (over/under)', () => {
    const input = { over: 500, under: 300 };
    const result = parsePublicConsensus(input);
    expect(result).toEqual({ overCount: 500, underCount: 300 });
  });

  it('parses overBets/underBets', () => {
    const input = { overBets: 750, underBets: 250 };
    const result = parsePublicConsensus(input);
    expect(result).toEqual({ overCount: 750, underCount: 250 });
  });

  it('parses overPct/underPct with totalBets', () => {
    const input = { overPct: 60, underPct: 40, totalBets: 1000 };
    const result = parsePublicConsensus(input);
    expect(result).toEqual({ overCount: 600, underCount: 400 });
  });

  it('handles percentage fields with different names', () => {
    const input = { overPercent: 55.5, underPercent: 44.5, total: 2000 };
    const result = parsePublicConsensus(input);
    expect(result?.overCount).toBe(1110);
    expect(result?.underCount).toBe(890);
  });

  it('returns null for invalid percentages', () => {
    expect(parsePublicConsensus({ overPct: 150, underPct: -10, totalBets: 100 })).toBeNull();
    expect(parsePublicConsensus({ overPct: 60, underPct: 50, totalBets: 100 })).toBeNull();
    expect(parsePublicConsensus({ overPct: 60, underPct: 40 })).toBeNull();
  });

  it('returns null for negative counts', () => {
    expect(parsePublicConsensus({ overCount: -1, underCount: 100 })).toBeNull();
    expect(parsePublicConsensus({ overCount: 100, underCount: -1 })).toBeNull();
  });
});

describe('fetchPublicConsensus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when source is not ingestible', async () => {
    vi.mocked(assertIngestible).mockImplementation(() => {
      throw new Error('[source-registry] Refusing to ingest "action-network" (verdict: forbidden).');
    });

    const result = await fetchPublicConsensus('test-event');
    expect(result).toBeNull();
  });

  it('returns null on HTTP error (absent data)', async () => {
    vi.mocked(assertIngestible).mockReturnValue(undefined as never);
    vi.mocked(fetchWithFailover).mockResolvedValue({
      response: { ok: false, status: 404 } as Response,
      sourceUrl: 'https://www.actionnetwork.com/api/v1/event/test/consensus',
      attempts: 1,
      errors: ['HTTP 404'],
    });

    const result = await fetchPublicConsensus('test-event');
    expect(result).toBeNull();
  });

  it('returns parsed consensus on successful fetch', async () => {
    const mockConsensus = { overCount: 1200, underCount: 800 };
    const mockJson = vi.fn().mockResolvedValue(mockConsensus);

    vi.mocked(assertIngestible).mockReturnValue(undefined as never);
    vi.mocked(fetchWithFailover).mockResolvedValue({
      response: { ok: true, status: 200, json: mockJson } as Response,
      sourceUrl: 'https://www.actionnetwork.com/api/v1/event/test/consensus',
      attempts: 1,
      errors: [],
    });

    const result = await fetchPublicConsensus('test-event', 'total');
    expect(result).toEqual(mockConsensus);
    expect(isPublicConsensus(result)).toBe(true);
    expect(fetchWithFailover).toHaveBeenCalledOnce();
  });

  it('returns null on catch-all error', async () => {
    vi.mocked(assertIngestible).mockReturnValue(undefined as never);
    vi.mocked(fetchWithFailover).mockRejectedValue(new Error('Network error'));

    const result = await fetchPublicConsensus('test-event');
    expect(result).toBeNull();
  });
});
