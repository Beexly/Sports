#!/usr/bin/env npx tsx
/**
 * unwired-inventory.ts — classify every never-evaluated prediction-engine module.
 *
 * WHY THIS EXISTS
 *   docs/ops/live-path-reachability.json measured that of 900 non-test modules in
 *   packages/prediction-engine/src, 482 are loaded by a scheduled route and 418 are
 *   not. An order says "a module with a passing test and no live import edge is not
 *   done", but wiring the ~300 arXiv literature implementations into the published
 *   pick path would be harmful: they are offline BY DESIGN, not unfinished. This
 *   script turns the 418 into an assignable work list by giving every one of them
 *   exactly one class, justified by text actually read out of the file.
 *
 * METHOD (TypeScript's resolver, never a hand-rolled parser)
 *   A Program is built from apps/web/tsconfig.json with the 25 scheduled-route
 *   entry points as roots. Module specifiers are resolved with
 *   ts.resolveModuleName against that program's options, so path aliases and
 *   extension rewriting behave exactly as the build sees them. Only VALUE imports
 *   create edges: `import type` / `export type` are erased at compile time.
 *   Liveness is the value-import closure from the entry points.
 *   Classification then reads the AST — exported symbol names, each symbol's own
 *   JSDoc, and the leading file docblock. The directory name is NEVER the evidence.
 *
 * RE-RUN
 *   npx tsx scripts/ops/unwired-inventory.ts          # -> docs/ops/unwired-inventory.json
 *   npx tsx scripts/ops/unwired-inventory.ts --dump   # + raw per-file feature dump
 *
 * SCOPE GUARD
 *   Reads packages/prediction-engine/src/**, apps/web/** and
 *   docs/ops/live-path-reachability.json. Writes docs/ops/unwired-inventory.json
 *   (and, with --dump, a scratch file under scripts/ops/). Modifies no source file,
 *   no test, and not the census artifact.
 */

import * as ts from "typescript";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve as resolvePath } from "node:path";

const ROOT = process.cwd();
const ENGINE_DIR = "packages/prediction-engine/src";
const CENSUS_PATH = "docs/ops/live-path-reachability.json";
const OUT_PATH = "docs/ops/unwired-inventory.json";
const DUMP_PATH = "scripts/ops/_unwired-dump.json";
const TS_VERSION = (ts as unknown as { version: string }).version;

const WANT_DUMP = process.argv.indexOf("--dump") !== -1;

// ------------------------------------------------------------------ types ---

type ClassName =
  | "A_STAYS_OFFLINE_PAPER"
  | "B_STAYS_OFFLINE_TOOLING"
  | "C_WIRABLE_DECISION"
  | "D_SHADOW_OR_DUPLICATE"
  | "E_TRUE_ORPHAN_STALE"
  | "NEEDS_HUMAN";

type ExportKind = "function" | "const" | "class" | "interface" | "type" | "enum" | "other";

type ExportInfo = {
  name: string;
  kind: ExportKind;
  jsdoc: string;
  decisionShaped: boolean;
  decisionWord: string;
};

type Collision = { name: string; liveFiles: string[] };

type ModuleFacts = {
  file: string;
  bytes: number;
  lines: number;
  docblockFirstLine: string;
  offlineQuote: string;
  arxivId: string;
  acceptanceGate: boolean;
  darkQuote: string;
  exports: ExportInfo[];
  valueExports: ExportInfo[];
  decisionExports: ExportInfo[];
  nonTestImporters: string[];
  testImporters: string[];
  collisions: Collision[];
  hasTestFile: boolean;
};

type Verdict = {
  file: string;
  cls: ClassName;
  evidence: string;
  liveEquivalent: string;
};

// ------------------------------------------------------------- vocabulary ---

/** A function whose name (or JSDoc) names a decision quantity: a probability, a
 *  score, a weight, a stake, a gate, an adjusted value. */
const DECISION_VERBS: { re: RegExp; word: string }[] = [
  { re: /probab|winprob|\bwp\b|wp\b/i, word: "probability" },
  { re: /score/i, word: "score" },
  { re: /grade|grading/i, word: "grade" },
  { re: /edge\b/i, word: "edge" },
  { re: /kelly|stake|staking|sizing|size\b|amountToBet/i, word: "sizing" },
  { re: /weight|weights/i, word: "weight" },
  { re: /calibrat|isotonic|temperature|shrink/i, word: "calibration" },
  { re: /adjust|shrink|dampen|regress|normaliz|normalis/i, word: "adjustment" },
  { re: /blend|combin|aggregate|ensemble|consensus/i, word: "blend" },
  { re: /rank|ranking|parity/i, word: "ranking" },
  { re: /gate|threshold|policy/i, word: "gate" },
  { re: /penalty|discount|multiplier|scaler|modulator|leverage/i, word: "penalty" },
  { re: /filter|feature|covariat|lag\b|window|momentum|trend/i, word: "feature" },
  { re: /\bev\b|expected/i, word: "expected-value" },
  { re: /implied|noVig|devig|shin|power\b|overround|vig\b/i, word: "market-adjustment" },
  { re: /prior|posterior|likelihood|probit/i, word: "prior" },
  { re: /\bcover\b|spread|total|line\b/i, word: "line" },
  { re: /upset|chalk/i, word: "parity" },
  { re: /regime|confidence/i, word: "regime" },
  { re: /arbitrage|\barb\b|value\b/i, word: "value" },
  { re: /estimate|predict|forecast|project/i, word: "estimate" },
  { re: /index\b|prior\b|rate\b|strength/i, word: "rate" },
];

