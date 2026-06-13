import Link from "next/link";
import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { buildOwnerSummary } from "@/lib/cockpit/owner-summary";
import {
  buildIntelligenceState,
  buildMemoryStatus,
} from "@/lib/jarvis/intelligence-state";
import { buildSelfModel } from "@/lib/jarvis/self-knowledge";
import { buildAllDepartmentReports } from "@/lib/jarvis/department-reports";
import { AGENT_COUNCIL, getCouncilSeatCounts } from "@/lib/jarvis/agent-council";
import { CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { db } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function JarvisOSPage() {
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

  const summary = jarvis
    ? buildOwnerSummary({
        assessment: jarvis.assessment,
        performancePolicy: jarvis.performancePolicy,
        gates,
        todayPickCount,
      })
    : null;

  const memory = await buildMemoryStatus();
  const osState = summary
    ? { ...buildIntelligenceState(summary), memory }
    : null;

  const selfModel = summary && osState ? buildSelfModel(summary, osState) : null;
  const deptReports = summary ? buildAllDepartmentReports(summary) : [];
  const councilCounts = getCouncilSeatCounts();

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Jarvis OS Map
          </p>
          <h1 className="text-xl font-bold text-slate-100">
            Galaxy Sports Edge — Operating Structure
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {summary
              ? `Assessed ${summary.assessedAt.slice(0, 16).replace("T", " ")} UTC · ${summary.overallColor}`
              : "Assessment unavailable"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/cockpit/jarvis/briefing"
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            Morning briefing
          </Link>
          <Link
            href="/cockpit/jarvis/conversation"
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            Talk to Jarvis
          </Link>
        </div>
      </div>

      {/* Operating loop */}
      {osState && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            Operating Loop (Sense → Improve)
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {osState.operatingLoop.map((phase) => (
              <div
                key={phase.phase}
                className={`rounded-lg border p-3 ${
                  phase.status === "WIRED"
                    ? "border-emerald-900 bg-emerald-950/20"
                    : phase.status === "PARTIAL"
                      ? "border-yellow-800/60 bg-yellow-950/20"
                      : "border-slate-700 bg-slate-900/40"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {phase.phase}
                </p>
                <p
                  className={`mt-0.5 text-[10px] font-semibold ${
                    phase.status === "WIRED"
                      ? "text-emerald-400"
                      : phase.status === "PARTIAL"
                        ? "text-yellow-400"
                        : "text-slate-600"
                  }`}
                >
                  {phase.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Department intelligence */}
      {deptReports.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            Department Intelligence ({deptReports.length} departments)
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {deptReports.map((r) => (
              <div
                key={r.agentId}
                className={`rounded-lg border p-3 ${
                  r.healthLevel === "HEALTHY"
                    ? "border-emerald-900 bg-emerald-950/20"
                    : r.healthLevel === "CRITICAL"
                      ? "border-red-900 bg-red-950/20"
                      : r.healthLevel === "ATTENTION"
                        ? "border-yellow-800/60 bg-yellow-950/20"
                        : "border-slate-700 bg-slate-900/40"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {r.department.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                  {r.oneLiner}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Council counts */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Agent Council ({councilCounts.total} seats)
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: "DRAFT_ONLY",
              count: councilCounts.draftOnly,
              color: "text-blue-400",
            },
            {
              label: "MANUAL",
              count: councilCounts.manual,
              color: "text-yellow-400",
            },
            {
              label: "NOT_WIRED",
              count: councilCounts.notWired,
              color: "text-slate-500",
            },
            {
              label: "COCKPIT AGENTS",
              count: councilCounts.registeredCockpitAgents,
              color: "text-emerald-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-center"
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capability registry summary */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Capability Registry ({CAPABILITY_REGISTRY.length} capabilities)
        </h2>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {CAPABILITY_REGISTRY.map((cap) => (
            <div
              key={cap.id}
              className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/30 px-3 py-2"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  cap.status === "ACTIVE"
                    ? "bg-emerald-500"
                    : cap.status === "DRAFT_ONLY"
                      ? "bg-blue-500"
                      : cap.status === "MANUAL"
                        ? "bg-yellow-500"
                        : "bg-slate-600"
                }`}
              />
              <span className="text-[11px] text-slate-400">{cap.name}</span>
              <span className="ml-auto text-[10px] text-slate-600">
                {cap.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Self-knowledge summary */}
      {selfModel && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-600">
            Jarvis Self-Knowledge
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                Can do ({selfModel.canDoList.length})
              </p>
              <ul className="space-y-0.5">
                {selfModel.canDoList.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-500">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                Cannot do ({selfModel.cannotDoList.length})
              </p>
              <ul className="space-y-0.5">
                {selfModel.cannotDoList.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-500">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Memory status */}
      {osState && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-600">
            Memory Status
          </h2>
          <p className="text-xs text-slate-500">
            {osState.memory.wired ? "Wired (PostgreSQL)" : "Not Connected"}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">{osState.memory.truth}</p>
        </section>
      )}
    </div>
  );
}
