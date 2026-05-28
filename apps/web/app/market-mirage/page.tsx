import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Market Mirage Detector — False Signal Identification | ${BRAND_NAME}`,
  description:
    "Sharp bettors and casual bettors move lines for entirely different reasons. Galaxy's Market Mirage framework identifies which moves are worth following — and which are noise dressed up as signal.",
  alternates: { canonical: "/market-mirage" },
  openGraph: {
    title: `Market Mirage Detector — ${BRAND_NAME}`,
    description:
      "Not every line move is signal. Learn the six mirage types and how to screen them.",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const MIRAGE_TYPES = [
  {
    number: "01",
    title: "Public Pressure Drift",
    category: "Public",
    categoryColor: "text-orange-300 bg-orange-950/30 border-orange-900/40",
    body: "Heavy public action on a popular team pushes the line. The book is adjusting for volume, not sharpness. Fading this is not an edge — it's already priced in by the time you see it.",
    signal: "NOISE",
    signalColor: "text-red-300 border-red-900 bg-red-950/20",
  },
  {
    number: "02",
    title: "Steam Chasing",
    category: "Timing",
    categoryColor: "text-yellow-300 bg-yellow-950/30 border-yellow-900/40",
    body: "Following a line move after analytical money already hit. You're getting the post-move price, not the pre-move analytical edge. Steam is signal when you're first. Late is noise.",
    signal: "NOISE",
    signalColor: "text-red-300 border-red-900 bg-red-950/20",
  },
  {
    number: "03",
    title: "Injury Overreaction",
    category: "Narrative",
    categoryColor: "text-purple-300 bg-purple-950/30 border-purple-900/40",
    body: "A starter is out, the line moves 2 points in an hour. Unless you know the backup's splits, you're pricing a narrative, not a matchup. The market often overcorrects on injury news.",
    signal: "AMBIGUOUS",
    signalColor: "text-yellow-300 border-yellow-800 bg-yellow-950/20",
  },
  {
    number: "04",
    title: "Revenge Game Narrative",
    category: "Narrative",
    categoryColor: "text-purple-300 bg-purple-950/30 border-purple-900/40",
    body: '"Team X is hungry after last week\'s loss." Schedule, rest, and pace data don\'t care about revenge. The narrative is not in the model.',
    signal: "NOISE",
    signalColor: "text-red-300 border-red-900 bg-red-950/20",
  },
  {
    number: "05",
    title: "Sharp vs. Book Bait",
    category: "Book",
    categoryColor: "text-cyan-300 bg-cyan-950/30 border-cyan-900/40",
    body: "Books occasionally shade lines to invite action on one side. What looks like analytical movement is the book managing balance. Check the bet percentage relative to the handle.",
    signal: "AMBIGUOUS",
    signalColor: "text-yellow-300 border-yellow-800 bg-yellow-950/20",
  },
  {
    number: "06",
    title: "Weather as Edge",
    category: "Conditions",
    categoryColor: "text-blue-300 bg-blue-950/30 border-blue-900/40",
    body: "Weather matters for totals — but only when it's extreme and only when it's not already priced. A slight wind at kick is already baked in by open. Check the timestamp on the weather move.",
    signal: "CONDITIONAL",
    signalColor: "text-ion-blue border-cyan-800 bg-cyan-950/20",
  },
] as const;

const SIGNAL_QUALITY_COLUMNS = [
  {
    label: "Real Signal",
    color: "text-emerald-300",
    borderColor: "border-emerald-900/50",
    bgColor: "bg-emerald-950/20",
    items: [
      "Line moves against public betting %",
      "Handle confirms the direction of the move",
      "Multiple books across exchanges agree",
      "Volume pattern suggests professional entry",
    ],
  },
  {
    label: "Noise",
    color: "text-red-300",
    borderColor: "border-red-900/50",
    bgColor: "bg-red-950/20",
    items: [
      "Single book moves, others hold",
      "Public bets fully explain direction",
      "Small handle on the move",
      "Pre-game narrative is the only driver",
    ],
  },
  {
    label: "Ambiguous",
    color: "text-yellow-300",
    borderColor: "border-yellow-900/50",
    bgColor: "bg-yellow-950/20",
    items: [
      "Mixed book movement (some agree, some don't)",
      "Partial handle confirmation",
      "Unclear whether public or analytical pressure",
      "Worth monitoring — not yet actionable",
    ],
  },
] as const;

const SCREENING_STEPS = [
  {
    step: "01",
    title: "Multi-book consensus",
    body: "A move that appears on one book is a book adjustment. A move that appears across eight books simultaneously is a market-wide signal. Consensus is the first filter.",
  },
  {
    step: "02",
    title: "Handle vs. bet count split",
    body: "High bet count, low handle = public action on small bets. Low bet count, high handle = large bets from fewer accounts. The split identifies who is actually moving the number.",
  },
  {
    step: "03",
    title: "Velocity analysis",
    body: "How fast the line moved matters. A 1.5-point move in 90 seconds on no news event is a different signal than the same move over 8 hours after an injury report.",
  },
  {
    step: "04",
    title: "Freshness gate",
    body: "Line data older than 15 minutes may not reflect current market state. Every signal assessment includes a timestamp check. Stale data produces stale conclusions.",
  },
] as const;

const CROSS_LINKS = [
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Today's Picks", href: "/picks" },
  { label: "Academy", href: "/academy" },
  { label: "Intelligence", href: "/intelligence" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketMiragePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_20%,rgba(0,229,255,0.08),transparent_45%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Market Mirage Detector
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Not every line move is signal.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Analytical bettors and casual bettors move lines for entirely different reasons.
              Galaxy&apos;s Market Mirage framework identifies which moves are worth following —
              and which are noise dressed up as signal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/market-gravity"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                Market Gravity
              </Link>
              <Link
                href="/intelligence"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Intelligence feed
              </Link>
            </div>
          </div>
        </section>

        {/* ── Six Mirage Types ────────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Mirage taxonomy
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Six Mirage Types
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              These are the most common false signals in sports betting markets. Each has a
              structural explanation and a framework for why it should be filtered — not followed.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {MIRAGE_TYPES.map((m) => (
                <MirageCard key={m.number} {...m} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Signal Quality Framework ────────────────────────────────────── */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Signal quality
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Signal Quality Framework
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Not all line movement carries the same informational content. This framework
              classifies what you&apos;re looking at before you decide how to respond.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {SIGNAL_QUALITY_COLUMNS.map((col) => (
                <SignalQualityColumn key={col.label} {...col} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How Galaxy Screens ──────────────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Galaxy screening process
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              How Galaxy Screens Market Signals
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Four operational steps applied to every market movement before it becomes
              an input to the model&apos;s signal evaluation.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {SCREENING_STEPS.map((item) => (
                <ScreeningStep key={item.step} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Philosophy block ────────────────────────────────────────────── */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="border border-mineral bg-carbon/60 p-6 sm:p-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Operational principle
              </p>
              <blockquote className="mt-4 border-l-2 border-ion-blue pl-6">
                <p className="text-lg font-semibold leading-8 text-white sm:text-xl">
                  &ldquo;A signal you can&apos;t explain is not a signal. It&apos;s a
                  feeling wearing the clothes of data. The job is to separate the two
                  before the price is set, not after.&rdquo;
                </p>
              </blockquote>
              <p className="mt-5 text-sm leading-7 text-gray-400">
                The Market Mirage Detector is not a system for avoiding all line movement.
                It&apos;s a system for requiring a structural account of why a move matters before
                treating it as an edge. Noise that looks like signal is the most expensive
                mistake in market-based betting.
              </p>
            </div>
          </div>
        </section>

        {/* ── Risk Disclosure ─────────────────────────────────────────────── */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <RiskDisclosure variant="card" includePastPerformance={true} />
          </div>
        </section>

        {/* ── Cross-links ─────────────────────────────────────────────────── */}
        <section className="border-t border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
              Continue reading
            </p>
            <div className="flex flex-wrap gap-3">
              {CROSS_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-300 hover:border-ion-blue hover:text-ion-blue"
                >
                  {label}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function MirageCard({
  number,
  title,
  category,
  categoryColor,
  body,
  signal,
  signalColor,
}: {
  number: string;
  title: string;
  category: string;
  categoryColor: string;
  body: string;
  signal: string;
  signalColor: string;
}): JSX.Element {
  return (
    <article className="flex flex-col gap-4 border border-mineral bg-gray-900/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-gray-600">{number}</span>
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
      </div>
      <div className="flex gap-2">
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${categoryColor}`}
        >
          {category}
        </span>
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${signalColor}`}
        >
          {signal}
        </span>
      </div>
      <p className="text-sm leading-6 text-gray-400">{body}</p>
    </article>
  );
}

function SignalQualityColumn({
  label,
  color,
  borderColor,
  bgColor,
  items,
}: {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  items: readonly string[];
}): JSX.Element {
  return (
    <div className={`flex flex-col gap-4 border p-5 ${borderColor} ${bgColor}`}>
      <h3 className={`font-mono text-sm font-bold uppercase tracking-[0.14em] ${color}`}>
        {label}
      </h3>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm leading-6 text-gray-400">
            <span className={`mt-1 shrink-0 text-xs ${color}`}>▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScreeningStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div className="flex gap-5 border border-mineral bg-gray-900/30 p-5">
      <div className="shrink-0">
        <span className="font-mono text-2xl font-black text-gray-700">{step}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-sm leading-6 text-gray-400">{body}</p>
      </div>
    </div>
  );
}
