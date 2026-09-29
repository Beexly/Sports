/**
 * Builds a TEMP copy of the real process-sport test suite, verbatim, with two
 * DB-outage cases appended. The mock surface is the repo's own, byte-for-byte,
 * so this exercises the REAL unmodified process-sport.ts.
 *
 * Writes ONLY to TEMP. The repo is not touched.
 */
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/Garrett/sports";
const SRC = path.join(REPO, "packages/ingestion-pipeline/src/__tests__/process-sport.test.ts");
const OUT_DIR = "C:/Users/Garrett/AppData/Local/Temp/ingest-proof/suite";
const OUT = path.join(OUT_DIR, "outage-proof.test.ts");

const original = fs.readFileSync(SRC, "utf8");

// Insert the proof cases just before the final closing of the file so they live
// inside the same describe() and share `mocks`, `SPORT`, `gates`.
const cases = `

  // ===================================================================
  // DB OUTAGE PROOFS (appended by ingest-proof harness; repo untouched)
  // ===================================================================

  it("PROOF A: outage at ingestionRun.create() escapes processSport and alerts nobody", async () => {
    const OUTAGE = Object.assign(
      new Error("Can't reach database server at gse-postgres"),
      { code: "P1001" },
    );
    mocks.ingestionRunCreate.mockRejectedValue(OUTAGE);

    let outcome: unknown = "<never assigned>";
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT, "key", gates());
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    const report = {
      threw: threw ?? "(did not throw)",
      resolvedEnvelope: outcome,
      ingestionRunUpdateCalls: mocks.ingestionRunUpdate.mock.calls.length,
      ownerAlerted: mocks.notifyOwner.mock.calls.length > 0,
    };
    console.log("PROOF_A " + JSON.stringify(report));

    // Documented, measured behaviour of the CURRENT code:
    expect(threw).not.toBeNull();
  });

  it("PROOF B: DB dies mid-body -> the catch's own FAILED write throws and the owner is never alerted", async () => {
    // DB is up at open (create succeeds) ...
    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    // ... then the body fails, AND the FAILED-recording write fails too.
    mocks.sportUpsert.mockRejectedValue(new Error("body write blew up"));
    mocks.ingestionRunUpdate.mockRejectedValue(
      Object.assign(new Error("Can't reach database server at gse-postgres"), { code: "P1001" }),
    );

    let outcome: unknown = "<never assigned>";
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT, "key", gates());
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    const report = {
      threw: threw ?? "(did not throw)",
      resolvedEnvelope: outcome,
      updateAttempts: mocks.ingestionRunUpdate.mock.calls.length,
      ownerAlerted: mocks.notifyOwner.mock.calls.length > 0,
    };
    console.log("PROOF_B " + JSON.stringify(report));

    // The catch's FAILED write is unguarded, so the failure escapes.
    expect(report.updateAttempts).toBeGreaterThan(0);
  });
`;

// The suite's describe() block: append inside the last one. Find the final
// "});" that closes the file and insert before it.
const idx = original.lastIndexOf("\n});");
if (idx === -1) throw new Error("could not locate describe() close");
const out = original.slice(0, idx) + cases + original.slice(idx);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, out, "utf8");
console.log("wrote " + OUT + " (" + out.split("\n").length + " lines)");
