"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface JournalEntryEditorProps {
  readonly entryId: string;
  readonly initialTitle: string;
  readonly initialBodyMarkdown: string;
  readonly isBodyEditable: boolean;
  readonly status: string;
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

interface RetractResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly data?: {
    readonly status?: string;
    readonly retractedAt?: string | null;
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
    return <p className="text-sm text-ion-3">No draft body yet.</p>;
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
          <p key={`${section}-${index}`} className="whitespace-pre-wrap text-sm leading-6 text-ion-1">
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
  status,
}: JournalEntryEditorProps): JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [bodyMarkdown, setBodyMarkdown] = useState(initialBodyMarkdown);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse["data"] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retractionReason, setRetractionReason] = useState("");
  const [retractMessage, setRetractMessage] = useState<string | null>(null);
  const [retractError, setRetractError] = useState<string | null>(null);

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
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function retractEntry(): Promise<void> {
    if (status !== "PUBLISHED" || isRetracting) return;
    setIsRetracting(true);
    setRetractMessage(null);
    setRetractError(null);

    try {
      const response = await fetch(`/api/cockpit/journal/${entryId}/retract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: retractionReason }),
      });
      const payload = (await response.json().catch(() => ({}))) as RetractResponse;

      if (!response.ok || !payload.success) {
        setRetractError(payload.error ?? "Retraction failed");
        return;
      }

      setRetractMessage(`Retracted ${payload.data?.retractedAt ?? "just now"}`);
      router.refresh();
    } catch (error) {
      setRetractError(error instanceof Error ? error.message : "Retraction failed");
    } finally {
      setIsRetracting(false);
    }
  }

  return (
    <main className="space-y-4 rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Markdown editor</h2>
          <p className="mt-1 text-xs text-ion-3">
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
            className="rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60 disabled:text-ion-3"
          >
            {isSaving ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={runComplianceScan}
            disabled={isScanning}
            className="rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60 disabled:text-ion-3"
          >
            {isScanning ? "Scanning..." : "Run compliance scan"}
          </button>
          <button
            type="button"
            onClick={submitForReview}
            disabled={!isBodyEditable || !scanResult?.publishAllowed || isSubmitting}
            className="rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60 disabled:text-ion-3"
          >
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </button>
          {status === "PUBLISHED" ? (
            <button
              type="button"
              onClick={retractEntry}
              disabled={isRetracting || retractionReason.trim().length < 12}
              className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/30 disabled:text-ion-3"
            >
              {isRetracting ? "Retracting..." : "Retract entry"}
            </button>
          ) : null}
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
        <section className="rounded-lg border border-titanium/40 bg-black/30 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ion-1">
              Compliance: {scanResult.status.toUpperCase()}
            </p>
            <p className={scanResult.publishAllowed ? "text-emerald-300" : "text-rose-300"}>
              {scanResult.publishAllowed ? "Publish gate can proceed." : "Publish gate blocked."}
            </p>
          </div>
          {scanResult.flags.length > 0 ? (
            <ul className="mt-3 space-y-2 text-ion-2">
              {scanResult.flags.map((flag) => (
                <li key={flag.id} className="rounded border border-titanium/40 bg-obsidian/70 p-2">
                  <span className="font-semibold text-ion-1">{flag.id}:</span> {flag.message}
                  {flag.suggestion ? <span className="block text-ion-3">{flag.suggestion}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ion-3">No compliance flags found.</p>
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
      {status === "PUBLISHED" ? (
        <section className="rounded-lg border border-rose-500/30 bg-rose-950/10 p-3">
          <label className="block text-xs font-semibold text-rose-100">
            Retraction reason
            <textarea
              value={retractionReason}
              onChange={(event) => setRetractionReason(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-rose-500/30 bg-black/40 p-3 text-xs leading-5 text-ion-white outline-none focus:border-rose-400"
              placeholder="Required before retracting a published Journal entry."
            />
          </label>
          {retractMessage ? (
            <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              {retractMessage}
            </p>
          ) : null}
          {retractError ? (
            <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {retractError}
            </p>
          ) : null}
        </section>
      ) : null}

      <label className="block text-xs font-semibold text-ion-1">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={!isBodyEditable}
          className="mt-2 w-full rounded-lg border border-titanium/40 bg-black/40 p-3 text-sm text-ion-white outline-none focus:border-yellow-500/60"
        />
      </label>

      <textarea
        aria-label="Model Journal markdown body"
        readOnly={!isBodyEditable}
        value={bodyMarkdown}
        onChange={(event) => setBodyMarkdown(event.target.value)}
        className="min-h-[460px] w-full resize-y rounded-lg border border-titanium/40 bg-black/40 p-3 font-mono text-xs leading-5 text-ion-1 outline-none focus:border-yellow-500/60"
      />

      <section className="rounded-lg border border-titanium/40 bg-black/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Preview</h2>
          <span className="text-[10px] uppercase tracking-wide text-ion-3">First sections</span>
        </div>
        <Preview markdown={bodyMarkdown} />
      </section>
    </main>
  );
}
