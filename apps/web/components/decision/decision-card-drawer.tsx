"use client";

import { useEffect, useRef, useState } from "react";
import type { DecisionCard } from "@sports/decision-field-runtime";

/**
 * DecisionDrawer — the receipt (client). Mirrors EvidenceAuditDrawer's right-anchored aside + backdrop +
 * Escape/focus. Receives the card's proofDrawer as a prop (fixture data — no fetch). "Why not" and the
 * source race are first-class sections. Always labeled illustrative.
 */

function lightConeLabel(status: DecisionCard["proofDrawer"]["lightConeStatus"]): string {
  switch (status) {
    case "INSIDE":
      return "Yes — every input was knowable before the decision.";
    case "PARTIAL":
      return "Partly — some inputs arrived after the decision and were excluded.";
    case "OUTSIDE":
      return "No — the key input wasn't knowable in time.";
    case "BLOCKED":
      return "Blocked — rights or timing prevent crediting it.";
  }
}

function Section({ title, body, highlight }: { title: string; body: string; highlight?: boolean }) {
  return (
    <section className={highlight ? "rounded-lg border border-ion-blue/30 bg-ion-blue/5 p-3" : ""}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ion-blue/80">{title}</p>
      <p className="mt-1 text-sm leading-5 text-ion">{body}</p>
    </section>
  );
}

export function DecisionDrawer({ card }: { card: DecisionCard }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const d = card.proofDrawer;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="font-semibold text-ion-blue hover:underline">
        See the receipt →
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`Receipt for ${card.title}`}>
          <button type="button" aria-label="Close receipt" className="flex-1 cursor-default bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-mineral bg-carbon p-6 animate-[slideInRight_180ms_ease-out]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ion-blue/80">Receipt · illustrative</p>
                <h4 className="mt-1 truncate text-lg font-semibold text-ion-white">{card.title}</h4>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close" className="shrink-0 text-ion-2 hover:text-ion-white">
                ✕
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <Section title="Why not the obvious move" body={d.whyNot} highlight />
              <Section title="Who saw it first" body={d.sourceRaceSummary} />
              <Section title="What the market did" body={d.whatTheMarketDid} />
              <Section title="What fantasy did" body={d.whatFantasyDid} />
              <Section title="What the crowd did" body={d.whatTheCrowdDid} />
              {d.redFlags.length > 0 ? (
                <section>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ion-blue/80">Red flags</p>
                  <ul className="mt-1 list-disc pl-5 text-sm leading-5 text-ion">
                    {d.redFlags.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <Section title="Data we used" body={d.requiredStatStatus} />
              <Section title="What would change our mind" body={d.whatWouldChangeOurMind} />
              <Section title="Knowable in time" body={lightConeLabel(d.lightConeStatus)} />
              <Section title="Rights" body={d.rightsStatus} />
              <Section title="Receipt" body={d.receiptRefs.join(", ")} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
