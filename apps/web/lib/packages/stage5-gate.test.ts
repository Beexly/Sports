// @vitest-environment node
/**
 * Stage-5 gate — pure predicate + fail-closed status tests (logic-only).
 * Rows are injected; the default Prisma source runs against the stub DB that
 * vitest.setup.ts forces, so no test ever touches a real database.
 */
import { describe, it, expect, vi } from "vitest";

// Hermetic by construction: force the stub DB before @sports/db loads, even
// if the parent shell exported a real DATABASE_URL.
vi.hoisted(() => {
  process.env.DATABASE_URL = "stub";
});
import {
  FIVE_STAGE_RECEIPT_SCHEMA_VERSION,
  isOfficialStage5Play,
  countOfficialStage5Plays,
  getStage5GateStatus,
  extractFiveStageReceipt,
  type Stage5CandidateRow,
} from "./stage5-gate";

const NOW = new Date("2026-11-13T12:00:00Z");
const FUTURE = new Date("2026-11-15T18:00:00Z");
const PAST = new Date("2026-11-10T18:00:00Z");

function validReceipt(): Record<string, unknown> {
  return {
    schemaVersion: FIVE_STAGE_RECEIPT_SCHEMA_VERSION,
    gatePassed: true,
  };
}

function row(overrides: Partial<Stage5CandidateRow> = {}): Stage5CandidateRow {
  return {
    id: "pick_1",
    isPublished: true,
    result: "PENDING",
    factorBreakdown: { fiveStageReceipt: validReceipt() },
    gameCommenceTime: FUTURE,
    ...overrides,
  };
}

describe("schema version contract", () => {
  it("matches the publication-gate receipt schema (2026-11-13-v1)", () => {
    // Mirrors packages/ingestion-pipeline/src/publication-gate.ts
    expect(FIVE_STAGE_RECEIPT_SCHEMA_VERSION).toBe("2026-11-13-v1");
  });
});

describe("isOfficialStage5Play — pure predicate", () => {
  it("accepts a published pending future-game pick with a valid passed receipt", () => {
    expect(isOfficialStage5Play(row(), NOW)).toBe(true);
    expect(isOfficialStage5Play(row({ gameCommenceTime: FUTURE.toISOString() }), NOW)).toBe(true);
  });

  it("rejects when the receipt is absent or malformed", () => {
    expect(isOfficialStage5Play(row({ factorBreakdown: null }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ factorBreakdown: {} }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ factorBreakdown: { fiveStageReceipt: null } }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ factorBreakdown: { fiveStageReceipt: [] } }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ factorBreakdown: "not-an-object" }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ factorBreakdown: { fiveStageReceipt: { gatePassed: true } } }), NOW)).toBe(false);
  });

  it("rejects a wrong schemaVersion", () => {
    expect(
      isOfficialStage5Play(
        row({
          factorBreakdown: {
            fiveStageReceipt: { schemaVersion: "2026-01-01-v0", gatePassed: true },
          },
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it("requires gatePassed to be strict boolean true", () => {
    for (const gatePassed of [false, "true", 1, null, undefined]) {
      expect(
        isOfficialStage5Play(
          row({
            factorBreakdown: {
              fiveStageReceipt: { schemaVersion: FIVE_STAGE_RECEIPT_SCHEMA_VERSION, gatePassed },
            },
          }),
          NOW,
        ),
      ).toBe(false);
    }
  });

  it("rejects unpublished or already-settled picks", () => {
    expect(isOfficialStage5Play(row({ isPublished: false }), NOW)).toBe(false);
    for (const result of ["WIN", "LOSS", "PUSH", "VOID"]) {
      expect(isOfficialStage5Play(row({ result }), NOW)).toBe(false);
    }
  });

  it("rejects past, present, unknown or invalid kickoffs (fail closed)", () => {
    expect(isOfficialStage5Play(row({ gameCommenceTime: PAST }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ gameCommenceTime: NOW }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ gameCommenceTime: null }), NOW)).toBe(false);
    expect(isOfficialStage5Play(row({ gameCommenceTime: "not-a-date" }), NOW)).toBe(false);
  });
});

describe("countOfficialStage5Plays", () => {
  it("counts only rows that pass every axis", () => {
    const rows = [
      row({ id: "ok-1" }),
      row({ id: "ok-2", gameCommenceTime: FUTURE.toISOString() }),
      row({ id: "no-receipt", factorBreakdown: {} }),
      row({ id: "settled", result: "WIN" }),
      row({ id: "past", gameCommenceTime: PAST }),
      row({ id: "dark", isPublished: false }),
    ];
    expect(countOfficialStage5Plays(rows, NOW)).toBe(2);
    expect(countOfficialStage5Plays([], NOW)).toBe(0);
  });
});

describe("extractFiveStageReceipt", () => {
  it("returns the receipt object only for well-formed jsonb", () => {
    expect(extractFiveStageReceipt({ fiveStageReceipt: validReceipt() })).toEqual(validReceipt());
    expect(extractFiveStageReceipt(null)).toBeNull();
    expect(extractFiveStageReceipt({ fiveStageReceipt: 42 })).toBeNull();
  });
});

describe("getStage5GateStatus — fail-closed orchestration", () => {
  it("enables checkout when at least one official play exists", async () => {
    const status = await getStage5GateStatus(async () => [row()], NOW);
    expect(status.officialPlayCount).toBe(1);
    expect(status.checkoutEnabled).toBe(true);
    expect(status.evaluatedAt).toBe(NOW.toISOString());
  });

  it("disables checkout with an honest reason when zero plays qualify", async () => {
    const status = await getStage5GateStatus(async () => [row({ factorBreakdown: {} })], NOW);
    expect(status.officialPlayCount).toBe(0);
    expect(status.checkoutEnabled).toBe(false);
    expect(status.reason.toLowerCase()).toContain("five-stage");
  });

  it("FAILS CLOSED on any source error: 0 plays, disabled, never throws", async () => {
    const status = await getStage5GateStatus(async () => {
      throw new Error("db down");
    }, NOW);
    expect(status.officialPlayCount).toBe(0);
    expect(status.checkoutEnabled).toBe(false);
    expect(status.reason.length).toBeGreaterThan(0);
  });

  it("default Prisma source is hermetic under the stub DB (0 plays, disabled)", async () => {
    // vitest.setup.ts forces DATABASE_URL=stub unless FORCE_REAL_PRISMA=true.
    const status = await getStage5GateStatus(undefined, NOW);
    expect(status.officialPlayCount).toBe(0);
    expect(status.checkoutEnabled).toBe(false);
  });
});