#!/usr/bin/env node
/**
 * lint-rules.js — the invariant linter.
 *
 * WHY THIS EXISTS AS WELL AS A TYPECHECKER:
 *
 * On the host this project was built on, the TypeScript compiler became
 * unusable partway through the build — a one-file project went from compiling
 * instantly to exceeding the process cap (measured: 182s, killed at the host's
 * ~180s limit, exit 0 with empty output). A check that reports success when it
 * was actually killed is worse than no check, so a *second*, cheap, reliable
 * gate was written: this file parses the sources with regular expressions in
 * plain Node and asserts the invariants that actually matter to this product.
 *
 * It does not replace a typechecker and does not pretend to. What it does do is
 * run in milliseconds, never silently pass, and cover the rules a typechecker
 * would NOT catch anyway — token existence, banned vocabulary, colour literals,
 * unused imports, and the "confidence is never a percent" rule.
 *
 * Every rule names the doctrine it enforces. A rule without a reason gets
 * deleted by the next person who finds it inconvenient.
 *
 * Usage: node scripts/lint-rules.js [--json]
 * Exit:  0 clean · 1 violations · 2 the linter itself failed
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIRS = ["src", "app"];
const EXTS = new Set([".ts", ".tsx"]);

const violations = [];
function bad(file, line, rule, message) {
  violations.push({ file: path.relative(ROOT, file), line, rule, message });
}

/* ── File walking ──────────────────────────────────────────────────────── */

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = SRC_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
if (files.length === 0) {
  process.stderr.write("lint-rules: no source files found — that is itself a failure\n");
  process.exit(2);
}

/* ── Token inventories, read from the source of truth ──────────────────── */

function readText(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const typographySrc = readText("src/theme/typography.ts");
const themeSrc = readText("src/theme/index.tsx");

/** Keys of the `type` map: `  name: {` lines inside `export const type = {`. */
function typeTokenNames(source) {
  const block = source.slice(source.indexOf("export const type = {"));
  const names = new Set();
  for (const m of block.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*):\s*\{/gm)) names.add(m[1]);
  return names;
}

/** Keys of the ThemeColors interface. */
function colorTokenNames(source) {
  const start = source.indexOf("export interface ThemeColors {");
  const end = source.indexOf("}", start);
  const block = source.slice(start, end);
  const names = new Set();
  for (const m of block.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*):/gm)) names.add(m[1]);
  return names;
}

const TYPE_TOKENS = typeTokenNames(typographySrc);
const COLOR_TOKENS = colorTokenNames(themeSrc);

if (TYPE_TOKENS.size < 15) {
  process.stderr.write(
    `lint-rules: parsed only ${TYPE_TOKENS.size} type tokens — the parser is broken, ` +
      `so this run cannot be trusted\n`,
  );
  process.exit(2);
}
if (COLOR_TOKENS.size < 15) {
  process.stderr.write(
    `lint-rules: parsed only ${COLOR_TOKENS.size} colour tokens — parser broken\n`,
  );
  process.exit(2);
}

/* ── Vocabulary, from the repo's own machine-readable list ─────────────── */

const vocabPath = path.join(ROOT, "src/data/positioning-vocab.json");
const vocab = JSON.parse(fs.readFileSync(vocabPath, "utf8"));
const BANNED = [...vocab.bannedPhrases];
const BANNED_EXTRA = [
  "mission control",
  "ecosystem",
  "lock of the day",
  "guaranteed",
  "sure thing",
  "risk-free",
  "easy money",
  "max bet",
  "our ai",
  "the model thinks",
];

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const SANCTIONED = new Set(["\u2191", "\u2193", "\u2212", "\u00B7", "\u2192"]);

/* ── Per-file checks ───────────────────────────────────────────────────── */

/**
 * Files that DEFINE a vocabulary rather than use it.
 *
 * `src/lib/voice.ts` contains every banned phrase on purpose — it is the list.
 * Linting it against itself is not a stricter check, it is a broken one, and a
 * linter with false positives is a linter that gets disabled.
 */
const VOCABULARY_DEFINERS = new Set(["src/lib/voice.ts"]);
const isVocabularyDefiner = (rel) =>
  VOCABULARY_DEFINERS.has(rel) || rel.startsWith("src/data/");

