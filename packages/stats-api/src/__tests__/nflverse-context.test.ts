import { describe, expect, it } from "vitest";
import {
  expandContractRows,
  expandOfficialRows,
  hydrateContextToMemory,
  parseSimpleCsv,
  NFLVERSE_CONTEXT_LICENSE,
} from "../providers/nflverse-context.js";
import { NflverseMemoryStore } from "../providers/nflverse-memory.js";
import { getMetricById } from "../catalog.js";

describe("nflverse officials + contracts CATALOG→CONSUMED", () => {
  it("expands contract APY rows with PIT asOf from year_signed", () => {
    const rows = expandContractRows([
      { gsis_id: "00-0033873", player: "Patrick Mahomes", apy: 45_000_000, year_signed: 2020 },
      { player: "No Id", apy: "bad" },
    ]);
    expect(rows.length).toBe(2); // nfl.ctx + own.ctx
    expect(rows[0]!.metricId).toBe("nfl.ctx.contract_apy");
    expect(rows[0]!.entityId).toBe("player:00-0033873");
    expect(rows[0]!.value).toBe(45_000_000);
    expect(rows[0]!.asOf).toBe("2020-01-01T00:00:00.000Z");
  });

  it("expands officials into crew key + hash", () => {
    const rows = expandOfficialRows([
      {
        game_id: "2024_01_KC_BAL",
        season: 2024,
        week: 1,
        referee: "Carl Cheffers",
        umpire: "U1",
      },
    ]);
    expect(rows.length).toBe(3);
    const crew = rows.find((r) => r.metricId === "nfl.ctx.referee_crew");
    expect(crew?.value).toContain("Carl Cheffers");
    const hash = rows.find((r) => r.metricId === "nfl.ctx.referee_crew_hash");
    expect(typeof hash?.value).toBe("number");
  });

  it("hydrates memory store and promotes catalog status ACTIVE", () => {
    const store = new NflverseMemoryStore();
    const result = hydrateContextToMemory(store, {
      contracts: [
        { gsis_id: "p1", apy: 1_000_000, year_signed: 2022 },
      ],
      officials: [
        { game_id: "g1", season: 2023, week: 5, referee: "R" },
      ],
    });
    expect(result.tier).toBe("CONSUMED");
    expect(result.licenseSpdx).toBe(NFLVERSE_CONTEXT_LICENSE);
    expect(result.contractsWritten).toBe(2);
    expect(result.officialsWritten).toBe(3);
    expect(store.size()).toBeGreaterThan(0);

    const apy = getMetricById("nfl.ctx.contract_apy");
    const ref = getMetricById("nfl.ctx.referee_crew");
    expect(apy?.status).toBe("ACTIVE");
    expect(ref?.status).toBe("ACTIVE");
  });

  it("parses simple CSV fixtures", () => {
    const csv = "gsis_id,apy,year_signed\np1,2000000,2021\n";
    const parsed = parseSimpleCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.gsis_id).toBe("p1");
  });
});
