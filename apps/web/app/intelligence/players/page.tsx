import type { Metadata } from "next";
import Link from "next/link";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadPlayerModel, type ModelPosition, type PlayerProfile, type ProcessSignal } from "@/lib/intelligence/player-model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Intelligence — Process Grade vs Production",
  description:
    "One canonical advanced profile per player: EPA efficiency, opportunity (WOPR / target share), and volume combined into a position-aware process grade, with the process-vs-production gap surfaced as buy-low / sell-high. The data layer that drives the tools. Not a pick.",
  alternates: { canonical: "/intelligence/players" },
};

const POSITIONS: readonly ModelPosition[] = ["QB", "RB", "WR", "TE"];
const SIGNAL_LABEL: Record<ProcessSignal, string> = { "buy-low": "Buy-low", "sell-high": "Sell-high", "in-line": "In-line" };
function signalClass(s: ProcessSignal): string {
  if (s === "buy-low") return "text-orbital-cyan";
  if (s === "sell-high") return "text-plasma";
  return "text-ion-2";
}
function gradeClass(g: number): string {
  if (g >= 70) return "text-orbital-cyan";
  if (g >= 45) return "text-ion-white";
  return "text-ion-2";
}

function PositionTable({ pos, rows }: { pos: ModelPosition; rows: readonly PlayerProfile[] }): JSX.Element {
  const isQb = pos === "QB";
  return (
    <section className="border border-mineral bg-eclipse/80">
      <div className="border-b border-mineral px-5 py-3">
        <h2 className="text-xl font-semibold text-ion-white">{pos}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Tm</th>
              <th className="px-4 py-3" title="position-aware composite of the predictive anchors">Process</th>
              <th className="px-4 py-3" title="PPR production percentile in position">Prod %ile</th>
              <th className="px-4 py-3" title="combined EPA per play">EPA/play</th>
              {isQb ? <th className="px-4 py-3" title="DAKOTA (EPA+CPOE composite)">DAKOTA</th> : <th className="px-4 py-3" title="weighted opportunity rating">WOPR</th>}
              {isQb ? <th className="px-4 py-3" title="passing air conversion ratio">PACR</th> : <th className="px-4 py-3" title="touches: carries + targets">Touch</th>}
              <th className="px-4 py-3">The read</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mineral bg-carbon">
            {rows.map((p, i) => (
              <tr key={p.playerId} title={p.note}>
                <td className="px-4 py-3 font-mono text-ion-2">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-ion-white">{p.name}</td>
                <td className="px-4 py-3 font-mono text-orbital-cyan">{p.team}</td>
                <td className={`px-4 py-3 font-numerals text-base font-semibold tabular-nums ${gradeClass(p.processGrade)}`}>{p.processGrade}</td>
                <td className="px-4 py-3 font-mono text-ion">{p.productionPct}</td>
                <td className={`px-4 py-3 font-mono ${p.epaPerPlay > 0 ? "text-orbital-cyan" : p.epaPerPlay < 0 ? "text-plasma" : "text-ion-2"}`}>{p.epaPerPlay > 0 ? "+" : ""}{p.epaPerPlay.toFixed(2)}</td>
                {isQb
                  ? <td className="px-4 py-3 font-mono text-ion">{p.dakota === null ? "—" : p.dakota.toFixed(2)}</td>
                  : <td className="px-4 py-3 font-mono text-ion">{p.wopr === null ? "—" : p.wopr.toFixed(2)}</td>}
                {isQb
                  ? <td className="px-4 py-3 font-mono text-ion">{p.pacr === null ? "—" : p.pacr.toFixed(2)}</td>
                  : <td className="px-4 py-3 font-mono text-ion">{p.touches}</td>}
                <td className={`px-4 py-3 font-mono text-[11px] ${signalClass(p.signal)}`}>{SIGNAL_LABEL[p.signal]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function PlayerIntelligencePage(): Promise<JSX.Element> {
  const model = await loadPlayerModel();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Player Intelligence</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              The process grade behind every player.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              One canonical profile per player, mined from the full nflverse advanced field set — EPA efficiency,
              opportunity (WOPR, target share), and volume — combined into a position-aware <em>process grade</em>.
              We compare that to actual production and surface the gap: where the inputs say more is coming
              (<span className="text-orbital-cyan">buy-low</span>) or running hot (<span className="text-plasma">sell-high</span>).
              This is the data layer that drives the waiver tool, optimizer, and draft board. Not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/api/intelligence/player-model" className="btn-primary min-h-11 px-5 py-3">JSON</Link>
              <Link href="/intelligence/metrics" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we read these</Link>
            </div>
          </div>
          <div className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">The composite</p>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Process grade = the within-position percentile of each predictive anchor, averaged. QBs are graded on
              EPA/play + DAKOTA + PACR; receivers on WOPR + target share + EPA; backs on volume + EPA. Anchors persist
              and forecast; production is the noisy output. The gap is the edge.
            </p>
            <p className="mt-4 border border-mineral bg-carbon p-3 font-mono text-[10px] leading-5 text-ion-2">{model.note}</p>
          </div>
        </section>

        {model.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">This board is intentionally empty.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{model.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
              {model.season}{model.throughWeek ? ` · through week ${model.throughWeek}` : ""} · {model.profiles.length} profiles
            </p>
            {POSITIONS.map((pos) => {
              const rows = model.profiles.filter((p) => p.position === pos);
              return rows.length > 0 ? <PositionTable key={pos} pos={pos} rows={rows} /> : null;
            })}
          </>
        )}

        <Attribution sourceIds={["nflverse"]} />
      </main>
      <Footer />
    </div>
  );
}
