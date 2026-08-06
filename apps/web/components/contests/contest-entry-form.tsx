"use client";

import { useState } from "react";
import type { ContestWeek } from "@/lib/contests/types";

type Props = { week: ContestWeek };

export function ContestEntryForm({ week }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [picks, setPicks] = useState<Record<string, "home" | "away">>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  function setSide(gameId: string, side: "home" | "away") {
    setPicks((prev) => ({ ...prev, [gameId]: side }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    if (!consent) {
      setStatus("error");
      setMessage("Consent is required.");
      return;
    }
    if (Object.keys(picks).length < week.games.length) {
      setStatus("error");
      setMessage(`Pick every game (${Object.keys(picks).length}/${week.games.length}).`);
      return;
    }
    const body = {
      displayName,
      email,
      consent: true,
      honeypot,
      picks: week.games
        .filter((g) => picks[g.gameId])
        .map((g) => ({ gameId: g.gameId, side: picks[g.gameId]! })),
    };
    try {
      const res = await fetch("/api/contests/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Entry failed");
        return;
      }
      setStatus("done");
      setMessage("You're in. Check the leaderboard.");
    } catch {
      setStatus("error");
      setMessage("Network error — try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="border border-orbital-cyan/40 bg-eclipse/60 p-6 text-ion-white">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-mineral bg-eclipse/40 p-6">
      <div>
        <label className="block text-sm text-ion-1" htmlFor="ce-name">
          Display name
        </label>
        <input
          id="ce-name"
          required
          minLength={2}
          maxLength={32}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-mineral bg-obsidian px-3 py-2 text-ion-white"
        />
      </div>
      <div>
        <label className="block text-sm text-ion-1" htmlFor="ce-email">
          Email (hashed on store — never shown on leaderboard)
        </label>
        <input
          id="ce-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-mineral bg-obsidian px-3 py-2 text-ion-white"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ion-white">
          Picks (home or away) · {Object.keys(picks).length}/{week.games.length}
        </legend>
        {week.games.map((g) => (
          <div key={g.gameId} className="flex flex-wrap items-center gap-2 border border-mineral/50 p-3">
            <span className="min-w-[8rem] text-sm text-ion-white">{g.label}</span>
            <button
              type="button"
              onClick={() => setSide(g.gameId, "away")}
              className={`rounded px-3 py-1 text-xs ${
                picks[g.gameId] === "away"
                  ? "bg-orbital-cyan text-obsidian"
                  : "border border-mineral text-ion-1"
              }`}
            >
              {g.away}
            </button>
            <button
              type="button"
              onClick={() => setSide(g.gameId, "home")}
              className={`rounded px-3 py-1 text-xs ${
                picks[g.gameId] === "home"
                  ? "bg-orbital-cyan text-obsidian"
                  : "border border-mineral text-ion-1"
              }`}
            >
              {g.home}
            </button>
          </div>
        ))}
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-ion-1">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1"
        />
        <span>
          I understand this is a free paper skill board with no entry fee, no prize, and no real-money
          wagering.
        </span>
      </label>

      {/* honeypot */}
      <input
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden
      />

      {status === "error" && <p className="text-sm text-plasma">{message}</p>}

      <button
        type="submit"
        disabled={!consent || status === "submitting"}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Lock my entry"}
      </button>
    </form>
  );
}
