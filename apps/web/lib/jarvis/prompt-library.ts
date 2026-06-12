/**
 * Jarvis Prompt Library — typed, deterministic prompt templates.
 *
 * The library is code-backed: every template declares its model lane, token
 * budget, forbidden actions, acceptance criteria, validation commands, scribe
 * instructions, and approval boundary. Pure data + accessors, no I/O.
 *
 * Rules:
 *   - No template may instruct evasion, auto-publishing, or fabricated stats.
 *   - Placeholders use {{name}} and are filled by buildPromptFromTemplate.
 *   - suggestNextPrompt is a deterministic heuristic, not a model call.
 */

export type PromptType =
  | "CLAUDE_CODE_TASK"
  | "CODEX_TASK"
  | "DESIGN_REVIEW"
  | "QA_REVIEW"
  | "LEGAL_REVIEW"
  | "DATA_RELIABILITY"
  | "AIRWAVE_TASK"
  | "GSE_BUILD"
  | "GSN_STUDIO"
  | "JARVIS_MEMORY"
  | "OVERNIGHT_RUN";

export type ModelRecommendation = "FABLE_5" | "OPUS_4" | "SONNET_4" | "HAIKU_4" | "ANY";

export interface PromptTemplate {
  readonly id: string;
  readonly title: string;
  readonly type: PromptType;
  readonly purpose: string;
  readonly modelRecommendation: ModelRecommendation;
  readonly tokenBudget: "SMALL" | "MEDIUM" | "LARGE" | "EXTENDED";
  readonly requiredContext: readonly string[];
  readonly forbiddenActions: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly validationCommands: readonly string[];
  readonly scribeInstructions: string;
  readonly approvalBoundary: string;
  readonly templateBody: string;
}

// ─── Library ──────────────────────────────────────────────────────────────────

