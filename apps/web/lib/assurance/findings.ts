/**
 * AI Setup Assurance — evidence gathering + finding derivation.
 *
 * Deterministic from the repo checkout: registries are imported, file
 * existence is checked, and nothing is inferred from a file's NAME alone —
 * a finding either cites code content/registry state or it doesn't exist.
 * Nothing here is hard-coded against what code disproves: every check reads
 * the live registry/module state, so fixing the underlying gap flips the
 * finding off without touching this file.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CAPABILITY_REGISTRY, getCapability } from "@/lib/jarvis/capability-registry";
import { AGENT_COUNCIL } from "@/lib/jarvis/agent-council";
import { SKILL_MANIFESTS, scanAll, ABSENT_EXTERNAL_SCANNERS } from "@/lib/agent-foundry";
import type { AssuranceFinding } from "./types";

export interface EvidenceContext {
  /** Absolute repo root (apps/web/../..). */
  readonly repoRoot: string;
}

/** Content read for CONTENT-VERIFIED observations (G-12: existence alone must
 * never back a claim about what a file does). Null when unreadable. */
const readIfExists = (ctx: EvidenceContext, rel: string): string | null => {
  try {
    return readFileSync(join(ctx.repoRoot, rel), "utf8");
  } catch {
    return null;
  }
};

