import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SignatureMoment } from "@/components/marketing/SignatureMoment";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Galaxy Sports Edge — Demo Tour",
  description:
    "A guided walkthrough of Galaxy Sports Edge using demonstration data. Not live picks.",
  robots: { index: false, follow: false },
};

// ─── Tour stop definitions ────────────────────────────────────────────────────

const TOUR_STOPS = [
  {
    stop: 1,
    title: "Enter Galaxy",
    desc:
      "Galaxy is a decision-quality intelligence platform. It publishes calibrated signals backed " +
      "by an evidence chain — not a tipster service, not an AI-picks vendor. Every pick comes " +
      "with what would make it wrong. Every no-bet tells you what the model skipped and why.",
    href: "/today",
    cta: "Start at Today's Board",
    accent: "text-ion-blue",
  },
  {
    stop: 2,
    title: "Today's Board",
    desc:
      "The Board is air traffic control for the day's slate. Published signals are sorted by " +
      "confidence, each with a per-pick trust label showing data freshness. The pass list tells " +
      "you what the model evaluated but didn't clear the gate — read that before acting.",
    href: "/today",
    cta: "Open Today's Board",
    accent: "text-cyan-400",
  },
  {
    stop: 3,
    title: "Decision Room",
    desc:
      "Each pick links to a Decision Room — a per-game intelligence room with Market Pulse, " +
      "Slate Weather, Evidence Timeline, What Would Change Our Mind, lens views, and a full " +
      "Decision Coach. This is where you stop and think before acting.",
    href: "/room/demo-game-001",
    cta: "Open Demo Decision Room",
    accent: "text-emerald-400",
  },
  {
    stop: 4,
    title: "Evidence & Trust",
    desc:
      "Every data point carries a source label (Galaxy model, provider odds, aggregate, public " +
      "record) and a freshness tag (live / fresh / today / stale). The TrustStrip at the top of " +
      "each surface shows the evidence health score. If the score is below 60, treat the read " +
      "as lower confidence.",
    href: "/picks",
    cta: "See evidence in picks",
    accent: "text-amber-400",
  },
  {
    stop: 5,
    title: "Pick or Pass",
    desc:
      "The no-bet doctrine: if you can't articulate the edge independently, you're betting on " +
      "hope, not evidence. Pass when the line has moved against the signal, when you can't explain " +
      "why the public is wrong, or when your reasoning is emotional. A disciplined pass is a win.",
    href: "/no-bet",
    cta: "Read today's passes",
    accent: "text-orange-400",
  },
  {
    stop: 6,
    title: "Parlay MRI",
    desc:
      "The Parlay MRI scores correlated parlay legs. Correlated legs share an underlying cause — " +
      "the books price this in, so high-correlation parlays carry worse expected value than their " +
      "independent probabilities suggest. Below 30 is low correlation. Above 70 is high.",
    href: "/parlay-mri",
    cta: "Open Parlay MRI",
    accent: "text-purple-400",
  },
  {
    stop: 7,
    title: "Command Center & Academy",
    desc:
      "Command Center is your decision home — briefing, pass list, academy recommendation, risk " +
      "patterns, and next-best-surface in one view. Academy builds the mental models behind the " +
      "signals: expected value, line movement, no-bet doctrine, parlay correlation.",
    href: "/command",
    cta: "Open Command Center",
    accent: "text-indigo-400",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GalaxyDemoPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Demo data banner ─────────────────────────────────────────────── */}
        <div className="mb-10 flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-4">
          <span
            className="mt-0.5 shrink-0 rounded bg-amber-700/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-300"
            aria-label="Demo tour"
          >
            Demo tour
          </span>
          <p className="text-sm leading-relaxed text-amber-200/80">
            This is a guided walkthrough using{" "}
            <strong className="text-amber-200">demonstration data</strong>. Not live picks.
            No real wager recommendations are being made. This tour is for beta onboarding
            and product review only — it is not indexed by search engines.
          </p>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header className="mb-14 border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Guided walkthrough
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            <SignatureMoment
              prefix="Galaxy reads"
              words={["evidence", "uncertainty", "discipline", "restraint"]}
            />
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-gray-400">
            7 stops covering the full decision loop — from Today&apos;s Board to Command Center.
            Each stop links to the live surface.
          </p>
        </header>

        {/* ── Tour stops ───────────────────────────────────────────────────── */}
        <ol className="space-y-0">
          {TOUR_STOPS.map((stop, i) => (
            <TourStop
              key={stop.stop}
              stop={stop.stop}
              total={TOUR_STOPS.length}
              title={stop.title}
              desc={stop.desc}
              href={stop.href}
              cta={stop.cta}
              accent={stop.accent}
              isLast={i === TOUR_STOPS.length - 1}
            />
          ))}
        </ol>

        {/* ── Footer nav ───────────────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-mineral pt-10 text-center">
          <p className="text-sm text-gray-400">
            Ready to use the real thing?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/today"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ion-blue px-5 text-sm font-bold text-carbon hover:opacity-90"
            >
              Open Today&apos;s Board
            </Link>
            <Link
              href="/command"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-700 px-5 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              Command Center
            </Link>
          </div>
        </div>

        <RiskDisclosure variant="compact" className="mt-10 text-center" />
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TourStop({
  stop,
  total,
  title,
  desc,
  href,
  cta,
  accent,
  isLast,
}: {
  stop: number;
  total: number;
  title: string;
  desc: string;
  href: string;
  cta: string;
  accent: string;
  isLast: boolean;
}): JSX.Element {
  return (
    <li className="relative flex gap-6 pb-0">
      {/* ── Vertical timeline connector ── */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mineral bg-gray-900 font-mono text-xs font-bold text-gray-400">
          {stop}
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-mineral" style={{ minHeight: "3rem" }} />
        )}
      </div>

      {/* ── Stop content ── */}
      <div className={["pb-10", isLast ? "" : ""].join(" ")}>
        <p className={["font-mono text-[9px] uppercase tracking-[0.2em]", accent].join(" ")}>
          Stop {stop}/{total}
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-gray-400">{desc}</p>
        <div className="mt-4 inline-flex items-center gap-1 rounded border border-mineral bg-gray-900/60 px-3 py-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-amber-500">
            Demo data
          </span>
        </div>
        <div className="mt-3">
          <Link
            href={href}
            className={["font-mono text-[9px] uppercase tracking-widest transition-opacity hover:opacity-80", accent].join(" ")}
          >
            {cta} →
          </Link>
        </div>
      </div>
    </li>
  );
}
