import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { ConsensusEngine3DLazy } from "@/components/hero/consensus-engine-3d-lazy";
import { Ticker } from "@/components/ui/ticker";
import { CipherShard } from "@/components/cipher/cipher-shard";
import { CipherConsoleMount } from "@/components/cipher/cipher-console-mount";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { CLOSING_LINE } from "@/lib/brand";

// Customer copy pass: phrases that walked through internal method (referees,
// grading against the close, the sealed record) were dropped.
const TICKER_PHRASES = [
  "See the reasoning, not just the number",
  "Every pick carries its Analysis",
  "Wins and losses, all of them",
  "Silence when there's nothing honest to say",
  "We detect. You decide.",
] as const;

export const metadata: Metadata = {
  title: "Inside the Signal",
  description:
    "Every Galaxy Sports Edge pick ships with its Analysis: the reason it exists.",
  alternates: { canonical: "/intelligence" },
};

/**
 * /intelligence — dark, cinematic, kinetic, accessible.
 *
 * Customer copy pass (owner directive): customers are no longer walked through
 * internal method here. The convergence motif, the six-step reasoning chain,
 * the Signal Courtroom, the check room and the Decision Autopsy were removed;
 * the page keeps the hero, the ticker and the closing band. It never asserts a
 * performance number and uses no banned language.
 * The living hero is the brand's InteractiveGalaxy (reduced-motion-aware, aria-hidden);
 * a scrim guarantees text contrast; motion runs through <Reveal>; contrast is the
 * cyan/ultraviolet signal palette on obsidian (well above WCAG AA).
 */

/** Hero accents — canonical token hexes (styles/design-tokens.css). */
const ACCENT_CYAN = "#FF4D2E"; // --orbital-cyan
const ACCENT_UV = "#C9D4CE"; // --ultraviolet
const ACCENT_MAGENTA = "#FF4D2E"; // --plasma

export default function IntelligencePage() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero — the interactive engine itself, full-screen intro */}
        <section className="relative isolate min-h-screen overflow-hidden">
          <GeneratedPlate assetId="intelligence-deepsignal" className="-z-20 opacity-60" />
          <div className="absolute inset-0 z-0">
            <ConsensusEngine3DLazy />
          </div>
          {/* Local bottom scrim — readable headline without hiding the upper labels */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-3/5"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(5, 7, 11, 0.8) 65%, rgba(5, 7, 11, 1) 100%)",
            }}
          />
          <div className="pointer-events-none relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:px-8">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-orbital-cyan">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: "var(--orbital-cyan)",
                    boxShadow: "0 0 12px var(--orbital-cyan)",
                  }}
                />
                Inside the signal
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 max-w-4xl font-display text-balance text-ion-white"
                style={{ fontSize: "clamp(2.75rem, 7.2vw, 5.75rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
              >
                See the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>reasoning</span>,{" "}
                <span
                  style={{
                    backgroundImage: `linear-gradient(115deg, ${ACCENT_CYAN}, ${ACCENT_UV} 48%, ${ACCENT_MAGENTA})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  not just the number.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ion-1">
                Most products hand you a pick and ask for trust. Every pick here
                comes with its Analysis, the reason it exists, plus the line and
                how the market has moved. Every pick is graded after the game,
                win or loss, and stays in the public record.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="pointer-events-auto mt-9 flex flex-wrap gap-3">
                <Link href="/picks" className="btn btn-primary">
                  Today&apos;s picks →
                </Link>
                <Link href="/pricing" className="btn btn-ghost">
                  See pricing
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Kinetic ticker */}
        <Ticker items={TICKER_PHRASES} durationSec={42} />

        {/* Closing band */}
        <section className="px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-5xl rounded-2xl border border-titanium bg-gradient-to-b from-titanium/40 to-transparent p-10 text-center">
              <p className="eyebrow text-orbital-cyan">
                Every pick shows its reason
              </p>
              <p className="mx-auto mt-4 max-w-2xl font-display text-2xl text-ion-white sm:text-3xl">
                {CLOSING_LINE}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm text-ion-1">
                Our results stay hidden until there&apos;s enough settled, graded
                history to publish them honestly. When they show, they show as
                wins and losses, all of them.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/picks" className="btn btn-primary">
                  See today&apos;s picks
                </Link>
                <Link href="/responsible-play" className="btn btn-ghost">
                  Play responsibly
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
      {/* Glass Box Cipher — shard 01 hides here; console nudge */}
      <CipherShard page="intelligence" />
      <CipherConsoleMount />
    </div>
  );
}
