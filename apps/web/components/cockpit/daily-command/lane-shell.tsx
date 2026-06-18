import type { CommandLane, DataMode } from "@/lib/cockpit/daily-command/types";
import { CommandCardView } from "./command-card";

const MODE_BADGE: Record<DataMode, { label: string; cls: string }> = {
  live: { label: "LIVE", cls: "border-accent-800/50 bg-accent-950/30 text-accent-300" },
  labeled_fallback: { label: "FALLBACK", cls: "border-amber-800/40 bg-amber-950/30 text-amber-300" },
  unavailable: { label: "NOT WIRED", cls: "border-white/[0.10] bg-white/[0.04] text-ink-400" },
};

/**
 * LaneShell — the consistent wrapper every lane reuses: title, honesty badge,
 * fallback reason, and the card stack. Keeping the chrome here means a lane's
 * own component only decides extra content (e.g. the Signals gauges).
 */
export function LaneShell({
  lane,
  children,
}: {
  lane: CommandLane;
  children?: React.ReactNode;
}): JSX.Element {
  const badge = MODE_BADGE[lane.dataMode];
  return (
    <section
      data-testid={`lane-${lane.key}`}
      data-datamode={lane.dataMode}
      className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-300">{lane.title}</h3>
          <p className="mt-0.5 text-[10px] text-ink-500">{lane.subtitle}</p>
        </div>
        <span
          className={["shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", badge.cls].join(" ")}
        >
          {badge.label}
        </span>
      </header>

      {lane.fallbackReason && (
        <p className="mb-3 rounded-lg border border-amber-900/30 bg-amber-950/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-amber-200/90">
          {lane.fallbackReason}
        </p>
      )}

      {children}

      <div className="flex flex-col gap-2">
        {lane.cards.length === 0 ? (
          <p className="rounded-lg border border-white/[0.06] bg-obsidian/40 px-3 py-4 text-center text-[11px] text-ink-500">
            Nothing here right now.
          </p>
        ) : (
          lane.cards.map((card) => <CommandCardView key={card.id} card={card} />)
        )}
      </div>
    </section>
  );
}
