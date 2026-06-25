import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { TodayFeed } from "@/components/decision/today-feed";
import { previewCardsFor, getPreviewDecisions } from "@/lib/decision-ui/fixtures";

export const metadata: Metadata = {
  title: "My Gameplan — start/sit, waivers, trades & DFS",
  description: "Your season-long and daily fantasy decisions, with the why and the receipt. We never change your roster.",
};

const GAMEPLAN_TOOLS = [
  { label: "Draft Assistant", href: "/fantasy/draft", desc: "Draft tiers, values & live pick guidance" },
  { label: "Start-Sit Helper", href: "/fantasy/lineup", desc: "Start or sit: floor vs. ceiling" },
  { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Who to add and what to bid, with the why" },
  { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Is the trade fair? Value and win-now read" },
  { label: "Best Ball", href: "/fantasy/bestball", desc: "Ceiling, stacks & bye structure" },
  { label: "DFS Suite", href: "/fantasy/dfs", desc: "Lineup builder for cash & tournaments" },
] as const;

export default function GameplanPage() {
  const regime = getPreviewDecisions().regime;
  const cards = previewCardsFor("GAMEPLAN");

  return (
    <>
      <Nav />
      <main className="container flex flex-col gap-14 py-12">
        <header className="max-w-2xl">
          <p className="eyebrow">My Gameplan</p>
          <h1 className="mt-2 text-3xl font-semibold text-ion-white">Your roster decisions, with the why.</h1>
          <p className="mt-3 text-ion-1">
            Start/sit, waivers, trades, best ball and DFS in one read. We surface what changed in a player&apos;s role
            before the fantasy market catches up — and we never change your roster for you.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold text-ion-white">Roster alerts</h2>
            <span className="text-xs text-ion-2">Illustrative preview — not live advice</span>
          </div>
          <TodayFeed cards={cards} regime={regime} emptyNote="No roster alerts need attention in this preview." />
        </section>

        <section className="surface-card flex flex-col gap-2 p-5">
          <p className="eyebrow">Check</p>
          <h2 className="text-lg font-semibold text-ion-white">Check a player, start/sit, or trade.</h2>
          <p className="text-sm text-ion-1">
            Ask about a roster decision and get a Decision Card back. Comes online with live data; today it runs on the
            illustrative preview above. We never submit anything to your league.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">Open a tool</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GAMEPLAN_TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="surface-card flex flex-col gap-1 p-4 transition-colors hover:border-mineral-hi">
                <span className="text-sm font-semibold text-ion-white">{t.label}</span>
                <span className="text-xs text-ion-2">{t.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