export function deriveFindings(ctx: EvidenceContext): readonly AssuranceFinding[] {
  const findings: AssuranceFinding[] = [];
  const memory = getCapability("memory-knowledge-base");
  const toolRouter = getCapability("tool-router-mcp-layer");
  const foundryScans = scanAll(ctx.repoRoot);

  // ── Memory integrity ──────────────────────────────────────────────────────
  if (memory && memory.status === "DESIGNED") {
    findings.push({
      id: "memory-activation-pending",
      category: "memory_integrity",
      title: "Memory store built but not activated (no confirmed production write)",
      evidence: [
        { path: "apps/web/lib/jarvis/capability-registry.ts", observation: `memory-knowledge-base status ${memory.status}` },
        { path: "docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md", observation: "promotion beyond DESIGNED requires a demonstrated write" },
      ],
      whyItMatters:
        "Until a governed write exists, every session re-derives context; the learning plane is idle capacity.",
      risk: "MEDIUM",
      confidence: 0.9,
      smallestValidation: "Owner records one governed memory write and checks /cockpit/memory counts.",
      smallestSafeFix: "Run the activation checklist in JARVIS_MEMORY_PROTOCOL.md (owner action B2).",
      ownerActionRequired: true,
      status: "OPEN",
    });
  }

  // ── Model routing ─────────────────────────────────────────────────────────
  // Codex P2 on #77: the first version of this section declared "no router
  // exists" while lib/claude-api already ships pickModelForSurface (surface →
  // Claude tier, with validated Haiku flips) and provider-dispatch
  // (operator-selected Bedrock/Vertex with Anthropic fallback). Findings are
  // now graded from the REAL routing evidence, in layers:
  //   1. surface-tier router + provider dispatch (exists today) → the honest
  //      gap is lane policy + route telemetry, LOW;
  //   2. neither exists → the original MEDIUM absence finding;
  //   3. shadow lane module present → the not-instrumented finding stacks.
  // G-12: observations below are CONTENT-verified (the file is read and the
  // named symbol found), never inferred from a path existing.
  const routerSrc = readIfExists(ctx, "apps/web/lib/claude-api/model-router.ts");
  const dispatchSrc = readIfExists(ctx, "apps/web/lib/claude-api/provider-dispatch.ts");
  const messagesSrc = readIfExists(ctx, "apps/web/lib/claude-api/messages.ts");
  const surfaceRouterExists =
    routerSrc !== null && routerSrc.includes("pickModelForSurface") && dispatchSrc !== null;
  if (surfaceRouterExists) {
    findings.push({
      id: "model-routing-lanes-missing",
      category: "model_routing",
      title:
        "Model routing is surface-tier + provider dispatch — no task-lane policy or route telemetry yet",
      evidence: [
        { path: "apps/web/lib/claude-api/model-router.ts", observation: "content-verified: exports pickModelForSurface (surface → Claude tier)" },
        { path: "apps/web/lib/claude-api/provider-dispatch.ts", observation: "content-verified: provider dispatch module present and readable" },
        {
          path: "apps/web/lib/claude-api/messages.ts",
          observation:
            messagesSrc !== null && messagesSrc.includes("pickModelForSurface")
              ? "content-verified: messages.ts resolves the surface through pickModelForSurface"
              : "content check: messages.ts does NOT consult pickModelForSurface — router exists but the main call path bypasses it",
        },
      ],
      whyItMatters:
        "Model choice is centralized per surface, but risk/sensitivity/public-claim lanes are not policy, and calls carry no route-lane dimension — per-lane cost/quality cannot be compared yet.",
      risk: "LOW",
      confidence: 1,
      smallestValidation: "Read SURFACE_TIER in model-router.ts and grep call records for a lane field (none).",
      smallestSafeFix: "Ship the shadow lane policy (Workstream E) and reconcile it WITH pickModelForSurface — extend, never duplicate.",
      ownerActionRequired: false,
      status: "OPEN",
    });
  } else {
    findings.push({
      id: "no-model-router",
      category: "model_routing",
      title: "No model routing exists (call sites hardcode a model)",
      evidence: [
        { path: "apps/web/lib/claude-api/", observation: "no model-router/provider-dispatch modules found" },
      ],
      whyItMatters:
        "Task-fit routing (risk, privacy, cost, latency) is unavailable; every task pays one price and depends on one provider's uptime.",
      risk: "MEDIUM",
      confidence: 1,
      smallestValidation: "Check for apps/web/lib/claude-api/model-router.ts.",
      smallestSafeFix: "Centralize model selection per surface before any lane policy work.",
      ownerActionRequired: false,
      status: "OPEN",
    });
  }
  const shadowRouterSrc = readIfExists(ctx, "apps/web/lib/ai-routing/router.ts");
  if (shadowRouterSrc !== null) {
    const shadowSrc = readIfExists(ctx, "apps/web/lib/ai-routing/shadow.ts");
    // FIX 3 (external review): the live-enable flag lives in shadow.ts
    // (isRouterShadowEnabled() reads AI_MODEL_ROUTER_SHADOW_ENABLED) — NOT in
    // router.ts, which touches no env var at all (recommendRoute() is pure
    // policy). Extracting from shadowRouterSrc therefore always matched
    // nothing and this finding always emitted the FALSE fallback claim "no
    // enable flag / promotion is code-review-only", even though a real,
    // default-off gate exists. Extract from shadow.ts and cite shadow.ts.
    const flagMatch =
      shadowSrc?.match(/process\.env\[\s*"([A-Z0-9_]+)"\s*\]/) ??
      shadowSrc?.match(/process\.env\.([A-Z0-9_]+)/) ??
      null;
    const liveFlag = flagMatch?.[1] ?? null;
    findings.push({
      id: "model-router-shadow-only",
      category: "model_routing",
      title: "Lane router exists in shadow mode only — production call sites are not instrumented",
      evidence: [
        {
          path: "apps/web/lib/ai-routing/shadow.ts",
          observation:
            shadowSrc !== null && shadowSrc.includes("shadowRecommend")
              ? "content-verified: exports shadowRecommend (advisory objects only)"
              : "shadow module unreadable or renamed — advisory claim not content-verified",
        },
        {
          path: "apps/web/lib/ai-routing/shadow.ts",
          observation:
            liveFlag !== null
              ? `content-verified: shadowRecommend is gated by ${liveFlag} (extracted from source), default off`
              : "content-verified: no env live-flag found in shadow.ts — promotion is code-review only",
        },
        {
          path: "apps/web/lib/claude-api/messages.ts",
          observation:
            messagesSrc !== null && !messagesSrc.includes("shadowRecommend")
              ? "content-verified: the production call path does not consult shadowRecommend"
              : "content check inconclusive — verify call-site instrumentation manually",
        },
      ],
      whyItMatters:
        "The lane policy cannot earn trust until shadow recommendations are logged beside real calls and evaluated; promotion stays owner-gated.",
      risk: "LOW",
      confidence: 1,
      smallestValidation: "grep call sites for shadowRecommend usage (none yet).",
      smallestSafeFix: "Instrument one internal call site to LOG (not act on) shadow recommendations.",
      ownerActionRequired: false,
      status: "OPEN",
    });
  }

  // ── Skill supply chain ────────────────────────────────────────────────────
  if (ABSENT_EXTERNAL_SCANNERS.length > 0) {
    findings.push({
      id: "no-external-skill-scanner",
      category: "skill_supply_chain",
      title: "No external skill security scanner adopted (baseline only)",
      evidence: [
        { path: "apps/web/lib/agent-foundry/scanner.ts", observation: `externalScannersAbsent: ${ABSENT_EXTERNAL_SCANNERS.length} named` },
      ],
      whyItMatters:
        "The baseline scanner is deterministic string/structure checks; dependency vulnerabilities and deep static analysis are uncovered.",
      risk: "LOW",
      confidence: 1,
      smallestValidation: "Read any Foundry scan report's externalScannersAbsent list.",
      smallestSafeFix: "Evaluate an external scanner via the radar's adoption-dossier path (owner-gated).",
      ownerActionRequired: true,
      status: "OPEN",
    });
  }
  for (const scan of foundryScans.filter((s) => s.blocked)) {
    findings.push({
      id: `foundry-blocked-${scan.manifestId}`,
      category: "skill_supply_chain",
      title: `Manifest ${scan.manifestId} has blocking scan findings`,
      evidence: scan.findings.map((f) => ({
        path: "apps/web/lib/agent-foundry/registry.ts",
        observation: `${f.rule}: ${f.detail}`,
      })),
      whyItMatters: "A blocked manifest must never reach approval.",
      risk: "HIGH",
      confidence: 1,
      smallestValidation: "Re-run scanAll() after the manifest is fixed.",
      smallestSafeFix: "Fix the manifest fields the findings name.",
      ownerActionRequired: false,
      status: "OPEN",
    });
  }

  // ── Tool/MCP governance ───────────────────────────────────────────────────
  if (toolRouter && toolRouter.status === "NOT_WIRED") {
    findings.push({
      id: "tool-router-not-wired",
      category: "tool_mcp_governance",
      title: "No governed agent tool bus exists (MCP layer not wired)",
      evidence: [
        { path: "apps/web/lib/jarvis/capability-registry.ts", observation: `tool-router-mcp-layer status ${toolRouter.status}` },
      ],
      whyItMatters:
        "Until a tool bus with rate limits and audit exists, agent tool use stays manual — correct for safety, but a capability ceiling.",
      risk: "LOW",
      confidence: 0.9,
      smallestValidation: "Registry status check.",
      smallestSafeFix: "Keep manual; design the tool bus behind the Foundry's permission model (queued spec).",
      ownerActionRequired: false,
      status: "OPEN",
    });
  }

  // ── Observability / cost ──────────────────────────────────────────────────
  // G-12: the schema is READ and the claim derived from its content — the
  // finding fires only when ClaudeApiCallRecord verifiably exists AND its
  // model block verifiably lacks a route/lane column. If a lane column ships,
  // this finding turns itself off without touching this file.
  {
    const schemaText = readIfExists(ctx, "packages/db/prisma/schema.prisma");
    if (schemaText !== null && schemaText.includes("model ClaudeApiCallRecord")) {
      const recordBlock = schemaText.match(/model ClaudeApiCallRecord \{[\s\S]*?\n\}/)?.[0] ?? "";
      const hasLaneColumn = /\b(routeLane|taskLane|laneId|routeDimension)\b/.test(recordBlock);
      if (!hasLaneColumn) {
        findings.push({
          id: "telemetry-provider-specific",
          category: "observability_cost",
          title: "AI call telemetry is provider-specific (no route-lane dimension)",
          evidence: [
            {
              path: "packages/db/prisma/schema.prisma",
              observation:
                "content-verified: model ClaudeApiCallRecord exists and its block carries no routeLane/taskLane/laneId/routeDimension column",
            },
          ],
          whyItMatters:
            "Cost and quality cannot be compared per task lane until calls carry a route dimension.",
          risk: "LOW",
          confidence: 1,
          smallestValidation: "grep schema.prisma for a route/lane column on AI call records.",
          smallestSafeFix: "Workstream E documents a dual-write plan; no rename of ClaudeApiCallRecord.",
          ownerActionRequired: false,
          status: "OPEN",
        });
      }
    }
  }

  // ── Documentation truth ───────────────────────────────────────────────────
  // The reconciliation shipped with anti-drift pins; what remains is that
  // stale-doc detection is manual outside the pinned surfaces.
  findings.push({
    id: "doc-drift-detection-partial",
    category: "documentation_truth",
    title: "Anti-drift pins cover memory/CLV surfaces only — other docs rely on review",
    evidence: [
      { path: "apps/web/__tests__/jarvis-capability-registry.test.ts", observation: "truth-sync suite pins memory + CLV claims" },
      { path: "handoff/claude/frontier-intelligence-fabric-2026-07-11/03_CONTRADICTION_LEDGER.md", observation: "C1–C10 fixed 2026-07-11" },
    ],
    whyItMatters: "Docs drifted once; unpinned claims can drift again silently.",
    risk: "LOW",
    confidence: 0.85,
    smallestValidation: "Run the jarvis-capability-registry truth-sync suite.",
    smallestSafeFix: "Extend anti-drift pins when a new capability ships (per-PR review habit).",
    ownerActionRequired: false,
    status: "OPEN",
  });

  // ── Agent governance (positive control verified, no finding when healthy) ─
  // G-10: the tripwire used to compare against a literal autonomy label — a
  // value OUTSIDE the CouncilSeatStatus union, reachable only through an `as`
  // cast, i.e. a dead guard. The real regression signal is CLOSED-SET
  // membership: any seat whose status is not one of the governed manual-only
  // values (including any future autonomy-shaped union expansion) fires this.
  const GOVERNED_SEAT_STATUSES: readonly string[] = ["DRAFT_ONLY", "MANUAL", "NOT_WIRED"];
  const ungoverned = AGENT_COUNCIL.filter((s) => !GOVERNED_SEAT_STATUSES.includes(s.status));
  if (ungoverned.length > 0) {
    findings.push({
      id: "council-autonomy-claimed",
      category: "agent_governance",
      title: "A council seat carries a status outside the governed manual-only set — autonomy invariant broken",
      evidence: ungoverned.map((s) => ({
        path: "apps/web/lib/jarvis/agent-council.ts",
        observation: `seat ${s.id} status "${s.status}" is not in [${GOVERNED_SEAT_STATUSES.join(", ")}]`,
      })),
      whyItMatters: "No seat may be autonomous; this is the platform's core trust rule.",
      risk: "CRITICAL",
      confidence: 1,
      smallestValidation: "Council tests.",
      smallestSafeFix: "Revert the status change.",
      ownerActionRequired: false,
      status: "OPEN",
    });
  }

  // ── Security / outcome quality — NO automated checks exist yet (G-11) ─────
  // Without these explicit findings the two categories scored a vacuous 1.0
  // ("70% inspected, 100% healthy") purely because nothing generated findings
  // for them. Health is capped through the normal scoring path; when real
  // checks ship, they replace these placeholders in the same reviewed diff.
  findings.push({
    id: "security-checks-not-implemented",
    category: "security",
    title: "No automated security findings generator is implemented — the inspected fraction is not verified healthy",
    evidence: [
      {
        path: "apps/web/lib/assurance/findings.ts",
        observation: "deriveFindings emits no security checks; without this finding the category read 1.0 vacuously",
      },
    ],
    whyItMatters:
      "A health number over zero checks is fabricated assurance — the exact claim class this platform bans.",
    risk: "MEDIUM",
    confidence: 1,
    smallestValidation: "Search this file for category: \"security\" generators (only this placeholder exists).",
    smallestSafeFix: "Implement the first real security check (e.g. secret-scan CI wiring assertion) and delete this placeholder in the same diff.",
    ownerActionRequired: false,
    status: "OPEN",
  });
  findings.push({
    id: "outcome-quality-checks-not-implemented",
    category: "outcome_quality",
    title: "No automated outcome-quality findings generator is implemented — the inspected fraction is not verified healthy",
    evidence: [
      {
        path: "apps/web/lib/assurance/findings.ts",
        observation: "deriveFindings emits no outcome-quality checks; without this finding the category read 1.0 vacuously",
      },
    ],
    whyItMatters:
      "A health number over zero checks is fabricated assurance — the exact claim class this platform bans.",
    risk: "MEDIUM",
    confidence: 1,
    smallestValidation: "Search this file for category: \"outcome_quality\" generators (only this placeholder exists).",
    smallestSafeFix: "Wire the calibration/backtest evidence collector as the first real check and delete this placeholder in the same diff.",
    ownerActionRequired: false,
    status: "OPEN",
  });

  // ── Utilization (coverage-limited: no runtime data in this environment) ───
  // G-13: the evidence used to hardcode the manifest count and a status of
  // ACKNOWLEDGED — a count code disproves on the next seed, and an
  // acknowledgment event that never happened. Both are now derived: counts
  // from the registry, status OPEN until a real acknowledgment record exists.
  if (SKILL_MANIFESTS.every((m) => m.lifecycle !== "APPROVED")) {
    const lifecycles = [...new Set(SKILL_MANIFESTS.map((m) => m.lifecycle))].sort().join(", ");
    findings.push({
      id: "foundry-unused",
      category: "utilization_dead_weight",
      title: "No Foundry manifest is APPROVED — the supply chain has no usable skill yet",
      evidence: [
        {
          path: "apps/web/lib/agent-foundry/registry.ts",
          observation: `${SKILL_MANIFESTS.length} manifest(s); lifecycle(s): ${lifecycles}; none APPROVED (derived from registry state)`,
        },
      ],
      whyItMatters: "Expected at this stage; tracked so 'built' never silently equals 'used'.",
      risk: "LOW",
      confidence: 1,
      smallestValidation: "Registry lifecycle states.",
      smallestSafeFix: "Owner reviews a seed manifest when its runner exists (future).",
      ownerActionRequired: true,
      status: "OPEN",
    });
  }

  return findings;
}

/** Registry facts the score step needs (kept here so inspection is one pass). */
export function inspectRegistries() {
  return {
    capabilityCount: CAPABILITY_REGISTRY.length,
    activeCapabilities: CAPABILITY_REGISTRY.filter((c) => c.status === "ACTIVE").length,
    councilSeats: AGENT_COUNCIL.length,
    foundryManifests: SKILL_MANIFESTS.length,
  };
}