export const PROMPT_LIBRARY: readonly PromptTemplate[] = [
  {
    id: "jarvis-os-build",
    title: "Jarvis OS feature build",
    type: "CLAUDE_CODE_TASK",
    purpose: "Build or extend a Jarvis OS layer with pure functions, components, docs, and tests.",
    modelRecommendation: "FABLE_5",
    tokenBudget: "EXTENDED",
    requiredContext: [
      "CLAUDE.md non-negotiable rules",
      "Existing files in apps/web/lib/jarvis/ (do not break)",
      "Cockpit styling conventions",
    ],
    forbiddenActions: [
      "Modifying agent-council.ts, capability-registry.ts, or intelligence-state.ts",
      "Claiming a layer is wired when it is not",
      "Adding external dependencies",
      "Using `any` types",
    ],
    acceptanceCriteria: [
      "Typecheck passes (tsc --noEmit)",
      "All new tests pass",
      "Existing tests are not modified and still pass",
      "Statuses in code are honest (NOT_WIRED stays NOT_WIRED)",
    ],
    validationCommands: [
      "npm run typecheck --workspace=apps/web",
      "npx vitest run lib/jarvis/__tests__/",
    ],
    scribeInstructions:
      "Write a RESULT entry (project JARVIS) listing files created and honest layer statuses.",
    approvalBoundary: "Code and docs only. No deploys, no external actions, no schema changes.",
    templateBody:
      "Build the {{layer}} layer of the Jarvis OS on branch {{branch}}.\n" +
      "Preserve all existing files. Pure functions only — no I/O at runtime.\n" +
      "Acceptance: typecheck passes, tests pass, statuses are honest.\n" +
      "When done, write a scribe RESULT entry summarizing what was built.",
  },
  {
    id: "overnight-test-run",
    title: "Overnight full test sweep",
    type: "OVERNIGHT_RUN",
    purpose: "Run the full test suite, typecheck, and lint overnight; triage failures into a morning report.",
    modelRecommendation: "SONNET_4",
    tokenBudget: "LARGE",
    requiredContext: ["package.json scripts", "Current branch state", "Known flaky tests"],
    forbiddenActions: [
      "Deleting or skipping failing tests to make the suite green",
      "Pushing to main",
      "Changing prediction-engine behavior to satisfy a test",
    ],
    acceptanceCriteria: [
      "Every failure has a diagnosis: regression, flake, or environment",
      "Fixes are proposed as drafts, not force-merged",
      "Morning report lists pass/fail counts per workspace",
    ],
    validationCommands: ["npm run test", "npm run typecheck", "npm run lint"],
    scribeInstructions:
      "Write a RESULT entry (project OPS) with pass/fail counts and a TODO entry per unresolved failure.",
    approvalBoundary: "Read and test only. Any code fix is a proposal requiring owner approval.",
    templateBody:
      "Run the full validation sweep for {{scope}}: tests, typecheck, lint.\n" +
      "Triage every failure (regression / flake / environment) and draft fixes.\n" +
      "Do not skip or delete tests. Produce a morning report and scribe entries.",
  },
  {
    id: "data-reliability-check",
    title: "Data ingestion health check",
    type: "DATA_RELIABILITY",
    purpose: "Audit ingestion freshness, adapter health, and rights compliance for all data sources.",
    modelRecommendation: "SONNET_4",
    tokenBudget: "MEDIUM",
    requiredContext: [
      "packages/data-ingestion adapters",
      "Scraping clearance engine rules",
      "Last ingestion timestamps",
    ],
    forbiddenActions: [
      "Bypassing the Scraping Clearance Engine",
      "Marking ingestion healthy without a fresh timestamp",
      "Touching sources with permission_required or excluded status",
    ],
    acceptanceCriteria: [
      "Every adapter has a freshness verdict with timestamp evidence",
      "Rights snapshots verified for extracted records",
      "Stale or failing adapters have a diagnosis and proposed fix",
    ],
    validationCommands: ["npm run test --workspace=packages/data-ingestion"],
    scribeInstructions:
      "Write an OBSERVATION entry (project GSE) per adapter; RISK entries for stale sources.",
    approvalBoundary: "Read-only audit. Adapter fixes and new sources require owner approval.",
    templateBody:
      "Audit ingestion health for {{sources}}. Verify freshness timestamps, " +
      "adapter error rates, and clearance status. Never mark stale data fresh. " +
      "Report findings as scribe OBSERVATION/RISK entries.",
  },
  {
    id: "calibration-review",
    title: "Prediction calibration review",
    type: "QA_REVIEW",
    purpose: "Review confidence calibration against the canonical settled ledger.",
    modelRecommendation: "OPUS_4",
    tokenBudget: "LARGE",
    requiredContext: [
      "Canonical settled picks (bootstrap and pending excluded)",
      "Confidence buckets and observed hit rates",
      "Public performance policy gates",
    ],
    forbiddenActions: [
      "Auto-adjusting model weights — proposals only",
      "Using pending or bootstrap picks in any rate",
      "Presenting the 70% target as an achieved result",
    ],
    acceptanceCriteria: [
      "Calibration table per confidence bucket from canonical data only",
      "Drift findings include sample sizes",
      "Every adjustment is a proposal with a validation plan",
    ],
    validationCommands: ["npm run test --workspace=packages/prediction-engine"],
    scribeInstructions:
      "Write a RESULT entry (project GSE) with the calibration table and DECISION proposals.",
    approvalBoundary:
      "Analysis only. No prediction-engine change ships without owner sign-off and out-of-sample validation.",
    templateBody:
      "Review calibration for {{window}} using canonical settled picks only.\n" +
      "Bucket by confidence, compare observed vs expected, flag drift with sample sizes.\n" +
      "Output proposals — never apply weight changes directly.",
  },
  {
    id: "gse-feature-build",
    title: "GSE feature build",
    type: "GSE_BUILD",
    purpose: "Build a new Galaxy Sports Edge feature end-to-end with tests and server-side gating.",
    modelRecommendation: "FABLE_5",
    tokenBudget: "EXTENDED",
    requiredContext: [
      "CLAUDE.md rules (no fake data, server-side paywalls, tests required)",
      "Prisma schema",
      "Subscription tier definitions",
    ],
    forbiddenActions: [
      "Frontend-only paywall enforcement",
      "Fake or fabricated data anywhere",
      "Shipping without tests",
      "Secrets in code",
    ],
    acceptanceCriteria: [
      "Tests, typecheck, and build all pass",
      "Entitlements enforced server-side",
      "All data sourced from real APIs or the database",
    ],
    validationCommands: [
      "npm run test --workspace=apps/web",
      "npm run typecheck",
      "npm run build",
    ],
    scribeInstructions:
      "Write a RESULT entry (project GSE) with routes, files, and gating decisions.",
    approvalBoundary: "Feature code on a branch. Merges, deploys, and gate flips are owner decisions.",
    templateBody:
      "Build {{feature}} for GSE on branch {{branch}}.\n" +
      "Server-side entitlement checks, real data only, full test coverage.\n" +
      "A task is not complete until tests, types, and build pass.",
  },
  {
    id: "content-generation",
    title: "Airwave content draft",
    type: "AIRWAVE_TASK",
    purpose: "Draft content from approved picks/claims data. Drafts only — humans publish.",
    modelRecommendation: "SONNET_4",
    tokenBudget: "MEDIUM",
    requiredContext: [
      "Approved picks or graded claims data",
      "Brand voice rules (we-voice, no 'AI' on public surfaces)",
      "Public performance policy (what stats may be cited)",
    ],
    forbiddenActions: [
      "Publishing or scheduling anything",
      "Citing pending/bootstrap picks as results",
      "Fabricating quotes, stats, or records",
    ],
    acceptanceCriteria: [
      "Every claim in the draft traces to a data record",
      "Draft lands in the review queue with source coverage notes",
      "Voice rules applied",
    ],
    validationCommands: ["npm run test:brand-safety"],
    scribeInstructions:
      "Write a RESULT entry (project AIRWAVE) linking the draft and its data sources.",
    approvalBoundary: "Draft-only. Publishing requires explicit human approval — no exceptions.",
    templateBody:
      "Draft {{contentType}} from {{dataSource}}. Data-backed claims only; " +
      "cite the record behind every number. Submit to the review queue — do not publish.",
  },
  {
    id: "design-review-pass",
    title: "Design review pass",
    type: "DESIGN_REVIEW",
    purpose: "Review UI/UX surfaces against cockpit doctrine: hierarchy, honesty of status displays, density.",
    modelRecommendation: "OPUS_4",
    tokenBudget: "MEDIUM",
    requiredContext: [
      "Target pages/components",
      "Cockpit dark-theme conventions and status colors",
      "Design doctrine notes (vault DESIGN project)",
    ],
    forbiddenActions: [
      "Changing status semantics to look better (e.g. NOT_WIRED shown as green)",
      "Removing caveats or honesty labels from UI",
      "Introducing new dependencies for styling",
    ],
    acceptanceCriteria: [
      "Findings ranked by severity with file references",
      "Status colors match the convention (green/yellow/slate/blue/purple)",
      "Fix proposals are drafts, not direct pushes",
    ],
    validationCommands: ["npm run lint", "npm run typecheck --workspace=apps/web"],
    scribeInstructions:
      "Write OBSERVATION entries (project DESIGN) per finding, with file references.",
    approvalBoundary: "Review and propose. Visual changes ship only after owner review.",
    templateBody:
      "Review {{surface}} against cockpit design doctrine. Check hierarchy, " +
      "status-color honesty, density, and accessibility. Rank findings; propose fixes as drafts.",
  },
  {
    id: "security-review",
    title: "Security & legal posture review",
    type: "LEGAL_REVIEW",
    purpose: "Review security posture: secrets handling, auth gating, scraping clearance, webhook verification.",
    modelRecommendation: "OPUS_4",
    tokenBudget: "LARGE",
    requiredContext: [
      "Auth and admin-gating patterns",
      "Stripe webhook verification code",
      "Scraping clearance engine and source rights registry",
      "Env var handling",
    ],
    forbiddenActions: [
      "Committing secrets or example secrets that look real",
      "Weakening any clearance or approval gate",
      "Building or recommending evasion tooling",
    ],
    acceptanceCriteria: [
      "Findings classified by severity with exploit scenario",
      "Every cockpit/admin route verified as gated",
      "Scraping posture verified against the rights registry",
    ],
    validationCommands: [
      "npm run test:brand-safety",
      "npx vitest run __tests__/cockpit-routes.test.ts",
    ],
    scribeInstructions:
      "Write RISK entries (project OPS) per finding; CRITICAL findings also go to the decision queue.",
    approvalBoundary:
      "Read-only review. Remediations are proposals; legal-adjacent calls escalate to the owner.",
    templateBody:
      "Run a security/legal review of {{scope}}. Verify secrets hygiene, route gating, " +
      "webhook signatures, and scraping clearance. Report findings as RISK scribe entries " +
      "ranked by severity. Build nothing that evades access controls.",
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

// Returns one template by stable id, or undefined.
export function getPromptById(id: string): PromptTemplate | undefined {
  return PROMPT_LIBRARY.find((p) => p.id === id);
}

// Returns all templates of a given type.
export function getPromptsByType(type: PromptType): readonly PromptTemplate[] {
  return PROMPT_LIBRARY.filter((p) => p.type === type);
}

// Fills {{placeholders}} in the template body from the provided context map.
// Unknown placeholders are left intact so gaps are visible to the operator.
export function buildPromptFromTemplate(
  template: PromptTemplate,
  context: Record<string, string>
): string {
  return template.templateBody.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(context, key) ? context[key]! : match
  );
}

// Deterministic suggestion: match blockers/phase keywords to the most relevant template.
export function suggestNextPrompt(
  currentPhase: string,
  blockers: readonly string[]
): PromptTemplate | null {
  if (PROMPT_LIBRARY.length === 0) return null;

  const haystack = [currentPhase, ...blockers].join(" ").toLowerCase();

  const rules: readonly { keywords: readonly string[]; id: string }[] = [
    { keywords: ["test", "typecheck", "lint", "ci", "overnight"], id: "overnight-test-run" },
    { keywords: ["ingestion", "stale", "adapter", "data", "freshness"], id: "data-reliability-check" },
    { keywords: ["calibration", "settled", "win rate", "confidence"], id: "calibration-review" },
    { keywords: ["security", "secret", "legal", "scraping", "auth"], id: "security-review" },
    { keywords: ["design", "ui", "ux", "layout", "component"], id: "design-review-pass" },
    { keywords: ["content", "draft", "airwave", "blog"], id: "content-generation" },
    { keywords: ["feature", "build", "gse", "paywall", "subscription"], id: "gse-feature-build" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => haystack.includes(k))) {
      const match = getPromptById(rule.id);
      if (match) return match;
    }
  }

  // Default: the OS build prompt — the standing highest-leverage lane.
  return getPromptById("jarvis-os-build") ?? PROMPT_LIBRARY[0] ?? null;
}