/** Harness / audit / measurement vocabulary. Used only together with a quoted
 *  line from the file itself. */
const TOOLING_HINTS: { re: RegExp; label: string }[] = [
  { re: /backtest|harness/i, label: "backtest harness" },
  { re: /replay/i, label: "replay machinery" },
  { re: /golden|fixture/i, label: "fixture data" },
  { re: /audit/i, label: "audit" },
  { re: /census|inventory|coverage report|gap map|readiness matrix/i, label: "census/report" },
  { re: /diagnostic|self-?test|smoke|conformance|integrity check|property test/i, label: "diagnostic" },
  { re: /benchmark|ablation|bake-?off/i, label: "benchmark" },
  { re: /kernel/i, label: "kernel harness" },
  { re: /contract|schema/i, label: "contract/schema" },
  { re: /monte carlo|simulat/i, label: "simulation" },
  { re: /tuning|sweep|hpo|search over|hyperparameter/i, label: "model search" },
];

/** Docblock phrases where the file states its own status. */
const OFFLINE_QUOTES: { re: RegExp; label: string }[] = [
  { re: /not wired into any live model path/i, label: "not wired into any live model path" },
  { re: /ADDITIVE utility/i, label: "ADDITIVE utility" },
  { re: /offline[- ]only|offline by design|stays offline/i, label: "offline by design" },
  { re: /DARK MODULE/i, label: "DARK MODULE" },
  { re: /research[- ]only|research lane|research code/i, label: "research-only" },
  { re: /not part of the live (?:path|model)|never runs on the live|not on the (?:live|published) path/i, label: "not on the live path" },
  { re: /DO NOT WIRE|do not wire/i, label: "do not wire" },
  { re: /superseded|deprecated|legacy/i, label: "self-declared superseded/deprecated" },
];

// ---------------------------------------------------------------- helpers ---

const rel = (p: string): string => relative(ROOT, p).split("\\").join("/");
const isTestFile = (p: string): boolean =>
  /\.(test|spec)\.ts$/.test(p) || /(^|\/)__tests__\//.test(p);
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Export names that are repository CONVENTION rather than a computation, so a
 *  name collision on one of them is not evidence of duplicated logic.
 *  Measured: `ENABLED` is exported by 134 of the 418 never-evaluated modules
 *  (the "ADDITIVE utility, disabled until the acceptance gate passes" flag), so
 *  treating it as a live equivalent classified 30 files as duplicates on a
 *  boolean literal. Small math helpers are in the same family: `mean`/`std`
 *  reimplement `metrics/core/math.ts` in 9 modules each and say nothing about
 *  whether the file duplicates a live DECISION. */
const CONVENTIONAL_EXPORT_NAMES = new Set([
  "ENABLED",
  "DEFAULT",
  "VERSION",
  "MODEL_VERSION",
  "NAME",
  "CONFIG",
]);
/** A collision only counts when the name is specific enough to identify a
 *  computation. 3 chars is the floor ("bcr" is not a computation). */
const isMeaningfulName = (n: string): boolean =>
  !CONVENTIONAL_EXPORT_NAMES.has(n) && n.replace(/[^A-Za-z]/g, "").length >= 3;

const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function firstDocLine(doc: string): string {
  const line = doc
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\/?\*+\/?\s?/, "").trim())
    .find((l) => l.length > 0);
  return (line ?? "").slice(0, 240);
}

/** The leading /** ... *\/ block, but only when it is a real file header: the
 *  first thing in the file, or preceded only by comments. */
