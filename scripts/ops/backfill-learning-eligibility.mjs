#!/usr/bin/env node
/**
 * D-4 (C11 BEFORE DEPLOY / C12 PART 5): backfill PickSignalSnapshot
 * .eligibleForLearning for rows settled BEFORE the stamp logic existed.
 *
 * Why: the stamp (apps/web/lib/settlement/free-path-snapshot.ts:53) is
 *   gates.canLearnFromOutcomes && !pick.isBootstrap && isDecisive
 * and is applied only at settlement time. Snapshots settled while
 * OUTCOME_LEARNING_ENABLED was off carry eligibleForLearning=false forever —
 * the permanent data-loss trap (C11 R8): calibration floors count these rows
 * as ineligible even though the outcome is stored and usable.
 *
 * This script RECOMPUTES the stamp from stored fields. It never invents an
 * outcome and never touches bootstrap rows.
 *
 * Ordering (Stage 4, irreversible pair): run AFTER flipping
 * OUTCOME_LEARNING_ENABLED and BEFORE flipping CANONICAL_HISTORY_ENABLED.
 * Gate flipping is the founder's console action; this script only backfills.
 *
 * Usage:
 *   node scripts/ops/backfill-learning-eligibility.mjs            # dry run (default)
 *   node scripts/ops/backfill-learning-eligibility.mjs --apply    # write
 *
 * Idempotent: rows already stamped are skipped; re-running is safe.
 * Refuses to run if OUTCOME_LEARNING_ENABLED is not truthy at execution time
 * (the stamp condition requires canLearnFromOutcomes=true; stamping rows while
 * the gate is off would mark them eligible against the current posture).
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

/**
 * Mirror of parseBool() in packages/prediction-engine/src/platform-config.ts:146
 * (undefined/"" -> default; else lowercase "true" or "1"). Read directly rather
 * than importing the built package: packages/prediction-engine/dist is not
 * committed, so a dist import would fail on a fresh clone.
 */
function gateOn(name) {
  const v = process.env[name];
  if (v === undefined || v === "") return false;
  return v.toLowerCase() === "true" || v === "1";
}

async function main() {
  if (!gateOn("OUTCOME_LEARNING_ENABLED")) {
    console.error(
      "REFUSED: OUTCOME_LEARNING_ENABLED is off at execution time.\n" +
        "The eligibility stamp means 'this outcome may train/adjust models'.\n" +
        "Flip the gate first (founder console action), then run this script,\n" +
        "then — and only then — CANONICAL_HISTORY_ENABLED.",
    );
    process.exitCode = 2;
    return;
  }

  // Candidates: settled decisively, non-bootstrap, not yet stamped.
  // settlementResult is a String column mirroring the PickResult enum
  // (schema.prisma:841); PUSH is excluded — isDecisive means WIN|LOSS.
  const where = {
    isBootstrap: false,
    settlementResult: { in: ["WIN", "LOSS"] },
    eligibleForLearning: false,
  };
  const settled = await prisma.pickSignalSnapshot.count({ where });
  const already = await prisma.pickSignalSnapshot.count({
    where: { eligibleForLearning: true },
  });
  const bootstrapSkipped = await prisma.pickSignalSnapshot.count({
    where: { isBootstrap: true, settlementResult: { not: null } },
  });

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "APPLY" : "DRY-RUN",
        candidates: settled,
        alreadyStamped: already,
        bootstrapRowsLeftAlone: bootstrapSkipped,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("Dry run. Re-run with --apply to stamp.");
    return;
  }
  if (settled === 0) {
    console.log("Nothing to stamp.");
    return;
  }

  // learningEligibleAt = when we LEARNED it was eligible (now), not settledAt:
  // the field records eligibility provenance, and settledAt already exists.
  const res = await prisma.pickSignalSnapshot.updateMany({
    where,
    data: { eligibleForLearning: true, learningEligibleAt: new Date() },
  });
  console.log(`Stamped ${res.count} snapshot(s).`);

  // Post-check: candidates must be zero after a clean apply.
  const remaining = await prisma.pickSignalSnapshot.count({ where });
  if (remaining !== 0) {
    console.error(`VERIFY FAILED: ${remaining} candidates remain unstamped.`);
    process.exitCode = 1;
  } else {
    console.log("VERIFY OK: 0 candidates remain.");
  }
}

main()
  .catch((e) => {
    console.error("BACKFILL ERROR:", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
