#!/usr/bin/env node
/**
 * NOVA multi-head convergence inventory (directive section 14.6).
 *
 * Extends the single-head deterministic inventory to N candidate stack heads
 * scanned against one base (main). Produces a combined cross-branch
 * symbol-ownership and collision matrix:
 *
 *   - which head declares which guarded TS symbol / Prisma name / route /
 *     new environment variable;
 *   - cross-head collisions: duplicate guarded symbols, Prisma names
 *     redeclared or divergently defined on multiple heads, migration
 *     timestamp duplicates and ordering interleaves, route collisions, and
 *     duplicate new env-var introductions.
 *
 * Everything is derived from git object identity (blobs at resolved SHAs),
 * the repo's own TypeScript compiler API and deterministic line/regex scans.
 * The inventory is a pure function of (baseSha, [head labels+SHAs], manifest).
 * Volatile facts — staleness vs expected remote refs, fetch-failure notes,
 * timestamps — live only in the receipt.
 *
 * Fail-closed contract (same as single-head):
 *   exit 0 — every head scanned completely, zero cross-head collisions
 *   exit 1 — scan complete, collisions found
 *   exit 2 — scan INCOMPLETE on any head; collisions reported UNKNOWN
 *   exit 3 — usage / environment / internal error
 *
 * A model may interpret the receipt; it may not manufacture it.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  EXIT,
  buildInventory,
  cmp,
  loadTypescript,
  matchesPrefix,
  sha256Hex,
  stableStringify,
} from "./build-convergence-inventory.mjs";

export const MULTIHEAD_ARTIFACT_NAMES = Object.freeze({
  inventoryJson: "NOVA_MULTIHEAD_INVENTORY.json",
  inventoryMd: "NOVA_MULTIHEAD_INVENTORY.md",
  receiptJson: "NOVA_MULTIHEAD_RECEIPT.json",
});

const ENV_SCAN_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"];

function git(repoPath, args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      // Capture stderr instead of inheriting it: allowFail probes (e.g. a
      // blob absent at the merge-base) are expected and must not print noise.
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    if (allowFail) return null;
    throw new Error(
      `git ${args.join(" ")} failed: ${err.stderr ? String(err.stderr).trim() : err.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Route extraction (Next.js app router — deterministic path derivation)
// ---------------------------------------------------------------------------

const ROUTE_FILE_RE = /(?:^|\/)app\/(?:(.*)\/)?(route\.ts|route\.tsx|page\.tsx)$/;

/**
 * Derive the served route path from a Next.js app-router file path, or null
 * when the file is not a route/page file. Route groups `(group)` and
 * parallel-route slots `@slot` do not contribute URL segments.
 *
 * @returns {{routePath: string, kind: "api"|"page"} | null}
 */
export function routeForFilePath(filePath) {
  const m = filePath.match(ROUTE_FILE_RE);
  if (!m) return null;
  const rawSegments = (m[1] ?? "") === "" ? [] : m[1].split("/");
  const segments = rawSegments.filter(
    (s) => !(s.startsWith("(") && s.endsWith(")")) && !s.startsWith("@"),
  );
  return {
    routePath: `/${segments.join("/")}`.replace(/\/{2,}/g, "/"),
    kind: m[2].startsWith("route.") ? "api" : "page",
  };
}

/**
 * Pure: extract route declarations from a changed-file list
 * (entries: {path, status}). Deleted files are excluded.
 *
 * @returns Array<{routePath, kind, path}> sorted by routePath then path.
 */
export function extractRoutes(files) {
  const routes = [];
  for (const f of files) {
    if (f.status === "D") continue;
    const r = routeForFilePath(f.path);
    if (r) routes.push({ routePath: r.routePath, kind: r.kind, path: f.path });
  }
  routes.sort((a, b) =>
    a.routePath === b.routePath ? cmp(a.path, b.path) : cmp(a.routePath, b.routePath),
  );
  return routes;
}

// ---------------------------------------------------------------------------
// Environment-variable read extraction (deterministic regex scan)
// ---------------------------------------------------------------------------

