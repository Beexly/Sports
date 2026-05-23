"use client";

/**
 * PickNarratorForm — operator-facing form for the pick-narrator (Cycle 25).
 *
 * Operator pastes a ScoredPick JSON, hits Narrate, sees the editorial
 * gloss + cited sources inline. POSTs to /api/cockpit/pick-narrator
 * (Cycle 26). Admin gating is the cockpit layout's job.
 *
 * Preview-only — does NOT persist. Refreshing the page clears state.
 */

import { useState, type FormEvent } from "react";

interface PickNarrativeReport {
  narrative: string;
  sources: string[];
  narratorVersion: string;
  model: string;
  narratedAt: string;
}

const SAMPLE_PICK = `{
  "gameId": "game-1",
  "pickType": "SPREAD",
  "selection": "Lakers -3.5",
  "line": -3.5,
  "confidence": 82,
  "edgeScore": 0.05,
  "consensusPct": 0.78,
  "bookmakerCount": 9,
  "dataQualityScore": 88,
  "tier": "PREMIUM",
  "pickGrade": "STRONG_PLAY",
  "riskLevel": "MODERATE",
  "reasoning": "deterministic reasoning",
  "reasoningShort": "deterministic teaser",
  "factorBreakdown": {
    "consensusScore": 24,
    "marketDepthScore": 18,
    "edgeScore": 18,
    "lineMovementScore": 6,
    "volatilityPenalty": -2,
    "factors": [
      {
        "name": "Market consensus",
        "impact": "positive",
        "description": "78% bookmaker consensus on Lakers",
        "weight": 24,
        "evidence": {
          "sourceCategory": "MARKET_PRICE",
          "sourceName": "the-odds-api",
          "freshnessStatus": "FRESH",
          "trustLevel": 90,
          "activationStatus": "ACTIVE",
          "whyUsedOrBlocked": "9 bookmakers agreeing"
        }
      }
    ]
  },
  "modelVersion": "v5.0.0",
  "dataFreshnessAt": "2026-05-23T18:00:00Z"
}`;

const MAX_INPUT_CHARS = 20_000;

export function PickNarratorForm() {
  const [pickJson, setPickJson] = useState(SAMPLE_PICK);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PickNarrativeReport | null>(null);

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setPending(true);
    setError(null);
    setReport(null);

    let pick: unknown;
    try {
      pick = JSON.parse(pickJson);
    } catch {
      setError("pick JSON is not valid JSON");
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/cockpit/pick-narrator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pick }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : `HTTP ${res.status}`);
        return;
      }
      setReport(body as PickNarrativeReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  const overLimit = pickJson.length > MAX_INPUT_CHARS;
  const submittable =
    !pending && pickJson.trim().length > 0 && !overLimit;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-200">
          ScoredPick JSON
        </span>
        <textarea
          data-testid="pick-narrator-input"
          value={pickJson}
          onChange={(e) => setPickJson(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-gray-600 focus:outline-none"
          placeholder='{"pickType":"SPREAD","selection":"...","confidence":80,...}'
        />
        <span
          className={`text-[11px] ${overLimit ? "text-red-400" : "text-gray-500"}`}
        >
          {pickJson.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} chars
          {overLimit ? " — over limit" : ""}
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          data-testid="pick-narrator-submit"
          disabled={!submittable}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:border-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Narrating…" : "Narrate"}
        </button>
        {error ? (
          <span data-testid="pick-narrator-error" className="text-sm text-red-400">
            {error}
          </span>
        ) : null}
      </div>

      {report ? (
        <section
          data-testid="pick-narrator-result"
          className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/40 p-4"
        >
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600">
              Editorial gloss
            </h3>
            <p className="mt-1 text-sm text-gray-200">{report.narrative}</p>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600">
              Sources cited
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              {report.sources.length > 0
                ? report.sources.join(", ")
                : "(none — pick had no ACTIVE source evidence)"}
            </p>
          </div>
          <p className="text-[10px] text-gray-600">
            {report.narratorVersion} · model {report.model} · {report.narratedAt}
          </p>
        </section>
      ) : (
        <p data-testid="pick-narrator-idle" className="text-sm text-gray-500">
          Paste a ScoredPick above and click Narrate.
        </p>
      )}
    </form>
  );
}
