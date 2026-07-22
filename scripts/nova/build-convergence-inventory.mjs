#!/usr/bin/env node
/**
 * NOVA convergence inventory builder (directive section 3).
 *
 * Branch inventory and collision detection are repository facts, not model
 * judgments. This script derives them deterministically:
 *
 *   - git merge-base / git diff --name-status / git ls-tree / blob hashes;
 *   - exported TypeScript symbols via the repo's own TypeScript compiler API
 *     (loaded with createRequire, same pattern as the guardrail scripts);
 *   - Prisma models/enums/indexes and migration SQL parsed deterministically;
 *   - collision detection against the canonical-owner manifest
 *     (scripts/nova/convergence-owners.json).
 *
 * Outputs (deterministic, sorted, stable JSON) under reports/nova/convergence/:
 *   NOVA_CONVERGENCE_INVENTORY.json  — pure repository facts (no timestamps)
 *   NOVA_CONVERGENCE_INVENTORY.md    — human rendering of the same facts
 *   NOVA_CONVERGENCE_RECEIPT.json    — SHAs, command versions, exit code,
 *                                      artifact hashes, timestamp, dirty state
 *
 * Fail-closed contract:
 *   exit 0  — scan complete, zero collisions
 *   exit 1  — scan complete, collisions found
 *   exit 2  — scan INCOMPLETE (unparsable file). Collisions are reported as
 *             UNKNOWN, never as zero, because the scan did not cover the set.
 *   exit 3  — usage / environment / internal error
 *
 * A model may interpret the receipt; it may not manufacture it.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const EXIT = Object.freeze({
  OK: 0,
  COLLISIONS: 1,
  INCOMPLETE_SCAN: 2,
  USAGE_OR_INTERNAL: 3,
});

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** JSON.stringify with recursively sorted object keys, 2-space indent, LF, trailing newline. */
export function stableStringify(value) {
  const sortValue = (v) => {
    if (Array.isArray(v)) return v.map(sortValue);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = sortValue(v[k]);
      return out;
    }
    return v;
  };
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

