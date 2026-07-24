/**
 * /board/gate — the selective gate, decided live, in front of the reader.
 *
 * WHY THIS PAGE EXISTS. The product's central claim is that it refuses to bet
 * when it cannot justify betting. Until now that claim was only inspectable by
 * reading source. This page runs the REAL gate (`evaluateBoardGate` ->
 * `applySelectiveGate`) at request time and prints what it actually returned.
 *
 * WHAT IS AND IS NOT REAL, stated plainly and repeated on the page itself:
 *   - The DECISION LOGIC is production code. Nothing here is mocked, stubbed,
 *     or hand-written to produce a pleasing answer.
 *   - The INPUT ROWS are illustrative, not today's slate. Wiring live picks
 *     needs a Pick x Odds join whose behaviour cannot be verified in this
 *     environment, and shipping an unverified join on a public honesty surface
 *     is precisely the failure mode this page argues against.
 *
 * So: real gate, labelled inputs. The alternative — real-looking inputs and a
 * faked decision — is the one thing this page must never be.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";
import { evaluateBoardGate, type GateOutcome, type GateOutcomeCode } from "@/lib/board/gate-consumer";
import { buildCalibrationRows, buildCandidateRows, type RawPickRow } from "@/lib/board/gate-rows";

export const metadata: Metadata = {
  title: `How the gate decides · ${BRAND_NAME}`,
  description:
    "The selective gate, run live: which calls clear the bar, which are refused, and which we decline to judge at all because the evidence is not there yet.",
  alternates: { canonical: "/board/gate" },
};

// Runs the gate per request; never statically frozen.
export const dynamic = "force-dynamic";

/** Deterministic, seeded — the same illustration every load, no hidden RNG. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Illustrative rows. Two strata by design:
 *   nfl|SPREAD    — well past the calibration floor, so the gate genuinely
 *                   evaluates and genuinely declines some rows
 *   nba|MONEYLINE — deliberately thin, to show the state a pre-launch product
 *                   is actually in most of the time
 * Plus one row with no captured odds, which must NOT read as a refusal.
 */
function illustrativePicks(): { settled: RawPickRow[]; pending: RawPickRow[] } {
  const rand = seeded(20260724);
  const mk = (
    i: number,
    sport: string,
    pickType: RawPickRow["pickType"],
    result: RawPickRow["result"],
  ): RawPickRow => {
    const conf = 45 + Math.floor(rand() * 45);
    return {
      id: `${sport}-${pickType}-${result}-${i}`,
      selection: `Home Team ${i} -2.5`,
      confidence: conf,
      pickType,
      result,
      sportName: sport,
      homeTeamName: `Home Team ${i}`,
      awayTeamName: `Away Team ${i}`,
      homePrice: -110,
      awayPrice: -110,
    };
  };

  const settled: RawPickRow[] = [];
  for (let i = 0; i < 260; i++) {
    settled.push(mk(i, "nfl", "SPREAD", rand() < 0.52 ? "WIN" : "LOSS"));
  }
  // Under the floor on purpose.
  for (let i = 0; i < 18; i++) {
    settled.push(mk(i, "nba", "MONEYLINE", rand() < 0.5 ? "WIN" : "LOSS"));
  }
  // Excluded from calibration entirely — a push is not a loss.
  settled.push({ ...mk(900, "nfl", "SPREAD", "PUSH") });

  const pending: RawPickRow[] = [];
  for (let i = 0; i < 6; i++) pending.push(mk(500 + i, "nfl", "SPREAD", "PENDING"));
  for (let i = 0; i < 2; i++) pending.push(mk(600 + i, "nba", "MONEYLINE", "PENDING"));
  // No captured two-sided odds — must surface as "not evaluated", not a refusal.
  pending.push({ ...mk(700, "nfl", "SPREAD", "PENDING"), homePrice: null, awayPrice: null });

  return { settled, pending };
}

const TONE: Record<GateOutcomeCode, { label: string; cls: string }> = {
  FIRE: { label: "Fire", cls: "border-orbital-cyan text-orbital-cyan" },
  NO_BET_LCB: { label: "No bet", cls: "border-caution text-caution" },
  NO_BET_WIDTH: { label: "No bet · too uncertain", cls: "border-caution text-caution" },
  INSUFFICIENT_CALIBRATION: { label: "Not judged", cls: "border-mineral text-ion-2" },
  NOT_EVALUATED_MISSING_INPUTS: { label: "Not evaluated", cls: "border-mineral text-ion-2" },
};

