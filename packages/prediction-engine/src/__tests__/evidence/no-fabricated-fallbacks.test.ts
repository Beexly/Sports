import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Anti-fabrication ratchet for the evidence path.
 *
 * The slate pipeline once asked the trends artefact for keys that do not exist
 * (`sack_rate_allowed` vs the real `sack_rate_allowed_pct`, `epa_per_play` vs
 * `off_epa_per_play`, `def_pressure_rate`, `def_epa_allowed`). Every read was
 * `?? default`, so the defaults fired for all 32 teams and the trench
 * advantage came out identical across the slate. The rest of the engine still
 * carries ~3,665 numeric `??` fallbacks; this test stops the NEW evidence path
 * from growing more.
 *
 * It is a source-level check (reads .ts files from disk) so it runs in the
 * ordinary vitest suite. Paths resolve from this file's own location, never
 * from process.cwd().
 *
 * Escape hatch: a fallback to 0 is legal ONLY when the same line carries an
 * explicit `// zero-is-real` comment (e.g. a genuinely measured zero). Every
 * other numeric `??` / `||` fallback — including `?? 0` — is a fabricated
 * input in a probability path and fails this test.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
/** packages/prediction-engine/src */
const PE_SRC = resolve(HERE, "..", "..");
/** packages/ */
const PACKAGES = resolve(PE_SRC, "..", "..");

const SCAN_ROOTS: readonly string[] = [
  resolve(PE_SRC, "evidence"),
  resolve(PACKAGES, "ingestion-pipeline", "src", "evidence-loaders"),
];

/**
 * Single files that are part of the probability path but live outside the two
 * directories above. The entrypoint is where a fallback would do the most
 * damage, because it is the last place before the seal.
 */
const SCAN_FILES: readonly string[] = [
  resolve(PACKAGES, "..", "scripts", "ops", "run_pregame.ts"),
];

const PACKAGE_ROOT_INDEX = resolve(PE_SRC, "index.ts");
const EVIDENCE_TYPES = resolve(PE_SRC, "evidence", "types.ts");

const ZERO_IS_REAL_MARKER = "// zero-is-real";

/**
 * Second escape hatch: a fallback whose default is DOCUMENTED UPSTREAM, not
 * invented here. The line must cite where. Example:
 *
 *   facet.weight ?? 1, // documented-default: GroundingFacet.weight (corpus-grounding.ts:51)
 *
 * This exists because `GroundingFacet.weight` is declared `weight?: number`
 * with the doc comment "Defaults to 1". Replacing that with a throw would
 * change the upstream contract; replacing it with a different number would be
 * a fabrication. Citing the source is the honest middle.
 */
const DOCUMENTED_DEFAULT_MARKER = "// documented-default:";

// ---------------------------------------------------------------------------
// Source masking
// ---------------------------------------------------------------------------

interface MaskedViews {
  /** Comments replaced by spaces; string literals left intact. */
  readonly code: string;
  /** Comments AND string-literal contents replaced by spaces. */
  readonly bare: string;
}

/**
 * Replace comments (and, in `bare`, string contents) with spaces while
 * preserving every character offset and newline, so line numbers computed on
 * a masked view map exactly onto the original source. Template `${...}`
 * interpolations are treated as code, so a fallback inside one is still seen.
 *
 * Known limitation: regex literals are not tokenised. The evidence sources
 * contain only simple regexes (/[.\s]+/g, /\s+/) with no quote or comment
 * sequences inside, so they pass through harmlessly.
 */