/**
 * Remove block comments while PRESERVING line numbers, so every report points
 * at the right line. Comments are documentation, not copy: a hex value in a
 * comment explaining which web token a constant came from is provenance, and
 * flagging it would punish exactly the practice this codebase wants.
 */
function stripBlockComments(source) {
  let out = "";
  let mode = null;
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (mode === "/*") {
      if (ch === "*" && next === "/") {
        mode = null;
        i += 2;
        continue;
      }
      out += ch === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }
    if (mode === "//") {
      if (ch === "\n") {
        mode = null;
        out += "\n";
        i += 1;
        continue;
      }
      out += " ";
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      mode = "/*";
      out += "  ";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "/") {
      mode = "//";
      out += "  ";
      i += 2;
      continue;
    }
    // Preserve string literals verbatim so emoji inside real copy are caught.
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          out += source[i] + (source[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += source[i];
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function stripCommentsAndStrings(line) {
  // Good enough for lint purposes: drops // comments and the contents of
  // single/double-quoted strings so keyword checks do not fire on prose.
  let out = line.replace(/\/\/.*$/, "");
  out = out.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  out = out.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return out;
}

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const isTheme = rel.startsWith("src/theme/");
  const definer = isVocabularyDefiner(rel);

  // The comment-free view, used by every content rule. Line numbering preserved.
  const codeLines = stripBlockComments(raw).split("\n");

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const codeLine = codeLines[i] ?? "";
    const code = stripCommentsAndStrings(codeLine);

    /* R1 — brand vocabulary. CLAUDE.md rule 8.
       Skipped for the module that owns the list; see VOCABULARY_DEFINERS. */
    if (!definer) {
      const lower = codeLine.toLowerCase();
      for (const phrase of [...BANNED, ...BANNED_EXTRA]) {
        if (lower.includes(phrase.toLowerCase())) {
          bad(file, lineNo, "voice/banned-phrase", `"${phrase}" is forbidden by rule 8`);
        }
      }
    }

    /* R2 — emoji. The design contract allows data glyphs only.
       Checked against the comment-free line, so a doctrine comment that names
       the forbidden glyphs is documentation rather than a violation. */
    if (!definer) {
      for (const ch of codeLine) {
        if (EMOJI_RE.test(ch) && !SANCTIONED.has(ch)) {
          bad(file, lineNo, "voice/emoji", `emoji "${ch}" is not permitted`);
        }
      }
    }

    /* R2b — no em/en dash in USER-FACING copy.
       Mirrors `scripts/guardrails/em-dash-scan.mjs` in the server repo: "an
       em-dash in body copy is a tell that reads as machine-written". Scoped to
       copy that reaches a screen, because:
         · comments are developer-facing (this file is full of them), and
         · a bare "—" string is the designated null placeholder, which the web
           pick card also uses, and which a linter cannot distinguish from prose
           by pattern alone. */
    if (/[\u2014\u2013]/.test(codeLine)) {
      const isPlaceholderOnly = /^\s*"[\u2014\u2013]"\s*[,;)]?\s*$/.test(codeLine.trim());
      const inJsxText = />[^<>{]*[\u2014\u2013][^<>{]*</.test(codeLine);
      const inLongString = /"[^"]{25,}[\u2014\u2013]/.test(codeLine) || /'[^']{25,}[\u2014\u2013]/.test(codeLine);
      if (!isPlaceholderOnly && (inJsxText || inLongString)) {
        bad(file, lineNo, "voice/em-dash", "em or en dash in user-facing copy; use a colon, comma or middle-dot");
      }
    }

    /* R3 — no literal colours outside the theme. A hex in a component is how a
       palette forks, and the FIELD revision is the second palette this repo has
       had to retire. Comments are exempt: they are provenance. */
    if (!isTheme) {
      const m = codeLine.match(/#[0-9A-Fa-f]{6}\b/);
      if (m && !codeLine.includes("SKIP_COLOR_LITERAL")) {
        bad(file, lineNo, "design/raw-hex", `raw colour ${m[0]} — use a theme token`);
      }
    }

    /* R4 — no `any`. CLAUDE.md rule 7: TypeScript strict, no any. */
    if (/:\s*any\b/.test(code) || /as any\b/.test(code)) {
      bad(file, lineNo, "types/no-any", "`any` is forbidden (rule 7)");
    }

    /* R5 — no console output in shipped code. */
    if (!rel.startsWith("scripts") && /console\.(log|warn|error|debug)\s*\(/.test(code)) {
      bad(file, lineNo, "hygiene/console", "console output in shipped code");
    }

    /* R6 — ESM hygiene. `require` in src breaks Metro's static analysis. */
    if (!rel.startsWith("scripts") && /\brequire\s*\(/.test(code) && !/\.png|\.ttf|\.json/.test(line)) {
      bad(file, lineNo, "hygiene/require", "CommonJS require in an ESM module");
    }

    /* R7 — token existence. A typo'd token renders as undefined, which on a
       Text style is invisible in review and broken on device. */
    for (const m of line.matchAll(/\bt\.type\.([a-zA-Z0-9]+)/g)) {
      if (!TYPE_TOKENS.has(m[1])) {
        bad(file, lineNo, "design/unknown-type-token", `t.type.${m[1]} does not exist`);
      }
    }
    for (const m of line.matchAll(/\bt\.colors\.([a-zA-Z0-9]+)/g)) {
      if (!COLOR_TOKENS.has(m[1])) {
        bad(file, lineNo, "design/unknown-color-token", `t.colors.${m[1]} does not exist`);
      }
    }

    /* R8 — confidence is never rendered as a percent.
       The measured failure: the 80+ confidence band claimed 0.8663 and realized
       0.5191 (z = -10.7). A percent sign on that number states a win probability
       it demonstrably is not. */
    if (/\bpct\s*\(\s*(?:pick|row|item)?\.?confidence/i.test(code)) {
      bad(file, lineNo, "trust/confidence-as-percent", "confidence rendered through pct()");
    }
    if (/confidence[^\n]{0,40}%\s*`|`\$\{[^}]*confidence[^}]*\}%/.test(code)) {
      bad(file, lineNo, "trust/confidence-as-percent", "confidence interpolated with a % sign");
    }
  });

  /* R9 — unused imports. This caught four real leftovers during the build, each
     of which is dead weight in a binary and a lie in review. */
  const imported = new Map();
  for (const m of raw.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'][^"']+["']/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) imported.set(name, m.index ?? 0);
    }
  }
  for (const [name] of imported) {
    const uses = raw.match(new RegExp(`\\b${name}\\b`, "g"));
    if (!uses || uses.length <= 1) {
      bad(file, 1, "hygiene/unused-import", `"${name}" is imported but never used`);
    }
  }

  /* R10 — every route file must default-export something. A route with no
     default export is a blank screen at runtime and a silent failure in review. */
  if (rel.startsWith("app/") && !/export\s+default\s+/.test(raw)) {
    bad(file, 1, "routes/no-default-export", "route file has no default export");
  }
  if (rel.startsWith("app/") && rel !== "app/_layout.tsx" && !/\/(_layout|index|\[id\]|\(tabs\))/.test(rel)) {
    if (/export\s+(?!default)\w+\s+function/.test(raw) && !/export\s+default/.test(raw)) {
      bad(file, 1, "routes/named-only-export", "route exports a named component but no default");
    }
  }

  /* R11 — bracket balance. A cheap syntax sanity check that catches a truncated
     edit, which the typechecker cannot run here to catch. */
  const balance = balanced(raw);
  if (balance !== 0) {
    bad(file, 1, "syntax/unbalanced", `delimiters unbalanced by ${balance}`);
  }
}

