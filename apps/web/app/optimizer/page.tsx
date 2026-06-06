import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";

export const metadata: Metadata = {
  title: "The Optimizer — One Workspace for Every Lineup",
  description:
    "One door for every lineup tool: DFS optimizer, season start/sit, draft assistant, and DraftKings salaries. Pick your contest type and build.",
  alternates: { canonical: "/optimizer" },
};

interface Tool {
  readonly eyebrow: string;
  readonly title: string;
  readonly href: string;
  readonly body: string;
  readonly forWho: string;
  readonly cta: string;
}

const TOOLS: readonly Tool[] = [
  {
    eyebrow: "DFS · Classic / Showdown",
    title: "DFS Optimizer",
    href: "/fantasy/dfs",
    body: "Build cash, GPP, and leverage lineups against the slate — locks, fades, exposure, and stacking, with the math shown.",
    forWho: "DraftKings / FanDuel daily players",
    cta: "Open DFS Optimizer",
  },
  {
    eyebrow: "Season-long",
    title: "Start / Sit Optimizer",
    href: "/fantasy/lineup",
    body: "Set your weekly lineup by floor, median, and ceiling — who to start, who to bench, and why.",
    forWho: "Redraft & dynasty managers",
    cta: "Open Start / Sit",
  },
  {
    eyebrow: "Draft day",
    title: "Draft Assistant",
    href: "/fantasy/draft",
    body: "Live draft board with tiers, value over replacement, positional scarcity, and run alerts as picks come off the board.",
    forWho: "Redraft, dynasty & best-ball drafts",
    cta: "Open Draft Assistant",
  },
  {
    eyebrow: "Inputs · licensed + cross-checked",
    title: "DFS Salaries",
    href: "/players/dfs",
    body: "DraftKings salaries via licensed feeds, pulled from multiple sources and reconciled so disagreements are flagged — never scraped.",
    forWho: "The salary layer behind every build",
    cta: "View DFS Salaries",
  },
];

export default function OptimizerHubPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">The Optimizer</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            One workspace. Every lineup.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Pick your contest type and build. No more guessing which tool to open — DFS, season
            start/sit, the draft board, and the salary layer all live here, on the same real data
            (snaps, usage, Next Gen Stats, injuries, weather), with the math shown.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col justify-between border border-mineral bg-eclipse p-6 transition-colors hover:border-orbital-cyan"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">{tool.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold text-ion-white">{tool.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ion-1">{tool.body}</p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-mineral pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{tool.forWho}</span>
                <span className="text-sm font-semibold text-orbital-cyan group-hover:text-ion-white">{tool.cta} →</span>
              </div>
            </Link>
          ))}
        </section>

        <section className="border border-mineral bg-eclipse/60 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">What feeds these tools</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">
            Every build draws on the same real, legally-sourced data: snap share, usage and Next Gen
            tracking, injury availability, game weather, and (for DFS) licensed DraftKings salaries.
            Projections, ADP, and ownership are gated until a real feed is connected — we never
            fabricate them. See{" "}
            <Link href="/data" className="text-orbital-cyan hover:text-ion-white">how we source data</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
