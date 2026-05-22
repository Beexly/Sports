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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
            disabled
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-500"
          >
            Run compliance scan
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-500"
          >
            Submit for publish
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
