// Transitive keep-out sweep, v2.
//
// v1 found /api/sources/catalog and then I triaged ~10 of 43 ungated
// candidates and stopped. Finishing that is the point of this file.
//
// Lessons from v1, all learned by being wrong:
//   - "carries" matched the English verb in a comment (lib/auth.ts). Require
//     data-shaped tokens only.
//   - Strip comments before matching, or this script matches itself.
//   - admin/** and cockpit/** are layout-gated; report them separately rather
//     than as public findings.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const WEB = resolve(process.cwd());
const APP = join(WEB, "app");

const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replace(/`(?:[^`\\]|\\.)*`/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, " ")
    .replace(/'(?:[^'\\]|\\.)*'/g, " ");

const PATTERNS = [
  ["ngs", /next_gen_stats|nextGenStats|ngs_(?:team|player|week)_/],
  ["qbr", /\bqbr\b/i],
  ["separation", /\bseparation\b/i],
  ["wopr", /\bwopr\b/i],
  ["epa", /\bepa\b/i],
  ["target_share", /target_share/],
  ["raw rows", /\b(?:rush_yards|receiving_yards|fumbles_lost|receptions|fantasy_points)\b/],
  ["opportunities col", /\bopportunities_(?:per|avg)\b/],
  ["signal ledger", /signal_ledger|signalLedger|signal_snapshots|pick_signal/],
  ["calibration", /isotonic|\bpava\b|reliabilityDiagram|expectedFromConfidence/],
  ["edge internals", /factorBreakdown|independentEdge|expectedClv|consensusScore|marketDepthScore/],
  ["adjustment", /adjustmentLayer|ADJUSTMENT_(?:WEIGHT|MAGNITUDE)/],
  ["truth topology", /next_gen_truth|truthCatalog|TRUTH_TOPOLOGY/],
];

const matches = (src) => PATTERNS.filter(([, re]) => re.test(src)).map(([n]) => n);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.name === "route.ts" || e.name === "page.tsx") yield f;
  }
}

// Resolve an @/ alias to a real file.
function resolveLocal(spec, fromFile) {
  let p;
  if (spec.startsWith("@/")) p = join(WEB, spec.slice(2));
  else if (spec.startsWith(".")) p = resolve(dirname(fromFile), spec);
  else return null;
  for (const cand of [p, `${p}.ts`, `${p}.tsx`, join(p, "index.ts"), join(p, "index.tsx")]) {
    try {
      readFileSync(cand, "utf8");
      return cand;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

const SELF_GATE = [
  /\bauth\s*\(/, /getServerSession/, /requireSession/,
  /isPagePublic|isApiRoutePublic/,
  /canExposePerformanceStats|getReadinessGates|PUBLISH_LEDGER/,
  /extractB2bApiKey|requireApiKey/,
  /requirePremiumApiRateLimited|requirePremium|fantasyFloor/,
  /cronAuthError|authorizeCronSecret|CRON_SECRET/,
  /no-raw-ngs-fence/,
  /process\.env(?:\[["'][A-Z_]*ENABLED["']\]|\.[A-Z_]*ENABLED)\s*[!=]==?\s*["']true["']/,
];

const LAYOUT_GATE = [/notFound\s*\(/, /redirect\s*\(/, /\bauth\s*\(|getServerSession/, /isPagePublic|isApiRoutePublic|isStatsPublic/];

function ancestorGated(rel) {
  let dir = dirname(join(APP, rel));
  while (dir.startsWith(APP)) {
    const l = join(dir, "layout.tsx");
    try {
      const src = strip(readFileSync(l, "utf8"));
      if (LAYOUT_GATE.some((re) => re.test(src))) return true;
    } catch { /* none */ }
    if (dir === APP) break;
    dir = dirname(dir);
  }
  return false;
}

const findings = [];
let scanned = 0;

for (const file of walk(APP)) {
  const rel = relative(APP, file);
  if (rel.startsWith("admin" + "\\") || rel.startsWith("auth" + "\\")) continue;

  const pageSrc = strip(readFileSync(file, "utf8"));
  scanned++;

  // Depth 1: does the page itself name keep-out material?
  const direct = matches(pageSrc);
  const selfGated = SELF_GATE.some((re) => re.test(pageSrc));

  // Depth 2: does it reach one through a local import?
  const reached = [];
  for (const m of pageSrc.matchAll(/from\s+"([^"]+)"/g)) {
    const target = resolveLocal(m[1], file);
    if (!target) continue;
    if (!target.startsWith(join(WEB, "lib")) && !target.startsWith(join(WEB, "components"))) continue;
    const hit = matches(strip(readFileSync(target, "utf8")));
    if (hit.length) reached.push({ mod: relative(WEB, target), hit });
  }

  if (!direct.length && !reached.length) continue;
  if (selfGated) continue;
  if (ancestorGated(rel)) continue;

  findings.push({
    rel: rel.replace(/\\/g, "/"),
    zone: rel.startsWith("cockpit") ? "cockpit(session-gated)" : rel.startsWith("api") ? "api" : "page",
    direct: direct.join(","),
    reached: reached.map((r) => `${r.mod} [${r.hit.join(",")}]`),
  });
}

console.log(`scanned ${scanned} files; UNGATED findings: ${findings.length}\n`);
for (const f of findings) {
  console.log(`== ${f.rel}  (${f.zone})`);
  if (f.direct) console.log(`    direct: ${f.direct}`);
  for (const r of f.reached) console.log(`    via:    ${r}`);
}
