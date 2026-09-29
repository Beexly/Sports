/**
 * READ-ONLY proof harness. Lives in TEMP, not in the repo.
 * Imports the REAL packages/ingestion-pipeline/src/process-sport.ts and mocks
 * only @sports/db, to observe what processSport does when Postgres is down.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestionRunCreate: vi.fn<(a: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(a: unknown) => Promise<unknown>>(),
  notifyOwner: vi.fn<(m: string) => Promise<boolean>>(),
}));

const REAL = "C:/Users/Garrett/sports/packages/ingestion-pipeline/src/process-sport.ts";

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: vi.fn(async () => ({ id: "s-1" })) },
    game: {
      upsert: vi.fn(async () => ({ id: "g-1" })),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
    pick: { create: vi.fn(async () => ({ id: "p-1" })), updateMany: vi.fn(async () => ({})) },
    odds: { createMany: vi.fn(async () => ({ count: 0 })) },
    pickSignalSnapshot: { create: vi.fn(async () => ({})) },
    sourceSnapshot: { create: vi.fn(async () => ({})) },
    teamGameLog: { createMany: vi.fn(async () => ({ count: 0 })) },
    playerGameLog: { createMany: vi.fn(async () => ({ count: 0 })) },
  },
  isStubMode: () => false,
}));

vi.mock("C:/Users/Garrett/sports/packages/ingestion-pipeline/src/owner-alert.ts", () => ({
  notifyOwner: mocks.notifyOwner,
}));

const { processSport } = await import(REAL);

const SPORT = { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" };
const gates = { canPersistCanonicalHistory: true };

const OUTAGE = Object.assign(new Error("Can't reach database server at gse-postgres"), {
  code: "P1001",
});

describe("DB outage: is the ingestion failure always recorded?", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("DEFECT 1 — outage at create(): resolves, but NOTHING is recorded or alerted", async () => {
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);

    let outcome: unknown;
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT as never, "key", gates as never);
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    console.info(
      `\n[DEFECT 1] create() rejects with P1001\n` +
        `  threw:                 ${threw ?? "(did not throw)"}\n` +
        `  resolved envelope:     ${JSON.stringify(outcome)}\n` +
        `  ingestionRun.update:   ${mocks.ingestionRunUpdate.mock.calls.length} call(s)\n` +
        `  notifyOwner:           ${mocks.notifyOwner.mock.calls.length} call(s)`
    );

    // The failure record is impossible (the DB is down) — but the owner
    // alert and the failed envelope are NOT DB-dependent and are lost too.
    expect(threw).not.toBeNull(); // escapes processSport
    expect(mocks.notifyOwner).not.toHaveBeenCalled(); // owner never told
  });

  it("DEFECT 2 — body fails AND the DB stays down: catch's own FAILED write throws, alert lost", async () => {
    // create succeeds (DB up at open) ...
    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    // ... then the DB dies, so BOTH the body write and the FAILED write fail.
    mocks.ingestionRunUpdate.mockRejectedValue(OUTAGE);
    const { pickCreate } = mocks as unknown as Record<string, { mockRejectedValue: (e: unknown) => void }>;
    void pickCreate;

    // Force the body to fail via a body write, using the real code path:
    // make sport.upsert reject (called early in the try).
    const dbMod = await import("@sports/db");
    (dbMod.db.sport.upsert as unknown as { mockRejectedValue: (e: unknown) => void }).mockRejectedValue(
      new Error("body write failed"),
    );

    let outcome: unknown;
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT as never, "key", gates as never);
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    console.info(
      `\n[DEFECT 2] body fails, FAILED-recording write also fails (P1001)\n` +
        `  threw:               ${threw ?? "(did not throw)"}\n` +
        `  resolved envelope:   ${JSON.stringify(outcome)}\n` +
        `  update() attempts:   ${mocks.ingestionRunUpdate.mock.calls.length}\n` +
        `  notifyOwner:         ${mocks.notifyOwner.mock.calls.length} call(s)   <-- owner alert`
    );

    expect(mocks.notifyOwner).not.toHaveBeenCalled();
  });
});
