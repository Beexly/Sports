/**
 * Meaning Integrity Audit — a runnable instrument over the compiled ClaimObject corpus.
 *
 *   npm run meaning:audit                # human report
 *   npm run meaning:audit -- --format json
 *
 * Compiles the whole fixture corpus through the Meaning Compiler and checks the ten integrity
 * invariants (every object anatomically complete; nothing exceeds its engines; fixtures capped at
 * INFO_ONLY; at least one visible refusal; every prediction on trial, every trend/stat passported; web
 * evidence never fact; every downgrade names a known engine; no banned copy). Pure, deterministic, no
 * network, no spend. Exit 0 = clean, 1 = an integrity violation. Spec: docs/frontier-night/MEANING_INTEGRITY_AUDIT.md.
 */

import { compileAllFixtures, validateClaimObject, type ClaimObject } from "@sports/decision-field-runtime";

const KNOWN_ENGINES = new Set(["SourceLineage", "isForbidden", "RightsEnvelope", "knowableAt", "composeAuthority"]);
const BANNED = /\block\b|\bguarantee(d)?\b|\bsure thing\b|\bprofit\b|\brisk-free\b|\bbet now\b|\bbest bet\b/i;

interface Violation {
  readonly check: string;
  readonly subject: string;
  readonly detail: string;
}

function audit(corpus: readonly ClaimObject[]): { violations: Violation[]; refusals: number } {
  const v: Violation[] = [];
  const push = (check: string, c: ClaimObject, detail: string) => v.push({ check, subject: c.subject, detail });

  for (const c of corpus) {
    // 1 + 2 — anatomically complete + validates against the engines
    if (!validateClaimObject(c).ok) push("validate", c, validateClaimObject(c).problems.join("; "));
    if (c.sourceLineage.originRefs.length === 0 && c.publicExpression !== "INFO_ONLY") push("lineage", c, "unsourced yet above INFO_ONLY");
    // 3 + 4 — fixture honesty
    if (!c.fixtureWatermarked) push("watermark", c, "fixture object not watermarked");
    if (c.fixtureWatermarked && c.publicSafe) push("publicSafe", c, "watermarked object marked publicSafe");
    if (c.publicExpression !== "INFO_ONLY") push("fixture-ceiling", c, `exceeds INFO_ONLY (${c.publicExpression})`);
    // 6 — trials/passports
    if (c.objectType === "PREDICTION" && !c.autopsyHook.hasTrial) push("prediction-trial", c, "prediction without a trial");
    if (c.objectType === "TREND" && !c.sourceLineage.proofRefs.some((r) => /trend-passport/.test(r))) push("trend-passport", c, "trend without a passport");
    if (c.objectType === "DERIVED_STAT" && !c.sourceLineage.proofRefs.some((r) => /stat-passport/.test(r))) push("stat-passport", c, "stat without a passport");
    // 7 — web evidence never fact
    if (c.objectType === "WEB_EVIDENCE" && (c.publicSafe || c.publicExpression !== "INFO_ONLY")) push("web-evidence", c, "web evidence escaped INFO_ONLY");
    // 9 — memory loop
    if (!c.autopsyHook.settlesWhen || !c.memoryWrite.metricKey) push("memory", c, "missing autopsy/memory plan");
    // 10 — every downgrade names a known engine
    for (const d of c.explain.downgrades) if (!KNOWN_ENGINES.has(d.engine)) push("engine", c, `unknown downgrade engine "${d.engine}"`);
    // 8 — no banned copy in the public-facing strings
    for (const s of [c.subject, c.semantic.plainText, c.explain.allowedToMean, c.explain.authorityStory]) {
      const m = s.match(BANNED);
      if (m) push("copy", c, `banned phrase "${m[0]}"`);
    }
  }

  // 5 — at least one visible refusal
  const refusals = corpus.filter((c) => c.lifecycle === "DO_NOT_USE").length;
  if (refusals === 0) v.push({ check: "refusal", subject: "(corpus)", detail: "no visible refusal — the institution must be able to say 'this cannot be shown'" });

  return { violations: v, refusals };
}

const corpus = compileAllFixtures();
const { violations, refusals } = audit(corpus);
const byType = corpus.reduce<Record<string, number>>((acc, c) => ((acc[c.objectType] = (acc[c.objectType] ?? 0) + 1), acc), {});
const format = (process.argv.includes("--format") ? process.argv[process.argv.indexOf("--format") + 1] : "text").toLowerCase();

if (format === "json") {
  process.stdout.write(
    JSON.stringify(
      {
        corpus: corpus.length,
        refusals,
        byType,
        infoOnly: corpus.filter((c) => c.publicExpression === "INFO_ONLY").length,
        violations,
        verdict: violations.length === 0 ? "CLEAN" : "VIOLATIONS",
      },
      null,
      2,
    ) + "\n",
  );
} else {
  const lines = [
    `Meaning Integrity Audit — ${corpus.length} compiled ClaimObjects`,
    `  object types: ${Object.entries(byType).map(([k, n]) => `${k}:${n}`).join(" · ")}`,
    `  INFO_ONLY: ${corpus.filter((c) => c.publicExpression === "INFO_ONLY").length}/${corpus.length} · visible refusals: ${refusals}`,
    ``,
    ...(violations.length === 0
      ? [`  ✓ CLEAN — every object compiled through the grammar; none exceeds its engines.`]
      : violations.map((x) => `  ✗ [${x.check}] ${x.subject}: ${x.detail}`)),
    ``,
    `  Fixture-only · no network · no spend. Not advice.`,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

process.exit(violations.length === 0 ? 0 : 1);
