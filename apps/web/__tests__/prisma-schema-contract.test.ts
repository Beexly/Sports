import { describe, it, expect } from "vitest";

/**
 * Prisma Schema Contract Test
 *
 * Verifies that the generated Prisma client exports all enum values for
 * models that were added to the schema after the initial setup. If
 * `prisma generate` has not been run after a schema change, this test
 * fails with a clear error message before TypeScript errors bury it.
 *
 * Disprove gate: run `prisma generate` and confirm these exports reappear.
 *
 * Add a row here whenever a new enum is added to schema.prisma.
 */

import * as PrismaRuntime from "@prisma/client";

type PrismaExports = typeof PrismaRuntime;

function getEnum(key: keyof PrismaExports): Record<string, string> {
  const val = PrismaRuntime[key];
  if (!val || typeof val !== "object") {
    throw new Error(`Prisma export "${String(key)}" missing — run prisma generate`);
  }
  return val as unknown as Record<string, string>;
}

describe("prisma client schema contract (stale-generate canary)", () => {
  it("exports CockpitTask enums (added in cockpit phase)", () => {
    const CockpitTaskStatus = getEnum("CockpitTaskStatus" as keyof PrismaExports);
    expect(CockpitTaskStatus).toHaveProperty("NEW");
    expect(CockpitTaskStatus).toHaveProperty("ROUTED");
    expect(CockpitTaskStatus).toHaveProperty("APPROVED");

    expect(() => getEnum("CockpitRiskLevel" as keyof PrismaExports)).not.toThrow();
    expect(() => getEnum("CockpitComplianceStatus" as keyof PrismaExports)).not.toThrow();
  });

  it("exports Promotion enums (added in promotions phase)", () => {
    const PromotionStatus = getEnum("PromotionStatus" as keyof PrismaExports);
    expect(PromotionStatus).toHaveProperty("ACTIVE");

    const PromotionComplianceStatus = getEnum("PromotionComplianceStatus" as keyof PrismaExports);
    expect(PromotionComplianceStatus).toHaveProperty("APPROVED");

    expect(() => getEnum("PromotionOfferCategory" as keyof PrismaExports)).not.toThrow();
    expect(() => getEnum("PromotionAffiliateType" as keyof PrismaExports)).not.toThrow();
  });

  it("exports ModelJournalEntry enums (added in model journal phase)", () => {
    const ModelJournalEntryStatus = getEnum("ModelJournalEntryStatus" as keyof PrismaExports);
    expect(ModelJournalEntryStatus).toHaveProperty("DRAFT");
    expect(ModelJournalEntryStatus).toHaveProperty("PUBLISHED");
  });

  it("exports OddsMarket enum (extended for multi-market support)", () => {
    const OddsMarket = getEnum("OddsMarket" as keyof PrismaExports);
    expect(OddsMarket).toHaveProperty("H2H");
    expect(OddsMarket).toHaveProperty("SPREADS");
    expect(OddsMarket).toHaveProperty("TOTALS");
  });
});
