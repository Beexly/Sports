#!/usr/bin/env node
/**
 * node-container-parity — the Node major in every container the repo builds or
 * runs must equal the repo's pin.
 *
 * WHY THIS EXISTS
 * The repo pins Node 20: `.node-version` says 20, every `node-version:` in
 * .github/workflows says "20" (15 occurrences), and the four application images
 * are `node:20-alpine`. But the pin was only ever asserted over *workflow* and
 * *version-file* declarations. Container images were never checked, and they
 * had already drifted:
 *
 *     docker/chaos/docker-compose.chaos.yml:18:    image: node:22-alpine
 *
 * That is the chaos harness's Odds-API mock. Every failure-injection result the
 * harness produced was observed against a Node major that nothing else in the
 * repo runs. Nobody would have found that by reading a workflow file.
 *
 * SCOPE — deliberately different from node-version-parity
 * `scripts/guardrails/node-version-parity.mjs` (a separate change) covers
 * workflows, `engines.node`, version files, and a static scan of source for
 * post-pin APIs. It does not look at Dockerfiles or compose files at all. This
 * guard covers exactly that gap: the runtime that actually executes the code in
 * a container. The two are complementary; neither subsumes the other.
 *
 * RULES
 *   pin-file-disagreement   .node-version and .nvmrc are both present and differ.
 *   container-major-drift   a container's Node major is not the pinned major.
 *   container-unpinned      a container asks for `node` with no tag, or a
 *                           floating tag (latest / current / lts), so the major
 *                           it runs can change without a commit.
 *
 * Usage:
 *   node scripts/guardrails/node-container-parity.mjs
 *   node scripts/guardrails/node-container-parity.mjs --json
 *   node scripts/guardrails/node-container-parity.mjs --scan-root <dir> --pin <major>
 *     # fixture mode for this guard's own tests: scan <dir> only, no pin-file
 *     # checks, no fixture exemption.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { PIN_FILES, describeRuntimeDrift, parsePinnedMajor, readPinnedMajor } from "../lib/node-runtime-pin.mjs";

const GUARD = "node-container-parity";
const ROOT = resolve(process.cwd());

const argv = process.argv.slice(2);
const scanRootIndex = argv.indexOf("--scan-root");
const FIXTURE_MODE = scanRootIndex !== -1;
const pinIndex = argv.indexOf("--pin");
const AS_JSON = argv.includes("--json");

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", ".git", ".turbo", "out", "target"]);
const YAML_EXTS = new Set([".yml", ".yaml"]);

/**
 * The guard's own fixtures declare drift on purpose. Exempt them in repo mode
 * only — fixture mode scans them with no exemption at all, which is the point.
 */
const FIXTURE_PREFIX = "scripts/guardrails/fixtures/node-container-parity/";

/** @param {string} p */
const norm = (p) => p.split(sep).join("/");

/**
 * Pull the Node image reference out of one line of a Dockerfile or compose file.
 *
 * Handles `FROM node:20-alpine AS base`, `FROM --platform=linux/amd64 node:20`,
 * `image: node:20-alpine`, `image: "node:20"`. Returns null for any line that
 * does not request a `node` image.
 *
 * @param {string} line
 * @returns {{ kind: "from" | "image", tag: string | null } | null}
 */
export function parseNodeImageLine(line) {
  const from = /^\s*FROM\s+(?:--\S+\s+)*(?<ref>\S+)/i.exec(line);
  if (from?.groups?.ref) {
    const parsed = parseImageRef(from.groups.ref);
    return parsed === null ? null : { kind: "from", tag: parsed };
  }
  const image = /^\s*-?\s*image:\s*(?<q>["']?)(?<ref>[^"'\s#]+)\k<q>/.exec(line);
  if (image?.groups?.ref) {
    const parsed = parseImageRef(image.groups.ref);
    return parsed === null ? null : { kind: "image", tag: parsed };
  }
  return null;
}

/**
 * Split an image reference into a tag if — and only if — it is the official
 * `node` image. `node:20-alpine` yields "20-alpine"; `node` yields "";
 * `ghcr.io/shopify/toxiproxy:2.9.0` and `nodered/node-red:3` yield null.
 *
 * @param {string} ref
 * @returns {string | null} the tag ("" when untagged), or null if not `node`
 */
export function parseImageRef(ref) {
  if (ref.includes("$")) return null; // interpolated — nothing static to check
  const digestSplit = ref.split("@")[0];
  const colon = digestSplit.indexOf(":");
  const name = colon === -1 ? digestSplit : digestSplit.slice(0, colon);
  const tag = colon === -1 ? "" : digestSplit.slice(colon + 1);
  if (name !== "node" && name !== "library/node" && name !== "docker.io/library/node") return null;
  return tag;
}

/**
 * The Node major a tag requests, or null when the tag names no major.
 *
 * @param {string} tag
 * @returns {number | null}
 */
export function tagMajor(tag) {
  const match = /^(\d+)(?:\.\d+){0,2}(?:-.*)?$/.exec(tag.trim());
  return match === null ? null : Number(match[1]);
}

/** @param {string} dir @returns {Promise<string[]>} */
async function walk(dir) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [dir];
  while (stack.length > 0) {
    const current = /** @type {string} */ (stack.pop());
    /** @type {import("node:fs").Dirent[]} */
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isCandidate(entry.name)) out.push(full);
    }
  }
  return out.sort();
}

/** @param {string} name */
export function isCandidate(name) {
  return basename(name).startsWith("Dockerfile") || YAML_EXTS.has(extname(name));
}

