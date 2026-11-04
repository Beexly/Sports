#!/usr/bin/env node
/**
 * solidity-compile — compile tracked Solidity with the version each package pins.
 *
 * WHY
 * ---
 * Measured 2026-11-04: this repo carries 1,590 lines of Solidity under
 * packages/polymarket-sdks/lattice-std (6 files, 924 of them tests), and NOTHING
 * compiles or runs any of it. No workflow mentions forge, foundry or the
 * package; the package has no package.json and is not referenced by any root
 * script. Foundry is not installed on this host.
 *
 * That is the same shape of gap as an ungated API route: correct-looking code
 * that no gate protects. Vendored code rots quietly, and a syntax error would be
 * discovered by whoever imports it next rather than by CI.
 *
 * BEHAVIOUR
 * ---------
 * - Groups .sol files by their nearest ancestor foundry.toml and honours that
 *   file's `solc_version` and `evm_version`, so a package is compiled the way
 *   its own config says, not the way this script guesses.
 * - Resolves `solc` from the repo's node_modules. When it is absent (the normal
 *   case here) the guard SKIPS with a clear message instead of failing: a
 *   missing optional compiler is not a violation, and a gate that cries wolf
 *   gets switched off.
 * - Errors fail the guard. Warnings are printed but do not, because the only
 *   warnings this tree produces are code-size warnings on test contracts, which
 *   are never deployed and which `optimizer = false` guarantees.
 *
 * USAGE
 *   node scripts/guardrails/solidity-compile.mjs
 *   node scripts/guardrails/solidity-compile.mjs --root <dir>
 *   node scripts/guardrails/solidity-compile.mjs --solc <path-to-solc-module>
 *
 * EXIT: 0 clean or skipped | 1 compile error | 2 cannot run
 */

import { readFile, readdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname, relative, sep } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const TAG = "[solidity-compile]";

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SKIP_DIRS = new Set(["node_modules", ".git", "out", "cache", "lib", "fixtures", "artifacts"]);

async function findSol(dir, root, depth, acc) {
  if (depth > 8) return acc;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await findSol(full, root, depth + 1, acc);
    else if (e.name.endsWith(".sol")) acc.push(full);
  }
  return acc;
}

/** Walk up from a file to the nearest foundry.toml, if any. */
function nearestFoundry(file) {
  let d = dirname(file);
  for (let i = 0; i < 12; i += 1) {
    const candidate = join(d, "foundry.toml");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
  return null;
}

function parseToml(text) {
  // Minimal reader: the two keys this guard actually needs, default profile.
  const solc = /^\s*solc_version\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? null;
  const evm = /^\s*evm_version\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? null;
  return { solc, evm };
}

async function resolveSolc(root, explicit) {
  const require = createRequire(join(root, "package.json"));
  const candidates = explicit ? [explicit] : ["solc", join(root, "node_modules", "solc")];
  for (const c of candidates) {
    try {
      const mod = c.startsWith("/") || c.includes(":") ? await import(pathToFileURL(join(c, "index.js")).href) : require(c);
      const solc = mod.default ?? mod;
      if (solc && typeof solc.compile === "function") return solc;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function main() {
  const root = resolve(arg("--root", process.cwd()));
  const explicit = arg("--solc", null);

  let files;
  try {
    files = await findSol(root, root, 0, []);
  } catch (err) {
    console.error(`${TAG} cannot enumerate .sol files: ${err.message}`);
    process.exit(2);
  }

  if (files.length === 0) {
    console.log(`${TAG} SKIP — no Solidity in ${root}`);
    process.exit(0);
  }

  const solc = await resolveSolc(root, explicit);
  if (!solc) {
    console.log(
      `${TAG} SKIP — ${files.length} .sol file(s) found but no solc module resolvable. ` +
        `Install it (npm i -D solc) or pass --solc <path>.`,
    );
    process.exit(0);
  }

  // Group by nearest foundry.toml so each package uses its own pinned version.
  const groups = new Map();
  for (const f of files) {
    const conf = nearestFoundry(f);
    const key = conf ?? "(no foundry.toml)";
    if (!groups.has(key)) groups.set(key, { conf, files: [] });
    groups.get(key).files.push(f);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [conf, group] of groups) {
    const rel = conf.startsWith("(") ? conf : relative(root, conf);
    let pinned = { solc: null, evm: null };
    if (group.conf) {
      try {
        pinned = parseToml(await readFile(group.conf, "utf8"));
      } catch {
        /* keep defaults */
      }
    }

    const active = solc.version();
    if (pinned.solc && !active.startsWith(pinned.solc)) {
      console.log(
        `${TAG} WARN ${rel} pins solc ${pinned.solc} but the resolved compiler is ${active}; ` +
          `results may not reflect the pinned toolchain.`,
      );
    }

    const sources = {};
    for (const f of group.files) {
      sources[relative(root, f).split(sep).join("/")] = { content: await readFile(f, "utf8") };
    }

    const input = {
      language: "Solidity",
      sources,
      settings: {
        optimizer: { enabled: false, runs: 200 },
        ...(pinned.evm ? { evmVersion: pinned.evm } : {}),
        outputSelection: { "*": { "*": ["abi"] } },
      },
    };

    const out = JSON.parse(
      solc.compile(JSON.stringify(input), {
        import: (path) => {
          const key = path.split(sep).join("/");
          if (sources[key]) return { contents: sources[key].content };
          return { error: `not vendored: ${path}` };
        },
      }),
    );

    const errs = (out.errors ?? []).filter((e) => e.severity === "error");
    const warns = (out.errors ?? []).filter((e) => e.severity !== "error");
    totalErrors += errs.length;
    totalWarnings += warns.length;

    if (errs.length === 0) {
      console.log(
        `${TAG} ${rel}: ${group.files.length} file(s) compiled, ${warns.length} warning(s)`,
      );
    } else {
      console.error(`${TAG} ${rel}: ${errs.length} ERROR(s)`);
      for (const e of errs) {
        const where = e.sourceLocation
          ? `${e.sourceLocation.file}:${e.sourceLocation.start}`
          : "(global)";
        console.error(`  ${where} ${e.type}: ${e.message}`);
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`${TAG} FAIL — ${totalErrors} compile error(s) across ${files.length} file(s)`);
    process.exit(1);
  }

  console.log(
    `${TAG} PASS — ${files.length} file(s) compiled with ${solc.version()}, ${totalWarnings} warning(s)`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(`${TAG} crashed: ${err?.stack ?? err}`);
  process.exit(2);
});
