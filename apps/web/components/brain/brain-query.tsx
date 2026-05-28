"use client";

/**
 * BrainQuery — interactive Q&A client component.
 *
 * Rendered on /brain when user is signed in. Submits to POST /api/brain,
 * displays the answer with source tier and evidence count metadata.
 * If the user is not signed in, shows a sign-in prompt instead.
 */

import { useState } from "react";

interface BrainAnswer {
  answer: string;
  evidenceCount: number;
  sourceTiers: number[];
  governanceNote?: string;
}

interface BrainQueryProps {
  isSignedIn: boolean;
}

const EXAMPLE_QUERIES = [
  "Is there any line movement data available for upcoming games?",
  "What market intelligence is currently in the vault?",
  "How are confidence scores calculated for picks?",
];

export function BrainQuery({ isSignedIn }: BrainQueryProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<BrainAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-mineral bg-gray-900/60 p-8 text-center">
        <p className="text-sm text-gray-400">
          Sign in to ask the Research Brain a question.
        </p>
        <a
          href="/auth/signin"
          className="mt-4 inline-flex items-center rounded-lg bg-cyan-300 px-5 py-2.5 text-sm font-bold text-gray-950 hover:bg-cyan-200"
        >
          Sign in
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (res.status === 503) {
        const body = await res.json() as { error: string; gate?: string };
        if (body.gate === "ANTHROPIC_API_KEY_MISSING") {
          setError("The Research Brain is in beta and not yet active. Sign up to be notified when it opens.");
        } else {
          setError(body.error ?? "Brain temporarily unavailable.");
        }
        return;
      }

      if (!res.ok) {
        const body = await res.json() as { error: string };
        setError(body.error ?? "An error occurred.");
        return;
      }

      const data = await res.json() as BrainAnswer;
      setAnswer(data);
    } catch {
      setError("Could not reach the Research Brain. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="brain-query">
          Research Brain query
        </label>
        <textarea
          id="brain-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a structured sports intelligence question…"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-mineral bg-gray-900/80 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
        />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            {query.length}/500
          </p>
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="inline-flex min-h-9 items-center rounded-lg bg-cyan-300 px-5 py-2 text-sm font-bold text-gray-950 hover:bg-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Thinking…" : "Ask Brain →"}
          </button>
        </div>
      </form>

      {/* Example queries */}
      {!answer && !loading && !error && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => setQuery(eq)}
              className="rounded-full border border-mineral px-3 py-1 text-xs text-gray-400 hover:border-cyan-700 hover:text-cyan-200 transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-xl border border-yellow-800 bg-yellow-950/30 px-5 py-4">
          <p className="text-sm text-yellow-200">{error}</p>
        </div>
      )}

      {/* Answer */}
      {answer && (
        <div className="mt-6 rounded-xl border border-mineral bg-gray-900/60 p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-purple-300">
              Research Brain
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{answer.evidenceCount} vault item{answer.evidenceCount !== 1 ? "s" : ""}</span>
              {answer.sourceTiers.length > 0 && (
                <span>
                  Tier{answer.sourceTiers.length !== 1 ? "s" : ""}{" "}
                  {answer.sourceTiers.join(", ")}
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-gray-200 whitespace-pre-wrap">
            {answer.answer}
          </p>

          {answer.governanceNote && (
            <p className="mt-4 text-xs text-gray-500">
              Gate: {answer.governanceNote}
            </p>
          )}

          <p className="mt-5 text-xs text-gray-600">
            Answers are limited to current Evidence Vault contents. Not financial or betting advice.
          </p>

          <button
            type="button"
            onClick={() => { setAnswer(null); setQuery(""); }}
            className="mt-3 text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
          >
            Ask another question
          </button>
        </div>
      )}
    </div>
  );
}
