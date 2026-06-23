import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { ProjectionsBadge } from "@/components/integrations/projections-badge";
import { SubscribeButton } from "@/components/pricing/subscribe-button";
import { getCurrentPricingPhase, GRANDFATHER_GUARANTEE } from "@/lib/pricing/pricing-phases";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Founding Launch — Galaxy Fantasy",
  description:
    "Draft season is now. The Draft Assistant and Best Ball board run on real, cleared nflverse-graded data — roster ceiling, QB stacks, and bye structure, with the reasoning. Founding members lock the lowest rate we'll ever offer, for life.",
  alternates: { canonical: "/launch" },
};

const phase = getCurrentPricingPhase();

const REAL_NOW = [
  "Draft Assistant — VOR, tiers, positional scarcity, run alerts, and your-own-ADP overlay",
  "Best Ball — roster ceiling/spike, QB-stack correlation, bye fragility, and what to draft next",
  "Read-only league sync (Sleeper) — bring your real roster; no writes, no autonomous moves",
] as const;

const PREVIEW = [
  "Start-Sit, Waivers/FAAB, and Trade need forward weekly projections — we're building our own, and will publish it with its own calibration before it goes live",
  "Anything labelled illustrative stays clearly labelled — it is never shown as live, and we never fabricate ADP",
] as const;

export default function LaunchPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-12 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}1f, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" /> Founding launch · Draft season is now
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.25rem, 6vw, 4.25rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}>
                Draft season is here. Get the edge — <span className="gse-editorial" style={{ fontSize: "1.06em" }}>honestly</span>.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                The Draft Assistant and the new Best Ball board run on real, cleared nflverse-graded
                data — roster ceiling, QB stacks, and bye structure, with the reasoning behind every
                call. Founding members keep the lowest rate we&apos;ll ever offer, for life.
              </p>
            </Reveal>
            <Reveal delay={230}>
              <div className="mt-6"><ProjectionsBadge /></div>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="w-full sm:w-auto">
                  <SubscribeButton tier="FANTASY" label={`Claim founding — $${phase.fantasy.annual}/yr`} variant="primary" interval="year" />
                </div>
                <Link href="/fantasy/bestball" className="btn btn-ghost">Try the Best Ball board →</Link>
                <Link href="/pricing" className="text-sm font-semibold" style={{ color: BRAND_COLORS.orbitalCyan }}>See all plans</Link>
              </div>
            </Reveal>
            <Reveal delay={360}>
              <p className="mt-4 text-xs text-ink-500">
                {`${GRANDFATHER_GUARANTEE} · $${phase.fantasy.monthly}/mo or $${phase.fantasy.annual}/yr · cancel any time.`}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Real vs preview — doctrine-critical honesty */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 className="font-display text-2xl font-semibold text-white">What&apos;s real today — and what&apos;s still preview</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-400">
                We never present illustrative data as live. Here is exactly where the line is.
              </p>
            </Reveal>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="surface-card p-5" style={{ boxShadow: `inset 0 0 0 1px ${BRAND_COLORS.orbitalCyan}33` }}>
                <p className="text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.orbitalCyan }}>Real now</p>
                <ul className="mt-3 space-y-2">
                  {REAL_NOW.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-ink-200">
                      <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>✓</span><span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface-card p-5" style={{ boxShadow: "inset 0 0 0 1px #E0A80033" }}>
                <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "#E0A800" }}>Preview / coming</p>
                <ul className="mt-3 space-y-2">
                  {PREVIEW.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-ink-300">
                      <span aria-hidden style={{ color: "#E0A800" }}>○</span><span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 text-xs text-ink-500">
              Why we lead with this: a tool on fabricated data isn&apos;t worth paying for. Everything you
              pay for here is real, cleared, and attributed — see the <Link href="/integrations" className="underline" style={{ color: BRAND_COLORS.softUltraviolet }}>data status</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
