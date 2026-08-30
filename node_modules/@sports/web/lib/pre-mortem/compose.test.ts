import { describe, it, expect } from "vitest";
import { composePreMortem, composePreMortemUncapped } from "./compose";
import { comparePreMortem, summarizeComparison } from "./compare";
import type { PreMortemBulletForCompare } from "./compare";
import type {
  PickSignalSnapshotInput,
  PickInput,
  GameInput,
  FactorKey,
} from "./templates";

// Game: BOS @ NYK — NYK is home, BOS is away.
const GAME: GameInput = {
  homeTeamShort: "NYK",
  awayTeamShort: "BOS",
  sport: "NBA",
};

function makePick(overrides: Partial<PickInput> = {}): PickInput {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickKind: "SPREAD",
    line: "-3.5",
    side: "AWAY",
    confidence: 72,
    modelVersion: "v6.0.4",
    ...overrides,
  };
}

function makeSnapshot(
  factors: Partial<Record<FactorKey, number>>,
  modelVersion = "v6.0.4",
): PickSignalSnapshotInput {
  return { factors, modelVersion };
}

function ranksNonDecreasing(ranks: number[]): boolean {
  return ranks.every((r, i) => i === 0 || ranks[i - 1]! <= r);
}

describe("composePreMortem", () => {
  it("fires only triggered templates, sorts by severityRank, caps at 4", () => {
    const snapshot = makeSnapshot({
      consensus: 0.72, // > 0.6 fires
      depth: 0.68, // > 0.55 fires
      edge: 2.7,
      lineMovement: 0.45, // > 0.4 fires
      volatility: 0.22, // < 0.5 does NOT fire
      headToHead: 0.18,
      venueForm: 0.68, // > 0.6 fires
      scheduleStress: 0.74, // > 0.6 fires
      restAdvantage: 0.81, // > 0.65 fires
      crossMarket: 0.39, // < 0.45 does NOT fire
      dataQuality: 0.95, // > 0.85 ceiling, does NOT fire
    });
    const generatedAt = new Date("2026-07-07T12:00:00.000Z");

    const result = composePreMortem({
      snapshot,
      pick: makePick(),
      game: GAME,
      generatedAt,
    });

    // 6 templates fire, capped to the 4 highest-priority (lowest rank).
    expect(result.bullets.length).toBe(4);
    expect(result.bullets.map((b) => b.factorKey)).toEqual([
      "restAdvantage",
      "lineMovement",
      "scheduleStress",
      "consensus",
    ]);
    expect(ranksNonDecreasing(result.bullets.map((b) => b.severityRank))).toBe(
      true,
    );

    // Non-triggering factors never appear.
    const keys = result.bullets.map((b) => b.factorKey);
    expect(keys).not.toContain("volatility");
    expect(keys).not.toContain("crossMarket");
    expect(keys).not.toContain("dataQuality");

    expect(result.warning).toBeNull();
    expect(result.modelVersion).toBe("v6.0.4");
    expect(result.generatedAt).toBe(generatedAt.toISOString());
  });

  it("consensus bullet states the failure mode qualitatively and never fabricates a market-consensus percentage from the factor score", () => {
    // snapshot.factors.consensus is a contribution score in [0,1], NOT the share
    // of books on our side. It must never be rendered as an "X%" market stat.
    const result = composePreMortem({
      snapshot: makeSnapshot({ consensus: 0.72 }),
      pick: makePick(),
      game: GAME,
    });

    const consensusBullet = result.bullets.find(
      (b) => b.factorKey === "consensus",
    );
    expect(consensusBullet).toBeDefined();
    // No fabricated percentage anywhere in the copy.
    expect(consensusBullet!.text).not.toMatch(/\d+\s*%/);
    // Specifically not the old 0.72 -> "62%" (max(50, 72-10)) fabrication.
    expect(consensusBullet!.text).not.toContain("62%");
    expect(consensusBullet!.text.toLowerCase()).toContain("consensus");
  });

  it("depth bullet states the failure mode qualitatively and never fabricates a dollar-weighted-balance percentage from the factor score", () => {
    // snapshot.factors.depth is a contribution score in [0,1], NOT a market
    // dollar-weighted-balance fraction. It must never be rendered as an "X%" stat.
    const result = composePreMortem({
      snapshot: makeSnapshot({ depth: 0.68 }),
      pick: makePick(),
      game: GAME,
    });

    const depthBullet = result.bullets.find((b) => b.factorKey === "depth");
    expect(depthBullet).toBeDefined();
    // No fabricated percentage anywhere in the copy.
    expect(depthBullet!.text).not.toMatch(/\d+\s*%/);
    // Specifically not the old 0.68 -> "53%" (68-15) fabrication.
    expect(depthBullet!.text).not.toContain("53%");
    expect(depthBullet!.text.toLowerCase()).toContain("depth");
  });

  it("substitutes real team short names into the restAdvantage bullet (no placeholder syntax)", () => {
    const result = composePreMortem({
      snapshot: makeSnapshot({ restAdvantage: 0.81 }),
      pick: makePick(),
      game: GAME,
    });

    const restBullet = result.bullets.find(
      (b) => b.factorKey === "restAdvantage",
    );
    expect(restBullet).toBeDefined();
    expect(restBullet!.text).toContain("NYK");
    expect(restBullet!.text).toContain("BOS");
    expect(restBullet!.text).not.toContain("[home");
    expect(restBullet!.text).not.toContain("[away");
    expect(restBullet!.text).not.toContain("homeTeamShort");
  });

  it("does not mutate the input snapshot or pick", () => {
    const snapshot = makeSnapshot({ restAdvantage: 0.81, consensus: 0.72 });
    const pick = makePick();
    const snapshotBefore = JSON.stringify(snapshot);
    const pickBefore = JSON.stringify(pick);

    composePreMortem({ snapshot, pick, game: GAME });

    expect(JSON.stringify(snapshot)).toBe(snapshotBefore);
    expect(JSON.stringify(pick)).toBe(pickBefore);
  });

  it("two bullets meet the healthy threshold — no warning", () => {
    const result = composePreMortem({
      snapshot: makeSnapshot({
        consensus: 0.48,
        depth: 0.52,
        lineMovement: 0.34,
        volatility: 0.12,
        venueForm: 0.58,
        scheduleStress: 0.55,
        restAdvantage: 0.81, // fires
        crossMarket: 0.32,
        dataQuality: 0.6, // in [0.5, 0.85) fires
      }),
      pick: makePick({ pickKind: "MONEYLINE", side: "HOME" }),
      game: GAME,
    });

    expect(result.bullets.map((b) => b.factorKey)).toEqual([
      "restAdvantage",
      "dataQuality",
    ]);
    expect(result.warning).toBeNull();
  });

  it("one bullet fires — populates the thin-coverage warning (singular)", () => {
    const result = composePreMortem({
      snapshot: makeSnapshot({ restAdvantage: 0.81 }),
      pick: makePick(),
      game: GAME,
    });

    expect(result.bullets.length).toBe(1);
    expect(result.bullets[0]!.factorKey).toBe("restAdvantage");
    expect(result.warning).toBe(
      "Pre-mortem coverage thin: only 1 factor above contribution threshold.",
    );
  });

  it("zero bullets fire — thin-coverage warning (plural), never fabricates bullets", () => {
    const result = composePreMortem({
      snapshot: makeSnapshot({}),
      pick: makePick(),
      game: GAME,
    });

    expect(result.bullets).toEqual([]);
    expect(result.warning).toBe(
      "Pre-mortem coverage thin: only 0 factors above contribution threshold.",
    );
  });
});

