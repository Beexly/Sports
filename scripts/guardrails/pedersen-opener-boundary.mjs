#!/usr/bin/env node
/**
 * Pedersen opener boundary guardrail.
 *
 * A slate's Pedersen aggregate is a COMMITMENT: the public hex
 * (`pedersenAggregateHex`) is published BEFORE the first kickoff and says
 * "the total claimed edge of this frozen slate is fixed and unchangeable",
 * WITHOUT revealing what that total is. The two columns that reveal it —
 *
 *   pedersenAggregateValue  (the fixed-point encoded sum)
 *   pedersenBlindingSum     (the summed blinding r)
 *
 * — are the OPENER. Together they open the commitment. Serving either one on a
 * public surface before the slate settles does not leak "a bit extra": it
 * destroys the hiding property outright and makes the pre-kickoff commitment
 * worthless, because the number it was supposed to seal is simply readable.
 * (The blinding alone is enough — the value is recoverable from it and the
 * public hex by search over the bounded encoded range.)
 *
 * WHY THIS SCRIPT EXISTS. Today every reader gets this right, and
 * `/api/verify/slate` even carries a comment saying so. But the containment
 * rests entirely on each caller remembering to pass an explicit `select`.
 * Prisma returns EVERY scalar column when `select` is omitted — so
 *
 *     db.slateCommitment.findMany({ where: { ... } })
 *
 * silently hands the caller the opener, and a route that spreads that row into
 * a JSON response publishes the secret with no diff that looks like a leak.
 * That is a comment-enforced invariant on a cryptographic secret, which is
 * exactly the class of rule this repo pins mechanically.
 *
 * THE RULES
 *   A. Every READ of `slateCommitment` (findUnique/findFirst/findMany/count-
 *      adjacent query forms) must pass an explicit `select`. No implicit
 *      all-columns reads, anywhere — including server-only code, because
 *      today's server-only helper is tomorrow's route import.
 *   B. No read may select an opener column inside `apps/` — the only tree that
 *      hosts public HTTP surfaces.
 *   C. No read may select an opener column ANYWHERE outside the single
 *      allowlisted reader (`OPENER_READ_ALLOWLIST`). Rule B alone was not
 *      enough: a server-only helper under `packages/` that quietly selects the
 *      blinding is one import away from a route, and Phase 0.5b needs opening
 *      to be possible without making it ambient. One reviewed chokepoint that
 *      refuses by default is the shape — same as the `openHoldout` seal in edge-lab.
 *
 * Writes (`create`, `update`, `upsert`, `delete`) are untouched: minting the
 * commitment necessarily writes all three columns.
 *
 * Detection is textual, in the style of sealed-holdout-open-scan.mjs and
 * affiliate-structural-separation.mjs — but the argument object of a Prisma
 * call spans many lines, so this one brace-matches the call's argument block
 * rather than scanning line by line. It is a lint, not a type system: it
 * cannot follow a query object built in a separate variable. That limit is
 * stated rather than papered over, and the common shape (an object literal
 * argument) is what it covers.
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(process.cwd());
const SCAN_TARGETS = ["apps", "packages", "workers", "scripts"];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

/** The columns that, together, open the commitment. */
export const OPENER_FIELDS = ["pedersenAggregateValue", "pedersenBlindingSum"];

/** Read methods whose result shape `select` controls. */
const READ_METHODS = ["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany"];

/** Tree that hosts public HTTP surfaces; opener selects are refused here (rule B). */
const PUBLIC_TREE_PREFIX = "apps/";

/**
 * THE one module permitted to select opener columns (rule C).
 *
 * Phase 0.5b needs SOME module to read the opener — otherwise a commitment can
 * never be opened and the layer stays decorative. The safe shape is not "allow
 * it in server code generally" but "allow it in exactly one reviewed file",
 * which is the pattern `sealed-holdout-open-scan.mjs` already uses to confine
 * the `openHoldout` seal to edge-lab. Widening this list is a deliberate act;
 * it must never grow to a directory.
 */
const OPENER_READ_ALLOWLIST = new Set([
  "packages/ingestion-pipeline/src/slate-opening-reader.ts",
]);

/**
 * This file necessarily NAMES the opener columns and the query shapes it
 * forbids, and the guard's own fixtures are deliberate violations that exist
 * to prove the detector fires. Neither is a real call site.
 */
const SELF_PATHS = new Set(["scripts/guardrails/pedersen-opener-boundary.mjs"]);
const SELF_PREFIXES = ["scripts/guardrails/fixtures/"];

const CALL_RE = new RegExp(`\\bslateCommitment\\s*\\.\\s*(${READ_METHODS.join("|")})\\s*\\(`, "g");

