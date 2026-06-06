import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflverseInjuryReport, type ReportStatus } from "@/lib/nflverse/injury-report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NFL Injury Report — Official Designations (Real, Read-Only)",
  description:
    "The latest official team-submitted NFL injury designations (Out / Doubtful / Questionable) and practice status, read-only from nflverse. Availability is the top non-market driver of outcomes.",
  alternates: { canonical: "/players/injuries" },
};

const STATUS_STYLE: Record<ReportStatus, string> = {
  Out: "border-alert/50 text-alert",
  Doubtful: "border-amber-400/40 text-amber-300",
  Questionable: "border-orbital-cyan/40 text-orbital-cyan",
  Other: "border-mineral text-ion-2",
};

export default async function InjuriesPage(): Promise<JSX.Element> {
  const report = await loadNflverseInjuryReport();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Injury report</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Who is actually available.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              The official, team-submitted injury designations and practice status for the latest
              week in the source file. Availability is the single highest-value non-market driver of
              game outcomes. These are reported facts as published &mdash; not our guess at who plays.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/injuries" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Production Lab</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {report.status === "live" ? `Season ${report.season}, week ${report.week ?? "N/A"}` : "Source unavailable"}
                </h2>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Out" value={String(report.counts.out)} tone="alert" />
              <Metric label="Doubtful" value={String(report.counts.doubtful)} tone="amber" />
              <Metric label="Questionable" value={String(report.counts.questionable)} tone="cyan" />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Note</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{report.note}</p>
            </div>
          </div>
        </section>

        {report.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This report is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{report.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <section className="border border-mineral bg-eclipse/80">
              <div className="border-b border-mineral px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Latest week</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">Designations &amp; practice status</h2>
              </div>
              {report.rows.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ion-1">No designations in the latest week of the source file.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                      <tr>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Tm</th>
                        <th className="px-4 py-3">Pos</th>
                        <th className="px-4 py-3">Injury</th>
                        <th className="px-4 py-3">Practice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mineral bg-carbon">
                      {report.rows.map((r) => (
                        <tr key={`${r.playerId}-${r.team}`}>
                          <td className="px-4 py-3">
                            <span className={`rounded-ds-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${STATUS_STYLE[r.reportStatus]}`}>
                              {r.reportStatusRaw || r.practiceStatus || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-ion-white">{r.playerName}</td>
                          <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                          <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                          <td className="px-4 py-3 text-ion">{r.primaryInjury || "—"}</td>
                          <td className="px-4 py-3 text-ion-2">{r.practiceStatus || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-ion-2">{report.sourceUrl}</p>
              <Attribution sourceIds={["nflverse"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "alert" | "amber" | "cyan" }): JSX.Element {
  const color = tone === "alert" ? "text-alert" : tone === "amber" ? "text-amber-300" : "text-orbital-cyan";
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className={`mt-1 font-numerals text-xl font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
