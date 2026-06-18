import type { CommandCard } from "@/lib/cockpit/daily-command/types";
import { DecisionActions } from "./decision-actions";

const RISK_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-950/50 text-rose-300 border-rose-800/50",
  HIGH: "bg-amber-950/40 text-amber-300 border-amber-800/40",
  MEDIUM: "bg-yellow-950/30 text-yellow-300 border-yellow-900/40",
  LOW: "bg-white/[0.04] text-ink-400 border-white/[0.08]",
  NONE: "bg-white/[0.02] text-ink-500 border-white/[0.06]",
};

/**
 * CommandCard — one exception/signal/agent tile. Pure presentation; when the
 * card carries action buttons (Approval Queue only), it renders the client
 * DecisionActions control gated by the loader-computed `enabled` flags.
 */
export function CommandCardView({ card }: { card: CommandCard }): JSX.Element {
  const riskClass = RISK_STYLES[card.risk] ?? RISK_STYLES["NONE"]!;
  return (
    <article
      data-testid="command-card"
      className="rounded-xl border border-white/[0.06] bg-obsidian/50 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold leading-snug text-white">{card.title}</h4>
        <span
          className={["shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", riskClass].join(" ")}
        >
          {card.risk}
        </span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{card.whyItMatters}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-500">
        <span className="font-mono uppercase tracking-widest">{card.agentOwner}</span>
        {card.confidence !== null && (
          <span className="rounded bg-obsidian/70 px-1.5 py-0.5 font-mono text-ink-300">
            {card.confidence}% conf
          </span>
        )}
        {card.expectedImpact && <span>{card.expectedImpact}</span>}
      </div>

      {card.evidence.length > 0 && (
        <dl className="mt-2 grid grid-cols-1 gap-1 text-[10px] sm:grid-cols-2">
          {card.evidence.map((e) => (
            <div key={e.label} className="flex items-center justify-between gap-2 rounded bg-white/[0.02] px-2 py-1">
              <dt className="text-ink-500">{e.label}</dt>
              <dd className="truncate text-right font-mono text-ink-300">{e.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {card.taskId && card.actionButtons.length > 0 && (
        <DecisionActions taskId={card.taskId} actions={card.actionButtons} />
      )}
    </article>
  );
}
