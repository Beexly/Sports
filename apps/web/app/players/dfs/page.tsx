import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadDfsSalaries, type DfsProviderStatus, type DfsSalaryRow } from "@/lib/dfs/salaries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DraftKings DFS Salaries — Licensed & Cross-Checked",
  description:
    "DraftKings salaries via licensed DFS providers, pulled from multiple feeds and reconciled so disagreements are flagged. We do not scrape DK's hidden API (their Terms prohibit it).",
  alternates: { canonical: "/players/dfs" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

const AGREEMENT_STYLE: Record<DfsSalaryRow["agreement"], string> = {
  agree: "border-orbital-cyan/40 text-orbital-cyan",
  single: "border-mineral text-ion-2",
  disagree: "border-alert/50 text-alert",
};

const PROVIDER_STYLE: Record<DfsProviderStatus["status"], string> = {
  live: "border-orbital-cyan/40 text-orbital-cyan",
  error: "border-alert/50 text-alert",
  "not-configured": "border-mineral text-ion-2",
};

export default async function DfsPage(): Promise<JSX.Element> {
  const dfs = await loadDfsSalaries();
  const connectedLive = dfs.providers.filter((p) => p.status === "live").length;

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">DFS salaries</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              DraftKings salaries &mdash; licensed, and cross-checked.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              DraftKings&apos; Terms prohibit automated commercial collection, so we do{" "}
              <span className="text-ion-white">not</span> scrape their API. DK salaries flow through{" "}
              <span className="text-orbital-cyan">licensed DFS providers</span> &mdash; and because
              these are third-party feeds, we pull from <span className="text-ion-white">multiple
              sources at once</span> and reconcile them. A salary is trusted when feeds agree; any
              disagreement is flagged, not silently picked. If one feed goes down, the others keep
              the board live.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/dfs/salaries" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/data" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we source data</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Feeds</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dfs.providers.map((p) => (
                <span
                  key={p.id}
                  className={`rounded-ds-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${PROVIDER_STYLE[p.status]}`}
                  title={p.error ?? undefined}
                >
                  {p.label}: {p.status === "live" ? `${p.rowCount} rows` : p.status === "error" ? "down" : "off"}
                </span>
              ))}
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3">
              <Metric label="Live feeds" value={`${connectedLive}/${dfs.providers.length}`} />
              <Metric label="Salaries" value={String(dfs.rows.length)} />
              <Metric label="Disagreements" value={String(dfs.discrepancies)} />
            </dl>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Why no scraping</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{dfs.gate.refusedNote}</p>
            </div>
          </div>
        </section>

        {dfs.status === "live" && dfs.rows.length > 0 ? (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">DraftKings salaries · {dfs.date}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Reconciled across {connectedLive} feed{connectedLive === 1 ? "" : "s"}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">DK salary</th>
                    <th className="px-4 py-3">Feeds</th>
                    <th className="px-4 py-3">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {dfs.rows.map((r, i) => (
                    <tr key={`${r.name}-${r.team}`}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">${numberFormatter.format(r.salary)}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.providerCount}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-ds-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${AGREEMENT_STYLE[r.agreement]}`}>
                          {r.agreement === "disagree" ? `±$${numberFormatter.format(r.spread)}` : r.agreement}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Connect licensed feeds</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">
              {dfs.status === "source-error"
                ? "Feeds are configured but none returned a slate right now."
                : "No DraftKings salaries shown — no licensed feed is connected."}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">{dfs.gate.legalNote}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="border border-mineral bg-carbon p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Provider keys (any/all)</p>
                <ul className="mt-2 space-y-1">
                  {dfs.gate.requiredEnv.map((envVar) => (
                    <li key={envVar} className="font-mono text-sm text-orbital-cyan">{envVar}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ion-2">Configure two or more to enable cross-checking.</p>
              </div>
              <div className="border border-mineral bg-carbon p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Feed status</p>
                <ul className="mt-2 space-y-1">
                  {dfs.providers.map((p) => (
                    <li key={p.id} className="font-mono text-sm">
                      <span className="text-ion-white">{p.label}</span>
                      <span className="text-ion-2"> — {p.status}{p.error ? ` (${p.error})` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-lg font-semibold tabular-nums text-ion-white">{value}</dd>
    </div>
  );
}
