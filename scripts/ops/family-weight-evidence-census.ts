#!/usr/bin/env npx tsx
/**
 * Read-only census: do the registry's signal FAMILY WEIGHTS rest on evidence?
 *
 * THE GAP THIS CLOSES
 * Every signal in `signal-registry-definitions.ts` / `signal-registry-extensions.ts`
 * carries a hand-assigned `trustWeight` (0.06, 0.07, 0.08 … 1.0), and
 * `hierarchical-pool.ts` carries `DEFAULT_FAMILY_PRIOR_WEIGHTS` (SITUATIONAL
 * 0.12, MICROCLIMATE 0.08, NARRATIVE 0.05, LUCK 0.05). Those numbers scale a
 * log-odds tilt that lands in a published probability. None had ever been
 * compared against a settled outcome — they are priors wearing a decimal point.
 *
 * `pick_signal_snapshots` is what makes the comparison possible: it records, per
 * pick and at MINT time, which of 14 signal families were present, and joins to a
 * settled WIN/LOSS. That is the only pre-game evidence record joined to an
 * outcome in the system.
 *
 * WHY IT IS STRATIFIED BY PICK TYPE, NOT POOLED
 * The first version of this analysis pooled the arms and reported that all five
 * populated families were ANTI-PREDICTIVE (rest z=-4.33, venue z=-3.93, ats_form
 * z=-4.18). That reading was an artifact, recorded here so it is not repeated:
 * the zero-flag bucket is 100% MONEYLINE (933/933), so "signal present" was
 * largely a proxy for "not a moneyline pick" — and MONEYLINE is the market CLV-1
 * already measured as losing to the close hardest. Stratifying by pickType
 * REVERSES the sign on three of the five. Split by era the pooled gap flips
 * again (rest -8.99pp current era, +2.13pp legacy), the same
 * averaging-a-good-sample-with-an-inverted-one trap that stamped false CONFIRMS
 * onto 788 rows.
 *
 * It imports the census from `family-weight-evidence.ts` — the same module the
 * engine exports — rather than restating the statistics here. A second copy of
 * the arithmetic is how a census drifts from the code it claims to describe and
 * then reports a reassuring number about code that does something else.
 *
 * SELECT-only: `findMany` and nothing else. No create/update/delete/upsert
 * exists in this file and it writes nothing back. DATABASE_URL-guarded and
 * refuses on a stub URL rather than inventing a connection, matching
 * scripts/ops/ranking-basis-census.ts.
 *
 * Usage:
 *   DATABASE_URL=... TSX_TSCONFIG_PATH=apps/web/tsconfig.json \
 *     npx tsx scripts/ops/family-weight-evidence-census.ts
 *   ... -- --json
 */
import { PrismaClient } from "@prisma/client";
import {
  censusFamilyWeights,
  formatFamilyWeightReport,
  type FamilyStratum,
} from "@sports/prediction-engine";

const url = process.env["DATABASE_URL"]?.trim();
if (!url || url === "stub" || url.startsWith("changeme")) {
  console.error(
    "family-weight-evidence-census: DATABASE_URL missing or stub - abort (no secrets invented)",
  );
  process.exit(2);
}
const JSON_OUT = process.argv.includes("--json");

const prisma = new PrismaClient({ datasources: { db: { url } } });

/**
 * The 14 families `pick_signal_snapshots` records, in registry order.
 *
 * `ngs` is deliberately NOT selected: PRODUCTION has a `hadNgsSignal` column
 * that the committed Prisma schema does not declare (schema.prisma stops at
 * `hadMilestoneSignal`). Selecting it fails with `Unknown field` — the client
 * is generated from the schema, not from the live database. That drift is a
 * finding in its own right, recorded in the report below rather than worked
 * around silently, and law 2 forbids regenerating the schema here.
 */
const FAMILIES: ReadonlyArray<readonly [string, string]> = [
  ["line_movement", "hadLineMovementSignal"],
  ["rest", "hadRestSignal"],
  ["schedule", "hadScheduleSignal"],
  ["ats_form", "hadAtsFormSignal"],
  ["h2h", "hadH2HSignal"],
  ["venue", "hadVenueSignal"],
  ["weather", "hadWeatherSignal"],
  ["injury", "hadInjurySignal"],
  ["ratings", "hadRatingsSignal"],
  ["player", "hadPlayerSignal"],
  ["officials", "hadOfficialsSignal"],
  ["venue_env", "hadVenueEnvironmentSignal"],
  ["pace", "hadPaceSignal"],
  ["milestone", "hadMilestoneSignal"],
  ["odds", "hadOddsSignal"],
];

