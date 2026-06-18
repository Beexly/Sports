"use client";

/**
 * AskGalaxyForm — concierge intake form for /ask-galaxy.
 *
 * POSTs to /api/ask-galaxy/submit.
 *
 * State machine: idle → loading → success | error
 * { ok: true, id } is returned ONLY on real persistence — no fake success states.
 * On error the user sees an honest retry message.
 *
 * Classification is ALWAYS PENDING — a human (SCOUT) reviews every submission.
 * This form never claims to provide instant automated advice.
 *
 * Analytics events fired:
 *   - ask_galaxy_started  (on first meaningful interaction with any field)
 *   - ask_galaxy_submitted  (on real 2xx from the API)
 */

import { useState, useRef } from "react";
import { track } from "@/lib/analytics/events";
import { BRAND_COLORS } from "@/lib/brand";

type FormState = "idle" | "loading" | "success" | "error";

interface FormData {
  email: string;
  matchup: string;
  considering: string;
  name: string;
  sport: string;
  league: string;
  reasoning: string;
  trustNeed: string;
  contactConsent: boolean;
}

const EMPTY: FormData = {
  email: "",
  matchup: "",
  considering: "",
  name: "",
  sport: "",
  league: "",
  reasoning: "",
  trustNeed: "",
  contactConsent: false,
};

/** Shared input class — 44px min-height, consistent hover/focus ring */
const INPUT_CLS =
  "w-full min-h-11 rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder:text-ink-500 outline-none transition-colors hover:border-white/20 focus:border-cyan-400/60 disabled:opacity-50";

const INPUT_STYLE = { borderColor: "rgba(100,116,139,0.35)" };

