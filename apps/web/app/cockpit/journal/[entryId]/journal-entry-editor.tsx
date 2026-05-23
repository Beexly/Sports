"use client";

import { useMemo, useState } from "react";

interface JournalEntryEditorProps {
  readonly entryId: string;
  readonly initialTitle: string;
  readonly initialBodyMarkdown: string;
  readonly isBodyEditable: boolean;
}

interface SaveResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly data?: {
    readonly title?: string;
    readonly bodyMarkdown?: string;
    readonly updatedAt?: string;
  };
}

interface ScanResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly data?: {
    readonly status: "green" | "yellow" | "red";
    readonly publishAllowed: boolean;
    readonly flags: readonly {
      readonly id: string;
      readonly message: string;
      readonly suggestion: string | null;
    }[];
  };
}

interface SubmitResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly data?: {
    readonly status?: string;
    readonly updatedAt?: string;
  };
}

function Preview({ markdown }: { readonly markdown: string }): JSX.Element {
  const sections = useMemo(
    () =>
      markdown
        .split(/\n{2,}/)
        .map((section) => section.trim())
        .filter(Boolean)
        .slice(0, 8),
    [markdown]
  );

  if (sections.length === 0) {
    return <p className="text-sm text-gray-500">No draft body yet.</p>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        if (section.startsWith("#")) {
          return (
            <h3 key={`${section}-${index}`} className="text-sm font-semibold text-white">
              {section.replace(/^#+\s*/, "")}
            </h3>
          );
        }
        return (
          <p key={`${section}-${index}`} className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
            {section}
          </p>
        );
      })}
    </div>
  );
}

export function JournalEntryEditor({
  entryId,
  initialTitle,
  initialBodyMarkdown,
  isBodyEditable,
}: JournalEntryEditorProps): JSX.Element {
  const [title, setTitle] = useState(initialTitle);
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBodyMarkdown);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse["data"] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function saveDraft(): Promise<void> {
    if (!isBodyEditable || isSaving) return;
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const response = await fetch(`/api/cockpit/journal/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, bodyMarkdown }),
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;

      if (!response.ok || !payload.success) {
        setSaveError(payload.error ?? "Save failed");
        return;
      }

      setSaveMessage(`Saved ${payload.data?.updatedAt ?? "just now"}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function runComplianceScan(): Promise<void> {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const response = await fetch(`/api/cockpit/journal/${entryId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyMarkdown }),
      });
      const payload = (await response.json().catch(() => ({}))) as ScanResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setScanError(payload.error ?? "Compliance scan failed");
        return;
      }

      setScanResult(payload.data);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Compliance scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  async function submitForReview(): Promise<void> {
    if (!isBodyEditable || isSubmitting || !scanResult?.publishAllowed) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/cockpit/journal/${entryId}/submit`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SubmitResponse;

      if (!response.ok || !payload.success) {
        setSubmitError(payload.error ?? "Submit failed");
        return;
      }

      setSubmitMessage(`Submitted for review ${payload.data?.updatedAt ?? "just now"}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-4 rounded-lg border border-gray-800 bg-gray-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Markdown editor</h2>
          <p className="mt-1 text-xs text-gray-500">
            {isBodyEditable
              ? "Draft body can be edited before publication."
              : "Published and retracted entries are preserved. Body edits are disabled."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={!isBodyEditable || isSaving}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900 disabled:text-gray-500"
          >
            {isSaving ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={runComplianceScan}
            disabled={isScanning}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900 disabled:text-gray-500"
          >
            {isScanning ? "Scanning..." : "Run compliance scan"}
          </button>
          <button
            type="button"
            onClick={submitForReview}
            disabled={!isBodyEditable || !scanResult?.publishAllowed || isSubmitting}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900 disabled:text-gray-500"
          >
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </div>

      {saveMessage ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {saveMessage}
        </p>
      ) : null}
      {saveError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {saveError}
        </p>
      ) : null}
      {scanResult ? (
        <section className="rounded-lg border border-gray-800 bg-black/30 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-gray-200">
              Compliance: {scanResult.status.toUpperCase()}
            </p>
            <p className={scanResult.publishAllowed ? "text-emerald-300" : "text-rose-300"}>
              {scanResult.publishAllowed ? "Publish gate can proceed." : "Publish gate blocked."}
            </p>
          </div>
          {scanResult.flags.length > 0 ? (
            <ul className="mt-3 space-y-2 text-gray-400">
              {scanResult.flags.map((flag) => (
                <li key={flag.id} className="rounded border border-gray-800 bg-gray-950/70 p-2">
                  <span className="font-semibold text-gray-200">{flag.id}:</span> {flag.message}
                  {flag.suggestion ? <span className="block text-gray-500">{flag.suggestion}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-gray-500">No compliance flags found.</p>
          )}
        </section>
      ) : null}
      {scanError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {scanError}
        </p>
      ) : null}
      {submitMessage ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {submitMessage}
        </p>
      ) : null}
      {submitError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {submitError}
        </p>
      ) : null}

      <label className="block text-xs font-semibold text-gray-300">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={!isBodyEditable}
          className="mt-2 w-full rounded-lg border border-gray-800 bg-black/40 p-3 text-sm text-gray-100 outline-none focus:border-yellow-500/60"
        />
      </label>

      <textarea
        aria-label="Model Journal markdown body"
        readOnly={!isBodyEditable}
        value={bodyMarkdown}
        onChange={(event) => setBodyMarkdown(event.target.value)}
        className="min-h-[460px] w-full resize-y rounded-lg border border-gray-800 bg-black/40 p-3 font-mono text-xs leading-5 text-gray-200 outline-none focus:border-yellow-500/60"
      />

      <section className="rounded-lg border border-gray-800 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Preview</h2>
          <span className="text-[10px] uppercase tracking-wide text-gray-600">First sections</span>
        </div>
        <Preview markdown={bodyMarkdown} />
      </section>
    </main>
  );
}
