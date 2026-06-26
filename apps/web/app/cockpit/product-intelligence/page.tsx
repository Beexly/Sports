import type { Metadata } from "next";
import { getProductIntelligence } from "@/lib/cockpit/product-intelligence";

/**
 * Cockpit · Product Intelligence (owner-only, fixtures).
 *
 * The operator's window into the organism reasoning about itself: the FDR-disciplined Conscience
 * (which intelligences are trending up — validated only on a live sample), the acquisition signal (buy / stop
 * buying), and scar utility (what a settled card taught — or didn't). Gated by the cockpit layout's
 * ADMIN check; not public, not indexable. Internal engine names are allowed on this surface.
 */

export const metadata: Metadata = {
  title: "Product Intelligence · Cockpit",
  robots: { index: false, follow: false, nocache: true },
};

const PANEL = "rounded-2xl border border-titanium/40 bg-obsidian/40 p-5";
const LABEL = "font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ion-3";

export default function ProductIntelligencePage() {
  const { ledger, atlas, scar } = getProductIntelligence();
  const ledgers = Object.values(ledger.ledgers);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className={LABEL}>Cockpit · Self-audit</p>
        <h1 className="text-2xl font-bold text-ion-white">Product Intelligence</h1>
        <p className="max-w-2xl text-sm text-ion-2">
          The organism reasoning about itself — over fixtures, never live. The Conscience reports only
          improvements that survive multiple-testing discipline; the Galileo-Week atlas prices what to
          buy and what to stop buying; scar memory keeps what fooled us.
        </p>
        <p className="text-xs text-ion-3">Illustrative — built from deterministic fixtures, no live data, no spend.</p>
      </header>

      {/* Conscience — the FDR-disciplined intelligence ledger */}
      <section className={PANEL} aria-label="Intelligence ledger">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ion-white">Conscience · Intelligence Ledger</h2>
          <span className={LABEL}>
            {ledger.upwardTrendCount}/{ledgers.length} trending up · {ledger.validated ? `${ledger.improvingCount} validated` : "UNVALIDATED (fixture)"}
          </span>
        </div>
        <p className="mt-1 text-xs text-ion-3">
          Newey–West trend test per intelligence, FDR-corrected, with an effect-size floor and a
          confirmation window. On fixture data nothing is &ldquo;validated&rdquo; — these are illustrative
          upward trends, not a proven &ldquo;we got smarter&rdquo; claim.
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-titanium/20">
          {ledgers.map((l) => (
            <li key={l.ledger} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-ion-1">{l.ledger}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-ion-2">Δ {l.meanDelta.toFixed(3)}</span>
                <span className="font-mono text-xs text-ion-3">q={l.qValue.toFixed(3)}</span>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                    l.status === "VALIDATED_IMPROVING"
                      ? "bg-orbital-cyan/10 text-orbital-cyan"
                      : l.trendDirection === "UP"
                        ? "bg-amber-900/30 text-amber-300"
                        : "bg-titanium/20 text-ion-3"
                  }`}
                >
                  {l.status === "VALIDATED_IMPROVING" ? "validated" : l.trendDirection === "UP" ? "fixture trend" : "flat"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Acquisition signal — Galileo-Week demand & supply */}
      <section className={PANEL} aria-label="Acquisition signal">
        <h2 className="text-lg font-semibold text-ion-white">Acquisition signal · Galileo Week (preview)</h2>
        <p className="mt-1 text-xs text-ion-3">{atlas.publicMoment}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-titanium/30 bg-obsidian/30 p-4">
            <p className={LABEL}>Missed observation · what to buy</p>
            {atlas.missedObservation.toBuy.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ion-1">
                {atlas.missedObservation.toBuy.map((s) => (
                  <li key={s}>+ {s}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ion-3">Nothing flagged to buy this week.</p>
            )}
          </div>
          <div className="rounded-lg border border-titanium/30 bg-obsidian/30 p-4">
            <p className={LABEL}>Over observation · what to stop buying</p>
            {atlas.overObservation.toStopBuying.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ion-1">
                {atlas.overObservation.toStopBuying.map((s) => (
                  <li key={s}>− {s}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ion-3">No noisy sources to cut this week.</p>
            )}
          </div>
        </div>
      </section>

      {/* Scar utility — process over outcome */}
      <section className={PANEL} aria-label="Scar utility">
        <h2 className="text-lg font-semibold text-ion-white">Scar utility · process over outcome</h2>
        <p className="mt-1 text-xs text-ion-3">
          A loss only teaches when the process was unsound. We keep those as ghosts that suppress their
          twin next time; sound calls that lose to variance change nothing.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {scar.map((s) => (
            <div key={s.subject} className="rounded-lg border border-titanium/30 bg-obsidian/30 p-4">
              <p className={LABEL}>{s.label}</p>
              <h3 className="mt-1 text-sm font-semibold text-ion-white">{s.subject}</h3>
              <p className="mt-1 text-xs text-ion-2">{s.verdict.replace(/_/g, " ")}</p>
              <span
                className={`mt-2 inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${
                  s.emitsLesson ? "bg-orbital-cyan/10 text-orbital-cyan" : "bg-titanium/20 text-ion-3"
                }`}
              >
                {s.emitsLesson ? `lesson logged · ${s.loopAction.toLowerCase()}` : "no lesson · process held"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
