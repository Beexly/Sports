"use client";

/**
 * Founder Picks entry form — the owner's own call, sealed and graded.
 *
 * WHY THIS FILE EXISTS. The write path has been complete and unreachable since it
 * was built: `POST /api/admin/founder-picks` has validated the input, refused
 * post-kickoff picks, frozen settled rows, and written a real `founder-v1` Pick
 * row ever since. `/founder-picks` rendered the record. But nothing in either the
 * public nav or the cockpit nav linked to the page, and NO FORM existed — the
 * only way to record a founder pick was to hand-write the JSON for a raw POST.
 * The feature was built and never given a door.
 *
 * This is that door. It is a thin client over the existing admin route and adds
 * no new write path: same endpoint, same validation, same server rules. The
 * browser checks shape for fast feedback; the SERVER is still the authority and
 * its error string is what gets shown, so a client-side guess can never widen
 * what is publishable.
 *
 * Honesty constraints carried from `lib/founder-picks/types.ts`, restated in the
 * UI so the owner is never misled about what a number means:
 *   - `confidence` is the OWNER'S stated conviction. It is not a model output and
 *     is not a win probability. `create.ts` maps it to a pickGrade label; nothing
 *     treats it as P(win).
 *   - A pick is REFUSED after kickoff, and refused when kickoff is unknown.
 *   - `Pick` is unique on (gameId, pickType): one pick per market per game, so
 *     submitting over an existing engine pick OVERRIDES it. The form says so
 *     rather than silently replacing a row.
 */

import { useState } from "react";

export type FounderPickGame = {
  readonly id: string;
  readonly label: string;
  readonly commenceTime: string;
};

const PICK_TYPES = ["MONEYLINE", "SPREAD", "TOTAL"] as const;

const FIELD_CLASS =
  "rounded-lg border border-titanium/40 bg-eclipse/50 px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 focus:border-orbital-cyan focus:outline-none";

function nowIso(): string {
  return new Date().toISOString();
}

export function FounderPicksForm({ games }: { games: readonly FounderPickGame[] }) {
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [pickType, setPickType] = useState<(typeof PICK_TYPES)[number]>("SPREAD");
  const [selection, setSelection] = useState("");
  const [line, setLine] = useState("");
  const [confidence, setConfidence] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [override, setOverride] = useState<"engine_hold" | "engine_pick">("engine_hold");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  const selected = games.find((g) => g.id === gameId);
  const lineLabel = pickType === "MONEYLINE" ? "Price (American)" : "Line";
  const lineHint =
    pickType === "MONEYLINE"
      ? "e.g. -150 or +130 — your price, not the board's"
      : pickType === "SPREAD"
        ? "e.g. -3.5 (home-perspective points)"
        : "e.g. 48.5 (game total)";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setMsg("");
    try {
      const res = await fetch("/api/admin/founder-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          pickType,
          selection,
          line: Number(line),
          confidence: Number(confidence),
          reasoning,
          override,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        data?: { action?: string };
      } | null;

      if (res.ok && json?.success) {
        const action = json.data?.action === "overridden" ? "Overrode" : "Locked in";
        setState("ok");
        setMsg(`${action} your call. It is sealed and graded by the same settlement path as every engine pick.`);
        // Clear the per-pick fields but KEEP game and market, so a slate of
        // calls on one game can be entered without re-picking the fixture.
        setSelection("");
        setLine("");
        setConfidence("");
        setReasoning("");
        return;
      }
      setState("err");
      setMsg(json?.error ?? `Request failed (${res.status}).`);
    } catch {
      setState("err");
      setMsg("Network error. Nothing was saved — retry is safe.");
    }
  };

  if (games.length === 0) {
    return (
      <div className="surface-card p-5">
        <p className="text-sm text-ion-2">
          No upcoming games are loaded, so there is nothing to call yet. The board
          populates from the scheduled slate; this form appears as soon as at
          least one future game exists.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-ion-2 sm:col-span-2">
          Game
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className={FIELD_CLASS}
            required
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} — {g.commenceTime}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ion-2">
          Market
          <select
            value={pickType}
            onChange={(e) => setPickType(e.target.value as (typeof PICK_TYPES)[number])}
            className={FIELD_CLASS}
          >
            {PICK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ion-2">
          {lineLabel}
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder={lineHint}
            inputMode="decimal"
            className={FIELD_CLASS}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ion-2">
          Selection *
          <input
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
            placeholder="e.g. Chiefs -3.5 or OVER 48.5"
            className={FIELD_CLASS}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ion-2">
          Your confidence (1–100) *
          <input
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            placeholder="How sure are you? This is your conviction, not a win probability."
            inputMode="numeric"
            className={FIELD_CLASS}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs text-ion-2">
        Your reasoning * — at least 10 characters
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={4}
          placeholder="Why this call. It is shown on the public record next to the result, so write it for a customer, not for yourself."
          className={FIELD_CLASS}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ion-2">
        This is taken against
        <select
          value={override}
          onChange={(e) => setOverride(e.target.value as "engine_hold" | "engine_pick")}
          className={FIELD_CLASS}
        >
          <option value="engine_hold">An engine PASS (the engine declined this game)</option>
          <option value="engine_pick">An engine PICK (this replaces it)</option>
        </select>
      </label>

      <p className="text-[11px] leading-5 text-ion-3">
        One call per market per game. Submitting over an existing pick on the same
        game and market REPLACES it. Picks freeze at kickoff — a game that has
        started, or whose start time is unknown, is refused rather than backdated.
        Your confidence is recorded as your stated conviction and is never presented
        as a model probability.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "busy"}
          className="rounded-lg border border-orbital-cyan/50 bg-orbital-cyan/15 px-4 py-2 text-sm font-medium text-ion-white transition-colors hover:bg-orbital-cyan/25 disabled:opacity-50"
        >
          {state === "busy" ? "Recording…" : "Record this call"}
        </button>
        {state === "ok" || state === "err" ? (
          <p
            role="status"
            className={state === "ok" ? "text-sm text-orbital-cyan" : "text-sm text-alert"}
          >
            {msg}
          </p>
        ) : null}
      </div>

      {selected ? (
        <p className="text-[11px] text-ion-3">Selected: {selected.label}</p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {msg}
      </p>
      <input type="hidden" name="submittedAt" value={nowIso()} readOnly />
    </form>
  );
}