const ENV_READ_RE =
  /(?<![\w$.])process\.env(?:\.([A-Za-z_$][A-Za-z0-9_$]*)|\[\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\])/g;

/** Pure: sorted, de-duplicated env-var names read via process.env in source text. */
export function extractEnvVarNames(sourceText) {
  const names = new Set();
  for (const m of sourceText.matchAll(ENV_READ_RE)) {
    names.add(m[1] ?? m[2]);
  }
  return [...names].sort(cmp);
}

// ---------------------------------------------------------------------------
// Migration timestamp extraction
// ---------------------------------------------------------------------------

const MIGRATION_DIR_RE = /\/migrations\/(\d+)_([^/]*)\/[^/]+$/;

/**
 * Pure: derive {dir, timestamp} from a Prisma migration file path, or null
 * when the path does not follow the timestamped-directory convention.
 */
export function migrationTimestampForPath(filePath) {
  const m = filePath.match(MIGRATION_DIR_RE);
  if (!m) return null;
  return { dir: `${m[1]}_${m[2]}`, timestamp: m[1] };
}

// ---------------------------------------------------------------------------
// Cross-head collision rules
// ---------------------------------------------------------------------------

/**
 * Rule input shape — `heads` is an array of per-head summaries:
 *   {
 *     label, headSha,
 *     guardedSymbols: [{name, kind, path}],
 *     prismaNew:      [{name, type, blockHash, existedAtBase}],
 *     newMigrations:  [{path, dir, timestamp, headBlobSha}],
 *     routes:         [{routePath, kind, path}],
 *     newEnvVars:     [{name, paths}],
 *   }
 * Each rule is independently removable so mutation tests can prove every
 * rule is load-bearing.
 */
