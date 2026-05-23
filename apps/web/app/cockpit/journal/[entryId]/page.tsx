import Link from "next/link";
import { notFound } from "next/navigation";
import { loadJournalEntryDetail, type JournalEntryDetail } from "@/lib/journal/load";
import { JournalEntryEditor } from "./journal-entry-editor";

export const dynamic = "force-dynamic";

interface Params {
  readonly entryId: string;
}

function statusClass(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "RETRACTED":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "REVIEW_PENDING":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function MetaRail({ entry }: { readonly entry: JournalEntryDetail }): JSX.Element {
  return (
    <aside className="space-y-4 rounded-lg border border-gray-800 bg-gray-950/50 p-4">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-600">Entry meta</p>
        <h2 className="mt-1 text-sm font-semibold text-white">
          Week {entry.isoWeek}, {entry.isoYear}
        </h2>
      </div>
      <dl className="space-y-3 text-xs text-gray-400">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Status</dt>
          <dd className={`mt-1 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(entry.status)}`}>
            {entry.status.replace(/_/g, " ")}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Model version</dt>
          <dd className="mt-1">{entry.modelVersion}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Author</dt>
          <dd className="mt-1 break-words">{entry.authorEmail}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Word count</dt>
          <dd className="mt-1">{entry.wordCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Last saved</dt>
          <dd className="mt-1">{formatDate(entry.updatedAt)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function WeekDataRail({ entry }: { readonly entry: JournalEntryDetail }): JSX.Element {
  return (
    <aside className="space-y-4 rounded-lg border border-gray-800 bg-gray-950/50 p-4">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-600">Week data</p>
        <h2 className="mt-1 text-sm font-semibold text-white">Evidence attached</h2>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs text-gray-400">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Picks</dt>
          <dd className="mt-1">{entry.referencedPickIds.length}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Autopsies</dt>
          <dd className="mt-1">{entry.referencedAutopsyIds.length}</dd>
        </div>
      </dl>
      <ReferenceList title="Referenced Picks" values={entry.referencedPickIds} />
      <ReferenceList title="Cited Autopsies" values={entry.referencedAutopsyIds} />
      <div className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">Distribution</p>
        <dl className="mt-2 space-y-2 text-xs text-gray-400">
          <div className="flex justify-between gap-3">
            <dt>Published</dt>
            <dd>{formatDate(entry.publishedAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Email</dt>
            <dd>{formatDate(entry.emailedAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Teaser</dt>
            <dd>{formatDate(entry.twitterTeasedAt)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

function ReferenceList({
  title,
  values,
}: {
  readonly title: string;
  readonly values: readonly string[];
}): JSX.Element {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-600">{title}</p>
      {values.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">None attached.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs text-gray-400">
          {values.slice(0, 8).map((value) => (
            <li key={value} className="truncate rounded border border-gray-800 bg-gray-950/70 px-2 py-1">
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CockpitJournalEntryPage({
  params,
}: {
  readonly params: Params;
}): Promise<JSX.Element> {
  const entry = await loadJournalEntryDetail(params.entryId);
  if (!entry) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/cockpit/journal" className="text-xs text-gray-500 hover:text-gray-300">
            Back to Journal
          </Link>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
            Model Journal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">{entry.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Review the weekly essay draft, attached evidence, and distribution state before the public route goes live.
          </p>
        </div>
        {entry.status === "PUBLISHED" ? (
          <Link
            href={`/journal/${entry.slug}`}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900"
          >
            View public entry
          </Link>
        ) : null}
      </header>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <MetaRail entry={entry} />

        <JournalEntryEditor
          entryId={entry.id}
          initialTitle={entry.title}
          initialBodyMarkdown={entry.bodyMarkdown}
          isBodyEditable={entry.isBodyEditable}
          status={entry.status}
        />

        <WeekDataRail entry={entry} />
      </div>
    </div>
  );
}
