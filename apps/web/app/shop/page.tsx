import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Shop — Galaxy Sports Edge Merch (Opening Soon)",
  description:
    "Galaxy Sports Edge print-on-demand merch is in phrase validation. No live products yet. Help shape the first drop — tell us which phrase you would wear.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: `Shop — ${BRAND_NAME} (Opening Soon)`,
    description:
      "Galaxy Sports Edge merch is in validation. No live products yet. Tell us which phrase you would wear and help shape the first drop.",
    type: "website",
  },
};

const CANDIDATE_PHRASES = [
  {
    phrase: "No-Bet Is a Position",
    context:
      "The idea that declining action is itself a disciplined, defensible move — not a failure to decide.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    phrase: "Confidence Is Not Certainty",
    context:
      "The core epistemic principle of the Desk. A high-confidence read is still a read, not a guarantee.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    phrase: "Fade the Noise",
    context:
      "Public narrative is often the thing to fade. The media creates pressure; the Desk reads it.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    phrase: "Signal > Hype",
    context:
      "The brand's editorial standard condensed. We chase signal. We do not amplify hype.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    phrase: "Process Over Panic",
    context:
      "Disciplined decision-making under variance. The process compounds; panic is noise.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    phrase: "The Desk Was Right to Wait",
    context:
      "The restraint pitch. Sometimes the best publish is the one you did not make. Patience is edge.",
    accent: BRAND_COLORS.ionMagenta,
  },
] as const;

