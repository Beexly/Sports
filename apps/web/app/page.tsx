import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignalDecode } from "@/components/motion/signal-decode";
import { FieldCinematicIntro } from "@/components/landing/field-cinematic-intro";
import { FieldHeroCanvas } from "@/components/landing/field-hero-canvas";
import { FieldBoardTicker } from "@/components/landing/field-board-ticker";
import { FieldRecordPanel } from "@/components/landing/field-record-panel";
import { CLOSING_LINE } from "@/lib/brand";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { Reveal } from "@/components/motion/reveal";
import { WorldSection } from "@/components/world/world-section";
import { NoBetGateChapter } from "@/components/world/no-bet-gate";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Sports Edge",
  description:
    "A scored board, a public record, and the guts to show what we held back. We detect. You decide.",
  alternates: { canonical: "/" },
};

export default async function HomePage(): Promise<JSX.Element> {
  const [stateResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadPublicCalibrationReport(),
  ]);
  const state = stateResult.data;
  const calibration = calibrationResult.data;

  const cleared = state.publishedToday.length;
  const gated = state.gatedTodayRows.length;
  const settled = calibration.sampleSize;

  const boardSuppressed = stateResult.meta.degradations.some(
    (degradation) =>
      degradation.code === "STALE_DATA_SUPPRESSED" ||
      degradation.code === "DEMO_DATA_SUPPRESSED",
  );
  const boardUnavailable =
    stateResult.meta.dataError === "DB_UNREACHABLE" || boardSuppressed;

  const tickerItems = [
    ...state.publishedToday.slice(0, 8).map(
      (p) => `${p.matchup} · ${p.market} · cleared · edge ${p.edgeIndex ?? "—"}`,
    ),
    ...state.gatedTodayRows.slice(0, 6).map(
      (row) => `${row.matchup} · held · ${row.gateReason ?? "gate"}`,
    ),
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <FieldCinematicIntro />
      <Nav />
      <main id="main-content">
        {/* ── HERO · Field ───────────────────────────────────────────── */}
        <section
          className="relative isolate overflow-hidden border-b border-mineral"
          style={{ background: "#08090C", minHeight: "min(92vh, 820px)" }}
        >
          <FieldHeroCanvas />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 55% 40% at 70% 18%, rgba(255,77,46,0.09), transparent 58%), linear-gradient(180deg, #08090Cdd 0%, #08090C88 42%, #08090C 100%)",
            }}
          />
          <div className="relative mx-auto flex min-h-[inherit] max-w-5xl flex-col justify-center px-4 py-28 sm:px-6 lg:px-8">
            <Reveal>
              <p className="mb-6 inline-flex items-center gap-2.5 border border-mineral bg-eclipse/70 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-plasma"
                  style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }}
                />
                Live slate
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="max-w-3xl font-display font-semibold leading-[0.92] tracking-tight text-ion-white" style={{ fontSize: "clamp(3.2rem, 11vw, 6.5rem)" }}>
                Noise.
                <br />
                <span className="text-plasma">Signal.</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-xl text-lg leading-8 text-ion-1">
                Every Sunday the takes pile up. We score the markets, publish what
                survives, and put the holds on the record with their reasons.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <Link href="/board" className="btn-primary min-h-12 px-7 py-3 text-base">
                  Open the board
                </Link>
                <Link
                  href="/calibration"
                  className="inline-flex min-h-12 items-center justify-center border border-mineral px-7 py-3 text-base font-semibold text-ion-1 transition-colors hover:border-plasma hover:text-ion-white"
                >
                  See the record
                </Link>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-ion-2">
                <SignalDecode speed={28}>{CLOSING_LINE}</SignalDecode>
              </p>
            </Reveal>
            <Reveal delay={280}>
              <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-px border border-mineral bg-mineral sm:grid-cols-4">
                {[
                  { k: "Cleared", v: boardUnavailable ? "—" : String(cleared) },
                  { k: "Held", v: boardUnavailable ? "—" : String(gated) },
                  { k: "Settled n", v: settled > 0 ? String(settled) : "building" },
                  { k: "Verify", v: "public" },
                ].map((cell) => (
                  <div key={cell.k} className="bg-eclipse px-4 py-3">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{cell.k}</dt>
                    <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ion-white">{cell.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        <FieldBoardTicker items={tickerItems} />

        {/* ── 10-second wayfinding ───────────────────────────────────── */}
        <section className="border-b border-mineral px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
                Start here
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                Three doors. Pick one.
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-px overflow-hidden border border-mineral bg-mineral md:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Read today",
                  body: "What cleared, what we held, and why.",
                  stat: boardUnavailable
                    ? "Board data unavailable"
                    : `${cleared} cleared · ${gated} held`,
                  href: "/board",
                  cta: "Open board",
                  accent: true,
                },
                {
                  n: "02",
                  title: "Audit us",
                  body: "Calibration, receipts, losses stay visible.",
                  stat: settled > 0 ? `n ${settled} settled` : "Sample building",
                  href: "/calibration",
                  cta: "Open record",
                  accent: false,
                },
                {
                  n: "03",
                  title: "Check a seal",
                  body: "Paste a hash. Recompute it yourself.",
                  stat: "No account needed",
                  href: "/verify",
                  cta: "Verify receipt",
                  accent: false,
                },
              ].map((door, i) => (
                <Reveal key={door.n} delay={i * 70} className="flex">
                  <Link
                    href={door.href}
                    className="group flex w-full flex-col gap-3 bg-eclipse p-7 transition-colors hover:bg-carbon"
                  >
                    <span className="font-mono text-[10px] tracking-[0.3em] text-ion-2">{door.n}</span>
                    <span className="font-display text-2xl font-semibold text-ion-white">{door.title}</span>
                    <span className="flex-1 text-sm leading-6 text-ion-1">{door.body}</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums text-plasma">
                      {door.stat}
                    </span>
                    <span className="border-t border-mineral pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2 transition-colors group-hover:text-plasma">
                      {door.cta} →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── NO-BET · stillness + data ───────────────────────────────── */}
        <WorldSection
          index="01"
          id="gate"
          className="neb-band"
          eyebrow="The hold"
          title={<>A held row is not a blank. It is <span className="text-plasma">the finding</span>.</>}
          lede="Knowing what not to trust is the product. Four gates keep weak markets off the board, and every pass is logged in public — same as a published pick."
          tone="deep"
        >
          <NoBetGateChapter />
        </WorldSection>

        {/* ── RECORD · calm live chart ────────────────────────────────── */}
        <section className="border-y border-mineral px-4 py-14 sm:px-6 lg:px-8" style={{ background: "#0A0C10" }}>
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plasma">Record</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white sm:text-4xl">
                Every number ships with its sample.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ion-1">
                Receipts freeze before kickoff. Hits print with period, sample size,
                model version, and the definition used. Thin samples stay dark with the
                gap named. Recompute any seal yourself.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/calibration" className="btn-primary min-h-11 px-5 py-2.5">
                  Full record
                </Link>
                <Link href="/verify" className="inline-flex min-h-11 items-center border border-mineral px-5 py-2.5 text-sm font-semibold text-ion-1 hover:border-plasma hover:text-ion-white">
                  Verify a receipt
                </Link>
              </div>
            </div>
            <FieldRecordPanel
              sampleSize={calibration.sampleSize}
              gated={calibrationResult.meta.gated}
              publicMessage={calibration.publicMessage}
              buckets={calibration.buckets.map((b) => ({
                label: b.label,
                expectedWinRate: b.expectedWinRate,
                observedWinRate: b.observedWinRate,
                sampleSize: b.sampleSize,
                sufficientSample: b.sampleSize >= 30,
              }))}
            />
          </div>
        </section>

        <MethodologySection
          metrics={
            boardUnavailable
              ? undefined
              : {
                  settled,
                  cleared,
                  gated,
                  lastRefresh: state.lastRefresh,
                }
          }
        />

        <section data-testid="homepage-responsible-close" className="gw-nebula px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl border border-mineral bg-eclipse p-5 sm:p-7">
            <h2 className="text-2xl font-semibold text-ion-white">The model can point. The call stays yours.</h2>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Research, not certainty. We get better by adding settled rows and clearer
              uncertainty — not louder claims.
            </p>
            <RiskDisclosure variant="compact" includePastPerformance className="mt-5 text-ion-1" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