export const MULTIHEAD_COLLISION_RULES = [
  {
    id: "cross-head-guarded-symbol",
    description:
      "The same guarded exported TS symbol (matching a forbidden prefix) is declared on more than one head.",
    detect({ heads }) {
      const byName = new Map();
      for (const h of heads) {
        for (const s of h.guardedSymbols) {
          if (!byName.has(s.name)) byName.set(s.name, new Map());
          const perHead = byName.get(s.name);
          if (!perHead.has(h.label)) perHead.set(h.label, new Set());
          perHead.get(h.label).add(s.path);
        }
      }
      const found = [];
      for (const [name, perHead] of byName) {
        if (perHead.size > 1) {
          found.push({
            rule: "cross-head-guarded-symbol",
            symbol: name,
            heads: [...perHead]
              .map(([label, paths]) => ({ label, paths: [...paths].sort(cmp) }))
              .sort((a, b) => cmp(a.label, b.label)),
          });
        }
      }
      return found;
    },
  },
  {
    id: "cross-head-prisma-redeclared",
    description:
      "A Prisma model/enum name absent from the base schema is introduced on more than one head.",
    detect({ heads }) {
      const byName = new Map();
      for (const h of heads) {
        for (const p of h.prismaNew) {
          if (p.existedAtBase) continue;
          if (!byName.has(p.name)) byName.set(p.name, []);
          byName.get(p.name).push({ label: h.label, type: p.type, blockHash: p.blockHash });
        }
      }
      const found = [];
      for (const [name, decls] of byName) {
        const labels = new Set(decls.map((d) => d.label));
        if (labels.size > 1) {
          found.push({
            rule: "cross-head-prisma-redeclared",
            symbol: name,
            heads: decls
              .map((d) => ({ label: d.label, type: d.type, blockHash: d.blockHash }))
              .sort((a, b) => cmp(a.label, b.label)),
          });
        }
      }
      return found;
    },
  },
  {
    id: "cross-head-prisma-divergent-definition",
    description:
      "The same Prisma model/enum name is added or changed on more than one head with differing block definitions (same-table divergence).",
    detect({ heads }) {
      const byName = new Map();
      for (const h of heads) {
        for (const p of h.prismaNew) {
          if (!byName.has(p.name)) byName.set(p.name, []);
          byName.get(p.name).push({ label: h.label, blockHash: p.blockHash, type: p.type });
        }
      }
      const found = [];
      for (const [name, decls] of byName) {
        const labels = new Set(decls.map((d) => d.label));
        const hashes = new Set(decls.map((d) => d.blockHash));
        if (labels.size > 1 && hashes.size > 1) {
          found.push({
            rule: "cross-head-prisma-divergent-definition",
            symbol: name,
            heads: decls
              .map((d) => ({ label: d.label, blockHash: d.blockHash, type: d.type }))
              .sort((a, b) => cmp(a.label, b.label)),
          });
        }
      }
      return found;
    },
  },
  {
    id: "cross-head-migration-timestamp-duplicate",
    description:
      "Two heads introduce migrations with the same timestamp prefix that are not the identical migration (same dir and blob).",
    detect({ heads }) {
      const byTimestamp = new Map();
      for (const h of heads) {
        for (const m of h.newMigrations) {
          if (!byTimestamp.has(m.timestamp)) byTimestamp.set(m.timestamp, []);
          byTimestamp.get(m.timestamp).push({
            label: h.label,
            dir: m.dir,
            headBlobSha: m.headBlobSha ?? null,
            path: m.path,
          });
        }
      }
      const found = [];
      for (const [timestamp, decls] of byTimestamp) {
        const labels = new Set(decls.map((d) => d.label));
        if (labels.size < 2) continue;
        const identities = new Set(decls.map((d) => `${d.dir} ${d.headBlobSha}`));
        if (identities.size === 1) continue; // identical migration on both heads
        found.push({
          rule: "cross-head-migration-timestamp-duplicate",
          symbol: timestamp,
          heads: decls
            .map((d) => ({ label: d.label, dir: d.dir, path: d.path }))
            .sort((a, b) => (a.label === b.label ? cmp(a.dir, b.dir) : cmp(a.label, b.label))),
        });
      }
      return found;
    },
  },
  {
    id: "cross-head-migration-order-interleaved",
    description:
      "One head introduces a migration whose timestamp falls strictly between two migrations introduced by another head — merge order becomes history-dependent.",
    detect({ heads }) {
      const found = [];
      const withMigrations = heads.filter((h) => h.newMigrations.length > 0);
      for (let i = 0; i < withMigrations.length; i += 1) {
        for (let j = i + 1; j < withMigrations.length; j += 1) {
          const a = withMigrations[i];
          const b = withMigrations[j];
          const interleaves = (outer, inner) => {
            const ts = outer.newMigrations.map((m) => m.timestamp).sort(cmp);
            const lo = ts[0];
            const hi = ts[ts.length - 1];
            return inner.newMigrations.some(
              (m) => cmp(lo, m.timestamp) < 0 && cmp(m.timestamp, hi) < 0,
            );
          };
          if (interleaves(a, b) || interleaves(b, a)) {
            found.push({
              rule: "cross-head-migration-order-interleaved",
              symbol: [a.label, b.label].sort(cmp).join(" <> "),
              heads: [a, b]
                .map((h) => ({
                  label: h.label,
                  timestamps: h.newMigrations.map((m) => m.timestamp).sort(cmp),
                }))
                .sort((x, y) => cmp(x.label, y.label)),
            });
          }
        }
      }
      return found;
    },
  },
  {
    id: "cross-head-route-collision",
    description:
      "The same Next.js route path (route.ts or page.tsx) is added or modified on more than one head.",
    detect({ heads }) {
      const byRoute = new Map();
      for (const h of heads) {
        for (const r of h.routes) {
          const key = `${r.kind} ${r.routePath}`;
          if (!byRoute.has(key)) byRoute.set(key, new Map());
          const perHead = byRoute.get(key);
          if (!perHead.has(h.label)) perHead.set(h.label, new Set());
          perHead.get(h.label).add(r.path);
        }
      }
      const found = [];
      for (const [key, perHead] of byRoute) {
        if (perHead.size > 1) {
          found.push({
            rule: "cross-head-route-collision",
            symbol: key,
            heads: [...perHead]
              .map(([label, paths]) => ({ label, paths: [...paths].sort(cmp) }))
              .sort((a, b) => cmp(a.label, b.label)),
          });
        }
      }
      return found;
    },
  },
  {
    id: "cross-head-env-var-collision",
    description:
      "The same new environment-variable read (absent at the merge-base version of the file) is introduced on more than one head.",
    detect({ heads }) {
      const byVar = new Map();
      for (const h of heads) {
        for (const v of h.newEnvVars) {
          if (!byVar.has(v.name)) byVar.set(v.name, []);
          byVar.get(v.name).push({ label: h.label, paths: v.paths });
        }
      }
      const found = [];
      for (const [name, decls] of byVar) {
        const labels = new Set(decls.map((d) => d.label));
        if (labels.size > 1) {
          found.push({
            rule: "cross-head-env-var-collision",
            symbol: name,
            heads: decls
              .map((d) => ({ label: d.label, paths: [...d.paths].sort(cmp) }))
              .sort((a, b) => cmp(a.label, b.label)),
          });
        }
      }
      return found;
    },
  },
];

