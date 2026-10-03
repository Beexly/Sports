#!/usr/bin/env node
// Read-only performance scanner for the perf.md audit.
// Rules:
//   1. N+1      — an await/Prisma call lexically inside a .map/.forEach body
//   2. PRISMA-NO-TAKE  — findUnique/findFirst with no take/limit and no unique-first-field
//   3. PRISMA-SKIP/TAKE without orderBy (unstable pagination) — informational
//   4. N+1-CHECKOUT — a Stripe customer/session lookup inside a per-row loop
//   5. CLIENT-HEAVY — a "use client" file importing a known server-only/heavy module
//   6. UNMEMOIZED — a component that maps a list and calls a non-memoised subcomponent
//   7. SELECT-ALL — a findMany({ select: undefined }) i.e. bare findMany with no `select`/`include`
// --selftest proves each rule can fire, so a future zero is a real zero.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.argv[2] ? process.argv[2] : ".";
const SELFTEST = process.argv.includes("--selftest");
const ALL = process.argv.includes("--all");

const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", ".turbo"]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".claude") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p, out); }
    else if (EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

// git-tracked-ish: keep to the source trees we care about
const TARGET_ROOTS = ALL
  ? ["apps", "packages", "scripts"]
  : ["apps/web/app", "apps/web/components", "apps/web/lib", "apps/web/cockpit",
     "apps/web/agents", "apps/web/api", "packages/prediction-engine/src",
     "packages/ingestion-pipeline/src", "packages/data-ingestion/src", "packages/db"];

const files = [];
for (const r of TARGET_ROOTS) {
  const abs = join(ROOT, r);
  try { statSync(abs); } catch { continue; }
  files.push(...walk(abs));
}

function lineOf(src, idx) { return src.slice(0, idx).split("\n").length; }

const HEAVY_CLIENT_IMPORTS = [
  "recharts", "date-fns", "framer-motion", "react-markdown", "remark-gfm", "react-syntax-highlighter",
  "d3-", "@prisma/client", "@/lib/db", "@sports/db", "pg", "ioredis", "@upstash",
  "xlsx", "pdf-lib", "exceljs", "zod", "swr", "@tanstack/react-query",
];

const findings = [];
function add(rule, file, line, detail) { findings.push({ rule, file, line, detail }); }

// ---- schema.prisma index map -------------------------------------------------
// For each model: every scalar field, and the set of columns that can be used as
// the LEADING column of a btree lookup. Postgres uses a composite index only from
// its first column onward, so `@@index([a, b])` indexes a, not b. A nullable
// column is excluded because a `where: { col: { in: [...] } }` cannot use the
// index while any row has NULL there — a real, silent planner trap.
const PRISMA_OPERATORS = new Set(["AND", "OR", "NOT"]);
let schema = null;
function loadSchema() {
  for (const p of ["packages/db/prisma/schema.prisma", "../db/prisma/schema.prisma"]) {
    let txt;
    try { txt = readFileSync(join(ROOT, p), "utf8"); } catch { continue; }
    const models = {};
    for (const mm of txt.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      const name = mm[1], body = mm[2];
      const scalar = new Map();
      const uniqueSingle = new Set();
      // relation field name -> its FK scalar column, so `where: { game: {…} }`
      // is checked against the `gameId` index instead of being called a column.
      const relationFk = new Map();
      for (const line of body.split("\n")) {
        // A field line is `name Type[?][] @attr @default(...) // note` — the
        // attributes MUST be allowed, or `id String @id` is not recognised as a
        // field and the unique-key set comes out empty.
        const f = /^\s{2}(\w+)\s+([A-Za-z]\w*)(\[\])?(\?)?(\s+@[\s\S]*?)?\s*$/.exec(line);
        if (f && !["@@", "//"].includes(f[1]) && !f[4]) {
          scalar.set(f[1], { optional: !!f[3] });
          if (/@id\b/.test(line) || /@unique\b/.test(line)) uniqueSingle.add(f[1]);
          // `game Game @relation(...)` -> relation `game` resolves to `gameId`
          if (/^[A-Z]\w*$/.test(f[2])) {
            const guess = f[1] + "Id";
            if (new RegExp(`^\\s{2}${guess}\\s`, "m").test(body)) relationFk.set(f[1], guess);
          }
        }
      }
      const indexLeading = new Set();
      for (const ix of body.matchAll(/@@(index|unique)\s*\(\[([^\]]+)\]/g)) {
        const cols = ix[2].split(",").map((c) => c.trim().split(/\s+/)[0].replace(/^\w+:/, "")).filter(Boolean);
        if (cols[0]) indexLeading.add(cols[0]);
        if (ix[1] === "unique" && cols.length === 1) uniqueSingle.add(cols[0]);
      }
      for (const ix of body.matchAll(/@@(index|unique)\s*\(\s*\[?\s*(\w+)\s*\]?\s*(,|$)/gm)) indexLeading.add(ix[2]);
      models[name] = { scalar, indexLeading, uniqueSingle, relationFk };
    }
    return { models };
  }
  return null;
}
schema = loadSchema();

// Prisma's model is `Pick` but the client property is `pick`. Resolve either
// spelling, plus a case-insensitive fallback, so an index rule never silently
// no-ops on a name mismatch (that failure mode reads exactly like "clean").
function findModel(name) {
  if (!schema || !name) return null;
  if (schema.models[name]) return schema.models[name];
  const cap = name[0].toUpperCase() + name.slice(1);
  if (schema.models[cap]) return schema.models[cap];
  const low = name.toLowerCase();
  const hit = Object.keys(schema.models).find((k) => k.toLowerCase() === low);
  return hit ? schema.models[hit] : null;
}

// Split the inside of a brace block into its TOP-LEVEL keys, so a nested
// `where: { game: { id: x } }` reports `game` and not `id`.
function topLevelKeys(inner) {
  const keys = [];
  let depth = 0;
  for (const part of inner.split("\n")) {
    const trimmed = part.trim();
    if (depth === 0) {
      const m = /^([A-Za-z_]\w*)\s*:/.exec(trimmed) || /^([A-Za-z_]\w*)\s*(,|$)/.exec(trimmed);
      if (m) keys.push(m[1]);
    }
    depth += (part.match(/[{[(]/g) || []).length - (part.match(/[}\])]/g) || []).length;
    if (depth < 0) depth = 0;
  }
  return [...new Set(keys)];
}

// Any import at all: a client component that imports something is very likely
// pulling it across the RSC boundary, so "no interactivity AND no imports" is the
// strong signal (a purely static leaf that needs nothing from the client graph).
const imp0 = "[^\\\"']";

for (const f of files) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const isTsx = extname(f) === ".tsx" || extname(f) === ".jsx";

  // ---- rule 1: await/prisma inside a loop callback -------------------------
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const opensLoop = /(\.map\(|\.forEach\(|\.flatMap\(|for\s*\(|for\s+await)/.test(ln);
    if (!opensLoop) continue;
    // Establish the brace depth ON the loop line. A balanced one-liner such as
    // `xs.map((e) => e.id)` has delta 0 and closes immediately, so an await
    // further down is NOT inside it. Only keep scanning while depth > baseline.
    const open = (ln.match(/[{[(]/g) || []).length;
    const close = (ln.match(/[}\])]/g) || []).length;
    // `depth` is RELATIVE to the loop line, not absolute: a `for (…) {` line
    // contributes +1 for the body it opens, so the first body line sits at
    // depth 1, not 0. A balanced one-liner (`xs.map(e => e.id)`) contributes 0
    // and closes immediately, so nothing after it is in the body.
    const baseline = open - close;
    let depth = baseline;
    for (let j = i; j < Math.min(lines.length, i + 16); j++) {
      // j === i is always in scope: a fully one-line loop
      // (`for (const s of S) c[s] = await db.x.count(…)`) carries its own await.
      if (j > i && depth <= 0) break;
      const cur = lines[j];
      if (/\bawait\b/.test(cur) && /(prisma|db\.|ctx\.|client\.|fetch\(|axios|\$queryRaw|\$executeRaw|session\.|stripe\.|s3|redis)/.test(cur)) {
        const windowTxt = lines.slice(Math.max(i, j - 8), j + 1).join("\n");
        const batched = /Promise\.(all|allSettled)\s*\(/.test(windowTxt) || /\$transaction\(\s*\[/.test(windowTxt);
        if (!batched) add("N+1", rel, j + 1, cur.trim().slice(0, 150));
      }
      if (j > i) depth += (lines[j].match(/[{([]/g) || []).length - (lines[j].match(/[}\])]/g) || []).length;
    }
  }

  // ---- rule 2/3/7: prisma query shapes --------------------------------------
  // The call shape is `client.model.method({ … })` — TWO dots. A regex written as
  // `client\.(\w+)\(\{` silently matches nothing, which reads as a clean sweep.
  const callRe = /\b(?:prisma|db|tx|ctx|input\.db|args\.db|prismaClient|client)(?:\.(\w+))?\.(\w+)\s*\(\s*\{/g;
  let m;
  while ((m = callRe.exec(src)) !== null) {
    const modelName = m[1];
    const method = m[2];
    // capture the object literal (brace-balanced, bounded)
    const start = m.index + m[0].length - 1;
    let depth = 0, end = start;
    for (let k = start; k < src.length && k < start + 4000; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
    }
    const obj = src.slice(start, end + 1);
    const ln = lineOf(src, m.index);
    if (["findMany", "findFirst", "findUnique", "findUniqueOrThrow", "count", "groupBy", "aggregate"].includes(method)) {
      // `include:` is an explicit projection exactly like `select:` — testing only
      // `select` reported every include-based query as a whole-row read.
      const hasSelect = /(^|[\s{,])select\s*:/.test(obj) || /(^|[\s{,])include\s*:/.test(obj);
      const hasTake = /(^|[\s{,])(take|first)\s*:/.test(obj);
      const hasWhere = /where\s*:/.test(obj);
      // `{ where, take }` is the SHORTHAND for a filter built in a variable — the
      // filter exists, it is just not literal. Reporting it as an unfiltered read
      // is a false positive; the call site has to be read instead.
      const whereIsShorthand = /(^|[\s,{])where\s*(,|$)/.test(obj);
      if (!hasWhere && !whereIsShorthand && method !== "count")
        add("PRISMA-NO-WHERE", rel, ln, `${method} with no where clause (full table scan candidate): ${obj.slice(0, 90).replace(/\s+/g, " ")}`);
      if (hasTake && !/orderBy\s*:/.test(obj) && method === "findMany")
        add("PRISMA-UNSTABLE-PAGE", rel, ln, `findMany with take but no orderBy (unstable pagination): ${obj.slice(0, 90).replace(/\s+/g, " ")}`);
      if (method === "findMany" && !hasSelect)
        add("SELECT-ALL", rel, ln, `findMany with no select/include (whole row over the wire): ${obj.slice(0, 90).replace(/\s+/g, " ")}`);
      // findFirst / findFirstOrThrow whose where is exactly one unique column is
      // a unique index probe that refuses to use it: Prisma emits LIMIT 1 and
      // Postgres may plan a seq scan. findUnique on the same key is free.
      if (schema && modelName && (method === "findFirst" || method === "findFirstOrThrow")) {
        const mi = findModel(modelName);
        if (mi) {
          const w2 = /(?:^|[\s,{])where\s*:\s*\{/.exec(obj);
          if (w2) {
            const ws2 = obj.indexOf("{", w2.index);
            let d3 = 0, we2 = ws2;
            for (let k = ws2; k < obj.length; k++) {
              if (obj[k] === "{") d3++;
              else if (obj[k] === "}") { d3--; if (d3 === 0) { we2 = k; break; } }
            }
            const keys2 = topLevelKeys(obj.slice(ws2 + 1, we2)).filter((k) => !PRISMA_OPERATORS.has(k));
            if (keys2.length === 1 && mi.uniqueSingle.has(keys2[0]) && !hasTake && !/orderBy\s*:/.test(obj))
              add("PRISMA-FIND-FIRST", rel, ln, `${modelName}.${method} on the unique key ${keys2[0]} — findUnique uses the unique index, this can plan a scan`);
          }
        }
      }
    }
  }

  // ---- rule 7: index coverage for a Prisma `where` ----------------------------
  // Parse schema.prisma once: model -> { scalar fields, single-column indexes,
  // leading columns of compound indexes }. A `where` key that is neither the
  // model's own scalar field nor the LEADING column of some index is a scan.
  if (schema) {
    const seenPair = new Set();
    for (const model of Object.keys(schema.models)) {
      const m = schema.models[model];
      // Match the CLIENT spelling (`db.pick.findMany`) and the model spelling
      // (`db.Pick.findMany`) — the earlier two-dot regex never fired at all.
      const re2 = new RegExp(`\\b${model}\\.(findMany|findFirst|findFirstOrThrow|count|updateMany|deleteMany|aggregate|groupBy)\\s*\\(\\s*\\{`, "gi");
      let mm2;
      while ((mm2 = re2.exec(src)) !== null) {
        const method = mm2[1].toLowerCase();
        const start = mm2.index + mm2[0].length - 1;
        let d = 0, end = start;
        for (let k = start; k < src.length && k < start + 3000; k++) {
          if (src[k] === "{") d++;
          else if (src[k] === "}") { d--; if (d === 0) { end = k; break; } }
        }
        const obj = src.slice(start, end + 1);
        const w = /(?:^|[\s,{])where\s*:\s*\{/.exec(obj);
        if (!w) continue;
        const ws = obj.indexOf("{", w.index);
        let d2 = 0, we = ws;
        for (let k = ws; k < obj.length; k++) {
          if (obj[k] === "{") d2++;
          else if (obj[k] === "}") { d2--; if (d2 === 0) { we = k; break; } }
        }
        const keys = topLevelKeys(obj.slice(ws + 1, we));
        // A composite index is usable as soon as ANY key in the where can serve
        // as its LEADING column — the planner picks the best one present. So the
        // question is not "is this key indexed" but "does ANY key lead an index".
        const resolvable = keys.map((k) => {
          if (PRISMA_OPERATORS.has(k)) return null;
          if (m.uniqueSingle.has(k)) return { key: k, ok: true };
          const fk = m.relationFk.get(k);
          if (fk) return { key: k, fk, ok: m.indexLeading.has(fk) || m.uniqueSingle.has(fk) || !!m.scalar.get(fk)?.optional };
          if (!m.scalar.has(k)) return { key: k, ok: true };              // enum / unmapped: not judged
          return { key: k, ok: m.indexLeading.has(k) || !!m.scalar.get(k)?.optional };
        }).filter(Boolean);
        if (resolvable.some((r) => r.ok)) continue;   // an index can serve this query
        for (const r of resolvable) {
          if (r.ok) continue;
          add("UNINDEXED-WHERE", rel, lineOf(src, mm2.index),
            r.fk
              ? `${model}.${method} filters relation \`${r.key}\` (FK \`${r.fk}\`) and no key in the where leads an index`
              : `${model}.${method} where.${r.key} and no other key in the where leads an index on ${model}`);
        }
      }
    }
  }

  // ---- rule 5: heavy imports inside a "use client" file --------------------
  if (/^\s*["']use client["']/.test(src)) {
    for (const imp of HEAVY_CLIENT_IMPORTS) {
      const re = new RegExp(`from\\s+["'][^"']*${imp.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")}[^"']*["']`);
      if (re.test(src)) add("CLIENT-HEAVY", rel, src.slice(0, re.exec(src).index).split("\n").length, `imports ${imp} into a client component`);
    }
  }

  // ---- rule 8: a "use client" file with no interactivity at all --------------
  // Nothing in the file forces the React client runtime: no state, no effect, no
  // event handler, no ref, no context consumer. It is a server component that
  // happens to carry the directive (or is one of the only files in a tree that
  // does, which is what drags the whole subtree across the RSC boundary).
  if (/^\s*["']use client["']/.test(src) && isTsx) {
    const interactive =
      /use(State|Effect|Reducer|Ref|Callback|Memo|Transition|Context|DeferredValue|SyncExternalStore|Optimistic)\s*\(/.test(src) ||
      /\son[A-Z]\w*\s*=/.test(src) ||          // onClick=, onChange=, …
      /\bformAction\b|\buseFormState\b|\buseFormStatus\b/.test(src) ||
      /createContext\s*\(/.test(src) ||
      /\bwindow\.|\bdocument\.|navigator\.|localStorage|sessionStorage/.test(src) ||
      /suppressHydrationWarning/.test(src) ||
      /<form\b/.test(src) ||
      /\bhtmlFor=/.test(src) ||
      /\bsetTimeout\s*\(|\bsetInterval\s*\(/.test(src) ||
      /ref=\{/.test(src) ||
      new RegExp(`from\\s+["'][^"']*${imp0}[^"']*["']`).test(src);
    if (!interactive) add("CLIENT-NO-STATE", rel, 1, `"use client" but no state/effect/handler/context/ref/form/timer in the file — nothing forces the client runtime`);
  }

  // ---- rule 6: list .map rendering a locally-defined non-memo component -----
  if (isTsx && /\.map\(/.test(src)) {
    const memoed = new Set();
    for (const mm of src.matchAll(/(?:const|function)\s+(\w+)\s*=\s*memo\(/g)) memoed.add(mm[1]);
    for (const mm of src.matchAll(/export\s+const\s+(\w+)\s*=\s*memo\(/g)) memoed.add(mm[1]);
    for (const line of lines) {
      const mapm = /\.map\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*<([A-Z]\w*)[\s/>]/.exec(line);
      if (!mapm) continue;
      const comp = mapm[1];
      if (memoed.has(comp)) continue;
      // is the component defined in this same file and NOT memo'd?
      if (new RegExp(`(?:const|function)\\s+${comp}\\b`).test(src))
        add("UNMEMOIZED-LIST", rel, lines.indexOf(line) + 1, `renders <${comp}> in a .map(); ${comp} is defined in-file and not memo()`);
    }
  }
}

if (SELFTEST) {
  const spec = [
    { rule: "N+1", token: "await prisma.picks.findMany", src: `for (const g of games) {\n  const rows = await prisma.picks.findMany({ where: { gameId: g.id } });\n}` },
    { rule: "PRISMA-NO-WHERE", token: "no where clause", src: `const all = await prisma.picks.findMany({ orderBy: { id: "asc" } });` },
    { rule: "PRISMA-UNSTABLE-PAGE", token: "no orderBy", src: `const rows = await prisma.picks.findMany({ where: { result: "PENDING" }, take: 12 });` },
    { rule: "SELECT-ALL", token: "no select/include", src: `const rows = await prisma.games.findMany({ where: { sport: "nfl" } });` },
    { rule: "PRISMA-FIND-FIRST", token: "findUnique uses the unique index", src: `const one = await prisma.pick.findFirst({ where: { id } });` },
    { rule: "CLIENT-HEAVY", token: "imports recharts", src: `"use client";\nimport { LineChart } from "recharts";\nexport default function C(){return null}` },
    { rule: "UNINDEXED-WHERE", token: "someUnindexedCol", src: `const r = await prisma.pick.findMany({ where: { someUnindexedCol: "x" } });` },
    { rule: "CLIENT-NO-STATE", token: "nothing forces the client runtime", src: `"use client";\nexport default function A(){ return <div>hi</div> }` },
    { rule: "UNMEMOIZED-LIST", token: "is defined in-file and not memo()", src: `function Row({x}){return <li>{x}</li>}\nexport default function L({xs}){return <ul>{xs.map(i => <Row key={i} x={i} />)}</ul>}` },
  ];
  // A finding line is `  <path>:<line>  <detail>`. The `## RULE (0)` section
  // header ALWAYS prints, so matching the rule name is a FALSE PASS — the check
  // must require a real finding line carrying the specimen's own token.
  const { writeFileSync, mkdtempSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  let ok = 0, fail = 0;
  for (const s of spec) {
    const dir = mkdtempSync(join(tmpdir(), "perfselftest-"));
    // The scanner's roots are apps/… and packages/…, so the specimen MUST live
    // under one of them. Writing it at the temp root scanned ZERO files and made
    // every rule look like a silent pass — the harness is what caught that.
    const appDir = join(dir, "apps", "web", "app");
    mkdirSync(appDir, { recursive: true });
    writeFileSync(join(appDir, "specimen.tsx"), s.src);
    const schemaDir = join(dir, "packages", "db", "prisma");
    mkdirSync(schemaDir, { recursive: true });
    writeFileSync(join(schemaDir, "schema.prisma"), "model pick {\n  id String @id\n  gameId String\n  @@index([gameId])\n}\n");
    let out = "";
    try {
      out = execFileSync(process.execPath, [process.argv[1], dir, "--all"], { encoding: "utf8" });
    } catch (e) { out = String(e.stdout || ""); }
    const fired = out.split("\n").some((l) => /^\s+\S+\.\w+:\d+\s{2}/.test(l) && l.includes(s.token));
    if (fired) ok++;
    else { fail++; console.log(`  SELFTEST FAIL: ${s.rule} — no finding line carrying "${s.token}"`); }
  }
  console.log(`selftest ${ok}/${ok + fail} rules fire on their own specimen`);
  process.exit(fail ? 1 : 0);
}

const order = ["N+1", "UNINDEXED-WHERE", "CLIENT-HEAVY", "CLIENT-NO-STATE", "UNMEMOIZED-LIST", "SELECT-ALL", "PRISMA-NO-WHERE", "PRISMA-FIND-FIRST", "PRISMA-UNSTABLE-PAGE"];
const byRule = new Map(order.map((r) => [r, []]));
for (const f of findings) byRule.get(f.rule)?.push(f);
console.log(`files scanned: ${files.length}`);
for (const r of order) {
  const list = byRule.get(r) || [];
  console.log(`\n## ${r}  (${list.length})`);
  for (const f of list.slice(0, 60)) console.log(`  ${f.file}:${f.line}  ${f.detail}`);
  if (list.length > 60) console.log(`  ... ${list.length - 60} more`);
}
