import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { ReaderDoorway } from "@/components/house/reader-doorway";
import { WEEKLY_RITUAL } from "@/lib/house/weekly-ritual";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The NFL House: Football Is Better When You Have a Room",
  description:
    "We turn NFL data, market movement, fantasy decisions, and game-day chaos into clear human reads, and we built rooms where every kind of fan belongs. Come for clarity. Stay because it feels like home.",
  alternates: { canonical: "/house" },
};

/**
 * Galaxy NFL House — the belonging layer over the intelligence layer
 * (docs/design/NFL_HOUSE_DOCTRINE.md). Every door below opens onto a surface
 * that already exists and runs on real data. No fake rooms, no fake counts:
 * the live community rooms are explicitly staged until we can keep them safe.
 */

/**
 * Door accents — canonical token hexes (styles/design-tokens.css). Kept as
 * literals (not var() refs) because they feed hex+alpha template styles below.
 */
const ACCENT_CYAN = "#00E5FF"; // --orbital-cyan
const ACCENT_UV = "#7B61FF"; // --ultraviolet
const ACCENT_MAGENTA = "#FF38C7"; // --plasma

interface RoomDoor {
  readonly name: string;
  readonly href: string;
  readonly whose: string;
  readonly promise: string;
  readonly accent: string;
  /** Which real, live operational count this door surfaces (never fabricated). */
  readonly live?: "board" | "receipts" | "observatory" | "academy";
}

/**
 * The doors, cut to the six that matter — one for each kind of fan, minimal
 * overlap. Each opens onto a real surface and (where one exists) wears a LIVE
 * count pulled from real loaders, never an invented community number.
 */