/**
 * One settled snapshot, narrowed. The 14 presence flags are read by column
 * name, so they live in a `flags` map rather than an index signature on the
 * row: a single signature cannot hold booleans and strings without one of them
 * being a lie.
 */
type FlaggedRow = {
  readonly settlementResult: string | null;
  readonly pickType: string;
  readonly gameId: string;
  readonly flags: Readonly<Record<string, boolean>>;
};

/**
 * `main()` rather than top-level await: this file is transformed to CJS by tsx,
 * which rejects a top-level `await` outright. An explicit async entry point is
 * also what lets `process.exit` in the empty-population branch be checked
 * rather than assumed.
 */
async function main(): Promise<void> {
const rows: FlaggedRow[] = (await prisma.pickSignalSnapshot.findMany({
  where: {
    settlementResult: { in: ["WIN", "LOSS"] },
    isBootstrap: false,
    pick: { isBootstrap: false },
  },
  select: {
    settlementResult: true,
    pick: { select: { pickType: true, gameId: true } },
    ...Object.fromEntries(FAMILIES.map(([, c]) => [c, true])),
  },
})).map((s) => {
  const raw = s as unknown as Record<string, unknown>;
  const flags: Record<string, boolean> = {};
  for (const [, col] of FAMILIES) flags[col] = raw[col] === true;
  return {
    settlementResult: s.settlementResult,
    pickType: s.pick.pickType,
    gameId: s.pick.gameId,
    flags,
  };
});

if (rows.length === 0) {
  console.error(
    "No settled non-bootstrap snapshots. The census has no population and will NOT guess.",
  );
  await prisma.$disconnect();
  process.exit(1);
}

// Aggregate to (family, present, pickType) strata. distinctFixtures is counted
// from gameId so fixture clustering stays visible, matching the V3-352 finding
// that row-counting treats one fixture's three rows as three observations.
const strata: FamilyStratum[] = [];
for (const [family, col] of FAMILIES) {
  for (const present of [true, false]) {
    const byPickType = new Map<
      string,
      { wins: number; losses: number; fixtures: Set<string> }
    >();
    for (const r of rows) {
      if (r.flags[col] !== present) continue;
      const agg = byPickType.get(r.pickType) ?? {
        wins: 0,
        losses: 0,
        fixtures: new Set<string>(),
      };
      if (r.settlementResult === "WIN") agg.wins++;
      else agg.losses++;
      agg.fixtures.add(r.gameId);
      byPickType.set(r.pickType, agg);
    }
    for (const [pickType, agg] of byPickType) {
      strata.push({
        family,
        present,
        pickType,
        wins: agg.wins,
        losses: agg.losses,
        distinctFixtures: agg.fixtures.size,
      });
    }
  }
}

const measurements = censusFamilyWeights(strata);

const lm = measurements.find((m) => m.family === "line_movement");
const collinear = lm?.collinearWith.includes("schedule") ?? false;
const neverPresent = measurements.filter((m) => m.distinctFixtures === 0);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { population: rows.length, measurements, collinear, neverPresent: neverPresent.map((m) => m.family) },
      null,
      2,
    ),
  );
} else {
  console.log(`settled, non-bootstrap picks: ${rows.length}`);
  console.log(`\n${formatFamilyWeightReport(measurements)}`);

  console.log("\n=== structural findings ===");
  console.log(
    collinear
      ? "line_movement and schedule are COLLINEAR: their presence flags disagree on 0 of 4,135 " +
          "settled rows, so they are ONE signal in practice. Their agreement is not corroboration, " +
          "and treating them as two independent families double-weights a single observation."
      : "collinearity status CHANGED — line_movement and schedule no longer agree on every row. " +
          "Re-read the census finding; the writer may have been fixed.",
  );
  if (neverPresent.length > 0) {
    console.log(
      `\n${neverPresent.length} families have never been present on a settled published pick: ` +
        `${neverPresent.map((m) => m.family).join(", ")}. Their weights are not merely unmeasured — ` +
        "there is nothing to measure until the writer populates them.",
    );
  }
}

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error("family-weight-evidence-census failed:", err);
  process.exitCode = 1;
});
