// Read-only AST proof against the REAL process-sport.ts. No repo file is written.
const path = "C:/Users/Garrett/sports/packages/ingestion-pipeline/src/process-sport.ts";
const ts = require("C:/Users/Garrett/sports/node_modules/typescript");
const fs = require("fs");

const src = fs.readFileSync(path, "utf8");
const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true);

function lineOf(n) {
  return sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
}

// Find every call to db.ingestionRun.<method> and report whether it sits
// inside a try block, and whether it is inside a nested function (closure).
const found = [];
function walk(node, tryDepth, fnDepth) {
  const isTry = ts.isTryStatement(node);
  const isFn =
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node);
  let t = tryDepth + (isTry ? 1 : 0);
  let f = fnDepth + (isFn ? 1 : 0);
  // the try's own catch/finally blocks are NOT protected by the try
  if (ts.isCatchClause(node) || ts.isFinallyBlock?.(node)) t = tryDepth;

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const e = node.expression;
    const txt = e.getText(sf);
    if (txt.startsWith("db.ingestionRun.")) {
      found.push({
        line: lineOf(node),
        call: txt,
        inTry: t > 0,
        tryDepth: t,
        fnDepth: f,
      });
    }
  }
  ts.forEachChild(node, (c) => walk(c, t, f));
}
walk(sf, 0, 0);

console.log("=== db.ingestionRun.* call sites in process-sport.ts ===");
for (const c of found) {
  console.log(
    `line ${String(c.line).padStart(4)}  ${c.call.padEnd(24)} inTry=${String(c.inTry).padEnd(5)} fnDepth=${c.fnDepth}`
  );
}

const create = found.find((c) => c.call.endsWith(".create"));
const updates = found.filter((c) => c.call.endsWith(".update"));
console.log("\n=== VERDICT ===");
console.log(
  `create() line ${create.line}: insideTry=${create.inTry}  ` +
    (create.inTry ? "PROTECTED" : "*** UNPROTECTED — a DB outage here escapes processSport ***")
);
for (const u of updates) {
  console.log(
    `update() line ${u.line}: insideTry=${u.inTry} tryDepth=${u.tryDepth}  ` +
      (u.tryDepth > 0
        ? "inside the function catch — the recording write itself is guarded"
        : "NOT inside the try — recording write is UNGUARDED")
  );
}
console.log(`\nrun.id consumers (need non-null run):`);
const ids = [];
(function collect(n) {
  if (ts.isPropertyAccessExpression(n) && n.getText(sf) === "run.id") ids.push(lineOf(n));
  ts.forEachChild(n, collect);
})(sf);
console.log("  run.id at lines:", ids.join(", "));
