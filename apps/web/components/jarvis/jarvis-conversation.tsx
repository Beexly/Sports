"use client";

/**
 * Jarvis Conversation UI — Layer F
 *
 * Executive conversation panel for talking to Jarvis. This is not a chatbot
 * widget — it is a professional operational interface where Jarvis speaks in
 * executive register.
 *
 * Rules:
 *   - All responses come from buildJarvisResponse() — no model API calls.
 *   - Priority color coding: CRITICAL=red, URGENT=orange, ATTENTION=yellow, ROUTINE=none.
 *   - requiresApproval messages show an approve/reject action.
 *   - Quick-action chips for common intents.
 *   - Session context sidebar: facts, decisions, dispatched tasks.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  buildJarvisResponse,
  appendMessage,
  createSession,
  type ConversationSession,
  type ConversationMessage,
  type MessagePriority,
  type JarvisOSState,
} from "@/lib/jarvis/conversation-engine";
import {
  createSessionContext,
  addFact,
  buildContextSummary,
  buildSessionHandoff,
  type SessionContext,
} from "@/lib/jarvis/session-memory";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface JarvisConversationProps {
  initialSummary: OwnerSummary;
  osState: JarvisOSState;
  sessionId?: string;
}

// ─── Priority styling ──────────────────────────────────────────────────────────

function priorityBorderClass(priority: MessagePriority): string {
  switch (priority) {
    case "CRITICAL":
      return "border-l-4 border-red-500";
    case "URGENT":
      return "border-l-4 border-orange-500";
    case "ATTENTION_REQUIRED":
      return "border-l-4 border-yellow-500";
    case "ROUTINE":
    default:
      return "border-l-4 border-transparent";
  }
}

function priorityBadgeClass(priority: MessagePriority): string {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-900/60 text-red-300";
    case "URGENT":
      return "bg-orange-900/60 text-orange-300";
    case "ATTENTION_REQUIRED":
      return "bg-yellow-900/60 text-yellow-300";
    case "ROUTINE":
    default:
      return "bg-slate-700 text-slate-400";
  }
}

// ─── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Run today", input: "run today" },
  { label: "Morning briefing", input: "status" },
  { label: "What needs me?", input: "what needs me" },
  { label: "What's blocked?", input: "what's blocked" },
  { label: "Dispatch overnight loop", input: "dispatch overnight loop" },
  { label: "How are we doing?", input: "how are we doing" },
] as const;

// ─── Message component ─────────────────────────────────────────────────────────

function JarvisMessageBubble({
  message,
  onApprove,
  onReject,
}: {
  message: ConversationMessage;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const isJarvis = message.role === "JARVIS";

  if (!isJarvis) {
    return (
      <div className="flex justify-end" data-testid="owner-message">
        <div className="max-w-[70%] rounded-lg bg-blue-900/60 px-4 py-3 text-sm text-blue-100">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg bg-slate-800 p-4 text-sm ${priorityBorderClass(message.priority)}`}
      data-testid="jarvis-message"
      data-priority={message.priority}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Jarvis
        </span>
        {message.priority !== "ROUTINE" && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${priorityBadgeClass(message.priority)}`}
          >
            {message.priority.replace("_", " ")}
          </span>
        )}
        {message.intent && (
          <span className="ml-auto text-[10px] text-slate-600">
            intent: {message.intent}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="leading-relaxed text-slate-100">{message.content}</p>

      {/* Dispatch plan summary */}
      {message.dispatchPlan && (
        <div className="mt-3 rounded border border-slate-600 bg-slate-900/60 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Dispatch Plan
          </p>
          <p className="text-xs text-slate-300">
            <span className="font-semibold">Category:</span>{" "}
            {message.dispatchPlan.category}
          </p>
          <p className="text-xs text-slate-300">
            <span className="font-semibold">Route:</span>{" "}
            {message.dispatchPlan.sequence.join(" → ")}
          </p>
          <p className="text-xs text-slate-300">
            <span className="font-semibold">Impact:</span>{" "}
            {message.dispatchPlan.estimatedImpact}
          </p>
          {message.dispatchPlan.preparedPrompt && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-400">
                View prepared prompt
              </summary>
              <p className="mt-1 rounded bg-slate-950 p-2 text-[11px] font-mono text-slate-400">
                {message.dispatchPlan.preparedPrompt}
              </p>
            </details>
          )}
        </div>
      )}

      {/* Action items */}
      {message.actionItems.length > 0 && (
        <ul className="mt-3 space-y-1">
          {message.actionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="mt-0.5 text-slate-600">›</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* Approval buttons */}
      {message.requiresApproval && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApprove?.(message.id)}
            className="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/60"
          >
            Approve
          </button>
          <button
            onClick={() => onReject?.(message.id)}
            className="rounded border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-700"
          >
            Reject
          </button>
        </div>
      )}

      {/* Confidence */}
      <div className="mt-2 text-[10px] text-slate-600">
        confidence: {message.confidence} ·{" "}
        {new Date(message.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

// ─── Session context sidebar ───────────────────────────────────────────────────

function SessionContextPanel({
  context,
  onScribe,
}: {
  context: SessionContext;
  onScribe: () => void;
}) {
  const activeFacts = context.facts.filter((f) => !f.supersededBy);
  return (
    <aside className="w-56 shrink-0 space-y-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Session Context
        </p>
        <p className="text-[11px] text-slate-400">{buildContextSummary(context)}</p>
      </div>

      {activeFacts.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Facts ({activeFacts.length})
          </p>
          <ul className="space-y-1">
            {activeFacts.slice(0, 5).map((f) => (
              <li key={f.id} className="text-[10px] text-slate-500">
                <span className="font-medium text-slate-400">
                  {f.factType.toLowerCase().replace(/_/g, " ")}:
                </span>{" "}
                {f.content.slice(0, 60)}
                {f.content.length > 60 ? "…" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {context.decisionsThisSession.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Decisions ({context.decisionsThisSession.length})
          </p>
          {context.decisionsThisSession.slice(0, 3).map((d, i) => (
            <p key={i} className="text-[10px] text-slate-500">
              · {d.slice(0, 50)}
            </p>
          ))}
        </div>
      )}

      {context.tasksDispatchedThisSession.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Dispatched ({context.tasksDispatchedThisSession.length})
          </p>
          {context.tasksDispatchedThisSession.slice(0, 3).map((t, i) => (
            <p key={i} className="text-[10px] text-slate-500">
              · {t.slice(0, 50)}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={onScribe}
        className="w-full rounded border border-slate-600 px-2 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-slate-800"
      >
        Scribe this session
      </button>
    </aside>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function JarvisConversation({
  initialSummary,
  osState,
  sessionId,
}: JarvisConversationProps) {
  const sid = sessionId ?? `session_${Date.now()}`;
  const [session, setSession] = useState<ConversationSession>(() =>
    createSession(sid),
  );
  const [context, setContext] = useState<SessionContext>(() =>
    createSessionContext(sid, new Date().toISOString()),
  );
  const [input, setInput] = useState("");
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [scribeOutput, setScribeOutput] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setInput("");

      // Owner message
      const ownerMsg: ConversationMessage = {
        id: `msg_owner_${Date.now()}`,
        role: "OWNER",
        content: text,
        timestamp: new Date().toISOString(),
        priority: "ROUTINE",
        actionItems: [],
        requiresApproval: false,
        confidence: "HIGH",
      };

      const sessionWithOwner = appendMessage(session, ownerMsg);

      // Jarvis response
      const jarvisMsg = buildJarvisResponse(
        text,
        sessionWithOwner,
        initialSummary,
        osState,
      );

      const finalSession = appendMessage(sessionWithOwner, jarvisMsg);
      setSession(finalSession);

      // Update context with any dispatch
      if (jarvisMsg.dispatchPlan) {
        setContext((prev) =>
          addFact(prev, {
            factType: "TASK_DISPATCHED",
            content: jarvisMsg.dispatchPlan!.description,
            derivedFrom: "DispatchPlan",
            confidence: "HIGH",
            timestamp: jarvisMsg.timestamp,
          }),
        );
      }

      inputRef.current?.focus();
    },
    [session, initialSummary, osState],
  );

  const handleApprove = useCallback((id: string) => {
    setApprovedIds((prev) => new Set([...prev, id]));
    setContext((prev) =>
      addFact(prev, {
        factType: "OWNER_DECISION",
        content: `Approved message ${id}`,
        derivedFrom: "Owner approval",
        confidence: "HIGH",
        timestamp: new Date().toISOString(),
      }),
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setRejectedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleScribe = useCallback(() => {
    const handoff = buildSessionHandoff(context);
    setScribeOutput(
      `# ${handoff.title}\n\n${handoff.body}\n\nVault path: ${handoff.vaultPath ?? "N/A"}`,
    );
  }, [context]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main conversation area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">
              Jarvis Executive Console
            </h1>
            <p className="text-xs text-slate-500">
              Session {sid} ·{" "}
              {session.ownerDecisionsPending > 0
                ? `${session.ownerDecisionsPending} pending approval`
                : "no pending approvals"}
            </p>
          </div>
          <a
            href="/cockpit/jarvis/briefing"
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            Morning briefing →
          </a>
        </div>

        {/* Quick actions */}
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.input}
              onClick={() => sendMessage(qa.input)}
              className="rounded border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-slate-500 hover:text-slate-200"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Message thread */}
        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
          {session.messages.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-600">
              <p className="font-medium">Jarvis is ready.</p>
              <p className="mt-1 text-xs">
                Use a quick action above or type your question below.
              </p>
            </div>
          )}

          {session.messages.map((msg) => (
            <JarvisMessageBubble
              key={msg.id}
              message={msg}
              onApprove={
                approvedIds.has(msg.id) || rejectedIds.has(msg.id)
                  ? undefined
                  : handleApprove
              }
              onReject={
                approvedIds.has(msg.id) || rejectedIds.has(msg.id)
                  ? undefined
                  : handleReject
              }
            />
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask Jarvis anything about platform operations…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>

      {/* Session context sidebar */}
      <SessionContextPanel context={context} onScribe={handleScribe} />

      {/* Scribe output modal */}
      {scribeOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Session Handoff — Vault Export
              </h2>
              <button
                onClick={() => setScribeOutput(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded bg-slate-950 p-4 text-[12px] font-mono text-slate-400">
              {scribeOutput}
            </pre>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(scribeOutput);
              }}
              className="mt-4 w-full rounded border border-slate-600 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
