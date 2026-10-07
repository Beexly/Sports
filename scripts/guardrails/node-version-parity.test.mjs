/**
 * Fixture suite for the node-version-parity guard.
 *
 * Run in CI via:
 *   node --test scripts/guardrails/node-version-parity.test.mjs
 *
 * Proves — with committed fixtures — exactly what the guard catches and what it
 * correctly leaves alone:
 *
 *   1. FIXTURES: every file under fixtures/node-version-parity/violations/ must
 *      be flagged under its EXACT API/flag id, and every file under allowed/
 *      must stay clean. Deleting a detection entry therefore fails this suite.
 *   2. FLOOR PARSING: the version parsers are exercised on the real shapes that
 *      appear in this repo's workflows and package.json.
 *   3. LIVE FLOOR: the repo's own workflow pins, engines.node and .nvmrc are
 *      asserted to agree, so drift in any one of them fails here too.
 *
 * The fixtures are EXCLUDED from the live repo scan (see isExemptFromLiveScan)
 * precisely so they can exist as offenders here without failing the guard
 * against the real tree.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  isExemptFromLiveScan,
  NODE_RUNS_TS,
  parseEnginesFloorMajor,
  parseMajor,
  POST_FLOOR_APIS,
  POST_FLOOR_FLAGS,
  readWorkflowPins,
  scanSource,
} from "./node-version-parity.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "fixtures", "node-version-parity");
const repoRoot = resolve(here, "..", "..");

/** The pinned major the fixtures are written against. */
const PINNED = 20;

/**
 * Each violation fixture must produce >=1 finding under this SPECIFIC id, so a
 * future regression that flags for the wrong reason is caught.
 */
const VIOLATIONS = {
  "register-hooks.mjs": "module.registerHooks",
  "node-sqlite.mjs": "node:sqlite",
  "promise-with-resolvers.mjs": "Promise.withResolvers",
  "object-group-by.mjs": "Object.groupBy",
  "array-from-async.mjs": "Array.fromAsync",
  "iterator-helpers.mjs": "Iterator.helpers",
  "set-methods.mjs": "Set.methods",
  "websocket.mjs": "globalThis.WebSocket",
  "navigator-global.mjs": "globalThis.navigator",
  "fs-glob.mjs": "fs.glob",
  "module-helpers.mjs": "module.stripTypeScriptTypes",
  "process-features.mjs": "process.features.typescript",
  "assert-partial.mjs": "assert.partialDeepStrictEqual",
  "strip-types-flag.sh": "--experimental-strip-types",
  "node-run-flag.sh": "node --run",
  "node-runs-ts.sh": NODE_RUNS_TS.id,
};

function readFixture(...parts) {
  return readFileSync(join(fixturesRoot, ...parts), "utf8");
}

test("every violation fixture is flagged under its exact id", () => {
  for (const [file, expectedId] of Object.entries(VIOLATIONS)) {
    const found = scanSource(file, readFixture("violations", file), PINNED);
    assert.ok(found.length > 0, `${file}: expected at least one violation, got none`);
    const ids = found.map((v) => v.id);
    assert.ok(
      ids.includes(expectedId),
      `${file}: expected id "${expectedId}", got ${JSON.stringify([...new Set(ids)])}`,
    );
  }
});

test("every violation fixture on disk is covered by this suite", async () => {
  const onDisk = (await readdir(join(fixturesRoot, "violations"))).sort();
  assert.deepEqual(
    onDisk,
    Object.keys(VIOLATIONS).sort(),
    "a fixture exists that no assertion covers (or vice versa)",
  );
});

test("allowed fixtures stay clean", async () => {
  const dir = join(fixturesRoot, "allowed");
  for (const name of await readdir(dir)) {
    const text = await readFile(join(dir, name), "utf8");
    const found = scanSource(name, text, PINNED);
    assert.deepEqual(
      found,
      [],
      `${name}: expected no violations, got ${JSON.stringify(found.map((v) => `${v.line}:${v.id}`))}`,
    );
  }
});

