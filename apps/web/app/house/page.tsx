import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { ReaderDoorway } from "@/components/house/reader-doorway";
import { WEEKLY_RITUAL } from "@/lib/house/weekly-ritual";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The NFL House — Football Is Better When You Have a Room",
  description:
    "We turn NFL data, market movement, fantasy decisions, and game-day chaos into clear human reads — and we built rooms where every kind of fan belongs. Come for clarity. Stay because it feels like home.",
  alternates: { canonical: "/house" },
};

/**
 * Galaxy NFL House — the belonging layer over the intelligence layer
 * (docs/design/NFL_HOUSE_DOCTRINE.md). Every door below opens onto a surface
 * that already exists and runs on real data. No fake rooms, no fake counts:
 * the live community rooms are explicitly staged until we can keep them safe.
 */

interface RoomDoor {
  readonly name: string;
  readonly href: string;
  readonly whose: string;
  readonly promise: string;
  readonly accent: string;
}

const ROOM_DOORS: readonly RoomDoor[] = [
  {
    name: "The War Room",
    href: "/board",
    whose: "For the reader who wants the number",
    promise:
      "The live decision surface — published rows, gated rows, and the discipline of No-Bet. Bring the number, not the ego.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    name: "The Film Room",
    href: "/academy",
    whose: "For the fan who wants to see the game deeper",
    promise:
      "Pressure, coverage, pace, protection — learn to watch like an analyst. Graded on decision quality, not bravado.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    name: "Fantasy 101",
    href: "/fantasy",
    whose: "For anyone learning the league — for themselves or someone they love",
    promise:
      "Start/sit, waivers, and trades in plain language. Ask the basic question. Nobody gets cooked in this room.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    name: "The Parlay MRI Lab",
    href: "/parlay-mri",
    whose: "For the ticket that looks too good",
    promise:
      "Bring the slip. We show the correlation the payout hides — and when the sharpest move is the one you don't make.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    name: "The Hall of Misses",
    href: "/performance/losses",
    whose: "For the skeptic — rightly so",
    promise:
      "Our losses, dissected in public. Process or variance — we say which, and what changes because of it.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    name: "The Receipts",
    href: "/performance",
    whose: "For anyone who's been burned before",
    promise:
      "Calibration before claims. Every number on this site has to earn its place, and this is where it does.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    name: "The Beat",
    href: "/the-beat",
    whose: "For the ten-minute Sunday prep",
    promise:
      "Scores, stories, what changed — the casual surface. Long week? This is the room with the comfortable chair.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    name: "The Observatory",
    href: "/observatory",
    whose: "For the one who wants to see the whole board",
    promise:
      "The slate as a living market map — where the pressure is, where the gravity bends, where the edges open.",
    accent: BRAND_COLORS.softUltraviolet,
  },
];

const WEEK_RHYTHM = WEEKLY_RITUAL;

const HOUSE_RULES: readonly string[] = [
  "Protect beginners. The basic question is always welcome.",
  "No manufactured certainty. We publish confidence, not promises.",
  "No-Bet is respected. Sitting out is a decision, not a failure.",
  "Disagreements require reasons. Bring the number.",
  "Nobody is talked down to. Same data, different doorway.",
];

