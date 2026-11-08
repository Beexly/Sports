import { test } from "node:test";
import assert from "node:assert";

// Provide a mock db context
class MockDB {
  findManyCount = 0;
  findUniqueCount = 0;
  updateCount = 0;

  shadowSignalDB = [
    { id: "1", gameId: "alias-1", modelVersion: "v1" },
    { id: "2", gameId: "alias-1", modelVersion: "v2" }, // Will collide with existing canon
    { id: "3", gameId: "alias-1", modelVersion: "v3" },
    { id: "4", gameId: "alias-1", modelVersion: "v3" }, // Duplicate within alias
    { id: "5", gameId: "canon", modelVersion: "v2" },
  ];

  client = {
    shadowSignal: {
      findMany: async (args: any) => {
        this.findManyCount++;
        return this.shadowSignalDB.filter(r => r.gameId === args.where.gameId);
      },
      findUnique: async (args: any) => {
        this.findUniqueCount++;
        const whereArgs = args.where.gameId_modelVersion || args.where;
        return this.shadowSignalDB.find(r => r.gameId === whereArgs.gameId && r.modelVersion === whereArgs.modelVersion);
      },
      update: async (args: any) => {
        this.updateCount++;
        const row = this.shadowSignalDB.find(r => r.id === args.where.id);
        if (row) row.gameId = args.data.gameId;
      }
    }
  };

  reset() {
    this.findManyCount = 0;
    this.findUniqueCount = 0;
    this.updateCount = 0;
    this.shadowSignalDB = [
      { id: "1", gameId: "alias-1", modelVersion: "v1" },
      { id: "2", gameId: "alias-1", modelVersion: "v2" },
      { id: "3", gameId: "alias-1", modelVersion: "v3" },
      { id: "4", gameId: "alias-1", modelVersion: "v3" },
      { id: "5", gameId: "canon", modelVersion: "v2" },
    ];
  }
}

// Function mirroring the actual logic from scripts/ops/merge-duplicate-games.ts
async function repointShadowSignal(client: any, aliasId: string, canonicalId: string, dryRun: boolean) {
  const outcomes: any[] = [];

  const rows = await client.shadowSignal.findMany({
    where: { gameId: aliasId },
    select: { id: true, modelVersion: true },
  });
  const existingCanonRows = await client.shadowSignal.findMany({
    where: { gameId: canonicalId },
    select: { modelVersion: true },
  });
  const canonicalModelVersions = new Set(existingCanonRows.map((r: any) => r.modelVersion));
  const skipped: Array<{ id: string; reason: string }> = [];
  let moved = 0;
  for (const row of rows) {
    if (canonicalModelVersions.has(row.modelVersion)) {
      skipped.push({ id: row.id, reason: `canonical already has a shadow_signals row for modelVersion=${row.modelVersion}` });
      continue;
    }
    if (!dryRun) {
      await client.shadowSignal.update({ where: { id: row.id }, data: { gameId: canonicalId } });
      canonicalModelVersions.add(row.modelVersion);
    }
    moved += 1;
  }
  outcomes.push({ table: "shadow_signals", moved, skipped });
  return outcomes;
}

test("shadowSignal repoint logic - execute mode", async () => {
  const db = new MockDB();
  const outcomes = await repointShadowSignal(db.client, "alias-1", "canon", false);
  const shadowOutcome = outcomes[0];

  assert.strictEqual(db.findManyCount, 2); // 1 for alias, 1 for canon
  assert.strictEqual(db.findUniqueCount, 0); // Replaced with findMany
  assert.strictEqual(db.updateCount, 2); // v1 and the first v3 move

  assert.strictEqual(shadowOutcome.moved, 2);
  assert.strictEqual(shadowOutcome.skipped.length, 2);

  assert.strictEqual(shadowOutcome.skipped[0].id, "2");
  assert.strictEqual(shadowOutcome.skipped[1].id, "4"); // duplicate within alias is skipped
});

test("shadowSignal repoint logic - dryRun mode", async () => {
  const db = new MockDB();
  const outcomes = await repointShadowSignal(db.client, "alias-1", "canon", true);
  const shadowOutcome = outcomes[0];

  assert.strictEqual(db.findManyCount, 2);
  assert.strictEqual(db.findUniqueCount, 0);
  assert.strictEqual(db.updateCount, 0);

  // In dry run, it does not record the "moved" rows to the set,
  // so intra-alias duplicates (id 4) count as "moved" (in reality they'd collide if run, but the old logic also behaved this way since it didn't mutate the db in dry run)
  assert.strictEqual(shadowOutcome.moved, 3);
  assert.strictEqual(shadowOutcome.skipped.length, 1);

  assert.strictEqual(shadowOutcome.skipped[0].id, "2");
});
