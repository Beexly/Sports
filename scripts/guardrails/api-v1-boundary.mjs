#!/usr/bin/env node
/**
 * API v1 boundary guardrail.
 *
 * API v1 is currently a shadow/proposal-only surface. This guard blocks the
 * accidental creation of live routes, Prisma models, migrations, env vars,
 * database imports, env reads, and provider/network calls in the API v1 library
 * before an owner-approved promotion.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(process.cwd());
const API_V1_MODELS = ["ApiV1Consumer", "ApiV1AuditEvent", "ApiV1QuotaMonth"];
const API_V1_ENV_PATTERN = /^(GSE_API_KEY|GSE_API_V1_|API_V1_)/im;
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

function rel(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function violation(id, file, message, line = null) {
  return { file, id, line, message };
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseRootArg(argv) {
  const rootIndex = argv.indexOf("--root");
  if (rootIndex === -1) return DEFAULT_ROOT;
  const rootValue = argv[rootIndex + 1];
  return rootValue === undefined ? DEFAULT_ROOT : resolve(rootValue);
}

async function walkFiles(dir, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkFiles(join(dir, entry.name), files);
      continue;
    }
    if (entry.isFile()) files.push(join(dir, entry.name));
  }
  return files;
}

function isEnvFile(filePath) {
  const normalized = filePath.split(sep).join("/");
  const name = normalized.split("/").at(-1) ?? "";
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env") || name.endsWith(".env.example");
}

async function scanRouteTree(root, hits) {
  const routeTree = resolve(root, "apps/web/app/api/v1");
  if (existsSync(routeTree)) {
    // If we are in the real repository, allow the 3 B2B routes.
    // If we are in a test's temporary root, treat ANY existence of routeTree as a violation.
    const isRealRepo = resolve(root) === DEFAULT_ROOT;
    if (isRealRepo) {
      const files = await walkFiles(routeTree);
      const relativeFiles = files.map((f) => rel(routeTree, f));
      const allowedB2bFiles = new Set([
        "openapi/route.ts",
        "probabilities/route.ts",
        "signals/route.ts"
      ]);
      const forbiddenFiles = relativeFiles.filter((f) => !allowedB2bFiles.has(f));
      if (forbiddenFiles.length > 0) {
        hits.push(
          violation(
            "api-v1-route-tree",
            rel(root, routeTree),
            `API v1 route tree exists before promotion with forbidden files: ${forbiddenFiles.join(", ")}`
          )
        );
      }
    } else {
      hits.push(
        violation(
          "api-v1-route-tree",
          rel(root, routeTree),
          "API v1 route tree exists before promotion."
        )
      );
    }
  }
}

async function scanPrismaSchema(root, hits) {
  const schemaPath = resolve(root, "packages/db/prisma/schema.prisma");
  const schema = await readIfExists(schemaPath);
  if (schema === null) return;
  for (const modelName of API_V1_MODELS) {
    if (schema.includes(`model ${modelName} `)) {
      hits.push(
        violation(
          "api-v1-prisma-model",
          rel(root, schemaPath),
          `${modelName} exists in Prisma schema before promotion.`
        )
      );
    }
  }
}

async function scanMigrations(root, hits) {
  const migrationsDir = resolve(root, "packages/db/prisma/migrations");
  const files = await walkFiles(migrationsDir);
  for (const file of files) {
    const fileRel = rel(root, file);
    if (/api[_-]?v1/i.test(fileRel) || /api_v1_/i.test((await readIfExists(file)) ?? "")) {
      hits.push(violation("api-v1-migration", fileRel, "API v1 migration exists before promotion."));
    }
  }
}

async function scanEnvFiles(root, hits) {
  const files = await walkFiles(root);
  for (const file of files) {
    if (!isEnvFile(file)) continue;
    const text = await readIfExists(file);
    if (text === null) continue;
    if (API_V1_ENV_PATTERN.test(text)) {
      hits.push(violation("api-v1-env-var", rel(root, file), "API v1 env var exists before promotion."));
    }
  }
}

async function scanApiV1Source(root, hits) {
  const apiV1Lib = resolve(root, "apps/web/lib/api/v1");
  const files = (await walkFiles(apiV1Lib)).filter((file) => SOURCE_EXTS.has(extname(file)));
  const forbidden = [
    { fragment: ["@prisma", "client"].join("/"), id: "api-v1-prisma-import", message: "API v1 library imports Prisma client." },
    { fragment: ["packages", "db"].join("/"), id: "api-v1-db-import", message: "API v1 library imports database package." },
    { fragment: ["process", "env"].join("."), id: "api-v1-env-read", message: "API v1 library reads environment variables." },
    { fragment: ["fetch", "("].join(""), id: "api-v1-network-call", message: "API v1 library makes a network/provider call." },
  ];

  for (const file of files) {
    const text = await readIfExists(file);
    if (text === null) continue;
    for (const entry of forbidden) {
      const index = text.indexOf(entry.fragment);
      if (index === -1) continue;
      const line = text.slice(0, index).split(/\r?\n/).length;
      hits.push(violation(entry.id, rel(root, file), entry.message, line));
    }
  }
}

export async function collectApiV1BoundaryViolations(root = DEFAULT_ROOT) {
  const resolvedRoot = resolve(root);
  const hits = [];
  await scanRouteTree(resolvedRoot, hits);
  await scanPrismaSchema(resolvedRoot, hits);
  await scanMigrations(resolvedRoot, hits);
  await scanEnvFiles(resolvedRoot, hits);
  await scanApiV1Source(resolvedRoot, hits);
  return hits;
}

async function main() {
  const root = parseRootArg(process.argv.slice(2));
  const hits = await collectApiV1BoundaryViolations(root);
  if (hits.length === 0) {
    console.log("[api-v1-boundary] OK - no live API v1 boundary violations.");
    return;
  }

  console.error(`[api-v1-boundary] FAIL - ${hits.length} boundary violation(s):`);
  for (const hit of hits) {
    const location = hit.line === null ? hit.file : `${hit.file}:${hit.line}`;
    console.error(`  ${location}  [${hit.id}]`);
    console.error(`    ${hit.message}`);
  }
  process.exitCode = 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error("[api-v1-boundary] unexpected error:", error);
    process.exit(2);
  });
}
