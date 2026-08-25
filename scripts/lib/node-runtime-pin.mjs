/**
 * node-runtime-pin — the repo's Node major, and loud failures when a script
 * needs a runtime the repo does not pin.
 *
 * WHY THIS EXISTS
 * Everything this repo actually ships runs Node 20: every `node-version:` in
 * .github/workflows is "20" (15 occurrences), and every container image is
 * `node:20-alpine`. Development sandboxes run newer majors — the one this was
 * written on reports v22.22.2. `engines.node` says `>=20.0.0`, so npm never
 * says a word about the gap.
 *
 * The failure mode that gap produces is not "a test fails". It is a script that
 * imports cleanly on the author's machine and dies at load in CI with an error
 * about a property that is `undefined`, in a file that looks unrelated to Node
 * versions. Empirically, on this machine:
 *
 *     $ PATH=/opt/node20/bin:$PATH node -e "const m=require('module'); \
 *         console.log(process.version, typeof m.registerHooks, typeof m.stripTypeScriptTypes)"
 *     v20.20.2 undefined undefined
 *     $ node -e "..."   # sandbox default
 *     v22.22.2 function function
 *
 * A script that reaches for either of those gets a `TypeError: ... is not a
 * function` in CI and nothing that names the real cause.
 *
 * This module turns that into one sentence, thrown at load, that names the
 * feature, the major that has it, the major you are on, the repo pin, and the
 * file the pin lives in.
 *
 * COMPANION, NOT A DUPLICATE
 * `scripts/guardrails/node-version-parity.mjs` (a separate change) statically
 * greps sources for known post-pin API names, and its own header says the list
 * is partial. A static list cannot catch an API nobody added to it. This module
 * is the runtime half: a script that *knowingly* needs a newer API declares it
 * and fails legibly instead of mysteriously. Neither replaces the other.
 *
 * ON PURPOSE: no import of this module is required to run anything. Nothing
 * here blocks a developer on Node 22 from working. It only makes the moment of
 * failure explain itself.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Files that may carry the pin, in precedence order.
 *
 * `.node-version` is read by fnm, nodenv, asdf and `n`; `.nvmrc` is read by
 * nvm and fnm. Neither tool reads both, which is why both files exist. When
 * both are present they must agree — `scripts/guardrails/node-container-parity.mjs`
 * fails if they do not.
 */
export const PIN_FILES = Object.freeze([".node-version", ".nvmrc"]);

/** Thrown for every failure in this module, so callers can catch precisely. */
export class NodeRuntimePinError extends Error {
  /** @param {string} message @param {string} code */
  constructor(message, code) {
    super(message);
    this.name = "NodeRuntimePinError";
    this.code = code;
  }
}

/**
 * Parse the major out of a pin-file body.
 *
 * Accepts `20`, `20.20.2`, `v20.20.2`. Deliberately REJECTS nvm aliases such as
 * `lts/iron`: resolving an alias to a major means encoding a mapping this file
 * cannot verify, and a wrong mapping here would silently mispin the whole repo.
 * A numeric pin is unambiguous and costs nothing.
 *
 * @param {string} raw
 * @param {string} [source] file name for the error message
 * @returns {number}
 */
export function parsePinnedMajor(raw, source = "pin file") {
  const text = String(raw ?? "").trim();
  if (text === "") {
    throw new NodeRuntimePinError(`${source} is empty; it must contain a Node major such as "20".`, "PIN_EMPTY");
  }
  const match = /^v?(\d+)(?:\.\d+){0,2}$/.exec(text);
  if (match === null) {
    throw new NodeRuntimePinError(
      `${source} contains ${JSON.stringify(text)}, which is not a numeric Node version. ` +
        `Aliases (for example "lts/iron") are not accepted here because resolving one to a major ` +
        `requires a codename table this repo does not maintain. Write the major instead, e.g. "20".`,
      "PIN_UNPARSEABLE",
    );
  }
  return Number(match[1]);
}

/**
 * Walk up from `startDir` looking for the first directory that holds a pin
 * file. Returns `null` rather than throwing so callers can decide.
 *
 * @param {string} startDir
 * @returns {{ dir: string, file: string, raw: string } | null}
 */