function maskSource(source: string): MaskedViews {
  const code: string[] = [];
  const bare: string[] = [];
  type Mode = "code" | "line-comment" | "block-comment" | "single-quote" | "double-quote" | "template";
  let mode: Mode = "code";
  /** Brace depth of each open `${ ... }` interpolation, innermost last. */
  const interpolationDepth: number[] = [];
  let i = 0;

  const keep = (ch: string): void => {
    code.push(ch);
    bare.push(ch);
  };
  const mask = (ch: string): void => {
    const c = ch === "\n" || ch === "\r" ? ch : " ";
    code.push(c);
    bare.push(c);
  };
  const codeOnly = (ch: string): void => {
    code.push(ch);
    bare.push(ch === "\n" || ch === "\r" ? ch : " ");
  };

  while (i < source.length) {
    const ch = source.charAt(i);
    const next = source.charAt(i + 1);
    if (mode === "code") {
      if (ch === "/" && next === "/") {
        mode = "line-comment";
        mask(" ");
        mask(" ");
        i += 2;
        continue;
      }
      if (ch === "/" && next === "*") {
        mode = "block-comment";
        mask(" ");
        mask(" ");
        i += 2;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") {
        mode = ch === "'" ? "single-quote" : ch === '"' ? "double-quote" : "template";
        keep(ch);
        i += 1;
        continue;
      }
      if (ch === "}" && interpolationDepth.length > 0) {
        const top = interpolationDepth.at(-1) ?? 0;
        if (top === 0) {
          interpolationDepth.pop();
          mode = "template";
        } else {
          interpolationDepth[interpolationDepth.length - 1] = top - 1;
        }
        keep(ch);
        i += 1;
        continue;
      }
      if (ch === "{" && interpolationDepth.length > 0) {
        interpolationDepth[interpolationDepth.length - 1] = (interpolationDepth.at(-1) ?? 0) + 1;
      }
      keep(ch);
      i += 1;
      continue;
    }
    if (mode === "line-comment") {
      if (ch === "\n") {
        mode = "code";
        keep(ch);
      } else {
        mask(ch);
      }
      i += 1;
      continue;
    }
    if (mode === "block-comment") {
      if (ch === "*" && next === "/") {
        mode = "code";
        mask(" ");
        mask(" ");
        i += 2;
        continue;
      }
      mask(ch);
      i += 1;
      continue;
    }
    if (mode === "single-quote" || mode === "double-quote") {
      const quote = mode === "single-quote" ? "'" : '"';
      if (ch === "\\") {
        codeOnly(ch);
        codeOnly(next);
        i += 2;
        continue;
      }
      if (ch === quote) {
        mode = "code";
        keep(ch);
        i += 1;
        continue;
      }
      codeOnly(ch);
      i += 1;
      continue;
    }
    // template
    if (ch === "\\") {
      codeOnly(ch);
      codeOnly(next);
      i += 2;
      continue;
    }
    if (ch === "`") {
      mode = "code";
      keep(ch);
      i += 1;
      continue;
    }
    if (ch === "$" && next === "{") {
      interpolationDepth.push(0);
      mode = "code";
      keep(ch);
      keep(next);
      i += 2;
      continue;
    }
    codeOnly(ch);
    i += 1;
  }

  return { code: code.join(""), bare: bare.join("") };
}

// ---------------------------------------------------------------------------
// Detectors (shared by the disk scan and the self-tests below)
// ---------------------------------------------------------------------------

interface SourceHit {
  readonly line: number;
  readonly matched: string;
  readonly lineText: string;
}

function lineOfIndex(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text.charAt(i) === "\n") line += 1;
  }
  return line;
}

function originalLine(source: string, line: number): string {
  return (source.split("\n")[line - 1] ?? "").trim();
}

/**
 * `??` or `||` followed by a numeric literal (integer, decimal, exponent,
 * hex, negative, numeric separators). Runs on the `bare` view so a number
 * inside a string literal is not a fallback; runs over the whole text so a
 * fallback split across lines (`??\n  0.5`) is still caught. The escape
 * hatch is checked on the ORIGINAL line where the match starts.
 */
const NUMERIC_FALLBACK_RE =
  /(?:\?\?|\|\|)\s*(-?(?:(?:\d[\d_]*(?:\.[\d_]+)?|\.\d[\d_]*)(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F_]+))/g;

function findNumericFallbacks(source: string): SourceHit[] {
  const { bare } = maskSource(source);
  const hits: SourceHit[] = [];
  NUMERIC_FALLBACK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMERIC_FALLBACK_RE.exec(bare)) !== null) {
    const line = lineOfIndex(bare, m.index);
    const lineText = originalLine(source, line);
    if (lineText.includes(ZERO_IS_REAL_MARKER)) continue;
    if (lineText.includes(DOCUMENTED_DEFAULT_MARKER)) continue;
    hits.push({ line, matched: m[0], lineText });
  }
  return hits;
}

/**
 * The four dead trend keys as STRING LITERALS only. The negative lookahead
 * keeps `sack_rate_allowed_pct` out; anchoring on the opening quote keeps the
 * prefixed real keys `off_epa_per_play` / `def_epa_per_play` out. Runs on the
 * `code` view, so doc comments that name the dead keys (trends.ts, types.ts)
 * do not trip it.
 */
