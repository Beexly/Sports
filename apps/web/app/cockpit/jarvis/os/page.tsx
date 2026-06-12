import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import {
  buildOwnerSummary,
  type OwnerSummary,
} from "@/lib/cockpit/owner-summary";
import {
  buildJarvisOSState,
  buildStubOwnerSummaryForOS,
} from "@/lib/jarvis/os-state";
import { buildJarvisMemoryStatus } from "@/lib/jarvis/memory-protocol";
import { buildToolRouterStatus } from "@/lib/jarvis/tool-router";
import { buildAuditLedgerStatus } from "@/lib/jarvis/audit-ledger";
import { buildImprovementLoopStatus } from "@/lib/jarvis/improvement-loop";
import { PROMPT_LIBRARY } from "@/lib/jarvis/prompt-library";
import {
  JarvisOSMap,
  JarvisScribeInbox,
  JarvisMemoryStatus,
  JarvisToolRouter,
  JarvisPromptLibrary,
  JarvisActionQueue,
  JarvisAuditLedger,
  JarvisImprovementLoop,
  JarvisVoiceConsole,
} from "@/components/jarvis";

/**
 * /cockpit/jarvis/os — admin-only (gated by the cockpit layout).
 *
 * Jarvis OS — Operating Intelligence Map. Composes every OS layer into one
 * honest view: what is wired, what is partial, what is not wired, and what
 * requires owner approval. Falls back to a stub OwnerSummary when the live
 * assessment is unavailable (OS layer statuses are static truth either way).
 */

export const dynamic = "force-dynamic";

export default async function JarvisOSPage() {
  let summary: OwnerSummary;
  try {
    const { assessment, performancePolicy } = await loadJarvisAssessment();
    summary = buildOwnerSummary({
      assessment,
      performancePolicy,
      gates: getReadinessGates(),
      todayPickCount: 0,
    });
  } catch {
    summary = buildStubOwnerSummaryForOS(new Date().toISOString());
  }

  const osState = buildJarvisOSState(summary);
  const memoryStatus = buildJarvisMemoryStatus();
  const toolStatus = buildToolRouterStatus();
  const auditStatus = buildAuditLedgerStatus();
  const improvementStatus = buildImprovementLoopStatus();

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header>
        <h1 className="text-2xl font-bold text-white">
          Jarvis OS — Operating Intelligence Map
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {osState.wiredCount} of {osState.operatingLoopPhases.length} phases wired ·{" "}
          {osState.partialCount} partial · {osState.notWiredCount} not wired. Statuses
          are honest — nothing is claimed as live before it is. Assessed{" "}
          {osState.assessedAt}.
        </p>
      </header>

      <JarvisOSMap osState={osState} />

      <div className="grid gap-4 lg:grid-cols-2">
        <JarvisScribeInbox />
        <JarvisMemoryStatus status={memoryStatus} />
      </div>

      <JarvisToolRouter status={toolStatus} />
      <JarvisPromptLibrary prompts={PROMPT_LIBRARY} />

      <div className="grid gap-4 lg:grid-cols-2">
        <JarvisActionQueue />
        <JarvisVoiceConsole />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JarvisAuditLedger status={auditStatus} />
        <JarvisImprovementLoop status={improvementStatus} />
      </div>
    </div>
  );
}
