"use client";

/**
 * Jarvis conversation — Layer F of Executive Intelligence v2.
 *
 * An executive conversation surface, not a chatbot widget. Every Jarvis
 * message is computed deterministically by buildJarvisResponse() — no
 * model calls. Priority colors the left border; dispatch plans render
 * with their approval gate; the session can be exported as a vault
 * handoff at any time.
 */

import { useMemo, useState } from "react";
import {
  buildJarvisResponse,
  buildSessionScribe,
  type ConversationMessage,
  type ConversationSession,
  type MessagePriority,
} from "@/lib/jarvis/conversation-engine";
import { renderScribeEntry } from "@/lib/jarvis/scribe-types";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";

const QUICK_ACTIONS: readonly string[] = [
  "Run today",
  "Morning briefing",
  "What needs me?",
  "What's blocked?",
  "How are we doing?",
];

const PRIORITY_BORDER: Record<MessagePriority, string> = {
  CRITICAL: "border-l-red-500",
  URGENT: "border-l-orange-400",
  ATTENTION_REQUIRED: "border-l-yellow-400",
  ROUTINE: "border-l-slate-600",
};

const PRIORITY_LABEL: Record<MessagePriority, string> = {
  CRITICAL: "text-red-400",
  URGENT: "text-orange-300",
  ATTENTION_REQUIRED: "text-yellow-300",
  ROUTINE: "text-slate-500",
};

let ownerSeq = 0;

export function JarvisConversation({ summary }: { summary: OwnerSummary }) {
  const startedAt = useMemo(() => new Date().toISOString(), []);
  const [session, setSession] = useState<ConversationSession>({
    sessionId: `session-${startedAt.slice(0, 10)}`,
    startedAt,
    messages: [],
    openActionItems: [],
    ownerDecisionsPending: summary.decisions.length,
  });
  const [input, setInput] = useState("");
  const [scribeExport, setScribeExport] = useState<string | null>(null);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nowIso = new Date().toISOString();
    ownerSeq += 1;
    const ownerMsg: ConversationMessage = {
      id: `owner-${ownerSeq}`,
      role: "OWNER",
      content: trimmed,
      timestamp: nowIso,
      priority: "ROUTINE",
      actionItems: [],
      requiresApproval: false,
      confidence: "HIGH",
    };
    const reply = buildJarvisResponse(trimmed, session, summary, nowIso);
    setSession((s) => ({
      ...s,
      messages: [...s.messages, ownerMsg, reply],
      openActionItems: [...s.openActionItems, ...reply.actionItems],
    }));
    setInput("");
  }

  function exportScribe() {
    const entry = buildSessionScribe(session, summary, new Date().toISOString());
    setScribeExport(renderScribeEntry(entry));
  }

  const dispatched = session.messages.filter((m) => m.dispatchPlan).length;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900">
      {/* Session context strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-slate-700 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
        <span>{session.messages.length} messages</span>
        <span>{dispatched} dispatched</span>
        <span>{session.openActionItems.length} action items</span>
        <span>{session.ownerDecisionsPending} owner decisions pending</span>
        <button
          onClick={exportScribe}
          className="ml-auto rounded border border-slate-600 px-2 py-0.5 text-slate-300 hover:bg-slate-800"
        >
          Scribe this session
        </button>
      </div>

      {/* Thread */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {session.messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Jarvis is ready. Platform is {summary.overallColor}: {summary.oneLiner}
          </p>
        )}
        {session.messages.map((m) =>
          m.role === "OWNER" ? (
            <div key={m.id} className="ml-auto max-w-[80%] rounded-lg bg-blue-900 px-4 py-2.5">
              <p className="text-sm text-blue-100">{m.content}</p>
            </div>
          ) : (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg border-l-4 bg-slate-800 px-4 py-3 ${PRIORITY_BORDER[m.priority]}`}
            >
              <div className="mb-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
                <span className="text-slate-400">Jarvis</span>
                <span className={PRIORITY_LABEL[m.priority]}>{m.priority.replace(/_/g, " ")}</span>
                <span className="text-slate-600">confidence {m.confidence}</span>
              </div>
              <p className="text-sm leading-6 text-slate-200">{m.content}</p>

              {m.dispatchPlan && (
                <div className="mt-3 rounded border border-slate-600 bg-slate-900/60 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Dispatch plan · {m.dispatchPlan.category} → {m.dispatchPlan.assignedAgentName} · risk{" "}
                    {m.dispatchPlan.riskLevel}
                  </p>
                  <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-slate-300">
                    {m.dispatchPlan.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <p className="mt-2 text-xs text-slate-400">{m.dispatchPlan.approvalNote}</p>
                  {m.requiresApproval && (
                    <p className="mt-2 inline-block rounded border border-yellow-600/50 px-2 py-1 text-xs text-yellow-300">
                      Awaiting your approval — Jarvis prepared this; he did not run it.
                    </p>
                  )}
                </div>
              )}

              {m.actionItems.length > 0 && !m.dispatchPlan && (
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
                  {m.actionItems.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}
      </div>

      {/* Scribe export */}
      {scribeExport && (
        <div className="border-t border-slate-700 bg-slate-950 p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Vault handoff (copy into docs/ai/jarvis/vault/06-memory/)
          </p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-300">
            {scribeExport}
          </pre>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-700 p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Jarvis — a question, or a task to route…"
            className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
