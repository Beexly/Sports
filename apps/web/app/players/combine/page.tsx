import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflverseCombine, type CombineRow } from "@/lib/nflverse/combine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NFL Combine — Athletic Testing (nflverse)",
  description:
    "Read-only NFL Combine measurements from nflverse: forty, vertical, broad jump, three-cone, shuttle, bench. Athletic-trait scouting priors — not a projection or a pick.",
  alternates: { canonical: "/players/combine" },
};

function n(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}

export default async function CombinePage(): Promise<JSX.Element> {
  const c = await loadNflverseCombine();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Combine · athletic testing</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              The traits, before the tape.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              NFL Combine measurements from nflverse &mdash; forty, vertical, broad jump, three-cone,
              shuttle, bench. In the Human Performance layer these are scouting <em>priors</em>:
              real athletic traits to weigh against production, not proof of anything. Not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/nflverse/combine" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/players" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">Production Lab</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source window</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {c.status === "live" ? `Latest class ${c.latestYear ?? "N/A"}` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">nflverse</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{c.blockReason}</p>
            </div>
          </div>
        </section>

        {c.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This page is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{c.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <CombineTable eyebrow={`Class of ${c.latestYear ?? ""}`} title="Fastest 40 in the latest class" rows={c.latestClass} />
            <CombineTable eyebrow="All-time" title="Fastest 40 on record" rows={c.fastestForty} showYear />
            <section className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
              <p className="mt-3 break-all font-mono text-xs leading-5 text-ion-2">{c.sourceUrl}</p>
              <Attribution sourceIds={["nflverse"]} className="mt-4" />
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CombineTable({
  eyebrow,
  title,
  rows,
  showYear = false,
}: {
  eyebrow: string;
  title: string;
  rows: readonly CombineRow[];
  showYear?: boolean;
}): JSX.Element {
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ion-white">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ion-1">No measurements in the source window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">School</th>
                {showYear && <th className="px-4 py-3">Yr</th>}
                <th className="px-4 py-3">Wt</th>
                <th className="px-4 py-3">40</th>
                <th className="px-4 py-3">Vert</th>
                <th className="px-4 py-3">Broad</th>
                <th className="px-4 py-3">3-cone</th>
                <th className="px-4 py-3">Shuttle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mineral bg-carbon">
              {rows.map((r, i) => (
                <tr key={`${r.name}-${r.draftYear}-${i}`}>
                  <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ion-white">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-orbital-cyan">{r.position}</td>
                  <td className="px-4 py-3 text-ion-2">{r.school}</td>
                  {showYear && <td className="px-4 py-3 font-mono text-ion-2">{r.draftYear || "—"}</td>}
                  <td className="px-4 py-3 font-mono text-ion">{n(r.weight, 0)}</td>
                  <td className="px-4 py-3 font-mono text-ion-white">{n(r.forty)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{n(r.vertical, 1)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{n(r.broadJump, 0)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{n(r.cone)}</td>
                  <td className="px-4 py-3 font-mono text-ion">{n(r.shuttle)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