const ROOM_DOORS: readonly RoomDoor[] = [
  {
    name: "The War Room",
    href: "/board",
    whose: "For the reader who wants the number",
    promise:
      "The live decision surface: published rows, gated rows, and the discipline of No-Bet. Bring the number, not the ego.",
    accent: ACCENT_CYAN,
    live: "board",
  },
  {
    name: "The Observatory",
    href: "/observatory",
    whose: "For the one who wants to see the whole board",
    promise:
      "The slate as a living market map: where the pressure is, where the gravity bends, where the edges open.",
    accent: ACCENT_UV,
    live: "observatory",
  },
  {
    name: "The Film Room",
    href: "/academy",
    whose: "For the fan who wants to see the game deeper",
    promise:
      "Pressure, coverage, pace, protection: learn to watch like an analyst. Graded on decision quality, not bravado.",
    accent: ACCENT_UV,
    live: "academy",
  },
  {
    name: "Fantasy 101",
    href: "/fantasy",
    whose: "For anyone learning the league, for themselves or someone they love",
    promise:
      "Start/sit, waivers, and trades in plain language. Ask the basic question. Nobody gets cooked in this room.",
    accent: ACCENT_MAGENTA,
  },
  {
    name: "The Receipts",
    href: "/performance",
    whose: "For the skeptic who's been burned before",
    promise:
      "Calibration before claims, losses dissected in public. Every number on this site has to earn its place, and this is where it does.",
    accent: ACCENT_UV,
    live: "receipts",
  },
  {
    name: "The Beat",
    href: "/the-beat",
    whose: "For the ten-minute Sunday prep",
    promise:
      "Scores, stories, what changed: the casual surface. Long week? This is the room with the comfortable chair.",
    accent: ACCENT_CYAN,
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

/** Resolve a door's live badge from real loaders. Returns null when there is
 *  no honest count to show (never an invented number). */
function doorBadge(
  live: RoomDoor["live"],
  data: { cleared: number; gated: number; settled: number; scoring: number },
): string | null {
  switch (live) {
    case "board":
      return data.cleared > 0 || data.gated > 0
        ? `${data.cleared} cleared · ${data.gated} gated`
        : "Gate holding";
    case "observatory":
      return data.scoring > 0 ? `${data.scoring} scoring now` : "Slate map live";
    case "receipts":
      return data.settled > 0 ? `${data.settled} settled` : "Calibrating";
    case "academy":
      return "Open lessons";
    default:
      return null;
  }
}

export default async function NflHousePage() {
  const [stateResult, calibrationResult] = await Promise.all([
    loadBoardState(),
    loadPublicCalibrationReport(),
  ]);
  const live = {
    cleared: stateResult.data.publishedToday.length,
    gated: stateResult.data.gatedTodayRows.length,
    settled: calibrationResult.data.sampleSize,
    scoring: stateResult.data.scoringNow.length,
  };

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
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
              background:
                "radial-gradient(55% 75% at 50% 0%, rgba(123, 97, 255, 0.12), transparent 70%), radial-gradient(35% 55% at 78% 12%, rgba(255, 56, 199, 0.07), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-orbital-cyan">
                <span className="live-dot" />
                Galaxy NFL House
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-ion-white"
                style={{
                  fontSize: "clamp(2.5rem, 7vw, 5rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Football is better when you have a{" "}
                <span
                  className="gse-editorial text-ultraviolet"
                  style={{ fontSize: "1.1em" }}
                >
                  room
                </span>
                .
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                We turn NFL data, market movement, fantasy decisions, and game-day
                chaos into clear human reads. The math is the same in every room;
                the doorway is yours. Come for clarity. Stay because it feels like
                home.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
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
                className="font-display text-2xl text-ion-white"
              >
                Pick your door
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ion-1">
                Every room runs on the same engine and the same receipts. The only
                thing that changes is how it speaks to you.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ROOM_DOORS.map((door) => {
                const badge = doorBadge(door.live, live);
                return (
                  <Link
                    key={door.href + door.name}
                    href={door.href}
                    data-testid="house-door"
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-mineral bg-eclipse/50 p-5 transition-colors duration-300 hover:border-mineral-hi hover:bg-eclipse/80"
                  >
                    {/* hover-cinematic: an accent rail draws across the top, and a
                        soft glow lifts from the door's accent color. */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                      style={{ background: `linear-gradient(90deg, ${door.accent}, transparent)` }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -inset-px -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: `radial-gradient(60% 50% at 50% 0%, ${door.accent}14, transparent 70%)` }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: door.accent }}
                      >
                        {door.whose}
                      </span>
                      {badge && (
                        <span className="shrink-0 rounded-full border border-mineral bg-carbon/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ion-2 tabular-nums">
                          <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: door.accent }} />
                          {badge}
                        </span>
                      )}
                    </div>
                    <span className="mt-2 font-display text-xl text-ion-white">
                      {door.name}
                    </span>
                    <span className="mt-3 flex-1 text-sm leading-relaxed text-ion-1">
                      {door.promise}
                    </span>
                    <span
                      className="mt-4 text-xs font-semibold uppercase tracking-wider text-ion-2 transition group-hover:text-ion-white"
                      aria-hidden="true"
                    >
                      Enter →
                    </span>
                  </Link>
                );
              })}
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
              <p className="eyebrow text-orbital-cyan">
                Same data, different doorway
              </p>
              <h2
                id="house-voice-heading"
                className="mt-3 font-display text-2xl text-ion-white"
              >
                How should Galaxy speak to you?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ion-1">
                The engine never changes. The explanation meets you where you
                are. Pick a register and every &ldquo;ask the model why&rdquo;
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
              <p className="eyebrow text-plasma">
                The rhythm
              </p>
              <h2
                id="house-week-heading"
                className="mt-3 font-display text-2xl text-ion-white"
              >
                The week has a shape. The desk works it.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ion-1">
                An NFL week is a ritual, not a feed. This is how we move through
                it, and when each room matters most.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WEEK_RHYTHM.map((slot, i) => (
                <div
                  key={`${slot.day}-${i}`}
                  className="rounded-xl border border-mineral/70 bg-carbon/60 p-4"
                >
                  <p className="font-numerals text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
                    {slot.day}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ion-1">{slot.beat}</p>
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
              <div className="h-full rounded-2xl border border-mineral bg-eclipse/50 p-7">
                <p className="eyebrow text-orbital-cyan">
                  House rules
                </p>
                <ul className="mt-5 space-y-3">
                  {HOUSE_RULES.map((rule) => (
                    <li
                      key={rule}
                      className="flex gap-3 text-sm leading-relaxed text-ion-1"
                    >
                      <span aria-hidden="true" className="text-orbital-cyan">
                        ◆
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
                <p
                  data-testid="house-culture-line"
                  className="mt-7 border-t border-mineral/60 pt-5 text-base font-semibold text-ion-white"
                >
                  We do not force action. We protect decision quality.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="flex h-full flex-col rounded-2xl border border-mineral bg-carbon/60 p-7">
                <p className="eyebrow text-plasma">
                  The Sunday Couch
                </p>
                <h3 className="mt-3 font-display text-xl text-ion-white">
                  Live rooms open when we can protect them.
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ion-1">
                  A real game-day room, watching together, reacting together,
                  asking &ldquo;what just happened?&rdquo; together, is coming.
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
