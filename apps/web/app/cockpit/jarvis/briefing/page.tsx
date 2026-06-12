/**
 * Morning briefing — Layer G of Executive Intelligence v2.
 * The owner's entry point: one page, everything that matters, nothing else.
 */

import Link from "next/link";
import { loadOwnerSummaryServer } from "@/lib/jarvis/summary-loader";
import {
  buildAllDepartmentReports,
  buildIntelligenceBriefing,
} from "@/lib/jarvis/department-reports";
import { buildSelfModel, summarizeSelfModelForOwner } from "@/lib/jarvis/self-knowledge";

export const dynamic = "force-dynamic";

export default async function JarvisBriefingPage() {
  const { summary, error } = await loadOwnerSummaryServer();

  if (!summary) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-slate-900 p-6">
        <h1 className="font-display text-xl text-white">Morning briefing unavailable</h1>
        <p className="mt-2 text-sm text-slate-300">
          Jarvis could not assemble the OwnerSummary: {error ?? "unknown cause"}. That itself
          is the headline — fix the assessment path before anything else.
        </p>
      </div>
    );
  }

  const reports = buildAllDepartmentReports(summary);
  const briefing = buildIntelligenceBriefing(reports, summary);
  const selfModel = buildSelfModel(summary);

  return (
    <div className="space-y-5 pb-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
          Jarvis · Morning briefing · {briefing.generatedAt.slice(0, 16).replace("T", " ")} UTC
        </p>
        <h1 className="mt-1 font-display text-2xl text-white">{briefing.executiveSummary}</h1>
      </header>

      {/* 1 — Needs your decision */}
      <section className="rounded-xl border border-yellow-700/50 bg-slate-900 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-yellow-300">
          Needs your decision — {briefing.ownerDecisionQueue.length}
        </h2>
        {briefing.ownerDecisionQueue.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nothing. Your queue is clear.</p>
        ) : (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200">
            {briefing.ownerDecisionQueue.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        )}
      </section>

      {/* 2 — Running fine */}
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-emerald-300">
          Running fine — no action needed
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {briefing.healthyDepartments.length > 0
            ? briefing.healthyDepartments.join(" · ")
            : "No department currently reports fully healthy — see attention list below."}
        </p>
      </section>

      {/* 3 — Attention/degraded */}
      {(briefing.criticalDepartments.length > 0 || briefing.attentionDepartments.length > 0) && (
        <section className="rounded-xl border border-orange-700/50 bg-slate-900 p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-orange-300">
            Awareness — no decision required yet
          </h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-200">
            {reports
              .filter(
                (r) =>
                  r.healthLevel === "CRITICAL" ||
                  r.healthLevel === "DEGRADED" ||
                  r.healthLevel === "ATTENTION"
              )
              .map((r) => (
                <li key={r.department}>
                  <span className="font-semibold text-white">{r.department}</span>{" "}
                  <span className="font-mono text-[10px] uppercase text-orange-300">
                    {r.healthLevel}
                  </span>{" "}
                  — {r.oneLiner}
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 4 — Next build */}
      <section className="rounded-xl border border-blue-800/60 bg-slate-900 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-blue-300">Next build</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
          {briefing.topThreeActions.length > 0 ? (
            briefing.topThreeActions.map((a) => <li key={a}>{a}</li>)
          ) : (
            <li>Hold course — keep accumulating settled picks toward the performance gate.</li>
          )}
        </ul>
      </section>

      {/* 5 — Self-knowledge */}
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
          What Jarvis knows — and doesn&apos;t
        </h2>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">
          {summarizeSelfModelForOwner(selfModel)}
        </pre>
      </section>

      <nav className="flex gap-4 text-sm">
        <Link
          href="/cockpit/jarvis/conversation"
          className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-600"
        >
          Talk to Jarvis →
        </Link>
        <Link
          href="/cockpit"
          className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
        >
          Full cockpit
        </Link>
      </nav>
    </div>
  );
}
