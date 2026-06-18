import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";

/**
 * /changelog - public transparency feed.
 *
 * Entries are hardcoded for the launch window. Once update cadence becomes
 * weekly, this can move to a DB-backed content collection.
 */

export const metadata: Metadata = {
  title: "Changelog - Ship log for Galaxy Sports Edge",
  description:
    "What changed and when. Every model version, gate flip, and calibration update logged publicly.",
  alternates: { canonical: "/changelog" },
};

type Entry = {
  date: string;
  type: "launch" | "ship" | "gate" | "calibration" | "voice";
  title: string;
  body: string;
};

const TYPE_META: Record<Entry["type"], { label: string; color: string; bg: string }> = {
  launch:      { label: "Launch",      color: BRAND_COLORS.ionMagenta,    bg: `${BRAND_COLORS.ionMagenta}14` },
  ship:        { label: "Ship",        color: BRAND_COLORS.orbitalCyan,   bg: `${BRAND_COLORS.orbitalCyan}14` },
  gate:        { label: "Gate flip",   color: BRAND_COLORS.softUltraviolet, bg: `${BRAND_COLORS.softUltraviolet}14` },
  calibration: { label: "Calibration", color: BRAND_COLORS.softUltraviolet, bg: `${BRAND_COLORS.softUltraviolet}14` },
  voice:       { label: "Voice",       color: "#9AA3B2",                  bg: "rgba(154,163,178,0.10)" },
};

const ENTRIES: ReadonlyArray<Entry> = [
  {
    date: "2026-05-21",
    type: "ship",
    title: "Anatomy of a Signal, vs. Tout Services, and brand voice refresh",
    body:
      "Added an annotated sample-signal card to the homepage so the product is visible, not just described. Added a /vs/tout-services SEO landing page, refreshed customer-facing copy to a consistent brand voice, added FAQ schema, Organization and WebSite schema, per-page metadata, and noindex layouts for operator pages.",
  },
  {
    date: "2026-05-21",
    type: "voice",
    title: "Single front-door inbox: hq@galaxysportsedge.com",
    body:
      "Consolidated support and legal contact copy into hq@galaxysportsedge.com so every customer message lands in one place.",
  },
  {
    date: "2026-05-21",
    type: "launch",
    title: "Round 1 launch messaging prepared",
    body:
      "Launch copy is ready for @GalaxySportsAI and @galaxysportsedge. IG and FB follow once the Round 1 brand-board asset ships.",
  },
  {
    date: "2026-05-20",
    type: "launch",
    title: "Site live at galaxysportsedge.com",
    body:
      "Silent launch. Marketing surface open. Performance and Vault gated. Paywall off. Cron routes for odds refresh wired. Public smoke passed with only the expected ingestion-health warning.",
  },
  {
    date: "2026-05-20",
    type: "gate",
    title: "CANONICAL_HISTORY_ENABLED set to true",
    body:
      "Settled-pick logging is on. Every settled signal now starts contributing to the canonical record that will eventually unlock the Calibration Report.",
  },
];

function groupByDate(entries: ReadonlyArray<Entry>) {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export default function ChangelogPage() {
  const grouped = groupByDate(ENTRIES);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />

      <main className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem]"
            style={{
              background: `radial-gradient(50% 70% at 50% 0%, ${BRAND_COLORS.softUltraviolet}12, transparent 65%)`,
            }}
          />
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.softUltraviolet,
                  borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                  backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                }}
              >
                Changelog
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
                What changed,{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  when, and why.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 text-lg leading-8 text-ink-300">
                Every model version, every gate flip, every calibration update
                logged publicly. {BRAND_NAME} runs on transparency, which means
                the velocity of the product has to be transparent too.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Timeline */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Timeline vertical line */}
            <div className="relative">
              <div
                className="absolute left-0 top-0 hidden h-full w-px md:block"
                style={{ background: `linear-gradient(180deg, ${BRAND_COLORS.softUltraviolet}30, transparent 90%)`, marginLeft: "138px" }}
                aria-hidden="true"
              />

              <ol className="flex flex-col gap-12">
                {grouped.map(([date, entries]) => (
                  <li key={date} className="grid gap-6 md:grid-cols-[140px_1fr]">
                    <div className="md:sticky md:top-24 md:self-start">
                      <p
                        className="font-mono text-xs uppercase tracking-widest"
                        style={{ color: BRAND_COLORS.orbitalCyan }}
                      >
                        {formatDate(date)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {entries.map((entry) => {
                        const meta = TYPE_META[entry.type];
                        return (
                          <article
                            key={entry.title}
                            className="surface-card flex flex-col gap-3 overflow-hidden p-6"
                          >
                            {/* Type chip */}
                            <div>
                              <span
                                className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]"
                                style={{
                                  color: meta.color,
                                  background: meta.bg,
                                  borderColor: `${meta.color}30`,
                                }}
                              >
                                {meta.label}
                              </span>
                            </div>
                            <h2 className="font-display text-xl font-semibold text-white">
                              {entry.title}
                            </h2>
                            <p className="text-sm leading-7 text-ink-300">
                              {entry.body}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Reveal delay={120}>
              <p
                className="mt-12 border-t pt-6 text-center text-xs text-ink-500"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                Updates ship weekly.{" "}
                <Link
                  href="/auth/signin"
                  className="underline-offset-4 hover:underline"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Create a free account
                </Link>{" "}
                and you&apos;ll get the next one in your inbox.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function formatDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