/**
 * @param {string} relPath
 * @param {string} text
 * @param {number} pinnedMajor
 * @returns {{ file: string, line: number, rule: string, detail: string }[]}
 */
export function scanFile(relPath, text, pinnedMajor) {
  /** @type {{ file: string, line: number, rule: string, detail: string }[]} */
  const found = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const hit = parseNodeImageLine(lines[i]);
    if (hit === null) continue;
    const tag = hit.tag ?? "";
    const major = tagMajor(tag);
    if (major === null) {
      found.push({
        file: relPath,
        line: i + 1,
        rule: "container-unpinned",
        detail:
          `\`node${tag === "" ? "" : `:${tag}`}\` names no Node major, so the major this container runs ` +
          `can change without a commit. Use \`node:${pinnedMajor}${tag === "" ? "" : `-${tag}`}\`.`,
      });
      continue;
    }
    if (major !== pinnedMajor) {
      found.push({
        file: relPath,
        line: i + 1,
        rule: "container-major-drift",
        detail: `\`node:${tag}\` runs Node ${major}, but this repo pins Node ${pinnedMajor}.`,
      });
    }
  }
  return found;
}

/**
 * Every pin file that exists must name the same major. Two pin files exist
 * because no single version manager reads both; two pin files that disagree are
 * worse than one, so this is checked before anything else.
 *
 * @param {string} root
 * @returns {{ failures: { file: string, line: number, rule: string, detail: string }[], present: string[] }}
 */
export function checkPinFileAgreement(root) {
  const present = PIN_FILES.filter((f) => existsSync(resolve(root, f)));
  /** @type {{ file: string, line: number, rule: string, detail: string }[]} */
  const failures = [];
  /** @type {Map<number, string[]>} */
  const byMajor = new Map();
  for (const file of present) {
    const major = parsePinnedMajor(readFileSync(resolve(root, file), "utf8"), file);
    byMajor.set(major, [...(byMajor.get(major) ?? []), file]);
  }
  if (byMajor.size > 1) {
    const summary = [...byMajor.entries()].map(([major, files]) => `${files.join(", ")} => ${major}`).join("; ");
    failures.push({
      file: present.join(" / "),
      line: 1,
      rule: "pin-file-disagreement",
      detail: `pin files disagree on the Node major (${summary}). Every pin file must name the same major.`,
    });
  }
  return { failures, present };
}

/**
 * @param {{ file: string, line: number, rule: string, detail: string }[]} failures
 * @param {string} scope
 * @param {number} pinnedMajor
 */
function report(failures, scope, pinnedMajor) {
  if (AS_JSON) {
    console.log(JSON.stringify({ guard: GUARD, scope, pinnedMajor, failures }, null, 2));
  } else if (failures.length > 0) {
    console.error(`[${GUARD}] FAIL - ${failures.length} finding(s) against the Node ${pinnedMajor} pin (${scope}):`);
    for (const f of failures) {
      console.error(`  ${f.file}:${f.line}  [${f.rule}] ${f.detail}`);
    }
    console.error(
      `[${GUARD}] Containers are what actually execute this code. A container on a different major than ` +
        `CI means CI is not testing what ships.`,
    );
  } else {
    console.log(`[${GUARD}] PASS - every Node container matches the Node ${pinnedMajor} pin (${scope}).`);
  }
  if (failures.length > 0) process.exitCode = 1;
}

async function main() {
  if (FIXTURE_MODE) {
    const dir = resolve(ROOT, argv[scanRootIndex + 1] ?? ".");
    const pinnedMajor = pinIndex === -1 ? 20 : Number(argv[pinIndex + 1]);
    if (!Number.isInteger(pinnedMajor)) {
      console.error(`[${GUARD}] --pin needs an integer major.`);
      process.exitCode = 2;
      return;
    }
    /** @type {{ file: string, line: number, rule: string, detail: string }[]} */
    const failures = [];
    for (const file of await walk(dir)) {
      const relPath = norm(relative(ROOT, file));
      failures.push(...scanFile(relPath, await readFile(file, "utf8"), pinnedMajor));
    }
    report(failures, `fixture scan of ${norm(relative(ROOT, dir))}`, pinnedMajor);
    return;
  }

  /** @type {{ major: number, file: string }} */
  let pin;
  try {
    pin = readPinnedMajor({ startDir: ROOT });
  } catch (error) {
    console.error(`[${GUARD}] FAIL - ${error instanceof Error ? error.message : String(error)}`);
    console.error(
      `[${GUARD}] Without a pin file nothing in the repo states which Node major CI runs, so no container ` +
        `can be checked against it.`,
    );
    process.exitCode = 1;
    return;
  }

  // Non-fatal, and deliberately so: a developer on a newer major should be able
  // to run every guard. They should just be told that a green run here was not
  // observed on the runtime CI uses.
  const drift = describeRuntimeDrift({ pin });
  if (drift !== null && !AS_JSON) console.error(`[${GUARD}] NOTICE - ${drift}`);

  const agreement = checkPinFileAgreement(ROOT);
  /** @type {{ file: string, line: number, rule: string, detail: string }[]} */
  const failures = [...agreement.failures];

  for (const file of await walk(ROOT)) {
    const relPath = norm(relative(ROOT, file));
    if (relPath.startsWith(FIXTURE_PREFIX)) continue;
    failures.push(...scanFile(relPath, await readFile(file, "utf8"), pin.major));
  }

  report(failures, `pin ${pin.file}, ${agreement.present.length} pin file(s)`, pin.major);
}

/**
 * Only run when invoked as a script. The guard's own tests import the parsing
 * helpers from this file; without this check that import would execute a full
 * repo scan under the test runner's argv.
 */
const invokedDirectly =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