describe("composePreMortemUncapped", () => {
  it("returns every triggered bullet (past the cap), sorted by severityRank", () => {
    const uncapped = composePreMortemUncapped({
      snapshot: makeSnapshot({
        consensus: 0.72,
        depth: 0.68,
        lineMovement: 0.45,
        venueForm: 0.68,
        scheduleStress: 0.74,
        restAdvantage: 0.81,
      }),
      pick: makePick(),
      game: GAME,
    });

    // All 6 triggered bullets, unlike the capped composer which drops 2.
    expect(uncapped.length).toBe(6);
    expect(ranksNonDecreasing(uncapped.map((b) => b.severityRank))).toBe(true);
    const keys = uncapped.map((b) => b.factorKey);
    expect(keys).toContain("depth");
    expect(keys).toContain("venueForm");
    expect(uncapped[0]!.factorKey).toBe("restAdvantage");
  });
});

describe("comparePreMortem", () => {
  const bullets: PreMortemBulletForCompare[] = [
    { factorKey: "restAdvantage", severityRank: 1, text: "rest" },
    { factorKey: "venueForm", severityRank: 2, text: "venue" },
    { factorKey: "lineMovement", severityRank: 3, text: "line" },
  ];

  it("Scenario A — root cause with no factor mapping reads as MISSED / INCOMPLETE", () => {
    const result = comparePreMortem({
      bullets,
      rootCause: "WEATHER",
      lessonTags: ["weather-flag"],
    });

    expect(result.called).toEqual([]);
    expect(result.didNotHappen).toEqual([
      "restAdvantage",
      "venueForm",
      "lineMovement",
    ]);
    expect(result.missed).toEqual(["WEATHER"]);
    expect(result.coverage).toBe("INCOMPLETE");
    expect(result.perBullet).toHaveLength(3);
    expect(result.perBullet.every((b) => b.tag === "DID_NOT_HAPPEN")).toBe(true);
  });

  it("Scenario B — mapped root cause present in bullets reads as CALLED / COMPLETE", () => {
    const result = comparePreMortem({
      bullets,
      rootCause: "INJURY_SHOCK", // maps to restAdvantage
      lessonTags: [],
    });

    expect(result.called).toEqual(["restAdvantage"]);
    expect(result.didNotHappen).toEqual(["venueForm", "lineMovement"]);
    expect(result.missed).toEqual([]);
    expect(result.coverage).toBe("COMPLETE");
  });

  it("Scenario C — multi-factor mapping matches on any one present factor", () => {
    const result = comparePreMortem({
      bullets,
      rootCause: "STALE_LINE", // maps to lineMovement + consensus
      lessonTags: [],
    });

    expect(result.called).toEqual(["lineMovement"]);
    expect(result.coverage).toBe("COMPLETE");
    expect(result.missed).toEqual([]);
  });

  it("every perBullet entry carries exactly one CALLED/DID_NOT_HAPPEN tag and does not mutate input", () => {
    const before = JSON.stringify(bullets);
    const result = comparePreMortem({
      bullets,
      rootCause: "INJURY_SHOCK",
      lessonTags: [],
    });
    expect(
      result.perBullet.every(
        (b) => b.tag === "CALLED" || b.tag === "DID_NOT_HAPPEN",
      ),
    ).toBe(true);
    expect(JSON.stringify(bullets)).toBe(before);
  });
});

