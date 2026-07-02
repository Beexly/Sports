import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { CipherTerminal } from "@/components/cipher/cipher-terminal";
import { getCipherStatus, toChapterView } from "@/lib/cipher/cipher";
import { Atmosphere } from "@/components/ui/atmosphere";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Glass Box Cipher: A Weekly Hunt",
  description:
    "A weekly hidden puzzle inside Galaxy Sports Edge. Find the shards scattered across the site, assemble the key, and win a free week of Elite. Open Mon 11:59am-Thu 6:59pm ET.",
  alternates: { canonical: "/cipher" },
};

const RULES = [
  {
    n: "01",
    title: "The window",
    body: "Each chapter is live only Monday 11:59am → Thursday 6:59pm ET, the quiet stretch between slates. Sealed the rest of the week.",
  },
  {
    n: "02",
    title: "The shards",
    body: "Every chapter scatters short tokens across different rooms of the site. They exist only on the live site this week. No bot can hand them to you. You have to look.",
  },
  {
    n: "03",
    title: "The key",
    body: "Recover each shard, assemble them in order (lowercase, no spaces), and submit. One correct key wins a free week of Elite, first solve per visitor.",
  },
];

export default function CipherPage() {
  const status = getCipherStatus();
  const view = toChapterView(status.chapter);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{
              background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}22, transparent 70%), radial-gradient(40% 60% at 75% 10%, ${BRAND_COLORS.orbitalCyan}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl text-center">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" />
                A weekly hunt inside the glass box
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                The Glass Box{" "}
                <span
                  className="gse-editorial"
                  style={{
                    fontSize: "1.1em",
                    backgroundImage: `linear-gradient(115deg, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet} 50%, ${BRAND_COLORS.ionMagenta})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Cipher
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-300">
                Every week the engine hides a secret in plain sight. Read deeper than
                everyone else, assemble the key, and a week of Elite is yours. No luck,
                just attention.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Transmission + terminal */}
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            {/* Transmission log */}
            <Reveal>
              <div
                className="surface-card h-full p-6 font-mono text-sm"
                style={{ borderColor: `${BRAND_COLORS.steelGray}` }}
              >
                <p className="mb-4 text-xs uppercase tracking-widest text-ink-500">
                  {"// incoming transmission"}
                </p>
                <div className="space-y-3">
                  {view.transmission.map((line, i) => (
                    <p
                      key={i}
                      className="leading-relaxed"
                      style={{ color: i === 0 ? BRAND_COLORS.orbitalCyan : "var(--ion-1)" }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Interactive terminal */}
            <Reveal delay={120}>
              <CipherTerminal view={view} state={status.state} boundaryISO={status.boundaryISO} />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-labelledby="rules-heading">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <h2 id="rules-heading" className="font-display text-2xl text-white sm:text-3xl">
                How the hunt works
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {RULES.map((r) => (
                <Reveal key={r.n} delay={80}>
                  <div className="surface-card h-full p-6">
                    <span
                      aria-hidden="true"
                      className="font-display text-3xl tabular-nums"
                      style={{ color: BRAND_COLORS.softUltraviolet, textShadow: `0 0 22px ${BRAND_COLORS.softUltraviolet}55` }}
                    >
                      {r.n}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-white">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">{r.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ink-500">
                Rewards are issued as single-use codes or claim references and fulfilled by our
                team, never automatically charged or granted. One reward per visitor per chapter.
                This is a skill puzzle, not a game of chance; no purchase is required to play.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
