import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { ProofOfRecord } from "@/components/trust-ledger/proof-of-record";
import { buildProofDemo } from "@/lib/trust-ledger/proof-demo";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";

const RESULT_HEX: Record<string, string> = {
  WIN: BRAND_COLORS.orbitalCyan,
  LOSS: BRAND_COLORS.ionMagenta,
  PUSH: BRAND_COLORS.softUltraviolet,
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Ledger - Galaxy Sports Edge",
  description:
    "Settled canonical picks with the original signal snapshot preserved against the outcome.",
  alternates: { canonical: "/ledger" },
};

interface LedgerRow {
  readonly id: string;
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  readonly selection: string;
  readonly result: string;
  readonly settledAt: Date | null;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly snapshotSummary: string;
}

function snapshotSummary(snapshot: {
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly hadLineMovementSignal: boolean;
  readonly hadRestSignal: boolean;
  readonly hadScheduleSignal: boolean;
  readonly hadAtsFormSignal: boolean;
  readonly hadH2HSignal: boolean;
} | null): string {
  if (!snapshot) return "Signal snapshot pending backfill.";
  const active = [
    snapshot.hadLineMovementSignal ? "line movement" : null,
    snapshot.hadRestSignal ? "rest" : null,
    snapshot.hadScheduleSignal ? "schedule" : null,
    snapshot.hadAtsFormSignal ? "ATS form" : null,
    snapshot.hadH2HSignal ? "H2H" : null,
  ].filter((item): item is string => item !== null);

  const factors = active.length > 0 ? active.join(", ") : "odds";
  return `${snapshot.bookmakerCount} books, ${Math.round(snapshot.dataQualityScore)} data quality, active: ${factors}.`;
}

async function loadLedgerRows(): Promise<LedgerRow[]> {
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        signalSnapshot: true,
      },
      orderBy: { settledAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  return picks.map((pick) => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    selection: pick.selection,
    result: pick.result,
    settledAt: pick.settledAt,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    modelVersion: pick.modelVersion,
    snapshotSummary: snapshotSummary(pick.signalSnapshot),
  }));
}

export default async function LedgerPage(): Promise<JSX.Element> {
  const rows = await loadLedgerRows();
  const proofDemo = buildProofDemo();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}14, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" />
                Public ledger
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-3xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.25rem, 6vw, 4.25rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
              >
                Every settled pick keeps its receipt.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                The ledger preserves the original signal snapshot next to the outcome, and commits
                a tamper-evident root at lock time. Bootstrap-era and synthetic seed records are
                excluded.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-7">
                <Link href="/performance/losses" className="btn btn-ghost">
                  Open the Loss Room →
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Tamper-evident proof of record — the cryptographic backbone */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 className="font-display text-2xl text-white sm:text-3xl">A record that can&apos;t be rewritten.</h2>
            </Reveal>
            <Reveal delay={90}>
              <p className="mt-3 max-w-2xl text-ink-300">
                Every published pick is a Merkle leaf; we commit the root at lock time. Anyone can
                recompute it and verify a pick was in the set, and that no loss was quietly turned
                into a win. Toggle the tamper to see the commitment break.
              </p>
            </Reveal>
            <Reveal delay={140} className="mt-8">
              <ProofOfRecord demo={proofDemo} />
            </Reveal>
          </div>
        </section>

        {/* Settled receipts */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 className="font-display text-2xl text-white sm:text-3xl">Settled receipts</h2>
            </Reveal>
            {rows.length === 0 ? (
              <Reveal delay={100}>
                <div className="surface-card mt-6 p-8">
                  <p className="text-base font-semibold text-white">Building ledger history</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
                    No settled canonical picks yet. The ledger populates after real picks settle
                    with their signal snapshots attached.
                  </p>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={100}>
                <div className="surface-card mt-6 overflow-hidden p-0">
                  <div
                    className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 text-xs uppercase tracking-[0.16em] text-ink-500 md:grid-cols-[1.1fr_0.8fr_auto_1.4fr]"
                    style={{ borderColor: BRAND_COLORS.steelGray }}
                  >
                    <span>Pick</span>
                    <span className="hidden md:block">Market</span>
                    <span>Result</span>
                    <span className="hidden md:block">Snapshot</span>
                  </div>
                  {rows.map((row) => (
                    <article
                      key={row.id}
                      className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1.1fr_0.8fr_auto_1.4fr]"
                      style={{ borderColor: BRAND_COLORS.steelGray }}
                    >
                      <div>
                        <h3 className="font-semibold text-white">
                          <Link href={`/room/${row.gameId}`} className="hover:text-cyan-200">
                            {row.matchup}
                          </Link>
                        </h3>
                        <p className="mt-1 text-xs text-ink-500">
                          {row.sport} · {row.settledAt ? row.settledAt.toISOString().slice(0, 10) : "settled"}
                        </p>
                      </div>
                      <p className="text-sm text-ink-300">{row.selection}</p>
                      <p className="font-mono text-sm font-bold" style={{ color: RESULT_HEX[row.result] ?? BRAND_COLORS.ionWhite }}>{row.result}</p>
                      <p className="text-sm leading-relaxed text-ink-400">{row.snapshotSummary}</p>
                    </article>
                  ))}
                </div>
              </Reveal>
            )}
            <div className="mt-8">
              <RiskDisclosure variant="compact" className="text-center" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
