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
  const [batch, setBatch] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const lines = batch
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/cockpit/listener-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, claims: lines }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        filed?: number;
      };
      if (res.ok && json.ok) {
        setState("ok");
        setMsg(`Filed ${json.filed ?? lines.length} take${(json.filed ?? lines.length) === 1 ? "" : "s"} for review.`);
        setBatch("");
      } else {
        setState("err");
        setMsg(json.detail ?? json.error ?? "failed");
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
          <label key={key} className="flex flex-col gap-1 text-xs text-ion-2">
            {label}
            <input
              value={values[key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={ph}
              className="rounded-lg border border-titanium/40 bg-eclipse/50 px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-cyan-700 focus:outline-none"
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs text-ion-2">
        Your takes — one per line, your own words ({lines.length}/60 · never a quote, never a transcript)
        <textarea
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          rows={14}
          placeholder={
            "One paraphrased take per line — a whole show's worth:\n" +
            "Backs the road dog on a rest edge he thinks the number missed.\n" +
            "Fades the primetime total — expects a slow, run-heavy script.\n" +
            "Likes the rookie TE as a value pick at his current ADP.\n\n" +
            "Paste a transcript and it'll be rejected — this lane is your words only."
          }
          className="rounded-lg border border-titanium/40 bg-eclipse/50 px-3 py-2 text-sm leading-6 text-ion-white placeholder:text-ion-3 focus:border-cyan-700 focus:outline-none"
        />
      </label>
      <p className="text-label-lg leading-relaxed text-ion-3">
        Legal lane only: you listened on your own subscription and write each take in your
        own words. No recordings, no transcripts, no verbatim quotes — SiriusXM&apos;s terms
        forbid using their content to train tools, so timestamped/transcript lines are
        rejected automatically. Each line files as its own SCOUT review task.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={state === "busy" || lines.length === 0 || !(values["pundit"] ?? "").trim()}
          className="w-fit rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-ion-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {state === "busy"
            ? "Filing…"
            : `File ${lines.length || ""} take${lines.length === 1 ? "" : "s"} for review`}
        </button>
        {msg && (
          <span className={`text-xs ${state === "ok" ? "text-verify" : "text-alert"}`}>{msg}</span>
        )}
      </div>
    </form>
  );
}
