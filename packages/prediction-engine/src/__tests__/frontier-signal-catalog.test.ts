import { describe, expect, it } from "vitest";
import {
  FRONTIER_SIGNALS,
  SIGNAL_WEIGHT_FLOOR,
  buildFrontierRows,
  composeFrontierLedger,
} from "../frontier-signal-catalog.js";

const NOW = "2026-09-21T18:00:00.000Z";

describe("frontier signal catalog", () => {
  it("speaks for every learned signal, with no duplicate keys", () => {
    const keys = FRONTIER_SIGNALS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(50);
    for (const signal of FRONTIER_SIGNALS) {
      expect(signal.priorWeight).toBeGreaterThanOrEqual(SIGNAL_WEIGHT_FLOOR);
      expect(signal.family.length).toBeGreaterThan(0);
      expect(signal.job.length).toBeGreaterThan(0);
    }
  });

  it("covers the factor ids that were stamped dead or blocked", () => {
    const blob = FRONTIER_SIGNALS.map((s) => `${s.key} ${s.source}`).join("\n");
    for (const id of ["A1", "A2", "A3", "A4", "A5", "A6", "A8", "A9", "A12", "A15", "A16", "A17", "A18", "A19", "A20", "A21", "A22", "A24", "A25", "A26", "A27", "A28"]) {
      expect(blob).toContain(id);
    }
  });

  it("does not let an absent observation vote", () => {
    const ledger = composeFrontierLedger([], NOW);
    expect(ledger.rows).toHaveLength(FRONTIER_SIGNALS.length);
    expect(ledger.observed).toBe(0);
    expect(ledger.score.score).toBe(0);
    expect(ledger.votingRows).toHaveLength(0);
  });

  it("lets a present wind observation move the shadow score, once", () => {
    const ledger = composeFrontierLedger(
      [
        { key: "weather.player_wind_yards", value: -1, capturedAt: NOW },
        { key: "weather.team_total_wind", value: -1, capturedAt: NOW },
      ],
      NOW,
    );
    expect(ledger.observed).toBe(2);
    expect(ledger.votingRows).toHaveLength(1);
    expect(ledger.score.score).toBeLessThan(0);
    expect(ledger.rows.find((r) => r.key === "weather.player_wind_yards")?.weight).toBeGreaterThanOrEqual(SIGNAL_WEIGHT_FLOOR);
  });

  it("is replayable when now is injected", () => {
    const obs = [{ key: "usage.wr1_out", value: 1.2, capturedAt: "2026-09-01T00:00:00.000Z" }];
    const a = composeFrontierLedger(obs, NOW);
    const b = composeFrontierLedger(obs, NOW);
    expect(a.score.score).toBe(b.score.score);
  });
});
