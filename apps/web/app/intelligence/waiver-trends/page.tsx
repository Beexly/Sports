import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadSleeperTrending, type TrendingRow } from "@/lib/integrations/sleeper";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Waiver Trends (Sleeper) — Ownership Momentum",
  description:
    "League-wide waiver MOMENTUM from the Sleeper API: which NFL players the fantasy market is adding and dropping right now. Real add/drop velocity, descriptive market data — what the market is doing, not advice.",
  alternates: { canonical: "/intelligence/waiver-trends" },
};

function TrendTable({
  rows,
  kind,
}: {
  rows: readonly TrendingRow[];
  kind: "adds" | "drops";
}): JSX.Element {
  const isAdds = kind === "adds";
  const countClass = isAdds ? "text-orbital-cyan" : "text-plasma";
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-4">
        <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${isAdds ? "text-orbital-cyan" : "text-plasma"}`}>
          {isAdds ? "Trending adds" : "Trending drops"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-ion-white">
          {isAdds ? "Who the market is buying" : "Who the market is dumping"}
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm leading-6 text-ion-2">
          No qualifying {isAdds ? "adds" : "drops"} returned for this window.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3" title={isAdds ? "leagues adding over the window" : "leagues dropping over the window"}>
                  {isAdds ? "Adds" : "Drops"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={r.playerId}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-soft-ultraviolet">{r.position}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                  <td className={`px-4 py-3 font-mono ${countClass}`}>{r.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function WaiverTrendsPage(): Promise<JSX.Element> {
  const t = await loadSleeperTrending();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Ownership momentum</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Waiver Trends &mdash; what the market is doing
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              League-wide waiver MOMENTUM from the Sleeper API &mdash; how many fantasy leagues are adding and
              dropping each NFL player over the last {t.lookbackHours} hours. This is ownership velocity:{" "}
              <span className="text-ion-white">what the market is doing, not advice.</span>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/sleeper-trending" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">How to read it</p>
            <dl className="mt-4 space-y-3 text-sm leading-6 text-ion-1">
              <div>
                <dt className="font-semibold text-ion-white">Adds — ownership rising</dt>
                <dd className="text-ion-2">The count of Sleeper leagues that <span className="text-orbital-cyan">added</span> the player over the window. Rising ownership velocity, not a buy call.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Drops — ownership falling</dt>
                <dd className="text-ion-2">The count of leagues that <span className="text-plasma">dropped</span> the player. Falling ownership velocity, not a sell call.</dd>
              </div>
              <div>
                <dt className="font-semibold text-ion-white">Descriptive, not advice</dt>
                <dd className="text-ion-2">This is the crowd&apos;s behavior measured directly &mdash; market sentiment. We surface it; we don&apos;t turn it into a pick or a projection.</dd>
              </div>
            </dl>
          </div>
        </section>

        {t.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{t.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-2">
              <TrendTable rows={t.adds} kind="adds" />
              <TrendTable rows={t.drops} kind="drops" />
            </div>
            <p className="font-mono text-[10px] leading-5 text-ion-2">{t.note}</p>
          </>
        )}

        <Attribution sourceIds={["sleeper"]} />
      </main>
      <Footer />
    </div>
  );
}
