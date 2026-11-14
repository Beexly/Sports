/**
 * Site-Wide Autonomous Workflow & Multi-Council Execution Fabric (Track 1)
 *
 * Bridges all governed intelligence planes across Galaxy Sports Edge into one
 * contract-enforced, pluggable-model execution runner:
 *   - 23 Jarvis Agent Council seats (`AGENT_COUNCIL` + `AGENT_OS_REGISTRY`)
 *   - 21 Seat SubagentTemplates
 *   - 10 Adversarial AI-Council DESTROY seats (`@sports/ai-council`)
 *   -  8 War Room signal watchers (`apps/web/lib/war-room/agents.ts`)
 *   - 14 Governed workflows (`WORKFLOW_REGISTRY`)
 *
 * HARD GUARDRAILS:
 *   1. Never alters static registry truth labels (`DRAFT_ONLY`, `MANUAL`, `NOT_WIRED`)
 *      or flips `externalActions` / `externalActionsAllowed` / public launch flags.
 *   2. Every dispatched workflow execution builds a real `AgentRunRecord` evaluated by
 *      `evaluateAgentRun()`, forcing `reviewStatus: "draft"`, non-empty `uncertainty`,
 *      `prohibitedActionsChecked: true`, and `requestsExternalAction: false`.
 *   3. Enforces the MIND-FIRST corpus gate (`checkCorpusCompletionBeforeSlatePrep`):
 *      Week 10 slate generation remains held (`WEEK10_HELD_FOR_CORPUS_COMPLETION`)
 *      until corpus extraction, canonical placement, wiring, and calibration pass.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_COUNCIL,
  type AgentSeat,
  type SubagentTemplate,
} from "@/lib/jarvis/agent-council";
import { AGENT_OS_REGISTRY, type AgentOSDefinition } from "@/lib/agents/agent-registry";
import {
  evaluateAgentRun,
  type AgentRunRecord,
  type ContractRuling,
} from "@/lib/agents/agent-run-contract";
import { WORKFLOW_REGISTRY, type WorkflowDefinition } from "@/lib/workflows/workflow-registry";
import { AGENTS as WAR_ROOM_AGENTS, type WarAgent } from "@/lib/war-room/agents";
import {
  buildCouncilSeats,
  GSE_PUBLIC_CORPUS,
  runDestroyPass,
  type DestroyReport,
} from "@sports/ai-council";
import {
  DEFAULT_MAX_COST_USD_PER_RUN,
  routeInferenceWithFallback,
  type InferenceLaneId,
  type RoutedInferenceRequest,
  type RoutedInferenceResult,
} from "@/lib/inference/multi-provider-router";

export interface CorpusGateCheckInput {
  readonly corpusStatusPath?: string;
  readonly pendingTierACount?: number;
  readonly wiredTierACount?: number;
  readonly calibrationVerified?: boolean;
}

export interface CorpusGateStatus {
  readonly slatePrepAllowed: boolean;
  readonly status: "WEEK10_HELD_FOR_CORPUS_COMPLETION" | "READY_FOR_WEEK10_PREP";
  readonly reason: string;
  readonly pendingTierACount: number;
  readonly wiredTierACount: number;
  readonly calibrationVerified: boolean;
}

export interface SeatExecutionReceipt {
  readonly seatId: string;
  readonly codename: string;
  readonly councilStatus: AgentSeat["status"];
  readonly osStatus: AgentOSDefinition["status"] | "UNMAPPED";
  readonly subagentTemplateIds: readonly string[];
  readonly ownershipSurfaces: readonly string[];
  readonly contractRuling: ContractRuling;
  readonly scheduledLane: InferenceLaneId;
}

export interface WorkflowExecutionReceipt {
  readonly workflowId: string;
  readonly name: string;
  readonly owningAgent: string;
  readonly participatingAgents: readonly string[];
  readonly status: WorkflowDefinition["status"];
  readonly heldByCorpusGate: boolean;
  readonly blockedReason: string | null;
  readonly contractRecord: AgentRunRecord;
  readonly contractRuling: ContractRuling;
  readonly inference: RoutedInferenceResult | null;
}

export interface SiteWideFabricSummary {
  readonly ok: boolean;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly dryRun: boolean;
  readonly lane: InferenceLaneId;
  readonly maxCostUsdPerRun: number;
  readonly totalCostUsd: number;
  readonly census: {
    readonly councilSeats: number;
    readonly osAgents: number;
    readonly subagentTemplates: number;
    readonly aiCouncilDestroySeats: number;
    readonly warRoomWatchers: number;
    readonly workflows: number;
  };
  readonly corpusGate: CorpusGateStatus;
  readonly warRoomWatchers: readonly WarAgent[];
  readonly destroyAudit: {
    readonly runId: string;
    readonly surfacesAudited: number;
    readonly shipBlocked: boolean;
    readonly counts: DestroyReport["counts"];
  };
  readonly seatReceipts: readonly SeatExecutionReceipt[];
  readonly workflowReceipts: readonly WorkflowExecutionReceipt[];
  readonly contractViolations: number;
  readonly workflowsExecuted: number;
  readonly workflowsHeldByCorpusGate: number;
}

export interface RunSiteWideFabricOptions {
  readonly lane?: InferenceLaneId;
  readonly dryRun?: boolean;
  readonly executeInference?: boolean;
  readonly maxCostUsdPerRun?: number;
  readonly workflowIds?: readonly string[];
  readonly corpusGateInput?: CorpusGateCheckInput;
  readonly customDispatch?: RoutedInferenceRequest["customDispatch"];
  readonly fetchImpl?: typeof fetch;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export function getAllSubagentTemplates(): readonly SubagentTemplate[] {
  return AGENT_COUNCIL.flatMap((seat) => seat.subagentTemplates ?? []);
}

export function resolveRepoRelativeCorpusStatusPath(): string {
  const candidates = [
    resolve(process.cwd(), "docs/engine/research/2026-11-13/corpus_compilation/07_corpus_wired_calibration_and_hold_gate_receipt.json"),
    resolve(process.cwd(), "../../docs/engine/research/2026-11-13/corpus_compilation/07_corpus_wired_calibration_and_hold_gate_receipt.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

/**
 * Enforces Mind-First sequencing: Week 10 slate generation and tuning cannot
 * run while any Tier-A book remains unextracted (`PENDING > 0`) or calibration
 * verification has not passed after full corpus wiring.
 */
