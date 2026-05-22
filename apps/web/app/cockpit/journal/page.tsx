import Link from "next/link";
import { loadJournalDashboard, type JournalEntryListItem } from "@/lib/journal/load";

export const dynamic = "force-dynamic";

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

function JournalEntryRow({ entry }: { readonly entry: JournalEntryListItem }): JSX.Element {
  return (
    <article className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            Week {entry.isoWeek}, {entry.isoYear} - {entry.modelVersion}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">{entry.title}</h3>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(entry.status)}`}>
          {entry.status.replace(/_/g, " ")}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Drafted</dt>
          <dd className="mt-1">{formatDate(entry.draftedAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Words</dt>
          <dd className="mt-1">{entry.wordCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Picks</dt>
          <dd className="mt-1">{entry.referencedPickCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-gray-600">Autopsies</dt>
          <dd className="mt-1">{entry.referencedAutopsyCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/cockpit/journal/${entry.id}`}
          className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900"
        >
          Open editor
        </Link>
        {entry.status === "PUBLISHED" ? (
          <Link
            href={`/journal/${entry.slug}`}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-900"
          >
            View public entry
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function JournalSection({
  title,
  entries,
  empty,
}: {
  readonly title: string;
  readonly entries: readonly JournalEntryListItem[];
  readonly empty: string;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-[10px] uppercase tracking-wide text-gray-600">
          {entries.length} entries
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {entries.map((entry) => (
            <JournalEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CockpitJournalPage(): Promise<JSX.Element> {
  const data = await loadJournalDashboard();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
            Model Journal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">Operator Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Review weekly research drafts before they move to the public Journal.
            Published entries are preserved; retraction is the only removal path.
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-sm">
          <p className="text-[10px] uppercase tracking-wide text-gray-600">Next publish</p>
          <p className="mt-1 font-semibold text-gray-100">{data.nextPublishLabel}</p>
        </div>
      </header>

      <JournalSection
        title="Drafts Pending Review"
        entries={data.drafts}
        empty="No Journal drafts are waiting for review."
      />
      <JournalSection
        title="Published Entries"
        entries={data.published}
        empty="No Model Journal entries have been published yet."
      />
      <JournalSection
        title="Retracted Entries"
        entries={data.retracted}
        empty="No Journal entries have been retracted."
      />
    </div>
  );
}
