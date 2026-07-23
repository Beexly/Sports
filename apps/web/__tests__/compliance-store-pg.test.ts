/**
 * apps/web/lib/compliance/store.ts against REAL Postgres — proves the
 * Prisma adapters actually write/read the ComplianceEvidence /
 * ComplianceCheckRun / ComplianceException tables, which a mocked test
 * cannot prove.
 *
 * Gated on DATABASE_URL, same HAS_DB convention as the other *-pg.test.ts
 * files in this directory (see ai-control-plane-formal-incident-pg.test.ts).
 *
 * Local run:
 *   bash scripts/dev/disposable-postgres.sh
 *   FORCE_REAL_PRISMA=true \
 *     DATABASE_URL="postgresql://postgres@127.0.0.1:5433/sports_test?schema=public" \
 *     ../../node_modules/.bin/vitest run compliance-store-pg
 */
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@sports/db";
import {
  persistEvidence,
  saveRun,
  openException,
  listOpenExceptions,
  loadLastRun,
  sampleEvidence,
} from "@/lib/compliance/store";
import type { CcmRunResult } from "@sports/compliance";

const HAS_DB = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");
const suite = HAS_DB ? describe : describe.skip;

suite("compliance store — real Postgres", () => {
  const controlId = `CTL-TEST-${randomUUID().slice(0, 8)}`;

  afterAll(async () => {
    await db.complianceEvidence.deleteMany({ where: { controlId } });
    await db.complianceException.deleteMany({ where: { controlId } });
  });

  it("persistEvidence writes a row and sampleEvidence reads it back", async () => {
    const id = await persistEvidence({
      controlId,
      source: "test-source",
      collectedAt: new Date().toISOString(),
      contentHash: "deadbeef",
      meta: { foo: "bar" },
    });
    expect(typeof id).toBe("string");

    const sample = await sampleEvidence(200);
    const found = sample.find((e) => e.id === id);
    expect(found).toBeDefined();
    expect(found?.controlId).toBe(controlId);
    expect(found?.contentHash).toBe("deadbeef");
  });

  it("openException writes an open exception visible via listOpenExceptions", async () => {
    await openException(controlId, "test failure detail");
    const open = await listOpenExceptions(500);
    const found = open.find((e) => e.controlId === controlId);
    expect(found).toBeDefined();
    expect(found?.status).toBe("open");
    expect(found?.detail).toBe("test failure detail");
  });

  it("saveRun writes a run visible via loadLastRun", async () => {
    const run: CcmRunResult = {
      at: new Date().toISOString(),
      ok: false,
      results: [{ controlId, ok: false, detail: "x", evidenceIds: [] }],
    };
    await saveRun(run);
    const last = await loadLastRun();
    expect(last).toBeDefined();
    expect(last?.ok).toBe(false);
  });
});
