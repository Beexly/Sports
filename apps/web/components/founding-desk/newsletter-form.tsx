"use client";

/**
 * NewsletterForm — Galaxy Desk Note signup form.
 *
 * POSTs to /api/newsletter/subscribe with { email, source }.
 *
 * State machine: idle → loading → success | error
 * { ok: true } is returned ONLY on real persistence — no fake success states.
 * On error the user sees an honest retry message.
 *
 * Analytics events fired:
 *   - email_signup_started  (on first keystroke in the email field)
 *   - email_signup_completed  (on real 2xx from the API)
 */

import { useState, useRef } from "react";
import { track } from "@/lib/analytics/events";
import { BRAND_COLORS } from "@/lib/brand";

type FormState = "idle" | "loading" | "success" | "error";

interface NewsletterFormProps {
  source?: string;
}

export function NewsletterForm({ source = "newsletter-page" }: NewsletterFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const startedRef = useRef(false);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (!startedRef.current && e.target.value.length > 0) {
      startedRef.current = true;
      track("email_signup_started");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading") return;

    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setState("error");
        setErrorMsg(
          data.error ?? "Could not save right now. Please try again shortly."
        );
        return;
      }

      track("email_signup_completed", { source });
      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Could not reach the server. Please try again shortly.");
    }
  }

  if (state === "success") {
    return (
      <div
        className="rounded-2xl border px-6 py-5 text-center"
        style={{
          borderColor: `${BRAND_COLORS.orbitalCyan}30`,
          background: `${BRAND_COLORS.orbitalCyan}0d`,
        }}
        role="status"
        aria-live="polite"
      >
        <p className="font-display text-lg text-white">You are on the list.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          The Galaxy Desk Note arrives when the brief is worth sending — not on
          a mechanical schedule. We will not spam you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={handleEmailChange}
          disabled={state === "loading"}
          className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:ring-2"
          style={{
            borderColor: `${BRAND_COLORS.orbitalCyan}30`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ["--tw-ring-color" as any]: BRAND_COLORS.orbitalCyan,
          }}
        />
        <button
          type="submit"
          disabled={state === "loading" || email.length === 0}
          className="btn btn-primary shrink-0"
          style={{ opacity: state === "loading" ? 0.7 : 1 }}
        >
          {state === "loading" ? "Saving…" : "Join the Desk Note"}
        </button>
      </div>

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

      <p className="text-xs text-ink-500">
        Free. No spam. Unsubscribe any time.{" "}
        <span style={{ color: BRAND_COLORS.orbitalCyan }}>
          Galaxy Sports Network
        </span>{" "}
        is a sports intelligence and media company — not a sportsbook.
      </p>
    </form>
  );
}
