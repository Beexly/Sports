/**
 * RiskDisclosure
 *
 * Single source of truth for the "betting carries risk" + "past
 * performance does not guarantee future results" copy.
 *
 * Variants:
 *   - "inline"  — one short paragraph
 *   - "compact" — even smaller, footer-style
 *   - "card"    — bordered block with heading
 */

export interface RiskDisclosureProps {
  variant?: "inline" | "compact" | "card";
  /** Append the canonical past-performance line. */
  includePastPerformance?: boolean;
  /** Optional override class. Applied to the outer element. */
  className?: string;
}

const BODY =
  "Sports wagering is real risk. Only stake what you can afford to lose " +
  "without changing your week. If you or someone you know has a gambling " +
  "problem, call 1-800-GAMBLER.";

const PAST = " Past performance does not guarantee future results.";

export function RiskDisclosure({
  variant = "inline",
  includePastPerformance = false,
  className,
}: RiskDisclosureProps) {
  const text = `${BODY}${includePastPerformance ? PAST : ""}`;

  if (variant === "card") {
    return (
      <div
        data-testid="risk-disclosure"
        className={[
          "surface-card p-4 text-xs text-ion-1",
          className ?? "",
        ].join(" ")}
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-1">
          Risk disclosure
        </p>
        <p className="mt-2 leading-relaxed">{text}</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <p
        data-testid="risk-disclosure"
        className={[
          "text-[10px] leading-relaxed text-ion-1",
          className ?? "",
        ].join(" ")}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      data-testid="risk-disclosure"
      className={[
        "text-[11px] leading-relaxed text-ion-1",
        className ?? "",
      ].join(" ")}
    >
      {text}
    </p>
  );
}
