/**
 * Applies the PROPOSED fix to a TEMP COPY of process-sport.ts (never the repo),
 * so the fix can be verified against the real 81-test suite + the outage proofs.
 */
const fs = require("fs");
const REAL = "C:/Users/Garrett/sports/packages/ingestion-pipeline/src/process-sport.ts";
const COPY = "C:/Users/Garrett/AppData/Local/Temp/ingest-proof/suite/process-sport.ts";

let src = fs.readFileSync(REAL, "utf8"); // authoritative bytes from the repo

// ---- PART A: guard the run-open, which currently sits ABOVE the try --------
const OLD_A = `  const run = await db.ingestionRun.create({
    data: { sport: sport.key, status: "RUNNING" },
  });
`;
const NEW_A = `  // The IngestionRun row is the only durable record that this cycle ran, and
  // this is the FIRST write \u2014 so a database outage lands right here, above the
  // try that records failures. Left unguarded the throw escapes processSport
  // and the owner is never told. Open the run under its own guard and report
  // through the DB-independent channels. We STOP rather than continue: every
  // write below needs a real run id (Odds.ingestionRunId is NOT NULL).
  let run: { id: string };
  try {
    run = await db.ingestionRun.create({
      data: { sport: sport.key, status: "RUNNING" },
    });
  } catch (openErr) {
    const message = openErr instanceof Error ? openErr.message : String(openErr);
    console.error(
      \`\${logPrefix} \${sport.key} failed: ingestion run could not be opened \u2014 \${message}\`,
    );
    await notifyOwner(\`GSE ingestion FAILED\\nsport: \${sport.key}\\nrun_open_failed: \${message}\`);
    return {
      sport: sport.key,
      status: "failed",
      games: 0,
      picks: 0,
      oddsInserted: 0,
      eventsCount: 0,
      error: \`run_open_failed: \${message}\`,
      skippedInPlay: 0,
    };
  }
`;
if (!src.includes(OLD_A)) throw new Error("PART A anchor not found");
src = src.replace(OLD_A, NEW_A);

// ---- PART B: guard the catch's own FAILED-recording write ------------------
const OLD_B = `    await db.ingestionRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });`;
const NEW_B = `    // The database that failed the body is the one most likely to fail THIS
    // write too. Unguarded it throws, and the throw skips the owner alert and
    // the failed envelope below \u2014 losing the failure record precisely when the
    // outage is real. Record what we can, then keep going.
    try {
      await db.ingestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
      });
    } catch (recordErr) {
      console.error(
        \`\${logPrefix} \${sport.key}: FAILED run not recorded (database unreachable) \u2014 \` +
          \`\${recordErr instanceof Error ? recordErr.message : String(recordErr)}\`,
      );
    }`;
if (!src.includes(OLD_B)) throw new Error("PART B anchor not found");
src = src.replace(OLD_B, NEW_B);

// REAL is a symlink in the suite dir; write the patched copy over the TARGET's
// sibling path so the symlink is replaced by a real file.
fs.rmSync(COPY, { force: true });
fs.writeFileSync(COPY, src, "utf8");
console.log("patched copy written:", COPY);
console.log("PART A applied:", src.includes("run_open_failed"));
console.log("PART B applied:", src.includes("FAILED run not recorded"));
