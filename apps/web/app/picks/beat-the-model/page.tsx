import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  BeatTheModel,
  type BeatablePick,
  type BeatableSlate,
} from "@/components/picks/beat-the-model";
import type { PublicPick } from "@sports/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beat the Model — Free Pick'em · Galaxy Sports Edge",
  description:
    "Trust or fade the signals on today's board. A free, skill-based pick'em — nothing to pay, nothing to win but bragging rights. Results post only after the games settle.",
  alternates: { canonical: "/picks/beat-the-model" },
  robots: { index: false, follow: false },
};

// Additive funnel entry — default OFF. The route 404s unless explicitly
// enabled, so existing pages and the launch funnel are untouched until a
// human flips NEXT_PUBLIC_BEAT_THE_MODEL=1.
function isBeatTheModelEnabled(): boolean {
  const flag = process.env["NEXT_PUBLIC_BEAT_THE_MODEL"];
  return flag === "1" || flag === "true";
}

interface PicksResponse {
  success: boolean;
  data: PublicPick[];
  meta: { tier: string; total: number; date: string };
}

function getRequestOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  }
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

// Reuse the exact published-board fetch the /picks page uses. No new data
// source, no new dependency — grounds purely on what the model already
// publishes. On any non-OK response (bootstrap 503, degraded, error) we
// return an empty slate and the page shows the holding state.
async function fetchSlatePicks(): Promise<{ picks: PublicPick[]; date: string }> {
  const fallbackDate = new Date().toISOString().split("T")[0]!;
  try {
    const appUrl = getRequestOrigin();
    const res = await fetch(`${appUrl}/api/picks`, { next: { revalidate: 300 } });
    if (!res.ok) return { picks: [], date: fallbackDate };
    const body = (await res.json()) as PicksResponse;
    return { picks: body.data ?? [], date: body.meta?.date ?? fallbackDate };
  } catch {
    return { picks: [], date: fallbackDate };
  }
}

// Project the gated PublicPick down to the minimal, serializable shape the
// client pick'em needs. We deliberately drop confidence/edge/factorBreakdown —
// the pick'em only needs the public selection, the kick-off time, and the
// always-public `result` (which is settlement-gated upstream).
function toBeatable(pick: PublicPick): BeatablePick {
  return {
    id: pick.id,
    homeTeam: pick.game.homeTeam,
    awayTeam: pick.game.awayTeam,
    sport: pick.game.sport,
    commenceTime: pick.game.commenceTime,
    pickType: pick.pickType,
    selection: pick.selection,
    line: pick.line,
    pickGrade: pick.pickGrade,
    reasoningShort: pick.reasoningShort,
    dataQualityScore: pick.dataQualityScore,
    result: pick.result,
  };
}

const RULES = [
  "Free — nothing to pay",
  "Skill, not chance",
  "Up to 5 calls per slate",
  "Trust or fade each signal",
  "Submit before kick-off",
  "Results after settlement",
];

export default async function BeatTheModelPage(): Promise<JSX.Element> {
  if (!isBeatTheModelEnabled()) {
    notFound();
  }

  const { picks, date } = await fetchSlatePicks();
  const beatablePicks = picks
    .slice(0, 12)
    .map(toBeatable);
  const slate: BeatableSlate = { date, picks: beatablePicks };

  return (
    <div className="flex min-h-screen flex-col bg-surface-base text-ion-white">
      <Nav />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          {/* Header */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
              Beat the Model
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-ion-white">
              You vs. the board.
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ion-1">
              The model already published its signals for today. Your job: decide
              which ones you <span className="text-orbital-cyan">trust</span> and
              which ones you <span className="text-alert">fade</span>. Free, skill
              only — nothing to pay, nothing to win but bragging rights.
              You&apos;re graded against the board&apos;s real outcomes after the
              games settle.
            </p>
          </div>

          {/* Rules chip strip */}
          <div className="flex flex-wrap gap-3">
            {RULES.map((rule) => (
              <span
                key={rule}
                className="rounded-full border border-surface-line bg-surface-raised px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ion-2"
              >
                {rule}
              </span>
            ))}
          </div>

          {/* Content */}
          {beatablePicks.length === 0 ? (
            <div className="rounded-ds-md border border-surface-line bg-surface-raised px-6 py-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                No board today
              </p>
              <h2 className="mt-3 text-xl font-semibold text-ion-white">
                No published signals to call yet.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ion-1">
                Beat the Model runs off the signals on Today&apos;s Board. When the
                board publishes picks, they show up here to trust or fade.
              </p>
              <div className="mt-6">
                <Link
                  href="/picks"
                  className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-4 py-2 text-sm font-semibold text-ion-2 transition-colors hover:border-orbital-cyan hover:text-ion-white"
                >
                  See Today&apos;s Board
                </Link>
              </div>
            </div>
          ) : (
            <BeatTheModel slate={slate} />
          )}

          {/* How it works */}
          <section className="flex flex-col gap-4 rounded-ds-md border border-surface-line bg-surface-raised px-5 py-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                How it works
              </p>
              <h2 className="mt-1 text-base font-semibold text-ion-white">
                Read the signal. Trust it or fade it.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Read the board",
                  body: "Every signal here is one the model already published — same selection, same grade, same reasoning you see on Today's Board.",
                },
                {
                  step: "02",
                  title: "Trust or fade",
                  body: "Hit TRUST if you think the model is right, FADE if you think it misses. Up to 5 calls. Submit before kick-off — swap freely until then.",
                },
                {
                  step: "03",
                  title: "See how you did",
                  body: "After each game settles, your calls are graded against the board's real published outcome. Nothing is shown before settlement.",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] font-semibold tracking-widest text-orbital-cyan">
                    {s.step}
                  </span>
                  <p className="text-sm font-semibold text-ion-white">{s.title}</p>
                  <p className="text-sm leading-6 text-ion-1">{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
