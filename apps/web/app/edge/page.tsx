import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { TodayFeed } from "@/components/decision/today-feed";
import { getPreviewDecisions } from "@/lib/decision-ui/fixtures";

export const metadata: Metadata = {
  title: "Edge — markets, props & line movement",
  description: "The markets workspace: what's worth a play today, what to pass, and the receipt behind it.",
};

const EDGE_TOOLS = [
  { label: "Today's Board", href: "/board", desc: "Today's reads, scored and ranked" },
  { label: "The House", href: "/house", desc: "NFL hub — odds, picks & matchups" },
  { label: "Players Lab", href: "/players", desc: "One surface, every player, every signal" },
  { label: "Live Market Map", href: "/observatory", desc: "Line moves and the best number, live" },
  { label: "Props & Pick'em", href: "/fantasy/props", desc: "Prop and pick'em line edges, graded" },
  { label: "Mission Control", href: "/today", desc: "Everything happening today, in one view" },
] as const;

export default function EdgePage() {
  const { cards, regime } = getPreviewDecisions();

  return (
    <>
      <Nav />
      <main className="container flex flex-col gap-14 py-12">
        <header className="max-w-2xl">
          <p className="eyebrow">Edge</p>
          <h1 className="mt-2 text-3xl font-semibold text-ion-white">What&apos;s worth a play today — and what to pass.</h1>
          <p className="mt-3 text-ion-1">
            Odds, props, line movement and the best number, in one workspace. Every read shows what changed, what it
            means, what to do, why not the obvious move, and where the receipt is.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold text-ion-white">Reads worth checking</h2>
            <span className="text-xs text-ion-2">Illustrative preview — not live picks</span>
          </div>
          <TodayFeed cards={cards} regime={regime} emptyNote="No market reads need attention in this preview." />
        </section>

        <section className="surface-card flex flex-col gap-2 p-5">
          <p className="eyebrow">Check</p>
          <h2 className="text-lg font-semibold text-ion-white">Check a bet, prop, or player.</h2>
          <p className="text-sm text-ion-1">
            Ask about any side and get a Decision Card back — what changed, what to do, and why not. This comes online
            with live data; today it runs on the illustrative preview above.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">Open a surface</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EDGE_TOOLS.map((t) => (
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