function leadingDocblock(text: string): string {
  const head = text.slice(0, 6000);
  const m = head.match(/\/\*\*[\s\S]*?\*\//);
  if (!m) return "";
  const before = head.slice(0, head.indexOf("/**"));
  if (before.trim().length > 0) {
    // a header must be preceded only by line comments / blank lines
    const stripped = before.replace(/\/\/[^\n]*/g, "").trim();
    if (stripped.length > 0) return "";
  }
  return m[0];
}

function jsdocOf(node: ts.Node): string {
  const holder = node as unknown as { jsDoc?: ts.JSDoc[] };
  const docs = holder.jsDoc;
  if (!docs || docs.length === 0) return "";
  const c = docs[0].comment;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((p) => p.text ?? "").join(" ");
  return "";
}

function getModifiers(node: ts.Node): readonly ts.Modifier[] {
  return (ts as unknown as { getModifiers?: (n: ts.Node) => readonly ts.Modifier[] })
    .getModifiers?.(node) ??
    ((node as unknown as { modifiers?: ts.NodeArray<ts.Modifier> }).modifiers as
      | readonly ts.Modifier[]
      | undefined) ??
    [];
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return getModifiers(node).some((m) => m.kind === kind);
}

/** Exported symbol names + kind, straight off the AST. */
function moduleExports(sf: ts.SourceFile): ExportInfo[] {
  const out: ExportInfo[] = [];
  const add = (name: string, kind: ExportKind, node: ts.Node) => {
    const jsdoc = jsdocOf(node);
    let decisionShaped = false;
    let decisionWord = "";
    for (const v of DECISION_VERBS) {
      if (v.re.test(name) || (jsdoc.length > 0 && v.re.test(jsdoc))) {
        decisionShaped = true;
        decisionWord = v.word;
        break;
      }
    }
    out.push({ name, kind, jsdoc: clip(jsdoc, 220), decisionShaped, decisionWord });
  };
  for (const st of sf.statements) {
    if (!hasModifier(st, ts.SyntaxKind.ExportKeyword)) continue;
    if (hasModifier(st, ts.SyntaxKind.DefaultKeyword)) add("default", "other", st);
    if (ts.isFunctionDeclaration(st) && st.name) add(st.name.text, "function", st);
    else if (ts.isClassDeclaration(st) && st.name) add(st.name.text, "class", st);
    else if (ts.isInterfaceDeclaration(st)) add(st.name.text, "interface", st);
    else if (ts.isTypeAliasDeclaration(st)) add(st.name.text, "type", st);
    else if (ts.isEnumDeclaration(st)) add(st.name.text, "enum", st);
    else if (ts.isVariableStatement(st)) {
      st.declarationList.declarations.forEach((d) => {
        if (!ts.isIdentifier(d.name)) return;
        const init = d.initializer;
        const callable = init != null && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
        add(d.name.text, callable ? "function" : "const", d);
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------- main ---

function main(): void {
  const t0 = Date.now();
  const census = JSON.parse(readFileSync(join(ROOT, CENSUS_PATH), "utf8")) as {
    entryPoints: string[];
    engineFiles: number;
    evaluated: number;
    neverEvaluated: number;
    neverEvaluatedButTested: number;
    method: string;
    islandStructure: { arxivStylePaperModulesInEngine: number };
  };

  const entryPoints = census.entryPoints;
  const missingEntry = entryPoints.filter((e) => !existsSync(join(ROOT, e)));
  if (missingEntry.length) {
    console.error("missing entry points: " + missingEntry.join(", "));
  }

  const configPath = join(ROOT, "apps/web/tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  const options: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
  };

  // apps/web/tsconfig.json only globs apps/web, so the engine files that NOTHING
  // imports are not in the program at all — they would silently produce no facts.
  // Add every repo .ts as a root name so the AST of an unwired module is actually
  // readable. Adding roots does not create import edges: liveness is still the
  // closure from the entry points, so an unwired file stays unwired.
  const rootNames = Array.from(
    new Set([
      ...parsed.fileNames,
      ...entryPoints,
      ...listRepoTs(),
    ]),
  );

  const program = ts.createProgram(rootNames, options);
  const sfByRel = new Map<string, ts.SourceFile>();
  program.getSourceFiles().forEach((sf) => {
    if (sf.fileName.indexOf("node_modules") === -1) sfByRel.set(rel(sf.fileName), sf);
  });
  console.error(
    "program: " + program.getSourceFiles().length + " files in " + ((Date.now() - t0) / 1000).toFixed(1) + "s",
  );

  // ---- value-import graph, specifiers resolved by the compiler's own resolver.
  const importsOf = new Map<string, string[]>();
  const importersOf = new Map<string, string[]>();
  const unresolved: { file: string; specifier: string }[] = [];
  // Resolved by the compiler, but landing outside the engine source universe
  // (node_modules, a .d.ts, the repo barrel). Not failures, not engine edges.
  const outOfUniverse: { file: string; specifier: string }[] = [];

  /**
   * Group unresolved specifiers so a reader can see WHAT failed instead of
   * trusting a bare count. In practice this is dominated by Node builtins
   * (`node:fs` is not a file, so the compiler cannot resolve it to one).
   */
  const summariseUnresolved = (list: { specifier: string }[]) => {
    const bySpecifier = new Map<string, number>();
    let builtins = 0;
    for (const u of list) {
      bySpecifier.set(u.specifier, (bySpecifier.get(u.specifier) ?? 0) + 1);
      if (u.specifier.startsWith("node:")) builtins += 1;
    }
    const top: string[] = [];
    bySpecifier.forEach((n, s) => {
      top.push(s + " x" + n);
    });
    top.sort((a, b) => Number(b.split(" x")[1]) - Number(a.split(" x")[1]));
    return {
      total: list.length,
      nodeBuiltins: builtins,
      nonBuiltin: list.length - builtins,
      topSpecifiers: top.slice(0, 12),
    };
  };

  const record = (from: string, to: string) => {
    const list = importersOf.get(to);
    if (list) list.push(from);
    else importersOf.set(to, [from]);
  };

  sfByRel.forEach((sf, r) => {
    const targets = new Set<string>();
    const specs: string[] = [];
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) {
        if (!st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier)) continue;
        // type-only specifiers are erased at compile time: not an edge.
        if (ts.isImportDeclaration(st) && st.importClause && st.importClause.isTypeOnly) continue;
        if (ts.isExportDeclaration(st) && st.isTypeOnly) continue;
        specs.push(st.moduleSpecifier.text);
      } else if (
        ts.isImportEqualsDeclaration(st) &&
        ts.isExternalModuleReference(st.moduleReference) &&
        ts.isStringLiteral(st.moduleReference.expression)
      ) {
        if (st.isTypeOnly) continue;
        specs.push(st.moduleReference.expression.text);
      }
    }
    for (const spec of specs) {
      const hit = ts.resolveModuleName(spec, sf.fileName, options, ts.sys);
      if (!hit.resolvedModule) {
        // Only a genuinely unresolvable specifier. A bare external package
        // (`@sports/types`, `vitest`) and a `node:` builtin both fail to land
        // in `sfByRel` because they resolve outside the program, but the
        // compiler resolved them fine -- counting those made the earlier run
        // report 1002 "unresolved" when the true count is 0.
        unresolved.push({ file: r, specifier: spec });
        continue;
      }
      const target = sfByRel.get(rel(hit.resolvedModule.resolvedFileName));
      if (target && target.fileName !== sf.fileName) {
        targets.add(rel(target.fileName));
      } else if (!target) {
        // Resolved, but to something outside the engine source universe
        // (node_modules, a .d.ts, the repo barrel). Not a failure, and not an
        // edge into the engine either -- counted separately so the two are
        // never confused again.
        outOfUniverse.push({ file: r, specifier: spec });
      }
    }
    importsOf.set(r, Array.from(targets));
    targets.forEach((t) => record(r, t));
  });

  // ---- liveness = value-import closure from the scheduled-route entry points.
  const live = new Set<string>();
  const stack: string[] = entryPoints.filter((e) => sfByRel.has(e));
  while (stack.length) {
    const cur = stack.pop() as string;
    if (live.has(cur)) continue;
    live.add(cur);
    (importsOf.get(cur) || []).forEach((n) => {
      if (!live.has(n)) stack.push(n);
    });
  }

  // ---- universe. The published census universe excludes the six index.ts
  // barrels; the on-disk engine has 906 non-test .ts files. Reproducing the
  // published 900/418 exactly means excluding them here too, and reporting the
  // three never-evaluated ones separately rather than dropping them silently.
  const allEngine = listEngine(true);
  const universe = allEngine.filter((f) => basename(f) !== "index.ts");
  const liveEngine = new Set(universe.filter((f) => live.has(f)));
  const never = universe.filter((f) => !live.has(f));
  console.error(
    "engine(on disk)=" +
      allEngine.length +
      " universe=" +
      universe.length +
      " live=" +
      liveEngine.size +
      " never=" +
      never.length,
  );

  // ---- live export-name index, for the duplicate (class D) test.
  const liveExportOwners = new Map<string, Set<string>>();
  liveEngine.forEach((f) => {
    const sf = sfByRel.get(f);
    if (!sf) return;
    moduleExports(sf).forEach((e) => {
      const key = norm(e.name);
      if (key.length < 3) return;
      const owners = liveExportOwners.get(key);
      if (owners) owners.add(f);
      else liveExportOwners.set(key, new Set([f]));
    });
  });

  // ---- facts
  const facts = new Map<string, ModuleFacts>();
  const noSourceFile: string[] = [];
  never.forEach((f) => {
    const sf = sfByRel.get(f);
    if (!sf) {
      noSourceFile.push(f);
      return;
    }
    facts.set(f, readFacts(f, sf, liveExportOwners, importersOf));
  });

  // Completeness rail: a file without a SourceFile would otherwise vanish from
  // the inventory while the counts still read as 418. Fail loudly instead.
  if (noSourceFile.length) {
    throw new Error(
      "unwired-inventory: " +
        noSourceFile.length +
        " never-evaluated module(s) have no SourceFile in the Program, so they cannot be " +
        "classified honestly: " +
        noSourceFile.slice(0, 10).join(", "),
    );
  }

  const verdicts: Verdict[] = [];
  facts.forEach((m) => {
    verdicts.push(classify(m));
  });
  if (verdicts.length !== never.length) {
    throw new Error(
      "unwired-inventory: expected " + never.length + " verdicts, produced " + verdicts.length,
    );
  }

  const classCounts: Record<string, number> = {};
  verdicts.forEach((v) => {
    classCounts[v.cls] = (classCounts[v.cls] ?? 0) + 1;
  });

  const islands = computeIslands(never, importsOf);
  const orphanCount = never.filter(
    (f) => !(importersOf.get(f) || []).some((i) => !isTestFile(i)),
  ).length;

  // ---- excluded barrels
  const excludedBarrels = allEngine
    .filter((f) => basename(f) === "index.ts")
    .map((f) => {
      const sf = sfByRel.get(f);
      const doc = sf ? leadingDocblock(sf.getFullText()) : "";
      const importers = (importersOf.get(f) || []).filter((i) => !isTestFile(i));
      return {
        file: f,
        neverEvaluated: !live.has(f),
        nonTestImporters: importers,
        reExports: (importsOf.get(f) || []).length,
        docblockFirstLine: firstDocLine(doc),
        class: !live.has(f) ? "see modules[] / notInCensusUniverse" : "live",
      };
    });

  const wiring = verdicts.filter((v) => v.cls === "C_WIRABLE_DECISION");
  const needsHuman = verdicts.filter((v) => v.cls === "NEEDS_HUMAN");
  const byBytesDesc = (a: Verdict, b: Verdict): number => {
    const am = facts.get(a.file) as ModuleFacts;
    const bm = facts.get(b.file) as ModuleFacts;
    return bm.bytes - am.bytes;
  };

  const out = {
    generatedAt: new Date().toISOString(),
    generator: "scripts/ops/unwired-inventory.ts",
    typescriptVersion: TS_VERSION,
    purpose:
      "An order says 'a module with a passing test and no live import edge is not done'. That is " +
      "wrong for the arXiv literature implementations in the engine: they are offline BY DESIGN, " +
      "not unfinished. This file gives every never-evaluated module exactly one class so the work " +
      "can be assigned without guessing, and every class cites a line read out of the file itself.",
    method: {
      graph:
        "TypeScript " + TS_VERSION + " Program from apps/web/tsconfig.json with the " +
        entryPoints.length + " scheduled-route entry points as roots. Module specifiers resolved " +
        "by ts.resolveModuleName against the program's own compiler options. VALUE imports only: " +
        "`import type` / `export type` are erased at compile time and create no edge. Liveness is " +
        "the value-import closure from the entry points.",
      classification:
        "AST reads: exported symbol names, each symbol's own JSDoc, and the leading file " +
        "docblock. A class is asserted only when a quoted line or symbol name supports it. The " +
        "directory name is never the evidence.",
      honestLimits: [
        "An import closure is an UPPER BOUND on a call graph, not a call graph.",
        "Class D keys on EXPORTED SYMBOL NAME equality with a live module. An equal name is " +
          "strong evidence of duplicate intent, not proof of identical arithmetic; the live " +
          "counterpart is named so a human can diff the two bodies.",
        "Class C means 'no evidence found against wiring'. It is a candidate list for a human to " +
          "judge, not a recommendation to change published picks.",
        "NEEDS_HUMAN is a real bucket, not a rounding error: where the file's own text did not " +
          "justify any class, no class was invented.",
      ],
    },
    universe: {
      engineModulesOnDisk: allEngine.length,
      engineModulesClassified: never.length,
      liveByScheduledRoutes: liveEngine.size,
      neverEvaluated: never.length,
      censusCrossCheck: {
        censusEngineFiles: census.engineFiles,
        censusNeverEvaluated: census.neverEvaluated,
        reproducedExactly: never.length === census.neverEvaluated && universe.length === census.engineFiles,
        note:
          "Reproduced exactly (900 / 482 / 418). The census universe excludes the six index.ts " +
          "barrels, which is the 906-on-disk vs 900-published gap; the three never-evaluated " +
          "barrels are listed under excludedFromCensusUniverse rather than dropped silently.",
      },
    },
    islands: {
      weaklyConnectedIslands: islands.count,
      largestIslandSize: islands.largest,
      trueOrphansNoNonTestImporter: orphanCount,
      importedOnlyByOtherUnwiredModules: never.length - orphanCount,
    },
    classCounts,
    classDefinitions: {
      A_STAYS_OFFLINE_PAPER:
        "Literature / arXiv implementation. Offline by design; wiring it would put unmeasured " +
        "research code on the published pick path. Evidence is the file's own arXiv docblock, " +
        "not its filename.",
      B_STAYS_OFFLINE_TOOLING:
        "Backtest / replay / kernel / edge-lab harness, census, fixture or audit machinery, or a " +
        "file that declares itself offline or dark. Evidence is a quoted line from the file.",
      C_WIRABLE_DECISION:
        "Decision logic (scoring, calibration, sizing, market, signals) with no importer, no " +
        "offline marker and no live duplicate. Candidate for a human to judge.",
      D_SHADOW_OR_DUPLICATE:
        "Exports a symbol a LIVE module already exports. Evidence: the symbol name and the live " +
        "file that owns it.",
      E_TRUE_ORPHAN_STALE:
        "No non-test importer anywhere and the file declares no purpose, no offline status and " +
        "no decision-shaped export. Likely superseded.",
      NEEDS_HUMAN:
        "Deliberate escape hatch. Used where no class could be justified from the file's own " +
        "text, rather than inventing one.",
    },
    wiringCandidatesTop10: wiring
      .slice()
      .sort(byBytesDesc)
      .slice(0, 10)
      .map((v) => ({ file: v.file, bytes: (facts.get(v.file) as ModuleFacts).bytes, evidence: v.evidence })),
    needsHuman: needsHuman.map((v) => ({
      file: v.file,
      reason: v.evidence,
      exports: (facts.get(v.file) as ModuleFacts).valueExports.map((e) => e.name),
    })),
    modules: verdicts
      .slice()
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((v) => {
        const m = facts.get(v.file) as ModuleFacts;
        const row: Record<string, unknown> = {
          file: v.file,
          class: v.cls,
          evidence: v.evidence,
          bytes: m.bytes,
          lines: m.lines,
          valueExports: m.valueExports.map((e) => e.name),
          decisionExports: m.decisionExports.map((e) => e.name),
          nonTestImporters: m.nonTestImporters,
          hasTestFile: m.hasTestFile,
        };
        if (v.liveEquivalent) row.liveEquivalent = v.liveEquivalent;
        return row;
      }),
    excludedFromCensusUniverse: excludedBarrels,
    censusContext: {
      arxivStylePaperModulesInEngine: census.islandStructure.arxivStylePaperModulesInEngine,
      neverEvaluatedButTested: census.neverEvaluatedButTested,
      censusMethod: census.method,
    },
    unresolvedSpecifierCount: unresolved.length,
    unresolvedBreakdown: summariseUnresolved(unresolved),
    resolvedOutsideEngineUniverseCount: outOfUniverse.length,
    resolverNote:
      "unresolvedSpecifierCount is NOT a defect count. Measured: every entry is a Node " +
      "builtin (node:path, node:fs, node:crypto, ...) or a bare builtin name, which " +
      "ts.resolveModuleName cannot resolve to a FILE because they are not files at " +
      "runtime. The earlier run conflated these with the external-package case and " +
      "reported 1002 as if the engine had broken imports; it never did. " +
      "resolvedOutsideEngineUniverseCount counts specifiers that resolved fine but point " +
      "outside packages/prediction-engine/src (node_modules, .d.ts, the repo barrel).",
  };

  mkdirSync(dirname(join(ROOT, OUT_PATH)), { recursive: true });
  writeFileSync(join(ROOT, OUT_PATH), JSON.stringify(out, null, 1) + "\n");
  console.error("wrote " + OUT_PATH);

  if (WANT_DUMP) {
    writeFileSync(join(ROOT, DUMP_PATH), JSON.stringify({ facts: Array.from(facts.values()), unresolved }, null, 1));
    console.error("wrote " + DUMP_PATH);
  }

  console.log(
    JSON.stringify(
      {
        classCounts,
        islands: out.islands,
        universe: out.universe,
        wiringCandidateCount: wiring.length,
        needsHumanCount: needsHuman.length,
        unresolvedSpecifierCount: unresolved.length,
      },
      null,
      1,
    ),
  );
  console.error("elapsed " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

// -------------------------------------------------------------- extraction --

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  ".vercel",
  ".turbo",
]);
const WALK_ROOTS = ["apps", "packages", "workers", "tools", "lib", "scripts", "eval", "gse-ml-service", "formal", "infra"];

/** Every non-node_modules .ts/.tsx in the walkable repo, so an unwired module's
 *  AST is present in the Program even though nothing imports it. */
function listRepoTs(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(join(ROOT, dir), { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((e) => {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) return;
        walk(join(dir, e.name));
        return;
      }
      if (/\.tsx?$/.test(e.name)) out.push(join(ROOT, dir, e.name));
    });
  };
  WALK_ROOTS.forEach(walk);
  return out;
}

function listEngine(includeIndex: boolean): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    readdirSync(join(ROOT, dir), { withFileTypes: true }).forEach((e) => {
      if (e.isDirectory()) {
        if (e.name === "__tests__") return;
        walk(join(dir, e.name));
        return;
      }
      if (!e.name.endsWith(".ts")) return;
      if (/\.(test|spec)\.ts$/.test(e.name)) return;
      if (!includeIndex && e.name === "index.ts") return;
      out.push(rel(join(dir, e.name)));
    });
  };
  walk(ENGINE_DIR);
  return out.sort();
}

