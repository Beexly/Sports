import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrendCard } from "@/components/trends/trend-card";
import { loadTrendBoard } from "@/lib/trends/load-trends";

// Trends read live settled history per request; never statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trends — Form, Head-to-Head & Line Movement",
  description:
    "Recent against-the-spread form, home/road splits, head-to-head history, rest, and line movement for the upcoming slate — built from our own settled results, shown only when the sample is large enough to trust.",
  alternates: { canonical: "/trends" },
};

export default async function TrendsPage(): Promise<JSX.Element> {
  const board = await loadTrendBoard();
  const withSignal = board.games.filter((g) => g.hasSignal);

  return (
    <>
      <Nav />
      <main className="section" aria-labelledby="trends-title">
        <div className="container">
          <header className="trends-header">
            <span className="eyebrow">Form &amp; history</span>
            <h1 id="trends-title" className="trends-title">
              Trends
            </h1>
            <p className="trends-lede">
              Recent ATS form, home/road splits, head-to-head, rest, and line
              movement for the games coming up — drawn from our own settled
              results. A trend only shows once enough games back it. No invented
              streaks.
            </p>
          </header>

          {board.games.length === 0 ? (
            <div className="surface-card trends-empty" data-testid="trends-empty">
              <h2>No upcoming games to chart yet</h2>
              <p>
                {board.isSampleData
                  ? "Preview mode is on, so live trend data isn't loaded. Trends populate from settled results once the live board is running."
                  : "There's no upcoming slate with enough settled history to chart right now. Check the "}
                {!board.isSampleData ? (
                  <Link href="/board">live board</Link>
                ) : null}
                {!board.isSampleData ? " for what's scoring today." : null}
              </p>
            </div>
          ) : (
            <section
              className="trends-grid"
              aria-label="Upcoming games with form and history"
              data-testid="trends-grid"
            >
              {board.games.map((game) => (
                <TrendCard key={game.gameId} game={game} />
              ))}
            </section>
          )}

          <p className="trends-note">
            {withSignal.length > 0
              ? `${withSignal.length} of ${board.games.length} upcoming games have enough settled history to chart.`
              : null}{" "}
            How these feed a pick is documented in our{" "}
            <Link href="/methodology">methodology</Link>.
          </p>

          <RiskDisclosure />
        </div>
      </main>
      <Footer />
    </>
  );
}
