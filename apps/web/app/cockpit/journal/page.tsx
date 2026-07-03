import Link from "next/link";
import { loadJournalDashboard, type JournalEntryListItem } from "@/lib/journal/load";

export const dynamic = "force-dynamic";

function statusClass(status: string): string {
  switch (status) {
    case "PUBLISHED":
      return "border-verify/40 bg-verify/10 text-verify";
    case "RETRACTED":
      return "border-alert/40 bg-alert/10 text-alert";
    case "REVIEW_PENDING":
      return "border-caution/40 bg-caution/10 text-caution";
    default:
      return "border-titanium/50 bg-obsidian/40 text-ion-1";
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
    <article className="rounded-lg border border-titanium/40 bg-obsidian/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label font-semibold uppercase tracking-wide text-ion-3">
            Week {entry.isoWeek}, {entry.isoYear} - {entry.modelVersion}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-ion-white">{entry.title}</h3>
        </div>
        <span className={`rounded-md border px-2 py-1 text-label font-semibold uppercase tracking-wide ${statusClass(entry.status)}`}>
          {entry.status.replace(/_/g, " ")}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-ion-2 sm:grid-cols-4">
        <div>
          <dt className="text-label uppercase tracking-wide text-ion-3">Drafted</dt>
          <dd className="mt-1">{formatDate(entry.draftedAt)}</dd>
        </div>
        <div>
          <dt className="text-label uppercase tracking-wide text-ion-3">Words</dt>
          <dd className="mt-1">{entry.wordCount}</dd>
        </div>
        <div>
          <dt className="text-label uppercase tracking-wide text-ion-3">Picks</dt>
          <dd className="mt-1">{entry.referencedPickCount}</dd>
        </div>
        <div>
          <dt className="text-label uppercase tracking-wide text-ion-3">Autopsies</dt>
          <dd className="mt-1">{entry.referencedAutopsyCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/cockpit/journal/${entry.id}`}
          className="rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60"
        >
          Open editor
        </Link>
        {entry.status === "PUBLISHED" ? (
          <Link
            href={`/journal/${entry.slug}`}
            className="rounded-lg border border-titanium/40 px-3 py-2 text-xs font-semibold text-ion-1 hover:bg-carbon/60"
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
    <section className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ion-white">{title}</h2>
        <span className="text-label uppercase tracking-wide text-ion-3">
          {entries.length} entries
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-ion-3">{empty}</p>
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
          <p className="text-label font-semibold uppercase tracking-widest text-yellow-300">
            Model Journal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ion-white">Operator Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-ion-2">
            Review weekly research drafts before they move to the public Journal.
            Published entries are preserved; retraction is the only removal path.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/cockpit/journal/new"
            className="min-h-11 rounded-lg border border-yellow-400/60 bg-yellow-400 px-4 py-2 text-sm font-semibold text-eclipse hover:bg-yellow-300"
          >
            Create draft
          </Link>
          <div className="rounded-lg border border-titanium/40 bg-obsidian/60 p-3 text-sm">
            <p className="text-label uppercase tracking-wide text-ion-3">Next publish</p>
            <p className="mt-1 font-semibold text-ion-white">{data.nextPublishLabel}</p>
          </div>
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