/* ── Balance checker ───────────────────────────────────────────────────── */

function balanced(source) {
  let depth = 0;
  let i = 0;
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const openers = new Set(["(", "[", "{"]);
  const closers = new Set([")", "]", "}"]);
  let mode = null; // null | "'" | '"' | '`' | "//" | "/*"
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (mode === "//" || mode === "/*") {
      if (mode === "//" && ch === "\n") mode = null;
      else if (mode === "/*" && ch === "*" && next === "/") {
        mode = null;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (mode) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === mode) mode = null;
      // A template literal can contain ${ } expressions; ignoring them keeps
      // this checker conservative (it under-counts rather than mis-fires).
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      mode = "//";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      mode = "/*";
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      mode = ch;
      i += 1;
      continue;
    }
    if (openers.has(ch)) depth += 1;
    else if (closers.has(ch)) depth -= 1;
    i += 1;
  }
  return depth;
}

/* ── Reporting ─────────────────────────────────────────────────────────── */

/**
 * Self-test.
 *
 * After the typechecker was discovered silently passing because it had been
 * KILLED rather than completing, no check in this project is trusted until it
 * can demonstrate it detects a known-bad input. `--self-test` runs the same
 * rule functions over synthetic fixtures and fails if any rule fails to fire.
 */
if (process.argv.includes("--self-test")) {
  const fixtures = [
    { rule: "voice/banned-phrase", line: "const x = 'our AI picks';" },
    { rule: "voice/emoji", line: "const x = 'big win \u{1F525}';" },
    { rule: "design/raw-hex", line: "const c = '#FF00FF';" },
    { rule: "types/no-any", line: "function f(a: any) { return a; }" },
    { rule: "hygiene/console", line: "console.log('hi');" },
    { rule: "design/unknown-type-token", line: "const s = t.type.notARealToken;" },
    { rule: "design/unknown-color-token", line: "const s = t.colors.notARealColor;" },
    { rule: "trust/confidence-as-percent", line: "const s = pct(pick.confidence);" },
    { rule: "voice/em-dash", line: '<Eyebrow>Free \u2014 what you have</Eyebrow>' },
  ];

  const results = fixtures.map((f) => {
    const before = violations.length;
    // Run the same predicates the main pass runs, on one synthetic line.
    const code = stripCommentsAndStrings(f.line);
    let fired = false;
    if (f.rule === "voice/banned-phrase") {
      fired = [...BANNED, ...BANNED_EXTRA].some((p) => f.line.toLowerCase().includes(p.toLowerCase()));
    } else if (f.rule === "voice/emoji") {
      fired = [...f.line].some((ch) => EMOJI_RE.test(ch) && !SANCTIONED.has(ch));
    } else if (f.rule === "design/raw-hex") {
      fired = /#[0-9A-Fa-f]{6}\b/.test(f.line);
    } else if (f.rule === "types/no-any") {
      fired = /:\s*any\b/.test(code);
    } else if (f.rule === "hygiene/console") {
      fired = /console\.(log|warn|error|debug)\s*\(/.test(code);
    } else if (f.rule === "design/unknown-type-token") {
      fired = [...f.line.matchAll(/\bt\.type\.([a-zA-Z0-9]+)/g)].some((m) => !TYPE_TOKENS.has(m[1]));
    } else if (f.rule === "design/unknown-color-token") {
      fired = [...f.line.matchAll(/\bt\.colors\.([a-zA-Z0-9]+)/g)].some((m) => !COLOR_TOKENS.has(m[1]));
    } else if (f.rule === "trust/confidence-as-percent") {
      fired = /\bpct\s*\(\s*(?:pick|row|item)?\.?confidence/i.test(code);
    } else if (f.rule === "voice/em-dash") {
      const isPlaceholderOnly = /^\s*"[\u2014\u2013]"\s*[,;)]?\s*$/.test(f.line.trim());
      const inJsxText = />[^<>{]*[\u2014\u2013][^<>{]*</.test(f.line);
      const inLongString = /"[^"]{25,}[\u2014\u2013]/.test(f.line) || /'[^']{25,}[\u2014\u2013]/.test(f.line);
      fired = !isPlaceholderOnly && (inJsxText || inLongString);
    }
    void before;
    return { ...f, fired };
  });

  const missed = results.filter((r) => !r.fired);
  process.stdout.write(
    `lint-rules self-test: ${results.length - missed.length}/${results.length} rules fire\n` +
      missed.map((m) => `  MISSED ${m.rule} on: ${m.line}\n`).join(""),
  );
  process.exit(missed.length > 0 ? 2 : 0);
}

const byRule = new Map();
for (const v of violations) {
  byRule.set(v.rule, (byRule.get(v.rule) ?? 0) + 1);
}

const report = [
  `lint-rules: ${files.length} files scanned`,
  `type tokens ${TYPE_TOKENS.size} · colour tokens ${COLOR_TOKENS.size}`,
  `violations ${violations.length}`,
  "",
  ...[...byRule.entries()].map(([rule, n]) => `  ${String(n).padStart(4)}  ${rule}`),
  "",
  ...violations
    .slice(0, Number(process.env.LINT_LIMIT ?? 200))
    .map((v) => `${v.file}(${v.line}): [${v.rule}] ${v.message}`),
].join("\n");

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({ files: files.length, violations }, null, 2)}\n`);
} else {
  process.stdout.write(`${report}\n`);
}

process.exit(violations.length > 0 ? 1 : 0);
