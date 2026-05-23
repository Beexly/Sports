"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface CreateResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly editorUrl?: string;
  readonly data?: {
    readonly editorUrl?: string;
  };
}

function currentIsoWeekParts(): { readonly isoWeek: number; readonly isoYear: number } {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoWeek, isoYear };
}

export function JournalNewForm(): JSX.Element {
  const router = useRouter();
  const defaults = useMemo(() => currentIsoWeekParts(), []);
  const [title, setTitle] = useState(`Model Journal: Week ${defaults.isoWeek}, ${defaults.isoYear}`);
  const [isoWeek, setIsoWeek] = useState(String(defaults.isoWeek));
  const [isoYear, setIsoYear] = useState(String(defaults.isoYear));
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createDraft(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cockpit/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isoWeek, isoYear, bodyMarkdown }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateResponse;

      if (!response.ok || !payload.success) {
        const nextUrl = payload.editorUrl;
        if (nextUrl) {
          router.push(nextUrl);
          return;
        }
        throw new Error(payload.error ?? "journal-draft-create-failed");
      }

      router.push(payload.data?.editorUrl ?? "/cockpit/journal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "journal-draft-create-failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">ISO week</span>
          <input
            value={isoWeek}
            inputMode="numeric"
            onChange={(event) => setIsoWeek(event.target.value)}
            className="min-h-11 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">ISO year</span>
          <input
            value={isoYear}
            inputMode="numeric"
            onChange={(event) => setIsoYear(event.target.value)}
            className="min-h-11 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optional starter markdown</span>
        <textarea
          value={bodyMarkdown}
          onChange={(event) => setBodyMarkdown(event.target.value)}
          rows={12}
          className="min-h-[260px] rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 font-mono text-sm text-gray-100 outline-none focus:border-yellow-400"
          placeholder="Leave blank to create the standard weekly Journal draft outline."
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={createDraft}
        disabled={isSubmitting}
        className="min-h-11 rounded-lg border border-yellow-400/60 bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating draft..." : "Create draft"}
      </button>
    </div>
  );
}
