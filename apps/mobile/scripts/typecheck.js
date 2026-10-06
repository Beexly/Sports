#!/usr/bin/env node
/**
 * typecheck.js — a reliable TypeScript check for this host.
 *
 * WHY THIS EXISTS INSTEAD OF `tsc -p tsconfig.json`:
 *
 * On the iSH/Alpine host this project was built on, the `tsc` CLI's output is
 * intermittently LOST. The process exits 0 with an empty stdout even when the
 * program contains errors that a previous identical invocation reported. That
 * failure mode is worse than a crash: it makes a broken build look clean, and it
 * did exactly that here until a positive control (a file with a deliberate type
 * error) proved the "clean" result was meaningless.
 *
 * This script uses the TypeScript compiler API directly and writes its result
 * with an explicit `fsync`, so the report is on disk before the process exits.
 * It is the same workaround the repo already uses for long-running Python.
 *
 * Usage:
 *   node scripts/typecheck.js [path/to/tsconfig.json]
 *
 * Exit codes: 0 = clean, 1 = diagnostics found, 2 = the check itself failed.
 * The summary line is always printed to stdout AND written to the report file,
 * so a silent run is itself detectable.
 */

const fs = require("node:fs");
const path = require("node:path");

/**
 * Locate TypeScript.
 *
 * Order: an explicit override, then a normal local install, then the shared
 * toolchain this project was developed against (the host could not `npm install`
 * react-native, so the SDK 57 type set lives outside the project there).
 */
const TS_CANDIDATES = [
  process.env.GSE_TS_PATH,
  path.join(__dirname, "..", "node_modules", "typescript"),
  "/opt/gsetools/node_modules/typescript",
].filter(Boolean);

const TS_PATH = TS_CANDIDATES.find((candidate) => {
  try {
    return require("node:fs").existsSync(candidate);
  } catch {
    return false;
  }
});

let ts;
try {
  ts = require(TS_PATH);
} catch (error) {
  process.stderr.write(
    `typecheck.js: could not load TypeScript from any of:\n` +
      TS_CANDIDATES.map((c) => `  ${c}\n`).join("") +
      `${error instanceof Error ? error.message : String(error)}\n` +
      `Set GSE_TS_PATH to a directory containing the typescript package.\n`,
  );
  process.exit(2);
}

const configArg = process.argv[2] ?? path.join(__dirname, "..", "tsconfig.check.json");
const configPath = path.resolve(configArg);
const outPath = process.env.GSE_TYPECHECK_REPORT || "/tmp/gse-typecheck.txt";

function writeReport(text) {
  // Write, flush and fsync. An unsynced write on this host can be lost when the
  // process exits, which is the exact failure this script exists to defeat.
  const fd = fs.openSync(outPath, "w");
  try {
    fs.writeFileSync(fd, text);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return `config: ${message}`;
  }
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const relative = path.relative(process.cwd(), diagnostic.file.fileName);
  const code = diagnostic.code;
  return `${relative}(${line + 1},${character + 1}): error TS${code}: ${message}`;
}

let exitCode = 0;
try {
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    const text = `typecheck.js: failed to read ${configPath}\n${formatDiagnostic(read.error)}\n`;
    writeReport(text);
    process.stdout.write(text);
    process.exit(2);
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
    {},
    configPath,
  );

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // A config-level diagnostic (a bad option, an unmatched include) is a failure
  // of the CHECK, not of the code, and is reported as exit 2 so it can never be
  // mistaken for a pass.
  const configErrors = parsed.errors.map(formatDiagnostic);
  const codeDiagnostics = diagnostics
    .filter((d) => d.file !== undefined)
    .map(formatDiagnostic);

  const report = [
    `typescript ${ts.version}`,
    `config     ${configPath}`,
    `files      ${parsed.fileNames.length}`,
    `diagnostics ${codeDiagnostics.length}`,
    "",
    ...(configErrors.length > 0 ? ["── config ──", ...configErrors, ""] : []),
    ...codeDiagnostics,
  ].join("\n");

  writeReport(`${report}\n`);

  // Deliberately always printed. If the summary line is absent from the console,
  // stdout was lost — which is itself the signal that this run cannot be trusted.
  process.stdout.write(
    `typecheck.js: ${parsed.fileNames.length} files, ${codeDiagnostics.length} diagnostics, ` +
      `${configErrors.length} config errors → ${outPath}\n`,
  );

  exitCode = configErrors.length > 0 ? 2 : codeDiagnostics.length > 0 ? 1 : 0;
} catch (error) {
  const text = `typecheck.js: threw\n${error instanceof Error ? error.stack : String(error)}\n`;
  writeReport(text);
  process.stdout.write(text);
  exitCode = 2;
}

process.exit(exitCode);
