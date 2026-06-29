"use client";

/**
 * GSE Founding Waitlist form (client).
 *
 * No-claim by construction: it renders only the copy in
 * `@/lib/gse/waitlist-copy`, validates with the shared zod schema, and posts to
 * the local `/api/waitlist` handler. Analytics calls are the no-op `track()`.
 * No pricing, no Stripe, no external send.
 */

import { useState } from "react";
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

export function WaitlistForm(): JSX.Element {
  const [started, setStarted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WaitlistRole | "">("");
  const [sports, setSports] = useState<string[]>([]);
  const [currentStack, setCurrentStack] = useState("");
  const [weakestProcess, setWeakestProcess] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrors({});

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
        body: JSON.stringify(local.data),
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
      <div role="status" className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-6">
        <p className="text-emerald-200">{WAITLIST_COPY.thankYou}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
          autoComplete="name"
        />
        {errors.fullName && <p className="mt-1 text-sm text-red-400">{errors.fullName}</p>}
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
          className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
          autoComplete="email"
        />
        {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
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
          className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
        >
          <option value="">Select…</option>
          {WAITLIST_ROLES.map((r) => (
            <option key={r} value={r}>
              {WAITLIST_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role}</p>}
      </div>

      <fieldset>
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
          <p className="mt-1 text-sm text-red-400">{errors.sportInterests}</p>
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
          className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
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
          className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
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
        />
        <span>{WAITLIST_COPY.consentLabel}</span>
      </label>
      {errors.consent && <p className="text-sm text-red-400">{errors.consent}</p>}

      {errors._form && <p className="text-sm text-red-400">{errors._form}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-md border border-white/20 px-4 py-2 font-medium disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : WAITLIST_COPY.submitLabel}
      </button>
    </form>
  );
}
