// Hybrid node_modules for a git worktree: junction every entry of the primary
// checkout's node_modules EXCEPT @sports, which is repointed at THIS worktree's
// own packages. Root cause of the classic worktree failure: node_modules/@sports/*
// symlinks to the primary checkout's packages, so a worktree test silently runs
// against a DIFFERENT copy of the source than the file you just edited
// ("X is not a function", or worse, a green suite proving nothing).
//
//   node scripts/hybrid-node-modules.cjs <worktreeRoot> <primaryRoot>
const fs = require("fs");
const path = require("path");

const wt = path.resolve(process.argv[2] || process.cwd());
const primary = path.resolve(process.argv[3] || "C:/Users/Garrett/Sports");
const wtNm = path.join(wt, "node_modules");
const primaryNm = path.join(primary, "node_modules");

if (!fs.existsSync(primaryNm)) {
  console.error("FAIL: primary node_modules missing at " + primaryNm);
  process.exit(1);
}

// @sports/* -> this worktree's packages/apps/workers, mirroring root workspaces.
const local = {
  ai_council: "packages/ai-council",
  compliance: "packages/compliance",
  crypto: "packages/crypto",
  "data-ingestion": "packages/data-ingestion",
  db: "packages/db",
  "epistemic-twin": "packages/epistemic-twin",
  "feature-store": "packages/feature-store",
  "genesis-kernel": "packages/genesis-kernel",
  governed: "packages/governed",
  "ingestion-pipeline": "packages/ingestion-pipeline",
  ops: "packages/ops",
  "partner-stack": "packages/partner-stack",
  "phase-c": "packages/phase-c",
  "prediction-engine": "packages/prediction-engine",
  "quote-plane": "packages/quote-plane",
  "stats-api": "packages/stats-api",
  types: "packages/types",
  util: "packages/util",
  web: "apps/web",
  "worker-airwave-listener": "workers/airwave-listener",
  "worker-content-publishing": "workers/content-publishing",
  "worker-data-refresh": "workers/data-refresh",
  "worker-pick-generation": "workers/pick-generation",
};

function clear(p) {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) fs.unlinkSync(p);
    else if (st.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
    else fs.unlinkSync(p);
  } catch (e) {
    if (e.code !== "ENOENT") console.log("CLEANUP-FAIL " + p + ": " + e.message);
  }
}

fs.mkdirSync(wtNm, { recursive: true });

let junctioned = 0;
let broken = 0;
const primaryEntries = fs.readdirSync(primaryNm);
for (const entry of primaryEntries) {
  if (entry === "@sports") continue; // rebuilt locally below
  const link = path.join(wtNm, entry);
  const target = path.join(primaryNm, entry);
  clear(link);
  try {
    fs.symlinkSync(target, link, "junction");
    if (!fs.existsSync(link)) {
      broken++;
      console.log("BROKEN " + entry);
    } else junctioned++;
  } catch (e) {
    broken++;
    console.log("FAIL " + entry + ": " + e.message);
  }
}

// Rebuild @sports against THIS worktree.
const scopeDir = path.join(wtNm, "@sports");
clear(scopeDir);
fs.mkdirSync(scopeDir, { recursive: true });
for (const [name, rel] of Object.entries(local)) {
  const target = path.join(wt, rel);
  const link = path.join(scopeDir, name);
  if (!fs.existsSync(target)) {
    console.log("MISSING TARGET " + name + " -> " + rel);
    continue;
  }
  clear(link);
  try {
    fs.symlinkSync(target, link, "junction");
    console.log((fs.existsSync(link) ? "OK   " : "BROKEN ") + name + " -> " + rel);
  } catch (e) {
    console.log("FAIL " + name + ": " + e.message);
  }
}

// Per-package node_modules. npm hoists most deps to the root but nests the ones
// that collide with another version, so a worktree with only a ROOT node_modules
// is incomplete: `packages/db` needs its nested @neondatabase/serverless and the
// whole ingest chain (@sports/data-ingestion -> @sports/db) fails to resolve.
const pkgDirs = [];
for (const scope of ["packages", "apps", "workers"]) {
  const dir = path.join(wt, scope);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    const nested = path.join(dir, name, "node_modules");
    if (fs.existsSync(nested)) pkgDirs.push(path.join(dir, name));
  }
}
let nestedJunctions = 0;
for (const pkgRoot of pkgDirs) {
  const targetNm = path.join(primary, path.relative(wt, pkgRoot), "node_modules");
  if (!fs.existsSync(targetNm)) continue;
  const localNm = path.join(pkgRoot, "node_modules");
  fs.mkdirSync(localNm, { recursive: true });
  for (const entry of fs.readdirSync(targetNm)) {
    const link = path.join(localNm, entry);
    if (fs.existsSync(link)) continue;
    const target = path.join(targetNm, entry);
    clear(link);
    try {
      fs.symlinkSync(target, link, "junction");
      nestedJunctions++;
    } catch (e) {
      console.log("NESTED-FAIL " + path.relative(wt, link) + ": " + e.message);
    }
  }
}

console.log("---");
console.log("worktree:      " + wt);
console.log("primary:       " + primary);
console.log("reused entries: " + junctioned + " (broken " + broken + ")");
console.log("nested pkg deps: " + nestedJunctions + " across " + pkgDirs.length + " package(s)");
console.log("@sports linked:  " + fs.readdirSync(scopeDir).length);
const pe = path.join(scopeDir, "prediction-engine/src/scoring.ts");
console.log("prediction-engine scoring.ts resolves: " + fs.existsSync(pe));
if (fs.existsSync(pe)) {
  const src = fs.readFileSync(pe, "utf8");
  const hits = (src.match(/probabilityCalibrator/g) || []).length;
  console.log("  probabilityCalibrator occurrences: " + hits + (hits >= 4 ? "  <- BOTH call sites threaded" : "  <- WARNING: expected >=4 (type + 2 sites + comments)"));
}