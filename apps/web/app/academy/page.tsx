import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { AcademySimulator } from "@/components/academy/academy-simulator";
import { CoursePlayer } from "@/components/academy/course-player";
import { BeatTheClose } from "@/components/academy/beat-the-close";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Academy — Courses, Live Fire, and Beat the Close",
  description:
    "Interactive courses with graded quizzes, a live-fire decision simulator, the Beat the Close training game, and the GM Academy — train process, calibration, and restraint.",
  alternates: { canonical: "/academy" },
};

const cyan = BRAND_COLORS.orbitalCyan;
const uv = BRAND_COLORS.softUltraviolet;
const mag = BRAND_COLORS.ionMagenta;

/** The wings of the Academy — every door on this floor is real. */
const WINGS = [
  { id: "courses", label: "Course Floor", desc: "Interactive lessons + graded quizzes", hex: cyan },
  { id: "live-fire", label: "Live Fire", desc: "Decide blind, graded on process", hex: mag },
  { id: "beat-the-close", label: "Beat the Close", desc: "The line-trading arcade", hex: uv },
  { id: "film-room", label: "Film Room", desc: "Filmed lessons — in production", hex: "#8b93a8" },
] as const;

/** Film Room slate — episodes in production. Honest: no fake video players. */
const FILM_SLATE = [
  { ep: "EP 01", title: "How to read a line like a price" },
  { ep: "EP 02", title: "The vig, de-vigging, and 52.4%" },
  { ep: "EP 03", title: "CLV — the only honest scoreboard" },
  { ep: "EP 04", title: "Key numbers and the half-points that matter" },
  { ep: "EP 05", title: "Bankroll: survival is the strategy" },
  { ep: "EP 06", title: "Steam, openers, and reading limits" },
] as const;

export default function AcademyPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${uv}18, transparent 70%), radial-gradient(40% 60% at 72% 8%, ${cyan}12, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: cyan }}>
                <span className="live-dot" />
                The Academy
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Train on the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>process</span>, not the luck.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Four training floors: interactive courses with graded quizzes, a live-fire decision
                simulator, a line-trading game scored on pure CLV, and a film room in production.
                Restraint counts. Lucky wins don&apos;t. You earn rank by calibration — not hot streaks.
              </p>
            </Reveal>

            {/* wing map */}
            <Reveal delay={240}>
              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {WINGS.map((w) => (
                  <a
                    key={w.id}
                    href={`#${w.id}`}
                    className="group rounded-xl border p-4 transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ borderColor: `${w.hex}33`, background: `radial-gradient(100% 100% at 50% 0%, ${w.hex}0d, transparent 75%)` }}
                  >
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: w.hex }}>
                      {w.label}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{w.desc}</p>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── COURSE FLOOR — interactive lessons + quizzes ─────────────── */}
        <section id="courses" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: cyan }}>course floor</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Lessons that quiz back.
              </h2>
              <p className="mt-3 max-w-2xl text-ink-300">
                Three tracks — line literacy, bankroll &amp; risk, market mechanics. Read the lesson,
                pass the quiz, build your transcript. Progress lives in your browser; answers are
                final, exactly like a locked bet.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <CoursePlayer />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── LIVE FIRE — the original simulator ───────────────────────── */}
        <section id="live-fire" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow" style={{ color: mag }}>live fire</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Decide blind. Get graded on the decision.
              </h2>
              <p className="mt-3 max-w-2xl text-ink-300">
                Historical-style slates exactly as they looked at lock — the line, the injury
                report, the public pressure, the counter-evidence. Play, Watchlist, or No-Bet
                before the result can contaminate the read. A lucky win is flagged; a correct
                read that lost is respected.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <AcademySimulator />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── BEAT THE CLOSE — the game ────────────────────────────────── */}
        <section id="beat-the-close" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p className="eyebrow" style={{ color: uv }}>the arcade</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Beat the Close.
              </h2>
              <p className="mt-3 max-w-2xl text-ink-300">
                Synthetic markets, real skill: intel drips in, the live number moves, and you
                choose your moment — take the number or pass entirely. No wins, no losses, no
                luck. Your score is closing-line value, the metric professionals actually track.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <BeatTheClose />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FILM ROOM — in production, honestly ──────────────────────── */}
        <section id="film-room" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-ink-400">film room</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                The filmed curriculum — in production.
              </h2>
              <p className="mt-3 max-w-2xl text-ink-300">
                Six episodes are being produced to pair with the course floor. No placeholder
                videos, no fake players — the slate below is the real production order, and each
                lesson is already trainable interactively above.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FILM_SLATE.map((f) => (
                  <div
                    key={f.ep}
                    className="surface-card relative overflow-hidden p-5"
                    aria-label={`${f.ep} — in production`}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-24 animate-pulse opacity-20"
                      style={{ background: `linear-gradient(110deg, ${uv}30, ${cyan}18, transparent)` }}
                    />
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: uv }}>
                      {f.ep}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-3 inline-block rounded-full border border-mineral px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
                      in production
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* GM Academy + closing note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm leading-relaxed text-ink-500">
                Training content is illustrative and educational. Every floor rewards calibration
                and restraint, never streaks — the same standard the engine holds itself to.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/fantasy/academy" className="btn btn-ghost">GM Academy — fantasy drills</Link>
                <Link href="/intelligence" className="btn btn-ghost">Inside the engine</Link>
                <Link href="/parlay-mri" className="btn btn-ghost">Parlay MRI</Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
