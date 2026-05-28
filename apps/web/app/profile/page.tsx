import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Betting Brain Profile — ${BRAND_NAME}`,
  description:
    "Understand your decision-making style, identify your behavioral patterns, and configure Galaxy to match your analytical approach. Your profile shapes your briefing, your alerts, and your risk framing.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: true },
};

const PROFILE_DIMENSIONS = [
  {
    id: "risk-tolerance",
    label: "Risk Tolerance",
    description:
      "How you naturally size bets and respond to variance. Not how you think you should — how you actually do.",
    options: [
      {
        value: "conservative",
        label: "Conservative",
        sub: "Flat-bet only. 1–2% of bankroll max. Long-run thinking.",
      },
      {
        value: "moderate",
        label: "Moderate",
        sub: "Sized by confidence. 1–3% range. Occasional aggressive spot.",
      },
      {
        value: "aggressive",
        label: "Aggressive",
        sub: "Variable sizing. CLV-chasing. Willing to accept draw-down.",
      },
    ],
  },
  {
    id: "betting-style",
    label: "Primary Approach",
    description:
      "Your dominant research method when identifying a potential play.",
    options: [
      {
        value: "model-first",
        label: "Model-first",
        sub: "Confidence scores, line movement, and factor trails before anything else.",
      },
      {
        value: "situational",
        label: "Situational",
        sub: "Rest, travel, schedule context, injury impact — matchup-driven.",
      },
      {
        value: "market-reader",
        label: "Market-reader",
        sub: "Line movement, sharp signals, book disagreement are the primary lens.",
      },
    ],
  },
  {
    id: "volume",
    label: "Betting Volume",
    description:
      "How many games you typically act on per week during peak season.",
    options: [
      {
        value: "selective",
        label: "Selective",
        sub: "1–3 bets per week. Only act on high-conviction spots.",
      },
      {
        value: "moderate",
        label: "Moderate",
        sub: "4–8 bets per week. Mix of high and medium confidence.",
      },
      {
        value: "active",
        label: "Active",
        sub: "9+ bets per week. Cover multiple sports simultaneously.",
      },
    ],
  },
  {
    id: "tilt-trigger",
    label: "Tilt Vulnerability",
    description:
      "Which situation most frequently pulls you off your process?",
    options: [
      {
        value: "loss-chasing",
        label: "Loss-chasing",
        sub: "After a bad beat, I find myself looking for the recovery play.",
      },
      {
        value: "fomo",
        label: "Line FOMO",
        sub: "When a line moves against me, I feel pressure to act before it moves more.",
      },
      {
        value: "overconfidence",
        label: "Win-streak overconfidence",
        sub: "After a good run, I start sizing up or acting on weaker signals.",
      },
    ],
  },
  {
    id: "sport-depth",
    label: "Primary Sport",
    description: "Where you have the deepest domain knowledge.",
    options: [
      { value: "nfl", label: "NFL", sub: "Spread, totals, situational spots." },
      { value: "nba", label: "NBA", sub: "Rest, usage, pace, props." },
      { value: "mlb", label: "MLB", sub: "Pitcher, park, totals, moneyline value." },
    ],
  },
] as const;

const PROFILE_TRAITS: Array<{
  id: string;
  label: string;
  description: string;
  approach: string;
  riskNote: string;
  color: string;
}> = [
  {
    id: "sharp-disciplined",
    label: "Sharp & Disciplined",
    description:
      "You apply process before emotion. You skip games readily. Your win rate is above your experience level because you protect yourself from bad-process bets.",
    approach: "Model-first + flat betting + selective volume + long-run thinking.",
    riskNote:
      "Watch for: under-betting high-edge spots because the process feels 'too easy.' Edge is earned slowly.",
    color: "border-l-cyan-500",
  },
  {
    id: "situational-reader",
    label: "Situational Reader",
    description:
      "You find edges in context others miss — rest, travel, lineup, motivation. Your research is qualitative and matchup-driven.",
    approach:
      "Situational + moderate sizing + selective on high-conviction spots.",
    riskNote:
      "Watch for: narrative bias. Situational context is real, but it must confirm the model, not replace it.",
    color: "border-l-violet-500",
  },
  {
    id: "market-mover",
    label: "Market Follower",
    description:
      "You're fast. You read line movement intuitively. Your edge comes from acting before the market reprices.",
    approach: "Market-reader + variable sizing + moderate volume + speed.",
    riskNote:
      "Watch for: steam chasing. Following a move you didn't identify is not edge — it's catching up to one.",
    color: "border-l-amber-500",
  },
  {
    id: "action-driven",
    label: "Action-Driven",
    description:
      "You enjoy the process and act frequently. Volume can work — but only with strict per-bet discipline.",
    approach: "High volume + strict 1% flat-bet cap + must clear the No-Bet list before acting.",
    riskNote:
      "Watch for: quantity as a substitute for quality. More bets at lower conviction is negative-EV by definition.",
    color: "border-l-rose-500",
  },
];

export default async function ProfilePage(): Promise<JSX.Element> {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main>
        {/* Hero */}
        <section className="border-b border-mineral px-4 pb-20 pt-20 sm:px-6 sm:pb-28 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-ion-blue">
              Betting Brain Profile
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Know your decision style.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Galaxy adapts to how you actually think. Your profile shapes your daily briefing,
              your risk framing, and the order of what gets surfaced. It takes four minutes and
              replaces years of wondering why the same mistakes keep happening.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-gray-600">
              Self-assessment · No account required · No personal data stored
            </p>
          </div>
        </section>

        {/* Profile Dimensions */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
                Five dimensions
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                What does your process actually look like?
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Answer honestly — not how you aspire to bet, but how you actually do.
                The profile is useful only if it's accurate.
              </p>
            </div>

            <div className="space-y-10">
              {PROFILE_DIMENSIONS.map((dim, dimIdx) => (
                <div
                  key={dim.id}
                  className="rounded-xl border border-mineral bg-gray-900/30 p-6"
                >
                  <div className="mb-1 flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold text-ion-blue">
                      {String(dimIdx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-lg font-bold text-white">{dim.label}</h3>
                  </div>
                  <p className="mb-5 text-sm text-gray-500">{dim.description}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {dim.options.map((opt) => (
                      <div
                        key={opt.value}
                        className="cursor-default rounded-lg border border-mineral bg-carbon/60 p-4 transition-colors hover:border-gray-600"
                      >
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{opt.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Profile Types */}
        <section className="border-y border-mineral bg-gray-900/20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-500">
                Bettor archetypes
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Which profile fits you?
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                These archetypes describe where process typically succeeds or breaks down.
                None is better — each has edge potential and a corresponding failure mode.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {PROFILE_TRAITS.map((trait) => (
                <div
                  key={trait.id}
                  className={`rounded-xl border border-mineral bg-gray-900/40 border-l-4 ${trait.color} p-6`}
                >
                  <h3 className="text-lg font-bold text-white">{trait.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{trait.description}</p>
                  <div className="mt-4 rounded border border-mineral bg-carbon/50 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
                      Approach
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{trait.approach}</p>
                  </div>
                  <div className="mt-3 rounded border border-amber-900/40 bg-amber-950/20 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-600">
                      Watch for
                    </p>
                    <p className="mt-1 text-xs text-amber-200/70">{trait.riskNote}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How Profile Shapes Galaxy */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-white">How your profile shapes Galaxy.</h2>
              <p className="mt-3 text-sm text-gray-500">
                Every surface adapts. The same pick reads differently for a conservative bettor
                vs. an active market-reader.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  surface: "Daily Briefing",
                  href: "/briefing",
                  impact:
                    "Conservative profiles see volume warnings. Active profiles see exposure flags. Both see the same picks.",
                },
                {
                  surface: "Pass List",
                  href: "/no-bet",
                  impact:
                    "Your tilt trigger shapes the warning framing. Loss-chasers see an extra friction gate on day-after plays.",
                },
                {
                  surface: "Pick Confidence",
                  href: "/picks",
                  impact:
                    "Risk-averse profiles see moderate picks flagged as higher-risk. Market readers see timing context added.",
                },
                {
                  surface: "Academy",
                  href: "/academy",
                  impact:
                    "Module recommendations match your identified vulnerability — tilt recognition, steam chasing, or overconfidence.",
                },
                {
                  surface: "Command Center",
                  href: "/command",
                  impact:
                    "Exposure analysis is calibrated to your stated volume. Conservative profiles get earlier exposure warnings.",
                },
                {
                  surface: "Alerts",
                  href: "/alerts",
                  impact:
                    "Market-reader profiles get line movement alerts first. Situational profiles get injury/lineup priority.",
                },
              ].map(({ surface, href, impact }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-xl border border-mineral bg-gray-900/40 p-5 transition-colors hover:border-gray-600"
                >
                  <p className="text-sm font-bold text-white group-hover:text-cyan-100">
                    {surface}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{impact}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue group-hover:text-cyan-300">
                    Open →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Academy CTA */}
        <section className="border-t border-mineral px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Related learning
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              Profile is just the start.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
              The Academy's Edge Track is built specifically for bettors who have identified
              their failure mode and are ready to build structural protection against it.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/academy"
                className="rounded-lg bg-ion-blue/10 px-6 py-3 text-sm font-semibold text-ion-blue ring-1 ring-ion-blue/30 hover:bg-ion-blue/20"
              >
                Open the Academy
              </Link>
              <Link
                href="/no-bet"
                className="rounded-lg border border-mineral px-6 py-3 text-sm font-semibold text-gray-300 hover:border-gray-500"
              >
                Read the No-Bet Doctrine
              </Link>
              <Link
                href="/methodology"
                className="rounded-lg border border-mineral px-6 py-3 text-sm font-semibold text-gray-300 hover:border-gray-500"
              >
                Scoring Methodology
              </Link>
            </div>
          </div>
        </section>

        <RiskDisclosure variant="card" includePastPerformance className="mx-auto max-w-4xl px-4 pb-12" />
      </main>
      <Footer />
    </div>
  );
}