export function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Locale-independent codepoint comparator (localeCompare is ICU-dependent and non-deterministic across environments). */
export function cmp(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function git(repoPath, args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err) {
    if (allowFail) return null;
    throw new Error(
      `git ${args.join(" ")} failed: ${err.stderr ? String(err.stderr).trim() : err.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// TypeScript exported-symbol extraction (repo-local compiler API)
// ---------------------------------------------------------------------------

let cachedTs = null;

/** Load the repository's own typescript package via createRequire. */
export function loadTypescript(repoPath) {
  if (cachedTs) return cachedTs;
  const req = createRequire(join(resolve(repoPath), "package.json"));
  cachedTs = req("typescript");
  return cachedTs;
}

function hasExportModifier(ts, node) {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return Boolean(mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function hasDefaultModifier(ts, node) {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return Boolean(mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword));
}

/**
 * Parse TypeScript source text and return its exported symbols.
 * Throws on any parse diagnostic — callers treat a throw as an unparsable
 * file and must fail closed.
 *
 * @returns Array<{name: string, kind: string}> sorted by name then kind.
 */
export function extractExportedSymbols(ts, filePath, sourceText) {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind,
  );
  const parseDiagnostics = sf.parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    const first = parseDiagnostics[0];
    const msg = ts.flattenDiagnosticMessageText(first.messageText, " ");
    throw new Error(`parse error in ${filePath}: ${msg}`);
  }

  const symbols = [];
  const push = (name, kind) => {
    if (name) symbols.push({ name, kind });
  };

  const visitTop = (node) => {
    if (ts.isExportAssignment(node)) {
      // export = X  /  export default <expr>
      push("default", "export-assignment");
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          push(el.name.text, "reexport");
        }
      } else if (node.exportClause && ts.isNamespaceExport(node.exportClause)) {
        push(node.exportClause.name.text, "namespace-reexport");
      } else if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        push(`* from ${node.moduleSpecifier.text}`, "star-reexport");
      }
      return;
    }
    if (!hasExportModifier(ts, node)) return;
    const isDefault = hasDefaultModifier(ts, node);
    if (ts.isFunctionDeclaration(node)) {
      push(isDefault ? "default" : node.name?.text, "function");
    } else if (ts.isClassDeclaration(node)) {
      push(isDefault ? "default" : node.name?.text, "class");
    } else if (ts.isInterfaceDeclaration(node)) {
      push(node.name.text, "interface");
    } else if (ts.isTypeAliasDeclaration(node)) {
      push(node.name.text, "type");
    } else if (ts.isEnumDeclaration(node)) {
      push(node.name.text, "enum");
    } else if (ts.isModuleDeclaration(node)) {
      push(node.name.getText(sf), "namespace");
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        collectBindingNames(ts, decl.name, (n) => push(n, "const"));
      }
    }
  };

  for (const stmt of sf.statements) visitTop(stmt);

  symbols.sort((a, b) =>
    a.name === b.name ? cmp(a.kind, b.kind) : cmp(a.name, b.name),
  );
  return symbols;
}

function collectBindingNames(ts, name, cb) {
  if (ts.isIdentifier(name)) {
    cb(name.text);
  } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) {
      if (ts.isBindingElement(el)) collectBindingNames(ts, el.name, cb);
    }
  }
}

// ---------------------------------------------------------------------------
// Prisma schema / migration parsing (deterministic line scan)
// ---------------------------------------------------------------------------

/**
 * Parse a Prisma schema deterministically into models, enums and indexes.
 * Throws when a block opens but never closes (unparsable — fail closed).
 *
 * @returns {{models: Array, enums: Array}}
 */
export function parsePrismaSchema(schemaText, schemaPath) {
  const lines = schemaText.split(/\r?\n/);
  const models = [];
  const enums = [];
  let current = null; // {type, name, startLine, indexes, fields, depth}

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (current === null) {
      const m = line.match(/^(model|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
      if (m) {
        current = {
          type: m[1],
          name: m[2],
          indexes: [],
          fieldCount: 0,
          bodyLines: [],
        };
      }
      continue;
    }
    if (line === "}") {
      const entry = {
        name: current.name,
        schemaPath,
        blockHash: sha256Hex(current.bodyLines.join("\n")),
      };
      if (current.type === "model") {
        entry.fieldCount = current.fieldCount;
        entry.indexes = current.indexes.sort();
        models.push(entry);
      } else {
        entry.valueCount = current.fieldCount;
        enums.push(entry);
      }
      current = null;
      continue;
    }
    current.bodyLines.push(line);
    if (line.startsWith("@@index") || line.startsWith("@@unique") || line.startsWith("@@id")) {
      current.indexes.push(line);
    } else if (line !== "" && !line.startsWith("//") && !line.startsWith("@@")) {
      current.fieldCount += 1;
    }
  }
  if (current !== null) {
    throw new Error(
      `unparsable prisma schema ${schemaPath}: block "${current.type} ${current.name}" never closes`,
    );
  }
  models.sort((a, b) => cmp(a.name, b.name));
  enums.sort((a, b) => cmp(a.name, b.name));
  return { models, enums };
}

/**
 * Extract created/altered database objects from a migration SQL file with a
 * deterministic statement scan.
 *
 * @returns Array<{op: string, object: string}> sorted.
 */
export function parseMigrationSql(sqlText) {
  const results = [];
  const patterns = [
    [/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi, "CREATE TABLE"],
    [/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi, "CREATE INDEX"],
    [/CREATE\s+TYPE\s+"?([A-Za-z0-9_]+)"?/gi, "CREATE TYPE"],
    [/ALTER\s+TABLE\s+(?:ONLY\s+)?"?([A-Za-z0-9_]+)"?/gi, "ALTER TABLE"],
    [/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi, "DROP TABLE"],
  ];
  for (const [re, op] of patterns) {
    for (const m of sqlText.matchAll(re)) {
      results.push({ op, object: m[1] });
    }
  }
  results.sort((a, b) =>
    a.object === b.object ? cmp(a.op, b.op) : cmp(a.object, b.object),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Ownership / collision rules
// ---------------------------------------------------------------------------

/** True when `name` starts with `prefix` at a PascalCase word boundary. */
export function matchesPrefix(name, prefix) {
  if (!name.startsWith(prefix)) return false;
  if (name.length === prefix.length) return true;
  return /[A-Z0-9_]/.test(name[prefix.length]);
}

export function domainForPath(manifest, filePath) {
  for (const [domain, cfg] of Object.entries(manifest.domains)) {
    if (cfg.pathPrefixes.some((p) => filePath.startsWith(p))) return domain;
  }
  return null;
}

export function domainCandidatesForSymbol(manifest, name) {
  const candidates = [];
  for (const [domain, cfg] of Object.entries(manifest.domains)) {
    if ((cfg.symbolPrefixes ?? []).some((p) => matchesPrefix(name, p))) {
      candidates.push(domain);
    }
  }
  return candidates.sort();
}

/**
 * Collision rules. Each rule is independently removable so the mutation test
 * can prove every rule is load-bearing.
 */
export const COLLISION_RULES = [
  {
    id: "forbidden-prefix-outside-owner",
    description:
      "An exported TS symbol matching a forbidden prefix is declared in a file outside the canonical owner's path prefixes.",
    detect({ tsExports, manifest }) {
      const found = [];
      for (const file of tsExports) {
        const fileDomain = domainForPath(manifest, file.path);
        for (const sym of file.symbols) {
          if (sym.kind === "star-reexport") continue;
          for (const fp of manifest.forbiddenPrefixes) {
            if (!matchesPrefix(sym.name, fp.prefix)) continue;
            if (fileDomain !== fp.canonicalOwner) {
              found.push({
                rule: "forbidden-prefix-outside-owner",
                symbol: sym.name,
                kind: sym.kind,
                path: file.path,
                declaredInDomain: fileDomain ?? "UNOWNED_PATH",
                canonicalOwner: fp.canonicalOwner,
                forbiddenPrefix: fp.prefix,
              });
            }
          }
        }
      }
      return found;
    },
  },
  {
    id: "duplicate-guarded-export",
    description:
      "The same guarded symbol name (matching any forbidden prefix) is exported from more than one file in the scan set.",
    detect({ tsExports, manifest }) {
      const byName = new Map();
      for (const file of tsExports) {
        for (const sym of file.symbols) {
          if (sym.kind === "star-reexport" || sym.kind === "reexport") continue;
          const guarded = manifest.forbiddenPrefixes.some((fp) =>
            matchesPrefix(sym.name, fp.prefix),
          );
          if (!guarded) continue;
          if (!byName.has(sym.name)) byName.set(sym.name, new Set());
          byName.get(sym.name).add(file.path);
        }
      }
      const found = [];
      for (const [name, paths] of byName) {
        if (paths.size > 1) {
          found.push({
            rule: "duplicate-guarded-export",
            symbol: name,
            paths: [...paths].sort(),
          });
        }
      }
      return found;
    },
  },
  {
    id: "prisma-name-redeclared",
    description:
      "A Prisma model or enum name is declared more than once across the head schema paths, or a head declaration reuses a base name from a different schema path.",
    detect({ prisma }) {
      const seen = new Map(); // name -> Set of "ref:schemaPath"
      for (const side of ["base", "head"]) {
        for (const entry of [...(prisma[side]?.models ?? []), ...(prisma[side]?.enums ?? [])]) {
          if (!seen.has(entry.name)) seen.set(entry.name, new Set());
          seen.get(entry.name).add(`${side}:${entry.schemaPath}`);
        }
      }
      const found = [];
      for (const [name, refs] of seen) {
        const paths = new Set([...refs].map((r) => r.split(":").slice(1).join(":")));
        if (paths.size > 1) {
          found.push({
            rule: "prisma-name-redeclared",
            symbol: name,
            declarations: [...refs].sort(),
          });
        }
      }
      return found;
    },
  },
];

export function detectCollisions(input, rules = COLLISION_RULES) {
  const collisions = [];
  for (const rule of rules) collisions.push(...rule.detect(input));
  collisions.sort((a, b) => {
    const ka = `${a.rule}|${a.symbol}|${a.path ?? ""}`;
    const kb = `${b.rule}|${b.symbol}|${b.path ?? ""}`;
    return cmp(ka, kb);
  });
  return collisions;
}

// ---------------------------------------------------------------------------
// Inventory build
// ---------------------------------------------------------------------------

function readManifest(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const key of ["domains", "forbiddenPrefixes", "prismaSchemaPaths", "sourceDirs"]) {
    if (!manifest[key]) throw new Error(`manifest ${manifestPath} missing key "${key}"`);
  }
  return manifest;
}

function gitShowBlob(repoPath, ref, path) {
  return git(repoPath, ["show", `${ref}:${path}`], { allowFail: true });
}

/**
 * Build the deterministic inventory object (repository facts only — no
 * timestamps, no environment data). Also returns scan bookkeeping.
 */
export function buildInventory({ repoPath, baseRef, headRef, manifestPath }) {
  const manifest = readManifest(manifestPath);
  const ts = loadTypescript(repoPath);

  const baseSha = git(repoPath, ["rev-parse", `${baseRef}^{commit}`]).trim();
  const headSha = git(repoPath, ["rev-parse", `${headRef}^{commit}`]).trim();
  const mergeBaseSha = git(repoPath, ["merge-base", baseSha, headSha]).trim();

  // Changed files: merge-base .. head
  const nameStatus = git(repoPath, [
    "diff",
    "--name-status",
    "--no-renames",
    mergeBaseSha,
    headSha,
  ]);
  const changed = nameStatus
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split("\t");
      return { status, path: rest.join("\t") };
    })
    .sort((a, b) => cmp(a.path, b.path));

  // Blob hashes at head for all non-deleted changed paths, via git ls-tree.
  const lsTree = git(repoPath, ["ls-tree", "-r", headSha]);
  const blobByPath = new Map();
  for (const line of lsTree.split("\n")) {
    if (!line) continue;
    const m = line.match(/^\d+ blob ([0-9a-f]{40})\t(.*)$/);
    if (m) blobByPath.set(m[2], m[1]);
  }
  const files = changed.map((c) => ({
    path: c.path,
    status: c.status,
    headBlobSha: c.status === "D" ? null : (blobByPath.get(c.path) ?? null),
  }));

  // TS exported symbols for changed source files (content read from headSha,
  // never the working tree, so the inventory is a function of the SHAs).
  const inSourceDirs = (p) =>
    manifest.sourceDirs.some((d) => p === d || p.startsWith(`${d}/`));
  const tsTargets = files.filter(
    (f) =>
      f.status !== "D" &&
      TS_EXTENSIONS.some((ext) => f.path.endsWith(ext)) &&
      !f.path.endsWith(".d.ts") &&
      inSourceDirs(f.path),
  );

  const tsExports = [];
  const unparsedFiles = [];
  for (const f of tsTargets) {
    const text = gitShowBlob(repoPath, headSha, f.path);
    if (text === null) {
      unparsedFiles.push({ path: f.path, reason: "blob unreadable at head" });
      continue;
    }
    try {
      const symbols = extractExportedSymbols(ts, f.path, text);
      tsExports.push({ path: f.path, headBlobSha: f.headBlobSha, symbols });
    } catch (err) {
      unparsedFiles.push({ path: f.path, reason: String(err.message ?? err) });
    }
  }
  tsExports.sort((a, b) => cmp(a.path, b.path));
  unparsedFiles.sort((a, b) => cmp(a.path, b.path));

  // Prisma schemas at base and head.
  const prisma = { base: { models: [], enums: [] }, head: { models: [], enums: [] } };
  for (const schemaPath of manifest.prismaSchemaPaths) {
    for (const [side, ref] of [["base", mergeBaseSha], ["head", headSha]]) {
      const text = gitShowBlob(repoPath, ref, schemaPath);
      if (text === null) continue; // schema absent at that ref is a fact, not an error
      try {
        const parsed = parsePrismaSchema(text, schemaPath);
        prisma[side].models.push(...parsed.models);
        prisma[side].enums.push(...parsed.enums);
      } catch (err) {
        unparsedFiles.push({ path: `${side}:${schemaPath}`, reason: String(err.message ?? err) });
      }
    }
  }
  for (const side of ["base", "head"]) {
    prisma[side].models.sort((a, b) => cmp(a.name, b.name));
    prisma[side].enums.sort((a, b) => cmp(a.name, b.name));
  }

  // Migration SQL changed on the branch.
  const migrationsDirs = manifest.migrationsDirs ?? [];
  const migrationFiles = files.filter(
    (f) =>
      f.status !== "D" &&
      f.path.endsWith(".sql") &&
      migrationsDirs.some((d) => f.path.startsWith(`${d}/`)),
  );
  const migrations = [];
  for (const f of migrationFiles) {
    const text = gitShowBlob(repoPath, headSha, f.path);
    if (text === null) {
      unparsedFiles.push({ path: f.path, reason: "migration blob unreadable at head" });
      continue;
    }
    migrations.push({ path: f.path, statements: parseMigrationSql(text) });
  }
  migrations.sort((a, b) => cmp(a.path, b.path));

  const scanComplete = unparsedFiles.length === 0;

  // Collisions: NEVER inferred from an incomplete scan.
  let collisions = null;
  if (scanComplete) {
    collisions = detectCollisions({ tsExports, prisma, manifest });
  }

  // Semantic-domain candidates: guarded/prefixed symbols mapped to domains.
  const semanticDomainCandidates = [];
  for (const file of tsExports) {
    for (const sym of file.symbols) {
      if (sym.kind === "star-reexport") continue;
      const candidates = domainCandidatesForSymbol(manifest, sym.name);
      if (candidates.length > 0) {
        semanticDomainCandidates.push({
          symbol: sym.name,
          kind: sym.kind,
          path: file.path,
          candidateDomains: candidates,
          pathDomain: domainForPath(manifest, file.path) ?? "UNOWNED_PATH",
        });
      }
    }
  }
  semanticDomainCandidates.sort((a, b) =>
    a.symbol === b.symbol ? cmp(a.path, b.path) : cmp(a.symbol, b.symbol),
  );

  const inventory = {
    schemaVersion: 1,
    // Resolved SHAs only: the inventory must be a pure function of commit
    // identity, never of how a ref was spelled on the command line.
    refs: { baseSha, headSha, mergeBaseSha },
    changedFileCount: files.length,
    files,
    tsExports,
    prisma,
    migrations,
    collisionScan: {
      complete: scanComplete,
      status: scanComplete
        ? collisions.length === 0
          ? "COMPLETE_ZERO_COLLISIONS"
          : "COMPLETE_COLLISIONS_FOUND"
        : "INCOMPLETE_SCAN_COLLISIONS_UNKNOWN",
      collisions: scanComplete ? collisions : "UNKNOWN_INCOMPLETE_SCAN",
      ruleIds: COLLISION_RULES.map((r) => r.id).sort(),
    },
    semanticDomainCandidates,
    unparsedFiles,
    manifest: { path: "scripts/nova/convergence-owners.json", sha256: sha256Hex(readFileSync(manifestPath, "utf8")) },
  };

  return { inventory, manifest, scanComplete, collisions, refInputs: { baseRef, headRef } };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

export function renderMarkdown(inventory) {
  const lines = [];
  const { refs } = inventory;
  lines.push("# NOVA Convergence Inventory");
  lines.push("");
  lines.push("Deterministic branch inventory produced by `scripts/nova/build-convergence-inventory.mjs`.");
  lines.push("");
  lines.push(`- base: ${refs.baseSha}`);
  lines.push(`- head: ${refs.headSha}`);
  lines.push(`- merge-base: ${refs.mergeBaseSha}`);
  lines.push(`- changed files: ${inventory.changedFileCount}`);
  lines.push(`- collision scan: **${inventory.collisionScan.status}**`);
  lines.push("");
  lines.push("## Collisions");
  lines.push("");
  if (!inventory.collisionScan.complete) {
    lines.push("Scan incomplete — collision state is **UNKNOWN** (fail closed). See unparsed files.");
  } else if (inventory.collisionScan.collisions.length === 0) {
    lines.push("None (complete scan).");
  } else {
    for (const c of inventory.collisionScan.collisions) {
      lines.push(`- \`${c.rule}\`: \`${c.symbol}\` ${c.path ? `at \`${c.path}\`` : ""}`.trimEnd());
    }
  }
  lines.push("");
  lines.push("## Changed files");
  lines.push("");
  lines.push("| status | path | head blob |");
  lines.push("| --- | --- | --- |");
  for (const f of inventory.files) {
    lines.push(`| ${f.status} | \`${f.path}\` | ${f.headBlobSha ?? "-"} |`);
  }
  lines.push("");
  lines.push("## Exported TypeScript symbols (changed files, head)");
  lines.push("");
  for (const f of inventory.tsExports) {
    lines.push(`### \`${f.path}\``);
    lines.push("");
    if (f.symbols.length === 0) {
      lines.push("_no exports_");
    } else {
      for (const s of f.symbols) lines.push(`- \`${s.name}\` (${s.kind})`);
    }
    lines.push("");
  }
  lines.push("## Prisma (head)");
  lines.push("");
  lines.push(`- models: ${inventory.prisma.head.models.length}`);
  lines.push(`- enums: ${inventory.prisma.head.enums.length}`);
  lines.push(`- changed migration files: ${inventory.migrations.length}`);
  lines.push("");
  lines.push("## Semantic-domain candidates");
  lines.push("");
  if (inventory.semanticDomainCandidates.length === 0) {
    lines.push("None.");
  } else {
    for (const c of inventory.semanticDomainCandidates) {
      lines.push(
        `- \`${c.symbol}\` (${c.kind}) at \`${c.path}\` → candidates: ${c.candidateDomains.join(", ")}; path domain: ${c.pathDomain}`,
      );
    }
  }
  lines.push("");
  lines.push("## Unparsed files");
  lines.push("");
  if (inventory.unparsedFiles.length === 0) {
    lines.push("None — scan complete.");
  } else {
    for (const u of inventory.unparsedFiles) {
      lines.push(`- \`${u.path}\` — ${u.reason}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Artifact + receipt production
// ---------------------------------------------------------------------------

export const ARTIFACT_NAMES = Object.freeze({
  inventoryJson: "NOVA_CONVERGENCE_INVENTORY.json",
  inventoryMd: "NOVA_CONVERGENCE_INVENTORY.md",
  receiptJson: "NOVA_CONVERGENCE_RECEIPT.json",
});

/** Derive the two deterministic artifacts (JSON + MD) as strings. */
export function deriveArtifacts(buildResult) {
  const inventoryJson = stableStringify(buildResult.inventory);
  const inventoryMd = renderMarkdown(buildResult.inventory);
  return { inventoryJson, inventoryMd };
}

function commandVersions(repoPath) {
  const ts = loadTypescript(repoPath);
  return {
    node: process.version,
    git: git(repoPath, ["--version"]).trim(),
    typescript: ts.version,
  };
}

export function buildReceipt({ repoPath, buildResult, artifacts, exitCode, outDir }) {
  const { inventory } = buildResult;
  const dirty = git(repoPath, ["status", "--porcelain"]).trim() !== "";
  return {
    schemaVersion: 1,
    generator: "scripts/nova/build-convergence-inventory.mjs",
    refs: inventory.refs,
    refInputs: { baseRef: buildResult.refInputs.baseRef, headRef: buildResult.refInputs.headRef },
    commandVersions: commandVersions(repoPath),
    changedFileCount: inventory.changedFileCount,
    exportedSymbolFileCount: inventory.tsExports.length,
    exportedSymbolCount: inventory.tsExports.reduce((n, f) => n + f.symbols.length, 0),
    prismaModelCountHead: inventory.prisma.head.models.length,
    prismaEnumCountHead: inventory.prisma.head.enums.length,
    collisionScanStatus: inventory.collisionScan.status,
    collisionCount: inventory.collisionScan.complete
      ? inventory.collisionScan.collisions.length
      : "UNKNOWN_INCOMPLETE_SCAN",
    unparsedFileCount: inventory.unparsedFiles.length,
    exitCode,
    artifacts: [
      { path: join(outDir, ARTIFACT_NAMES.inventoryJson), sha256: sha256Hex(artifacts.inventoryJson) },
      { path: join(outDir, ARTIFACT_NAMES.inventoryMd), sha256: sha256Hex(artifacts.inventoryMd) },
    ],
    manifestSha256: inventory.manifest.sha256,
    repositoryDirty: dirty,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function resolveOptions(argv, cwd = process.cwd()) {
  const { values } = parseArgs({
    args: argv,
    options: {
      repo: { type: "string", default: cwd },
      base: { type: "string", default: "main" },
      head: { type: "string", default: "HEAD" },
      manifest: { type: "string" },
      out: { type: "string", default: "reports/nova/convergence" },
    },
  });
  const repoPath = resolve(values.repo);
  const manifestPath = values.manifest
    ? resolve(values.manifest)
    : join(repoPath, "scripts/nova/convergence-owners.json");
  const outDir = isAbsolute(values.out) ? values.out : join(repoPath, values.out);
  return { repoPath, baseRef: values.base, headRef: values.head, manifestPath, outDir, outRel: values.out };
}

function main() {
  let opts;
  try {
    opts = resolveOptions(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`[convergence-inventory] usage error: ${err.message}\n`);
    process.exit(EXIT.USAGE_OR_INTERNAL);
  }
  try {
    const buildResult = buildInventory(opts);
    const artifacts = deriveArtifacts(buildResult);

    let exitCode = EXIT.OK;
    if (!buildResult.scanComplete) exitCode = EXIT.INCOMPLETE_SCAN;
    else if (buildResult.collisions.length > 0) exitCode = EXIT.COLLISIONS;

    mkdirSync(opts.outDir, { recursive: true });
    const receipt = buildReceipt({
      repoPath: opts.repoPath,
      buildResult,
      artifacts,
      exitCode,
      outDir: opts.outRel,
    });
    writeFileSync(join(opts.outDir, ARTIFACT_NAMES.inventoryJson), artifacts.inventoryJson);
    writeFileSync(join(opts.outDir, ARTIFACT_NAMES.inventoryMd), artifacts.inventoryMd);
    writeFileSync(join(opts.outDir, ARTIFACT_NAMES.receiptJson), stableStringify(receipt));

    const status = buildResult.inventory.collisionScan.status;
    process.stderr.write(
      `[convergence-inventory] ${status}; changed=${buildResult.inventory.changedFileCount} ` +
        `unparsed=${buildResult.inventory.unparsedFiles.length} exit=${exitCode}\n`,
    );
    process.exit(exitCode);
  } catch (err) {
    process.stderr.write(`[convergence-inventory] internal error: ${err.stack ?? err}\n`);
    process.exit(EXIT.USAGE_OR_INTERNAL);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
