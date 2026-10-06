/**
 * Fact-graph: reads docs/factors/*.yaml, validates pre-registration order,
 * writes docs/factors/INDEX.md (the public table's source) and the mint log
 * entry for every held pick (replaces gate_decisions, D14).
 *
 * LAST_PLAN §4.1/§4.2. Minimal YAML subset parser — no new dependencies (law 7).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FactorSpec, HoldoutId, HoldoutPickRow, MintLogEntry } from "./types";

export type PreRegistrationCheck = {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

/**
 * Structural pre-registration validation.
 *
 * §4.1: the kill line is written BEFORE the script runs. A spec may only
 * leave UNTESTED/BLOCKED if it carries a non-empty kill_line. Anything that
 * has been scored (CANDIDATE/LIVE/DEAD) must carry run_sha, run_at, number,
 * and n. index.mjs / factgraph refuse anything else.
 */
export function validatePreRegistration(
  spec: FactorSpec,
  options?: {
    /** ISO date the kill_line-bearing commit landed, when known. */
    readonly killLineCommittedAt?: string;
    /** ISO date of run_sha, when known. */
    readonly runCommittedAt?: string;
  },
): PreRegistrationCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec.id || !/^[A-Z][0-9]+$/.test(spec.id)) {
    errors.push(`id must look like A1 / P1 (got ${JSON.stringify(spec.id)})`);
  }
  if (!spec.kill_line || spec.kill_line.trim().length === 0) {
    errors.push("kill_line is required and must be non-empty (pre-registered before any run)");
  }
  if (!spec.hypothesis || spec.hypothesis.trim().length === 0) {
    errors.push("hypothesis is required");
  }

  const scoredStatuses = new Set(["CANDIDATE", "LIVE", "DEAD"]);
  if (scoredStatuses.has(spec.status)) {
    if (!spec.run_sha || spec.run_sha.trim().length < 7) {
      errors.push(`status=${spec.status} requires a run_sha (≥7 hex chars)`);
    }
    if (!spec.run_at) {
      errors.push(`status=${spec.status} requires run_at`);
    }
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

  // Temporal order when both dates are supplied.
  if (options?.killLineCommittedAt && options?.runCommittedAt) {
    if (options.runCommittedAt < options.killLineCommittedAt) {
      errors.push(
        `run_sha commit (${options.runCommittedAt}) predates kill_line commit (${options.killLineCommittedAt}) — pre-registration violated`,
      );
    }
  }

  // Warning: a scored status with no CI is incomplete for the public table.
  if (scoredStatuses.has(spec.status) && (spec.ci == null || spec.ci.length !== 2)) {
    warnings.push(`status=${spec.status} without a 95% CI — INDEX will render the number bare`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Minimal YAML subset parser for the flat factor-spec format in §4.1.
 *
 * Supports:
 *   key: value
 *   key: "quoted"
 *   key: 'quoted'
 *   key: null | true | false | numbers
 *   key: [a, b, c]
 *   key: >
 *     folded
 *     text
 *   # comments
 *
 * Does NOT support nested maps, anchors, or multi-doc streams. A spec that
 * needs those is out of schema and should fail loudly.
 */
export function parseFactorYaml(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    i += 1;
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!m) continue;
    const key = m[1]!;
    let rest = m[2]!.trim();

    if (rest === ">" || rest === "|") {
      const buf: string[] = [];
      while (i < lines.length) {
        const next = lines[i]!;
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

function parseScalar(raw: string): unknown {
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

/** Coerce a parsed YAML map into a FactorSpec with defaults. */
export function toFactorSpec(parsed: Record<string, unknown>, fallbackId: string): FactorSpec {
  const numOrNull = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown): string => (v == null ? "" : String(v));
  const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
  const data = Array.isArray(parsed["data"]) ? (parsed["data"] as unknown[]).map(String) : [];
  let ci: readonly [number, number] | null = null;
  const ciRaw = parsed["ci"];
  if (Array.isArray(ciRaw) && ciRaw.length === 2) {
    ci = [Number(ciRaw[0]), Number(ciRaw[1])];
  }
  const statusRaw = str(parsed["status"] || "UNTESTED").toUpperCase();
  const status = (["UNTESTED", "CANDIDATE", "LIVE", "DEAD", "BLOCKED"] as const).includes(
    statusRaw as FactorSpec["status"],
  )
    ? (statusRaw as FactorSpec["status"])
    : "UNTESTED";

  return {
    id: str(parsed["id"] || fallbackId),
    title: str(parsed["title"]),
    hypothesis: str(parsed["hypothesis"]),
    estimand: str(parsed["estimand"]),
    unit: str(parsed["unit"]),
    data,
    discover_era: str(parsed["discover_era"]),
    validate_era: str(parsed["validate_era"]),
    kill_line: str(parsed["kill_line"]),
    mde_80pct_power: numOrNull(parsed["mde_80pct_power"]),
    script: str(parsed["script"]),
    status,
    number: numOrNull(parsed["number"]),
    ci,
    n: numOrNull(parsed["n"]),
    run_sha: strOrNull(parsed["run_sha"]),
    run_at: strOrNull(parsed["run_at"]),
    blocked_on: strOrNull(parsed["blocked_on"]),
    notes: str(parsed["notes"] ?? ""),
  };
}

export type FactGraphIndex = {
  readonly generatedAt: string;
  readonly specs: readonly FactorSpec[];
  readonly checks: readonly { readonly id: string; readonly check: PreRegistrationCheck }[];
  readonly markdown: string;
};

/** Read every docs/factors/*.yaml (excluding INDEX.md and mint logs). */
export function loadFactorSpecs(factorsDir: string): {
  readonly specs: FactorSpec[];
  readonly errors: string[];
} {
  const specs: FactorSpec[] = [];
  const errors: string[] = [];
  if (!existsSync(factorsDir)) {
    // Empty is honest: C-364 lands the YAML specs. An empty INDEX.md is the
    // correct public table until then; a missing directory is not a failure.
    return { specs, errors: [] };
  }
  const files = readdirSync(factorsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort();
  for (const f of files) {
    const full = path.join(factorsDir, f);
    try {
      const parsed = parseFactorYaml(readFileSync(full, "utf8"));
      const fallback = f.replace(/\.ya?ml$/, "");
      const spec = toFactorSpec(parsed, fallback);
      if (spec.id !== fallback && fallback.match(/^[A-Z][0-9]+$/)) {
        errors.push(`${f}: id ${spec.id} does not match filename ${fallback}`);
      }
      specs.push(spec);
    } catch (e) {
      errors.push(`${f}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  specs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return { specs, errors };
}

/** Build the public INDEX.md table (§4.4). */
export function renderIndexMarkdown(specs: readonly FactorSpec[]): string {
  const lines: string[] = [
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
    const ci =
      s.ci == null ? "—" : `[${s.ci[0].toFixed(4)}, ${s.ci[1].toFixed(4)}]`;
    const n = s.n == null ? "—" : String(s.n);
    const kill = s.kill_line.replace(/\|/g, "\\|");
    const run = s.run_at ?? "—";
    lines.push(
      `| ${s.id} | ${s.hypothesis.replace(/\|/g, "\\|")} | ${s.status} | ${num} | ${ci} | ${n} | ${kill} | ${run} |`,
    );
  }
  if (specs.length === 0) {
    lines.push("| — | *(no factor specs yet)* | — | — | — | — | — | — |");
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Full fact-graph build: load, validate, render INDEX.md.
 * Refuses to write when any scored spec fails pre-registration.
 */
export function buildFactGraph(
  factorsDir: string,
  options?: { readonly write?: boolean },
): FactGraphIndex & { readonly ok: boolean } {
  const { specs, errors: loadErrors } = loadFactorSpecs(factorsDir);
  const checks = specs.map((s) => ({ id: s.id, check: validatePreRegistration(s) }));
  const allErrors = [
    ...loadErrors,
    ...checks.flatMap((c) => c.check.errors.map((e) => `${c.id}: ${e}`)),
  ];
  const markdown = renderIndexMarkdown(specs);
  const ok = allErrors.length === 0;
  if (options?.write !== false && ok) {
    mkdirSync(factorsDir, { recursive: true });
    writeFileSync(path.join(factorsDir, "INDEX.md"), markdown, "utf8");
  }
  return {
    generatedAt: new Date().toISOString(),
    specs,
    checks,
    markdown,
    ok,
  };
}

/**
 * Mint log: one entry per held pick. Replaces gate_decisions (D14).
 *
 * "held" when the pick is on the holdout (settled, published, non-founder)
 * but has no finite modelProb — the engine withheld a scored probability.
 */
export function buildMintLog(
  rows: readonly HoldoutPickRow[],
  options?: {
    readonly holdoutId?: HoldoutId;
    readonly loggedAt?: string;
  },
): MintLogEntry[] {
  const loggedAt = options?.loggedAt ?? new Date().toISOString();
  const holdoutId = options?.holdoutId ?? "PICKS-H1";
  return rows.map((r) => {
    const held = r.modelProb == null || !(r.modelProb > 0 && r.modelProb < 1);
    return {
      pickId: r.id,
      holdoutId,
      decision: held ? ("held" as const) : ("published" as const),
      reason: held
        ? "no finite modelProb on the holdout export — held, not scored"
        : "scored on PICKS-H1",
      modelVersion: r.modelVersion,
      generatedAt: r.generatedAt,
      loggedAt,
    };
  });
}

export function writeMintLog(mintLogPath: string, entries: readonly MintLogEntry[]): void {
  mkdirSync(path.dirname(mintLogPath), { recursive: true });
  writeFileSync(
    mintLogPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2),
    "utf8",
  );
}
