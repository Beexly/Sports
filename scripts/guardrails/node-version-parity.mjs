#!/usr/bin/env node
/**
 * Node version parity guardrail.
 *
 * WHY THIS EXISTS
 * Every CI job pins Node 20 (`node-version: "20"` in .github/workflows/*.yml),
 * but root `engines.node` only says `>=20.0.0` and nothing in the repo told a
 * developer which Node to actually run. A sandbox or laptop on Node 22 passes
 * `npm test`, `npm run typecheck` and `npm run guardrails` locally, then the
 * same commit goes red in CI the moment it touches an API that Node 20 does not
 * have. Nobody finds out until the PR turns red — the failure is invisible at
 * exactly the moment it is cheapest to fix.
 *
 * This guard closes that loop in two directions:
 *
 *   FLOOR AGREEMENT — the *declared* floor and the *enforced* floor must agree.
 *     RULE ci-pin-drift          workflows disagree with each other on the pin.
 *     RULE engines-floor-drift   root engines.node floor != the CI pin.
 *     RULE version-file-missing  no .nvmrc / .node-version for developers.
 *     RULE version-file-drift    .nvmrc / .node-version != the CI pin.
 *
 *   POST-FLOOR API USE — Node-executed source must not reach for an API the
 *   pinned runtime does not have.
 *     RULE post-floor-api        an API newer than the pinned major.
 *     RULE post-floor-flag       a `node` CLI flag newer than the pinned major.
 *     RULE node-runs-typescript  `node foo.ts` (native type-stripping is 22+;
 *                                this repo runs TypeScript through `tsx`).
 *
 * Plus a non-fatal NOTICE when the runtime executing the guard is a different
 * major than CI — the single most useful thing a developer can be told here.
 * `--strict-runtime` promotes that notice to a failure for anyone who wants it
 * enforced; it is advisory by default so that the guard does not break local
 * verification for everyone running a newer Node today.
 *
 * HOW THE API LIST WAS BUILT — AND WHY IT IS PARTIAL
 * Every entry below was verified EMPIRICALLY by running the feature test under
 * real v20.20.2 / v21.7.3 / v22.22.2 binaries, not recalled from memory. The
 * `verified` field records what was observed.
 *
 * THIS LIST IS DELIBERATELY PARTIAL AND IS NOT A SUBSTITUTE FOR RUNNING THE
 * TESTS ON THE PINNED RUNTIME. It is hand-maintained, it only covers APIs whose
 * names are distinctive enough to match without drowning the repo in false
 * positives, and Node adds new APIs every release. Specific known gaps are
 * listed in KNOWN_GAPS below. A passing run means "none of the listed APIs
 * appear", never "this code runs on Node 20".
 *
 * Usage:
 *   node scripts/guardrails/node-version-parity.mjs
 *   node scripts/guardrails/node-version-parity.mjs --strict-runtime
 *   node scripts/guardrails/node-version-parity.mjs --scan-root <dir>
 *     # fixture mode for the guard's own tests: API/flag scan over <dir> only,
 *     # no floor-agreement checks and no fixture exemption.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

const GUARD = "node-version-parity";
const ROOT = resolve(process.cwd());

const argv = process.argv.slice(2);
const scanRootFlag = argv.indexOf("--scan-root");
const FIXTURE_MODE = scanRootFlag !== -1;
const STRICT_RUNTIME = argv.includes("--strict-runtime");

const WORKFLOW_DIR = resolve(ROOT, ".github/workflows");
const VERSION_FILES = [".nvmrc", ".node-version"];

/** Directories Node itself executes. apps/ is excluded on purpose — see KNOWN_GAPS. */
const REPO_SCAN_DIRS = ["scripts", "packages", "workers"];
const SCAN_EXTS = new Set([".mjs", ".cjs", ".js", ".ts", ".mts", ".cts", ".sh"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", ".git", ".turbo", "out"]);

/**
 * APIs that do NOT exist on the pinned major but DO exist later. `minMajor` is
 * the lowest major on which the feature was observed to work.
 *
 * Adding an entry: verify it first. Run the feature test under a real binary of
 * the pinned major and of the major you believe introduced it, and put what you
 * actually saw in `verified`. Do not write a version number you did not observe.
 */
export const POST_FLOOR_APIS = [
  {
    id: "module.registerHooks",
    minMajor: 22,
    pattern: /\bregisterHooks\b/,
    verified: "typeof require('module').registerHooks — v20.20.2 undefined, v21.7.3 undefined, v22.22.2 function",
    remedy: "use module.register() (present on the pinned major) or drop the hook",
  },
  {
    id: "node:sqlite",
    minMajor: 22,
    pattern: /["']node:sqlite["']/,
    verified: "import('node:sqlite') — v20.20.2 throws, v21.7.3 throws, v22.22.2 resolves",
    remedy: "use an external sqlite driver, or move the work off the pinned runtime",
  },
  {
    id: "module.stripTypeScriptTypes",
    minMajor: 22,
    pattern: /\bstripTypeScriptTypes\b/,
    verified: "typeof require('module').stripTypeScriptTypes — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "use the repo's `tsx` toolchain to run TypeScript",
  },
  {
    id: "module.enableCompileCache",
    minMajor: 22,
    pattern: /\benableCompileCache\b/,
    verified: "typeof require('module').enableCompileCache — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "remove the call, or feature-detect before calling it",
  },
  {
    id: "module.findPackageJSON",
    minMajor: 22,
    pattern: /\bfindPackageJSON\b/,
    verified: "typeof require('module').findPackageJSON — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "resolve package.json by walking up from import.meta.dirname",
  },
  {
    id: "process.features.typescript",
    minMajor: 22,
    pattern: /\bfeatures\s*\.\s*typescript\b/,
    verified: "'typescript' in process.features — v20.20.2/v21.7.3 false, v22.22.2 true",
    remedy: "do not branch on native type-stripping; this repo uses `tsx`",
  },
  {
    id: "process.threadCpuUsage",
    minMajor: 22,
    pattern: /\bthreadCpuUsage\b/,
    verified: "typeof process.threadCpuUsage — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "use process.cpuUsage()",
  },
  {
    id: "Promise.withResolvers",
    minMajor: 22,
    pattern: /\bPromise\s*\.\s*withResolvers\b/,
    verified: "typeof Promise.withResolvers — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "construct the promise and capture resolve/reject in the executor",
  },
  {
    id: "Array.fromAsync",
    minMajor: 22,
    pattern: /\bArray\s*\.\s*fromAsync\b/,
    verified: "typeof Array.fromAsync — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "collect with `for await (const x of it) acc.push(x)`",
  },
  {
    id: "Iterator.helpers",
    minMajor: 22,
    pattern: /\bIterator\s*\.\s*(?:from|prototype)\b/,
    verified: "typeof Iterator.from — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "materialise with Array.from() and use array methods",
  },
  {
    id: "Set.methods",
    // Only the unambiguous names. `.union(` / `.intersection(` / `.difference(`
    // are ordinary method names in plenty of codebases — see KNOWN_GAPS.
    minMajor: 22,
    pattern: /\.\s*(?:symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\s*\(/,
    verified: "typeof new Set().isSubsetOf — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "compare sets manually with has()/filter()",
  },
  {
    id: "globalThis.WebSocket",
    minMajor: 22,
    pattern: /\bnew\s+WebSocket\s*\(|\bglobalThis\s*\.\s*WebSocket\b/,
    verified: "typeof globalThis.WebSocket — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "import a WebSocket client package explicitly",
  },
  {
    id: "fs.glob",
    minMajor: 22,
    pattern: /\bfs(?:\.promises)?\s*\.\s*glob\s*\(|\bglob\b[^\n]*from\s*["']node:fs(?:\/promises)?["']/,
    verified: "typeof require('fs/promises').glob — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "walk with readdir({ withFileTypes: true }) — the other guards in this directory do",
  },
  {
    id: "assert.partialDeepStrictEqual",
    minMajor: 22,
    pattern: /\bpartialDeepStrictEqual\b/,
    verified: "typeof require('assert').partialDeepStrictEqual — v20.20.2/v21.7.3 undefined, v22.22.2 function",
    remedy: "assert the specific fields with deepStrictEqual",
  },
  {
    id: "node:test snapshot",
    minMajor: 22,
    pattern: /\bsetResolveSnapshotPath\b|\bsetDefaultSnapshotSerializers\b/,
    verified: "typeof require('node:test').snapshot — v20.20.2/v21.7.3 undefined, v22.22.2 object",
    remedy: "assert against a committed fixture instead",
  },
  {
    id: "globalThis.navigator",
    minMajor: 21,
    pattern: /\bnavigator\s*\.\s*(?:userAgent|hardwareConcurrency|language|platform)\b/,
    verified: "typeof globalThis.navigator — v20.20.2 undefined, v21.7.3 object, v22.22.2 object",
    remedy: "use os.cpus().length / process.platform / process.version",
  },
  {
    id: "Object.groupBy",
    minMajor: 21,
    pattern: /\bObject\s*\.\s*groupBy\b/,
    verified: "typeof Object.groupBy — v20.20.2 undefined, v21.7.3 function, v22.22.2 function",
    remedy: "reduce into a plain object",
  },
  {
    id: "Map.groupBy",
    minMajor: 21,
    pattern: /\bMap\s*\.\s*groupBy\b/,
    verified: "typeof Map.groupBy — v20.20.2 undefined, v21.7.3 function, v22.22.2 function",
    remedy: "reduce into a Map",
  },
];

/** `node` CLI flags the pinned major rejects outright ("bad option"). */
export const POST_FLOOR_FLAGS = [
  {
    id: "--experimental-strip-types",
    minMajor: 22,
    pattern: /--experimental-strip-types\b/,
    verified: "v20.20.2 'bad option: --experimental-strip-types', v21.7.3 same, v22.22.2 accepted",
    remedy: "run TypeScript through `tsx`, as the rest of this repo does",
  },
  {
    id: "--experimental-transform-types",
    minMajor: 22,
    pattern: /--experimental-transform-types\b/,
    verified: "v20.20.2 'bad option: --experimental-transform-types', v22.22.2 accepted",
    remedy: "run TypeScript through `tsx`",
  },
  {
    id: "node --run",
    minMajor: 22,
    pattern: /(?<![\w./-])node\s+--run\b/,
    verified: "v20.20.2 'bad option: --run', v21.7.3 same, v22.22.2 accepted",
    remedy: "use `npm run <script>`",
  },
];

/**
 * `node some/file.ts` relies on native type-stripping. Written so `tsx x.ts`,
 * `npx tsx x.ts` and `ts-node --esm x.ts` do NOT match — only a bare `node`.
 */
export const NODE_RUNS_TS = {
  id: "`node <file>.ts` (native type-stripping)",
  minMajor: 22,
  pattern: /(?<![\w./-])node(?:\s+--[\w-]+(?:=\S+)?)*\s+(\S+\.ts)(?![\w])/,
  verified: "`node t.ts` — v20.20.2 SyntaxError, v21.7.3 SyntaxError, v22.22.2 runs",
  remedy: "invoke it as `tsx <file>.ts`",
};

/**
 * Honest limits of this guard. Read this before trusting a green run.
 *
 *  1. Hand-maintained list. Node ships new APIs every release; nothing here
 *     discovers them automatically.
 *  2. Ambiguous names are NOT matched, to keep the signal usable:
 *     Set.prototype.union/intersection/difference, ArrayBuffer.prototype
 *     .transfer, and `t.assert.snapshot(...)` all collide with ordinary
 *     method names.
 *  3. apps/ is not scanned. It holds browser code where `navigator`,
 *     `WebSocket` and `localStorage` are legitimate, and it is compiled by
 *     Next.js rather than executed by `node` directly.
 *  4. Text matching only — no AST, no type information. A post-floor API
 *     reached through a computed property or a re-export is not caught.
 *  5. Runtime-shape differences (require(esm), stream semantics, V8 behaviour)
 *     are not detectable by scanning at all.
 *  6. This guard and its test exempt themselves — they are the definition site
 *     for the very strings they search for. See isExemptFromLiveScan().
 *
 * The durable fix is to RUN the checks on the pinned major. See the "Node
 * version" section of the repo README.
 */
const KNOWN_GAPS = 6;

function norm(p) {
  return p.split(sep).join("/");
}

/**
 * Files exempt from the live repo scan:
 *   - fixtures/, which are deliberate offenders for this guard's own tests;
 *   - this guard and its test, which are the DEFINITION SITE for these names —
 *     POST_FLOOR_APIS literally has to spell `registerHooks` to detect it.
 * The definition-site exemption is a real (small) hole: a post-floor API
 * genuinely used inside this guard would not be caught. It is listed in
 * KNOWN_GAPS.
 */
export function isExemptFromLiveScan(relPath) {
  const n = norm(relPath);
  return (
    n.includes("scripts/guardrails/fixtures/") ||
    n === "scripts/guardrails/node-version-parity.mjs" ||
    n === "scripts/guardrails/node-version-parity.test.mjs"
  );
}

/** Lowest major mentioned by an `engines.node` range, e.g. ">=20.0.0 <21" -> 20. */
export function parseEnginesFloorMajor(range) {
  if (typeof range !== "string") return null;
  const match = range.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Major from a workflow pin or a version file: "20", 20, "20.11.1", "v20" -> 20. */
export function parseMajor(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).trim().match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Every `node-version:` pin in .github/workflows, as
 * [{ file, line, raw, major }]. Plain text scan — no YAML dependency, and the
 * pins are always simple scalars.
 */
export function readWorkflowPins(workflowDir) {
  const pins = [];
  if (!existsSync(workflowDir)) return pins;
  for (const name of readdirSync(workflowDir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const text = readFileSync(join(workflowDir, name), "utf8");
    text.split("\n").forEach((line, index) => {
      const match = line.match(/^\s*node-version:\s*["']?([^"'#\s]+)["']?/);
      if (match) {
        pins.push({
          file: `.github/workflows/${name}`,
          line: index + 1,
          raw: match[1],
          major: parseMajor(match[1]),
        });
      }
    });
  }
  return pins;
}

/** Scans one file's text for post-floor API / flag / TypeScript-exec use. */
export function scanSource(relPath, text, pinnedMajor) {
  const violations = [];
  const lines = text.split("\n");

  const checks = [
    ...POST_FLOOR_APIS.map((e) => ({ ...e, rule: "post-floor-api" })),
    ...POST_FLOOR_FLAGS.map((e) => ({ ...e, rule: "post-floor-flag" })),
    { ...NODE_RUNS_TS, rule: "node-runs-typescript" },
  ].filter((e) => e.minMajor > pinnedMajor);

  lines.forEach((line, index) => {
    // Skip whole-line comments: a doc comment naming an API is not a use of it.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("#")) {
      return;
    }
    for (const check of checks) {
      if (check.pattern.test(line)) {
        violations.push({
          rule: check.rule,
          id: check.id,
          line: index + 1,
          detail:
            `uses ${check.id}, which needs Node >= ${check.minMajor} but CI runs Node ${pinnedMajor} ` +
            `(verified: ${check.verified}) — ${check.remedy}`,
        });
      }
    }
  });

  return violations;
}

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, files);
    } else if (entry.isFile() && SCAN_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/** FLOOR AGREEMENT — CI pin vs engines.node vs .nvmrc/.node-version. */
function checkFloorAgreement() {
  const failures = [];
  const pins = readWorkflowPins(WORKFLOW_DIR);

  if (pins.length === 0) {
    return {
      pinnedMajor: null,
      failures: [
        {
          file: ".github/workflows",
          line: 0,
          rule: "ci-pin-drift",
          detail: "no `node-version:` pin found in any workflow — cannot establish the enforced floor",
        },
      ],
    };
  }

  const majors = [...new Set(pins.map((p) => p.major))];
  if (majors.length > 1) {
    for (const pin of pins) {
      failures.push({
        file: pin.file,
        line: pin.line,
        rule: "ci-pin-drift",
        detail: `node-version: ${pin.raw} — workflows disagree on the pinned major (${majors.join(", ")})`,
      });
    }
  }

  // The lowest pinned major is the floor everything else has to clear.
  const pinnedMajor = Math.min(...majors.filter((m) => typeof m === "number"));

  const pkgPath = resolve(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const enginesNode = pkg.engines?.node;
  const enginesMajor = parseEnginesFloorMajor(enginesNode);
  if (enginesMajor !== pinnedMajor) {
    failures.push({
      file: "package.json",
      line: 0,
      rule: "engines-floor-drift",
      detail:
        `engines.node is ${JSON.stringify(enginesNode ?? null)} (floor major ${enginesMajor}) ` +
        `but CI pins Node ${pinnedMajor} — the declared floor and the enforced floor must agree`,
    });
  }

  const present = VERSION_FILES.filter((f) => existsSync(resolve(ROOT, f)));
  if (present.length === 0) {
    failures.push({
      file: VERSION_FILES.join(" / "),
      line: 0,
      rule: "version-file-missing",
      detail:
        `no version file, so nothing points a developer at the runtime CI uses. ` +
        `Add .nvmrc containing "${pinnedMajor}".`,
    });
  }
  for (const file of present) {
    const raw = readFileSync(resolve(ROOT, file), "utf8").trim();
    const major = parseMajor(raw);
    if (major !== pinnedMajor) {
      failures.push({
        file,
        line: 1,
        rule: "version-file-drift",
        detail: `pins Node ${raw || "(empty)"} but CI pins Node ${pinnedMajor}`,
      });
    }
  }

  return { pinnedMajor, failures, pinCount: pins.length, versionFiles: present };
}

async function main() {
  // Fixture mode: API/flag scan only, over the given directory, no exemptions.
  if (FIXTURE_MODE) {
    const dir = resolve(ROOT, argv[scanRootFlag + 1] ?? ".");
    const pinnedMajor = 20;
    const hits = [];
    for (const file of await walk(dir)) {
      const relPath = norm(relative(ROOT, file));
      const text = await readFile(file, "utf8");
      for (const v of scanSource(relPath, text, pinnedMajor)) hits.push({ file: relPath, ...v });
    }
    report(hits, `fixture scan of ${norm(relative(ROOT, dir))}`, pinnedMajor);
    return;
  }

  const floor = checkFloorAgreement();
  const hits = [...floor.failures];
  const pinnedMajor = floor.pinnedMajor;

  if (pinnedMajor === null) {
    report(hits, "floor agreement", null);
    return;
  }

  let scanned = 0;
  const targets = REPO_SCAN_DIRS.map((d) => resolve(ROOT, d));
  const files = [];
  for (const dir of targets) files.push(...(await walk(dir)));
  // Root-level standalone scripts (*.mjs / *.cjs) are Node-executed too.
  for (const name of readdirSync(ROOT)) {
    if (/\.(mjs|cjs)$/.test(name)) files.push(join(ROOT, name));
  }

  for (const file of files) {
    const relPath = norm(relative(ROOT, file));
    if (isExemptFromLiveScan(relPath)) continue;
    scanned++;
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch (err) {
      hits.push({ file: relPath, rule: "read-failure", id: "read", line: 0, detail: String(err) });
      continue;
    }
    for (const v of scanSource(relPath, text, pinnedMajor)) hits.push({ file: relPath, ...v });
  }

  // package.json scripts are executed by npm through a shell — `node x.ts` and
  // post-floor flags hide there just as easily as in a .mjs file.
  const pkgRaw = readFileSync(resolve(ROOT, "package.json"), "utf8");
  const pkgLines = pkgRaw.split("\n");
  const pkgScripts = JSON.parse(pkgRaw).scripts ?? {};
  for (const [name, command] of Object.entries(pkgScripts)) {
    for (const v of scanSource("package.json", command, pinnedMajor)) {
      const lineNo = pkgLines.findIndex((l) => l.includes(`"${name}":`)) + 1;
      hits.push({ file: "package.json", ...v, line: lineNo > 0 ? lineNo : 0, detail: `script "${name}" ${v.detail}` });
    }
  }
  scanned++;

  const runtimeMajor = parseMajor(process.version);
  const runtimeDrift = runtimeMajor !== pinnedMajor;

  if (runtimeDrift && STRICT_RUNTIME) {
    hits.push({
      file: "(runtime)",
      line: 0,
      rule: "local-runtime-drift",
      id: "runtime",
      detail: `this guard is running on Node ${process.version} but CI pins Node ${pinnedMajor} (--strict-runtime)`,
    });
  }

  const summary =
    `${floor.pinCount} workflow pin(s) agree on Node ${pinnedMajor}; ` +
    `engines.node + ${floor.versionFiles?.join(", ") || "version file"} match; ` +
    `scanned ${scanned} Node-executed file(s) against ${POST_FLOOR_APIS.length} post-floor API(s) ` +
    `and ${POST_FLOOR_FLAGS.length} flag(s)`;

  report(hits, summary, pinnedMajor, runtimeDrift ? runtimeMajor : null);
}

function report(hits, summary, pinnedMajor, driftMajor = null) {
  if (hits.length > 0) {
    console.error(`[${GUARD}] FAIL — ${hits.length} violation(s):`);
    for (const h of hits) {
      console.error(`  ${h.file}:${h.line} [${h.rule}] ${h.detail}`);
    }
    console.error(
      `\nCI runs Node ${pinnedMajor}. Reproduce it before pushing — install that major ` +
        `(\`nvm use\` reads .nvmrc) and re-run the failing command. ` +
        `This guard's API list is hand-maintained and partial (${KNOWN_GAPS} documented gaps in its header); ` +
        `running the tests on the pinned major is the real check.`
    );
    process.exit(1);
  }

  console.log(`[${GUARD}] OK — ${summary}.`);
  if (driftMajor !== null) {
    console.log(
      `[${GUARD}] NOTICE — local runtime is Node ${process.version} but CI pins Node ${pinnedMajor}. ` +
        `Local green does not prove CI green: an API added after ${pinnedMajor} passes here and fails there. ` +
        `Run \`nvm use\` (reads .nvmrc) before verifying, or pass --strict-runtime to make this a hard failure.`
    );
  }
}

// Only run the scan when invoked directly, so the test can import scanSource.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`[${GUARD}] ERROR`, err);
    process.exit(1);
  });
}
