import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { InteractiveGalaxyLazy } from "@/components/hero/interactive-galaxy-lazy";
import { SURFACES, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Vault — Every Published Pick, Reasoning Attached",
  description:
    "The published-pick archive opens once enough canonical results have settled. Methodology and gates are live now. No curated highlights, no scrubbed losses.",
  alternates: { canonical: "/vault" },
};

export default function VaultPage() {
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
          <div className="mx-auto flex min-h-[65vh] max-w-5xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.softUltraviolet,
                  borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                  backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                }}
              >
                {SURFACES.vault.label}
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
                Every pick. Every reason.{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Every outcome.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-300">
                {SURFACES.vault.blurb} It is the receipt: every published pick,
                the factor trail behind it, and the final result when the game is
                settled.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Status section */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div
                className="overflow-hidden rounded-2xl border p-7"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}28`,
                  background: `linear-gradient(135deg, rgba(122,92,255,0.06) 0%, rgba(18,14,36,0.9) 100%)`,
                }}
              >
                {/* Accent top bar */}
                <div
                  className="mb-5 h-0.5 w-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}, transparent 70%)` }}
                  aria-hidden="true"
                />
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full animate-live-pulse"
                    style={{ backgroundColor: BRAND_COLORS.ionMagenta }}
                  />
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    Status: Collecting
                  </p>
                </div>
                <h2 className="text-xl font-bold text-white">
                  The Vault opens with an honest record.
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-300">
                  The Vault opens once enough canonical picks have settled to
                  render a calibrated record. No Vault gets published on a
                  handful of games — selective history is exactly what this
                  product is built to avoid.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/methodology" className="btn btn-primary">
                    How the calibration works
                  </Link>
                  <Link href="/performance" className="btn btn-ghost">
                    See the gate
                  </Link>
                </div>
              </div>
            </Reveal>

            {/* What the vault will contain */}
            <Reveal delay={100}>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: "◆", label: "Full factor trail", desc: "Every scoring factor and its weight at the moment the pick was generated." },
                  { icon: "◈", label: "Settled outcomes", desc: "Win, loss, push — with the closing line value grade attached." },
                  { icon: "◇", label: "No cherry-picking", desc: "Every canonical pick included. Bootstrap era labelled and excluded from stats." },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border p-4"
                    style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <span
                      className="text-lg"
                      style={{ color: `${BRAND_COLORS.softUltraviolet}80` }}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
