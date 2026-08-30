/**
 * Live-DB integration smoke — exercises behavior the stub Prisma client CANNOT:
 * real enum/type round-trips, DB-enforced unique constraints (the TOCTOU guard),
 * and the relation query the public picks API relies on.
 *
 * Requires a real DATABASE_URL (a disposable Postgres is fine — see
 * docs/dev or the session notes). Run: `npm run test:integration:db`.
 *
 * Closes the "apps/web tests run on a stub Prisma → no live-DB coverage" gap (R7).
 * Exits non-zero on the first failed assertion.
 */

import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  console.error("[db-smoke] DATABASE_URL not set — skipping (this suite needs a real DB).");
  process.exit(2);
}

const db = new PrismaClient();
const stamp = Date.now();
let failures = 0;

function check(label, cond) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}

async function main() {
  console.log("[db-smoke] live-DB integration smoke");

  // ── Setup: a sport + game ────────────────────────────────────────────────
  const sport = await db.sport.create({
    data: { key: `nfl_test_${stamp}`, name: "NFL", displayName: "Test NFL" },
  });
  const game = await db.game.create({
    data: {
      externalId: `evt_${stamp}`,
      sportId: sport.id,
      homeTeamName: "Home Dogs",
      awayTeamName: "Away Favs",
      commenceTime: new Date(Date.now() + 3_600_000),
    },
  });

  // ── 1. Enum + typed-field round-trip through real Postgres ───────────────
  // (away-favored spread; line stored HOME-perspective per the P0 settlement fix)
  const pick = await db.pick.create({
    data: {
      gameId: game.id,
      pickType: "SPREAD",
      selection: "Away Favs -6.0",
      line: 6, // home is +6 underdog → home perspective
      confidence: 68,
      reasoning: "integration smoke",
      modelVersion: "test",
      tier: "FREE",
      isBootstrap: false,
      isPublished: true,
    },
  });
  check("creates a Pick with enum/float/int fields", pick.id && pick.pickType === "SPREAD" && pick.line === 6);

  // ── 2. DB-enforced unique constraint [gameId, pickType] (TOCTOU guard) ────
  let uniqueEnforced = false;
  try {
    await db.pick.create({
      data: {
        gameId: game.id,
        pickType: "SPREAD", // duplicate (gameId, pickType)
        selection: "dupe",
        line: 6,
        confidence: 50,
        reasoning: "dupe",
        modelVersion: "test",
      },
    });
  } catch (err) {
    uniqueEnforced = err?.code === "P2002";
  }
  check("Postgres rejects a duplicate [gameId, pickType] (P2002)", uniqueEnforced);

  // ── 3. Relation query mirroring the public picks API ─────────────────────
  const publicPicks = await db.pick.findMany({
    where: { isPublished: true, isBootstrap: false, tier: "FREE" },
    include: { game: { include: { sport: { select: { name: true, key: true } } } } },
  });
  const found = publicPicks.find((p) => p.id === pick.id);
  check("relation query returns the pick with nested game+sport", Boolean(found && found.game.sport.name === "NFL"));

  // ── 3b. Server-side paywall tier gate (CLAUDE.md rule #3 — security-critical) ──
  const premiumPick = await db.pick.create({
    data: {
      gameId: game.id,
      pickType: "TOTAL",
      selection: "OVER 44.5",
      line: 44.5,
      confidence: 82,
      reasoning: "premium smoke",
      modelVersion: "test",
      tier: "PREMIUM",
      isBootstrap: false,
      isPublished: true,
    },
  });
  const freeOnly = await db.pick.findMany({
    where: { gameId: game.id, isPublished: true, isBootstrap: false, tier: "FREE" },
  });
  check(
    "FREE-tier DB query excludes PREMIUM picks (paywall enforced at the query layer)",
    freeOnly.some((p) => p.id === pick.id) && !freeOnly.some((p) => p.id === premiumPick.id),
  );
  const allTiers = await db.pick.findMany({
    where: { gameId: game.id, isPublished: true, isBootstrap: false },
  });
  check("premium-entitled query (no tier filter) returns both FREE and PREMIUM", allTiers.length >= 2);

  // ── 3c. Bootstrap fencing — bootstrap picks never leak to public queries ──
  await db.pick.create({
    data: {
      gameId: game.id,
      pickType: "MONEYLINE",
      selection: "Away Favs ML",
      line: -180,
      confidence: 90,
      reasoning: "bootstrap smoke",
      modelVersion: "test",
      tier: "FREE",
      isBootstrap: true, // pre-canonical — must be excluded from public stats/picks
      isPublished: true,
    },
  });
  const publicCanonical = await db.pick.findMany({
    where: { gameId: game.id, isPublished: true, isBootstrap: false },
  });
  check(
    "isBootstrap=true picks are excluded from the public (canonical) query",
    publicCanonical.every((p) => p.pickType !== "MONEYLINE"),
  );

  // ── 4. Settlement write/read round-trip ──────────────────────────────────
  await db.pick.update({ where: { id: pick.id }, data: { result: "LOSS", settledAt: new Date() } });
  const settled = await db.pick.findUnique({ where: { id: pick.id } });
  check("settlement update persists (result=LOSS)", settled?.result === "LOSS");

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await db.pick.deleteMany({ where: { gameId: game.id } });
  await db.game.delete({ where: { id: game.id } });
  await db.sport.delete({ where: { id: sport.id } });
  console.log("  ✓ cleanup");
}

main()
  .catch((err) => {
    console.error("[db-smoke] fatal:", err);
    failures += 1;
  })
  .finally(async () => {
    await db.$disconnect();
    if (failures > 0) {
      console.error(`[db-smoke] FAILED (${failures} assertion(s))`);
      process.exit(1);
    }
    console.log("[db-smoke] OK — live-DB path verified");
  });
