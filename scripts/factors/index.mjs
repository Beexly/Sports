#!/usr/bin/env node
/**
 * scripts/factors/index.mjs — C-364 Factor Foundry index (LAST_PLAN §4.1 / §4.4).
 *
 * Loads docs/factors/*.yaml, validates the zod spec schema and the
 * pre-registration rules, and writes docs/factors/INDEX.md.
 *
 * Refuses any status beyond UNTESTED/BLOCKED unless run_sha postdates the
 * commit that wrote kill_line. Kill lines are written BEFORE any run.
 *
 * Usage:
 *   node scripts/factors/index.mjs
 *   node scripts/factors/index.mjs --check   # validate only, do not write
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FACTORS_DIR = path.join(REPO_ROOT, "docs", "factors");
export const INDEX_PATH = path.join(FACTORS_DIR, "INDEX.md");

export const FACTOR_STATUSES = ["UNTESTED", "CANDIDATE", "LIVE", "DEAD", "BLOCKED"];
const SCORED = new Set(["CANDIDATE", "LIVE", "DEAD"]);
/** Statuses that may exist without a prior scored run. */
export const OPEN_STATUSES = new Set(["UNTESTED", "BLOCKED"]);

/** §4.1 spec schema — flat keys, matches packages/verifier factgraph.ts. */
export const FactorSpecSchema = z.object({
  id: z.string().regex(/^[A-Z][0-9]+$/, "id must look like A1 / P1"),
  title: z.string().min(1),
  hypothesis: z.string().min(1),
  estimand: z.string().min(1),
  unit: z.string().min(1),
  data: z.array(z.string().min(1)).min(1),
  discover_era: z.string().min(1),
  validate_era: z.string().min(1),
  kill_line: z
    .string()
    .min(1, "kill_line is required and must be non-empty (pre-registered before any run)"),
  mde_80pct_power: z.number().nullable().default(null),
  script: z.string().min(1),
  status: z.enum(FACTOR_STATUSES),
  number: z.number().nullable().default(null),
  ci: z.tuple([z.number(), z.number()]).nullable().default(null),
  n: z.number().nullable().default(null),
  run_sha: z.string().nullable().default(null),
  run_at: z.string().nullable().default(null),
  blocked_on: z.string().nullable().default(null),
  notes: z.string().default(""),
});

/**
 * Minimal YAML subset parser for the flat factor-spec format (§4.1).
 * Mirrors packages/verifier/src/factgraph.ts — keep in sync.
 */
export function parseFactorYaml(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i += 1;
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    const key = m[1];
    let rest = m[2].trim();
    if (rest === ">" || rest === "|") {
      const buf = [];
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim().length === 0) {
          buf.push("");
          i += 1;
          continue;
        }
        if (/^\S/.test(next) && !next.startsWith(" ")) break;
        buf.push(next.replace(/^\s+/, "").trimEnd());
        i += 1;
      }
      out[key] = buf.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }
    out[key] = parseScalar(rest);
  }
  return out;
}

function parseScalar(raw) {
  if (raw === "" || raw === "null" || raw === "~") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (
    (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) ||
    (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2)
  ) {
    return raw.slice(1, -1);
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(",").map((s) => parseScalar(s.trim()));
  }
  const num = Number(raw);
  if (!Number.isNaN(num) && raw.trim() !== "") return num;
  return raw;
}

export function loadSpecFromText(text, fallbackId) {
  const parsed = parseFactorYaml(text);
  if (!parsed.id) parsed.id = fallbackId;
  const result = FactorSpecSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { ok: false, errors: issues, spec: null };
  }
  return { ok: true, errors: [], spec: result.data };
}

