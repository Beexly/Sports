"use client";

/**
 * Listener Log — 30-second manual claim entry (the legal broadcast lane).
 * Posts to /api/cockpit/listener-log → SCOUT review task. Paraphrase only.
 */

import { useState } from "react";

const FIELDS = [
  ["pundit", "Pundit *", "e.g. the analyst's name"],
  ["show", "Show", "e.g. weekly fantasy hour"],
  ["sport", "Sport", "NFL / NBA / MLB…"],
  ["direction", "Direction", "BACKS / FADES / NEUTRAL"],
  ["airedOn", "Aired", "2026-06-12 AM drive"],
] as const;

export function ListenerLogForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [paraphrase, setParaphrase] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/cockpit/listener-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, paraphrase }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; taskId?: string };
      if (res.ok && json.ok) {
        setState("ok");
        setMsg(`Filed for review (task ${json.taskId?.slice(0, 8)}…)`);
        setParaphrase("");
      } else {
        setState("err");
        setMsg(json.error ?? "failed");
      }
    } catch {
      setState("err");
      setMsg("network error");
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(([key, label, ph]) => (
          <label key={key} className="flex flex-col gap-1 text-xs text-gray-400">
            {label}
            <input
              value={values[key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={ph}
              className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-700 focus:outline-none"
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs text-gray-400">
        Paraphrase * — your words, never a quote ({280 - paraphrase.length} left)
        <textarea
          value={paraphrase}
          onChange={(e) => setParaphrase(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="e.g. Backs the road underdog this week on a rest edge he thinks the number missed."
          className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-700 focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state === "busy" || !paraphrase.trim() || !(values["pundit"] ?? "").trim()}
          className="w-fit rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {state === "busy" ? "Filing…" : "File claim for review"}
        </button>
        {msg && (
          <span className={`text-xs ${state === "ok" ? "text-cyan-300" : "text-red-400"}`}>{msg}</span>
        )}
      </div>
    </form>
  );
}
