/**
 * GSI-WP-05 v3.0 / v4.0 MIMIC-IV Clinical Stay Metrics Seed
 *
 * Upserts 138 evaluated ICU stays (38 septic shock, 100 negative control)
 * with TEB braid invariants, time-slippage dispersion, and conformal metrics.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

export interface MimicSeedRecord {
  stayId: string;
  subjectId: string;
  septicShockOutcome: boolean;
  clockVelocityDispersion: number;
  dtwTemporalSlippage: number;
  seifertIrreversibleEntropy: number;
  chenLevyAreaCirculation: number;
  v3UnifiedScore: number;
  conformalSelectiveTier: string;
  evaluatedAt: string;
}

export async function seedGsiMimicMetrics(): Promise<number> {
  const seedPath = resolve(__dirname, "../../../data/engine/gsi_mimic_iv_138_stays_seed.json");
  const rawData = readFileSync(seedPath, "utf-8");
  const records: MimicSeedRecord[] = JSON.parse(rawData);

  console.log(`[seed-gsi-mimic] Ingesting ${records.length} MIMIC-IV stay metrics into database...`);

  let upsertedCount = 0;
  for (const record of records) {
    // Typecast to bypass stale locally generated prisma client definitions if not regenerated yet
    await (prisma as any).mimicStayMetric.upsert({
      where: { stayId: record.stayId },
      update: {
        subjectId: record.subjectId,
        septicShockOutcome: record.septicShockOutcome,
        clockVelocityDispersion: record.clockVelocityDispersion,
        dtwTemporalSlippage: record.dtwTemporalSlippage,
        seifertIrreversibleEntropy: record.seifertIrreversibleEntropy,
        chenLevyAreaCirculation: record.chenLevyAreaCirculation,
        v3UnifiedScore: record.v3UnifiedScore,
        conformalSelectiveTier: record.conformalSelectiveTier,
        evaluatedAt: new Date(record.evaluatedAt),
      },
      create: {
        stayId: record.stayId,
        subjectId: record.subjectId,
        septicShockOutcome: record.septicShockOutcome,
        clockVelocityDispersion: record.clockVelocityDispersion,
        dtwTemporalSlippage: record.dtwTemporalSlippage,
        seifertIrreversibleEntropy: record.seifertIrreversibleEntropy,
        chenLevyAreaCirculation: record.chenLevyAreaCirculation,
        v3UnifiedScore: record.v3UnifiedScore,
        conformalSelectiveTier: record.conformalSelectiveTier,
        evaluatedAt: new Date(record.evaluatedAt),
      },
    });
    upsertedCount++;
  }

  console.log(`[seed-gsi-mimic] Successfully seeded ${upsertedCount} MIMIC-IV stay records.`);
  return upsertedCount;
}

if (process.argv[1]?.includes("seed-gsi-mimic")) {
  seedGsiMimicMetrics()
    .catch((err) => {
      console.error("[seed-gsi-mimic] Seed failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