describe("summarizeComparison", () => {
  it("INCOMPLETE — states the miss plainly without excuses", () => {
    const result = comparePreMortem({
      bullets: [{ factorKey: "restAdvantage", severityRank: 1, text: "r" }],
      rootCause: "WEATHER",
      lessonTags: [],
    });
    expect(summarizeComparison(result)).toBe(
      "Pre-mortem missed: the actual cause (WEATHER) was not in any bullet. Coverage gap to address.",
    );
  });

  it("COMPLETE with a single called factor — applies the friendly name mapper", () => {
    const result = comparePreMortem({
      bullets: [
        { factorKey: "restAdvantage", severityRank: 1, text: "r" },
        { factorKey: "venueForm", severityRank: 2, text: "v" },
      ],
      rootCause: "INJURY_SHOCK",
      lessonTags: [],
    });
    expect(
      summarizeComparison(result, (f) =>
        f === "restAdvantage" ? "rest advantage" : f,
      ),
    ).toBe(
      "Pre-mortem called it: the rest advantage bullet matched the actual cause.",
    );
  });

  it("COMPLETE with multiple called factors — joins them with 'and'", () => {
    const result = comparePreMortem({
      bullets: [
        { factorKey: "lineMovement", severityRank: 3, text: "l" },
        { factorKey: "consensus", severityRank: 3, text: "c" },
      ],
      rootCause: "STALE_LINE", // maps to both lineMovement and consensus
      lessonTags: [],
    });
    expect(result.called).toEqual(["lineMovement", "consensus"]);
    expect(summarizeComparison(result)).toBe(
      "Pre-mortem called it: lineMovement and consensus bullets both matched the actual cause.",
    );
  });
});