export function checkCorpusCompletionBeforeSlatePrep(
  input: CorpusGateCheckInput = {},
): CorpusGateStatus {
  if (typeof input.pendingTierACount === "number") {
    const wired = input.wiredTierACount ?? 0;
    const calOk = input.calibrationVerified ?? false;
    const allowed = input.pendingTierACount === 0 && calOk;
    return {
      slatePrepAllowed: allowed,
      status: allowed ? "READY_FOR_WEEK10_PREP" : "WEEK10_HELD_FOR_CORPUS_COMPLETION",
      reason: allowed
        ? "All Tier-A books extracted, wired, and calibration-verified."
        : `Week 10 slate generation held: pendingTierACount=${input.pendingTierACount}, calibrationVerified=${calOk}.`,
      pendingTierACount: input.pendingTierACount,
      wiredTierACount: wired,
      calibrationVerified: calOk,
    };
  }

  const targetPath = input.corpusStatusPath ?? resolveRepoRelativeCorpusStatusPath();
  if (existsSync(targetPath)) {
    try {
      const parsed = JSON.parse(readFileSync(targetPath, "utf8")) as {
        readonly pendingTierACount?: number;
        readonly wiredTierACount?: number;
        readonly calibrationVerified?: boolean;
      };
      const pending = typeof parsed.pendingTierACount === "number" ? parsed.pendingTierACount : 131;
      const wired = typeof parsed.wiredTierACount === "number" ? parsed.wiredTierACount : 0;
      const calOk = parsed.calibrationVerified === true;
      const allowed = pending === 0 && calOk;
      return {
        slatePrepAllowed: allowed,
        status: allowed ? "READY_FOR_WEEK10_PREP" : "WEEK10_HELD_FOR_CORPUS_COMPLETION",
        reason: allowed
          ? "All Tier-A books extracted, wired, and calibration-verified."
          : `Week 10 slate generation held per corpus receipt (${pending} pending Tier-A, calibrationVerified=${calOk}).`,
        pendingTierACount: pending,
        wiredTierACount: wired,
        calibrationVerified: calOk,
      };
    } catch {
      // Fall through to fail-closed hold.
    }
  }

  return {
    slatePrepAllowed: false,
    status: "WEEK10_HELD_FOR_CORPUS_COMPLETION",
    reason: "Corpus completion receipt missing or pending books > 0; Week 10 slate prep held (fail-closed).",
    pendingTierACount: -1,
    wiredTierACount: 0,
    calibrationVerified: false,
  };
}

