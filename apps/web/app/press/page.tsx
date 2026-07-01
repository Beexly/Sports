import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL } from "@/lib/brand";

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
];

const SOUNDBITES = [
  "Galaxy Sports Edge publishes a calibrated, fully-reasoned signal — not a tout.",
  "Outcomes are uncertain. Variance is described, not hidden.",
  "Every pick traces back to a real market line. No synthetic numbers.",
  "Performance stats stay gated until the data can honestly support them.",
];

export default function PressPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Press</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              Press kit
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              Quick facts, media availability, and ready-to-quote soundbites
              for journalists, podcasters, and analysts covering the sports
              intelligence space.
            </p>
          </div>
        </section>

        <section className="border-t border-ink-800/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Quick facts</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              The basics.
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
              {FACTS.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col gap-1 border-b border-ink-800/40 py-3"
                >
                  <span className="eyebrow">{f.label}</span>
                  <span className="text-sm text-ink-200">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-ink-800/60 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Soundbites</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              Quote-ready.
            </h2>
            <ul className="mt-8 space-y-3">
              {SOUNDBITES.map((q) => (
                <li
                  key={q}
                  className="surface-card border-l-2 border-accent-500 px-5 py-4 text-base text-ink-100"
                >
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Media inquiries</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              Direct line to the desk.
            </h2>
            <p className="mt-5 text-base text-ink-300">
              For interviews, embargoed coverage, or a deeper walkthrough of
              the model, write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-mono text-accent-300 underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              . Include outlet, deadline, and angle for a useful reply.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/methodology" className="btn btn-primary">
                Methodology →
              </Link>
              <Link href="/about" className="btn btn-ghost">
                About {BRAND_NAME}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
