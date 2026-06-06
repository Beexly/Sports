import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflverseSnapShare, type SkillPosition, type SnapShareRow } from "@/lib/nflverse/snap-share";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Snap Share — Real Offensive Workload Leaders (nflverse)",
  description:
    "Read-only NFL snap-share leaders by position from nflverse: the share of team offensive snaps each player is on the field for. Opportunity leads production — historical fact, not a projection.",
  alternates: { canonical: "/players/snaps" },
};

const POSITIONS: readonly SkillPosition[] = ["RB", "WR", "TE"];
const LABEL: Record<SkillPosition, string> = { RB: "Running backs", WR: "Wide receivers", TE: "Tight ends" };

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function SnapsPage(): Promise<JSX.Element> {
  const snap = await loadNflverseSnapShare();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Snap share</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Workload before box score.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              The share of his team&apos;s offensive snaps a player is on the field for, averaged
              across the season. Snap share is the cleanest leading indicator of opportunity &mdash;
              it moves before targets and production do. Real, settled workload from nflverse, not a
              projection.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/snap-share" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Production Lab</Link>
              <Link href="/players/edge" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Edge Signals</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {snap.status === "live" ? `Season ${snap.season}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{snap.seasonType}</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{snap.blockReason}</p>
            </div>
          </div>
        </section>

        {snap.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{snap.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            {POSITIONS.map((position) => (
              <SnapTable key={position} position={position} rows={snap.leaders[position]} />
            ))}
            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-ion-2">{snap.sourceUrl}</p>
              <Attribution sourceIds={["nflverse"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SnapTable({ position, rows }: { position: SkillPosition; rows: readonly SnapShareRow[] }): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">{position} snap leaders</p>
        <h2 className="mt-2 text-2xl font-semibold text-ion-white">{LABEL[position]}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No qualifying players in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Tm</th>
                <th className="px-4 py-3">G</th>
                <th className="px-4 py-3">Snap %</th>
                <th className="px-4 py-3">Snaps/G</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={`${r.playerId}-${r.team}`}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.playerName}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.team}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.games}</td>
                  <td className="px-4 py-3 font-mono text-ion-white">{fmtPct(r.snapSharePct)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{r.snapsPerGame}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
