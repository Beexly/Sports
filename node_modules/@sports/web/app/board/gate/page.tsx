/**
 * /board/gate — the selective gate, decided live, in front of the reader.
 *
 * WHY THIS PAGE EXISTS. The product's central claim is that it refuses to bet
 * when it cannot justify betting. Until now that claim was only inspectable by
 * reading source. This page runs the REAL gate (`evaluateBoardGate` ->
 * `applySelectiveGate`) at request time and prints what it actually returned.
 *
 * TWO MODES, ALWAYS LABELLED. The decision logic is production code in both.
 * What differs is the INPUT:
 *   illustrative — a seeded demonstration set. The default, and what ships until
 *                  the join is proven against real staging rows.
 *   live         — today's published slate, read from the database. Requires
 *                  `LIVE_BOARD_GATE_SLATE=1` explicitly.
 *
 * The mode and the rows are computed together by `resolveGateSlate`, so the page
 * cannot label illustrative rows as live even by mistake — there is no code path
 * that derives them separately. Every claim on the page that depends on which
 * inputs were used is driven off that one `mode` value.
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
import { resolveGateSlate, type GateMode } from "@/lib/board/gate-page-mode";

export const metadata: Metadata = {
  title: `How the gate decides · ${BRAND_NAME}`,
  description:
    "The selective gate, run live: which calls clear the bar, which are refused, and which we decline to judge at all because the evidence is not there yet.",
  alternates: { canonical: "/board/gate" },
};

// Runs the gate per request; never statically frozen. Required in live mode —
// caching this page would publish a stale slate as the current one — and kept in
// illustrative mode so the two modes cannot differ in freshness behaviour.
export const dynamic = "force-dynamic";

const TONE: Record<GateOutcomeCode, { label: string; cls: string }> = {
  FIRE: { label: "Fire", cls: "border-orbital-cyan text-orbital-cyan" },
  NO_BET_LCB: { label: "No bet", cls: "border-caution text-caution" },
  NO_BET_WIDTH: { label: "No bet · too uncertain", cls: "border-caution text-caution" },
  INSUFFICIENT_CALIBRATION: { label: "Not judged", cls: "border-mineral text-ion-2" },
  NOT_EVALUATED_MISSING_INPUTS: { label: "Not evaluated", cls: "border-mineral text-ion-2" },
};

function OutcomeRow({ o, mode }: { o: GateOutcome; mode: GateMode }): JSX.Element {
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
          {/*
            The provenance of the number, attached to the number itself. On the
            illustrative set this is arithmetic on invented prices; saying so
            here rather than only in a footnote means the qualifier cannot be
            separated from the figure by a screenshot.
          */}
          {mode === "illustrative"
            ? " · on illustrative inputs"
            : " · from today's captured prices"}
        </p>
      )}
    </div>
  );
}

/** Copy that depends on which inputs were used, in one place, keyed off mode. */
function inputClaim(mode: GateMode): { badge: string; body: JSX.Element } {
  if (mode === "live") {
    return {
      badge: "Live slate",
      body: (
        <>
          <strong className="text-ion-white">The decision logic is production code</strong>{" "}
          and{" "}
          <strong className="text-ion-white">
            the input rows are today&apos;s published slate
          </strong>
          , read from the database when you loaded this page. Prices are the
          captured quotes for each pick&apos;s own market, de-vigged from both
          sides. Calibration comes only from settled picks whose provenance
          proves they were eligible to learn from — a pick without that proof is
          excluded rather than assumed good.
        </>
      ),
    };
  }
  return {
    badge: "Illustrative inputs",
    body: (
      <>
        <strong className="text-ion-white">The decision logic is production code.</strong>{" "}
        Nothing here is mocked or written to produce a pleasing answer.{" "}
        <strong className="text-ion-white">The input rows are illustrative</strong> — they
        are not today&apos;s slate. Feeding live picks in requires a data join
        whose behaviour we have not yet verified against real rows, and shipping
        an unverified join on a page about honesty would be the exact failure
        this page argues against. Real gate, labelled inputs — never the reverse.
      </>
    ),
  };
}

