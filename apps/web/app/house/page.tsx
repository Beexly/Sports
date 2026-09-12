import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ReaderDoorway } from "@/components/house/reader-doorway";
import { WEEKLY_RITUAL, todayAction } from "@/lib/house/weekly-ritual";
import { loadBoardState } from "@/lib/board/state";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The NFL House: One Place to Land",
  description:
    "The NFL hub: the board, fantasy tools, the public record, and The Beat — one place, one engine, one set of receipts. Come for clarity.",
  alternates: { canonical: "/house" },
};

/**
 * Galaxy NFL House — the belonging layer over the intelligence layer
 * (docs/design/NFL_HOUSE_DOCTRINE.md). ONE House, not six rooms
 * (ASTRA A-6, owner 2026-09-14: "if we are going to have a chat room, then we
 * need to have ONE SINGLE CHAT... our engagement is nowhere near to where we
 * can have multiple rooms"). Every door below opens onto a surface that
 * already exists and runs on real data. The dead Observatory door and the
 * staged Sunday Couch room are gone.
 */

/**
 * Door accents — canonical token hexes (styles/design-tokens.css). Kept as
 * literals (not var() refs) because they feed hex+alpha template styles below.
 */
const ACCENT_CYAN = "#FF4D2E"; // --orbital-cyan
const ACCENT_UV = "#C9D4CE"; // --ultraviolet
const ACCENT_MAGENTA = "#FF4D2E"; // --plasma

interface RoomDoor {
  readonly name: string;
  readonly href: string;
  readonly whose: string;
  readonly promise: string;
  readonly accent: string;
  /** Which real, live operational count this door surfaces (never fabricated). */
  readonly live?: "board" | "receipts";
}

/**
 * The doors — four, one per job. Each opens onto a real surface and (where one
 * exists) wears a LIVE count pulled from real loaders, never an invented
 * community number. Observatory is gone (route redirects to /board). Academy
 * is hidden from public nav (ASTRA A-5).
 */
const ROOM_DOORS: readonly RoomDoor[] = [
  {
    name: "The Board",
    href: "/board",
    whose: "For the reader who wants the number",
    promise:
      "The live decision surface: published rows, held rows, and the discipline of No-Bet. Bring the number, not the ego.",
    accent: ACCENT_CYAN,
    live: "board",
  },
  {
    name: "Fantasy tools",
    href: "/fantasy",
    whose: "For anyone managing a roster",
    promise:
      "Start/sit, waivers, trades, and DFS in plain language. Ask the basic question. Nobody gets cooked here.",
    accent: ACCENT_MAGENTA,
  },
  {
    name: "The Record",
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
        ? `${data.cleared} picks · ${data.gated} passed`
        : "Quiet slate";
    case "receipts":
      return data.settled > 0 ? `${data.settled} graded` : "Building sample";
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
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero — belonging before odds. */}
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
            style={{
              background:
                "radial-gradient(55% 75% at 50% 0%, rgba(201, 212, 206, 0.12), transparent 70%), radial-gradient(35% 55% at 78% 12%, rgba(255, 77, 46, 0.07), transparent 70%)",
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
                One House.{" "}
                <span
                  className="gse-editorial text-ultraviolet"
                  style={{ fontSize: "1.1em" }}
                >
                  One
                </span>{" "}
                place to land.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                We turn NFL data, market movement, fantasy decisions, and game-day
                chaos into clear human reads. Same engine, same receipts, one
                front door. Come for clarity.
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
                What do you need right now?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ion-1">
                Every door runs on the same engine and the same receipts. The
                only thing that changes is what you came to do.
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

        {/* The week has a shape — now a calendar you can act on. */}
        <section
          aria-labelledby="house-week-heading"
          className="px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-ion-2">
                The rhythm · your week
              </p>
              <h2
                id="house-week-heading"
                className="mt-3 font-display text-2xl text-ion-white"
              >
                The week has a shape. Here is what to do today.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-ion-1">
                Waivers, lineups, injuries, game day. One action per day — tap it and go.
              </p>
            </Reveal>

            {/* Today's call-to-action — the alert. */}
            {(() => {
              const today = todayAction();
              if (!today) return null;
              return (
              <Reveal delay={80}>
                <div
                  className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-orbital-cyan/40 bg-orbital-cyan/[0.06] px-5 py-4"
                  data-testid="house-today-action"
                >
                  <span
                    className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
                    style={{ background: "rgba(255,77,46,0.16)", color: "#FF4D2E" }}
                  >
                    {today.day} · today
                  </span>
                  <p className="flex-1 text-sm font-semibold text-ion-white">
                    {today.action}
                  </p>
                  {today.actionHref && (
                    <Link href={today.actionHref} className="btn btn-primary btn-sm">
                      Go →
                    </Link>
                  )}
                </div>
              </Reveal>
              );
            })()}

            <Stagger className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WEEK_RHYTHM.map((slot, i) => {
                const isToday = slot.dayIndex === new Date().getUTCDay();
                return (
                  <div
                    key={`${slot.day}-${i}`}
                    className={`rounded-xl border p-4 transition-colors ${
                      isToday
                        ? "border-orbital-cyan/60 bg-orbital-cyan/[0.05]"
                        : "border-mineral/70 bg-carbon/60"
                    }`}
                    data-testid={isToday ? "house-rhythm-today" : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-numerals text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
                        {slot.day}
                      </p>
                      {isToday && (
                        <span className="rounded-full bg-orbital-cyan/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-orbital-cyan">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-snug text-ion-1">{slot.beat}</p>
                    {slot.action && slot.actionHref ? (
                      <Link
                        href={slot.actionHref}
                        className={`mt-3 block text-xs font-semibold ${
                          isToday ? "text-orbital-cyan hover:text-ion-white" : "text-ion-2 hover:text-ion-white"
                        }`}
                      >
                        {slot.action} →
                      </Link>
                    ) : (
                      <p className="mt-3 text-xs text-ion-3">We handle this one.</p>
                    )}
                  </div>
                );
              })}
            </Stagger>
          </div>
        </section>

        {/* House rules + the honest live-chat note. */}
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
                <p className="eyebrow text-ion-2">
                  Live chat
                </p>
                <h3 className="mt-3 font-display text-xl text-ion-white">
                  One room, when we can keep it safe.
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ion-1">
                  A real game-day chat is not open yet. We will not scatter
                  engagement across rooms we cannot moderate. Until the
                  safeguards are real — human moderation, privacy review, a
                  culture that protects beginners — The Beat is the open
                  surface.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/the-beat" className="btn btn-primary">
                    Open The Beat
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
