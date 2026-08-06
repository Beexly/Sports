import { describe, expect, it } from "vitest";
import {
  expandContractRows,
  expandOfficialRows,
  hydrateContextToMemory,
  stableNumericHash,
} from "../providers/nflverse-context.js";
import { OwnFeedMemoryStore, readOwnValue } from "../own/index.js";

const ASOF = "2026-08-06T18:00:00.000Z";

describe("stableNumericHash", () => {
  it("is deterministic and non-negative", () => {
    const a = stableNumericHash("Ed Hochuli|Sarah Thomas");
    const b = stableNumericHash("Ed Hochuli|Sarah Thomas");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
  });

  it("differs for different input", () => {
    expect(stableNumericHash("crew a")).not.toBe(stableNumericHash("crew b"));
  });
});

describe("expandContractRows", () => {
  it("maps valid rows to own.ctx.contract_apy records", () => {
    const r = expandContractRows(
      [{ gsis_id: "00-0033873", apy: "45000000" }, { gsis_id: "00-0034855", apy: "12500000" }],
      ASOF,
    );
    expect(r.skipped).toBe(0);
    expect(r.records).toHaveLength(2);
    expect(r.records[0]).toMatchObject({
      featureId: "own.ctx.contract_apy",
      entityId: "00-0033873",
      value: 45_000_000,
      sourceId: "nflverse.contracts",
      licenseSpdx: "CC-BY-4.0",
      pitCorrect: true,
    });
  });

  it("skips rows with missing gsis_id, never fabricates an entity", () => {
    const r = expandContractRows([{ apy: "1000000" }], ASOF);
    expect(r.records).toHaveLength(0);
    expect(r.skipped).toBe(1);
    expect(r.skipReasons[0]).toMatch(/missing gsis_id/);
  });

  it("skips rows with non-finite or negative apy, never zeroes it", () => {
    const r = expandContractRows(
      [
        { gsis_id: "00-0001", apy: "not-a-number" },
        { gsis_id: "00-0002", apy: "-5" },
      ],
      ASOF,
    );
    expect(r.records).toHaveLength(0);
    expect(r.skipped).toBe(2);
  });

  it("refuses the whole batch on an invalid asOf", () => {
    const r = expandContractRows([{ gsis_id: "00-0001", apy: "1" }], "not-a-date");
    expect(r.records).toHaveLength(0);
    expect(r.skipped).toBe(1);
  });
});

describe("expandOfficialRows", () => {
  it("groups officials per game into a sorted crew signature + numeric hash", () => {
    const r = expandOfficialRows(
      [
        { game_id: "2026_01_KC_LV", official_name: "Bill Vinovich" },
        { game_id: "2026_01_KC_LV", official_name: "Adrian Hill" },
      ],
      ASOF,
    );
    expect(r.records).toHaveLength(2);
    const crew = r.records.find((x) => x.featureId === "own.ctx.referee_crew");
    const hash = r.records.find((x) => x.featureId === "own.ctx.referee_crew_hash");
    expect(crew?.value).toBe("Adrian Hill|Bill Vinovich"); // sorted
    expect(hash?.value).toBe(stableNumericHash("Adrian Hill|Bill Vinovich"));
    expect(crew?.entityId).toBe("2026_01_KC_LV");
  });

  it("skips rows missing game_id or official_name", () => {
    const r = expandOfficialRows([{ game_id: "g1" }, { official_name: "x" }], ASOF);
    expect(r.records).toHaveLength(0);
    expect(r.skipped).toBe(2);
  });
});

describe("hydrateContextToMemory", () => {
  it("writes records into the own-feed store and they're readable end-to-end", () => {
    const store = new OwnFeedMemoryStore();
    const contracts = expandContractRows([{ gsis_id: "00-0033873", apy: "45000000" }], ASOF);
    const officials = expandOfficialRows(
      [{ game_id: "g1", official_name: "Bill Vinovich" }],
      ASOF,
    );

    const summary = hydrateContextToMemory(store, [contracts, officials]);
    expect(summary.failed).toBe(0);
    expect(summary.written).toBe(3); // 1 contract + crew + crew_hash

    const apy = readOwnValue(store, { metricId: "own.ctx.contract_apy", entityId: "00-0033873", asOf: ASOF });
    expect(apy.ok).toBe(true);
    if (apy.ok) expect(apy.value).toBe(45_000_000);

    // referee_crew is a string value — the numeric-only read path correctly
    // refuses it; referee_crew_hash is the numeric companion built for exactly this.
    const crewHash = readOwnValue(store, { metricId: "own.ctx.referee_crew_hash", entityId: "g1", asOf: ASOF });
    expect(crewHash.ok).toBe(true);
  });
});
