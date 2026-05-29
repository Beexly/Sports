import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import { TrustStrip } from "@/components/trust";
import { CoachPromptHost } from "@/components/coach/CoachPromptHost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Post-Bet Autopsy — ${BRAND_NAME}`,
  description:
    "Review every settled pick's factor trail, decision context, and outcome. The Autopsy surface separates process quality from result variance — so you know what to repeat and what to stop.",
  alternates: { canonical: "/autopsy" },
};

const AUTOPSY_DIMENSIONS = [
  {
    label: "Process Grade",
    description:
      "Did you follow your stated decision process before acting? Did you check the board, the pass list, the market context?",
    grades: [
      { grade: "A", meaning: "Full process — board, pass list, market, bankroll check" },
      { grade: "B", meaning: "Most of process — missed one step" },
      { grade: "C", meaning: "Partial — acted on a single factor without cross-check" },
      { grade: "D", meaning: "Minimal — narrative or emotion-driven action" },
    ],
  },
  {
    label: "Signal Grade",
    description:
      "How strong was the underlying signal at the time of the bet? This is not the outcome — it's what the model said when you acted.",
    grades: [
      { grade: "A", meaning: "Elite — edge index 80+, full factor confirmation" },
      { grade: "B", meaning: "High — edge index 65–79, majority factor confirmation" },
      { grade: "C", meaning: "Marginal — edge index 50–64, mixed signals" },
      { grade: "D", meaning: "Weak or absent — acted against model or below threshold" },
    ],
  },
  {
    label: "CLV Result",
    description:
      "Did the closing line validate your entry price? Positive CLV means you got better than market price. Negative means the market disagreed.",
    grades: [
      { grade: "+", meaning: "Positive CLV — your entry was better than the closing line" },
      { grade: "0", meaning: "Flat CLV — entry was near the closing line" },
      { grade: "−", meaning: "Negative CLV — market moved against your entry after the bet" },
    ],
  },
  {
    label: "Outcome",
    description:
      "What happened. The least important of the four dimensions for process review — result variance is real.",
    grades: [
      { grade: "W", meaning: "Win — pick covered" },
      { grade: "L", meaning: "Loss — pick did not cover" },
      { grade: "P", meaning: "Push — no action" },
    ],
  },
] as const;

const AUTOPSY_LESSONS = [
  {
    pattern: "Good process, bad outcome",
    summary:
      "A+ process, A signal, positive CLV — loss. This is variance. You did nothing wrong. Do not adjust your process based on this result.",
    action: "Log it. Move on. Sample size is the answer.",
    accent: "border-l-cyan-500",
  },
  {
    pattern: "Bad process, good outcome",
    summary:
      "D process, C signal, negative CLV — win. This is the most dangerous outcome. It reinforces a bad pattern. You got lucky.",
    action:
      "Treat this as a loss for process review purposes. Identify which step you skipped and add a gate.",
    accent: "border-l-red-500",
  },
  {
    pattern: "Bad process, bad outcome",
    summary:
      "D process, poor signal, negative CLV — loss. This is the clearest autopsy case. The result confirmed what the process should have prevented.",
    action:
      "Build a structural check: which step, if added, would have stopped this bet? Add it as a mandatory gate.",
    accent: "border-l-amber-500",
  },
  {
    pattern: "Good process, good outcome",
    summary:
      "A process, A signal, positive CLV — win. This is what sustainable edge looks like. The process worked and the result confirmed.",
    action:
      "Identify what made this bet a strong signal. Can you replicate the conditions?",
    accent: "border-l-green-500",
  },
];

type SettledRow = {
  id: string;
  pickType: string;
  confidence: number;
  result: string | null;
  settledAt: Date | null;
  game?: {
    awayTeam?: string | null;
    homeTeam?: string | null;
    sport?: { name?: string | null } | null;
  } | null;
};

async function loadRecentSettled(): Promise<SettledRow[]> {
  const rows = await db.pick
    .findMany({
      where: { isBootstrap: false, result: { in: ["WIN", "LOSS", "PUSH"] } },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: 12,
    })
    .catch(() => []);
  return rows as unknown as SettledRow[];
}

