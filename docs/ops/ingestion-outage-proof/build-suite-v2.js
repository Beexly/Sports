/**
 * Builds a TEMP copy of the real process-sport suite, VERBATIM, with
 *   (a) an owner-alert spy wired in, and
 *   (b) two DB-outage proof cases appended inside the same describe().
 * The mock surface is the repo's own, so this exercises the REAL, unmodified
 * process-sport.ts. Writes ONLY to TEMP; the repo is never touched.
 */
const fs = require("fs");
const path = require("path");

const SRC = "C:/Users/Garrett/sports/packages/ingestion-pipeline/src/__tests__/process-sport.test.ts";
const OUT_DIR = "C:/Users/Garrett/AppData/Local/Temp/ingest-proof/suite/__tests__";
const OUT = path.join(OUT_DIR, "outage-proof.test.ts");

let src = fs.readFileSync(SRC, "utf8");
const before = src;

// --- transform 1: add a notifyOwner spy to the hoisted mocks -----------------
const anchorMocks = `  independentsInput: vi.fn<(input: unknown) => void>(),
}));`;
if (!src.includes(anchorMocks)) throw new Error("anchor 1 not found");
src = src.replace(
  anchorMocks,
  `  independentsInput: vi.fn<(input: unknown) => void>(),
  notifyOwner: vi.fn<(m: string) => Promise<boolean>>(),
}));

vi.mock("../owner-alert.js", () => ({ notifyOwner: mocks.notifyOwner }));`
);

// --- transform 2: default the spy so unrelated tests are unaffected ---------
const anchorBeforeEach = `    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });`;
if (!src.includes(anchorBeforeEach)) throw new Error("anchor 2 not found");
src = src.replace(
  anchorBeforeEach,
  `${anchorBeforeEach}\n    mocks.notifyOwner.mockResolvedValue(false);`
);

// --- transform 3: append the proof cases inside the final describe() --------
const cases = `
  // ===================================================================
  // DB OUTAGE PROOFS (harness addition; repo untouched)
  // ===================================================================

  it("PROOF A: outage at ingestionRun.create() escapes processSport; owner never alerted", async () => {
    mocks.ingestionRunCreate.mockReset();
    mocks.ingestionRunUpdate.mockReset();
    mocks.notifyOwner.mockReset();

    mocks.ingestionRunCreate.mockRejectedValue(
      Object.assign(new Error("Can't reach database server at gse-postgres"), { code: "P1001" }),
    );

    let outcome: unknown = "<never assigned>";
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT, "key", gates());
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    console.log("PROOF_A " + JSON.stringify({
      threw: threw ?? "(did not throw)",
      resolvedEnvelope: outcome,
      updateCalls: mocks.ingestionRunUpdate.mock.calls.length,
      ownerAlerted: mocks.notifyOwner.mock.calls.length > 0,
    }));
  });

  it("PROOF B: DB dies mid-body; the catch's own FAILED write throws; owner never alerted", async () => {
    mocks.ingestionRunCreate.mockReset();
    mocks.ingestionRunUpdate.mockReset();
    mocks.notifyOwner.mockReset();

    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });       // DB up at open
    mocks.sportUpsert.mockRejectedValue(new Error("body write blew up")); // body fails
    mocks.ingestionRunUpdate.mockRejectedValue(                          // FAILED write fails too
      Object.assign(new Error("Can't reach database server at gse-postgres"), { code: "P1001" }),
    );

    let outcome: unknown = "<never assigned>";
    let threw: string | null = null;
    try {
      outcome = await processSport(SPORT, "key", gates());
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    console.log("PROOF_B " + JSON.stringify({
      threw: threw ?? "(did not throw)",
      resolvedEnvelope: outcome,
      updateAttempts: mocks.ingestionRunUpdate.mock.calls.length,
      ownerAlerted: mocks.notifyOwner.mock.calls.length > 0,
    }));
  });
`;
// Anchor on a line UNIQUELY inside describe("processSport") so the appended
// cases provably inherit its reset beforeEach.
const anchor = '  it("MIGRATION SAFETY: a pre-migration missing-column write failure fails the run gracefully, never throws", async () => {';
const idx = src.indexOf(anchor);
if (idx === -1) throw new Error("processSport anchor not found");
src = src.slice(0, idx) + cases.replace(/^\n/, "\n") + src.slice(idx);

if (src === before) throw new Error("no transform applied");
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, src, "utf8");
console.log("wrote " + OUT);
console.log("notifyOwner spy wired:", src.includes('vi.mock("../owner-alert.js"'));
console.log("PROOF A present:", src.includes("PROOF_A"));
console.log("PROOF B present:", src.includes("PROOF_B"));
{
  const lines = src.split("\n");
  const lineOf = (needle, from) => {
    for (let i = from; i < lines.length; i++) if (lines[i].includes(needle)) return i;
    return -1;
  };
  const ps = lineOf('describe("processSport"', 0);
  const ps2 = lineOf('describe("pickSelectionSide"', ps + 1);
  const pa = lineOf("PROOF A:", ps);
  const pb = lineOf("PROOF B:", ps);
  const ok = pa > ps && pb > ps && pa < ps2 && pb < ps2;
  console.log(`LINE containment: processSport@${ps + 1} proofA@${pa + 1} proofB@${pb + 1} pickSelectionSide@${ps2 + 1} -> inside=${ok}`);
  if (!ok) throw new Error("proofs landed outside describe(processSport)");
}