function OutcomeRow({ o }: { o: GateOutcome }): JSX.Element {
  const tone = TONE[o.code];
  return (
    <div className="border border-mineral bg-eclipse/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-ion-3">{o.stratum}</span>
        <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${tone.cls}`}>
          {tone.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ion-1">{o.reason}</p>
      {o.code === "FIRE" && o.lcbEdge !== undefined && (
        <p className="mt-2 font-mono text-[11px] text-ion-3">
          lower-bound edge {o.lcbEdge.toFixed(4)}
          {o.width !== undefined ? ` · interval width ${o.width.toFixed(4)}` : ""}
        </p>
      )}
    </div>
  );
}

export default function GatePage(): JSX.Element {
  const { settled, pending } = illustrativePicks();

  const calibration = buildCalibrationRows(settled);
  const candidates = buildCandidateRows(pending);

  // The real consumer, the real gate.
  //
  // tau = 0 is the neutral baseline: fire when the calibrated lower bound
  // clears the de-vigged price AT ALL, with no additional margin. Deliberately
  // not tuned to make this page show a more flattering mix of outcomes — the
  // threshold is disclosed on the page so a reader can judge the bar for
  // themselves rather than take the outcomes on trust.
  const TAU = 0;
  const evaluation = evaluateBoardGate(
    calibration.rows,
    candidates.rows,
    TAU,
    {},
    candidates.excluded,
  );

  const counts = evaluation.outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.code] = (acc[o.code] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
        <header className="border-b border-mineral pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orbital-cyan">
            How the gate decides
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ion-white sm:text-4xl">
            Most of the time, the honest answer is no.
          </h1>
          <p className="mt-4 text-base leading-7 text-ion-1">
            Everything below was decided by the same code that governs the
            product&apos;s betting decisions, run when you loaded this page. The
            reasons are the gate&apos;s own — not copy written to sound careful.
          </p>
        </header>

        <section className="border border-caution/50 bg-eclipse/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-caution">
            What is real on this page
          </p>
          <p className="mt-2 text-sm leading-6 text-ion-1">
            <strong className="text-ion-white">The decision logic is production code.</strong>{" "}
            Nothing here is mocked or written to produce a pleasing answer.{" "}
            <strong className="text-ion-white">The input rows are illustrative</strong> — they
            are not today&apos;s slate. Feeding live picks in requires a data join
            whose behaviour we cannot verify yet, and shipping an unverified join
            on a page about honesty would be the exact failure this page argues
            against. Real gate, labelled inputs — never the reverse.
          </p>
          <p className="mt-3 font-mono text-[11px] text-ion-3">
            edge threshold τ = {TAU} · fire when the calibrated lower bound
            clears the de-vigged price at all, with no added margin
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
            What the gate returned
          </h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.keys(TONE) as GateOutcomeCode[])
              .filter((c) => counts[c])
              .map((c) => (
                <span key={c} className="rounded border border-mineral px-2 py-1 font-mono text-[11px] text-ion-2">
                  {TONE[c].label}: {counts[c]}
                </span>
              ))}
          </div>
          <div className="flex flex-col gap-3">
            {evaluation.outcomes.map((o) => (
              <OutcomeRow key={o.rowId} o={o} />
            ))}
          </div>
        </section>

        <section className="border-t border-mineral pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
            Three different kinds of no
          </h2>
          <ul className="flex flex-col gap-3 text-sm leading-6 text-ion-1">
            <li>
              <strong className="text-ion-white">No bet</strong> — we evaluated this against
              real settled history and the lower bound did not clear the price
              after vig. A judgement.
            </li>
            <li>
              <strong className="text-ion-white">Not judged</strong> — this category does not
              have enough settled history to calibrate against yet, so the model
              was never asked. Not a judgement, and we will not dress it up as
              one.
            </li>
            <li>
              <strong className="text-ion-white">Not evaluated</strong> — an input was
              missing, so nothing reached the model. Says nothing about the game.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-ion-2">
            Collapsing these into a single &quot;no bet&quot; would let us claim a
            considered judgement where the truth is an absence of evidence. For a
            product this young, the second and third are usually the honest
            answer, so they get their own names.
          </p>
        </section>

        <section className="border-t border-mineral pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
            What this page does not claim
          </h2>
          <ul className="flex flex-col gap-2 text-sm leading-6 text-ion-1">
            {[
              "No win rate, ROI, or edge is asserted anywhere on this page.",
              "The rows are illustrative inputs, not today's published picks.",
              "A fired decision here is a demonstration of the rule, not a recommendation.",
              "Nothing here is persisted to the ledger — no receipt is created by loading this page.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-3" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ion-2">
            The governance side of this —{" "}
            <Link href="/integrity" className="underline hover:text-orbital-cyan">
              how our agents are governed
            </Link>{" "}
            — is a separate claim about a separate subject.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
