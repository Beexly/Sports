import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { loadTeamEnvironment } from "@/lib/intelligence/team-environment";
import { loadScheduleLab } from "@/lib/nflverse/schedule-lab";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // nflverse pbp load for opponent strength

export const metadata: Metadata = {
  title: "Schedule Lab — NFL Strength of Schedule",
  description:
    "Strength of schedule for all 32 teams from real nflverse data: season SoS rank, the first-month draw, and each team's toughest three-game stretch. Opponent strength from neutral-script EPA — sourced, never invented.",
  alternates: { canonical: "/sos" },
};

function sosColor(sos: number): string {
  if (sos >= 60) return "#FF6B6B"; // hard
  if (sos >= 45) return "#FFB547"; // average band
  return "#51CF66"; // soft
}

export default async function ScheduleLabPage() {
  const environment = await loadTeamEnvironment();
  const lab =
    environment.status === "live"
      ? await loadScheduleLab({
          season: environment.season + 1,
          strengthSeason: environment.season,
          envRows: environment.rows,
        })
      : null;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
            Schedule Lab · strength of schedule
          </p>
          <h1 className="mt-4 font-display text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05 }}>
            Who got the hard road.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-300">
            All 32 schedules priced by opponent strength — the season rank, the first-month
            draw, and the three-game stretch that will decide each team&apos;s year. Draft and
            trade around the road, not the name.
          </p>

          {!lab || lab.status !== "live" || lab.rows.length === 0 ? (
            <div className="mt-10 rounded-ds-md border border-mineral/70 bg-eclipse/60 p-6">
              <p className="text-sm text-ink-300">
                {lab?.note ??
                  environment.note ??
                  "Schedule or opponent-strength data is unavailable right now."}
              </p>
              {(lab?.error ?? environment.error) && (
                <p className="mt-2 font-mono text-xs text-ink-500">
                  {lab?.error ?? environment.error}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                {lab.season} schedule · opponent strength from {lab.strengthSeason} neutral-script EPA · nflverse
              </p>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                      <th className="py-2 pr-4 font-medium">Rank</th>
                      <th className="py-2 pr-4 font-medium">Team</th>
                      <th className="py-2 pr-4 font-medium">Season SoS</th>
                      <th className="py-2 pr-4 font-medium">First 4 games</th>
                      <th className="py-2 pr-4 font-medium">Toughest stretch</th>
                      <th className="py-2 font-medium">Games rated</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-200 [font-variant-numeric:tabular-nums]">
                    {lab.rows.map((r) => (
                      <tr key={r.team} className="border-t border-mineral/50">
                        <td className="py-2 pr-4 font-mono text-ink-400">{r.rank}</td>
                        <td className="py-2 pr-4 font-semibold text-white">{r.team}</td>
                        <td className="py-2 pr-4 font-mono" style={{ color: sosColor(r.seasonSos) }}>
                          {r.seasonSos.toFixed(1)}
                        </td>
                        <td className="py-2 pr-4 font-mono" style={{ color: sosColor(r.earlySos) }}>
                          {r.earlySos.toFixed(1)}
                        </td>
                        <td className="py-2 pr-4 font-mono text-ink-300">
                          {r.toughestStretch
                            ? `${r.toughestStretch.weeks} · ${r.toughestStretch.sos.toFixed(1)}`
                            : "—"}
                        </td>
                        <td className="py-2 font-mono text-ink-400">
                          {r.gamesCounted}
                          {r.unratedOpponents.length > 0 && (
                            <span className="ml-2 text-ink-500">
                              ({r.unratedOpponents.join(", ")} unrated)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-6 max-w-2xl text-xs leading-relaxed text-ink-500">{lab.note}</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
