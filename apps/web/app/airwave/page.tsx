import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { PunditLedger } from "@/components/airwave/pundit-ledger";
import {
  leaderboard,
  toPublicLedger,
  DEMO_PUNDITS,
  DEMO_CLAIMS,
  readAirwaveControlPlane,
  readAirwaveIntakeReadiness,
} from "@/lib/airwave";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Airwave Ledger — Pundits, On the Record",
  description:
    "Sports takes, held to an outcome. The Airwave Ledger turns what pundits say on air into a paraphrased, timestamped, graded record — the same glass-box standard the engine holds itself to. Illustrative personas until founded.",
  alternates: { canonical: "/airwave" },
};

const STEPS = [
  { n: "01", t: "Capture the take", b: "A take airs on a show, a podcast, or a stream. We log what was claimed — a paraphrase, never the raw audio, never a verbatim quote." },
  { n: "02", t: "Reduce to a claim", b: "Each take becomes a structured row: the subject, the side, how emphatic the language was, and whether it is even checkable against an outcome." },
  { n: "03", t: "Grade it like our own", b: "When the game settles, the claim is graded Hit / Miss / Push — and a vague take is marked Unfalsifiable, scoring nothing. The same standard we grade ourselves by." },
];

export default async function AirwavePage() {
  const scorecards = leaderboard(DEMO_PUNDITS, DEMO_CLAIMS);
  const claims = toPublicLedger(DEMO_CLAIMS);
  const [control, intake] = await Promise.all([
    Promise.resolve(readAirwaveControlPlane(process.env as Record<string, string | undefined>)),
    readAirwaveIntakeReadiness(process.env as Record<string, string | undefined>),
  ]);

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
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.ionMagenta}14, transparent 70%), radial-gradient(40% 60% at 72% 8%, ${BRAND_COLORS.orbitalCyan}12, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
                <span className="live-dot" />
                The Airwave Ledger
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                The takes go <span className="gse-editorial" style={{ fontSize: "1.08em" }}>on the record</span>.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
                Sports television and radio run on confidence with no receipt. The Airwave Ledger
                gives the take a receipt — a paraphrased claim, the moment it aired, the outcome,
                and a running accountability index. Being loud is not the same as being right, and
                a take too vague to check earns no credit at all.
              </p>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <Reveal key={s.n} delay={80}>
                <div className="surface-card h-full p-5">
                  <span className="font-display text-2xl tabular-nums" style={{ color: BRAND_COLORS.ionMagenta }}>{s.n}</span>
                  <h2 className="mt-2 text-base font-semibold text-white">{s.t}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Real ingestion posture */}
        <section className="px-4 pb-10 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="surface-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Ingestion status</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
                    The board below is illustrative until the control plane has real reviewed
                    transcript rows. Today this page exposes the gate state honestly instead of
                    pretending the media engine is already running.
                  </p>
                </div>
                <Link href="/api/airwave/readiness" className="btn btn-ghost text-xs">
                  JSON readiness
                </Link>
                <Link href="/api/airwave/intake-readiness" className="btn btn-ghost text-xs">
                  Intake JSON
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                <StatusMetric label="Input lanes" value={String(control.summary.lanes)} />
                <StatusMetric label="Open" value={String(control.summary.open)} />
                <StatusMetric label="Legal holds" value={String(control.summary.legalHolds)} />
                <StatusMetric label="Manual review" value={String(control.summary.manualReview)} />
                <StatusMetric label="Review rows" value={String(intake.rows.reviewReady)} />
              </div>
              <div className="mt-5 rounded-xl border px-4 py-3" style={{ borderColor: BRAND_COLORS.steelGray, background: "rgba(7, 10, 20, 0.55)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Transcript intake proof</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">
                      Status: {intake.source.status}. Rows: {formatCount(intake.rows.total)}. This
                      validator reads only a configured local CSV/TSV and exposes counts, not
                      transcript text or file paths.
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                    writes rows: {String(intake.gates.canWriteRows)}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-2 md:grid-cols-2">
                {control.lanes.map((lane) => (
                  <div
                    key={lane.key}
                    className="rounded-xl border px-3 py-2"
                    style={{ borderColor: BRAND_COLORS.steelGray, background: "rgba(7, 10, 20, 0.55)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{lane.name}</p>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                        {lane.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">{lane.operatorAction}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* The ledger */}
        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <PunditLedger scorecards={scorecards} claims={claims} />
          </div>
        </section>

        {/* The honest note */}
        <section className="px-4 pb-24 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-ink-500">How to read this</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  The board above is <strong className="text-ink-100">illustrative</strong> — the
                  personas are fictional and the matchups are generic, so nothing here is a claim
                  about a living person. The method is the real thing: a take is paraphrased,
                  timestamped, and graded against what actually happened. Live capture of named
                  shows, and any public scorecard tied to a real person, are held behind a founder
                  gate and a legal review — never on by default, and never an audio archive.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-400">
                  The accountability index rewards making checkable calls and landing them. Emphatic
                  calls carry more weight than hedges, and un-checkable hot takes can never earn
                  credit — so volume without conviction trends toward zero, by design.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/intelligence" className="btn btn-ghost">Inside the engine</Link>
                <Link href="/academy" className="btn btn-ghost">The Academy</Link>
                <Link href="/ledger" className="btn btn-ghost">Trust Ledger</Link>
              </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}

function formatCount(value: number | "UNKNOWN"): string {
  return typeof value === "number" ? String(value) : value;
}
