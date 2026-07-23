import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_COLORS } from "@/lib/brand";
import { loadSourceLiveEvidence } from "@/lib/data-sources/live-evidence";

export const dynamic = "force-dynamic";

/** Legacy deep-links (`/fantasy?tool=trade`) predate the dedicated tool
 * routes; honor them forever so no shared link ever strands on the hub. */
const LEGACY_TOOL_ROUTES: Record<string, string> = {
  draft: "/fantasy/draft",
  bestball: "/fantasy/bestball",
  lineup: "/fantasy/lineup",
  waivers: "/fantasy/waivers",
  trade: "/fantasy/trade",
  dfs: "/fantasy/dfs",
  props: "/fantasy/props",
  connect: "/fantasy/connect",
  academy: "/fantasy/academy",
  contests: "/fantasy/contests",
};

export const metadata: Metadata = {
  title: "Galaxy Fantasy - Real Roster First",
  description:
    "Galaxy Fantasy starts with read-only roster sync and stays gated until live player projections are connected. No fictional projections are presented as live advice.",
  alternates: { canonical: "/fantasy" },
};

const LIVE_FIRST = [
  {
    title: "Read-only roster sync",
    href: "/fantasy/connect",
    status: "Live path",
    body: "League connect uses public read-only data. No league writes, no OAuth handoff, no autonomous moves.",
  },
  {
    title: "Player projections provider",
    href: "/integrations",
    status: "Required",
    body: "Lineups, waivers, DFS, and trades stay gated until a real projections source is enabled.",
  },
  {
    title: "Live usage layer",
    href: "/trends",
    status: "Building",
    body: "Snap share, player weeks, injuries, depth charts, and rosters become the free-first base layer.",
  },
] as const;

type ToolStatus = "live" | "partly live" | "gated";
const TOOL_DIRECTORY: readonly (readonly [string, string, string, ToolStatus])[] = [
  ["Optimizer: DFS · Start/Sit · Draft", "One workspace, one contest switch. Salaries and projections stay gated; the draft board (tiers, VOR, scarcity, run alerts, your ADP CSV) runs on the illustrative pool now.", "/optimizer", "partly live"],
  ["Best Ball", "Draft-only roster construction: ceiling/spike upside, QB-to-catcher stacks, bye fragility, and a next-pick recommender. Runs on the illustrative pool now; real the moment projections flip on.", "/fantasy/bestball", "partly live"],
  ["Human Performance", "Public confidence-band layer: venue surface, weather, official injury status. Live now; never a body claim.", "/human", "live"],
  ["Waiver & FAAB", "Needs roster sync, projections, injuries, and league market context.", "/fantasy/waivers", "gated"],
  ["Trade Analyzer", "Needs live player values and roster context.", "/fantasy/trade", "gated"],
  ["Pick'em Edge", "Needs live pick'em lines and alt-line pricing.", "/fantasy/props", "gated"],
  ["League Twin", "Can render a real roster after sync; advice waits for projections.", "/fantasy/league-twin", "gated"],
  ["GM Ledger", "Proof mechanics are real; live decision history requires user roster events.", "/fantasy/gm-ledger", "gated"],
] as const;

const STATUS_TONE: Record<ToolStatus, string> = {
  live: "text-orbital-cyan",
  "partly live": "text-soft-ultraviolet",
  gated: "text-ion-2",
};