/** Structural pre-registration (in-memory half; temporal half is validateRunOrder). */
export function validatePreRegistration(spec) {
  const errors = [];
  const warnings = [];
  if (!spec.kill_line || String(spec.kill_line).trim().length === 0) {
    errors.push("kill_line is required and must be non-empty (pre-registered before any run)");
  }
  if (SCORED.has(spec.status)) {
    if (!spec.run_sha || String(spec.run_sha).trim().length < 7) {
      errors.push(`status=${spec.status} requires a run_sha (≥7 hex chars)`);
    }
    if (!spec.run_at) errors.push(`status=${spec.status} requires run_at`);
    if (spec.number == null || !Number.isFinite(spec.number)) {
      errors.push(`status=${spec.status} requires a validate-era point estimate in number`);
    }
    if (spec.n == null || !(spec.n > 0)) {
      errors.push(`status=${spec.status} requires n > 0`);
    }
  }
  if (spec.status === "BLOCKED" && !spec.blocked_on) {
    errors.push("status=BLOCKED requires blocked_on naming the missing dataset");
  }
  if (SCORED.has(spec.status) && (spec.ci == null || spec.ci.length !== 2)) {
    warnings.push(`status=${spec.status} without a 95% CI — INDEX will render the number bare`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Temporal gate (§4.1): scored status only when run_sha postdates the commit
 * that wrote kill_line. Refuses when either date is unknown.
 */
export function validateRunOrder(spec, { killLineCommittedAt, runCommittedAt }) {
  const errors = [];
  if (!SCORED.has(spec.status)) return { ok: true, errors };
  if (!killLineCommittedAt) {
    errors.push(
      `status=${spec.status} but kill_line is not in any commit — commit the pre-registered YAML before any run`,
    );
  }
  if (!runCommittedAt) {
    errors.push(
      `status=${spec.status} requires run_sha ${spec.run_sha ?? ""} to resolve to a commit`,
    );
  }
  if (killLineCommittedAt && runCommittedAt && runCommittedAt < killLineCommittedAt) {
    errors.push(
      `run_sha commit (${runCommittedAt}) predates kill_line commit (${killLineCommittedAt}) — pre-registration violated`,
    );
  }
  return { ok: errors.length === 0, errors };
}

/** ISO commit date for a SHA, or null when it does not resolve. */
export function commitDate(repoRoot, sha) {
  if (!sha || String(sha).trim().length < 7) return null;
  try {
    const iso = execFileSync("git", ["show", "-s", "--format=%cI", sha], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return iso || null;
  } catch {
    return null;
  }
}

/**
 * ISO date of the earliest commit on the YAML file whose body contains a
 * non-empty kill_line. null when the file is untracked or never had one.
 */
export function killLineCommitDate(repoRoot, relYamlPath) {
  let hashes;
  try {
    hashes = execFileSync("git", ["log", "--format=%H", "--", relYamlPath], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
  // Walk oldest → newest; first commit whose blob carries kill_line wins.
  for (const hash of hashes.slice().reverse()) {
    let body;
    try {
      body = execFileSync("git", ["show", `${hash}:${relYamlPath}`], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      continue;
    }
    const parsed = parseFactorYaml(body);
    const kl = parsed.kill_line;
    if (typeof kl === "string" && kl.trim().length > 0) {
      return commitDate(repoRoot, hash);
    }
  }
  return null;
}

/** §4.4 public table — same columns as packages/verifier factgraph.renderIndexMarkdown. */
export function renderIndexMarkdown(specs) {
  const lines = [
    "# Factor index",
    "",
    "Public source of `/method/factors`. Generated by `factgraph.ts` (`npm run factors:index`).",
    "DEAD rows stay forever. LIVE rows link to the pick-card factor trail.",
    "",
    "| id | hypothesis | status | validate-era | CI | n | kill line | run |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const s of specs) {
    const num = s.number == null ? "—" : s.number.toFixed(4);
    const ci = s.ci == null ? "—" : `[${s.ci[0].toFixed(4)}, ${s.ci[1].toFixed(4)}]`;
    const n = s.n == null ? "—" : String(s.n);
    const kill = String(s.kill_line).replace(/\|/g, "\\|");
    const run = s.run_at ?? "—";
    const hyp = String(s.hypothesis).replace(/\|/g, "\\|");
    lines.push(`| ${s.id} | ${hyp} | ${s.status} | ${num} | ${ci} | ${n} | ${kill} | ${run} |`);
  }
  if (specs.length === 0) {
    lines.push("| — | *(no factor specs yet)* | — | — | — | — | — | — |");
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Load every spec, apply zod + structural + temporal pre-registration.
 * options.gitCheck: false skips the temporal gate (used when specs are
 * uncommitted C-364 rows that are still UNTESTED).
 */
export function buildIndex({ repoRoot = REPO_ROOT, factorsDir = FACTORS_DIR, gitCheck = true } = {}) {
  const specs = [];
  const errors = [];
  const warnings = [];

  if (!existsSync(factorsDir)) {
    return { ok: true, specs, errors, warnings, markdown: renderIndexMarkdown([]) };
  }

  const files = readdirSync(factorsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();

  for (const f of files) {
    const full = path.join(factorsDir, f);
    const fallback = f.replace(/\.ya?ml$/, "");
    let text;
    try {
      text = readFileSync(full, "utf8");
    } catch (e) {
      errors.push(`${f}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    const loaded = loadSpecFromText(text, fallback);
    if (!loaded.ok) {
      for (const e of loaded.errors) errors.push(`${f}: ${e}`);
      continue;
    }
    const spec = loaded.spec;
    if (spec.id !== fallback && /^[A-Z][0-9]+$/.test(fallback)) {
      errors.push(`${f}: id ${spec.id} does not match filename ${fallback}`);
      continue;
    }

    const structural = validatePreRegistration(spec);
    for (const e of structural.errors) errors.push(`${spec.id}: ${e}`);
    for (const w of structural.warnings) warnings.push(`${spec.id}: ${w}`);

    if (gitCheck) {
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      const killLineCommittedAt = killLineCommitDate(repoRoot, rel);
      const runCommittedAt = SCORED.has(spec.status)
        ? commitDate(repoRoot, spec.run_sha)
        : null;
      const order = validateRunOrder(spec, { killLineCommittedAt, runCommittedAt });
      for (const e of order.errors) errors.push(`${spec.id}: ${e}`);
    }

    // BLOCKED with blocked_on is open; anything scored must have passed the gates.
    if (!OPEN_STATUSES.has(spec.status) && !SCORED.has(spec.status)) {
      errors.push(`${spec.id}: unknown status ${spec.status}`);
    }

    specs.push(spec);
  }

  specs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const markdown = renderIndexMarkdown(specs);
  return { ok: errors.length === 0, specs, errors, warnings, markdown };
}

export function writeIndex(result, indexPath = INDEX_PATH) {
  mkdirSync(path.dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, result.markdown, "utf8");
}

function main(argv) {
  const checkOnly = argv.includes("--check");
  const result = buildIndex({ gitCheck: true });
  if (!result.ok) {
    console.error("[factors:index] pre-registration failed — INDEX.md not written:");
    for (const e of result.errors) console.error(`  ${e}`);
    return 1;
  }
  for (const w of result.warnings) console.warn(`  warn ${w}`);
  if (checkOnly) {
    console.log(`[factors:index] OK (${result.specs.length} specs) — --check, nothing written`);
    return 0;
  }
  writeIndex(result);
  console.log(`[factors:index] wrote ${INDEX_PATH} (${result.specs.length} specs)`);
  return 0;
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  process.exit(main(process.argv.slice(2)));
}