export function detectMultiHeadCollisions(input, rules = MULTIHEAD_COLLISION_RULES) {
  const collisions = [];
  for (const rule of rules) collisions.push(...rule.detect(input));
  collisions.sort((a, b) => {
    const ka = `${a.rule}|${a.symbol}`;
    const kb = `${b.rule}|${b.symbol}`;
    return cmp(ka, kb);
  });
  return collisions;
}

// ---------------------------------------------------------------------------
// Per-head analysis (git-backed, built on the single-head inventory)
// ---------------------------------------------------------------------------

/**
 * Analyze one head against the base. Reuses the single-head deterministic
 * inventory (changed files, TS exports, Prisma, migrations, fail-closed
 * unparsed tracking) and adds routes, new env-var reads, guarded symbols and
 * new/changed Prisma blocks.
 */
export function analyzeHead({ repoPath, baseSha, label, headRef, manifestPath }) {
  const { inventory, manifest } = buildInventory({
    repoPath,
    baseRef: baseSha,
    headRef,
    manifestPath,
  });

  // Guarded symbols: declared exports (not re-exports) matching a forbidden prefix.
  const guardedSymbols = [];
  for (const file of inventory.tsExports) {
    for (const sym of file.symbols) {
      if (sym.kind === "star-reexport" || sym.kind === "reexport") continue;
      if (manifest.forbiddenPrefixes.some((fp) => matchesPrefix(sym.name, fp.prefix))) {
        guardedSymbols.push({ name: sym.name, kind: sym.kind, path: file.path });
      }
    }
  }
  guardedSymbols.sort((a, b) => (a.name === b.name ? cmp(a.path, b.path) : cmp(a.name, b.name)));

  // Prisma: blocks new or changed relative to this head's base parse.
  const prismaNew = [];
  for (const [type, key] of [["model", "models"], ["enum", "enums"]]) {
    const baseByName = new Map(inventory.prisma.base[key].map((e) => [e.name, e]));
    for (const entry of inventory.prisma.head[key]) {
      const baseEntry = baseByName.get(entry.name);
      if (baseEntry && baseEntry.blockHash === entry.blockHash) continue;
      prismaNew.push({
        name: entry.name,
        type,
        blockHash: entry.blockHash,
        existedAtBase: Boolean(baseEntry),
      });
    }
  }
  prismaNew.sort((a, b) => cmp(a.name, b.name));

  // Migrations changed on the head, with timestamped-directory identity.
  const blobByPath = new Map(inventory.files.map((f) => [f.path, f.headBlobSha]));
  const newMigrations = [];
  for (const m of inventory.migrations) {
    const t = migrationTimestampForPath(m.path);
    if (!t) continue;
    newMigrations.push({
      path: m.path,
      dir: t.dir,
      timestamp: t.timestamp,
      headBlobSha: blobByPath.get(m.path) ?? null,
    });
  }
  newMigrations.sort((a, b) => cmp(a.path, b.path));

  // Routes declared/changed on the head.
  const routes = extractRoutes(inventory.files);

  // New env-var reads: vars present in the head blob of a changed file but
  // absent from the merge-base blob of the same file.
  const inSourceDirs = (p) =>
    manifest.sourceDirs.some((d) => p === d || p.startsWith(`${d}/`));
  const envByName = new Map();
  for (const f of inventory.files) {
    if (f.status === "D") continue;
    if (!ENV_SCAN_EXTENSIONS.some((ext) => f.path.endsWith(ext))) continue;
    if (!inSourceDirs(f.path)) continue;
    const headText = git(repoPath, ["show", `${inventory.refs.headSha}:${f.path}`], {
      allowFail: true,
    });
    if (headText === null) continue;
    const headVars = extractEnvVarNames(headText);
    if (headVars.length === 0) continue;
    const baseText = git(repoPath, ["show", `${inventory.refs.mergeBaseSha}:${f.path}`], {
      allowFail: true,
    });
    const baseVars = new Set(baseText === null ? [] : extractEnvVarNames(baseText));
    for (const name of headVars) {
      if (baseVars.has(name)) continue;
      if (!envByName.has(name)) envByName.set(name, new Set());
      envByName.get(name).add(f.path);
    }
  }
  const newEnvVars = [...envByName]
    .map(([name, paths]) => ({ name, paths: [...paths].sort(cmp) }))
    .sort((a, b) => cmp(a.name, b.name));

  return {
    label,
    headSha: inventory.refs.headSha,
    mergeBaseSha: inventory.refs.mergeBaseSha,
    changedFileCount: inventory.changedFileCount,
    guardedSymbols,
    prismaNew,
    newMigrations,
    routes,
    newEnvVars,
    unparsedFiles: inventory.unparsedFiles,
  };
}

