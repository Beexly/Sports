/**
 * Targeted coverage for pre-mortem failure-mode template triggerCondition
 * boundaries and generateBullet content not covered by pre-mortem-compose.test.ts.
 *
 * The compose test exercises lineMovement, consensus, and depth indirectly.
 * This file hits every template's exact trigger boundary and spot-checks
 * bullet content for templates whose generateBullet has conditional branches.
 */

import { describe, it, expect } from "vitest";
import {
  lineMovementTemplate,
  consensusTemplate,
  depthTemplate,
  restAdvantageTemplate,
  scheduleStressTemplate,
  venueFormTemplate,
  volatilityTemplate,
  crossMarketTemplate,
  dataQualityTemplate,
} from "@/lib/pre-mortem/templates";
import type {
  PickSignalSnapshotInput,
  PickInput,
  GameInput,
} from "@/lib/pre-mortem/templates";

const baseSnapshot = (factors: PickSignalSnapshotInput["factors"]): PickSignalSnapshotInput => ({
  factors,
  modelVersion: "v5.1.0",
});

const basePick: PickInput = {
  id: "pick-1",
  gameId: "game-1",
  pickKind: "SPREAD",
  line: "-3.5",
  side: "HOME",
  confidence: 72,
  modelVersion: "v5.1.0",
};

const baseGame: GameInput = {
  homeTeamShort: "GSW",
  awayTeamShort: "LAL",
  sport: "NBA",
};

// ============================================================
// lineMovementTemplate
// ============================================================

