import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");
const target = process.argv[2] ? path.resolve(process.argv[2]) : root;
const denyDirs = new Set([".git", "node_modules", ".next", "dist", "build"]);

const helpSignals = [
  /\bhelp\b/i,
  /\bhow[- ]to\b/i,
  /\btutorial\b/i,
  /\bguide\b/i,
  /\bexplainer\b/i,
  /\bonboarding\b/i,
  /\btooltip\b/i,
  /\bwalkthrough\b/i,
  /\bvideo\b/i,
  /\bmotion\b/i,
  /\bsummary\b/i,
  /\bwhat this means\b/i,
  /\bwhy it matters\b/i,
];

const rawJsonSignals = [
  /\bJSON\b/,
  /JSON\.stringify/,
  /application\/json/,
  /raw json/i,
  /\.json\b/i,
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (denyDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(target).filter((file) => /\.(md|mdx|tsx|ts|jsx|js|json|jsonl)$/i.test(file));
const rows = files.map((file) => {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const helpScore = helpSignals.reduce((sum, re) => sum + (re.test(text) ? 1 : 0), 0);
  const jsonRisk = rawJsonSignals.some((re) => re.test(text));
  const pageLike = /\.(tsx|jsx|mdx)$/i.test(file) || rel.includes("/app/") || rel.includes("/pages/");
  const needsHelp = pageLike && helpScore < 3;
  return {
    file: rel,
    kind: path.extname(file).slice(1).toLowerCase(),
    help_score: helpScore,
    json_readability_risk: jsonRisk,
    page_like: pageLike,
    needs_help_layer: needsHelp,
  };
});

const summary = {
  target: path.relative(root, target).replace(/\\/g, "/") || ".",
  files_scanned: rows.length,
  page_like_files: rows.filter((r) => r.page_like).length,
  needs_help_layer: rows.filter((r) => r.needs_help_layer).length,
  json_readability_risks: rows.filter((r) => r.json_readability_risk).length,
  top_gaps: rows.filter((r) => r.needs_help_layer || r.json_readability_risk).slice(0, 50),
};

console.log(JSON.stringify(summary, null, 2));