// ---------------------------------------------------------------------------
// Ownership matrix
// ---------------------------------------------------------------------------

/** Pure: name -> declaring head labels, for symbols/prisma/routes/env vars/prefixes. */
export function buildOwnershipMatrix(heads, manifest) {
  const collect = (extract) => {
    const byKey = new Map();
    for (const h of heads) {
      for (const key of extract(h)) {
        if (!byKey.has(key)) byKey.set(key, new Set());
        byKey.get(key).add(h.label);
      }
    }
    const out = {};
    for (const key of [...byKey.keys()].sort(cmp)) {
      out[key] = [...byKey.get(key)].sort(cmp);
    }
    return out;
  };
  return {
    guardedSymbols: collect((h) => h.guardedSymbols.map((s) => s.name)),
    prismaNames: collect((h) => h.prismaNew.map((p) => p.name)),
    routes: collect((h) => h.routes.map((r) => `${r.kind} ${r.routePath}`)),
    newEnvVars: collect((h) => h.newEnvVars.map((v) => v.name)),
    forbiddenPrefixes: collect((h) => {
      const hit = new Set();
      for (const s of h.guardedSymbols) {
        for (const fp of manifest.forbiddenPrefixes) {
          if (matchesPrefix(s.name, fp.prefix)) hit.add(fp.prefix);
        }
      }
      return [...hit];
    }),
  };
}

// ---------------------------------------------------------------------------
// Multi-head inventory build
// ---------------------------------------------------------------------------

/**
 * Build the deterministic multi-head inventory. `heads` is an array of
 * {label, ref}; the inventory content depends only on the resolved SHAs, the
 * labels and the manifest — never on remote state or the working tree.
 */