describe("lineMovementTemplate — triggerCondition", () => {
  it("triggers when lineMovement > 0.4", () => {
    expect(lineMovementTemplate.triggerCondition(baseSnapshot({ lineMovement: 0.41 }))).toBe(true);
  });

  it("does NOT trigger when lineMovement === 0.4 (boundary excluded)", () => {
    expect(lineMovementTemplate.triggerCondition(baseSnapshot({ lineMovement: 0.4 }))).toBe(false);
  });

  it("does NOT trigger when lineMovement is undefined", () => {
    expect(lineMovementTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

describe("lineMovementTemplate — generateBullet", () => {
  it("uses '2 points' threshold for SPREAD picks", () => {
    const text = lineMovementTemplate.generateBullet(
      baseSnapshot({ lineMovement: 0.8 }),
      { ...basePick, pickKind: "SPREAD" },
      baseGame,
    );
    expect(text).toContain("2 points");
  });

  it("uses '1.5 points' threshold for TOTAL picks", () => {
    const text = lineMovementTemplate.generateBullet(
      baseSnapshot({ lineMovement: 0.8 }),
      { ...basePick, pickKind: "TOTAL" },
      baseGame,
    );
    expect(text).toContain("1.5 points");
  });
});

// ============================================================
// consensusTemplate
// ============================================================

describe("consensusTemplate — triggerCondition", () => {
  it("triggers when consensus > 0.6", () => {
    expect(consensusTemplate.triggerCondition(baseSnapshot({ consensus: 0.61 }))).toBe(true);
  });

  it("does NOT trigger when consensus === 0.6 (boundary excluded)", () => {
    expect(consensusTemplate.triggerCondition(baseSnapshot({ consensus: 0.6 }))).toBe(false);
  });

  it("does NOT trigger when consensus is undefined", () => {
    expect(consensusTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

describe("consensusTemplate — generateBullet drop threshold", () => {
  it("computes dropThreshold = consensusPct - 10 when result > 50", () => {
    // consensus=0.75 → 75% → drop=max(50, 65)=65
    const text = consensusTemplate.generateBullet(
      baseSnapshot({ consensus: 0.75 }),
      basePick,
      baseGame,
    );
    expect(text).toContain("65%");
  });

  it("clamps dropThreshold to 50% minimum when consensusPct - 10 < 50", () => {
    // consensus=0.55 → 55% → drop=max(50, 45)=50
    const text = consensusTemplate.generateBullet(
      baseSnapshot({ consensus: 0.55 }),
      basePick,
      baseGame,
    );
    expect(text).toContain("50%");
  });
});

// ============================================================
// depthTemplate
// ============================================================

describe("depthTemplate — triggerCondition", () => {
  it("triggers when depth > 0.55", () => {
    expect(depthTemplate.triggerCondition(baseSnapshot({ depth: 0.56 }))).toBe(true);
  });

  it("does NOT trigger when depth === 0.55 (boundary excluded)", () => {
    expect(depthTemplate.triggerCondition(baseSnapshot({ depth: 0.55 }))).toBe(false);
  });

  it("does NOT trigger when depth is undefined", () => {
    expect(depthTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

describe("depthTemplate — generateBullet", () => {
  it("includes depthPct - 15 in bullet text", () => {
    // depth=0.7 → depthPct=70 → threshold=55
    const text = depthTemplate.generateBullet(
      baseSnapshot({ depth: 0.7 }),
      basePick,
      baseGame,
    );
    expect(text).toContain("55%");
  });
});

// ============================================================
// restAdvantageTemplate
// ============================================================

describe("restAdvantageTemplate — triggerCondition", () => {
  it("triggers when restAdvantage > 0.65", () => {
    expect(restAdvantageTemplate.triggerCondition(baseSnapshot({ restAdvantage: 0.66 }))).toBe(true);
  });

  it("does NOT trigger when restAdvantage === 0.65 (boundary excluded)", () => {
    expect(restAdvantageTemplate.triggerCondition(baseSnapshot({ restAdvantage: 0.65 }))).toBe(false);
  });

  it("does NOT trigger when restAdvantage is undefined", () => {
    expect(restAdvantageTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

describe("restAdvantageTemplate — generateBullet", () => {
  it("references both homeTeamShort and awayTeamShort", () => {
    const text = restAdvantageTemplate.generateBullet(
      baseSnapshot({ restAdvantage: 0.8 }),
      basePick,
      { homeTeamShort: "GSW", awayTeamShort: "LAL", sport: "NBA" },
    );
    expect(text).toContain("GSW");
    expect(text).toContain("LAL");
  });
});

// ============================================================
// scheduleStressTemplate
// ============================================================

describe("scheduleStressTemplate — triggerCondition", () => {
  it("triggers when scheduleStress > 0.6", () => {
    expect(scheduleStressTemplate.triggerCondition(baseSnapshot({ scheduleStress: 0.61 }))).toBe(true);
  });

  it("does NOT trigger when scheduleStress === 0.6 (boundary excluded)", () => {
    expect(scheduleStressTemplate.triggerCondition(baseSnapshot({ scheduleStress: 0.6 }))).toBe(false);
  });

  it("does NOT trigger when scheduleStress is undefined", () => {
    expect(scheduleStressTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

describe("scheduleStressTemplate — generateBullet side routing", () => {
  it("references homeTeamShort when pick.side === 'HOME'", () => {
    const text = scheduleStressTemplate.generateBullet(
      baseSnapshot({ scheduleStress: 0.8 }),
      { ...basePick, side: "HOME" },
      baseGame,
    );
    expect(text).toContain("GSW");
    expect(text).not.toContain("LAL");
  });

  it("references awayTeamShort when pick.side !== 'HOME'", () => {
    const text = scheduleStressTemplate.generateBullet(
      baseSnapshot({ scheduleStress: 0.8 }),
      { ...basePick, side: "AWAY" },
      baseGame,
    );
    expect(text).toContain("LAL");
    expect(text).not.toContain("GSW");
  });
});

// ============================================================
// venueFormTemplate
// ============================================================

describe("venueFormTemplate — triggerCondition", () => {
  it("triggers when venueForm > 0.6", () => {
    expect(venueFormTemplate.triggerCondition(baseSnapshot({ venueForm: 0.61 }))).toBe(true);
  });

  it("does NOT trigger when venueForm === 0.6 (boundary excluded)", () => {
    expect(venueFormTemplate.triggerCondition(baseSnapshot({ venueForm: 0.6 }))).toBe(false);
  });

  it("does NOT trigger when venueForm is undefined", () => {
    expect(venueFormTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

// ============================================================
// volatilityTemplate
// ============================================================

describe("volatilityTemplate — triggerCondition", () => {
  it("triggers when volatility > 0.5", () => {
    expect(volatilityTemplate.triggerCondition(baseSnapshot({ volatility: 0.51 }))).toBe(true);
  });

  it("does NOT trigger when volatility === 0.5 (boundary excluded)", () => {
    expect(volatilityTemplate.triggerCondition(baseSnapshot({ volatility: 0.5 }))).toBe(false);
  });

  it("does NOT trigger when volatility is undefined", () => {
    expect(volatilityTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

// ============================================================
// crossMarketTemplate
// ============================================================

describe("crossMarketTemplate — triggerCondition", () => {
  it("triggers when crossMarket > 0.45", () => {
    expect(crossMarketTemplate.triggerCondition(baseSnapshot({ crossMarket: 0.46 }))).toBe(true);
  });

  it("does NOT trigger when crossMarket === 0.45 (boundary excluded)", () => {
    expect(crossMarketTemplate.triggerCondition(baseSnapshot({ crossMarket: 0.45 }))).toBe(false);
  });

  it("does NOT trigger when crossMarket is undefined", () => {
    expect(crossMarketTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

// ============================================================
// dataQualityTemplate — dual-bound trigger
// ============================================================

describe("dataQualityTemplate — triggerCondition dual bounds", () => {
  it("triggers when dataQuality is between 0.5 and 0.85 (exclusive)", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({ dataQuality: 0.7 }))).toBe(true);
  });

  it("does NOT trigger when dataQuality === 0.5 (lower bound excluded)", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({ dataQuality: 0.5 }))).toBe(false);
  });

  it("does NOT trigger when dataQuality === 0.85 (upper bound excluded)", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({ dataQuality: 0.85 }))).toBe(false);
  });

  it("does NOT trigger when dataQuality > 0.85", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({ dataQuality: 0.9 }))).toBe(false);
  });

  it("does NOT trigger when dataQuality < 0.5 (below range)", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({ dataQuality: 0.3 }))).toBe(false);
  });

  it("does NOT trigger when dataQuality is undefined", () => {
    expect(dataQualityTemplate.triggerCondition(baseSnapshot({}))).toBe(false);
  });
});

// ============================================================
// severityRank ordering
// ============================================================

describe("template severityRank ordering", () => {
  it("restAdvantageTemplate has the lowest rank (highest priority)", () => {
    expect(restAdvantageTemplate.severityRank).toBe(1);
  });

  it("lineMovementTemplate rank is less than consensusTemplate rank (sorted earlier)", () => {
    expect(lineMovementTemplate.severityRank).toBeLessThan(consensusTemplate.severityRank);
  });
});
