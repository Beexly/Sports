import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import {
  loadOpportunityTransfer,
  type TransferConfidence,
} from "@/lib/intelligence/opportunity-transfer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunity Transfer — who inherits the vacated role",
  description:
    "When a player is OUT, we quantify the targets and carries his role vacates and rank the most likely beneficiary — the waiver predictive core. Real nflverse data, not a pick.",
  alternates: { canonical: "/intelligence/opportunity-transfer" },
};

const CONFIDENCE_LABEL: Record<TransferConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// High confidence = strong, clean transfer signal (buy); low = negligible/no
// beneficiary (sell); medium = open but unclear (neutral).
function confidenceClass(c: TransferConfidence): string {
  if (c === "high") return "text-orbital-cyan";
  if (c === "low") return "text-plasma";
  return "text-ion-2";
}

export default async function OpportunityTransferPage(): Promise<JSX.Element> {
  const transfer = await loadOpportunityTransfer();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Opportunity Transfer</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            Opportunity Transfer &mdash; who inherits the vacated role
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            When a player is OUT, we quantify the targets and carries his role vacates and rank the
            most likely beneficiary &mdash; the waiver predictive core.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/api/intelligence/opportunity-transfer" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
          </div>
        </section>

        {transfer.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{transfer.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Vacated-role transfers{transfer.week ? ` · ${transfer.season} week ${transfer.week}` : ` · ${transfer.season}`}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Where the volume goes next</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{transfer.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Out (vacating)</th>
                    <th className="px-4 py-3" title="trailing per-game targets the role vacates">Vac Tgt</th>
                    <th className="px-4 py-3" title="trailing per-game carries the role vacates">Vac Car</th>
                    <th className="px-4 py-3">Beneficiary</th>
                    <th className="px-4 py-3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {transfer.rows.map((r, i) => (
                    <tr key={`${r.team}-${r.position}-${r.outPlayer}`} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.outPlayer}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.vacatedTargets.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.vacatedCarries.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.beneficiary ?? "—"}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${confidenceClass(r.confidence)}`}>{CONFIDENCE_LABEL[r.confidence]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{transfer.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
