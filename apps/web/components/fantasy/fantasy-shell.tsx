/**
 * FantasyShell — the shared cinematic wrapper for every Galaxy Fantasy tool page.
 * Nav + Atmosphere + a branded hero + the tool + an illustrative-data note + Footer.
 */

import type { ReactNode } from "react";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { ProjectionsBadge } from "@/components/integrations/projections-badge";
import { BRAND_COLORS } from "@/lib/brand";

export function FantasyShell({
  eyebrow, title, intro, accent = BRAND_COLORS.softUltraviolet, children, note, wide, projectionsBadge = true,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  accent?: string;
  children: ReactNode;
  note?: string;
  wide?: boolean;
  /** Show the honest live/illustrative projections status in the hero (default on). */
  projectionsBadge?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${accent}1a, transparent 70%), radial-gradient(40% 60% at 74% 8%, ${BRAND_COLORS.orbitalCyan}10, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: accent }}>
                <span className="live-dot" />
                {eyebrow}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.25rem, 6vw, 4.25rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}>
                {title}
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">{intro}</p>
            </Reveal>
            {projectionsBadge && (
              <Reveal delay={230}>
                <div className="mt-6">
                  <ProjectionsBadge />
                </div>
              </Reveal>
            )}
          </div>
        </section>

        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className={wide ? "mx-auto max-w-6xl" : "mx-auto max-w-5xl"}>
            <Reveal>{children}</Reveal>
            {note && (
              <p className="mt-8 text-xs leading-relaxed text-ink-500">{note}</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