export default async function FantasyHubPage({
  searchParams,
}: {
  searchParams?: { tool?: string };
}): Promise<JSX.Element> {
  const requestedTool = searchParams?.tool?.toLowerCase();
  if (requestedTool && LEGACY_TOOL_ROUTES[requestedTool]) {
    redirect(LEGACY_TOOL_ROUTES[requestedTool]!);
  }

  const evidence = await loadSourceLiveEvidence({ timeoutMs: 15000 });
  const qbAgeLift = evidence.summary.qbAge34Lift;
  const qbAgeLiftLabel = typeof qbAgeLift === "number" ? `${formatPercent(qbAgeLift)} lift` : "UNKNOWN";
  const latestWeek =
    evidence.summary.latestUsageSeason && evidence.summary.latestUsageWeek
      ? `${evidence.summary.latestUsageSeason} W${evidence.summary.latestUsageWeek}`
      : "UNKNOWN";

  return (
    <div className="relative isolate flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <GeneratedPlate assetId="fantasy-constellation" className="-z-10 opacity-25" />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-white sm:text-6xl">
                Real roster first. No fake projections.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-300">
                Galaxy Fantasy is being rebuilt around the same rule as the picks product:
                if the data is not real, the advice stays locked. You can connect your real
                league roster now; projection-driven recommendations open only after the
                live data layer clears.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/fantasy/connect" className="btn btn-primary">
                  Connect your league
                </Link>
                <Link href="/launch" className="btn btn-ghost">
                  Founding launch
                </Link>
                <Link href="/optimizer" className="btn btn-ghost">
                  Open the Optimizer
                </Link>
                <Link href="/trends" className="btn btn-ghost">
                  View Trend Lab
                </Link>
              </div>
            </div>
            <div className="border border-mineral bg-eclipse p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Fantasy readiness
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <ReadinessMetric label="Roster" value="sync" />
                <ReadinessMetric label="Projections" value="gated" />
                <ReadinessMetric label="Actions" value="no-write" />
              </dl>
              <p className="mt-4 text-sm leading-6 text-ink-300">
                This page no longer presents fictional player pools as the primary product.
                Demo tools can remain internal methodology references, but the public path is data-first.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Real NFL usage backbone
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white">
                Fantasy starts with rows, then earns recommendations.
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-300">
                The free-first layer is already reading live player-week usage, roster, and
                schedule files. It can prove usage context and reject weak narrative angles today;
                it still cannot unlock projection-driven lineup, waiver, trade, DFS, or pick'em
                advice until those provider feeds are live.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/nflverse" className="btn btn-ghost">
                  NFLverse Pulse
                </Link>
                <Link href="/api/sources/catalog" className="btn btn-ghost">
                  Source JSON
                </Link>
                <Link href="/fantasy/baseline" className="btn btn-ghost">
                  Baseline map
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <EvidenceMetric
                label="Player-stat rows"
                value={formatCount(evidence.summary.usagePlayerStatsRows)}
                detail="Read-only weekly source release pulls."
              />
              <EvidenceMetric
                label="Latest usage week"
                value={latestWeek}
                detail={`${formatCount(evidence.summary.latestWeekPlayerRows)} player rows in the latest REG week.`}
              />
              <EvidenceMetric
                label="Accepted research"
                value={qbAgeLiftLabel}
                detail={`${formatCount(evidence.summary.cohortObservations)} team-week observations for QB-age/RB target share.`}
              />
              <EvidenceMetric
                label="Rejected narratives"
                value={evidence.summary.birthdayUsageConclusion ?? "UNKNOWN"}
                detail={`${formatCount(evidence.summary.birthdayWindowObservations)} birthday-window and ${formatCount(evidence.summary.careerMilestone50Observations)} milestone observations.`}
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-3xl font-semibold text-white">Live-first build order</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {LIVE_FIRST.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="surface-card group flex min-h-56 flex-col p-5 transition-transform duration-200 hover:-translate-y-1"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    {item.status}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-ink-300">{item.body}</p>
                  <span className="mt-5 text-sm font-semibold text-orbital-cyan">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-3xl font-semibold text-white">Every tool, with its honest status</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
                  One directory, no dead ends. Each tool links straight through and shows whether it&apos;s
                  live, partly live, or gated on a real data feed. Never a design delay, never a fictional input.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <Link href="/fantasy/baseline" className="text-orbital-cyan hover:text-white">
                  LineStar / Elite baseline
                </Link>
                <Link href="/integrations" className="text-orbital-cyan hover:text-white">
                  Data requirements
                </Link>
              </div>
            </div>
            <div className="mt-6 overflow-hidden border border-mineral">
              {TOOL_DIRECTORY.map(([tool, requirement, href, status]) => (
                <Link key={tool} href={href} className="group grid gap-3 border-b border-mineral bg-eclipse px-4 py-3 transition-colors last:border-b-0 hover:bg-carbon sm:grid-cols-[0.42fr_1fr_auto] sm:items-center">
                  <p className="font-semibold text-white group-hover:text-orbital-cyan">{tool}</p>
                  <p className="text-sm leading-6 text-ink-300">{requirement}</p>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${STATUS_TONE[status]}`}>
                    {status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function EvidenceMetric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-eclipse p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-ion-2">{detail}</p>
    </div>
  );
}

function ReadinessMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</dt>
      <dd className="mt-1 font-numerals text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