/** The non-claims. Some hold in both modes; two are mode-specific. */
function nonClaims(mode: GateMode): string[] {
  const shared = [
    "No win rate, ROI, or performance result is asserted anywhere on this page.",
    "A fired decision here is a demonstration of the rule, not a recommendation.",
    "Nothing here is persisted to the ledger — no receipt is created by loading this page.",
  ];
  if (mode === "live") {
    return [
      ...shared,
      "The lower-bound edge printed on a fired row is computed from settled history in that category. It is a lower bound under our own method, not a guarantee and not an independently audited figure.",
      "These rows are the current slate as of this request. A line can move the moment after you read it, so the price shown is the one we evaluated, not the one you would get.",
    ];
  }
  return [
    ...shared,
    "The lower-bound edge printed on a fired row is computed from the illustrative rows above. It is arithmetic on made-up inputs, not a measured edge in any real market.",
    "The rows are illustrative inputs, not today's published picks.",
  ];
}

export default async function GatePage(): Promise<JSX.Element> {
  // One call decides both the mode and the rows. See gate-page-mode.ts for why
  // they are not resolved separately.
  const source = await resolveGateSlate();
  const { mode } = source;

  // The real consumer, the real gate.
  //
  // tau = 0 is the neutral baseline: fire when the calibrated lower bound
  // clears the de-vigged price AT ALL, with no additional margin. Deliberately
  // not tuned to make this page show a more flattering mix of outcomes — the
  // threshold is disclosed on the page so a reader can judge the bar for
  // themselves rather than take the outcomes on trust.
  const TAU = 0;
  const evaluation = evaluateBoardGate(
    source.calibration.rows,
    source.candidates.rows,
    TAU,
    {},
    source.candidates.excluded,
  );

  const counts = evaluation.outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.code] = (acc[o.code] ?? 0) + 1;
    return acc;
  }, {});

  const claim = inputClaim(mode);

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
            Everything below was decided by the product&apos;s real selective-gate
            code, run when you loaded this page. The reasons are the gate&apos;s
            own — not copy written to sound careful. It does not yet decide the
            published board; those refusals still come from a separate stored
            path, and saying otherwise would overstate where this is wired.
          </p>
        </header>

        <section className="border border-caution/50 bg-eclipse/40 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-caution">
              What is real on this page
            </p>
            {/*
              The mode label. Deliberately not a subtle stylistic difference: a
              reader who takes nothing else from this page should still be able
              to tell at a glance whether the rows are real.
            */}
            <span
              data-testid="gate-mode-badge"
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                mode === "live"
                  ? "border-orbital-cyan text-orbital-cyan"
                  : "border-mineral text-ion-2"
              }`}
            >
              {claim.badge}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-ion-1">{claim.body}</p>
          <p className="mt-3 font-mono text-[11px] text-ion-3">
            edge threshold τ = {TAU} · fire when the calibrated lower bound
            clears the de-vigged price at all, with no added margin
          </p>
          {source.degradedReason && (
            // Shown, not swallowed. A page that quietly degrades from live to
            // illustrative and says nothing has told the reader a falsehood by
            // omission — they came here to check a claim about honesty.
            <p className="mt-3 text-sm leading-6 text-caution">{source.degradedReason}</p>
          )}
          {source.undescribable > 0 && (
            <p className="mt-3 text-sm leading-6 text-ion-2">
              {source.undescribable} row{source.undescribable === 1 ? "" : "s"} in
              the slate could not be described completely enough to judge, so
              they are not shown above or counted below. They are reported here
              rather than dropped silently.
            </p>
          )}
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
              <OutcomeRow key={o.rowId} o={o} mode={mode} />
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
            {nonClaims(mode).map((line) => (
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