test("tsx and ts-node invocations are not mistaken for native type-stripping", () => {
  const clean = [
    "tsx scripts/x.ts",
    "npx tsx scripts/x.ts",
    "ts-node --esm prisma/seed.ts",
    "TSX_TSCONFIG_PATH=apps/web/tsconfig.json tsx scripts/ops/y.ts",
    "node --test scripts/g.test.mjs",
  ];
  for (const line of clean) {
    assert.deepEqual(scanSource("s.sh", line, PINNED), [], `should not flag: ${line}`);
  }
  assert.ok(
    scanSource("s.sh", "node scripts/x.ts", PINNED).some((v) => v.id === NODE_RUNS_TS.id),
    "should flag a bare `node file.ts`",
  );
});

test("nothing is flagged when the pinned major already has the API", () => {
  // Same sources, but with the floor raised above every entry: silence.
  const highestMin = Math.max(
    ...POST_FLOOR_APIS.map((e) => e.minMajor),
    ...POST_FLOOR_FLAGS.map((e) => e.minMajor),
    NODE_RUNS_TS.minMajor,
  );
  for (const file of Object.keys(VIOLATIONS)) {
    const found = scanSource(file, readFixture("violations", file), highestMin);
    assert.deepEqual(found, [], `${file}: should be silent when the floor is Node ${highestMin}`);
  }
});

test("whole-line comments naming an API are not treated as uses", () => {
  assert.deepEqual(scanSource("x.mjs", "// registerHooks is not available here", PINNED), []);
  assert.deepEqual(scanSource("x.mjs", " * Promise.withResolvers landed later", PINNED), []);
  assert.deepEqual(scanSource("x.sh", "# node --run is unavailable", PINNED), []);
});

test("every detection entry carries an empirical `verified` note and a remedy", () => {
  for (const entry of [...POST_FLOOR_APIS, ...POST_FLOOR_FLAGS, NODE_RUNS_TS]) {
    assert.ok(entry.id, "entry is missing an id");
    assert.ok(
      typeof entry.verified === "string" && /v\d+\.\d+\.\d+/.test(entry.verified),
      `${entry.id}: \`verified\` must name the actual binaries the behaviour was observed on`,
    );
    assert.ok(entry.remedy, `${entry.id}: missing a remedy`);
    assert.ok(Number.isInteger(entry.minMajor), `${entry.id}: minMajor must be an integer`);
  }
});

test("fixtures are exempt from the live repo scan, real sources are not", () => {
  assert.equal(isExemptFromLiveScan("scripts/guardrails/fixtures/node-version-parity/violations/x.mjs"), true);
  assert.equal(isExemptFromLiveScan("scripts/guardrails/node-version-parity.mjs"), true);
  assert.equal(isExemptFromLiveScan("scripts/guardrails/node-version-parity.test.mjs"), true);
  assert.equal(isExemptFromLiveScan("scripts/lib/stripe-price-check.mjs"), false);
  assert.equal(isExemptFromLiveScan("workers/jobs/refresh.ts"), false);
});

test("version parsers handle the shapes this repo actually uses", () => {
  assert.equal(parseMajor("20"), 20);
  assert.equal(parseMajor(20), 20);
  assert.equal(parseMajor("20.11.1"), 20);
  assert.equal(parseMajor("v20.20.2"), 20);
  assert.equal(parseMajor("lts/iron"), null);
  assert.equal(parseMajor(null), null);

  assert.equal(parseEnginesFloorMajor(">=20.0.0"), 20);
  assert.equal(parseEnginesFloorMajor(">=20.0.0 <21"), 20);
  assert.equal(parseEnginesFloorMajor("22.x"), 22);
  assert.equal(parseEnginesFloorMajor(undefined), null);
});

test("the repo's declared floor and enforced floor agree", () => {
  const pins = readWorkflowPins(join(repoRoot, ".github", "workflows"));
  assert.ok(pins.length > 0, "expected at least one node-version pin in .github/workflows");

  const majors = [...new Set(pins.map((p) => p.major))];
  assert.equal(majors.length, 1, `workflows disagree on the Node major: ${JSON.stringify(pins)}`);
  const pinned = majors[0];

  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.equal(
    parseEnginesFloorMajor(pkg.engines?.node),
    pinned,
    `engines.node (${pkg.engines?.node}) must declare the same floor CI enforces (${pinned})`,
  );

  const nvmrc = readFileSync(join(repoRoot, ".nvmrc"), "utf8").trim();
  assert.equal(parseMajor(nvmrc), pinned, `.nvmrc (${nvmrc}) must match the CI pin (${pinned})`);
});
