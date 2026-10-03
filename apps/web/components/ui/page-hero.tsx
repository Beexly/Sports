import type { ReactNode } from "react";

/**
 * Shared board/page hero: eyebrow + title + description, with an optional
 * actions slot (JSON link, cross-links) and an optional right "how to read it"
 * slot (typically a <MetricExplainer />).
 *
 * Server-safe (no client hooks). Works on both the dark cosmic marketing
 * surfaces and the light paper data surfaces via the `variant` prop. The
 * paper variant is the default for data boards and uses only AA ink tokens.
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

const VARIANTS: Record<
  HeroVariant,
  { wrap: string; eyebrow: string; title: string; desc: string }
> = {
  paper: {
    wrap: "border-paper-border",
    eyebrow: "text-orbital-cyan-on-light",
    title: "text-ink",
    desc: "text-ink-1",
  },
  dark: {
    wrap: "border-mineral",
    eyebrow: "text-orbital-cyan",
    title: "text-ion-white",
    desc: "text-ion-1",
  },
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
