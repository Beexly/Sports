import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import {
  REPORT_TYPES,
  getReportType,
  isValidReportTypeId,
} from "@/lib/galaxy/kernel/reports";

// ─────────────────────────────────────────────
// Static params — one route per report type
// ─────────────────────────────────────────────

export function generateStaticParams() {
  return REPORT_TYPES.map((r) => ({ type: r.id }));
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!isValidReportTypeId(type)) return {};
  const report = getReportType(type)!;
  return {
    title: `${report.name} — Galaxy Reports`,
    description: report.description,
    alternates: { canonical: `/reports/${type}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${report.name} — Galaxy Sports Edge`,
      description: report.description,
    },
  };
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function ReportTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isValidReportTypeId(type)) notFound();

  const report = getReportType(type)!;
  const otherTypes = REPORT_TYPES.filter((r) => r.id !== type);

  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* ── Breadcrumb ──────────────────────────── */}
          <nav aria-label="Breadcrumb" className="mb-10">
            <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              <li>
                <Link href="/reports" className="hover:text-gray-300 transition-colors">
                  Reports
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li className="text-gray-400">{report.eyebrowLabel}</li>
            </ol>
          </nav>

          {/* ── Header ──────────────────────────────── */}
          <header className="mb-14">
            <div className="mb-4 flex items-center gap-2">
              <span
                className={["h-2 w-2 rounded-full", report.dotClass].join(" ")}
                aria-hidden="true"
              />
              <span
                className={[
                  "font-mono text-[10px] font-semibold uppercase tracking-[0.2em]",
                  report.labelClass,
                ].join(" ")}
              >
                {report.eyebrowLabel}
              </span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {report.name}
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-gray-400">
              {report.description}
            </p>

            <div className="mt-5 flex items-center gap-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Cadence
              </span>
              <span className="font-mono text-[10px] text-gray-300">
                {report.cadence}
              </span>
            </div>
          </header>

          {/* ── Anatomy ─────────────────────────────── */}
          <section
            aria-label="What this report covers"
            className={[
              "mb-14 rounded-2xl border p-8",
              report.accentClass,
            ].join(" ")}
          >
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              What&apos;s inside
            </p>
            <p className="leading-relaxed text-gray-300">{report.anatomy}</p>
          </section>

          {/* ── Source + evidence disclosure ─────────── */}
          <section
            aria-label="Evidence and source"
            className="mb-14 rounded-2xl border border-mineral bg-gray-900/50 p-6"
            data-trust-strip="reports-detail"
          >
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Evidence chain
            </p>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wide text-gray-500">
                  Data source
                </dt>
                <dd className="mt-1 text-sm text-gray-300">
                  Galaxy model output — odds data, line movement, public signals
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wide text-gray-500">
                  Sample status
                </dt>
                <dd className="mt-1 text-sm text-gray-300">
                  {report.id === "nobet"
                    ? "Live — passes published when gate not cleared"
                    : "Sample data — live reports unlock in closed beta"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wide text-gray-500">
                  Methodology
                </dt>
                <dd className="mt-1 text-sm">
                  <Link
                    href="/methodology"
                    className="text-accent-300 underline underline-offset-2 hover:text-accent-200 transition-colors"
                  >
                    How Galaxy scores and gates →
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          {/* ── Access CTA ──────────────────────────── */}
          <section
            aria-label="Access"
            className="mb-14 rounded-2xl border border-mineral bg-gray-900/50 p-6"
          >
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Access
            </p>
            {report.tier === "all" ? (
              <p className="text-sm leading-relaxed text-gray-300">
                {report.name} is available to all subscribers including the Free tier.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-gray-300">
                {report.name} is included with Pro and Elite plans.{" "}
                <Link
                  href="/pricing"
                  className="text-accent-300 underline underline-offset-2 hover:text-accent-200 transition-colors"
                >
                  View pricing →
                </Link>
              </p>
            )}
          </section>

          {/* ── Responsible play ────────────────────── */}
          <div className="mb-14">
            <RiskDisclosure variant="compact" />
          </div>

          {/* ── Other report types ───────────────────── */}
          <section aria-label="Other report types" className="mb-8">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Other Report Types
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {otherTypes.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className={[
                    "flex items-center gap-3 rounded-xl border p-4 transition-opacity hover:opacity-90",
                    r.accentClass,
                  ].join(" ")}
                >
                  <span
                    className={["h-1.5 w-1.5 rounded-full shrink-0", r.dotClass].join(" ")}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-white">{r.name}</span>
                  <span className={["ml-auto font-mono text-[9px] uppercase tracking-widest", r.labelClass].join(" ")}>
                    {r.cadence}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-6">
            <Link
              href="/reports"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← All reports
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
