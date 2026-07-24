import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

/**
 * /fantasy/contests — THE CONTEST BAY, sealed.
 *
 * Cinematic under-construction door. The previous version enumerated the
 * full contest roadmap (formats, operator names, gating posture) before
 * launch — that brief is classified now. This page says exactly one thing,
 * beautifully: something competitive is being built behind this door.
 *
 * No vendor names, no compliance posture, no internal status leaks.
 * CSS-only motion (reuses the gse keyframes); reduced motion renders calm.
 */

export const metadata: Metadata = {
  title: "Contests · Galaxy Sports Edge",
  description: "The Contest Bay is under construction. Something competitive is coming.",
  alternates: { canonical: "/fantasy/contests" },
};

// Design tokens (styles/design-tokens.css) — never raw hexes on this surface.
const cyan = "var(--orbital-cyan)";
const uv = "var(--ultraviolet)";
const white = "var(--ion-white)";
/** Token at an alpha stop, srgb — replaces the old hex+alpha concatenation. */
const mix = (token: string, pct: number) => `color-mix(in srgb, ${token} ${pct}%, transparent)`;

/** Deterministic sparks drifting around the bay door (golden-angle spray). */
const SPARKS: readonly { left: number; top: number; size: number; delay: number; hue: string }[] =
  Array.from({ length: 26 }, (_, i) => ({
    left: ((i * 137.508) % 100 + 100) % 100,
    top: ((i * 61.803) % 100 + 100) % 100,
    size: i % 6 === 0 ? 2 : 1,
    delay: -((i * 0.53) % 7),
    hue: i % 7 === 0 ? cyan : i % 11 === 0 ? uv : white,
  }));

export default function ContestBaySealedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      <main id="main-content" className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-28 text-center">
        {/* atmosphere */}
        <div aria-hidden className="gse-vignette" />
        <div aria-hidden className="gse-grain" />
        <div
          aria-hidden
          className="gse-cine-anim pointer-events-none absolute -left-1/4 top-[-20%] h-[70vh] w-[70vw] rounded-full"
          style={{
            animation: "gse-nebula-drift 16s ease-in-out infinite alternate",
            background: `radial-gradient(closest-side, ${mix(uv, 15)}, transparent 72%)`,
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="gse-cine-anim absolute rounded-full"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                background: s.hue,
                opacity: 0.45,
                animation: "gse-star-breathe 7s ease-in-out infinite",
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}
        </div>

        {/* the sealed bay door */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-full"
            style={{ border: `1px solid ${mix(uv, 25)}`, boxShadow: `0 0 60px ${mix(uv, 13)}, inset 0 0 40px ${mix(uv, 8)}` }}
          >
            <div
              aria-hidden
              className="gse-cine-anim absolute inset-3 rounded-full"
              style={{
                border: `1px dashed ${mix(cyan, 27)}`,
                animation: "gw-rotate 26s linear infinite",
              }}
            />
            <div
              aria-hidden
              className="gse-cine-anim absolute inset-3 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent 0 70%, ${mix(cyan, 19)} 82%, transparent 94%)`,
                animation: "gw-rotate 13s linear infinite reverse",
              }}
            />
            <span className="font-arch text-5xl" style={{ color: white }}>
              ⬡
            </span>
          </div>

          <p className="eyebrow mt-10 justify-center text-orbital-cyan">
            contest bay · sector sealed
          </p>
          <h1
            className="mt-4 max-w-2xl font-display text-balance text-ion-white"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)", lineHeight: 1.05 }}
          >
            Something competitive is being{" "}
            <span className="gse-editorial" style={{ fontSize: "1.08em" }}>
              built
            </span>{" "}
            behind this door.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-ion-1">
            The Contest Bay is under construction. The brief stays classified until launch.
            When this door opens, it opens with receipts.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
            <Link href="/board" className="btn btn-primary">
              Today&apos;s board
            </Link>
            <Link
              href="/fantasy"
              className="text-ion-1 underline-offset-4 transition-colors hover:text-ion-white hover:underline"
            >
              Fantasy Galaxy
            </Link>
            <Link
              href="/academy"
              className="text-ion-1 underline-offset-4 transition-colors hover:text-ion-white hover:underline"
            >
              Train in the Academy
            </Link>
          </div>

          <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.3em] text-ion-2">
            {"// no countdown · no leaks · worth the wait"}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
