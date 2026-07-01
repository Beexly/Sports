import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadNflGameWeather, type VenueWeather } from "@/lib/weather/game-weather";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Weather — Outdoor NFL Venues (NWS, public domain)",
  description:
    "Live current conditions at outdoor NFL stadiums from the US National Weather Service. Wind and precipitation move passing and kicking — real environment data, not a betting pick.",
  alternates: { canonical: "/weather" },
};

function windClass(mph: number | null): string {
  if (mph === null) return "text-ion-2";
  if (mph >= 20) return "text-alert";
  if (mph >= 12) return "text-caution";
  return "text-ion";
}

export default async function WeatherPage(): Promise<JSX.Element> {
  const wx = await loadNflGameWeather();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 border-b border-mineral pb-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Game weather</p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Wind kills passing. Now we watch it.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              Current hourly conditions at every outdoor NFL venue, from the US National Weather
              Service (a public-domain government feed — free to use, no scraping). Wind over
              ~15&nbsp;mph and precipitation are the environment signals that move totals and kicking.
              Real conditions, not a pick.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/board" className="btn-primary min-h-11 px-5 py-3">See today&apos;s board</Link>
              <Link href="/api/weather/game" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">View as JSON</Link>
              <Link href="/data" className="inline-flex min-h-11 items-center justify-center rounded-ds-sm border border-mineral px-5 py-3 text-sm font-semibold text-ion hover:border-orbital-cyan hover:text-ion-white">How we source data</Link>
            </div>
          </div>

          <div className="border border-mineral bg-eclipse p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Source</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">
                  {wx.status === "live" ? `${wx.venuesLive} venues live` : "Source unavailable"}
                </h2>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">NWS · public domain</p>
            </div>
            <div className="mt-5 border border-mineral bg-carbon p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">Boundary</p>
              <p className="mt-2 text-sm leading-6 text-ion-1">{wx.note}</p>
            </div>
          </div>
        </section>

        {wx.status === "source-error" ? (
          <section className="border border-mineral bg-eclipse p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-alert">Source error</p>
            <h2 className="mt-2 text-2xl font-semibold text-ion-white">No conditions to show right now.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">{wx.error ?? "UNKNOWN"}</p>
          </section>
        ) : (
          <section className="border border-mineral bg-eclipse/80">
            <div className="border-b border-mineral px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">Outdoor venues · windiest first</p>
              <h2 className="mt-2 text-2xl font-semibold text-ion-white">Current conditions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-mineral bg-carbon/70 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
                  <tr>
                    <th scope="col" className="px-4 py-3">Team</th>
                    <th scope="col" className="px-4 py-3">Stadium</th>
                    <th scope="col" className="px-4 py-3">Temp</th>
                    <th scope="col" className="px-4 py-3">Wind</th>
                    <th scope="col" className="px-4 py-3">Precip</th>
                    <th scope="col" className="px-4 py-3">Conditions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mineral bg-carbon">
                  {wx.venues.map((v: VenueWeather) => (
                    <tr key={v.team + v.stadium}>
                      <td className="px-4 py-3 font-mono font-semibold text-orbital-cyan">{v.team}</td>
                      <td className="px-4 py-3 text-ion-white">{v.stadium}</td>
                      <td className="px-4 py-3 font-mono text-ion">{v.tempF === null ? "—" : `${v.tempF}°F`}</td>
                      <td className={`px-4 py-3 font-mono font-semibold ${windClass(v.windMph)}`}>
                        {v.windMph === null ? "—" : `${v.windMph} mph ${v.windDirection}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-ion">{v.precipPct === null ? "—" : `${v.precipPct}%`}</td>
                      <td className="px-4 py-3 text-ion-2">{v.status === "ok" ? v.shortForecast : "unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 font-mono text-[10px] leading-5 text-ion-2">
              Weather data from the US National Weather Service (api.weather.gov), public domain.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