export function buildMultiHeadInventory({ repoPath, baseRef, heads, manifestPath }) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const baseSha = git(repoPath, ["rev-parse", `${baseRef}^{commit}`]).trim();

  const analyzed = heads
    .map((h) => analyzeHead({ repoPath, baseSha, label: h.label, headRef: h.ref, manifestPath }))
    .sort((a, b) => cmp(a.label, b.label));

  const unparsedFiles = analyzed.flatMap((h) =>
    h.unparsedFiles.map((u) => ({ head: h.label, path: u.path, reason: u.reason })),
  );
  const scanComplete = unparsedFiles.length === 0;

  let collisions = null;
  if (scanComplete) {
    collisions = detectMultiHeadCollisions({ heads: analyzed, manifest });
  }

  const inventory = {
    schemaVersion: 1,
    mode: "multi-head",
    base: { baseSha },
    heads: analyzed,
    ownershipMatrix: buildOwnershipMatrix(analyzed, manifest),
    collisionScan: {
      complete: scanComplete,
      status: scanComplete
        ? collisions.length === 0
          ? "COMPLETE_ZERO_COLLISIONS"
          : "COMPLETE_COLLISIONS_FOUND"
        : "INCOMPLETE_SCAN_COLLISIONS_UNKNOWN",
      collisions: scanComplete ? collisions : "UNKNOWN_INCOMPLETE_SCAN",
      ruleIds: MULTIHEAD_COLLISION_RULES.map((r) => r.id).sort(cmp),
    },
    unparsedFiles,
    manifest: {
      path: "scripts/nova/convergence-owners.json",
      sha256: sha256Hex(readFileSync(manifestPath, "utf8")),
    },
  };

  return { inventory, manifest, scanComplete, collisions };
}

// ---------------------------------------------------------------------------
// Stale-head detection (receipt-only — volatile by nature)
// ---------------------------------------------------------------------------

/**
 * Compare each supplied head against an expected SHA map (branch -> sha).
 * A head matches a refs entry when its label equals the branch, equals
 * `origin/<branch>`, or ends with `/<branch>`.
 *
 * Statuses: MATCHES_EXPECTED | STALE_BEHIND_EXPECTED | DIVERGED_FROM_EXPECTED
 *           | EXPECTED_UNRESOLVABLE | NO_EXPECTED_REF
 */
