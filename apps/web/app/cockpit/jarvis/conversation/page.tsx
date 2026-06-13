import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { buildOwnerSummary } from "@/lib/cockpit/owner-summary";
import {
  buildIntelligenceState,
  buildMemoryStatus,
} from "@/lib/jarvis/intelligence-state";
import { JarvisConversation } from "@/components/jarvis/jarvis-conversation";
import Link from "next/link";
import { db } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function JarvisConversationPage() {
  const gates = getReadinessGates();
  const now = new Date();

  const todayPickCount = await db.pick
    .count({
      where: {
        isPublished: true,
        generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    .catch(() => 0);

  let jarvis: Awaited<ReturnType<typeof loadJarvisAssessment>> | null = null;
  try {
    jarvis = await loadJarvisAssessment();
  } catch {
    // continue with null
  }

  if (!jarvis) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-8 text-center">
        <p className="text-sm font-semibold text-red-400">
          Jarvis unavailable — database connection required.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Reload once the database is reachable.
        </p>
        <Link
          href="/cockpit/jarvis/briefing"
          className="mt-4 inline-block text-xs text-slate-500 hover:text-slate-300"
        >
          ← Morning briefing
        </Link>
      </div>
    );
  }

  const summary = buildOwnerSummary({
    assessment: jarvis.assessment,
    performancePolicy: jarvis.performancePolicy,
    gates,
    todayPickCount,
  });

  const memory = await buildMemoryStatus();
  const osState = { ...buildIntelligenceState(summary), memory };

  const sessionId = `session_${Date.now()}`;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-[11px] text-slate-600">
        <Link href="/cockpit/jarvis/briefing" className="hover:text-slate-400">
          Morning briefing
        </Link>
        <span>›</span>
        <span className="text-slate-400">Conversation</span>
      </div>

      {/* Conversation component — all interaction is client-side */}
      <JarvisConversation
        initialSummary={summary}
        osState={osState}
        sessionId={sessionId}
      />
    </div>
  );
}
