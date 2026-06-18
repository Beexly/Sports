"use client";

/**
 * DecisionActions — the owner's four-button control on a transitionable task.
 *
 * Cloned from budget-override-control.tsx: fetch POST → router.refresh() inside
 * a useTransition. A button is disabled unless its target status is an allowed
 * transition. Reject and Escalate reveal a required note field before they will
 * submit. On success the server state is re-read so the queue reflects the move.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CardAction } from "@/lib/cockpit/daily-command/types";

interface DecisionActionsProps {
  readonly taskId: string;
  readonly actions: readonly CardAction[];
}

interface DecideResponse {
  readonly success?: boolean;
  readonly error?: string;
}

export function DecisionActions({ taskId, actions }: DecisionActionsProps): JSX.Element {
  const router = useRouter();
  const [activeNoteFor, setActiveNoteFor] = useState<CardAction["action"] | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function submit(action: CardAction): Promise<void> {
    if (isPending) return;
    setMessage(null);
    setError(null);

    // Reveal the note field first for actions that require it.
    if (action.requiresNote && activeNoteFor !== action.action) {
      setActiveNoteFor(action.action);
      return;
    }
    if (action.requiresNote && note.trim().length === 0) {
      setError(`${action.label} requires a note.`);
      return;
    }

    try {
      const res = await fetch(`/api/cockpit/tasks/${taskId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action.action,
          note: action.requiresNote ? note.trim() : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as DecideResponse;
      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Decision failed.");
        return;
      }
      setNote("");
      setActiveNoteFor(null);
      setMessage(`${action.label} applied.`);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Decision failed.");
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const armed = action.requiresNote && activeNoteFor === action.action;
          return (
            <button
              key={action.action}
              type="button"
              disabled={!action.enabled || isPending}
              onClick={() => void submit(action)}
              data-testid={`decision-${action.action.toLowerCase()}`}
              className={[
                "min-h-9 rounded-md border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:text-ink-600",
                action.action === "APPROVE"
                  ? "border-accent-700/50 text-accent-200 hover:bg-accent-950/30"
                  : action.action === "REJECT"
                    ? "border-rose-700/50 text-rose-200 hover:bg-rose-950/30"
                    : action.action === "ESCALATE"
                      ? "border-amber-600/50 text-amber-200 hover:bg-amber-950/30"
                      : "border-white/[0.10] text-ink-200 hover:bg-white/[0.04]",
                armed ? "ring-1 ring-inset ring-white/30" : "",
              ].join(" ")}
              title={action.enabled ? action.label : `Not allowed from current status`}
            >
              {action.label}
            </button>
          );
        })}
      </div>

      {activeNoteFor && (
        <label className="text-[11px] font-semibold text-ink-400">
          {activeNoteFor === "REJECT" ? "Rejection reason (required)" : "Escalation note (required)"}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-white/[0.06] bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            placeholder="Decision-log note"
          />
        </label>
      )}

      {message ? <p className="text-[11px] text-emerald-300">{message}</p> : null}
      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}
