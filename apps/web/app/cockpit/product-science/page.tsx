import type { Metadata } from "next";
import { EXPERIMENT_REGISTRY } from "@/lib/experiments/experiments";
import type { ExperimentStatus } from "@/lib/experiments/experiments";

export const metadata: Metadata = {
  title: "Product Science — Cockpit",
  robots: { index: false, follow: false },
};

const STATUS_COLOR: Record<ExperimentStatus, string> = {
  draft: "text-gray-500 border-gray-700",
  ready: "text-cyan-400 border-cyan-800",
  running: "text-emerald-400 border-emerald-800",
  paused: "text-amber-400 border-amber-800",
  shipped: "text-violet-400 border-violet-800",
  "rolled-back": "text-red-400 border-red-800",
};

const RISK_COLOR: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

export default function ProductSciencePage() {
  return (
    <div className="space-y-8 px-6 py-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          Cockpit · Product Science
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Experiment Registry</h1>
        <p className="mt-1 text-sm text-gray-400">
          {EXPERIMENT_REGISTRY.length} experiment{EXPERIMENT_REGISTRY.length !== 1 ? "s" : ""} ·
          all from <code className="font-mono text-[11px] text-gray-400">lib/experiments/experiments.ts</code>
        </p>
      </header>

      <div className="space-y-4">
        {EXPERIMENT_REGISTRY.map((exp) => (
          <div
            key={exp.id}
            className="rounded-2xl border border-mineral bg-gray-900/60 p-5 space-y-3"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span className="font-mono text-[9px] text-gray-500">{exp.id}</span>
              <span
                className={[
                  "rounded border px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest",
                  STATUS_COLOR[exp.status],
                ].join(" ")}
              >
                {exp.status}
              </span>
              <span className={["font-mono text-[9px]", RISK_COLOR[exp.riskClass]].join(" ")}>
                {exp.riskClass} risk
              </span>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-gray-600">Hypothesis</p>
              <p className="mt-0.5 text-sm text-gray-300">{exp.hypothesis}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gray-600">Primary metric</p>
                <p className="mt-0.5 text-sm text-gray-400">
                  <span className="text-white">{exp.primary.event}</span>
                  {" "}· {exp.primary.direction} · +{(exp.primary.expectedLift * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gray-600">
                  Guardrails ({exp.guardrails.length})
                </p>
                {exp.guardrails.map((g) => (
                  <p key={g.event} className="mt-0.5 text-sm text-gray-400">
                    {g.event} · max {(g.maxRegression * 100).toFixed(0)}% regression
                    {g.blocking && (
                      <span className="ml-1 font-mono text-[8px] text-red-400 uppercase">blocking</span>
                    )}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gray-600">Success condition</p>
                <p className="mt-0.5 text-sm text-gray-400">{exp.successCondition}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gray-600">Rollback condition</p>
                <p className="mt-0.5 text-sm text-gray-400">{exp.rollbackCondition}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
              <span>owner: {exp.owner}</span>
              {exp.surfaces.length > 0 && (
                <span>surfaces: {exp.surfaces.join(", ")}</span>
              )}
              {exp.startISO && <span>start: {exp.startISO}</span>}
              {exp.endISO && <span>end: {exp.endISO}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