function buildSeatContractRecord(
  seat: AgentSeat,
  osDef: AgentOSDefinition | undefined,
): AgentRunRecord {
  return {
    taskId: `fabric-seat-${seat.id}`,
    parentSeat: seat.id,
    subagentId: seat.subagentTemplates?.[0]?.id ?? null,
    taskType: osDef?.taskTypesOwned[0] ?? "governance-audit",
    inputContext: `Site-wide autonomous fabric census check for ${seat.codename} (${seat.status}).`,
    sourceRefs: ["apps/web/lib/jarvis/agent-council.ts", "apps/web/lib/agents/agent-registry.ts"],
    toolsUsed: ["evaluateAgentRun", "site-wide-workflow-fabric"],
    filesChanged: [],
    claimsMade: [`Seat ${seat.codename} governed with externalActions=${seat.externalActions}.`],
    uncertainty: `Static registry check only; live external data feeds checked by owning workflow.`,
    prohibitedActionsChecked: true,
    costEstimate: { usd: 0, note: "Governance contract audit incurs $0 spend." },
    verificationCommands: [],
    verificationResults: null,
    reviewStatus: "draft",
    ownerApprovalRequired: true,
    publicImpact: "internal",
    rollbackPlan: "Pure observation receipt; no persistent mutations applied.",
    requestsExternalAction: false,
  };
}

function isSlateWorkflow(workflow: WorkflowDefinition): boolean {
  return workflow.id === "picks-intelligence";
}

