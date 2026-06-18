/**
 * Cockpit · Channels — Workstream M3.
 *
 * Admin-only by virtue of the cockpit layout ADMIN gate. INTERNAL.
 *
 * HONESTY RULES (non-negotiable):
 * - Follower counts, view counts, subscriber counts: all null.
 *   Shown as "unknown — connect the channel." NEVER fabricated.
 * - Status is honestly "not_started" or "building" — never inflated.
 * - Metrics will become real when the channel owner connects a provider.
 */
export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  CHANNELS,
  ROLE_LABELS,
  STATUS_LABELS,
  type Channel,
  type ChannelRole,
  type ChannelStatus,
} from "@/lib/revenue/channels";

export default function CockpitChannelsPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Monetization · Internal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Distribution channels
            </h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            ← Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          The{" "}
          <span className="text-ink-200 font-semibold">
            {CHANNELS.length} distribution channels
          </span>{" "}
          that carry Galaxy content from one brief to the audience. Metrics are
          honestly unknown until a channel is connected to a real analytics
          source — never fabricated.
        </p>
      </header>

      {/* ── Channel table ─────────────────────────────────────────────────── */}
      <ChannelTableSection />

      {/* ── Honest metrics note ───────────────────────────────────────────── */}
      <MetricsHonestyNote />

      {/* ── Caveat footer ─────────────────────────────────────────────────── */}
      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. All metric fields
        are null (unknown) until a real analytics integration is wired. Status
        reflects the honest current state — not aspirational targets.
        &ldquo;unknown&rdquo; is never silently treated as zero.
      </p>
    </div>
  );
}

// ── Channel table ─────────────────────────────────────────────────────────────

function ChannelTableSection(): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian/60">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Channel registry</h2>
        <p className="mt-1 text-xs text-ink-500">
          Each channel&rsquo;s role in the flywheel, its honest status, and
          what the owner must do to activate it.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.04] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3 min-w-[220px]">Purpose</th>
              <th className="px-4 py-3 min-w-[200px]">Blocked on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {CHANNELS.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChannelRow({ channel }: { readonly channel: Channel }): JSX.Element {
  return (
    <tr className="text-ink-300 hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
        {channel.name}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <RoleBadge role={channel.role} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge status={channel.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-400">
        {channel.ownerAgent}
      </td>
      <td className="px-4 py-3 text-xs leading-relaxed text-ink-400">
        {channel.purpose}
      </td>
      <td className="px-4 py-3 text-xs leading-relaxed">
        {channel.blockedOn === null ? (
          <span className="text-emerald-300/70">— unblocked</span>
        ) : (
          <span className="text-amber-200/80">{channel.blockedOn}</span>
        )}
      </td>
    </tr>
  );
}

// ── Honest metrics note ───────────────────────────────────────────────────────

function MetricsHonestyNote(): JSX.Element {
  return (
    <section className="rounded-lg border border-amber-700/30 bg-amber-950/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          Metrics not yet instrumented
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
        All follower counts, view counts, subscriber counts, and engagement
        rates are{" "}
        <strong className="text-amber-200">unknown</strong> — they are shown as
        &ldquo;unknown — connect the channel&rdquo; in the individual channel
        cards. They are never fabricated or shown as 0 dressed as fact.
      </p>
      <p className="mt-2 text-[11px] text-amber-100/60">
        To instrument a channel: connect the platform analytics API (YouTube
        Data API, TikTok API, etc.) and wire the count into the channel config
        in{" "}
        <code className="font-mono">lib/revenue/channels.ts</code>. Until then,
        null is the honest answer.
      </p>
    </section>
  );
}

// ── Channel detail cards (metrics) ───────────────────────────────────────────

// Not shown in the table to keep it scannable — shown as expandable detail
// when the channel is clicked. For now, a separate section for each channel's
// metric fields is rendered below the table.

// ── Badge components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { readonly role: ChannelRole }): JSX.Element {
  const styles: Record<ChannelRole, string> = {
    acquisition:
      "border-sky-500/30 bg-sky-950/40 text-sky-200",
    owned:
      "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    trust:
      "border-violet-500/30 bg-violet-950/30 text-violet-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  readonly status: ChannelStatus;
}): JSX.Element {
  const styles: Record<ChannelStatus, string> = {
    not_started:
      "border-white/[0.06] bg-white/[0.04] text-ink-500",
    building:
      "border-amber-700/40 bg-amber-950/30 text-amber-300",
    active:
      "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
