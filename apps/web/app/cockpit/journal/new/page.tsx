import Link from "next/link";
import { JournalNewForm } from "./journal-new-form";

export const dynamic = "force-dynamic";

export default function NewJournalEntryPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/cockpit/journal" className="text-xs text-ion-3 hover:text-ion-1">
          Back to Journal
        </Link>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
          Model Journal
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ion-white">Create Draft</h1>
        <p className="mt-2 max-w-3xl text-sm text-ion-2">
          Start a weekly research draft. Creation does not publish, email, post,
          or update the public feed.
        </p>
      </header>

      <section className="rounded-lg border border-titanium/40 bg-obsidian/50 p-4">
        <JournalNewForm />
      </section>
    </div>
  );
}
