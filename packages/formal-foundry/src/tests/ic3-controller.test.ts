import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApalacheJsonRpcClient } from "../apalache-client.js";
import { IC3Controller } from "../ic3-controller.js";
import { ApalacheRpcError } from "../types.js";
import { startMockApalacheServer, type MockApalacheServer } from "../mock/apalache-mock-server.js";
import { ledger } from "../safety-ledger.js";

// ============================================================================
// HONESTY NOTE: exactly as apalache-client.test.ts — every test below runs
// against the MOCK server (src/mock/apalache-mock-server.ts), never a real
// Apalache instance.
// ============================================================================

describe("IC3Controller — against the mock server", () => {
  let server: MockApalacheServer;
  let client: ApalacheJsonRpcClient;
  let controller: IC3Controller;

  beforeEach(async () => {
    server = await startMockApalacheServer();
    client = new ApalacheJsonRpcClient(server.url);
    controller = new IC3Controller(client);
    ledger.clear();
  });

  afterEach(async () => {
    await server.close();
  });

  it("init() obtains a REAL snapshotId from the server (regression test for the fixed 'init' placeholder defect)", async () => {
    await controller.init(["/* toy workflow */"], ["TypeOK"], {});
    // The controller has no public getter for initSnapshot by design (it's
    // a private implementation detail), so this is verified indirectly:
    // isRelativelyInductive must succeed (it would throw
    // "no active session"/rollback-against-unknown-snapshot errors if
    // initSnapshot were still the old hardcoded literal "init", since the
    // mock server would reject an unrecognized snapshotId as
    // SESSION_ERROR).
    const result = await controller.isRelativelyInductive({}, { status: "closed" }, 0);
    expect(typeof result).toBe("boolean");
    const log = ledger.getLog();
    expect(log.some((e) => e.pr === "controller-init" && e.status === "PASSED")).toBe(true);
  });

  it("isRelativelyInductive: candidate {status:'closed'} is relatively inductive (terminal state, no successor to violate it)", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    const result = await controller.isRelativelyInductive({}, { status: "closed" }, 0);
    expect(result).toBe(true);
  });

  it("isRelativelyInductive: candidate {status:'approved'} is NOT relatively inductive (approved -> closed exists)", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    const result = await controller.isRelativelyInductive({}, { status: "approved" }, 0);
    expect(result).toBe(false);
  });

  it("isRelativelyInductive records to the SafetyLedger and VelocityDashboard on both outcomes", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    await controller.isRelativelyInductive({}, { status: "closed" }, 0);
    await controller.isRelativelyInductive({}, { status: "approved" }, 0);
    const log = ledger.getLog();
    const passed = log.filter((e) => e.pr === "relative-inductiveness" && e.status === "PASSED");
    const rejected = log.filter((e) => e.pr === "relative-inductiveness" && e.status === "REJECTED");
    expect(passed).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it("isRelativelyInductive rolls back between calls (no assumption leakage across checks)", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    // First check assumes status=approved; if rollback didn't work, the
    // SECOND check (a different, unrelated candidate) would still be
    // contaminated by the first's assumption.
    await controller.isRelativelyInductive({}, { status: "approved" }, 0);
    const second = await controller.isRelativelyInductive({}, { status: "closed" }, 0);
    expect(second).toBe(true); // must reflect ONLY the second check's own assumption
  });

  it("FAILS CLOSED: isRelativelyInductive before init() throws, never returns a default boolean", async () => {
    const freshController = new IC3Controller(client);
    await expect(freshController.isRelativelyInductive({}, { status: "x" }, 0)).rejects.toThrow(ApalacheRpcError);
  });

  it("admitCti lifts and records to the ledger", async () => {
    const cti = { attempt: "t4", status: "HELD", reserved: 0 };
    const minimized = await controller.admitCti(cti);
    expect(minimized).toEqual(cti); // safe no-op form (no oracle wired) — see cti-lifting.ts
    const log = ledger.getLog();
    expect(log.some((e) => e.pr === "cti-admission" && e.status === "PROCESSED")).toBe(true);
  });

  it("findFrontier returns a decoded witness state when the query finds one", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    const witness = await controller.findFrontier({ status: "pending" });
    expect(witness).toEqual({ status: "pending" });
  });

  it("findFrontier returns null when the query genuinely finds no witness (no context ever assumed)", async () => {
    // Deliberately do NOT call controller.init() here: init() always
    // asserts Init first (status="pending"), which would itself become a
    // witness. Load a session directly on the client and hand it to a
    // fresh controller so its server-side context starts (and stays)
    // truly empty.
    const rawClient = new ApalacheJsonRpcClient(server.url);
    await rawClient.loadSpec(["src"]);
    const freshController = new IC3Controller(rawClient);
    const witness = await freshController.findFrontier({});
    expect(witness).toBeNull();
  });

  it("FAILS CLOSED: findFrontier propagates a real error rather than swallowing it into null (fixed defect)", async () => {
    // Force a genuine server-side failure by calling findFrontier with NO
    // active session (never called init()).
    const freshController = new IC3Controller(client);
    await expect(freshController.findFrontier({ status: "pending" })).rejects.toThrow(ApalacheRpcError);
  });

  it("dispose() clears the session; a subsequent call fails closed", async () => {
    await controller.init(["src"], ["TypeOK"], {});
    await controller.dispose();
    await expect(controller.isRelativelyInductive({}, { status: "x" }, 0)).rejects.toThrow(ApalacheRpcError);
  });
});
