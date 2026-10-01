/**
 * DB-outage containment for processSport — the regression test for the
 * production incident where an unreachable Postgres made ingestion fail
 * SILENTLY.
 *
 * The bug: `db.ingestionRun.create()` was the first write in processSport and
 * sat ABOVE the try that records failures, so with the database down it threw
 * outside the catch. No IngestionRun row of any status, getOdds() never
 * reached, zero credits spent, credit governor healthy, and no owner alert —
 * the one durable record that would have made it self-diagnosing was the record
 * the outage prevented from existing.
 *
 * The fix guards the run-open and the catch's own FAILED write, reporting
 * through the DB-independent channels (console + notifyOwner) and STOPPING
 * rather than continuing, because Odds.ingestionRunId is NOT NULL and every
 * downstream write needs a real run id.
 *
 * Design note: these tests assert the CONTAINED behaviour. See
 * docs/ops/ingestion-outage-proof/outage.proof.test.ts for the harness that
 * asserts the pre-fix DEFECT (it now fails against this source, by design).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";

const mocks = vi.hoisted(() => ({
  ingestionRunCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  notifyOwner: vi.fn<(m: string) => Promise<boolean>>(),
  consoleError: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: {
      upsert: vi.fn().mockResolvedValue({ id: "g-1" }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    odds: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    pick: {
      create: vi.fn().mockResolvedValue({ id: "p-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "p-1" }),
    },
    pickSignalSnapshot: { upsert: vi.fn().mockResolvedValue({}) },
    // processSport writes a proof receipt per pick. This mock omitted it, so the
    // call fell through to the REAL Prisma client and the test hung until it was
    // killed by the timeout — indefinitely at 30s, so no bump hides it. A DB
    // outage test must never reach the database it is pretending has died.
    pickProofReceipt: { upsert: vi.fn().mockResolvedValue({}) },
    gateDecision: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

// The owner alert is the DB-independent channel the fix relies on; isolate it
// so the assertions are about the CALL, never about Telegram credentials.
vi.mock("../owner-alert.js", () => ({ notifyOwner: mocks.notifyOwner }));

import { processSport } from "../process-sport.js";

// ─────────────────────────────────────────────────────────────────────────────
// WHY "absent" AND NOT "key".
//
// This test used to pass the literal string "key" as the API key. That is NOT a
// sentinel (see `oddsKeyIsSentinel` in process-sport.ts), so the paid OddsApi leg
// ran for real — a live network call inside a test that is asserting a DATABASE
// outage. It hung until the timeout, which is why only THIS test in the file
// timed out: the other four reject at run-open, before any fetch.
//
// "absent" takes the keyless path — no paid client, no network. This test is
// about containment when Postgres dies, so it must never depend on an upstream
// odds provider being reachable, slow, or paid for. Asserting outage behavior
// while making real HTTP calls is what hid this from CI.
// ─────────────────────────────────────────────────────────────────────────────
const SPORT = { key: "americanfootball_nfl", name: "NFL", displayName: "NFL" };
const gates: ReadinessGates = { canPersistCanonicalHistory: true } as ReadinessGates;

/** The exact production error: Prisma P1001 against the unreachable host. */
const OUTAGE = Object.assign(new Error("Can't reach database server at gse-postgres"), {
  code: "P1001",
});

describe("processSport DB-outage containment", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.notifyOwner.mockResolvedValue(true);
    // Silence the expected error logging; the calls are asserted directly.
    vi.spyOn(console, "error").mockImplementation((...a) => mocks.consoleError(...a));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns a failed envelope instead of throwing when the run cannot be opened", async () => {
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);

    // The regression itself: pre-fix this REJECTED and escaped processSport.
    const res = await processSport(SPORT as never, "absent", gates);

    expect(res.status).toBe("failed");
    expect(res.error).toContain("run_open_failed");
    expect(res.error).toContain("Can't reach database server");
  });

  it("alerts the owner when the run cannot be opened", async () => {
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);

    await processSport(SPORT as never, "absent", gates);

    // Pre-fix: zero calls. The outage was invisible to every dashboard.
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    const [firstCall] = mocks.notifyOwner.mock.calls;
    const msg = firstCall?.[0] ?? "";
    expect(msg).toContain("americanfootball_nfl");
    expect(msg).toContain("run_open_failed");
  });

  it("spends no credits and writes no odds when the run cannot be opened", async () => {
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);

    const res = await processSport(SPORT as never, "absent", gates);

    // We STOP rather than continue: Odds.ingestionRunId is NOT NULL, so a
    // fabricated run id would produce unattributable writes.
    expect(res.games).toBe(0);
    expect(res.picks).toBe(0);
    expect(res.oddsInserted).toBe(0);
    expect(res.paidRequestCount).toBeUndefined();
    expect(mocks.sportUpsert).not.toHaveBeenCalled();
  });

  it("still returns the failed envelope when the catch's own FAILED write ALSO fails", async () => {
      // DB up at open, then it dies: the body write AND the FAILED write both
      // fail. Pre-fix the FAILED write's throw skipped the owner alert and the
      // failed envelope, losing the record precisely when the outage is real.
      //
      // THE FETCH STUB IS LOAD-BEARING, and this test used to hang for exactly the
      // 5s test timeout. Unlike the four tests above, this one reaches the body of
      // processSport, which runs the KEYLESS odds path (ESPN / TheRundown) — real
      // HTTPS to a third party — before it ever reaches `db.sport.upsert`. It is a
      // test about what happens when POSTGRES DIES; it has no business depending on
      // whether an upstream odds provider is reachable, or how slow it is today.
      //
      // It passed in CI for a long time only because the network was fast enough to
      // fit inside the timeout, then failed the moment it wasn't. Stubbing fetch
      // removes the dependency entirely: the test now asserts containment, and
      // containment is all it was ever about. This also makes it deterministic.
      (globalThis as unknown as { fetch: unknown }).fetch = vi.fn(async () => {
        throw new Error("network disabled in process-sport-db-outage tests");
      });
    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    mocks.sportUpsert.mockRejectedValue(new Error("body write failed"));
    mocks.ingestionRunUpdate.mockRejectedValue(OUTAGE);

    const res = await processSport(SPORT as never, "absent", gates);

    expect(res.status).toBe("failed");
    expect(res.error).toContain("body write failed");
    // The alert survives the failed FAILED-recording write.
    expect(mocks.notifyOwner).toHaveBeenCalledTimes(1);
    expect(mocks.ingestionRunUpdate).toHaveBeenCalledTimes(1);
  });

  it("a dead alert channel does not stop the failure from being returned", async () => {
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);
    mocks.notifyOwner.mockResolvedValue(false); // Telegram down, same as the DB

    const res = await processSport(SPORT as never, "absent", gates);

    expect(res.status).toBe("failed");
    expect(res.error).toContain("run_open_failed");
  });
});
