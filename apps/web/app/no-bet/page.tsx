import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses, type PassListRow } from "@/lib/board/passes";
import { NO_BET_REASONS, type NoBetReason } from "@/lib/signal-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "No-Bet Engine — Galaxy Sports Edge",
  description:
    "The model scores every game. Most don't publish. The No-Bet Engine explains why — and why disciplined passing is as important as disciplined betting.",
  alternates: { canonical: "/no-bet" },
};

// ─── Constants ────────────────────────────────────────────────────────────────

// The six primary reasons exposed on this page (ordered by product mandate)
const PRIMARY_REASON_CODES = [
  "DATA_STALE",
  "DATA_QUALITY",
  "MARKET_EFFICIENT",
  "LINE_MOVEMENT_ADVERSE",
  "CONFIDENCE_INSUFFICIENT",
  "VOLATILITY_TOO_HIGH",
] as const;

const DISCIPLINE_STEPS = [
  {
    step: "01",
    title: "Check Today's Board before any bet",
    body: "The board shows every game the model evaluated. If a game isn't on the board, it wasn't scored. If it's on the board without a pick, that is the signal.",
  },
  {
    step: "02",
    title: "Read the Pass List first",
    body: "Before you browse picks, look at what the model passed on today. Understanding the passes is as informative as reading the picks.",
  },
  {
    step: "03",
    title: "If no pick exists, ask why",
    body: "If you're considering a game with no published Galaxy pick, there is a reason. Check the Pass List. The reason is logged — it's not silence, it's a data point.",
  },
  {
    step: "04",
    title: "The absence of a signal IS a signal",
    body: "A model that publishes every game is not a model — it's a coinflip with brand packaging. Galaxy publishes when the edge is real. No pick means no edge. That is the correct answer.",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(category: NoBetReason["category"]): string {
  const map: Record<NoBetReason["category"], string> = {
    data: "Data",
    market: "Market",
    risk: "Risk",
    timing: "Timing",
    model: "Model",
  };
  return map[category];
}

function categoryColor(category: NoBetReason["category"]): string {
  const map: Record<NoBetReason["category"], string> = {
    data: "text-orange-400 bg-orange-950/40 border-orange-900/40",
    market: "text-amber-400 bg-amber-950/40 border-amber-900/40",
    risk: "text-red-400 bg-red-950/40 border-red-900/40",
    timing: "text-yellow-400 bg-yellow-950/40 border-yellow-900/40",
    model: "text-orange-300 bg-orange-950/30 border-orange-900/30",
  };
  return map[category];
}

function bettorMeaning(code: string): string {
  const meanings: Record<string, string> = {
    DATA_STALE:
      "If you're looking at this game, the price you're seeing may not match what the model last evaluated. Wait for a refresh or skip.",
    DATA_QUALITY:
      "Missing or unreliable inputs produced a flawed score. No published pick means the model did not have enough to work with — neither do you.",
    MARKET_EFFICIENT:
      "No book disagreement means no arb opportunity. The market got here first. Betting into an efficient market is paying full retail price for information the market already has.",
    LINE_MOVEMENT_ADVERSE:
      "Sharp money or model-conflicting line movement has eroded the edge. The pick may have been valid at open — it isn't valid at current price.",
    CONFIDENCE_INSUFFICIENT:
      "The edge index didn't reach the minimum threshold. Below 50 means the model found something, but not enough. Don't override this gate.",
    VOLATILITY_TOO_HIGH:
      "The outcome distribution is wide. Even if the edge is real, the variance is too high to recommend acting. High volatility passes are still passes.",
  };
  return meanings[code] ?? "Evaluate whether the underlying concern has been resolved before acting.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NoBetPage(): Promise<JSX.Element> {
  const passesResult = await loadBoardPasses();
  const passes = passesResult.data.passes;
  const isSample = passesResult.meta.isSampleData;

  const primaryReasons = PRIMARY_REASON_CODES
    .map((code) => NO_BET_REASONS.find((r) => r.code === code))
    .filter((r): r is NoBetReason => r !== undefined);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-gray-100">
      <Nav />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Sample banner ─────────────────────────────────────────────── */}
        {isSample && (
          <div className="flex flex-col gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-blue">
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing sample pass list data while live ingestion is unavailable.
            </span>
          </div>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Decision discipline
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">
            The model scores every game.{" "}
            <span className="text-gray-500">Most don&apos;t publish. That&apos;s by design.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-400">
            The No-Bet Engine is not a consolation prize. It&apos;s where the
            model&apos;s judgment lives. Knowing what to skip is as valuable as
            knowing what to take.
          </p>
        </section>

        {/* ── Why No-Bet Matters ────────────────────────────────────────── */}
        <section aria-label="Why no-bet matters">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
            Why it matters
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <PillarCard
              body="Every published pick survived a gate. Every pass tells you what didn't — and why the model's judgment is auditable."
            />
            <PillarCard
              body="Sharp bettors average 2–3 bets per day on a full slate. Not 15. Volume is not a strategy; it's variance in disguise."
            />
            <PillarCard
              body="A season of disciplined passing outperforms a season of forced action. The ledger of skipped bets is as real as the ledger of placed ones."
            />
          </div>
        </section>

        {/* ── No-Bet Reason Grid ────────────────────────────────────────── */}
        <section aria-label="No-bet reasons">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
                Pass reasons
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Why the model passes
              </h2>
            </div>
            <span className="font-mono text-xs text-gray-500">
              {primaryReasons.length} primary gates
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {primaryReasons.map((reason) => (
              <ReasonCard key={reason.code} reason={reason} />
            ))}
          </div>
        </section>

        {/* ── Today's Pass List ─────────────────────────────────────────── */}
        <section aria-label="Today's pass list">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
                Today&apos;s pass list
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Evaluated games that didn&apos;t clear the gate
              </h2>
            </div>
            <div className="rounded border border-mineral bg-carbon/60 px-3 py-1.5 text-center">
              <p className="font-mono text-lg font-bold text-white">
                {passes.length}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                passed
              </p>
            </div>
          </div>

          <p className="mb-5 text-sm leading-6 text-gray-400">
            These are today&apos;s evaluated games that didn&apos;t clear the
            gate. Each entry is logged with the reason that caused the pass.
          </p>

          {passes.length > 0 ? (
            <div className="divide-y divide-gray-800 border border-mineral">
              {passes.slice(0, 8).map((row) => (
                <PassRow key={row.id} row={row} />
              ))}
              {passes.length > 8 && (
                <div className="px-4 py-3">
                  <Link
                    href="/board"
                    className="text-xs font-semibold text-ion-blue hover:underline"
                  >
                    View all {passes.length} passes on Today&apos;s Board →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 border border-mineral bg-gray-900/30 py-10 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                No passes yet
              </span>
              <p className="max-w-sm text-sm text-gray-400">
                No passes have been logged for today&apos;s slate yet. Check
                back after the scoring pipeline completes its morning evaluation.
              </p>
              <Link
                href="/board"
                className="mt-2 text-xs font-semibold text-ion-blue hover:underline"
              >
                See what&apos;s being scored now →
              </Link>
            </div>
          )}
        </section>

        {/* ── The Discipline Stack ──────────────────────────────────────── */}
        <section aria-label="The discipline stack">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
            The discipline stack
          </p>
          <h2 className="mb-6 text-2xl font-bold text-white">
            How to use the No-Bet Engine
          </h2>
          <div className="flex flex-col gap-4">
            {DISCIPLINE_STEPS.map((item) => (
              <DisciplineStep key={item.step} {...item} />
            ))}
          </div>
        </section>

        {/* ── Philosophy Quote ──────────────────────────────────────────── */}
        <section
          aria-label="No-bet philosophy"
          className="border border-mineral bg-gray-900/30 p-6 sm:p-10"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Philosophy
          </p>
          <blockquote className="border-l-2 border-ion-blue pl-6">
            <p className="text-lg font-semibold leading-8 text-white sm:text-xl">
              &ldquo;Professional sports bettors talk about their best no-bet
              days as much as their best winning days. The discipline to not act
              when the signal isn&apos;t there is what separates research from
              gambling.&rdquo;
            </p>
          </blockquote>
          <p className="mt-5 text-sm leading-6 text-gray-400">
            The Pass List is not empty seats at the table. It&apos;s evidence of
            a process that works — a model that knows when not to speak is more
            trustworthy than one that always does.
          </p>
        </section>

        {/* ── Quick Links ───────────────────────────────────────────────── */}
        <section
          aria-label="Quick links"
          className="border border-mineral bg-gray-900/30 p-5"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
            Continue reading
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Today's Board", href: "/board" },
              { label: "Published Picks", href: "/picks" },
              { label: "Your Briefing", href: "/briefing" },
              { label: "Methodology", href: "/methodology" },
              { label: "Academy", href: "/academy" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-300 hover:border-ion-blue hover:text-ion-blue"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PillarCard({ body }: { body: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-gray-900/40 p-5">
      <p className="text-sm leading-6 text-gray-300">{body}</p>
    </div>
  );
}

function ReasonCard({ reason }: { reason: NoBetReason }): JSX.Element {
  const catClass = categoryColor(reason.category);
  return (
    <article className="flex flex-col gap-3 border border-amber-900/30 bg-amber-950/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-white">{reason.label}</h3>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${catClass}`}
        >
          {categoryLabel(reason.category)}
        </span>
      </div>
      <p className="text-xs leading-5 text-gray-400">{reason.description}</p>
      <div className="border-t border-amber-900/20 pt-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber-600">
          What this means for you
        </p>
        <p className="mt-1.5 text-xs leading-5 text-gray-300">
          {bettorMeaning(reason.code)}
        </p>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${reason.severity === "hard" ? "bg-red-500" : "bg-yellow-500"}`}
        />
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
          {reason.severity === "hard" ? "Hard gate — model will not publish" : "Soft gate — consider passing"}
        </span>
      </div>
    </article>
  );
}

function PassRow({ row }: { row: PassListRow }): JSX.Element {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_1.4fr]">
      <div>
        <Link
          href={`/room/${row.gameId}`}
          className="text-sm font-semibold text-white hover:text-ion-blue"
        >
          {row.matchup}
        </Link>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          {row.sport}
        </p>
      </div>
      <span className="font-mono text-xs text-cyan-300 sm:self-center">
        {row.edgeIndex === null ? "EI N/A" : `EI ${row.edgeIndex}`}
      </span>
      <p className="text-xs leading-5 text-gray-400 sm:text-right">
        {row.reason}
      </p>
    </div>
  );
}

function DisciplineStep({
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
        <span className="font-mono text-2xl font-black text-gray-700">
          {step}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-sm leading-6 text-gray-400">{body}</p>
      </div>
    </div>
  );
}
