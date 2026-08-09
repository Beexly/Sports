import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal } from "@/components/motion/reveal";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { loadEngineStory } from "@/lib/engine/load-engine-story";
import { SurgeCount, HashMaterialize, GateBar } from "@/components/engine/engine-atoms";

/**
 * THE SEALED ENGINE — watch the machine commit.
 *
 * Not how it thinks. What it is willing to sign. Every number on this page is
 * live telemetry or a cryptographic commitment pulled from the same database
 * the board runs on: sweep counts, the gate ledger (published vs declined),
 * receipts freezing, slate roots. Method — factor names, weights, thresholds,
 * decline logic — is deliberately absent, by standing doctrine: outcomes and
 * proofs are public, the recipe is not.
 *
 * Interlock: every chapter exits into another organ of the system (board,
 * verifier, record, pricing). Nothing dead-ends.
 */

export const metadata: Metadata = {
  title: "The Sealed Engine: Watch the Machine Commit",
  description:
    "Engine telemetry from the pick engine: what it swept, what it declined, what it sealed behind receipts before kickoff. Proof you can check, with the recipe kept where it belongs.",
  alternates: { canonical: "/engine" },
};

export const dynamic = "force-dynamic";

export default async function SealedEnginePage() {
  const story = await loadEngineStory();
  const quietDay =
    !story.unreachable &&
    story.sweep.oddsRowsRead === 0 &&
    story.gate.evaluated === 0 &&
    story.seals.receiptsFrozenToday === 0;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-void text-ion-white">
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-25" />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* ── HERO ── */}
        <section className="gw-nebula-deep relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow flex items-center gap-2">
                <span className="live-dot" aria-hidden />
                The Sealed Engine
              </p>
              <h1 className="mt-4 font-display text-display-xl text-balance">
                Watch the machine <span className="gw-chrome-plasma">commit</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ion-1">
                Not how it thinks. What it is willing to sign. Everything below
                is live: the sweep, the gate, the seals. The recipe stays in
                the vault; the commitments are yours to check.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Outage state: never a verdict ── */}
        {story.unreachable && (
          <section
            data-testid="engine-unreachable-state"
            className="px-4 py-12 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-3xl rounded-2xl border border-caution/40 bg-caution/[0.06] px-6 py-10 text-center">
              <p className="text-base font-semibold text-ion-white">
                The telemetry feed is temporarily unreachable.
              </p>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                A connection problem, not a verdict. The engine&apos;s
                commitments are unchanged; refresh in a moment.
              </p>
            </div>
          </section>
        )}

        {/* ── Quiet day: restraint, not brokenness ── */}
        {quietDay && (
          <section data-testid="engine-quiet-state" className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-mineral bg-eclipse/50 px-6 py-10 text-center">
              <p className="text-base font-semibold text-ion-white">
                Nothing on the wire yet today.
              </p>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                The engine does not invent work. When the day&apos;s games and
                prices arrive, the sweep, the gate, and the seals appear here
                as they happen. The settled record never sleeps:
              </p>
              <Link
                href="/proof"
                className="mt-5 inline-block rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/10"
              >
                See the sealed record
              </Link>
            </div>
          </section>
        )}

        {!story.unreachable && !quietDay && (
          <>
            {/* ── CHAPTER 01 · THE SWEEP ── */}
            <section className="px-4 py-14 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
                    01 · The sweep
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">
                    First, it reads the whole market.
                  </h2>
                </Reveal>
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Odds rows read today", value: story.sweep.oddsRowsRead },
                    { label: "Games in the sweep", value: story.sweep.gamesUpserted },
                    { label: "Sports covered", value: story.sweep.sportsSwept },
                  ].map((m, i) => (
                    <Reveal key={m.label} delay={i * 120}>
                      <div className="surface-card p-6 text-center">
                        <SurgeCount
                          value={m.value}
                          className="font-display text-4xl font-extrabold text-ion-white"
                        />
                        <p className="mt-2 text-xs uppercase tracking-widest text-ion-2">
                          {m.label}
                        </p>
                      </div>
                    </Reveal>
                  ))}
                </div>
                {story.sweep.lastSuccessAt && (
                  <p className="mt-4 text-[11px] text-ion-3">
                    Last successful sweep {new Date(story.sweep.lastSuccessAt).toUTCString()}
                  </p>
                )}
              </div>
            </section>

            {/* ── CHAPTER 02 · THE GATE ── */}
            <section className="gw-grid-field border-y border-mineral/60 px-4 py-14 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
                    02 · The gate
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">
                    Then it declines most of what it sees.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
                    Every game the engine evaluates gets a written verdict:
                    board, or no board. The declines are counted and kept.
                    What the bar is made of stays ours; that it holds is
                    yours to see.
                  </p>
                </Reveal>
                <Reveal delay={150}>
                  <div className="mt-8">
                    {story.gate.evaluated > 0 ? (
                      <GateBar
                        published={story.gate.published}
                        declined={story.gate.declined}
                      />
                    ) : (
                      <p
                        data-testid="engine-gate-empty"
                        className="rounded-xl border border-mineral bg-eclipse/50 px-4 py-6 text-center text-sm text-ion-2"
                      >
                        No gate verdicts recorded yet today; they land here as
                        the engine works the slate.
                      </p>
                    )}
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ── CHAPTER 03 · THE SEAL ── */}
            <section className="px-4 py-14 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-plasma">
                    03 · The seal
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">
                    Every survivor is sealed before kickoff.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
                    <SurgeCount value={story.seals.receiptsFrozenToday} className="font-semibold text-ion-white" />{" "}
                    receipts frozen today. Each one binds the pick&apos;s
                    committed numbers to a hash that cannot be edited after
                    the game. This is the newest seal on the ledger,
                    materializing exactly as it is stored:
                  </p>
                </Reveal>
                {story.seals.latest && (
                  <Reveal delay={150}>
                    <div className="mt-6 surface-card p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                        Latest frozen receipt · {new Date(story.seals.latest.frozenAt).toUTCString()}
                      </p>
                      <HashMaterialize
                        hash={story.seals.latest.contentHash}
                        className="mt-3 rounded bg-obsidian/60 p-4 text-[13px]"
                      />
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                        <Link
                          href={`/verify?hash=${story.seals.latest.contentHash}`}
                          className="btn btn-primary"
                        >
                          Check this seal in your browser
                        </Link>
                        <Link
                          href="/proof"
                          className="self-center text-sm font-semibold text-orbital-cyan hover:text-ion-white"
                        >
                          The whole settled ledger →
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                )}
                {story.seals.slates.length > 0 && (
                  <Reveal delay={250}>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {story.seals.slates.map((s) => (
                        <div key={s.slateKey} className="rounded-xl border border-mineral bg-eclipse/50 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
                            Slate root · {s.slateKey}
                          </p>
                          <code className="mt-2 block break-all font-mono text-[11px] text-ion-1" title={s.root}>
                            {s.root}
                          </code>
                          <p className="mt-2 text-[11px] text-ion-3">
                            {s.count} receipts committed {new Date(s.committedAt).toUTCString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                )}
              </div>
            </section>

            {/* ── CHAPTER 04 · THE RECORD + FUNNEL CLOSE ── */}
            <section className="border-t border-plasma/20 bg-plasma/[0.04] px-4 py-14 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <Reveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-plasma">
                    04 · The record
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">
                    <SurgeCount value={story.record.totalSettled} className="text-plasma" />{" "}
                    settled picks stand behind today&apos;s board.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
                    Wins and losses alike, hashed into one public root. The
                    engine publishes two picks free every day; Pro opens the
                    whole sealed board with the numbers attached.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                    <Link href="/picks" className="btn btn-primary whitespace-nowrap">
                      See today&apos;s board
                    </Link>
                    <Link href="/pricing" className="text-sm font-semibold text-plasma hover:text-ion-white">
                      Open the full board with Pro →
                    </Link>
                    <Link href="/performance" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                      The public record →
                    </Link>
                    <Link href="/clv" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                      Closing line value →
                    </Link>
                  </div>
                </Reveal>
              </div>
            </section>
          </>
        )}

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <RiskDisclosure variant="compact" className="text-ion-2" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
