import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";

/**
 * RevenueHero — the shared hero shell every revenue page reuses.
 *
 * The homepage hero (`app/page.tsx`) and `/intelligence` set the premium bar:
 * a `gw-nebula-deep` atmosphere section, a radial-glow backdrop, a filled
 * identity chip, a chrome + editorial-serif `text-display-xl` headline, a lede,
 * and a CTA/anchor slot. The twelve revenue pages were flat Tailwind cards with
 * none of that grammar. This component is the single coherence point: pass the
 * headline as a ReactNode (so the caller supplies the chrome/serif spans), the
 * lede, and any CTA/price-anchor content in `children`.
 *
 * Server-renderable. Reveal-staggered, and the gw-* atmosphere classes are
 * already reduced-motion safe (see globals.css §reduced-motion).
 */
export function RevenueHero({
  chip,
  chipTone = "cyan",
  headline,
  lede,
  children,
}: {
  /** Filled identity chip text, e.g. "Founding Desk · Early Access". */
  chip: string;
  /** Which filled chip to use. Defaults to cyan. */
  chipTone?: "cyan" | "plasma";
  /** The h1 content — caller passes the chrome + serif spans. */
  headline: ReactNode;
  /** Sub-headline / positioning copy. */
  lede: ReactNode;
  /** CTA row, price-lock anchor, or any above-the-fold slot. */
  children?: ReactNode;
}): JSX.Element {
  const chipClass = chipTone === "plasma" ? "gw-chip-plasma" : "gw-chip-cyan";

  return (
    <section className="gw-nebula-deep relative isolate overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      {/* Radial-glow backdrop — same composition as the homepage hero, kept
          behind the content so the copy column reads at AA contrast. */}
      <div aria-hidden="true" className="gw-starfield -z-10 opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[78vh]"
        style={{
          background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.softUltraviolet}26, transparent 70%), radial-gradient(40% 50% at 78% 6%, ${BRAND_COLORS.ionMagenta}14, transparent 70%), radial-gradient(45% 55% at 12% 30%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-5xl">
        <Reveal>
          <span className={chipClass}>{chip}</span>
        </Reveal>

        <Reveal delay={90}>
          <h1 className="mt-6 max-w-4xl font-display text-display-xl font-semibold leading-[1.0] text-balance text-white">
            {headline}
          </h1>
        </Reveal>

        <Reveal delay={170}>
          <div className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
            {lede}
          </div>
        </Reveal>

        {children ? <Reveal delay={260}>{children}</Reveal> : null}
      </div>
    </section>
  );
}
