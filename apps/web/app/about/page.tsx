import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { InteractiveGalaxyLazy } from "@/components/hero/interactive-galaxy-lazy";
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description: `${BRAND_NAME} — ${BRAND_TAGLINE}. The story, the model, the operating principles.`,
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    eyebrow: "01",
    title: "Every pick traces to a real line.",
    body:
      "Live odds from dozens of sportsbooks, ingested on a 30-minute cadence. The model's view of a matchup is always reconcilable to the markets it was pulled from. No synthesized numbers. No back-tested narratives masquerading as live signal.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "If the work can't be shown, it doesn't ship.",
    body:
      "Each pick exposes its factor breakdown — consensus, market depth, line movement, intelligence layers, and the calibrated confidence the model assigned. You see the inputs. You decide what to do with them.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Perspective, not certainty.",
    body:
      "No certainty theater. No guarantees. A signal with a 64% calibrated confidence still loses 36 out of 100 times. Every public surface is designed around that reality — variance is described, not hidden.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Performance stats stay gated until they're honest.",
    body:
      "The public win-rate readout doesn't appear until enough settled picks exist to make it statistically meaningful. Until then, the Performance page says \"Collecting.\" Patience over noise — that's the standard.",
    accent: BRAND_COLORS.orbitalCyan,
  },
] as const;

const STATS = [
  { value: "30min", label: "odds ingestion cadence" },
  { value: "11", label: "scoring factors per pick" },
  { value: "v5.1", label: "current model version" },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />

      <main className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <InteractiveGalaxyLazy />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background: `linear-gradient(180deg, ${BRAND_COLORS.obsidianBlack}cc 0%, ${BRAND_COLORS.obsidianBlack}40 42%, ${BRAND_COLORS.obsidianBlack}80 72%, ${BRAND_COLORS.obsidianBlack} 100%)`,
            }}
          />
          <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Why this exists
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-4xl font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 6.5vw, 5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Built for people tired of paying for picks from services that{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  quietly delete the losses.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                {BRAND_NAME} exists because the sports picks industry runs on a
                quiet trick: tout services publish their wins, scrub their
                losses, and price their access against a record you can&apos;t
                verify. {BRAND_NAME} is the opposite — a system that shows its
                work on every pick and refuses to publish a win-rate it
                can&apos;t honestly back.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-300">
                {BRAND_NAME} ingests live odds across dozens of sportsbooks,
                scores every matchup for edge, and publishes a calibrated,
                fully-reasoned signal alongside every factor that drove it. The
                bar is simple: if it can&apos;t be explained, it doesn&apos;t
                get published.
              </p>
            </Reveal>
            <Reveal delay={330}>
              <p
                className="mt-7 font-mono text-sm font-semibold uppercase tracking-widest"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                — The {BRAND_NAME} team
              </p>
            </Reveal>

            {/* Stats strip */}
            <Stagger className="mt-10 flex flex-wrap gap-6" step={80}>
              {STATS.map((s) => (
                <div key={s.label}>
                  <p
                    className="font-display text-3xl font-bold"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">{s.label}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Operating principles */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Operating principles
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
              >
                The four rules we don&apos;t break.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={80}>
              {PRINCIPLES.map((p) => (
                <article
                  key={p.eyebrow}
                  className="surface-card group relative flex flex-col gap-3 overflow-hidden p-6 transition-shadow hover:shadow-[0_0_28px_rgba(0,0,0,0.5)]"
                  style={{ borderColor: `${p.accent}1f` }}
                >
                  {/* Accent top bar */}
                  <div
                    className="mb-1 h-0.5 w-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.accent}, transparent 70%)` }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-display text-3xl tabular-nums"
                    style={{ color: p.accent }}
                  >
                    {p.eyebrow}
                  </span>
                  <h3 className="font-display text-xl text-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-300">{p.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Contact */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                }}
              >
                <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  Contact
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)", lineHeight: 1.15 }}
                >
                  Every email gets read.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                  Press, partnerships, product feedback, or you just want to argue
                  about a line — write to{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-mono underline-offset-4 hover:underline"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  . Replies typically within one business day.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/methodology" className="btn btn-primary">
                    Read the methodology →
                  </Link>
                  <Link href="/contact" className="btn btn-ghost">
                    All inboxes
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
