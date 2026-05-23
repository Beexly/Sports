"use client";

/**
 * DraftReviewerForm — operator-facing form for the semantic draft reviewer.
 *
 * Paste a draft, hit Run review, see the verdict + findings inline.
 * POSTs to /api/cockpit/review-draft (Cycle 3). Admin gating is the
 * cockpit layout's job — this component does not check role itself.
 *
 * Findings are NOT persisted; the form has no state beyond what's
 * already on screen. Refreshing the page clears everything.
 */

import { useState, type FormEvent } from "react";

type Severity = "BLOCK" | "WARN";
type Verdict = "READY" | "REVISE" | "REJECT";

interface Finding {
  severity: Severity;
  quote: string;
  bannedPhraseSemantic: string;
  explanation: string;
  suggestion: string;
}

interface ReviewReport {
  findings: Finding[];
  summary: {
    totalFindings: number;
    blockingFindings: number;
    verdict: Verdict;
  };
  model: string;
  reviewedAt: string;
}

const MAX_CONTENT_CHARS = 12_000;

const VERDICT_STYLES: Record<Verdict, { label: string; className: string }> = {
  READY: {
    label: "READY",
    className:
      "bg-green-900/40 text-green-300 border-green-800",
  },
  REVISE: {
    label: "REVISE",
    className:
      "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  },
  REJECT: {
    label: "REJECT",
    className: "bg-red-900/40 text-red-300 border-red-800",
  },
};

export function DraftReviewerForm() {
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewReport | null>(null);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/cockpit/review-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          ...(context.trim().length > 0 ? { context } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          typeof body?.error === "string" ? body.error : `HTTP ${res.status}`
        );
        return;
      }
      setResult(body as ReviewReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  const charCount = content.length;
  const overLimit = charCount > MAX_CONTENT_CHARS;
  const submittable = !pending && content.trim().length > 0 && !overLimit;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-200">
          Draft content
        </span>
        <textarea
          data-testid="draft-content-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
          placeholder="Paste the draft text here (title + excerpt + content + SEO line)."
        />
        <span
          className={`text-[11px] ${overLimit ? "text-red-400" : "text-gray-500"}`}
        >
          {charCount.toLocaleString()} / {MAX_CONTENT_CHARS.toLocaleString()} chars
          {overLimit ? " — over limit" : ""}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-200">
          Context (optional)
        </span>
        <input
          data-testid="draft-context-input"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="rounded-lg border border-gray-800 bg-gray-950 p-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
          placeholder="e.g. BLOG_POST, DAILY_BRIEF_DRAFT"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          data-testid="draft-run-review"
          disabled={!submittable}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Reviewing…" : "Run review"}
        </button>
        {error ? (
          <span
            data-testid="draft-review-error"
            className="text-sm text-red-400"
          >
            {error}
          </span>
        ) : null}
      </div>

      {result ? (
        <section
          data-testid="draft-review-result"
          className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4"
        >
          <header className="flex flex-wrap items-center gap-3">
            <span
              data-testid="draft-review-verdict"
              className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${VERDICT_STYLES[result.summary.verdict].className}`}
            >
              {VERDICT_STYLES[result.summary.verdict].label}
            </span>
            <span className="text-[11px] text-gray-500">
              {result.summary.totalFindings} finding
              {result.summary.totalFindings === 1 ? "" : "s"} ·{" "}
              {result.summary.blockingFindings} blocking · model {result.model}
            </span>
          </header>

          {result.findings.length === 0 ? (
            <p
              data-testid="draft-review-empty"
              className="text-sm text-gray-400"
            >
              No findings. The draft reads clean against the trust-claim
              registry. Operator may proceed to next review gate.
            </p>
          ) : (
            <ul
              data-testid="draft-review-findings"
              className="flex flex-col gap-3"
            >
              {result.findings.map((f, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-800 bg-gray-950 p-3"
                >
                  <header className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        f.severity === "BLOCK"
                          ? "bg-red-900/40 text-red-300"
                          : "bg-yellow-900/40 text-yellow-300"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      semantically equivalent to{" "}
                      <code className="text-gray-300">
                        {f.bannedPhraseSemantic}
                      </code>
                    </span>
                  </header>
                  <p className="mt-2 text-sm italic text-gray-300">
                    “{f.quote}”
                  </p>
                  <p className="mt-1 text-sm text-gray-400">{f.explanation}</p>
                  <p className="mt-2 text-sm text-gray-200">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600">
                      Suggested rewrite
                    </span>
                    <br />
                    {f.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p
          data-testid="draft-review-idle"
          className="text-sm text-gray-500"
        >
          Paste a draft above and click Run review.
        </p>
      )}
    </form>
  );
}
