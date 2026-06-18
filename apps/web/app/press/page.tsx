import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Press Kit — Quote-Ready Soundbites & Brand Facts`,
  description: `Press kit, ready-to-quote soundbites, and media availability for ${BRAND_NAME}. ${BRAND_TAGLINE}`,
  alternates: { canonical: "/press" },
};

const FACTS = [
  { label: "Tagline", value: BRAND_TAGLINE },
  { label: "Category", value: "Sports intelligence platform" },
  { label: "Coverage", value: "NFL · NBA · MLB · NHL · NCAAF · NCAAB · MLS" },
  { label: "Refresh cadence", value: "Live odds ingested every 30 minutes" },
  { label: "HQ", value: "United States" },
] as const;

const SOUNDBITES = [
  "Galaxy Sports Edge publishes a calibrated, fully-reasoned signal — not a tout.",
  "Outcomes are uncertain. Variance is described, not hidden.",
  "Every pick traces back to a real market line. No synthetic numbers.",
  "Performance stats stay gated until the data can honestly support them.",
] as const;

export default function PressPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem]"
            style={{
              background: `radial-gradient(50% 65% at 50% 0%, ${BRAND_COLORS.softUltraviolet}12, transparent 65%)`,
            }}
          />
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.softUltraviolet,
                  borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                  backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                }}
              >
                Press kit
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.2rem, 6vw, 4rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                The{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  numbers
                </span>
                ,{" "}
                the quotes, and the angle.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                Quick facts, media availability, and ready-to-quote soundbites
                for journalists, podcasters, and analysts covering the sports
                intelligence space.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Quick facts */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p
                className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Quick facts
              </p>
            </Reveal>
            <div
              className="overflow-hidden rounded-2xl border"
              style={{
                borderColor: `${BRAND_COLORS.orbitalCyan}18`,
                background: `${BRAND_COLORS.orbitalCyan}04`,
              }}
            >
              <Stagger className="contents" step={50}>
                {FACTS.map((f, i) => (
                  <div
                    key={f.label}
                    className="grid grid-cols-[140px_1fr] gap-4 px-5 py-3.5 sm:grid-cols-[200px_1fr]"
                    style={{ borderBottom: i < FACTS.length - 1 ? `1px solid rgba(255,255,255,0.06)` : undefined }}
                  >
                    <span
                      className="font-mono text-xs font-semibold uppercase tracking-[0.14em]"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
                    >
                      {f.label}
                    </span>
                    <span className="text-sm text-ink-200">{f.value}</span>
                  </div>
                ))}
              </Stagger>
            </div>
          </div>
        </section>

        {/* Soundbites */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p
                className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                Quote-ready soundbites
              </p>
            </Reveal>
            <Stagger className="flex flex-col gap-3" step={80}>
              {SOUNDBITES.map((q) => (
                <blockquote
                  key={q}
                  className="relative overflow-hidden rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}20`,
                    background: `linear-gradient(135deg, ${BRAND_COLORS.ionMagenta}05 0%, rgba(18,14,36,0.8) 100%)`,
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-0.5 rounded-r"
                    style={{ background: `linear-gradient(180deg, ${BRAND_COLORS.ionMagenta}, transparent 80%)` }}
                    aria-hidden="true"
                  />
                  <p className="pl-2 text-base leading-7 text-ink-100">
                    &ldquo;{q}&rdquo;
                  </p>
                </blockquote>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Media contact */}
        <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Media inquiries
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.1 }}
                >
                  Direct line to the desk.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                  For interviews, embargoed coverage, or a deeper walkthrough of
                  the model, write to{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-mono underline-offset-4 hover:underline"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  . Include outlet, deadline, and angle for a useful reply.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/methodology" className="btn btn-primary">
                    Methodology →
                  </Link>
                  <Link href="/about" className="btn btn-ghost">
                    About {BRAND_NAME}
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
