import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Smart Alerts — Galaxy Sports Edge",
  description:
    "Configure pick alerts, line movement notifications, and board state changes. Alerts fire when signals fire — not on a content schedule.",
  alternates: { canonical: "/alerts" },
};

// ─────────────────────────────────────────────
// Alert type data
// ─────────────────────────────────────────────

type AlertTier = "free" | "pro" | "elite";

type AlertCard = {
  readonly title: string;
  readonly description: string;
  readonly tiers: ReadonlyArray<AlertTier>;
  readonly tierLabel: string;
};

const ALERT_TYPES: ReadonlyArray<AlertCard> = [
  {
    title: "New Pick Published",
    description:
      "Get notified the moment a pick clears the gate.",
    tiers: ["free", "pro", "elite"],
    tierLabel: "Free: 1/day · Pro: All · Elite: All",
  },
  {
    title: "Featured Pick",
    description: "High-conviction picks flagged with extra urgency.",
    tiers: ["pro", "elite"],
    tierLabel: "Pro + Elite",
  },
  {
    title: "Line Movement Alert",
    description:
      "When a line moves significantly after Galaxy scores it.",
    tiers: ["pro", "elite"],
    tierLabel: "Pro + Elite",
  },
  {
    title: "Board State Change",
    description: "When the board opens or closes for the day.",
    tiers: ["free", "pro", "elite"],
    tierLabel: "Free · Pro · Elite",
  },
  {
    title: "Rumor Elevation",
    description:
      "When a rumor signal moves from Watchlist to Elevated.",
    tiers: ["elite"],
    tierLabel: "Elite only",
  },
  {
    title: "Market Gravity Spike",
    description:
      "When Market Gravity detects anomalous movement.",
    tiers: ["elite"],
    tierLabel: "Elite only",
  },
] as const;

// ─────────────────────────────────────────────
// Delivery channel data
// ─────────────────────────────────────────────

type ChannelPhase = "Phase 1" | "Phase 2" | "Phase 3";

type DeliveryChannel = {
  readonly name: string;
  readonly phase: ChannelPhase;
  readonly note: string;
};

const DELIVERY_CHANNELS: ReadonlyArray<DeliveryChannel> = [
  {
    name: "Email",
    phase: "Phase 1",
    note: "Available now",
  },
  {
    name: "Push (browser)",
    phase: "Phase 2",
    note: "Coming soon",
  },
  {
    name: "Discord DM",
    phase: "Phase 2",
    note: "Coming soon",
  },
  {
    name: "SMS",
    phase: "Phase 3",
    note: "On the roadmap",
  },
] as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function TierBadge({ tier }: { tier: AlertTier }) {
  const styles: Record<AlertTier, string> = {
    free: "bg-gray-800 text-gray-300 border border-gray-700",
    pro: "bg-brand-950/60 text-brand-300 border border-brand-700/60",
    elite: "bg-ultraviolet/10 text-ultraviolet-glow border border-ultraviolet/40",
  };
  const labels: Record<AlertTier, string> = {
    free: "Free",
    pro: "Pro",
    elite: "Elite",
  };
  return (
    <span
      className={[
        "inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
        styles[tier],
      ].join(" ")}
    >
      {labels[tier]}
    </span>
  );
}

function PhaseTag({ phase }: { phase: ChannelPhase }) {
  const isLive = phase === "Phase 1";
  return (
    <span
      className={[
        "inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
        isLive
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          : "bg-gray-800 text-gray-500 border border-gray-700",
      ].join(" ")}
    >
      {phase}
    </span>
  );
}

function BellIcon() {
  return (
    <svg
      className="h-5 w-5 text-amber-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function AlertsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* ── HERO ─────────────────────────────────── */}
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
                Smart Alerts
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Get notified when the{" "}
              <span className="text-amber-400">signals matter.</span>
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-lg font-medium text-gray-400">
              Not on a content schedule.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base text-gray-400 leading-relaxed">
              Configure alerts for published picks, line movement, injury news,
              and board state changes. When a signal fires — you hear about it.
              Not at 9am because it&apos;s Tuesday.
            </p>
          </div>

          {/* ── ALERT TYPES ──────────────────────────── */}
          <section className="mt-16">
            <div className="mb-8 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-500/70">
                Alert types
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Six signal classes. Zero filler.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ALERT_TYPES.map((alert) => {
                const isEliteOnly = alert.tiers.length === 1 && alert.tiers[0] === "elite";
                const isProPlus = alert.tiers.includes("pro") && !alert.tiers.includes("free");
                return (
                  <div
                    key={alert.title}
                    className={[
                      "relative flex flex-col gap-3 rounded-2xl border p-5",
                      isEliteOnly
                        ? "border-ultraviolet/30 bg-ultraviolet/5"
                        : isProPlus
                          ? "border-brand-700/40 bg-brand-950/20"
                          : "border-gray-800 bg-gray-900/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BellIcon />
                        <h3 className="text-sm font-bold text-white">
                          {alert.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-gray-400">
                      {alert.description}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      {alert.tiers.map((tier) => (
                        <TierBadge key={tier} tier={tier} />
                      ))}
                    </div>

                    <p className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">
                      {alert.tierLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── DELIVERY CHANNELS ────────────────────── */}
          <section className="mt-16">
            <div className="mb-6 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-500/70">
                Delivery channels
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Where alerts reach you.
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Channel
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Phase
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {DELIVERY_CHANNELS.map((channel, i) => (
                    <tr
                      key={channel.name}
                      className={[
                        "border-b border-gray-800/60 transition-colors hover:bg-gray-900/30",
                        i % 2 === 0 ? "bg-gray-900/10" : "",
                      ].join(" ")}
                    >
                      <td className="px-5 py-4 font-medium text-gray-200">
                        {channel.name}
                      </td>
                      <td className="px-5 py-4">
                        <PhaseTag phase={channel.phase} />
                      </td>
                      <td className="px-5 py-4 text-gray-400">{channel.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── CADENCE NOTE ─────────────────────────── */}
          <section className="mt-12">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                  <svg
                    className="h-4 w-4 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-300">
                    Alert cadence
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                    Galaxy does not send alerts on a content schedule. An alert
                    fires when a signal fires — not at 9am because it&apos;s
                    Tuesday. Most days:{" "}
                    <span className="text-gray-200 font-medium">1–3 alerts.</span>{" "}
                    High-volume slate days:{" "}
                    <span className="text-gray-200 font-medium">up to 8.</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────── */}
          <section className="mt-14 text-center">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 px-8 py-10">
              <h2 className="text-2xl font-bold text-white">
                Ready to configure your alerts?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray-400 leading-relaxed">
                Alert preferences live in your dashboard. Sign in to set which
                signals reach you, how urgently, and over which channel.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard"
                  className="btn btn-primary px-7 py-3 text-sm font-semibold"
                >
                  Configure alerts in your dashboard →
                </Link>
                <Link
                  href="/pricing"
                  className="btn btn-ghost px-7 py-3 text-sm font-semibold"
                >
                  See what each tier unlocks
                </Link>
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-gray-600">
                Requires account · Free tier included
              </p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}