export default function NflHousePage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero — belonging before odds. */}
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="house-belonging" className="-z-20 opacity-60" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
            style={{
              background: `radial-gradient(55% 75% at 50% 0%, ${BRAND_COLORS.softUltraviolet}1f, transparent 70%), radial-gradient(35% 55% at 78% 12%, ${BRAND_COLORS.ionMagenta}12, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow inline-flex items-center gap-2"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                <span className="live-dot" />
                Galaxy NFL House
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Football is better when you have a{" "}
                <span
                  className="gse-editorial"
                  style={{ fontSize: "1.1em", color: BRAND_COLORS.softUltraviolet }}
                >
                  room
                </span>
                .
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                We turn NFL data, market movement, fantasy decisions, and game-day
                chaos into clear human reads. The math is the same in every room —
                the doorway is yours. Come for clarity. Stay because it feels like
                home.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p
                className="mt-6 text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                Understand the game · Read the market · Find your people
              </p>
            </Reveal>
          </div>
        </section>

        {/* The doors. */}
        <section
          aria-labelledby="house-doors-heading"
          className="px-4 pb-6 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2
                id="house-doors-heading"
                className="font-display text-2xl text-white"
              >
                Pick your door
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-300">
                Every room runs on the same engine and the same receipts. The only
                thing that changes is how it speaks to you.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROOM_DOORS.map((door) => (
                <Link
                  key={door.href + door.name}
                  href={door.href}
                  data-testid="house-door"
                  className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04]/50 p-5 transition hover:border-white/[0.08]-hi hover:bg-white/[0.04]/80"
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: door.accent }}
                  >
                    {door.whose}
                  </span>
                  <span className="mt-2 font-display text-xl text-white">
                    {door.name}
                  </span>
                  <span className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                    {door.promise}
                  </span>
                  <span
                    className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400 transition group-hover:text-white"
                    aria-hidden="true"
                  >
                    Enter →
                  </span>
                </Link>
              ))}
            </Stagger>
          </div>
        </section>

        {/* How Galaxy speaks to you — the register doorway. */}
        <section
          aria-labelledby="house-voice-heading"
          className="px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                Same data, different doorway
              </p>
              <h2
                id="house-voice-heading"
                className="mt-3 font-display text-2xl text-white"
              >
                How should Galaxy speak to you?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-300">
                The engine never changes. The explanation meets you where you
                are — pick a register and every &ldquo;ask the model why&rdquo;
                across the site honors it.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <ReaderDoorway />
              </div>
            </Reveal>
          </div>
        </section>

        {/* The week has a shape. */}
        <section
          aria-labelledby="house-week-heading"
          className="px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.ionMagenta }}>
                The rhythm
              </p>
              <h2
                id="house-week-heading"
                className="mt-3 font-display text-2xl text-white"
              >
                The week has a shape. The desk works it.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-300">
                An NFL week is a ritual, not a feed. This is how we move through
                it — and when each room matters most.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WEEK_RHYTHM.map((slot, i) => (
                <div
                  key={`${slot.day}-${i}`}
                  className="rounded-xl border border-white/[0.08]/70 bg-white/[0.03] p-4"
                >
                  <p
                    className="font-numerals text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    {slot.day}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ink-300">{slot.beat}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* House rules + the staged honesty card. */}
        <section
          aria-labelledby="house-rules-heading"
          className="px-4 pb-24 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[3fr_2fr]">
            <Reveal>
              <div className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.04]/50 p-7">
                <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                  House rules
                </p>
                <ul className="mt-5 space-y-3">
                  {HOUSE_RULES.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-3 text-sm leading-relaxed text-ink-300"
                    >
                      <span
                        aria-hidden="true"
                        style={{ color: BRAND_COLORS.orbitalCyan }}
                      >
                        ◆
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
                <p
                  data-testid="house-culture-line"
                  className="mt-7 border-t border-white/[0.08]/60 pt-5 text-base font-semibold text-white"
                >
                  We do not force action. We protect decision quality.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
                <p className="eyebrow" style={{ color: BRAND_COLORS.ionMagenta }}>
                  The Sunday Couch
                </p>
                <h3 className="mt-3 font-display text-xl text-white">
                  Live rooms open when we can protect them.
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-300">
                  A real game-day room — watching together, reacting together,
                  asking &ldquo;what just happened?&rdquo; together — is coming.
                  We open that door only after the safeguards are real: human
                  moderation, privacy review, and a culture that protects
                  beginners. We don&apos;t open rooms we can&apos;t keep safe.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/the-beat" className="btn btn-primary">
                    Meanwhile, The Beat is open
                  </Link>
                  <Link href="/responsible-play" className="btn btn-ghost">
                    Play responsibly
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
