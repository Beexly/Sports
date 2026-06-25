import type { DecisionCard } from "@sports/decision-field-runtime";
import { statusForState, strengthChip } from "@/lib/decision-ui/status";
import { toneClass, toneRowClass } from "@/lib/intelligence/colors";
import { DecisionDrawer } from "./decision-card-drawer";

/**
 * DecisionCardView — the public face of one decision (server component).
 *
 * Five questions, every time: what changed · what it means · what to do · why not · receipt. Renders on
 * a paper data surface so the paper-safe tone palette contrasts correctly. ALWAYS labeled
 * "Preview · illustrative" — never presented as a live pick. Blocked cards say so honestly.
 */

function ConfidenceLabel(label: DecisionCard["confidenceLabel"]): string {
  switch (label) {
    case "CLEAN":
      return "clean read";
    case "MIXED":
      return "mixed signals";
    case "THIN":
      return "thin evidence";
    case "BLOCKED":
      return "needs live data";
  }
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">{label}</dt>
      <dd className={`text-sm leading-5 ${valueClass ?? "text-ink"}`}>{value}</dd>
    </div>
  );
}

export function DecisionCardView({ card }: { card: DecisionCard }) {
  const state = statusForState(card.decisionState);
  const strength = strengthChip(card.maxPermittedStrength);
  const blocked = card.confidenceLabel === "BLOCKED" || card.maxPermittedStrength === "INFO_ONLY";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-paper-border bg-paper-raised p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border border-paper-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClass(strength.tone)} ${toneRowClass(strength.tone)}`}>
              {strength.label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-2">Preview · illustrative</span>
          </div>
          <h3 className="mt-2 truncate text-lg font-semibold text-ink">{card.title}</h3>
          <p className={`text-sm font-medium ${toneClass(state.tone)}`}>{state.label}</p>
        </div>
      </header>

      <dl className="flex flex-col gap-2.5">
        <Row label="What changed" value={card.whatChanged} />
        <Row label="What it means" value={card.whatItMeans} />
        <Row label="What to do" value={card.whatToDo} valueClass={`font-medium ${toneClass(strength.tone)}`} />
        <Row label="Why not" value={card.whyNot} />
      </dl>

      {blocked ? (
        <p className="rounded-md border border-paper-border bg-paper-sunken px-3 py-2 text-xs text-ink-2">
          Needs live data — shown as a preview only, never as a live pick.
        </p>
      ) : null}

      <footer className="flex items-center justify-between gap-3 border-t border-paper-border pt-3 text-xs text-ink-2">
        <span>
          {card.sourceCount} source{card.sourceCount === 1 ? "" : "s"} · {ConfidenceLabel(card.confidenceLabel)}
        </span>
        <DecisionDrawer card={card} />
      </footer>
    </article>
  );
}
