import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..", "..");
const target = process.argv[2] ? path.resolve(process.argv[2]) : root;
const denyDirs = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);

const checks = [
  { code: "RAW_JSON_RISK", re: /\b(JSON\.stringify|application\/json|raw json|\.json\b)/i, severity: "MEDIUM" },
  { code: "GENERIC_HERO_COPY", re: /\b(unlock your potential|game[- ]changing|next[- ]generation|AI-powered platform|revolutionize)\b/i, severity: "MEDIUM" },
  { code: "BETTING_HYPE_RISK", re: /\b(guaranteed wins?|lock of the day|free money|can't lose|sure thing)\b/i, severity: "HIGH" },
  { code: "MISSING_REDUCED_MOTION_CONTEXT", re: /\b(framer|motion|gsap|animate|transition|canvas|webgl|three)\b/i, severity: "MEDIUM" },
  { code: "METHOD_LEAKAGE_RISK", re: /\b(model weights?|formula|proprietary source weights?|internal scoring recipe)\b/i, severity: "HIGH" },
  { code: "HELP_SURFACE_SIGNAL", re: /\b(help|how[- ]to|guide|tutorial|tooltip|walkthrough|explainer|what this means|why it matters)\b/i, severity: "INFO" },
  { code: "ACCESSIBILITY_SIGNAL", re: /\b(aria-|role=|alt=|prefers-reduced-motion|sr-only|focus-visible)\b/i, severity: "INFO" },
  { code: "CONVERSION_SIGNAL", re: /\b(upgrade|pricing|PRO|ELITE|checkout|subscribe|trial)\b/, severity: "INFO" },
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

const files = walk(target).filter((file) => /\.(tsx|ts|jsx|js|mjs|mdx|md|json|jsonl|css|scss)$/i.test(file));
const findings = [];
let pageLike = 0;
let helpSignals = 0;
let accessibilitySignals = 0;

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const isPage = /(^|\/)(app|pages|routes|src\/app)\//.test(rel) || /\.(tsx|jsx|mdx)$/i.test(file);
  if (isPage) pageLike += 1;
  if (/\b(help|how[- ]to|guide|tutorial|tooltip|walkthrough|explainer)\b/i.test(text)) helpSignals += 1;
  if (/\b(aria-|role=|alt=|prefers-reduced-motion|sr-only|focus-visible)\b/i.test(text)) accessibilitySignals += 1;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const check of checks) {
      if (check.re.test(line)) {
        findings.push({
          code: check.code,
          severity: check.severity,
          file: rel,
          line: index + 1,
          excerpt: line.trim().slice(0, 220),
        });
      }
    }
  });
}

console.log(JSON.stringify({
  target: path.relative(root, target).replace(/\\/g, "/") || ".",
  files_scanned: files.length,
  page_like_files: pageLike,
  files_with_help_signals: helpSignals,
  files_with_accessibility_signals: accessibilitySignals,
  findings_count: findings.length,
  high_risk_count: findings.filter((f) => f.severity === "HIGH").length,
  medium_risk_count: findings.filter((f) => f.severity === "MEDIUM").length,
  findings: findings.slice(0, 250),
}, null, 2));
