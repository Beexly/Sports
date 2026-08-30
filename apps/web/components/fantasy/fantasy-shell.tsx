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

/**
 * Semantic accent names → design-token classes/vars (styles/design-tokens.css).
 * Pages pass a name ("ultraviolet" | "plasma" | "cyan"); a raw CSS color string
 * still works for legacy callers and resolves through the fallback branch.
 */
const ACCENTS: Record<string, { eyebrowClass: string; cssColor: string }> = {
  ultraviolet: { eyebrowClass: "text-ultraviolet", cssColor: "var(--ultraviolet)" },
  plasma: { eyebrowClass: "text-plasma", cssColor: "var(--plasma)" },
  cyan: { eyebrowClass: "text-orbital-cyan", cssColor: "var(--orbital-cyan)" },
};

export function FantasyShell({
  eyebrow, title, intro, accent = "ultraviolet", children, note, attribution, wide, projectionsBadge = true,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  /** Accent token name ("ultraviolet" | "plasma" | "cyan") or a raw CSS color (legacy). */
  accent?: string;
  children: ReactNode;
  note?: string;
  /** Source-attribution footer line (required on live-data surfaces by the rights registry). */
  attribution?: string;
  wide?: boolean;
  /** Show the honest live/illustrative projections status in the hero (default on). */
  projectionsBadge?: boolean;
}) {
  const known = ACCENTS[accent];
  const accentColor = known?.cssColor ?? accent;
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, color-mix(in srgb, ${accentColor} 10%, transparent), transparent 70%), radial-gradient(40% 60% at 74% 8%, color-mix(in srgb, var(--orbital-cyan) 6%, transparent), transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className={`eyebrow inline-flex items-center gap-2 ${known?.eyebrowClass ?? ""}`}
                style={known ? undefined : { color: accentColor }}
              >
                <span className="live-dot" />
                {eyebrow}
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-ion-white" style={{ fontSize: "clamp(2.25rem, 6vw, 4.25rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}>
                {title}
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">{intro}</p>
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
              <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ion-2">{note}</p>
            )}
            {attribution && (
              <p className="mt-2 max-w-3xl font-mono text-[11px] leading-relaxed text-ion-3">{attribution}</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
