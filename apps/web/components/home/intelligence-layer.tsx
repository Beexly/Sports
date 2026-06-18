/**
 * IntelligenceLayer — the homepage's front door to the whole decision-OS.
 *
 * Most picks sites are one page. This section frames GSE as an operating system
 * for the decision and routes visitors into every surface that makes it one:
 * the glass-box engine, the spatial slate twin, the parlay surgeon, the academy,
 * the daily transmission, the tamper-evident ledger, the bias mirror, and the
 * weekly cipher. Presentational + server-renderable.
 */

import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";

const SURFACES: ReadonlyArray<{ title: string; href: string; desc: string; tag: string; accent: string }> = [
  { title: "Inside the Signal", href: "/intelligence", desc: "See the reasoning, not just the number — the engine prosecutes every call.", tag: "Engine", accent: BRAND_COLORS.orbitalCyan },
  { title: "Edge Map", href: "/observatory", desc: "Enter the slate as a navigable universe — games as star systems, markets as orbits.", tag: "Slate Twin", accent: BRAND_COLORS.softUltraviolet },
  { title: "Parlay MRI", href: "/parlay-mri", desc: "X-ray a ticket's hidden risk and correlation before you ever place it.", tag: "Surgeon", accent: BRAND_COLORS.ionMagenta },
  { title: "The Academy", href: "/academy", desc: "Train on process, not luck — earn rank by calibration and restraint.", tag: "Training", accent: BRAND_COLORS.orbitalCyan },
  { title: "GSN", href: "/gsn", desc: "The daily intelligence transmission — the whole board read as a briefing.", tag: "Network", accent: BRAND_COLORS.softUltraviolet },
  { title: "Trust Ledger", href: "/ledger", desc: "A record that can't be rewritten — a tamper-evident commitment you can verify.", tag: "Proof", accent: BRAND_COLORS.orbitalCyan },
  { title: "The Bias Mirror", href: "/responsible-play", desc: "A private check on how you decide — protective, never predatory.", tag: "Responsible", accent: BRAND_COLORS.softUltraviolet },
  { title: "The Cipher", href: "/cipher", desc: "A weekly hunt hidden in plain sight — solve it for a free week of Elite.", tag: "Hunt", accent: BRAND_COLORS.ionMagenta },
];

export function IntelligenceLayer() {
  return (
    <section className="border-b border-white/[0.08] px-4 py-20 sm:px-6 lg:px-8" aria-labelledby="layer-heading">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
            The intelligence layer
          </p>
        </Reveal>
        <Reveal delay={90}>
          <h2 id="layer-heading" className="mt-3 max-w-3xl font-display text-3xl text-white sm:text-4xl">
            Not a picks page. An operating system for the decision.
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 max-w-2xl text-ink-300">
            Every surface is one window into the same engine — the reasoning, the slate, the risk,
            the training, the record. Explore the system.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SURFACES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="surface-card group relative flex flex-col overflow-hidden p-5 transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: s.accent }}>{s.tag}</span>
              <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-300">{s.desc}</p>
              <span aria-hidden className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1" style={{ color: s.accent }}>
                Open →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