const DEAD_TREND_KEY_RE =
  /["'`](?:sack_rate_allowed(?!_pct)|epa_per_play|def_pressure_rate|def_epa_allowed)["'`]/g;

function findDeadTrendKeys(source: string): SourceHit[] {
  const { code } = maskSource(source);
  const hits: SourceHit[] = [];
  DEAD_TREND_KEY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DEAD_TREND_KEY_RE.exec(code)) !== null) {
    const line = lineOfIndex(code, m.index);
    hits.push({ line, matched: m[0], lineText: originalLine(source, line) });
  }
  return hits;
}

/**
 * The evidence barrel (`src/evidence/index.ts`) imports node:crypto and must
 * never be re-exported from the package root barrel that client components
 * pull in. Match the exact barrel specifier — `./evidence`, `./evidence.js`,
 * `./evidence/index(.js)` — NOT merely any module whose name starts with
 * "evidence" (`./evidence-readiness-matrix.js` is a different, client-safe
 * module and is legitimately exported from the root).
 */
const BARREL_FROM_RE = /from\s*["']\.\/evidence(?:\.js)?["']/g;
const BARREL_INDEX_PATH_RE = /evidence\/index/g;

function findBarrelReexports(source: string): SourceHit[] {
  const { code } = maskSource(source);
  const hits: SourceHit[] = [];
  for (const re of [BARREL_FROM_RE, BARREL_INDEX_PATH_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      const line = lineOfIndex(code, m.index);
      hits.push({ line, matched: m[0], lineText: originalLine(source, line) });
    }
  }
  return hits;
}

/**
 * Optional bare-`number` interface fields. `p?: number` is a hole through
 * which a fabricated default can enter Evidence<T>; `p: number | null` is
 * fine (required, explicitly nullable). Only interface bodies are inspected.
 */
const INTERFACE_START_RE = /\binterface\s+[A-Za-z_$][\w$]*[^{]*\{/g;
const OPTIONAL_NUMBER_FIELD_RE = /([A-Za-z_$][\w$]*)\?\s*:\s*number(?![\w$])(?!\s*[|&[])/g;

function findOptionalBareNumberFields(source: string): SourceHit[] {
  const { code } = maskSource(source);
  const hits: SourceHit[] = [];
  INTERFACE_START_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INTERFACE_START_RE.exec(code)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let end = bodyStart;
    while (end < code.length && depth > 0) {
      const c = code.charAt(end);
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      end += 1;
    }
    const body = code.slice(bodyStart, end - 1);
    OPTIONAL_NUMBER_FIELD_RE.lastIndex = 0;
    let f: RegExpExecArray | null;
    while ((f = OPTIONAL_NUMBER_FIELD_RE.exec(body)) !== null) {
      const line = lineOfIndex(code, bodyStart + f.index);
      hits.push({ line, matched: f[0], lineText: originalLine(source, line) });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Disk scan
// ---------------------------------------------------------------------------

const EXCLUDED_DIR_NAMES = new Set(["__tests__", "__fixtures__", "fixtures", "node_modules", "dist"]);

/** Every non-test .ts file under a scan root, recursively, deterministically sorted. */
function collectSourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    // readdirSync throws if a scan root has vanished — a deleted evidence
    // directory must fail loudly, not silently pass the ratchet.
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIR_NAMES.has(entry.name)) walk(full);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out.sort();
}

function displayPath(file: string): string {
  return relative(PACKAGES, file).split(sep).join("/");
}

function formatHits(file: string, hits: readonly SourceHit[]): string[] {
  return hits.map((h) => `${displayPath(file)}:${h.line}: ${h.matched}  |  ${h.lineText}`);
}

function scanAll(detector: (source: string) => SourceHit[]): string[] {
  const violations: string[] = [];
  for (const root of SCAN_ROOTS) {
    for (const file of collectSourceFiles(root)) {
      violations.push(...formatHits(file, detector(readFileSync(file, "utf8"))));
    }
  }
  for (const file of SCAN_FILES) {
    if (!existsSync(file)) continue;
    violations.push(...formatHits(file, detector(readFileSync(file, "utf8"))));
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("anti-fabrication ratchet: evidence path", () => {
  describe("detector self-test (a detector that cannot fail is not a test)", () => {
    it("flags a fabricated non-zero numeric fallback", () => {
      const hits = findNumericFallbacks("const x = row.foo ?? 0.5;");
      assert.equal(hits.length, 1);
      assert.equal(hits[0]?.line, 1);
      assert.equal(hits[0]?.matched, "?? 0.5");
    });

    it("does not flag a zero fallback marked // zero-is-real", () => {
      const hits = findNumericFallbacks("const x = row.foo ?? 0; // zero-is-real");
      assert.deepEqual(hits, []);
    });

    it("flags every other numeric fallback shape, including unmarked zero", () => {
      for (const sample of [
        "const x = row.foo ?? 0;",
        "const x = row.foo || 0;",
        "const x = row.foo || 1;",
        "const x = row.foo ?? 7;",
        "const x = row.foo ?? -1;",
        "const x = row.foo ?? 1e3;",
        "const x = row.foo ??\n  0.5;",
        "const x = `v=${row.foo ?? 0.5}`;",
      ]) {
        assert.ok(findNumericFallbacks(sample).length > 0, `expected a flag for: ${sample}`);
      }
    });

    it("does not flag strict reads, plain numbers, or numbers inside strings", () => {
      for (const sample of [
        'const x = requireNumber(code, row, "games_played");',
        "{ field: 'market.spread', maxAgeMinutes: 30, required: true }",
        'const msg = "never write ?? 0.5 in this path";',
        "// ?? 0.5 is forbidden here",
      ]) {
        assert.deepEqual(findNumericFallbacks(sample), [], `unexpected flag for: ${sample}`);
      }
    });

    it("flags dead trend key literals but not the real suffixed/prefixed keys", () => {
      for (const dead of [
        '"sack_rate_allowed"',
        '"epa_per_play"',
        '"def_pressure_rate"',
        '"def_epa_allowed"',
        "'sack_rate_allowed'",
        "`def_pressure_rate`",
      ]) {
        assert.equal(findDeadTrendKeys(`const k = ${dead};`).length, 1, `expected a flag for ${dead}`);
      }
      for (const real of [
        '"sack_rate_allowed_pct"',
        '"off_epa_per_play"',
        '"def_epa_per_play"',
        '"def_sack_rate_pct"',
      ]) {
        assert.deepEqual(findDeadTrendKeys(`const k = ${real};`), [], `unexpected flag for ${real}`);
      }
      assert.deepEqual(
        findDeadTrendKeys("// the old code asked for sack_rate_allowed and epa_per_play"),
        [],
        "comment mentions are not string literals",
      );
    });

    it("flags a barrel re-export but not the client-safe readiness matrix", () => {
      assert.ok(findBarrelReexports('export * from "./evidence/index.js";').length > 0);
      assert.ok(findBarrelReexports('export * from "./evidence.js";').length > 0);
      assert.deepEqual(findBarrelReexports('export * from "./evidence-readiness-matrix.js";'), []);
    });

    it("flags optional bare-number interface fields only", () => {
      assert.ok(findOptionalBareNumberFields("interface X { readonly p?: number; }").length > 0);
      assert.deepEqual(
        findOptionalBareNumberFields(
          "interface X { readonly p: number; readonly q?: number | null; readonly r?: string; }",
        ),
        [],
      );
    });
  });

  it("no numeric ?? / || fallback in the evidence path", () => {
    const violations = scanAll(findNumericFallbacks);
    assert.deepEqual(
      violations,
      [],
      `Fabricated numeric fallbacks in the evidence path:\n  ${violations.join("\n  ")}\n\n` +
        "Every probability-affecting number must come from a source or be MISSING.\n" +
        'A fallback to 0 is legal ONLY with an explicit "// zero-is-real" comment on the same line.',
    );
  });

  it("no dead trend key string literals in the evidence path", () => {
    const violations = scanAll(findDeadTrendKeys);
    assert.deepEqual(
      violations,
      [],
      `Dead trend keys referenced as string literals:\n  ${violations.join("\n  ")}\n\n` +
        "The real keys are sack_rate_allowed_pct, off_epa_per_play, def_epa_per_play, def_sack_rate_pct.",
    );
  });

  it("the evidence barrel is not re-exported from the package root", () => {
    const hits = findBarrelReexports(readFileSync(PACKAGE_ROOT_INDEX, "utf8"));
    assert.deepEqual(
      formatHits(PACKAGE_ROOT_INDEX, hits),
      [],
      "src/index.ts re-exports the evidence barrel, which imports node:crypto and breaks the Next client build.\n" +
        "Consumers must import the submodule path (@sports/prediction-engine/src/evidence/index.js) instead.",
    );
  });

  it("the Evidence contract has no optional bare-number interface field", () => {
    const hits = findOptionalBareNumberFields(readFileSync(EVIDENCE_TYPES, "utf8"));
    assert.deepEqual(
      formatHits(EVIDENCE_TYPES, hits),
      [],
      "Optional bare-number fields let fabricated defaults enter Evidence<T>.\n" +
        "Make the field required, or required-and-nullable (number | null) if absence is a real state.",
    );
  });
});
