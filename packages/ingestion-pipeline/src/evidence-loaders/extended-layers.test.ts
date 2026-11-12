import { describe, expect, it } from "vitest";
import { aggregateNgsRows, loadNgsTeam, meanOrNull } from "./ngs.js";
import { loadPremiseCatalog, summarisePremises } from "./premises.js";
import { buildReasoningTrace } from "./index.js";
import type { GameEvidenceBundle } from "@sports/prediction-engine/src/evidence/types.js";
import { derived, missing } from "@sports/prediction-engine/src/evidence/types.js";

const asOf = new Date("2026-11-12T22:00:00Z");

function client(rows: unknown[] | Error) {
  const calls: { text: string; values?: readonly unknown[] }[] = [];
  return {
    calls,
    async query(text: string, values?: readonly unknown[]) {
      calls.push({ text, values });
      if (rows instanceof Error) throw rows;
      return { rows, rowCount: rows.length };
    },
  };
}

const row = (o: Record<string, unknown>) => ({
  stat_type: "passing",
  week: 1,
  cpoe: null,
  avg_time_to_throw: null,
  aggressiveness: null,
  avg_air_yards_to_sticks: null,
  avg_separation: null,
  avg_yac_above_expectation: null,
  ryoe_per_att: null,
  pct_gte8: null,
  fetched_at: null,
  ...o,
});

describe("ngs loader", () => {
  it("meanOrNull never invents a zero", () => {
    expect(meanOrNull([])).toBeNull();
    expect(meanOrNull([null, undefined])).toBeNull();
    expect(meanOrNull([1, 3, null])).toBe(2);
  });

  it("aggregates by statType and reports weeks actually covered", () => {
    const rec = aggregateNgsRows("NYG", 2026, [
      row({ week: 1, cpoe: 2, avg_time_to_throw: 2.8 }),
      row({ week: 3, cpoe: 4, avg_time_to_throw: 3.0 }),
      row({ stat_type: "receiving", week: 3, avg_separation: 3.1 }),
      row({ stat_type: "rushing", week: 1, ryoe_per_att: 0.4 }),
    ]);
    expect(rec.weeksCovered).toEqual([1, 3]);
    expect(rec.passing.cpoe).toBe(3);
    expect(rec.receiving.avgSeparation).toBe(3.1);
    expect(rec.receiving.avgYacAboveExpectation).toBeNull();
    expect(rec.rushing.rushYardsOverExpectedPerAtt).toBe(0.4);
  });

  it("queries WAS and WSH for Washington, before the game week, as of the seal", async () => {
    const db = client([row({ cpoe: 1 })]);
    const e = await loadNgsTeam(db, "WSH", { season: 2026, week: 10, asOf });
    expect(e.status).toBe("DERIVED");
    expect(db.calls[0]?.values).toEqual([2026, ["WSH", "WAS"], 10, asOf]);
  });

  it("no rows and query failure are MISSING, not empty successes", async () => {
    expect((await loadNgsTeam(client([]), "NYG", { season: 2026, week: 10, asOf })).status).toBe("MISSING");
    expect((await loadNgsTeam(client(new Error("boom")), "NYG", { season: 2026, week: 10, asOf })).status).toBe("MISSING");
  });
});

describe("premise catalog loader", () => {
  it("counts every domain, active and numeric, and is marked not bound", () => {
    const rec = summarisePremises([
      { domain: "weather_and_aerodynamics", record_class: "CITABLE_VERIFIED", claim_type: "empirical", status: "ACTIVE", n: "4", n_numeric: "2" },
      { domain: "x", record_class: "CITABLE_VERIFIED", claim_type: "theoretical", status: "RETIRED", n: 3, n_numeric: 0 },
    ]);
    expect(rec.total).toBe(7);
    expect(rec.active).toBe(4);
    expect(rec.numericBindable).toBe(2);
    expect(rec.bindingStatus).toBe("CATALOGED_NOT_BOUND");
  });

  it("query failure is MISSING", async () => {
    expect((await loadPremiseCatalog(client(new Error("down")), asOf)).status).toBe("MISSING");
  });
});

describe("reasoning trace carries extended layers at weight 0", () => {
  it("lists each extended layer with its status, and never drops a MISSING one", () => {
    const base = buildReasoningTrace({
      identity: { venue: missing("x") },
      market: { spread: missing("x"), total: missing("x"), consensusNoVigHome: missing("x"), bookmakerCount: missing("x") },
      injuries: missing("x"),
      weather: missing("x"),
      rest: missing("x"),
      homeForm: missing("x"),
      awayForm: missing("x"),
      homeCharting: missing("x"),
      awayCharting: missing("x"),
      homeCoaching: missing("x"),
      awayCoaching: missing("x"),
      corpus: missing("x"),
      jev: missing("x"),
      extendedLayers: {
        homeNgs: derived({ a: 1 }, "nflverse:next_gen_stats", asOf.toISOString(), "mean"),
        awayNgs: missing("no rows", "nflverse:next_gen_stats"),
      },
      builtAt: asOf.toISOString(),
      codeVersion: "t",
    } as unknown as GameEvidenceBundle);
    const ext = base.filter((t) => t.layer === "homeNgs" || t.layer === "awayNgs");
    expect(ext.map((t) => [t.layer, t.status, t.emissionWeight])).toEqual([
      ["homeNgs", "DERIVED", 0],
      ["awayNgs", "MISSING", 0],
    ]);
    expect(ext[1]?.detail).toBe("no rows");
  });
});
