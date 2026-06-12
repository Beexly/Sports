"use client";

import { useState } from "react";
import {
  dispatchTask,
  getAllAvailableTaskCategories,
  getAgentForCategory,
  getPromptForCategory,
  getRecommendedBotForCategory,
  summarizeDispatchPlan,
  type TaskCategory,
  type DispatchPlan,
} from "@/lib/jarvis/task-dispatch";
import { getBotById } from "@/lib/jarvis/bot-registry";
import { getCouncilMember } from "@/lib/jarvis/agent-council";

/**
 * Jarvis Task Dispatch — cockpit panel for the dispatch system.
 *
 * Displays all available task categories. For each one the owner can see
 * the dispatch plan summary, the owning agent, the recommended bot, and
 * the full ready-to-run prompt they can copy into Claude Code or Fable.
 *
 * The panel is read-only in the UI — no actual execution happens here.
 * Dispatching produces a DispatchPlan; the owner launches the session.
 */

const CATEGORY_DESCRIPTIONS: Readonly<Record<TaskCategory, string>> = {
  BUILD: "Build a new feature end-to-end with tests and server-side gating.",
  FIX: "Investigate and fix a failing test, type error, or runtime bug.",
  DATA_CHECK: "Audit ingestion freshness, adapter health, and rights compliance.",
  CONTENT_RUN: "Draft content from approved picks data. Drafts only — humans publish.",
  CALIBRATION_REVIEW: "Review confidence calibration against the canonical settled ledger.",
  OVERNIGHT_LOOP: "Run the full test suite, typecheck, and lint; triage failures into a morning report.",
  DESIGN_PASS: "Review UI/UX surfaces against cockpit doctrine.",
  QA_PASS: "Run targeted QA with regression prevention focus.",
  SECURITY_REVIEW: "Review security posture: secrets, auth, scraping clearance, webhooks.",
  AGENT_BRIEFING: "Prepare a briefing on the current OS layer state for handoff.",
};

const RISK_STYLES: Readonly<Record<string, string>> = {
  LOW: "text-green-400 border-green-900/40 bg-green-900/10",
  MEDIUM: "text-yellow-400 border-yellow-900/40 bg-yellow-900/10",
  HIGH: "text-orange-400 border-orange-900/40 bg-orange-900/10",
  CRITICAL: "text-red-400 border-red-900/40 bg-red-900/10",
};

const BUDGET_LABEL: Readonly<Record<string, string>> = {
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  EXTENDED: "XL",
};

// Use a fixed proposedAt for deterministic plans in the UI
const FIXED_PROPOSED_AT = "2026-01-01T00:00:00.000Z";

export function JarvisTaskDispatch() {
  const categories = getAllAvailableTaskCategories();
  const [selected, setSelected] = useState<TaskCategory | null>(null);
  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSelect(category: TaskCategory) {
    if (selected === category) {
      setSelected(null);
      setPlan(null);
      return;
    }
    try {
      const p = dispatchTask(
        CATEGORY_DESCRIPTIONS[category].split(".")[0] ?? category,
        category,
        {},
        FIXED_PROPOSED_AT
      );
      setSelected(category);
      setPlan(p);
      setCopied(false);
    } catch {
      setSelected(null);
      setPlan(null);
    }
  }

  async function handleCopy() {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan.fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available in this environment — no-op
    }
  }

  return (
    <section
      data-testid="jarvis-task-dispatch"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Task Dispatch
        </h2>
        <span className="rounded border border-purple-900/60 bg-purple-900/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-400">
          {categories.length} categories · jarvis-as-director
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Select a category to see the dispatch plan and copy the ready-to-run prompt into
        Claude Code or Fable. No code runs here — the owner launches the session.
      </p>

      {/* Category grid */}
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {categories.map((category) => {
          const agentId = getAgentForCategory(category);
          const agent = getCouncilMember(agentId);
          const botId = getRecommendedBotForCategory(category);
          const bot = botId ? getBotById(botId) : undefined;
          const isSelected = selected === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleSelect(category)}
              className={
                "rounded-lg border px-2.5 py-2 text-left transition-colors " +
                (isSelected
                  ? "border-purple-700 bg-purple-950/60"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-200">
                  {category}
                </span>
                {bot && (
                  <span className="text-[8px] uppercase tracking-widest text-slate-500">
                    {bot.name.replace("Claude Code ", "")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[9px] leading-snug text-slate-400">
                {CATEGORY_DESCRIPTIONS[category]}
              </p>
              {agent && (
                <p className="mt-0.5 text-[8px] text-slate-600">
                  {agent.codename} — {agent.role}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Dispatch plan detail */}
      {plan && selected && (
        <div className="mt-4 rounded-xl border border-purple-900/40 bg-purple-950/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-bold text-purple-300">
              {selected} dispatch plan
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={
                  "rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase " +
                  (RISK_STYLES[plan.riskLevel] ?? "text-slate-400")
                }
              >
                {plan.riskLevel}
              </span>
              <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                {BUDGET_LABEL[plan.estimatedTokenBudget]} budget
              </span>
              {plan.approvalRequired ? (
                <span className="rounded border border-yellow-900/40 bg-yellow-900/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-yellow-400">
                  approval req
                </span>
              ) : (
                <span className="rounded border border-green-900/40 bg-green-900/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-green-400">
                  no approval
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 grid gap-1 text-[9px] sm:grid-cols-2">
            <Detail label="Owning agent" value={plan.owningAgent} />
            <Detail label="Template" value={plan.promptTemplate} />
            <Detail label="Task ID" value={plan.taskId} />
            <Detail label="Tools" value={plan.toolsRequired.join(", ") || "none"} />
          </div>

          {/* Summary line */}
          <p className="mt-2 text-[9px] leading-snug text-slate-400">
            {summarizeDispatchPlan(plan)}
          </p>

          {/* Checkpoints */}
          <div className="mt-2">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
              Checkpoints
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-3.5">
              {plan.checkpoints.map((c) => (
                <li key={c} className="text-[9px] text-slate-400">
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Rollback */}
          <div className="mt-2">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
              Rollback
            </p>
            <p className="mt-0.5 text-[9px] leading-snug text-slate-400">
              {plan.rollbackPlan}
            </p>
          </div>

          {/* Full prompt */}
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
                Full prompt — copy into Claude Code / Fable
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded border border-purple-700 bg-purple-950/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-purple-300 transition-colors hover:bg-purple-900/40"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="mt-1 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-[9px] leading-relaxed text-slate-300 whitespace-pre-wrap">
              {plan.fullPrompt}
            </pre>
          </div>

          {/* Scribe instructions */}
          <div className="mt-2">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
              Scribe
            </p>
            <p className="mt-0.5 text-[9px] leading-snug text-slate-400">
              {plan.scribeInstructions}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-widest text-slate-600">{label}</p>
      <p className="font-mono text-[9px] text-slate-300">{value}</p>
    </div>
  );
}
