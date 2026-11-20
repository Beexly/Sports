#!/usr/bin/env node
/**
 * verify-skills-integrity.mjs — Enforces clean frontmatter, valid repo paths,
 * writing-for-agents structure, free-first settlement doctrine, active ledger
 * policy, invocation guards, and .claude <-> .agents parity across skills.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const CORE_17 = [
  "autonomy-kernel",
  "calibration-pipeline",
  "checkout-attempt",
  "claude-delegate",
  "clearance",
  "clearance-registry",
  "coding-agent",
  "deploy-readiness",
  "dspy-gepa",
  "grok-delegate",
  "gse-connected-game-workflow",
  "inference-routing",
  "max-leverage",
  "model-promotion-gate",
  "polymarket-hold",
  "settlement-free-path",
  "stripe-webhook",
];

const MANUAL_ONLY_SLUGS = new Set([
  "claude-delegate",
  "grok-delegate",
  "session-close",
]);

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { ok: false, error: "missing or unclosed YAML frontmatter" };
  const fm = m[1];
  const body = m[2];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : "";
  const hasDesc = /^description:\s*\S/m.test(fm);
  const disableModel = /^disable-model-invocation:\s*true\s*$/m.test(fm);
  return { ok: true, fm, body, name, hasDesc, disableModel };
}

function listSkillDirs(rootDir) {
  if (!existsSync(rootDir)) return [];
  return readdirSync(rootDir)
    .map((entry) => ({ entry, full: join(rootDir, entry) }))
    .filter(({ entry }) => entry !== "README.md");
}

function scanBrokenPatterns(text, relLabel) {
  const errors = [];
  const forbiddenLiterals = [
    ["Beexly/Sports/", "corrupted repo prefix Beexly/Sports/"],
    ["apps/mobile/Beexly/Sports/", "corrupted mobile prefix apps/mobile/Beexly/Sports/"],
    ["workspace/references/", "corrupted path workspace/references/"],
    ["/workspace/resources/", "corrupted path /workspace/resources/"],
    ["workspace/assets/", "corrupted path workspace/assets/"],
    ["scripts/ops/connected-workflow-dossier-guard.py", "moved script path (now scripts/guardrails/connected-workflow-dossier-guard.py)"],
    ["packages/prediction-engine/src/equations/index.ts", "nonexistent file (use packages/mcp-equations-server/src/thousand-equation-registry.ts)"],
    ["packages/prediction-engine/src/models/wireable-dispatch.ts", "moved file (now packages/prediction-engine/src/wireable-dispatch.ts)"],
    ["data/nflverse/play_by_play_2026.parquet", "missing worktree PBP path (use data/nflverse/pbp_2026_w1_w10.parquet or intelligence/coaching/data/play_by_play_2026.parquet)"],
    ["data/engine/week9_live_roster_transactions_and_starters_2026.json", "moved path (now data/nflverse/week{WEEK}_live_roster_transactions_and_starters_2026.json)"],
    ["docs/dfs/research/2026-11-07/dk-200pt-situational-dfs-and-projection-receipt.json", "nonexistent DFS receipt path (use docs/dfs/research/<YYYY-MM-DD>/)"],
    [".claude/.stop-override", "forbidden stop-override instruction"],
    ["within the GSE/GSI pipeline", "injected false GSE/GSI boilerplate"],
    ["in the GSE/GSI stack", "injected false GSE/GSI boilerplate"],
  ];

  for (const [needle, reason] of forbiddenLiterals) {
    if (text.includes(needle)) {
      errors.push(`${relLabel}: ${reason}`);
    }
  }

  const forbiddenRegexes = [
    [/^## Use this skill when\r?\n\r?\n- Working on `[^`]+` tasks:/m, "injected automated wrapper boilerplate"],
    [/\bnpm run calibrate\b/, "nonexistent npm run calibrate (use npm run calibration:offline)"],
    [/free only (?:if|when)\s+`?THE_ODDS_API_KEY`?\s+is\s+\*{0,2}absent/i, "obsolete pre-2026-09-02 free-only-when-absent rule"],
    [/Free only when key\s+\*{0,2}ABSENT/i, "obsolete pre-2026-09-02 free-only-when-absent rule"],
    [/(?<!\d)62-23-1(?!\d)/, "voided Nov 5 62-23-1 batch referenced in skill"],
    [/Panel B:\s*16-5\b/i, "prohibited pre-Week-8 16-5 Panel B ledger mandate"],
    [/47-19-1\s*\(\+24\.92u\)\s*\|\s*Base\s*38-13-1/i, "superseded 47-19-1 / 38-13-1 cited as active standing ledger"],
    [/Synced non-recursive skill definition in domain/i, "empty 8-line placeholder stub"],
    [/description:\s*'[^']*\.\.\.'/m, "truncated single-quoted YAML description"],
    [/description:.*\n\s+\(use \.\.\.'/m, "truncated multiline YAML description"],
    [/Re-run Stage 3\. Compare with\s*$/m, "truncated mid-sentence file ending"],
    [/Look for the \*\*"Sample Code"\*\* or \*\*"Use this\s*$/m, "truncated mid-sentence file ending"],
  ];

  for (const [re, reason] of forbiddenRegexes) {
    if (re.test(text)) {
      errors.push(`${relLabel}: ${reason}`);
    }
  }

  // Check duplicate "## When to Use" / "## Use this skill when" headings
  const whenHeadings = text.match(/^## (?:Use this skill when|When to [Uu]se)\b/gm) ?? [];
  if (whenHeadings.length > 1) {
    errors.push(`${relLabel}: duplicate trigger headings (${whenHeadings.join(", ")})`);
  }

  return errors;
}

export function validateRepoSkills(repoRoot, options = {}) {
  const errors = [];
  const claudeRoot = join(repoRoot, ".claude", "skills");
  const agentsRoot = join(repoRoot, ".agents", "skills");
  const checkParity = options.checkParity !== false;

  for (const [rootLabel, rootDir] of [
    [".claude/skills", claudeRoot],
    [".agents/skills", agentsRoot],
  ]) {
    if (!existsSync(rootDir)) {
      errors.push(`Missing skills root: ${rootLabel}`);
      continue;
    }

    for (const { entry, full } of listSkillDirs(rootDir)) {
      const st = statSync(full);
      if (!st.isDirectory()) {
        errors.push(`${rootLabel}/${entry}: non-directory entry (broken symlink pointer or stray file)`);
        continue;
      }
      const sm = join(full, "SKILL.md");
      if (!existsSync(sm)) {
        errors.push(`${rootLabel}/${entry}: missing SKILL.md`);
        continue;
      }

      const raw = readFileSync(sm, "utf8");
      const relLabel = `${rootLabel}/${entry}/SKILL.md`;
      const fm = parseFrontmatter(raw);
      if (!fm.ok) {
        errors.push(`${relLabel}: ${fm.error}`);
        continue;
      }
      if (fm.name !== entry) {
        errors.push(`${relLabel}: frontmatter name '${fm.name}' !== directory '${entry}'`);
      }
      if (!fm.hasDesc) {
        errors.push(`${relLabel}: missing description in frontmatter`);
      }
      if (MANUAL_ONLY_SLUGS.has(entry) && !fm.disableModel) {
        errors.push(`${relLabel}: manual-only skill missing 'disable-model-invocation: true'`);
      }

      errors.push(...scanBrokenPatterns(raw, relLabel));

      // Scan bundled markdown references inside skill directories
      const refsDir = join(full, "references");
      if (existsSync(refsDir) && statSync(refsDir).isDirectory()) {
        for (const rFile of readdirSync(refsDir)) {
          if (!rFile.endsWith(".md")) continue;
          const refRaw = readFileSync(join(refsDir, rFile), "utf8");
          errors.push(...scanBrokenPatterns(refRaw, `${rootLabel}/${entry}/references/${rFile}`));
        }
      }
    }
  }

  if (checkParity) {
    for (const name of CORE_17) {
      const cPath = join(claudeRoot, name, "SKILL.md");
      const aPath = join(agentsRoot, name, "SKILL.md");
      if (!existsSync(cPath) || !existsSync(aPath)) {
        errors.push(`parity: missing ${name} in .claude/skills or .agents/skills`);
        continue;
      }
      const cRaw = readFileSync(cPath, "utf8").replace(/\r\n/g, "\n");
      const aRaw = readFileSync(aPath, "utf8").replace(/\r\n/g, "\n");
      if (cRaw !== aRaw) {
        errors.push(`parity: ${name}/SKILL.md differs between .claude/skills and .agents/skills`);
      }
    }
  }

  return errors;
}

if (import.meta.url === `file:///${resolve(process.argv[1] || "").replace(/\\/g, "/")}`) {
  const repoRoot = resolve(import.meta.dirname, "../..");
  const errs = validateRepoSkills(repoRoot);
  if (errs.length > 0) {
    console.error(`[verify-skills-integrity] FAIL (${errs.length} issue(s)):`);
    for (const e of errs) console.error(`  - ${e}`);
    process.exit(1);
  }
  const cCount = listSkillDirs(join(repoRoot, ".claude/skills")).length;
  const aCount = listSkillDirs(join(repoRoot, ".agents/skills")).length;
  console.log(`[verify-skills-integrity] OK (.claude=${cCount}, .agents=${aCount}, parity=${CORE_17.length}/${CORE_17.length})`);
}