export function findPinFile(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    for (const file of PIN_FILES) {
      const candidate = resolve(dir, file);
      if (existsSync(candidate)) {
        return { dir, file, raw: readFileSync(candidate, "utf8") };
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Directory this module lives in — the anchor for the upward search. */
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The Node major this repo pins.
 *
 * @param {{ startDir?: string }} [options]
 * @returns {{ major: number, file: string, dir: string }}
 * @throws {NodeRuntimePinError} when no pin file exists anywhere above `startDir`
 */
export function readPinnedMajor(options = {}) {
  const startDir = options.startDir ?? HERE;
  const found = findPinFile(startDir);
  if (found === null) {
    throw new NodeRuntimePinError(
      `no Node pin file found above ${startDir}. Expected one of ${PIN_FILES.join(" / ")} ` +
        `at the repo root, containing the major that CI runs.`,
      "PIN_MISSING",
    );
  }
  return { major: parsePinnedMajor(found.raw, found.file), file: found.file, dir: found.dir };
}

/**
 * Major of a `process.version`-shaped string.
 *
 * @param {string} [version]
 * @returns {number}
 */
export function runningMajor(version = process.version) {
  return parsePinnedMajor(version, "process.version");
}

/**
 * Build the mismatch sentence. Pure, so the tests pin the exact wording rather
 * than a paraphrase of it.
 *
 * @param {{
 *   feature: string,
 *   minMajor: number,
 *   running: number,
 *   pinned: number,
 *   pinFile: string,
 *   remedy?: string,
 * }} facts
 * @returns {string}
 */
export function formatFeatureFailure(facts) {
  const lines = [
    `Node runtime too old for ${facts.feature}: it needs Node >= ${facts.minMajor}, this process is Node ${facts.running}.`,
  ];
  if (facts.pinned < facts.minMajor) {
    lines.push(
      `This repo pins Node ${facts.pinned} (${facts.pinFile}) and every CI job runs that major, ` +
        `so this code cannot pass CI even if it runs on your machine.`,
    );
  } else {
    lines.push(`This repo pins Node ${facts.pinned} (${facts.pinFile}); switch to it with \`nvm use\` or \`fnm use\`.`);
  }
  if (facts.remedy) lines.push(`Remedy: ${facts.remedy}`);
  return lines.join("\n");
}

/**
 * Declare that the calling script needs an API newer than some Node major, and
 * fail at load with a message that explains itself if the runtime lacks it.
 *
 * Call this at the TOP of the module, before the import or property access that
 * would otherwise blow up:
 *
 *     requireNodeFeature({
 *       feature: "module.registerHooks",
 *       minMajor: 22,
 *       remedy: "use module.register(), which exists on the pinned major",
 *     });
 *
 * @param {{
 *   feature: string,
 *   minMajor: number,
 *   remedy?: string,
 *   running?: number,
 *   pin?: { major: number, file: string },
 * }} spec
 * @returns {{ running: number, pinned: number }}
 * @throws {NodeRuntimePinError} when the running major is below `minMajor`
 */
export function requireNodeFeature(spec) {
  if (!spec || typeof spec.feature !== "string" || spec.feature === "") {
    throw new NodeRuntimePinError("requireNodeFeature needs a non-empty `feature` name.", "BAD_SPEC");
  }
  if (!Number.isInteger(spec.minMajor)) {
    throw new NodeRuntimePinError(
      `requireNodeFeature({ feature: ${JSON.stringify(spec.feature)} }) needs an integer \`minMajor\`.`,
      "BAD_SPEC",
    );
  }
  const running = spec.running ?? runningMajor();
  const pin = spec.pin ?? readPinnedMajor();
  if (running < spec.minMajor) {
    throw new NodeRuntimePinError(
      formatFeatureFailure({
        feature: spec.feature,
        minMajor: spec.minMajor,
        running,
        pinned: pin.major,
        pinFile: pin.file,
        remedy: spec.remedy,
      }),
      "FEATURE_UNAVAILABLE",
    );
  }
  return { running, pinned: pin.major };
}

/**
 * Describe the running runtime against the pin. Returns a string when they
 * differ and `null` when they agree, so a caller can decide between warn and
 * throw without re-deriving the wording.
 *
 * @param {{ running?: number, pin?: { major: number, file: string } }} [options]
 * @returns {string | null}
 */
export function describeRuntimeDrift(options = {}) {
  const running = options.running ?? runningMajor();
  const pin = options.pin ?? readPinnedMajor();
  if (running === pin.major) return null;
  const direction = running > pin.major ? "newer than" : "older than";
  return (
    `Node ${running} is ${direction} the repo pin of Node ${pin.major} (${pin.file}), which is what every ` +
    `CI job and every container image runs. Local green here is not evidence of CI green.`
  );
}

/**
 * Hard-require that the process is running the pinned major. For scripts whose
 * output is only meaningful on the runtime that ships — a readiness gate, a
 * lockfile check, anything that produces a verdict CI will trust.
 *
 * @param {{ script: string, running?: number, pin?: { major: number, file: string } }} spec
 * @returns {{ running: number, pinned: number }}
 * @throws {NodeRuntimePinError} when the majors differ
 */
export function assertPinnedRuntime(spec) {
  if (!spec || typeof spec.script !== "string" || spec.script === "") {
    throw new NodeRuntimePinError("assertPinnedRuntime needs a non-empty `script` name.", "BAD_SPEC");
  }
  const running = spec.running ?? runningMajor();
  const pin = spec.pin ?? readPinnedMajor();
  if (running !== pin.major) {
    const drift = describeRuntimeDrift({ running, pin });
    throw new NodeRuntimePinError(
      `${spec.script} refuses to run off the pin.\n${drift}\nRun it on Node ${pin.major}: ` +
        `\`nvm use\` / \`fnm use\`, or prefix one command with a Node ${pin.major} bin dir on PATH.`,
      "RUNTIME_OFF_PIN",
    );
  }
  return { running, pinned: pin.major };
}