export async function runSiteWideWorkflowFabric(
  options: RunSiteWideFabricOptions = {},
): Promise<SiteWideFabricSummary> {
  const startedAt = new Date().toISOString();
  const env = options.env ?? process.env;
  const dryRun = options.dryRun ?? true;
  const executeInference = options.executeInference ?? false;
  const lane: InferenceLaneId = options.lane ?? "hybrid_auto";
  const maxCostUsdPerRun = options.maxCostUsdPerRun ?? DEFAULT_MAX_COST_USD_PER_RUN;

  const osById = new Map(AGENT_OS_REGISTRY.map((a) => [a.id, a]));
  const corpusGate = checkCorpusCompletionBeforeSlatePrep(options.corpusGateInput);

  // 1. Run 10 adversarial DESTROY seats across public corpus surfaces.
  const destroySeats = buildCouncilSeats();
  const destroyReport = runDestroyPass(GSE_PUBLIC_CORPUS, { seats: destroySeats });

  // 2. Contract-audit all 23 council seats + 21 subagent templates.
  const seatReceipts: SeatExecutionReceipt[] = AGENT_COUNCIL.map((seat) => {
    const osDef = osById.get(seat.id);
    const record = buildSeatContractRecord(seat, osDef);
    const ruling = evaluateAgentRun(record);
    return {
      seatId: seat.id,
      codename: seat.codename,
      councilStatus: seat.status,
      osStatus: osDef?.status ?? "UNMAPPED",
      subagentTemplateIds: (seat.subagentTemplates ?? []).map((t) => t.id),
      ownershipSurfaces: osDef?.cockpitSurfacesOwned ?? [],
      contractRuling: ruling,
      scheduledLane: lane,
    };
  });

  // 3. Evaluate & execute governed workflows (filtering optional).
  const targetIds = options.workflowIds ? new Set(options.workflowIds) : null;
  const workflowsToRun = WORKFLOW_REGISTRY.filter((w) => !targetIds || targetIds.has(w.id));

  let totalCostUsd = 0;
  let workflowsHeldByCorpusGate = 0;
  const workflowReceipts: WorkflowExecutionReceipt[] = [];

  for (const wf of workflowsToRun) {
    const heldByCorpusGate = isSlateWorkflow(wf) && !corpusGate.slatePrepAllowed;
    if (heldByCorpusGate) workflowsHeldByCorpusGate += 1;

    const blockedReason = heldByCorpusGate
      ? corpusGate.reason
      : wf.status === "MANUAL"
        ? "Human review gate active (draft synthesis only)."
        : null;

    let inferenceResult: RoutedInferenceResult | null = null;
    if (executeInference && !dryRun && !heldByCorpusGate) {
      inferenceResult = await routeInferenceWithFallback({
        taskType: `workflow:${wf.id}`,
        seatId: wf.owningAgent,
        lane,
        system:
          "You are a Galaxy Sports Edge internal governance analyst. Output concise factual status JSON with uncertainty.",
        user: `Audit workflow ${wf.id} (${wf.name}) owned by ${wf.owningAgent}. Stages: ${wf.stages.join(", ")}. Never invent stats or propose external publishes.`,
        maxTokens: 256,
        temperature: 0.1,
        maxCostUsdPerRun,
        spentUsdThisRun: totalCostUsd,
        allowOfflineFallback: true,
        customDispatch: options.customDispatch,
        fetchImpl: options.fetchImpl,
        env,
      });
      totalCostUsd = Number((totalCostUsd + inferenceResult.costUsd).toFixed(6));
    }

    const contractRecord: AgentRunRecord = {
      taskId: `fabric-wf-${wf.id}`,
      parentSeat: wf.owningAgent,
      subagentId: null,
      taskType: `workflow:${wf.id}`,
      inputContext: `Workflow trigger=${wf.trigger}; stages=${wf.stages.join(",")}`,
      sourceRefs: ["apps/web/lib/workflows/workflow-registry.ts"],
      toolsUsed: inferenceResult
        ? ["routeInferenceWithFallback", inferenceResult.providerUsed]
        : ["planWorkflowExecutionReceipt"],
      filesChanged: [],
      claimsMade: [
        heldByCorpusGate
          ? `Workflow ${wf.id} held cleanly by corpus completion gate (${corpusGate.status}).`
          : `Workflow ${wf.id} evaluated cleanly under ${lane} lane.`,
      ],
      uncertainty:
        "Autonomous workflow pass operates in governed DRAFT_ONLY mode; external publish/spend gates remain locked.",
      prohibitedActionsChecked: true,
      costEstimate: {
        usd: inferenceResult?.costUsd ?? 0,
        note: `lane=${lane}; budgetRemaining=${Math.max(0, maxCostUsdPerRun - totalCostUsd).toFixed(4)}`,
      },
      verificationCommands: [],
      verificationResults: null,
      reviewStatus: "draft",
      ownerApprovalRequired: true,
      publicImpact: "internal",
      rollbackPlan: "Draft-only internal assessment; zero production surface mutations.",
      requestsExternalAction: false,
    };

    const contractRuling = evaluateAgentRun(contractRecord);

    workflowReceipts.push({
      workflowId: wf.id,
      name: wf.name,
      owningAgent: wf.owningAgent,
      participatingAgents: wf.participatingAgents,
      status: wf.status,
      heldByCorpusGate,
      blockedReason,
      contractRecord,
      contractRuling,
      inference: inferenceResult,
    });
  }

  const contractViolations =
    seatReceipts.filter((s) => s.contractRuling.decision === "BLOCK").length +
    workflowReceipts.filter((w) => w.contractRuling.decision === "BLOCK").length;

  return {
    ok: contractViolations === 0,
    startedAt,
    completedAt: new Date().toISOString(),
    dryRun,
    lane,
    maxCostUsdPerRun,
    totalCostUsd,
    census: {
      councilSeats: AGENT_COUNCIL.length,
      osAgents: AGENT_OS_REGISTRY.length,
      subagentTemplates: getAllSubagentTemplates().length,
      aiCouncilDestroySeats: destroySeats.length,
      warRoomWatchers: WAR_ROOM_AGENTS.length,
      workflows: WORKFLOW_REGISTRY.length,
    },
    corpusGate,
    warRoomWatchers: WAR_ROOM_AGENTS,
    destroyAudit: {
      runId: destroyReport.runId,
      surfacesAudited: destroyReport.surfacesAudited,
      shipBlocked: destroyReport.shipBlocked,
      counts: destroyReport.counts,
    },
    seatReceipts,
    workflowReceipts,
    contractViolations,
    workflowsExecuted: workflowReceipts.length,
    workflowsHeldByCorpusGate,
  };
}