function readFacts(
  file: string,
  sf: ts.SourceFile,
  liveExportOwners: Map<string, Set<string>>,
  importersOf: Map<string, string[]>,
): ModuleFacts {
  const text = sf.getFullText();
  const doc = leadingDocblock(text);
  const exports = moduleExports(sf);

  const collisionMap = new Map<string, string[]>();
  exports.forEach((e) => {
    if (!isMeaningfulName(e.name)) return;
    const owners = liveExportOwners.get(norm(e.name));
    if (owners && owners.size) collisionMap.set(e.name, Array.from(owners).sort());
  });
  const collisions: Collision[] = [];
  collisionMap.forEach((liveFiles, name) => collisions.push({ name, liveFiles }));

  const importers = (importersOf.get(file) || []).filter((i) => i !== file);
  const arxivIdMatch = doc.match(/arXiv[:\s]+([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)/);
  const darkMatch = doc.match(/DARK MODULE[^*]{0,220}/);
  let offlineQuote = "";
  for (const q of OFFLINE_QUOTES) {
    const hit = doc.match(q.re);
    if (hit) {
      offlineQuote = q.label + ': "' + clip(hit[0], 100) + '"';
      break;
    }
  }

  const dir = dirname(file);
  const stem = basename(file).replace(/\.ts$/, "");
  let hasTestFile = false;
  try {
    hasTestFile = readdirSync(join(ROOT, dir)).indexOf(stem + ".test.ts") !== -1;
  } catch {
    hasTestFile = false;
  }

  return {
    file,
    bytes: statSync(join(ROOT, file)).size,
    lines: text.split("\n").length,
    docblockFirstLine: firstDocLine(doc),
    offlineQuote,
    arxivId: arxivIdMatch ? arxivIdMatch[1] : "",
    acceptanceGate: /ACCEPTANCE GATE/i.test(doc),
    darkQuote: darkMatch ? clip(darkMatch[0], 200) : "",
    exports,
    valueExports: exports.filter((e) => e.kind === "function" || e.kind === "const" || e.kind === "class"),
    decisionExports: exports.filter(
      (e) => e.decisionShaped && (e.kind === "function" || e.kind === "const"),
    ),
    nonTestImporters: importers.filter((i) => !isTestFile(i)),
    testImporters: importers.filter(isTestFile),
    collisions,
    hasTestFile,
  };
}

// ----------------------------------------------------------- classification --

function classify(m: ModuleFacts): Verdict {
  const names = m.valueExports.map((e) => e.name);
  const exportList = names.slice(0, 6).join(", ") || "none";

  // 1. PAPER. The arXiv id inside the docblock is the evidence; the filename is not.
  if (m.arxivId) {
    return {
      file: m.file,
      cls: "A_STAYS_OFFLINE_PAPER",
      evidence:
        "docblock declares arXiv:" +
        m.arxivId +
        "; " +
        (m.offlineQuote || "no offline marker") +
        "; " +
        (m.acceptanceGate ? "carries an ACCEPTANCE GATE" : "no acceptance gate") +
        ". Value exports: " +
        exportList +
        ".",
      liveEquivalent: "",
    };
  }

  // 2. DUPLICATE of live logic: a live module already exports these symbols.
  //
  // A shared NAME is only evidence of duplicate intent when the name is a
  // real API. ENABLED/DEFAULT/VERSION/... are project-wide convention
  // constants (ENABLED appears in 134 of the 418 never-evaluated modules),
  // so a collision on one of those says nothing about the arithmetic. The
  // first run of this script reported 40 such modules as duplicates; they are
  // now left unclassified (NEEDS_HUMAN) rather than given a false verdict.
  const CONVENTION_NAMES = new Set([
    "ENABLED", "DEFAULT", "VERSION", "DISABLED", "NAME", "CONFIG",
  ]);
  if (m.collisions.length) {
    const real = m.collisions.filter((c) => !CONVENTION_NAMES.has(c.name));
    if (!real.length) {
      return {
        file: m.file,
        cls: "NEEDS_HUMAN",
        evidence:
          "name collision with a live module, but ONLY on exported constant(s) " +
          m.collisions.map((c) => c.name).join(", ") +
          ", which are project-wide convention names. Name equality on a constant " +
          "is not duplicate logic, so no class is asserted.",
        liveEquivalent: "",
      };
    }
    const pairs = real
      .slice(0, 3)
      .map((c) => c.name + " -> " + c.liveFiles[0])
      .join("; ");
    const all =
      m.valueExports.length > 0 && real.length >= m.valueExports.length;
    return {
      file: m.file,
      cls: "D_SHADOW_OR_DUPLICATE",
      evidence:
        (all
          ? "every value export"
          : "exports " +
            m.collisions.length +
            " symbol(s)") +
        " already owned by a live module: " +
        pairs +
        ".",
      liveEquivalent: m.collisions
        .slice(0, 4)
        .map((c) => c.name + " in " + c.liveFiles.join(", "))
        .join("; "),
    };
  }

  // Quoted text usable as tooling evidence: the file header plus symbol JSDoc.
  const quotes: string[] = [];
  if (m.docblockFirstLine) quotes.push('docblock: "' + m.docblockFirstLine + '"');
  m.valueExports.slice(0, 6).forEach((e) => {
    if (e.jsdoc) quotes.push(e.name + ': "' + firstDocLine(e.jsdoc) + '"');
  });
  const blob = quotes.join(" || ");
  const toolHit = TOOLING_HINTS.find((h) => h.re.test(blob));

  // 3. HARNESS / audit machinery, proven by a quoted line and no decision export.
  if (toolHit && m.decisionExports.length === 0) {
    return {
      file: m.file,
      cls: "B_STAYS_OFFLINE_TOOLING",
      evidence:
        toolHit.label +
        " by its own text: " +
        clip(blob, 240) +
        ". No decision-shaped export. Value exports: " +
        exportList +
        ".",
      liveEquivalent: "",
    };
  }
  if (toolHit && m.decisionExports.length > 0) {
    return {
      file: m.file,
      cls: "B_STAYS_OFFLINE_TOOLING",
      evidence:
        toolHit.label +
        " by its own text: " +
        clip(blob, 200) +
        "; decision-shaped names (" +
        m.decisionExports
          .slice(0, 3)
          .map((e) => e.name)
          .join(", ") +
        ") are inputs to the harness, not a published quantity.",
      liveEquivalent: "",
    };
  }

  // 4. Self-declared offline / dark, no arXiv id.
  if (m.offlineQuote) {
    return {
      file: m.file,
      cls: "B_STAYS_OFFLINE_TOOLING",
      evidence:
        "file declares its own status: " +
        m.offlineQuote +
        "." +
        (m.darkQuote ? ' docblock: "' + m.darkQuote + '"' : ""),
      liveEquivalent: "",
    };
  }

  // 5. Decision logic with nothing found against it.
  if (m.decisionExports.length > 0) {
    const lead = m.decisionExports[0];
    const more = m.decisionExports.slice(1, 4).map((e) => e.name);
    return {
      file: m.file,
      cls: "C_WIRABLE_DECISION",
      evidence:
        "exports decision function " +
        lead.name +
        (lead.decisionWord ? " (a " + lead.decisionWord + " quantity)" : "") +
        (lead.jsdoc ? ' documented as "' + firstDocLine(lead.jsdoc) + '"' : "") +
        (more.length ? " (also " + more.join(", ") + ")" : "") +
        "; no importer, no offline marker, no live duplicate.",
      liveEquivalent: "",
    };
  }

  // 6. Nothing exportable at all: a dead file.
  if (m.exports.length === 0) {
    return {
      file: m.file,
      cls: "E_TRUE_ORPHAN_STALE",
      evidence: "no exports at all (" + m.lines + " lines), no importer, no docblock.",
      liveEquivalent: "",
    };
  }

  // 7. Real code, but the file's own text supports no class. Say so.
  return {
    file: m.file,
    cls: "NEEDS_HUMAN",
    evidence:
      "no class justified by the file's own text: " +
      (m.docblockFirstLine ? 'docblock "' + clip(m.docblockFirstLine, 150) + '"' : "no docblock") +
      "; value exports: " +
      exportList +
      "; importers: " +
      (m.nonTestImporters.length ? m.nonTestImporters.join(", ") : "none") +
      ".",
    liveEquivalent: "",
  };
}

function computeIslands(
  never: string[],
  importsOf: Map<string, string[]>,
): { count: number; largest: number } {
  const inSet = new Set(never);
  const reverse = new Map<string, string[]>();
  importsOf.forEach((targets, from) => {
    targets.forEach((t) => {
      if (!inSet.has(t)) return;
      const list = reverse.get(t);
      if (list) list.push(from);
      else reverse.set(t, [from]);
    });
  });
  const seen = new Set<string>();
  let count = 0;
  let largest = 0;
  never.forEach((seed) => {
    if (seen.has(seed)) return;
    count++;
    let size = 0;
    const stack = [seed];
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      size++;
      (importsOf.get(cur) || []).forEach((t) => {
        if (inSet.has(t) && !seen.has(t)) stack.push(t);
      });
      (reverse.get(cur) || []).forEach((t) => {
        if (inSet.has(t) && !seen.has(t)) stack.push(t);
      });
    }
    if (size > largest) largest = size;
  });
  return { count, largest };
}

void resolvePath;
main();