function rel(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function parseRootArg(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) return DEFAULT_ROOT;
  const rootValue = argv[rootIndex + 1];
  return rootValue === undefined ? DEFAULT_ROOT : resolve(rootValue);
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
    } else if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Return the source slice of the call's argument list, starting at the opening
 * parenthesis index. Brace/paren depth counting with string- and comment-
 * awareness, so a `)` inside a string literal or a `//` comment cannot end the
 * block early. Returns null if the call is unterminated (truncated file).
 */
export function extractCallArgs(source, openParenIndex) {
  let depth = 0;
  let i = openParenIndex;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return source.slice(openParenIndex, i + 1);
    }
  }
  return null;
}

/** Strip comments so a field named only in a comment is not read as selected. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

export async function collectPedersenOpenerViolations(root = DEFAULT_ROOT) {
  const resolvedRoot = resolve(root);
  const hits = [];

  for (const target of SCAN_TARGETS) {
    const files = await walk(resolve(resolvedRoot, target));
    for (const file of files) {
      const relPath = rel(resolvedRoot, file);
      if (SELF_PATHS.has(relPath)) continue;
      if (SELF_PREFIXES.some((p) => relPath.startsWith(p))) continue;

      let text;
      try {
        text = await readFile(file, "utf8");
      } catch {
        continue;
      }
      if (!text.includes("slateCommitment")) continue;

      CALL_RE.lastIndex = 0;
      let match;
      while ((match = CALL_RE.exec(text)) !== null) {
        const method = match[1];
        const openParen = text.indexOf("(", match.index);
        const args = openParen === -1 ? null : extractCallArgs(text, openParen);
        const line = lineOf(text, match.index);

        if (args === null) {
          hits.push({
            file: relPath,
            line,
            rule: "unparseable",
            message:
              `${relPath}:${line} slateCommitment.${method}( could not be parsed to its closing ` +
              `parenthesis; the guard cannot confirm an explicit select.`,
          });
          continue;
        }

        const body = stripComments(args);

        // Rule A — an implicit read returns every column, opener included.
        if (!/\bselect\s*:/.test(body)) {
          hits.push({
            file: relPath,
            line,
            rule: "implicit-select",
            message:
              `${relPath}:${line} slateCommitment.${method}( has no explicit \`select\`. Prisma returns ` +
              `ALL columns, which includes the opener (${OPENER_FIELDS.join(", ")}). Name the fields you need.`,
          });
          continue;
        }

        // Rules B and C — who may select the opener at all.
        //
        // Rule C is the tighter one and is checked first: opener reads are
        // confined to a single allowlisted module ANYWHERE in the tree, not
        // merely kept out of apps/. A server-only helper that quietly selects
        // the blinding is one import away from a route.
        const selectedOpenerFields = OPENER_FIELDS.filter((f) =>
          new RegExp(`\\b${f}\\b`).test(body),
        );
        if (selectedOpenerFields.length > 0 && !OPENER_READ_ALLOWLIST.has(relPath)) {
          const where = relPath.startsWith(PUBLIC_TREE_PREFIX)
            ? `inside ${PUBLIC_TREE_PREFIX} (a public-surface tree)`
            : "outside the designated opener-read module";
          hits.push({
            file: relPath,
            line,
            rule: relPath.startsWith(PUBLIC_TREE_PREFIX)
              ? "opener-in-public-tree"
              : "opener-outside-allowlist",
            message:
              `${relPath}:${line} slateCommitment.${method}( selects ${selectedOpenerFields
                .map((f) => `\`${f}\``)
                .join(" + ")} ${where}. Those columns OPEN the commitment; disclosing them ` +
              `before a slate settles voids the seal. The one permitted reader is ` +
              `${[...OPENER_READ_ALLOWLIST].join(", ")} — route through it (it refuses by default) ` +
              `rather than adding a second select.`,
          });
        }
      }
    }
  }
  return hits;
}

async function main() {
  const root = parseRootArg(process.argv.slice(2));
  const hits = await collectPedersenOpenerViolations(root);

  if (hits.length === 0) {
    console.log(
      "[pedersen-opener-boundary] OK - every slateCommitment read names its columns; the opener is " +
        "selected only by the designated refuse-by-default reader.",
    );
    return;
  }

  console.error(`[pedersen-opener-boundary] FAIL - ${hits.length} violation(s):`);
  for (const hit of hits) {
    console.error(`  ${hit.file}:${hit.line} [${hit.rule}]`);
    console.error(`    ${hit.message}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[pedersen-opener-boundary] unexpected error:", error);
    process.exit(2);
  });
}
