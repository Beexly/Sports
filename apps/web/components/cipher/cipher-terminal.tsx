"use client";

/**
 * CipherTerminal — the interactive face of the weekly hunt.
 *
 * Receives only a sanitized chapter view (no shard tokens). Renders the live
 * countdown to the window boundary, the "where to look" shard rail, the
 * assembly instructions, and the answer field. Submits to /api/cipher/verify,
 * which checks the hash server-side and (on a win) returns a founder-gated
 * reward code or manual-claim reference. Sealed windows disable the field.
 *
 * Accessible: labelled input, aria-live result region, disabled state when
 * sealed, reduced-motion respected by the global CSS reset.
 */

import { useEffect, useMemo, useState } from "react";
import type { CipherChapterView } from "@/lib/cipher/cipher";

type Reward = { kind: "code" | "claim"; value: string };
type Props = { view: CipherChapterView; state: "live" | "sealed"; boundaryISO: string };

function useCountdown(boundaryISO: string) {
  const target = useMemo(() => Date.parse(boundaryISO), [boundaryISO]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ms = now === null ? null : Math.max(0, target - now);
  if (ms === null) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function CipherTerminal({ view, state, boundaryISO }: Props) {
  const live = state === "live";
  const cd = useCountdown(boundaryISO);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | { kind: "win"; reward: Reward; message: string }
    | { kind: "miss"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/cipher/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: view.week, answer }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setResult({ kind: "error", message: data.error ?? "Too many attempts. Try again shortly." });
      } else if (data.ok && data.correct) {
        setResult({ kind: "win", reward: data.reward as Reward, message: data.message });
      } else if (data.correct === false) {
        setResult({ kind: "miss", message: data.message ?? "Not it. Look deeper." });
      } else {
        setResult({ kind: "error", message: data.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ kind: "error", message: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: "rgba(0, 229, 255, 0.12)" }}
      />

      {/* Status + countdown */}
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <p className={`eyebrow flex items-center gap-2 ${live ? "text-orbital-cyan" : "text-ultraviolet"}`}>
          <span className={live ? "live-dot" : ""} />
          {live ? `Chapter ${view.week} · Live` : "Sealed"}
        </p>
        {cd && (
          <p className="font-mono text-sm tabular-nums text-ion-1">
            <span className="text-ion-3">{live ? "seals in " : "opens in "}</span>
            {cd.d > 0 && `${cd.d}d `}
            {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
          </p>
        )}
      </div>

      {/* Codename + brief */}
      <h2 className="relative mt-5 font-display text-2xl text-ion-white sm:text-3xl">
        “{view.codename}”
      </h2>
      <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-ion-1">{view.brief}</p>

      {/* Shard rail — where to look (no tokens) */}
      {view.clues.length > 0 && (
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          {view.clues.map((c) => (
            <div key={c.id} className="surface-lifted p-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color, boxShadow: `0 0 10px ${c.color}` }}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-ion-3">Shard {c.id}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-ion-white">{c.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-ion-2">{c.where}</p>
            </div>
          ))}
        </div>
      )}

      {/* Answer entry */}
      <form onSubmit={submit} className="relative mt-7">
        <label htmlFor="cipher-answer" className="block text-xs uppercase tracking-widest text-ion-3">
          Assemble the shards in order · {view.answerLength} characters
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="cipher-answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!live || busy}
            autoComplete="off"
            spellCheck={false}
            placeholder={live ? "shard01shard02shard03…" : "sealed until Mon 11:59am ET"}
            className="flex-1 rounded-xl border border-titanium bg-carbon/30 px-4 py-3 font-mono text-sm text-ion-white outline-none transition-colors placeholder:text-ion-3 focus:border-orbital-cyan/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!live || busy || !answer.trim()}
            className="btn btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Checking…" : "Submit key"}
          </button>
        </div>
      </form>

      {/* Result */}
      <div aria-live="polite" className="relative mt-4 min-h-[1.5rem]">
        {result?.kind === "win" && (
          <div className="rounded-xl border border-orbital-cyan/40 bg-orbital-cyan/5 p-4">
            <p className="text-sm font-semibold text-ion-white">◬ Solved. {result.message}</p>
            <p className="mt-2 font-mono text-lg tracking-wide text-orbital-cyan">
              {result.reward.value}
            </p>
            <p className="mt-1 text-xs text-ion-2">
              Present this claim reference to support to redeem your free Elite week.
            </p>
          </div>
        )}
        {result?.kind === "miss" && (
          <p className="text-sm text-plasma">
            {result.message}
          </p>
        )}
        {result?.kind === "error" && <p className="text-sm text-ion-2">{result.message}</p>}
      </div>
    </div>
  );
}