export function AskGalaxyForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const startedRef = useRef(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ?? false) : value,
    }));

    if (!startedRef.current) {
      startedRef.current = true;
      track("ask_galaxy_started");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading") return;

    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ask-galaxy/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          matchup: form.matchup,
          considering: form.considering,
          name: form.name || undefined,
          sport: form.sport || undefined,
          league: form.league || undefined,
          reasoning: form.reasoning || undefined,
          trustNeed: form.trustNeed || undefined,
          contactConsent: form.contactConsent,
        }),
      });

      const data = (await res.json()) as { ok: boolean; id?: string; error?: string };

      if (!res.ok || !data.ok) {
        setState("error");
        setErrorMsg(
          data.error ?? "Could not save right now. Please try again shortly."
        );
        return;
      }

      track("ask_galaxy_submitted");
      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Could not reach the server. Please try again shortly.");
    }
  }

  if (state === "success") {
    return (
      <div
        className="rounded-2xl border px-6 py-10 text-center"
        style={{
          borderColor: `${BRAND_COLORS.orbitalCyan}30`,
          background: `${BRAND_COLORS.orbitalCyan}0d`,
        }}
        role="status"
        aria-live="polite"
      >
        <p
          className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: BRAND_COLORS.orbitalCyan }}
        >
          Received
        </p>
        <p className="mt-3 font-display text-xl text-white">
          Got it — we review every submission.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          Classification is manual. A human (SCOUT) reads every game submitted and
          classifies it honestly: action signal, caution signal, no-bet signal, or
          insufficient data. This is never automated betting advice. We will be in
          touch if you opted in for contact.
        </p>
      </div>
    );
  }

  const isLoading = state === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Row 1: name + email */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name (optional)" htmlFor="ag-name">
          <input
            id="ag-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="First name or handle"
            value={form.name}
            onChange={handleChange}
            disabled={isLoading}
            className={INPUT_CLS}
            style={INPUT_STYLE}
          />
        </Field>

        <Field label="Email address" htmlFor="ag-email" required>
          <input
            id="ag-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={handleChange}
            disabled={isLoading}
            className={INPUT_CLS}
            style={INPUT_STYLE}
          />
        </Field>
      </div>

      {/* Row 2: sport + league */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sport (optional)" htmlFor="ag-sport">
          <input
            id="ag-sport"
            name="sport"
            type="text"
            placeholder="e.g. NFL, NBA, MLB"
            value={form.sport}
            onChange={handleChange}
            disabled={isLoading}
            className={INPUT_CLS}
            style={INPUT_STYLE}
          />
        </Field>

        <Field label="League (optional)" htmlFor="ag-league">
          <input
            id="ag-league"
            name="league"
            type="text"
            placeholder="e.g. AFC, NFC, AL East"
            value={form.league}
            onChange={handleChange}
            disabled={isLoading}
            className={INPUT_CLS}
            style={INPUT_STYLE}
          />
        </Field>
      </div>

      {/* Matchup */}
      <Field
        label="The game"
        htmlFor="ag-matchup"
        required
        hint="Teams, date, and any relevant context"
      >
        <input
          id="ag-matchup"
          name="matchup"
          type="text"
          required
          placeholder="e.g. Chiefs @ Bills — Week 14, 4:25 ET"
          value={form.matchup}
          onChange={handleChange}
          disabled={isLoading}
          className={INPUT_CLS}
          style={INPUT_STYLE}
        />
      </Field>

      {/* Considering */}
      <Field
        label="What are you considering?"
        htmlFor="ag-considering"
        required
        hint="Describe the position you are thinking about — no dollar amounts needed"
      >
        <textarea
          id="ag-considering"
          name="considering"
          required
          rows={3}
          placeholder="e.g. I am thinking about the Chiefs -3.5; I like them in dome environments against run-heavy defenses."
          value={form.considering}
          onChange={handleChange}
          disabled={isLoading}
          className={`${INPUT_CLS} resize-none`}
          style={INPUT_STYLE}
        />
      </Field>

      {/* Reasoning */}
      <Field
        label="Why are you leaning that way? (optional)"
        htmlFor="ag-reasoning"
        hint="The more context you share, the sharper the read"
      >
        <textarea
          id="ag-reasoning"
          name="reasoning"
          rows={3}
          placeholder="e.g. Patrick Mahomes is 8-2 ATS as an underdog, and the line has moved in KC's favor since Monday."
          value={form.reasoning}
          onChange={handleChange}
          disabled={isLoading}
          className={`${INPUT_CLS} resize-none`}
          style={INPUT_STYLE}
        />
      </Field>

      {/* Trust need */}
      <Field
        label="What would make you trust the read? (optional)"
        htmlFor="ag-trustNeed"
        hint="Helps us give you the most useful classification"
      >
        <textarea
          id="ag-trustNeed"
          name="trustNeed"
          rows={2}
          placeholder="e.g. I need to know whether the line movement is sharp or public noise."
          value={form.trustNeed}
          onChange={handleChange}
          disabled={isLoading}
          className={`${INPUT_CLS} resize-none`}
          style={INPUT_STYLE}
        />
      </Field>

      {/* Contact consent */}
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-300">
        <input
          type="checkbox"
          name="contactConsent"
          checked={form.contactConsent}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-cyan-400"
        />
        <span>
          You may follow up with me at the email above if you need more context to
          classify this game.
        </span>
      </label>

      {/* Error state */}
      {state === "error" && errorMsg && (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: `${BRAND_COLORS.ionMagenta}30`,
            background: `${BRAND_COLORS.ionMagenta}0d`,
            color: BRAND_COLORS.ionMagenta,
          }}
          role="alert"
          aria-live="polite"
        >
          {errorMsg}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary min-h-11"
          style={{ opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? "Submitting…" : "Send this game to Galaxy"}
        </button>

        <p className="text-xs text-ink-500">
          Classification is manual — a human reads every submission. This is never
          automated betting advice.{" "}
          <span style={{ color: BRAND_COLORS.orbitalCyan }}>
            Galaxy Sports Network
          </span>{" "}
          is a sports intelligence and media company, not a sportsbook.
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tiny field wrapper — keeps the JSX above readable
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-200">
        {label}
        {required && (
          <span
            className="ml-1"
            style={{ color: BRAND_COLORS.orbitalCyan }}
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
      {children}
    </div>
  );
}