export default async function AutopsyPage(): Promise<JSX.Element> {
  const settled = await loadRecentSettled();
  const hasData = settled.length > 0;

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main>
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
          <TrustStrip
            surfaceId="autopsy"
            source="galaxy-model"
            freshness={hasData ? "fresh" : "sample"}
            surfaceKind="decision-quality"
            tier="all"
            uncertainty={hasData ? "live" : "sample"}
            showMethodology
            showResponsiblePlay
          />
        </div>

        {/* Hero */}
        <section className="border-b border-mineral px-4 pb-20 pt-20 sm:px-6 sm:pb-28 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-ion-blue">
              Post-Bet Autopsy
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Results are the least interesting part.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Sharp bettors review process, not outcomes. Galaxy's Autopsy surface scores every
              settled pick on four dimensions — process, signal, CLV, and result — so you know
              exactly what to repeat and what to stop.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-gray-600">
              Outcome variance is real. Process quality is controllable.
            </p>
          </div>
        </section>

        {/* Four Dimensions */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
                Autopsy framework
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Four dimensions per pick.
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Outcome alone tells you nothing. Context tells you everything.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {AUTOPSY_DIMENSIONS.map((dim) => (
                <div
                  key={dim.label}
                  className="rounded-xl border border-mineral bg-gray-900/40 p-6"
                >
                  <h3 className="text-base font-bold text-white">{dim.label}</h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{dim.description}</p>
                  <div className="mt-4 space-y-2">
                    {dim.grades.map((g) => (
                      <div key={g.grade} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-mineral bg-carbon font-mono text-xs font-bold text-ion-blue">
                          {g.grade}
                        </span>
                        <p className="text-xs leading-6 text-gray-400">{g.meaning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Settled Picks */}
        <section className="border-y border-mineral bg-gray-900/20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
                  Recent settled picks
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">Ledger entries.</h2>
              </div>
              <Link
                href="/ledger"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue hover:text-cyan-300"
              >
                Full ledger →
              </Link>
            </div>

            {!hasData ? (
              <div className="rounded-xl border border-mineral bg-gray-900/30 px-8 py-16 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-gray-600">
                  No settled picks yet
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  Autopsy entries populate as picks settle. Check back after today&apos;s board
                  resolves.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-mineral">
                <table className="w-full text-sm">
                  <thead className="border-b border-mineral bg-gray-900/60">
                    <tr>
                      {["Matchup", "Sport", "Type", "Confidence", "Result", "Settled"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mineral">
                    {settled.map((pick) => {
                      const resultColor =
                        pick.result === "WIN"
                          ? "text-green-400"
                          : pick.result === "LOSS"
                            ? "text-red-400"
                            : "text-gray-400";
                      return (
                        <tr key={pick.id} className="hover:bg-gray-900/20">
                          <td className="px-4 py-3 font-medium text-white">
                            {pick.game?.awayTeam ?? "—"} @ {pick.game?.homeTeam ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {pick.game?.sport?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {pick.pickType}
                          </td>
                          <td className="px-4 py-3 text-gray-300">{pick.confidence}</td>
                          <td className={`px-4 py-3 font-bold ${resultColor}`}>
                            {pick.result ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {pick.settledAt
                              ? new Date(pick.settledAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-mineral px-4 py-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-700">
                    Source: Galaxy model · Scores from prediction-engine at pick time
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Four Autopsy Patterns */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
                How to read your results
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                The four autopsy patterns.
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Every settled pick falls into one of these quadrants. Only one is a real loss.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {AUTOPSY_LESSONS.map((lesson) => (
                <div
                  key={lesson.pattern}
                  className={`rounded-xl border border-mineral border-l-4 ${lesson.accent} bg-gray-900/40 p-6`}
                >
                  <h3 className="text-base font-bold text-white">{lesson.pattern}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{lesson.summary}</p>
                  <div className="mt-4 rounded border border-mineral bg-carbon/50 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
                      What to do
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{lesson.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLV Explanation */}
        <section className="border-y border-mineral bg-gray-900/20 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Why CLV matters
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              Closing Line Value is the only retrospective signal that matters.
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-gray-400">
              <p>
                Win rate over a small sample is noise. CLV is signal. If you consistently beat
                the closing line, you are identifying edge before the market does. That is the
                definition of sharp betting.
              </p>
              <p>
                A win rate around the mid-fifties at -110 sits near breakeven. A slightly lower
                hit rate paired with consistently positive CLV suggests your entry timing is
                good and your outcomes will revert toward your true edge as sample size grows.
              </p>
              <p>
                Galaxy records the opening line, your entry point, and the closing line for
                every settled pick. CLV is calculated automatically. You do not need to track it
                manually.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/academy"
                className="font-mono text-xs uppercase tracking-[0.14em] text-ion-blue hover:text-cyan-300"
              >
                CLV module in Academy →
              </Link>
              <Link
                href="/tracker"
                className="font-mono text-xs uppercase tracking-[0.14em] text-gray-500 hover:text-gray-300"
              >
                Open Tracker →
              </Link>
              <Link
                href="/methodology"
                className="font-mono text-xs uppercase tracking-[0.14em] text-gray-500 hover:text-gray-300"
              >
                Methodology →
              </Link>
            </div>
          </div>
        </section>

        <CoachPromptHost surface="autopsy" className="mx-auto max-w-4xl px-4 pb-6" />
        <RiskDisclosure
          variant="card"
          includePastPerformance
          className="mx-auto max-w-4xl px-4 pb-12 pt-8"
        />
      </main>
      <Footer />
    </div>
  );
}