const PLANNED_PRODUCT_TYPES = [
  {
    label: "Hats",
    desc: "Structured caps and dad hats. Clean wordmark or phrase on the front. Print-on-demand, no inventory.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Shirts",
    desc: "Fitted and relaxed cuts. One phrase per shirt. Black or charcoal base with minimal ink.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "Hoodies",
    desc: "The core comfort layer. Heavyweight fleece. Phrase on chest or sleeve — testing both.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    label: "Stickers",
    desc: "Die-cut vinyl. The phrase catalog in sticker form. Low cost, high identity-signal.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Decision Journal",
    desc: "A physical bet/pick tracking journal with the Galaxy decision framework printed inside. The analog version of the Desk.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const HONEST_STATE_NOTES = [
  "No live products — the shop is not open yet.",
  "No prices — nothing is priced until real products exist.",
  "No sales numbers — we have sold nothing, and we will not fabricate a track record.",
  "No checkout — there is no e-commerce configured here.",
  "Opening timing is not committed — we open when the validation data supports a real first drop.",
] as const;

export default function ShopPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">

        {/* ── Hero — plasma chrome tone. The shop is identity-forward: phrases
            are the product, the merch is the carrier. */}
        <RevenueHero
          chip="Shop — Opening Soon"
          chipTone="plasma"
          headline={
            <>
              <span className="gw-chrome-plasma">Wear the signal.</span>{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                Not the hype.
              </span>
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Print-on-demand merch built around the Galaxy phrase library.
              </span>
              <span className="mt-3 block">
                Phrases that mean something to people who have moved past the
                tout model. We are validating language before we open. No
                products are live yet — the first drop ships when the validation
                data earns it.
              </span>
            </>
          }
        >
          <div
            className="mt-6 inline-flex items-center gap-3 rounded-xl border px-5 py-3"
            style={{
              borderColor: `${BRAND_COLORS.ionMagenta}25`,
              background: `${BRAND_COLORS.ionMagenta}0a`,
            }}
          >
            <span
              className="font-mono text-sm font-bold"
              style={{ color: BRAND_COLORS.ionMagenta }}
            >
              Status:
            </span>
            <span className="text-sm text-ink-300">
              Validating language first.{" "}
              <strong className="text-white">Shop opens when the first drop is real.</strong>
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/contact" className="btn btn-primary">
              Tell us which phrase you'd wear →
            </Link>
            <Link
              href="/newsletter"
              className="btn btn-ghost"
              style={{ color: BRAND_COLORS.orbitalCyan }}
            >
              Get notified when we open →
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            No email required to vote — but subscribers hear first.
          </p>
        </RevenueHero>

        {/* ── Honest state — WorldSection */}
        <WorldSection
          index="01"
          eyebrow="Honest state of the shop"
          title={
            <>
              Language first.{" "}
              <span className="gse-editorial gw-chrome-plasma">Products second.</span>
            </>
          }
          lede="We publish honest empty states. The shop is being built — and that means no fake products, no fake prices, and no fabricated sales history."
          tone="void"
        >
          <Stagger className="flex flex-col gap-4" step={70}>
            {HONEST_STATE_NOTES.map((note, i) => (
              <div
                key={i}
                className="surface-card gw-card-hover flex items-start gap-4 p-5"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 font-mono text-sm font-bold"
                  style={{ color: BRAND_COLORS.ionMagenta }}
                >
                  ✕
                </span>
                <p className="text-sm leading-relaxed text-ink-300">{note}</p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        {/* ── Phrase candidates — WorldSection, nebula tone. The phrases are
            the product; present them with craft: surface-card + gw-card-hover. */}
        <WorldSection
          index="02"
          eyebrow="Candidate phrases"
          title={
            <>
              Six phrases{" "}
              <span className="gw-chrome-ice">in consideration.</span>
            </>
          }
          lede="These are the candidates for the first drop. Each one carries a specific idea from the Galaxy operating philosophy. Tell us which one you would put on a hat, shirt, or hoodie."
          tone="nebula"
        >
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" step={70}>
            {CANDIDATE_PHRASES.map((item) => (
              <article
                key={item.phrase}
                className="surface-card gw-card-hover flex flex-col gap-3 overflow-hidden p-6"
              >
                <div
                  className="mb-1 h-0.5 w-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${item.accent}, transparent 70%)`,
                  }}
                  aria-hidden="true"
                />
                <p className="font-display text-xl font-semibold leading-tight text-white">
                  &ldquo;{item.phrase}&rdquo;
                </p>
                <p className="text-sm leading-relaxed text-ink-400">
                  {item.context}
                </p>
                <div className="mt-auto pt-2">
                  <Link
                    href="/contact"
                    className="text-xs font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
                    style={{ color: item.accent }}
                  >
                    Vote for this phrase →
                  </Link>
                </div>
              </article>
            ))}
          </Stagger>

          <Reveal delay={200}>
            <div className="mt-8 text-center">
              <Link href="/contact" className="btn btn-primary">
                Tell us your pick →
              </Link>
              <p className="mt-3 text-xs text-ink-500">
                No commitment, no checkout. Just tell us what resonates.
              </p>
            </div>
          </Reveal>
        </WorldSection>

        {/* ── Planned product types — WorldSection, deep tone */}
        <WorldSection
          index="03"
          eyebrow="Planned product types"
          title={
            <>
              What the first drop{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                will include.
              </span>
            </>
          }
          lede="Print-on-demand, no inventory, no warehouse. Products print and ship when ordered. This is the candidate lineup — subject to phrase validation before any of it opens."
          tone="deep"
        >
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" step={60}>
            {PLANNED_PRODUCT_TYPES.map((product) => (
              <div
                key={product.label}
                className="surface-card gw-card-hover flex flex-col p-5"
              >
                <div
                  className="mb-3 h-0.5 w-10 rounded-full"
                  style={{ background: product.accent }}
                  aria-hidden="true"
                />
                <h3
                  className="font-display text-base font-semibold"
                  style={{ color: product.accent }}
                >
                  {product.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {product.desc}
                </p>
                <p
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: `${product.accent}80` }}
                >
                  Coming soon — no price yet
                </p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Final CTA */}
        <section className="gw-nebula-deep relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60vh]"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.ionMagenta}10, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="gw-chip-plasma">Shape the first drop</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Which phrase would{" "}
                <span className="gse-editorial gw-chrome-plasma">you wear?</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                The first drop is built around the phrases that actually resonate
                with people who value process over picks, signal over hype, and
                restraint over certainty. Tell us what lands.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Link href="/contact" className="btn btn-primary">
                  Vote for a phrase →
                </Link>
                <Link href="/newsletter" className="btn btn-ghost">
                  Get notified when we open →
                </Link>
              </div>
              <p className="mt-6 text-xs text-ink-500">
                No products are for sale. No checkout is configured.
                This is a validation page — honest state until the shop is ready.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
