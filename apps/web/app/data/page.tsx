import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { clearedSources, forbiddenSources, type LegalSource, type LegalVerdict } from "@sports/data-ingestion";

export const metadata: Metadata = {
  title: "How We Source Data — Legally, Transparently",
  description:
    "Galaxy Sports Edge ingests only openly-licensed or licensed data, with attribution, and publicly refuses sources whose terms forbid it. Here is the full registry: what we use, what we won't touch, and why.",
  alternates: { canonical: "/data" },
};

const VERDICT_STYLE: Record<LegalVerdict, { label: string; className: string }> = {
  cleared: { label: "Cleared", className: "border-orbital-cyan/40 text-orbital-cyan" },
  "cleared-with-attribution": { label: "Cleared · attribute", className: "border-orbital-cyan/40 text-orbital-cyan" },
  licensed: { label: "Licensed", className: "border-orbital-cyan/40 text-orbital-cyan" },
  "use-with-caution": { label: "Use with caution", className: "border-caution/40 text-caution" },
  "paid-required": { label: "Paid plan required", className: "border-caution/40 text-caution" },
  forbidden: { label: "Refused", className: "border-alert/50 text-alert" },
};

export default function DataSourcingPage(): JSX.Element {
  const cleared = clearedSources();
  const blocked = forbiddenSources();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
            Data sourcing
          </p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            We only show data we are legally allowed to show.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ion-1">
            Every external source we ingest is declared in a registry with its real license,
            terms, attribution, and a legal verdict. Ingestion code checks that registry before it
            fetches a single row, so a source whose terms forbid commercial or automated use cannot
            be wired into the product. We prefer openly-licensed aggregators over scraping, we
            attribute what requires it, and we publish what we refuse to touch — and why.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/legal/sources" className="btn-primary min-h-11 px-5 py-3">
              JSON registry
            </Link>
            <Link
              href="/integrations"
              className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white"
            >
              Live readiness
            </Link>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-3 sm:max-w-md sm:grid-cols-2">
            <div className="border border-mineral bg-carbon px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Cleared to ingest</dt>
              <dd className="mt-1 font-numerals text-xl font-semibold tabular-nums text-orbital-cyan">{cleared.length}</dd>
            </div>
            <div className="border border-mineral bg-carbon px-3 py-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Refused / gated</dt>
              <dd className="mt-1 font-numerals text-xl font-semibold tabular-nums text-alert">{blocked.length}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-ion-white">Sources we ingest</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">
            Open-licensed or licensed feeds, used within their terms. Attribution is rendered
            wherever the data appears.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {cleared.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-ion-white">Sources we refuse to touch</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">
            Technically reachable, legally off-limits for a commercial product — or requiring spend
            we have not committed. We name them so the boundary is auditable, not implied.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {blocked.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        </section>

        <section className="border border-mineral bg-eclipse p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Sourcing doctrine</p>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-ion-1 md:grid-cols-2">
            <li>Prefer open-licensed aggregators over scraping.</li>
            <li>Read the actual license/ToS, not the marketing page.</li>
            <li>Respect robots.txt and anti-automation clauses — accessible is not permitted.</li>
            <li>Attribute every source whose license requires it.</li>
            <li>Cache politely, rate-limit ourselves, never re-expose a licensed feed.</li>
            <li>No fabricated data — every datapoint traces to a real source row.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SourceCard({ source }: { source: LegalSource }): JSX.Element {
  const verdict = VERDICT_STYLE[source.verdict];
  return (
    <article className="flex flex-col border border-mineral bg-eclipse p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ion-white">{source.provider}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{source.kind}</p>
        </div>
        <span className={`shrink-0 rounded-ds-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${verdict.className}`}>
          {verdict.label}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Field label="License">
          <a href={source.license.url} target="_blank" rel="noopener noreferrer" className="text-orbital-cyan hover:text-ion-white">
            {source.license.spdx ?? source.license.name}
          </a>
        </Field>
        <Field label="Commercial">{source.commercialUse ? "permitted" : "not granted"}</Field>
        <Field label="Attribution">{source.attributionRequired ? "required" : "not required"}</Field>
        <Field label="Rate limit">{source.rateLimit}</Field>
      </dl>

      <p className="mt-4 text-sm leading-6 text-ion-1">{source.reason}</p>

      {source.attributionRequired && source.attributionText ? (
        <p className="mt-3 border-l-2 border-orbital-cyan/40 pl-3 font-mono text-[10px] leading-5 text-ion-2">
          {source.attributionText}
        </p>
      ) : null}

      {source.datasets.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {source.datasets.slice(0, 10).map((dataset) => (
            <span key={dataset} className="rounded-ds-sm border border-mineral px-2 py-0.5 font-mono text-[10px] text-ion-2">
              {dataset}
            </span>
          ))}
          {source.datasets.length > 10 ? (
            <span className="px-1 font-mono text-[10px] text-ion-2">+{source.datasets.length - 10}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-0.5 text-ion">{children}</dd>
    </div>
  );
}
