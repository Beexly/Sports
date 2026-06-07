import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadExpectedPoints, type ExpectedPointsRow } from "@/lib/intelligence/expected-points";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expected Fantasy Points (xFP) — The Opportunity Backbone",
  description:
    "What a player's real usage SHOULD have produced — expected fantasy points from carries, targets, air yards, and field position, independent of TD luck. We surface expected-vs-actual as buy-low / sell-high. Real nflverse ff_opportunity data, honest empty state.",
  alternates: { canonical: "/intelligence/expected-points" },
};

// Expected points persist; actual points swing on conversion luck. A player whose
// expected ≫ actual is buy-low (cyan — the production is coming); actual ≫ expected
// is sell-high (plasma — running hot). In-line tracks the opportunity (neutral ion).
function readLabel(r: ExpectedPointsRow): string {
  return r.signal === "buy-low" ? "Buy-low" : r.signal === "sell-high" ? "Sell-high" : "In-line";
}
function readClass(r: ExpectedPointsRow): string {
  if (r.signal === "buy-low") return "text-orbital-cyan";
  if (r.signal === "sell-high") return "text-plasma";
  return "text-ion";
}
function diffClass(diff: number): string {
  if (diff > 0) return "text-plasma"; // actual over expected — hot
  if (diff < 0) return "text-orbital-cyan"; // actual under expected — cold/coming
  return "text-ion";
}

export default async function ExpectedPointsPage(): Promise<JSX.Element> {
  const f = await loadExpectedPoints();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Expected Fantasy Points</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Expected Fantasy Points &mdash; the opportunity backbone
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              What a player&apos;s real usage <em>should</em> have produced &mdash; expected points from the carries,
              targets, air yards, and field position he actually saw, independent of whether the ball bounced his way.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/expected-points" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How we read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">xFP — expected, not actual</dt>
                <dd className="text-ion-2">ffverse&apos;s ff_opportunity models the fantasy points a usage profile should yield. Expected points persist far better than actual points, which swing on touchdown luck.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Buy-low — expected outruns actual</dt>
                <dd className="text-ion-2">When the <span className="text-orbital-cyan">expected</span> percentile sits well above the actual percentile, the usage says the production is coming. Buy-low before it corrects.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Sell-high — actual outruns expected</dt>
                <dd className="text-ion-2">When <span className="text-plasma">actual</span> outruns expected, the player is running hot on conversion luck. Sell-high before it regresses. In-line means the points are earned by the opportunity.</dd>
              </div>
            </dl>
          </div>
        </section>

        {f.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{f.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Expected-points leaders{f.throughWeek ? ` · ${f.season} through week ${f.throughWeek}` : f.season ? ` · ${f.season}` : ""}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">What the usage should have produced</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ion-1">{f.note}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Tm</th>
                    <th className="px-4 py-3" title="position">Pos</th>
                    <th className="px-4 py-3" title="games">G</th>
                    <th className="px-4 py-3" title="expected PPR points, total">xFP</th>
                    <th className="px-4 py-3" title="expected PPR points per game">xFP/g</th>
                    <th className="px-4 py-3" title="actual PPR points, total">Actual</th>
                    <th className="px-4 py-3" title="actual minus expected (luck/efficiency)">Diff</th>
                    <th className="px-4 py-3" title="expected-points percentile within position">xFP%</th>
                    <th className="px-4 py-3" title="actual-points percentile within position">Prod%</th>
                    <th className="px-4 py-3">The read</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {f.rows.map((r, i) => (
                    <tr key={r.playerId} title={r.note}>
                      <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.position}</td>
                      <td className="px-4 py-3 font-mono text-ion-2">{r.games}</td>
                      <td className="px-4 py-3 font-mono text-ion-white">{r.xfpTotal.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.xfpPerGame.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.actualTotal.toFixed(1)}</td>
                      <td className={`px-4 py-3 font-mono ${diffClass(r.diff)}`}>{r.diff > 0 ? "+" : ""}{r.diff.toFixed(1)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.xfpPct.toFixed(0)}</td>
                      <td className="px-4 py-3 font-mono text-ion">{r.prodPct.toFixed(0)}</td>
                      <td className={`px-4 py-3 font-mono text-[11px] ${readClass(r)}`}>{readLabel(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">{f.note}</p>
          </section>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