export function analyzeHeadFreshness({ repoPath, heads, refsMap }) {
  const entryFor = (label) => {
    for (const [branch, sha] of Object.entries(refsMap ?? {})) {
      if (label === branch || label === `origin/${branch}` || label.endsWith(`/${branch}`)) {
        return { branch, sha };
      }
    }
    return null;
  };
  return heads
    .map((h) => {
      const expected = entryFor(h.label);
      if (!expected) {
        return { label: h.label, resolvedSha: h.headSha, expectedSha: null, status: "NO_EXPECTED_REF" };
      }
      const expectedSha = git(repoPath, ["rev-parse", `${expected.sha}^{commit}`], { allowFail: true });
      if (expectedSha === null) {
        return {
          label: h.label,
          resolvedSha: h.headSha,
          expectedSha: expected.sha,
          status: "EXPECTED_UNRESOLVABLE",
        };
      }
      const resolvedExpected = expectedSha.trim();
      if (resolvedExpected === h.headSha) {
        return { label: h.label, resolvedSha: h.headSha, expectedSha: resolvedExpected, status: "MATCHES_EXPECTED" };
      }
      const isAncestor =
        git(repoPath, ["merge-base", "--is-ancestor", h.headSha, resolvedExpected], { allowFail: true }) !== null;
      return {
        label: h.label,
        resolvedSha: h.headSha,
        expectedSha: resolvedExpected,
        status: isAncestor ? "STALE_BEHIND_EXPECTED" : "DIVERGED_FROM_EXPECTED",
      };
    })
    .sort((a, b) => cmp(a.label, b.label));
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

export function renderMultiHeadMarkdown(inventory) {
  const lines = [];
  lines.push("# NOVA Multi-Head Convergence Inventory");
  lines.push("");
  lines.push(
    "Deterministic cross-branch inventory produced by `scripts/nova/multihead-inventory.mjs`.",
  );
  lines.push("");
  lines.push(`- base: ${inventory.base.baseSha}`);
  lines.push(`- heads: ${inventory.heads.length}`);
  lines.push(`- collision scan: **${inventory.collisionScan.status}**`);
  lines.push("");
  lines.push("## Heads");
  lines.push("");
  lines.push("| label | head SHA | merge-base | changed files | guarded symbols | prisma new/changed | new migrations | routes | new env vars |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const h of inventory.heads) {
    lines.push(
      `| \`${h.label}\` | ${h.headSha} | ${h.mergeBaseSha} | ${h.changedFileCount} | ${h.guardedSymbols.length} | ${h.prismaNew.length} | ${h.newMigrations.length} | ${h.routes.length} | ${h.newEnvVars.length} |`,
    );
  }
  lines.push("");
  lines.push("## Cross-head collisions");
  lines.push("");
  if (!inventory.collisionScan.complete) {
    lines.push("Scan incomplete — collision state is **UNKNOWN** (fail closed). See unparsed files.");
  } else if (inventory.collisionScan.collisions.length === 0) {
    lines.push("None (complete scan).");
  } else {
    for (const c of inventory.collisionScan.collisions) {
      const who = c.heads.map((h) => `\`${h.label}\``).join(", ");
      lines.push(`- \`${c.rule}\`: \`${c.symbol}\` on ${who}`);
    }
  }
  lines.push("");
  const matrixSection = (title, map) => {
    lines.push(`## ${title}`);
    lines.push("");
    const keys = Object.keys(map);
    if (keys.length === 0) {
      lines.push("None.");
    } else {
      lines.push("| name | declared on |");
      lines.push("| --- | --- |");
      for (const k of keys) {
        lines.push(`| \`${k}\` | ${map[k].map((l) => `\`${l}\``).join(", ")} |`);
      }
    }
    lines.push("");
  };
  matrixSection("Ownership matrix — guarded symbols", inventory.ownershipMatrix.guardedSymbols);
  matrixSection("Ownership matrix — forbidden prefixes", inventory.ownershipMatrix.forbiddenPrefixes);
  matrixSection("Ownership matrix — Prisma names (new/changed)", inventory.ownershipMatrix.prismaNames);
  matrixSection("Ownership matrix — routes", inventory.ownershipMatrix.routes);
  matrixSection("Ownership matrix — new env vars", inventory.ownershipMatrix.newEnvVars);
  lines.push("## Unparsed files");
  lines.push("");
  if (inventory.unparsedFiles.length === 0) {
    lines.push("None — scan complete.");
  } else {
    for (const u of inventory.unparsedFiles) {
      lines.push(`- [${u.head}] \`${u.path}\` — ${u.reason}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

/** Derive the two deterministic artifacts (JSON + MD) as strings. */
export function deriveMultiHeadArtifacts(buildResult) {
  return {
    inventoryJson: stableStringify(buildResult.inventory),
    inventoryMd: renderMultiHeadMarkdown(buildResult.inventory),
  };
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export function buildMultiHeadReceipt({
  repoPath,
  buildResult,
  artifacts,
  exitCode,
  outDir,
  headInputs,
  headFreshness,
  notes,
}) {
  const { inventory } = buildResult;
  const ts = loadTypescript(repoPath);
  const dirty = git(repoPath, ["status", "--porcelain"]).trim() !== "";
  return {
    schemaVersion: 1,
    mode: "multi-head",
    generator: "scripts/nova/multihead-inventory.mjs",
    base: inventory.base,
    headInputs: headInputs
      .map((h) => ({ label: h.label, ref: h.ref, sha: h.sha }))
      .sort((a, b) => cmp(a.label, b.label)),
    headFreshness,
    notes: [...notes].sort(cmp),
    commandVersions: {
      node: process.version,
      git: git(repoPath, ["--version"]).trim(),
      typescript: ts.version,
    },
    headCount: inventory.heads.length,
    collisionScanStatus: inventory.collisionScan.status,
    collisionCount: inventory.collisionScan.complete
      ? inventory.collisionScan.collisions.length
      : "UNKNOWN_INCOMPLETE_SCAN",
    unparsedFileCount: inventory.unparsedFiles.length,
    exitCode,
    artifacts: [
      {
        path: join(outDir, MULTIHEAD_ARTIFACT_NAMES.inventoryJson),
        sha256: sha256Hex(artifacts.inventoryJson),
      },
      {
        path: join(outDir, MULTIHEAD_ARTIFACT_NAMES.inventoryMd),
        sha256: sha256Hex(artifacts.inventoryMd),
      },
    ],
    manifestSha256: inventory.manifest.sha256,
    repositoryDirty: dirty,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function resolveMultiHeadOptions(argv, cwd = process.cwd()) {
  const { values } = parseArgs({
    args: argv,
    options: {
      repo: { type: "string", default: cwd },
      base: { type: "string", default: "main" },
      heads: { type: "string" },
      refs: { type: "string" },
      note: { type: "string", multiple: true, default: [] },
      manifest: { type: "string" },
      out: { type: "string", default: "reports/nova/convergence/multi-head" },
    },
  });
  if (!values.heads) throw new Error("--heads <ref,ref,...> is required in multi-head mode");
  const repoPath = resolve(values.repo);
  const heads = values.heads
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((ref) => ({ label: ref, ref }));
  if (heads.length === 0) throw new Error("--heads resolved to an empty list");
  const seen = new Set();
  for (const h of heads) {
    if (seen.has(h.label)) throw new Error(`duplicate head "${h.label}" in --heads`);
    seen.add(h.label);
  }
  const manifestPath = values.manifest
    ? resolve(values.manifest)
    : join(repoPath, "scripts/nova/convergence-owners.json");
  const outDir = isAbsolute(values.out) ? values.out : join(repoPath, values.out);
  let refsMap = null;
  if (values.refs) {
    refsMap = JSON.parse(readFileSync(resolve(values.refs), "utf8"));
  }
  return {
    repoPath,
    baseRef: values.base,
    heads,
    refsMap,
    notes: values.note,
    manifestPath,
    outDir,
    outRel: values.out,
  };
}

export function mainMultiHead(argv = process.argv.slice(2)) {
  let opts;
  try {
    opts = resolveMultiHeadOptions(argv);
  } catch (err) {
    process.stderr.write(`[multihead-inventory] usage error: ${err.message}\n`);
    process.exit(EXIT.USAGE_OR_INTERNAL);
  }
  try {
    const buildResult = buildMultiHeadInventory(opts);
    const artifacts = deriveMultiHeadArtifacts(buildResult);

    let exitCode = EXIT.OK;
    if (!buildResult.scanComplete) exitCode = EXIT.INCOMPLETE_SCAN;
    else if (buildResult.collisions.length > 0) exitCode = EXIT.COLLISIONS;

    const shaByLabel = new Map(buildResult.inventory.heads.map((h) => [h.label, h.headSha]));
    const headInputs = opts.heads.map((h) => ({
      label: h.label,
      ref: h.ref,
      sha: shaByLabel.get(h.label),
    }));
    const headFreshness = analyzeHeadFreshness({
      repoPath: opts.repoPath,
      heads: buildResult.inventory.heads,
      refsMap: opts.refsMap,
    });
    for (const f of headFreshness) {
      if (f.status === "STALE_BEHIND_EXPECTED" || f.status === "DIVERGED_FROM_EXPECTED") {
        process.stderr.write(
          `[multihead-inventory] WARN stale head ${f.label}: resolved ${f.resolvedSha} vs expected ${f.expectedSha} (${f.status})\n`,
        );
      }
    }

    mkdirSync(opts.outDir, { recursive: true });
    const receipt = buildMultiHeadReceipt({
      repoPath: opts.repoPath,
      buildResult,
      artifacts,
      exitCode,
      outDir: opts.outRel,
      headInputs,
      headFreshness,
      notes: opts.notes,
    });
    writeFileSync(join(opts.outDir, MULTIHEAD_ARTIFACT_NAMES.inventoryJson), artifacts.inventoryJson);
    writeFileSync(join(opts.outDir, MULTIHEAD_ARTIFACT_NAMES.inventoryMd), artifacts.inventoryMd);
    writeFileSync(join(opts.outDir, MULTIHEAD_ARTIFACT_NAMES.receiptJson), stableStringify(receipt));

    process.stderr.write(
      `[multihead-inventory] ${buildResult.inventory.collisionScan.status}; heads=${buildResult.inventory.heads.length} ` +
        `unparsed=${buildResult.inventory.unparsedFiles.length} exit=${exitCode}\n`,
    );
    process.exit(exitCode);
  } catch (err) {
    process.stderr.write(`[multihead-inventory] internal error: ${err.stack ?? err}\n`);
    process.exit(EXIT.USAGE_OR_INTERNAL);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mainMultiHead();
}
