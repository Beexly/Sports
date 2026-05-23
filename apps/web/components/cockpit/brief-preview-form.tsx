"use client";

/**
 * BriefPreviewForm — operator-facing form for the brief composer preview.
 *
 * Operator pastes a JSON array of picks + sets the date, hits Compose,
 * and sees the ComposedBrief inline. POSTs to /api/cockpit/brief
 * (Cycle 16). Admin gating is the cockpit layout's job.
 *
 * Preview only — does NOT persist. Refreshing the page clears state.
 */

import { useState, type FormEvent } from "react";

interface ComposedBriefShape {
  date: string;
  summary: string;
  status: string;
  slateOverview: { text: string };
  sections: Array<{ title: string; body: string; type: string }>;
  responsibleGamingText: string;
  promotions: { count: number; items: unknown[] };
  whatChanged: { items: unknown[] };
  contentIdeas: { items: unknown[] };
  manualReview: { items: unknown[] };
}

const SAMPLE_PICKS = `[
  {
    "sport": "NBA",
    "game": "Lakers vs Warriors",
    "pickType": "SPREAD",
    "selection": "Lakers -3.5",
    "confidence": 82,
    "pickGrade": "STRONG_PLAY"
  }
]`;

const MAX_PICKS_CHARS = 12_000;

export function BriefPreviewForm() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [picksJson, setPicksJson] = useState(SAMPLE_PICKS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<ComposedBriefShape | null>(null);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setPending(true);
    setError(null);
    setBrief(null);

    let picks: unknown;
    try {
      picks = JSON.parse(picksJson);
    } catch {
      setError("picks JSON is not valid JSON");
      setPending(false);
      return;
    }
    if (!Array.isArray(picks)) {
      setError("picks JSON must be an array");
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/cockpit/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, picks }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
        );
        return;
      }
      setBrief(body as ComposedBriefShape);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  const overLimit = picksJson.length > MAX_PICKS_CHARS;
  const submittable =
    !pending && date.length === 10 && picksJson.trim().length > 0 && !overLimit;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-200">Date</span>
        <input
          type="date"
          data-testid="brief-date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44 rounded-lg border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100 focus:border-gray-600 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-200">
          Picks JSON (array of SlatePickSnippet)
        </span>
        <textarea
          data-testid="brief-picks-input"
          value={picksJson}
          onChange={(e) => setPicksJson(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
          placeholder='[{"sport":"NBA","game":"...","pickType":"SPREAD","selection":"...","confidence":80,"pickGrade":"STRONG_PLAY"}]'
        />
        <span
          className={`text-[11px] ${overLimit ? "text-red-400" : "text-gray-500"}`}
        >
          {picksJson.length.toLocaleString()} / {MAX_PICKS_CHARS.toLocaleString()} chars
          {overLimit ? " — over limit" : ""}
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          data-testid="brief-compose"
          disabled={!submittable}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Composing…" : "Compose preview"}
        </button>
        {error ? (
          <span data-testid="brief-preview-error" className="text-sm text-red-400">
            {error}
          </span>
        ) : null}
      </div>

      {brief ? (
        <section
          data-testid="brief-preview-result"
          className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-gray-900/40 p-4"
        >
          <header className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-md border border-amber-800 bg-amber-900/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-amber-300"
              data-testid="brief-preview-status"
            >
              {brief.status}
            </span>
            <span className="text-[11px] text-gray-500">
              {brief.date} · {brief.sections.length} section
              {brief.sections.length === 1 ? "" : "s"}
            </span>
          </header>

          <div data-testid="brief-preview-summary">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600">
              Summary
            </h3>
            <p className="mt-1 text-sm text-gray-300">{brief.summary}</p>
          </div>

          <div data-testid="brief-preview-slate">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600">
              Slate overview
            </h3>
            <p className="mt-1 text-sm text-gray-300">{brief.slateOverview.text}</p>
          </div>

          {brief.sections.length > 0 ? (
            <ul
              data-testid="brief-preview-sections"
              className="flex flex-col gap-3"
            >
              {brief.sections.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-800 bg-gray-950 p-3"
                >
                  <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-600">
                    {s.type}
                  </p>
                  <p className="mt-2 text-sm text-gray-300">{s.body}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div
            data-testid="brief-preview-pending"
            className="rounded-lg border border-dashed border-gray-800 p-3 text-[11px] text-gray-500"
          >
            <span className="font-semibold text-gray-400">Not yet wired</span> —
            promotions ({brief.promotions.count}), whatChanged (
            {brief.whatChanged.items.length}), contentIdeas (
            {brief.contentIdeas.items.length}), manualReview (
            {brief.manualReview.items.length}) all return empty arrays today.
            Future cycles add composers for each.
          </div>

          <p className="text-[11px] italic text-gray-500">
            {brief.responsibleGamingText}
          </p>
        </section>
      ) : (
        <p data-testid="brief-preview-idle" className="text-sm text-gray-500">
          Edit the date and picks above, then click Compose preview.
        </p>
      )}
    </form>
  );
}
