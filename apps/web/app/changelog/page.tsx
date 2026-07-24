import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /changelog - public transparency feed.
 *
 * Entries are hardcoded for the launch window. Once update cadence becomes
 * weekly, this can move to a DB-backed content collection.
 */

export const metadata: Metadata = {
  title: "Changelog - Ship log for Galaxy Sports Edge",
  description:
    "What changed and when. Every model version, gate flip, and calibration update logged publicly.",
  alternates: { canonical: "/changelog" },
};

type Entry = {
  date: string;
  type: "launch" | "ship" | "gate" | "calibration" | "voice";
  title: string;
  body: string;
};

const TYPE_LABEL: Record<Entry["type"], string> = {
  launch: "Launch",
  ship: "Ship",
  gate: "Gate flip",
  calibration: "Calibration",
  voice: "Voice / copy",
};

const TYPE_COLOR: Record<Entry["type"], string> = {
  launch: "text-plasma-glow border-plasma-glow",
  ship: "text-ion-blue-glow border-ion-blue/40",
  gate: "text-ultraviolet border-ultraviolet/40",
  calibration: "text-ultraviolet border-ultraviolet/40",
  voice: "text-ion-1 border-mineral",
};

const ENTRIES: ReadonlyArray<Entry> = [
  {
    date: "2026-05-21",
    type: "ship",
    title: "Anatomy of a Signal, vs. Tout Services, and brand voice refresh",
    body:
      "Added an annotated sample-signal card to the homepage so the product is visible, not just described. Added a /vs/tout-services SEO landing page, refreshed customer-facing copy to a consistent brand voice, added FAQ schema, Organization and WebSite schema, per-page metadata, and noindex layouts for operator pages.",
  },
  {
    date: "2026-05-21",
    type: "voice",
    title: "Single front-door inbox: hq@galaxysportsedge.com",
    body:
      "Consolidated support and legal contact copy into hq@galaxysportsedge.com so every customer message lands in one place.",
  },
  {
    date: "2026-05-21",
    type: "launch",
    title: "Round 1 launch messaging prepared",
    body:
      "Launch copy is ready for @GalaxySportsAI and @galaxysportsedge. IG and FB follow once the Round 1 brand-board asset ships.",
  },
  {
    date: "2026-05-20",
    type: "launch",
    title: "Site live at galaxysportsedge.com",
    body:
      "Silent launch. Marketing surface open. Performance and Vault gated. Paywall off. Cron routes for odds refresh wired. Public smoke passed with only the expected ingestion-health warning.",
  },
  {
    date: "2026-05-20",
    type: "gate",
    title: "CANONICAL_HISTORY_ENABLED set to true",
    body:
      "Settled-pick logging is on. Every settled signal now starts contributing to the canonical record that will eventually unlock the Calibration Report.",
  },
];

function groupByDate(entries: ReadonlyArray<Entry>) {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function ChangelogPage() {
  const grouped = groupByDate(ENTRIES);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Changelog</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              What changed, when, and why.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ion-1">
              Every model version, every gate flip, every calibration update
              logged publicly. {BRAND_NAME} runs on transparency, which means
              the velocity of the product has to be transparent too.
            </p>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <ol className="flex flex-col gap-12">
              {grouped.map(([date, entries]) => (
                <li key={date} className="grid gap-6 md:grid-cols-[140px_1fr]">
                  <div className="md:sticky md:top-24 md:self-start">
                    <time
                      dateTime={date}
                      className="font-mono text-xs uppercase tracking-widest text-ion-2"
                    >
                      {formatDate(date)}
                    </time>
                  </div>

                  <div className="flex flex-col gap-6">
                    {entries.map((entry) => (
                      <article
                        key={entry.title}
                        className="surface-card flex flex-col gap-3 p-6"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${TYPE_COLOR[entry.type]}`}
                          >
                            {TYPE_LABEL[entry.type]}
                          </span>
                        </div>
                        <h2 className="font-display text-xl font-semibold text-ion-white">
                          {entry.title}
                        </h2>
                        <p className="text-sm leading-relaxed text-ion-1">
                          {entry.body}
                        </p>
                      </article>
                    ))}
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-12 border-t border-mineral/40 pt-6 text-center text-xs text-ion-2">
              Updates ship weekly.{" "}
              <Link
                href="/auth/signin"
                className="text-orbital-cyan underline-offset-4 hover:underline"
              >
                Create a free account
              </Link>{" "}
              and you&apos;ll get the next one in your inbox.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function formatDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
