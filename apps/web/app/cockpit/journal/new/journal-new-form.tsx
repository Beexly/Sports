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

interface WeekDataResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly data?: {
    readonly rangeStart: string;
    readonly rangeEnd: string;
    readonly picks: readonly {
      readonly id: string;
      readonly matchup: string;
      readonly selection: string;
      readonly result: string;
      readonly confidence: number;
      readonly edgeScore: number;
    }[];
    readonly lossAutopsies: readonly {
      readonly id: string;
      readonly pickId: string;
      readonly headline: string;
      readonly rootCause: string;
    }[];
    readonly counts: {
      readonly settledPicks: number;
      readonly wins: number;
      readonly losses: number;
      readonly pushes: number;
      readonly publicLossAutopsies: number;
    };
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
  const [draftWithClaude, setDraftWithClaude] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<WeekDataResponse["data"] | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  async function loadEvidencePreview(): Promise<void> {
    setIsLoadingEvidence(true);
    setEvidence(null);
    setEvidenceError(null);

    try {
      const params = new URLSearchParams({ isoWeek, isoYear });
      const response = await fetch(`/api/cockpit/journal/week-data?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as WeekDataResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setEvidenceError(payload.error ?? "journal-week-data-load-failed");
        return;
      }

      setEvidence(payload.data);
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : "journal-week-data-load-failed");
    } finally {
      setIsLoadingEvidence(false);
    }
  }

  async function createDraft(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/cockpit/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isoWeek, isoYear, bodyMarkdown, draftWithClaude }),
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
        <span className="text-xs font-semibold uppercase tracking-wide text-ion-3">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-11 rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-sm text-ion-white outline-none focus:border-caution"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-ion-3">ISO week</span>
          <input
            value={isoWeek}
            inputMode="numeric"
            onChange={(event) => setIsoWeek(event.target.value)}
            className="min-h-11 rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-sm text-ion-white outline-none focus:border-caution"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-ion-3">ISO year</span>
          <input
            value={isoYear}
            inputMode="numeric"
            onChange={(event) => setIsoYear(event.target.value)}
            className="min-h-11 rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-sm text-ion-white outline-none focus:border-caution"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-ion-3">Optional starter markdown</span>
        <textarea
          value={bodyMarkdown}
          onChange={(event) => setBodyMarkdown(event.target.value)}
          rows={12}
          className="min-h-[260px] rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 font-mono text-sm text-ion-white outline-none focus:border-caution"
          placeholder="Leave blank to create the standard weekly Journal draft outline."
        />
      </label>

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-titanium/40 bg-obsidian/60 px-3 py-2 text-sm text-ion-1">
        <input
          type="checkbox"
          checked={draftWithClaude}
          onChange={(event) => setDraftWithClaude(event.target.checked)}
          disabled={bodyMarkdown.trim().length > 0}
          className="h-4 w-4 rounded border-titanium/40 bg-carbon"
        />
        Generate the first draft from weekly evidence
      </label>

      <section className="rounded-lg border border-titanium/40 bg-carbon/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ion-3">
              Week evidence
            </p>
            <p className="mt-1 text-xs text-ion-2">
              Preview settled canonical picks and public loss autopsies before creating the draft.
            </p>
          </div>
          <button
            type="button"
            onClick={loadEvidencePreview}
            disabled={isLoadingEvidence}
            className="min-h-11 rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60 disabled:text-ion-3"
          >
            {isLoadingEvidence ? "Loading evidence..." : "Load evidence"}
          </button>
        </div>

        {evidence ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-ion-2 sm:grid-cols-5">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ion-3">Settled</dt>
              <dd className="mt-1 text-ion-white">{evidence.counts.settledPicks}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ion-3">Wins</dt>
              <dd className="mt-1 text-ion-white">{evidence.counts.wins}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ion-3">Losses</dt>
              <dd className="mt-1 text-ion-white">{evidence.counts.losses}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ion-3">Pushes</dt>
              <dd className="mt-1 text-ion-white">{evidence.counts.pushes}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-ion-3">Autopsies</dt>
              <dd className="mt-1 text-ion-white">{evidence.counts.publicLossAutopsies}</dd>
            </div>
          </dl>
        ) : null}

        {evidence && evidence.picks.length > 0 ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ion-3">
              Settled pick references
            </p>
            <ul className="mt-2 grid gap-2">
              {evidence.picks.slice(0, 6).map((pick) => (
                <li key={pick.id} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ion-1">{pick.matchup}</span>
                    <span className="text-ion-3">{pick.result}</span>
                  </div>
                  <p className="mt-1 text-ion-2">
                    {pick.selection} - confidence {pick.confidence} - edge {pick.edgeScore.toFixed(1)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ion-3">{pick.id}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {evidence && evidence.lossAutopsies.length > 0 ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ion-3">
              Public loss autopsies
            </p>
            <ul className="mt-2 grid gap-2">
              {evidence.lossAutopsies.slice(0, 4).map((autopsy) => (
                <li key={autopsy.id} className="rounded-lg border border-titanium/40 bg-obsidian/70 p-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-ion-1">{autopsy.headline}</span>
                    <span className="text-ion-3">{autopsy.rootCause}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-ion-3">
                    {autopsy.id} - pick {autopsy.pickId}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {evidenceError ? (
          <p className="mt-3 rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-xs text-alert">
            {evidenceError}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={createDraft}
        disabled={isSubmitting}
        className="min-h-11 rounded-lg border border-caution/60 bg-caution px-4 py-2 text-sm font-semibold text-eclipse transition hover:bg-caution disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating draft..." : "Create draft"}
      </button>
    </div>
  );
}
