// Read-only AST proof, CORRECTED: try/catch/finally are disjoint regions.
// A catch body is NOT protected by its own try statement.
const path = "C:/Users/Garrett/sports/packages/ingestion-pipeline/src/process-sport.ts";
const ts = require("C:/Users/Garrett/sports/node_modules/typescript");
const fs = require("fs");

const src = fs.readFileSync(path, "utf8");
const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true);
const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;

const rows = [];
function walk(node, protTry, region) {
  let prot = protTry;
  let reg = region;
  let nextRegion = null;

  if (ts.isTryStatement(node)) {
    // try BLOCK is protected by this try
    protTry = prot + 1;
    // catch and finally are NOT protected by this try
    nextRegion = "catch|finally";
  } else if (ts.isCatchClause(node) || ts.isBlock(node) === false) {
    /* noop */
  }
  if (ts.isCatchClause(node)) reg = reg + "|catch";
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) reg = reg + "|fn";

  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const txt = node.expression.getText(sf);
    if (txt.startsWith("db.ingestionRun.")) {
      rows.push({ line: lineOf(node), call: txt, protTry, region: reg });
    }
  }
  // descend: a CatchClause / FinallyBlock child resets protection
  ts.forEachChild(node, (c) => {
    let childProt = prot;
    let childReg = reg;
    if (ts.isCatchClause(c) || (ts.isBlock(c) && node.kind === ts.SyntaxKind.FinallyBlock)) {
      childProt = protTry - (ts.isCatchClause(c) || finallyOf(node) ? 1 : 0);
    }
    walk(c, childProt, childReg);
  });
}
function finallyOf(n) { return false; }

// simpler, explicit walk
rows.length = 0;
function visit(node, prot, region, inFn) {
  const isTry = ts.isTryStatement(node);
  const kids = isTry
    ? [
        [node.tryBlock, prot + 1, region + ">TRY"],
        ...(node.catchClause ? [[node.catchClause, prot, region + ">CATCH"]] : []),
        ...(node.finallyBlock ? [[node.finallyBlock, prot, region + ">FINALLY"]] : []),
      ]
    : ts.forEachChild(node, () => null) || [];

  if (!isTry) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.getText(sf).startsWith("db.ingestionRun.")
    ) {
      rows.push({
        line: lineOf(node),
        call: node.expression.getText(sf),
        prot,
        region: region || "top",
      });
    }
    node.forEachChild((c) => visit(c, prot, region, inFn));
    return;
  }
  // process the try statement's own getChildren is not needed; recurse regions
  node.tryBlock.forEachChild((c) => visit(c, prot + 1, region + ">TRY", inFn));
  if (node.catchClause) node.catchClause.forEachChild((c) => visit(c, prot, region + ">CATCH", inFn));
  if (node.finallyBlock) node.finallyBlock.forEachChild((c) => visit(c, prot, region + ">FINALLY", inFn));
}
visit(sf, 0, "", 0);

console.log("=== db.ingestionRun.* call sites — protection by an enclosing TRY block ===\n");
for (const r of rows.sort((a, b) => a.line - b.line)) {
  const verdict = r.prot > 0
    ? "PROTECTED (inside try) -> caught by that try's catch"
    : "*** UNPROTECTED -> a DB outage here REJECTS out of processSport ***";
  console.log(`line ${String(r.line).padStart(4)}  ${r.call.padEnd(24)} prot=${r.prot}  ${verdict}`);
  console.log(`            region: ${r.region}`);
}
