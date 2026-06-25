import type { DecisionCard } from "@sports/decision-field-runtime";
import type { RegimeProfile } from "@sports/decision-factory";
import { DecisionCardView } from "./decision-card";

/**
 * TodayFeed — the daily decision feed (server component). Applies a regime-driven attention budget
 * (cardSurfaceLimit) and shows a public "mood chip" describing how the day feels — never the internal
 * regime name. Renders preview/illustrative cards; live data is Phase 3.
 */

const MOOD: Readonly<Record<RegimeProfile["productRegime"], string>> = {
  CALM: "Calm day",
  DEVELOPING: "Busy board",
  SHOCK: "Shock watch",
  PRE_LOCK: "Near the close",
  SETTLEMENT: "Settling up",
  OFFSEASON: "Offseason",
};

export function TodayFeed({
  cards,
  regime,
  emptyNote = "Nothing needs your attention right now.",
}: {
  cards: readonly DecisionCard[];
  regime: RegimeProfile;
  emptyNote?: string;
}) {
  const shown = cards.slice(0, Math.max(1, regime.cardSurfaceLimit));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mineral bg-eclipse px-3 py-1 text-xs font-medium text-ion">
          <span className="live-dot" aria-hidden />
          {MOOD[regime.productRegime]}
        </span>
        <span className="text-xs text-ion-2">{shown.length} to look at · illustrative preview</span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-mineral bg-eclipse p-5 text-sm text-ion-2">{emptyNote}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((card) => (
            <DecisionCardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
