import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";

export const metadata: Metadata = {
  title: "Intelligence Engines — the advanced-data layer",
  description:
    "Every advanced-data engine GSE runs: QB, RB, WR/TE, team, and cross-position signals mined from cleared nflverse data, each read for the predictive edge and exposed as a live, glass-box API.",
  alternates: { canonical: "/intelligence/engines" },
};

type Status = "live" | "gated";
interface Engine {
  readonly name: string;
  readonly summary: string;
  readonly api: string;
  readonly method?: "GET" | "POST";
  readonly board?: string;
  readonly status: Status;
}
interface Group {
  readonly category: string;
  readonly engines: readonly Engine[];
}

const GROUPS: readonly Group[] = [
  {
    category: "Cross-position core",
    engines: [
      { name: "Player Intelligence", summary: "One position-aware process grade per player from the full advanced field set; process-vs-production buy/sell.", api: "/api/intelligence/player-model", board: "/intelligence/players", status: "live" },
      { name: "Expected Fantasy Points (xFP)", summary: "What a player's real usage should have produced — the cleanest, most stable buy/sell lens.", api: "/api/intelligence/expected-points", status: "live" },
      { name: "Roster Advice", summary: "Model → real add/drop/read decisions for a posted roster (composes with Sleeper sync).", api: "/api/intelligence/roster-advice", method: "POST", status: "live" },
      { name: "Graded Pool", summary: "Composes the model + xFP into a real graded pool that drives every fantasy tool when the founder enables it.", api: "/api/intelligence/graded-pool", status: "gated" },
    ],
  },
  {
    category: "Quarterback",
    engines: [
      { name: "QB Consensus", summary: "ESPN QBR (results) vs Next Gen CPOE (accuracy), triangulated — disagreement surfaced, not averaged.", api: "/api/intelligence/qb-consensus", board: "/players/qbr", status: "live" },
      { name: "QB Forward Prior", summary: "DAKOTA (EPA+CPOE) + computed ANY/A — the most forward-looking QB read, with agreement.", api: "/api/intelligence/qb-forward", status: "live" },
    ],
  },
  {
    category: "Running back",
    engines: [
      { name: "Rushing Efficiency", summary: "RYOE/att vs volume with stacked-box context — bell-cow / buy-low / volume-dependent.", api: "/api/intelligence/rushing-efficiency", board: "/players/opportunity", status: "live" },
      { name: "Rushing Contact", summary: "PFR yards-after-contact/att (talent) vs yards-before-contact (line) — independent vs RYOE.", api: "/api/intelligence/rushing-contact", status: "live" },
      { name: "Scoring-Zone Equity", summary: "Red-zone & goal-line opportunity share with TD rate regressed to the positional mean.", api: "/api/intelligence/scoring-zone", status: "live" },
    ],
  },
  {
    category: "Receiver",
    engines: [
      { name: "Receiving Opportunity (WOPR)", summary: "Air-yards & target share → WOPR, with opportunity-vs-production buy/sell.", api: "/api/intelligence/receiving-opportunity", board: "/players/opportunity", status: "live" },
      { name: "Route Rate (TPRR)", summary: "Targets per route run via a snaps×dropbacks proxy — breakout vs empty-volume. Labelled a proxy.", api: "/api/intelligence/route-rate", status: "live" },
    ],
  },
  {
    category: "Team & market",
    engines: [
      { name: "Team Environment", summary: "Neutral-script off/def EPA per play, success rate, PROE, and pace — the top-down prior.", api: "/api/intelligence/team-environment", status: "live" },
      { name: "Opportunity Transfer", summary: "Injury + depth chart + trailing usage → quantified vacated touches + ranked beneficiary.", api: "/api/intelligence/opportunity-transfer", status: "live" },
      { name: "CLV Calibration", summary: "Closing-line-value self-grading (backtest via nflverse schedules); forward odds gated.", api: "/api/intelligence/clv-calibration", status: "live" },
    ],
  },
];

const ENGINE_COUNT = GROUPS.reduce((n, g) => n + g.engines.length, 0);

export default function EnginesIndexPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Intelligence engines</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            The advanced-data layer, in the open.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ion-1">
            {ENGINE_COUNT} engines mine cleared nflverse data into the signals that actually predict — each read
            for the edge (predictive anchors vs noisy outputs), each a live, glass-box API, each degrading to an
            honest empty state instead of a fabricated number. Together they feed one graded model that drives the
            waiver tool, optimizer, draft board, and projections. <Link href="/intelligence/metrics" className="text-orbital-cyan hover:text-ion-white">How we read each metric</Link>.
          </p>
        </section>

        {GROUPS.map((g) => (
          <section key={g.category}>
            <h2 className="font-display text-2xl font-semibold text-ion-white">{g.category}</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {g.engines.map((e) => (
                <article key={e.name} className="flex flex-col border border-mineral bg-eclipse p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-tight text-ion-white">{e.name}</h3>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${e.status === "live" ? "text-orbital-cyan" : "text-ion-2"}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                      {e.status === "live" ? "live" : "gated"}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-6 text-ion-1">{e.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                    <Link href={e.api} className="text-orbital-cyan hover:text-ion-white">{e.method === "POST" ? "API (POST)" : "JSON"}</Link>
                    {e.board ? <Link href={e.board} className="text-soft-ultraviolet hover:text-ion-white">Board →</Link> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="border border-mineral bg-eclipse p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">The doctrine</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">
            Every engine reads independent signals and surfaces where they disagree rather than averaging into
            false precision. Opportunity that outruns production is a buy-low; production that outruns it is a
            sell-high. One discipline, applied across every position and the team layer — the spine of an
            accurate, defensible model.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
