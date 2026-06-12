import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { loadFranchiseHistory } from "@/lib/lahman/franchise-history";
import { loadNflFranchiseHistory } from "@/lib/nflverse/franchise-history";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "History Lab — Every Franchise, Every Season",
  description:
    "MLB franchise history from 1871 to today: all-time records, World Series titles, pennants, and each franchise's best season — from the open-licensed Lahman database, fully attributed.",
  alternates: { canonical: "/history" },
};

export default async function HistoryLabPage() {
  const [history, nfl] = await Promise.all([loadFranchiseHistory(), loadNflFranchiseHistory()]);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
            History Lab · franchise records
          </p>
          <h1 className="mt-4 font-display text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05 }}>
            A century and a half, one table.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-300">
            Every MLB franchise since {history.seasonsCovered?.from ?? 1871}: the all-time
            record, the rings, the pennants, and the single best season each ever played.
          </p>

          {history.status !== "live" || history.rows.length === 0 ? (
            <div className="mt-10 rounded-ds-md border border-mineral/70 bg-eclipse/60 p-6">
              <p className="text-sm text-ink-300">{history.note}</p>
              {history.error && (
                <p className="mt-2 font-mono text-xs text-ink-500">{history.error}</p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                {history.rows.length} franchises · {history.seasonsCovered!.from}–
                {history.seasonsCovered!.to} · {history.sourceRows.toLocaleString()} team-seasons
              </p>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                      <th className="py-2 pr-4 font-medium">Franchise</th>
                      <th className="py-2 pr-4 font-medium">Since</th>
                      <th className="py-2 pr-4 font-medium">Seasons</th>
                      <th className="py-2 pr-4 font-medium">W–L</th>
                      <th className="py-2 pr-4 font-medium">Win %</th>
                      <th className="py-2 pr-4 font-medium">WS titles</th>
                      <th className="py-2 pr-4 font-medium">Pennants</th>
                      <th className="py-2 font-medium">Best season</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-200 [font-variant-numeric:tabular-nums]">
                    {history.rows.map((r) => (
                      <tr key={r.franchise} className="border-t border-mineral/50">
                        <td className="py-2 pr-4 font-semibold text-white">{r.currentName}</td>
                        <td className="py-2 pr-4 font-mono text-ink-400">{r.firstSeason}</td>
                        <td className="py-2 pr-4 font-mono">{r.seasons}</td>
                        <td className="py-2 pr-4 font-mono">
                          {r.wins.toLocaleString()}–{r.losses.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 font-mono">{r.winPct.toFixed(3)}</td>
                        <td className="py-2 pr-4 font-mono" style={r.worldSeriesTitles > 0 ? { color: BRAND_COLORS.orbitalCyan } : undefined}>
                          {r.worldSeriesTitles || "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono">{r.pennants || "—"}</td>
                        <td className="py-2 font-mono text-ink-300">
                          {r.bestSeason.year} ({r.bestSeason.wins}–{r.bestSeason.losses})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {history.attribution && (
                <p className="mt-6 text-xs text-ink-500">{history.attribution}</p>
              )}
              {nfl.status === "live" && nfl.rows.length > 0 ? (
                <section className="mt-12">
                  <h2 className="font-display text-2xl font-semibold text-white">
                    NFL — {nfl.seasonsCovered!.from}–{nfl.seasonsCovered!.to}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                    {nfl.rows.length} franchises · nflverse final scores · coverage begins 1999, honestly
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                          <th className="py-2 pr-4 font-medium">Team</th>
                          <th className="py-2 pr-4 font-medium">Since</th>
                          <th className="py-2 pr-4 font-medium">W–L–T</th>
                          <th className="py-2 pr-4 font-medium">Win %</th>
                          <th className="py-2 pr-4 font-medium">SB wins</th>
                          <th className="py-2 font-medium">Best season</th>
                        </tr>
                      </thead>
                      <tbody className="text-ink-200 [font-variant-numeric:tabular-nums]">
                        {nfl.rows.map((r) => (
                          <tr key={r.team} className="border-t border-mineral/50">
                            <td className="py-2 pr-4 font-semibold text-white">{r.team}</td>
                            <td className="py-2 pr-4 font-mono text-ink-400">{r.firstSeason}</td>
                            <td className="py-2 pr-4 font-mono">
                              {r.wins}–{r.losses}{r.ties > 0 ? `–${r.ties}` : ""}
                            </td>
                            <td className="py-2 pr-4 font-mono">{r.winPct.toFixed(3)}</td>
                            <td className="py-2 pr-4 font-mono" style={r.superBowlWins > 0 ? { color: BRAND_COLORS.orbitalCyan } : undefined}>
                              {r.superBowlWins || "—"}
                            </td>
                            <td className="py-2 font-mono text-ink-300">
                              {r.bestSeason.year} ({r.bestSeason.wins}–{r.bestSeason.losses})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <p className="mt-12 max-w-2xl text-xs leading-relaxed text-ink-500">
                  NFL history (nflverse, 1999→) could not load right now — it appears here
                  automatically when the source responds. Nothing is invented in the meantime.
                </p>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
