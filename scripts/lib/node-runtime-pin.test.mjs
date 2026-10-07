/**
 * Unit tests for scripts/lib/node-runtime-pin.mjs.
 *
 * Run: node --test scripts/lib/node-runtime-pin.test.mjs
 *
 * Everything here asserts at RUNTIME. The functions under test take the running
 * major and the pin as injectable arguments precisely so these tests do not
 * depend on which Node the test runner happens to be.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NodeRuntimePinError,
  PIN_FILES,
  assertPinnedRuntime,
  describeRuntimeDrift,
  findPinFile,
  formatFeatureFailure,
  parsePinnedMajor,
  readPinnedMajor,
  requireNodeFeature,
  runningMajor,
} from "./node-runtime-pin.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");

/**
 * Run `fn`, assert it threw a NodeRuntimePinError, and hand the error back so
 * the caller can assert on its wording. `assert.throws` returns undefined, so
 * it cannot be used to inspect the error it caught.
 *
 * @param {() => unknown} fn
 * @returns {NodeRuntimePinError}
 */
function thrownBy(fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof NodeRuntimePinError, `expected NodeRuntimePinError, got ${error}`);
    return error;
  }
  assert.fail("expected the call to throw, but it returned");
}

test("parsePinnedMajor accepts the shapes a pin file actually holds", () => {
  assert.equal(parsePinnedMajor("20"), 20);
  assert.equal(parsePinnedMajor("20\n"), 20);
  assert.equal(parsePinnedMajor("  20.20.2  "), 20);
  assert.equal(parsePinnedMajor("v20.20.2"), 20);
  assert.equal(parsePinnedMajor("22"), 22);
});

test("parsePinnedMajor rejects nvm aliases rather than guessing a codename", () => {
  const error = thrownBy(() => parsePinnedMajor("lts/iron", ".nvmrc"));
  assert.equal(error.code, "PIN_UNPARSEABLE");
  assert.match(error.message, /\.nvmrc/);
  assert.match(error.message, /codename table this repo does not maintain/);
});

test("parsePinnedMajor rejects an empty pin file", () => {
  const error = thrownBy(() => parsePinnedMajor("   \n", ".node-version"));
  assert.equal(error.code, "PIN_EMPTY");
});

test("runningMajor reads the major out of a process.version string", () => {
  assert.equal(runningMajor("v20.20.2"), 20);
  assert.equal(runningMajor("v22.22.2"), 22);
  assert.equal(runningMajor(), Number(process.versions.node.split(".")[0]));
});

test("findPinFile walks up to the repo root from a nested directory", () => {
  const found = findPinFile(resolve(REPO_ROOT, "scripts/guardrails"));
  assert.notEqual(found, null);
  assert.equal(found.dir, REPO_ROOT);
  assert.ok(PIN_FILES.includes(found.file), `unexpected pin file ${found.file}`);
});

test("readPinnedMajor reports the major the repo pin file actually contains", () => {
  const pin = readPinnedMajor({ startDir: REPO_ROOT });
  const raw = readFileSync(resolve(REPO_ROOT, pin.file), "utf8");
  assert.equal(pin.major, Number(raw.trim().replace(/^v/, "").split(".")[0]));
  assert.equal(pin.dir, REPO_ROOT);
});

test("readPinnedMajor names the missing file when there is no pin anywhere above", () => {
  const error = thrownBy(() => readPinnedMajor({ startDir: "/" }));
  assert.equal(error.code, "PIN_MISSING");
  assert.match(error.message, /\.node-version/);
  assert.match(error.message, /\.nvmrc/);
});

test("requireNodeFeature throws a message naming feature, required major, running major and pin", () => {
  const error = thrownBy(() =>
    requireNodeFeature({
      feature: "module.registerHooks",
      minMajor: 22,
      remedy: "use module.register()",
      running: 20,
      pin: { major: 20, file: ".node-version" },
    }),
  );
  assert.equal(error.code, "FEATURE_UNAVAILABLE");
  assert.match(error.message, /module\.registerHooks/);
  assert.match(error.message, /needs Node >= 22/);
  assert.match(error.message, /this process is Node 20/);
  assert.match(error.message, /pins Node 20 \(\.node-version\)/);
  assert.match(error.message, /cannot pass CI/);
  assert.match(error.message, /Remedy: use module\.register\(\)/);
});

test("requireNodeFeature is a no-op when the runtime is new enough", () => {
  const result = requireNodeFeature({
    feature: "module.registerHooks",
    minMajor: 22,
    running: 22,
    pin: { major: 22, file: ".node-version" },
  });
  assert.deepEqual(result, { running: 22, pinned: 22 });
});

test("requireNodeFeature rejects a malformed spec instead of silently passing", () => {
  assert.equal(thrownBy(() => requireNodeFeature({ minMajor: 22 })).code, "BAD_SPEC");
  assert.equal(thrownBy(() => requireNodeFeature({ feature: "x", minMajor: "22" })).code, "BAD_SPEC");
});

test("formatFeatureFailure distinguishes 'the pin is too old' from 'you are off the pin'", () => {
  const pinTooOld = formatFeatureFailure({
    feature: "node:sqlite",
    minMajor: 22,
    running: 20,
    pinned: 20,
    pinFile: ".node-version",
  });
  assert.match(pinTooOld, /cannot pass CI/);

  const developerBehind = formatFeatureFailure({
    feature: "node:sqlite",
    minMajor: 22,
    running: 20,
    pinned: 22,
    pinFile: ".node-version",
  });
  assert.doesNotMatch(developerBehind, /cannot pass CI/);
  assert.match(developerBehind, /nvm use/);
});

test("describeRuntimeDrift is null on the pin and directional off it", () => {
  const pin = { major: 20, file: ".node-version" };
  assert.equal(describeRuntimeDrift({ running: 20, pin }), null);
  assert.match(describeRuntimeDrift({ running: 22, pin }), /newer than the repo pin of Node 20/);
  assert.match(describeRuntimeDrift({ running: 18, pin }), /older than the repo pin of Node 20/);
  assert.match(describeRuntimeDrift({ running: 22, pin }), /Local green here is not evidence of CI green/);
});

test("assertPinnedRuntime throws off the pin and returns on it", () => {
  const pin = { major: 20, file: ".node-version" };
  const error = thrownBy(() => assertPinnedRuntime({ script: "check-gate-flip-readiness", running: 22, pin }));
  assert.equal(error.code, "RUNTIME_OFF_PIN");
  assert.match(error.message, /check-gate-flip-readiness refuses to run off the pin/);
  assert.match(error.message, /Run it on Node 20/);

  assert.deepEqual(assertPinnedRuntime({ script: "x", running: 20, pin }), { running: 20, pinned: 20 });
});
