import type { ReactNode } from "react";

/**
 * Shared board/page hero: eyebrow + title + description, with an optional
 * actions slot (JSON link, cross-links) and an optional right "how to read it"
 * slot (typically a <MetricExplainer />).
 *
 * Server-safe (no client hooks). Renders on the unified dark canvas for both
 * the cosmic marketing surfaces and the data boards. The `paper` variant is a
 * legacy alias kept for API compatibility — it resolves to the dark styling so
 * data heroes match the rest of the site and nothing flips light. All text is
 * AA on dark (ion-white / ion-1) with the brand orbital cyan eyebrow.
 */

export type HeroVariant = "paper" | "dark";

export interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons / links row (e.g. JSON export, cross-links). */
  actions?: ReactNode;
  /** Right column — typically a MetricExplainer "how to read it" card. */
  aside?: ReactNode;
  variant?: HeroVariant;
  className?: string;
}

const DARK_VARIANT = {
  wrap: "border-surface-line",
  eyebrow: "text-orbital-cyan",
  title: "text-ion-white",
  desc: "text-ion-1",
} as const;

const VARIANTS: Record<
  HeroVariant,
  { wrap: string; eyebrow: string; title: string; desc: string }
> = {
  // `paper` is a legacy alias → dark so data heroes match the unified canvas.
  paper: DARK_VARIANT,
  dark: DARK_VARIANT,
};

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  variant = "paper",
  className = "",
}: PageHeroProps): JSX.Element {
  const v = VARIANTS[variant];
  const twoCol = Boolean(aside);

  return (
    <section
      className={`grid gap-8 border-b pb-8 ${v.wrap} ${
        twoCol ? "lg:grid-cols-[0.95fr_1.05fr] lg:items-end" : ""
      } ${className}`}
    >
      <div>
        <p
          className={`font-mono text-xs font-semibold uppercase tracking-[0.18em] ${v.eyebrow}`}
        >
          {eyebrow}
        </p>
        <h1
          className={`mt-2 max-w-4xl font-display text-3xl font-semibold leading-[1.05] sm:text-5xl ${v.title}`}
        >
          {title}
        </h1>
        {description ? (
          <div className={`mt-5 max-w-2xl text-base leading-7 ${v.desc}`}>{description}</div>
        ) : null}
        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
