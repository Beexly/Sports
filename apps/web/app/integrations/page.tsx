import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { providerStatuses, readinessSummary, type ProviderCategory } from "@/lib/integrations/providers";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Data & Integrations — What's Live, What's Gated",
  description:
    "A glass-box view of every external data source and integration: what's wired, what's founder-gated, and exactly what each unlocks. Live integrations activate only when a human sets a key — nothing turns on by itself.",
  alternates: { canonical: "/integrations" },
};

const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  projections: "Fantasy projections",
  "image-safety": "Media moderation",
  "league-oauth": "League sync",
  "avatar-tts": "Galaxy Studios presenter",
  odds: "Odds & lines",
};

export default function IntegrationsPage() {
  const providers = providerStatuses();
  const summary = readinessSummary();
  const categories = [...new Set(providers.map((p) => p.category))];

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80" style={{ background: `radial-gradient(55% 80% at 50% 0%, ${BRAND_COLORS.orbitalCyan}14, transparent 70%)` }} />
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}><span className="live-dot" /> Data & Integrations</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-white" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                Exactly what&apos;s <span className="gse-editorial" style={{ fontSize: "1.08em" }}>wired</span>.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                A trust-first product should be honest about its data. Here&apos;s every external source and integration —
                what&apos;s live, what&apos;s held behind the founder gate, and what each one unlocks. Live integrations turn
                on only when a human sets a key; nothing activates on its own, and the product degrades to clearly
                labelled illustrative data until then.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8">
            <Reveal>
              <div className="surface-card flex flex-wrap items-center gap-4 p-5">
                <span className="font-display text-3xl text-white">{summary.configured}<span className="text-ink-600">/{summary.total}</span></span>
                <span className="text-sm text-ink-400">integrations live. The rest are founder-gated and clearly labelled wherever illustrative data is shown.</span>
              </div>
            </Reveal>

            {categories.map((cat) => (
              <Reveal key={cat}>
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-ink-500">{CATEGORY_LABEL[cat]}</h2>
                  <div className="space-y-2.5">
                    {providers.filter((p) => p.category === cat).map((p) => {
                      const hex = p.configured ? BRAND_COLORS.orbitalCyan : "#E0A800";
                      return (
                        <div key={p.key} className="surface-card p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-semibold text-white">{p.name}</span>
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${hex}1c`, color: hex }}>
                              {p.configured ? "Live" : "Founder-gated"}
                            </span>
                            <code className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px] text-ink-500" style={{ background: "rgba(255,255,255,0.05)" }}>{p.envVar}</code>
                          </div>
                          <p className="mt-2 text-xs text-ink-300"><span className="text-ink-600">Unlocks:</span> {p.unlocks}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{p.note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            ))}

            <Reveal delay={120}>
              <p className="text-xs leading-relaxed text-ink-500">
                This page reads the live environment server-side. No keys or secrets are ever shown — only whether each
                slot is filled. See the <a href="/methodology" style={{ color: BRAND_COLORS.softUltraviolet }}>methodology</a> for how the engine uses what&apos;s wired.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
