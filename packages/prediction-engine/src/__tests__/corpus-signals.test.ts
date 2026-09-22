import { describe, expect, it } from "vitest";
import { broadcastFamily, composeCorpusLedger } from "../corpus-signals.js";
import { loadCorpusSignals } from "../corpus-signals-load.js";

const NOW = "2026-09-22T18:00:00.000Z";

describe("corpus signal registry", () => {
  const signals = loadCorpusSignals();

  it("loads every inventoried document and speaks for each one", () => {
    expect(signals.length).toBeGreaterThanOrEqual(10_000);
    const keys = signals.map((signal) => signal.key);
    expect(new Set(keys).size).toBe(keys.length);
    const ledger = composeCorpusLedger(signals, [], NOW);
    expect(ledger.rows).toHaveLength(signals.length);
    expect(ledger.observed).toBe(0);
    expect(ledger.votingRows).toHaveLength(0);
    expect(ledger.score.score).toBe(0);
    expect(ledger.sources).toBeGreaterThanOrEqual(5);
  });

  it("applies one family reading to every document in that family and votes once", () => {
    const family = signals[0]?.family;
    expect(family).toBeDefined();
    if (!family) return;
    const observations = broadcastFamily(signals, family, 0.4, NOW);
    expect(observations.length).toBeGreaterThan(0);
    const ledger = composeCorpusLedger(signals, observations, NOW);
    expect(ledger.observed).toBe(observations.length);
    expect(ledger.votingRows).toHaveLength(1);
    expect(ledger.votingRows[0]?.value).toBe(0.4);
    expect(ledger.score.score).not.toBe(0);
  });
});
