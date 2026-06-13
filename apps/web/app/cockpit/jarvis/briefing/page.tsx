import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { buildOwnerSummary } from "@/lib/cockpit/owner-summary";
import {
  buildIntelligenceState,
  buildLiveMemoryStatus,
} from "@/lib/jarvis/intelligence-state";
import {
  buildAllDepartmentReports,
  buildIntelligenceBriefing,
  generateMorningBriefing,
  type DepartmentReport,
  type DeptHealthLevel,
} from "@/lib/jarvis/department-reports";
import {
  buildSelfModel,
  summarizeSelfModelForOwner,
} from "@/lib/jarvis/self-knowledge";
import { db } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

// ─── Health level styling ──────────────────────────────────────────────────────

function healthColor(level: DeptHealthLevel): string {
  switch (level) {
    case "CRITICAL":
      return "text-red-400";
    case "DEGRADED":
      return "text-orange-400";
    case "ATTENTION":
      return "text-yellow-400";
    case "HEALTHY":
      return "text-emerald-400";
    default:
      return "text-slate-400";
  }
}

function healthBg(level: DeptHealthLevel): string {
  switch (level) {
    case "CRITICAL":
      return "border-red-800 bg-red-950/30";
    case "DEGRADED":
      return "border-orange-800 bg-orange-950/30";
    case "ATTENTION":
      return "border-yellow-800/60 bg-yellow-950/20";
    case "HEALTHY":
      return "border-emerald-900 bg-emerald-950/20";
    default:
      return "border-slate-700 bg-slate-900/40";
  }
}

// ─── Department card ───────────────────────────────────────────────────────────

function DepartmentCard({ report }: { report: DepartmentReport }) {
  return (
    <div className={`rounded-lg border p-3 ${healthBg(report.healthLevel)}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {report.department.replace(/_/g, " ")}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${healthColor(report.healthLevel)}`}
        >
          {report.healthLevel}
        </span>
      </div>
      <p className="text-xs text-slate-300">{report.oneLiner}</p>
      {report.topRisk && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Risk: {report.topRisk}
        </p>
      )}
      {report.recommendedAction && (
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          → {report.recommendedAction}
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function JarvisBriefingPage() {
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
          Jarvis assessment unavailable — database connection required.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Reload once the database is reachable.
        </p>
      </div>
    );
  }

  const summary = buildOwnerSummary({
    assessment: jarvis.assessment,
    performancePolicy: jarvis.performancePolicy,
    gates,
    todayPickCount,
  });

  const memory = await buildLiveMemoryStatus();
  const osState = { ...buildIntelligenceState(summary), memory };

  const reports = buildAllDepartmentReports(summary);
  const briefing = buildIntelligenceBriefing(reports, osState);
  const morningText = generateMorningBriefing(summary, osState);
  const selfModel = buildSelfModel(summary, osState);
  const selfSummary = summarizeSelfModelForOwner(selfModel);

  const overallColorClass =
    summary.overallColor === "GREEN"
      ? "text-emerald-400"
      : summary.overallColor === "RED"
        ? "text-red-400"
        : "text-yellow-400";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Jarvis Morning Briefing
          </p>
          <h1 className="text-xl font-bold text-slate-100">{today}</h1>
          <p className={`mt-1 text-sm font-semibold ${overallColorClass}`}>
            Platform {summary.overallColor} — {summary.oneLiner}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cockpit/jarvis/conversation"
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            Talk to Jarvis →
          </Link>
          <Link
            href="/cockpit/jarvis/os"
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            OS Map →
          </Link>
        </div>
      </div>

      {/* 1. Executive summary */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Executive Summary
        </p>
        <p className="text-sm leading-relaxed text-slate-100">
          {briefing.executiveSummary}
        </p>
      </section>

      {/* 2. Needs your decision */}
      {briefing.ownerDecisionQueue.length > 0 && (
        <section className="rounded-xl border border-yellow-800/60 bg-yellow-950/20 p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-yellow-500">
            Needs Your Decision ({briefing.ownerDecisionQueue.length})
          </p>
          <ol className="space-y-2">
            {briefing.ownerDecisionQueue.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-bold text-yellow-600">
                  {i + 1}.
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3. Running fine */}
      {briefing.healthyDepartments.length > 0 && (
        <section className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Running Fine — No Action Needed ({briefing.healthyDepartments.length})
          </p>
          <p className="text-sm text-slate-300">
            {briefing.healthyDepartments.join(" · ")}
          </p>
        </section>
      )}

      {/* 4. Degraded / Attention departments */}
      {(briefing.criticalDepartments.length > 0 ||
        briefing.attentionDepartments.length > 0) && (
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Department Status
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reports
              .filter(
                (r) =>
                  r.healthLevel !== "HEALTHY" && r.healthLevel !== "UNKNOWN",
              )
              .map((r) => (
                <DepartmentCard key={r.agentId} report={r} />
              ))}
          </div>
        </section>
      )}

      {/* 5. Next build */}
      {briefing.topThreeActions.length > 0 && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Next Build
          </p>
          <p className="text-sm font-medium text-slate-200">
            {briefing.topThreeActions[0]}
          </p>
          {briefing.topThreeActions.slice(1).map((action, i) => (
            <p key={i} className="mt-1 text-xs text-slate-500">
              {i + 2}. {action}
            </p>
          ))}
        </section>
      )}

      {/* 6. Jarvis self-knowledge summary */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Jarvis Self-Knowledge ({selfModel.confidenceLevel} confidence)
        </p>
        <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500">
          {selfSummary}
        </pre>
      </section>

      {/* Raw morning briefing (collapsible) */}
      <details className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-widest text-slate-600 hover:text-slate-400">
          Full morning briefing text
        </summary>
        <pre className="mt-4 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500">
          {morningText}
        </pre>
      </details>

      {/* Navigation */}
      <div className="flex gap-3 text-[11px]">
        <Link href="/cockpit/jarvis/conversation" className="text-slate-500 hover:text-slate-300">
          Talk to Jarvis
        </Link>
        <span className="text-slate-700">·</span>
        <Link href="/cockpit/jarvis/os" className="text-slate-500 hover:text-slate-300">
          OS Map
        </Link>
        <span className="text-slate-700">·</span>
        <Link href="/cockpit" className="text-slate-500 hover:text-slate-300">
          Cockpit home
        </Link>
      </div>
    </div>
  );
}
