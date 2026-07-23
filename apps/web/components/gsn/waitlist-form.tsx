"use client";

/**
 * GSE Founding Waitlist form (client).
 *
 * No-claim by construction: it renders only the copy in
 * `@/lib/gse/waitlist-copy`, validates with the shared zod schema, and posts to
 * the local `/api/waitlist` handler. Analytics calls are the no-op `track()`.
 * No pricing, no Stripe, no external send.
 *
 * Hardening: fires `waitlist_viewed` on mount (funnel), associates field errors
 * for screen readers (aria-invalid/aria-describedby), and includes an off-screen
 * honeypot field that the server uses to silently drop bots.
 */

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/events";
import {
  WAITLIST_COPY,
  WAITLIST_COPY_VERSION,
  WAITLIST_ROLE_LABELS,
  WAITLIST_SPORT_OPTIONS,
} from "@/lib/gse/waitlist-copy";
import {
  validateWaitlistLead,
  WAITLIST_ROLES,
  type WaitlistRole,
} from "@/lib/gse/waitlist-validation";

type Status = "idle" | "submitting" | "done" | "error";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2";

export function WaitlistForm(): JSX.Element {
  const [started, setStarted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole | "">("");
  const [sports, setSports] = useState<string[]>([]);
  const [currentStack, setCurrentStack] = useState("");
  const [weakestProcess, setWeakestProcess] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Fire the (no-op) viewed event once on mount — completes the funnel.
  useEffect(() => {
    track("waitlist_viewed");
  }, []);

  // a11y: when field errors appear, move focus to the summary so screen readers
  // announce it and keyboard users land at the list of what to fix.
  const fieldErrorCount = Object.keys(errors).filter((k) => k !== "_form").length;
  useEffect(() => {
    if (fieldErrorCount > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [fieldErrorCount, errors]);

  function markStarted(): void {
    if (!started) {
      setStarted(true);
      track("waitlist_started");
    }
  }

  function toggleSport(sport: string): void {
    markStarted();
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  }

  // a11y helpers: wire aria-invalid + aria-describedby to the error node.
  function errorId(field: string): string {
    return `wl-${field}-error`;
  }
  function ariaFor(field: string): { "aria-invalid"?: true; "aria-describedby"?: string } {
    return errors[field]
      ? { "aria-invalid": true, "aria-describedby": errorId(field) }
      : {};
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrors({});

    // Honeypot: a real user never fills this off-screen field. Silently succeed
    // without sending anything.
    if (honeypot.trim() !== "") {
      setStatus("done");
      return;
    }

    const payload = {
      fullName,
      email,
      role,
      sportInterests: sports,
      currentStack: currentStack || undefined,
      weakestProcess: weakestProcess || undefined,
      consent,
      copyVersion: WAITLIST_COPY_VERSION,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    };

    const local = validateWaitlistLead(payload);
    if (!local.success) {
      if (local.errors.consent) track("waitlist_consent_blocked");
      setErrors(local.errors);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...local.data, website: honeypot, renderedAt }),
      });
      const data: { ok?: boolean; errors?: Record<string, string> } = await res
        .json()
        .catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? { _form: "Something went wrong. Please try again." });
        setStatus("error");
        return;
      }
      track("waitlist_submitted", { role: local.data.role });
      setStatus("done");
    } catch {
      setErrors({ _form: "Could not reach the server. Please try again." });
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-lg border border-verify/40 bg-verify/10 p-6">
        <p className="text-verify">{WAITLIST_COPY.thankYou}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {fieldErrorCount > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-alert/40 bg-alert/10 p-3 text-sm text-alert outline-none"
        >
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5">
            {Object.entries(errors)
              .filter(([k]) => k !== "_form")
              .map(([field, msg]) => (
                <li key={field}>{msg}</li>
              ))}
          </ul>
        </div>
      )}
      <div>
        <label htmlFor="wl-name" className="block text-sm font-medium">
          {WAITLIST_COPY.fields.fullName}
        </label>
        <input
          id="wl-name"
          type="text"
          value={fullName}
          onChange={(e) => {
            markStarted();
            setFullName(e.target.value);
          }}
          className={INPUT_CLASS}
          autoComplete="name"
          aria-required={true}
          {...ariaFor("fullName")}
        />
        {errors.fullName && (
          <p id={errorId("fullName")} className="mt-1 text-sm text-alert">
            {errors.fullName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="wl-email" className="block text-sm font-medium">
          {WAITLIST_COPY.fields.email}
        </label>
        <input
          id="wl-email"
          type="email"
          value={email}
          onChange={(e) => {
            markStarted();
            setEmail(e.target.value);
          }}
          className={INPUT_CLASS}
          autoComplete="email"
          aria-required={true}
          {...ariaFor("email")}
        />
        {errors.email && (
          <p id={errorId("email")} className="mt-1 text-sm text-alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="wl-role" className="block text-sm font-medium">
          {WAITLIST_COPY.fields.role}
        </label>
        <select
          id="wl-role"
          value={role}
          onChange={(e) => {
            markStarted();
            setRole(e.target.value as WaitlistRole | "");
          }}
          className={INPUT_CLASS}
          aria-required={true}
          {...ariaFor("role")}
        >
          <option value="">Select…</option>
          {WAITLIST_ROLES.map((r) => (
            <option key={r} value={r}>
              {WAITLIST_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.role && (
          <p id={errorId("role")} className="mt-1 text-sm text-alert">
            {errors.role}
          </p>
        )}
      </div>

      <fieldset {...ariaFor("sportInterests")}>
        <legend className="text-sm font-medium">{WAITLIST_COPY.fields.sportInterests}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {WAITLIST_SPORT_OPTIONS.map((sport) => (
            <label key={sport} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sports.includes(sport)}
                onChange={() => toggleSport(sport)}
              />
              {sport}
            </label>
          ))}
        </div>
        {errors.sportInterests && (
          <p id={errorId("sportInterests")} className="mt-1 text-sm text-alert">
            {errors.sportInterests}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="wl-stack" className="block text-sm font-medium">
          {WAITLIST_COPY.fields.currentStack}
        </label>
        <textarea
          id="wl-stack"
          value={currentStack}
          onChange={(e) => setCurrentStack(e.target.value)}
          rows={2}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="wl-weakest" className="block text-sm font-medium">
          {WAITLIST_COPY.fields.weakestProcess}
        </label>
        <textarea
          id="wl-weakest"
          value={weakestProcess}
          onChange={(e) => setWeakestProcess(e.target.value)}
          rows={2}
          className={INPUT_CLASS}
        />
      </div>

      {/* Honeypot — off-screen, not for humans. Bots that fill it are dropped. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="wl-website">Company website</label>
        <input
          id="wl-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            markStarted();
            setConsent(e.target.checked);
          }}
          className="mt-1"
          aria-required={true}
          {...ariaFor("consent")}
        />
        <span>{WAITLIST_COPY.consentLabel}</span>
      </label>
      {errors.consent && (
        <p id={errorId("consent")} className="text-sm text-alert">
          {errors.consent}
        </p>
      )}

      {errors._form && (
        <p role="alert" className="text-sm text-alert">
          {errors._form}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        aria-busy={status === "submitting"}
        className="rounded-md border border-white/20 px-4 py-2 font-medium disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : WAITLIST_COPY.submitLabel}
      </button>
    </form>
  );
}
