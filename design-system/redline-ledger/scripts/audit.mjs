import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "site");
const extensions = new Set([".ts", ".tsx", ".css", ".html"]);
const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (["node_modules", "dist", "package-lock.json"].includes(entry)) continue;
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (extensions.has(path.extname(full))) files.push(full);
  }
}
walk(sourceRoot);

const checks = [
  [/#(?:6366f1|8b5cf6|7c3aed|a855f7|7b61ff|ff38c7|00e5ff)/i, "forbidden legacy accent"],
  [/\b(?:Inter|Geist|Roboto)\b/, "forbidden default typeface"],
  [/(?:linear|radial|conic)-gradient\s*\(/, "gradient effect"],
  [/backdrop-filter\s*:/, "frosted glass effect"],
  [/box-shadow\s*:/, "shadow/glow effect"],
  [/Mike Evans.{0,50}(?:Tampa Bay|\bTB\b)/s, "stale Mike Evans team"],
  [/Geno Smith.{0,50}(?:Las Vegas|\bLV\b)/s, "stale Geno Smith team"],
  [/assets\/higgsfield\/(?:hero-sideline|field-chalk|football-seams-portrait|contact-sheet-square)\.png/, "rejected original asset reference"],
];
const violations = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [pattern, label] of checks) {
    if (pattern.test(text)) violations.push(`${path.relative(root, file)}: ${label}`);
  }
}
const tokens = readFileSync(path.join(sourceRoot, "src/styles/tokens.css"), "utf8");
for (const required of ["tabular-nums lining-nums", '"tnum" 1, "lnum" 1', "min-width: 4.5ch", "text-align: right", "white-space: nowrap"]) {
  if (!tokens.includes(required)) violations.push(`tokens.css: missing ${required}`);
}
const data = readFileSync(path.join(sourceRoot, "src/data/week8.ts"), "utf8");
if (!data.includes('name: "Mike Evans", team: "SF", position: "WR"')) violations.push("week8.ts: Mike Evans correction missing");
if (!data.includes('name: "Geno Smith", team: "NYJ", position: "QB"')) violations.push("week8.ts: Geno Smith correction missing");
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(`Anti-slop and sports-integrity audit passed across ${files.length} source files`);
