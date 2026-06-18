/**
 * Distribution channels config — Workstream M3 (/cockpit/channels).
 *
 * Source: docs/revenue/revenue-operating-system.md, "Revenue lanes & priority order"
 * and "Workstream M — Revenue Operating System".
 *
 * HONESTY RULES (non-negotiable):
 * - Follower counts, view counts, subscriber counts: NOT fabricated.
 *   Every metric field is null with an explicit note.
 * - Status is honestly "not_started" or "building" — never inflated.
 * - "unknown — connect the channel" is the correct honest state before
 *   a real analytics integration is wired.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ChannelRole =
  | "acquisition"   // top-of-funnel: drives new audience
  | "owned"         // owned audience: immune to algorithm changes
  | "trust";        // authority building: long-form, deep engagement

export type ChannelStatus =
  | "not_started"
  | "building"
  | "active";

export interface ChannelMetricField {
  /** e.g. "Subscribers", "Followers", "Open rate" */
  readonly label: string;
  /**
   * Always null — connect the channel to wire real metrics.
   * Shown as "unknown — connect the channel" in the UI.
   */
  readonly value: null;
  readonly note: string;
}

export interface Channel {
  readonly id: string;
  readonly name: string;
  readonly role: ChannelRole;
  readonly status: ChannelStatus;
  /** Which internal agent drives this channel */
  readonly ownerAgent: string;
  /** What this channel does in the flywheel */
  readonly purpose: string;
  /** Metrics are null until the channel is connected to a real analytics source */
  readonly metrics: readonly ChannelMetricField[];
  /** Priority from the revenue doctrine (lane number) */
  readonly priority: number;
  /** The owner action blocking this channel's first publish */
  readonly blockedOn: string | null;
}

// ── Channel definitions ───────────────────────────────────────────────────────
// Source: revenue-operating-system.md "Revenue lanes" and "Workstream M"

export const CHANNELS: readonly Channel[] = [
  {
    id: "youtube",
    name: "YouTube",
    role: "trust",
    status: "not_started",
    ownerAgent: "AVA",
    purpose:
      "Long-form trust engine. Primary conversion surface for Founding Desk. Ad revenue comes later — authority comes first.",
    priority: 4,
    blockedOn: "Owner YouTube channel (external account — create at youtube.com)",
    metrics: [
      {
        label: "Subscribers",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Views (last 30 days)",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Watch time (hours)",
        value: null,
        note: "unknown — connect the channel",
      },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    role: "acquisition",
    status: "not_started",
    ownerAgent: "AVA",
    purpose:
      "Top-of-funnel hook lab. DM/visual trust → funnel → email signup. 3 Shorts/Reels per Desk brief.",
    priority: 5,
    blockedOn: "Owner TikTok account (external — create at tiktok.com)",
    metrics: [
      {
        label: "Followers",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Views (last 30 days)",
        value: null,
        note: "unknown — connect the channel",
      },
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    role: "acquisition",
    status: "not_started",
    ownerAgent: "AVA",
    purpose:
      "Visual trust + Reels top-of-funnel. Carousel format for data breakdowns. Drives to link-in-bio → email signup.",
    priority: 5,
    blockedOn: "Owner Instagram account (external — create at instagram.com)",
    metrics: [
      {
        label: "Followers",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Reel views (last 30 days)",
        value: null,
        note: "unknown — connect the channel",
      },
    ],
  },
  {
    id: "podcast",
    name: "Podcast",
    role: "trust",
    status: "not_started",
    ownerAgent: "AVA",
    purpose:
      "Audio version of the Galaxy Desk brief. Authority + sponsor inventory. Deep engagement format.",
    priority: 6,
    blockedOn:
      "Owner podcast host account (Transistor or Anchor — external) + first recorded episode",
    metrics: [
      {
        label: "Downloads (last 30 days)",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Subscribers",
        value: null,
        note: "unknown — connect the channel",
      },
    ],
  },
  {
    id: "newsletter",
    name: "Newsletter",
    role: "owned",
    status: "not_started",
    ownerAgent: "FLARE",
    purpose:
      "Owned audience — immune to algorithm changes. Galaxy Desk Note (free) + Premium Brief (paid). Bridge from social to subscription.",
    priority: 3,
    blockedOn:
      "Email provider API key (choose Resend / Buttondown / ConvertKit, create account, set env var)",
    metrics: [
      {
        label: "Subscribers",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Open rate",
        value: null,
        note: "unknown — connect the channel",
      },
      {
        label: "Click rate",
        value: null,
        note: "unknown — connect the channel",
      },
    ],
  },
  {
    id: "website",
    name: "Website / Galaxy",
    role: "owned",
    status: "building",
    ownerAgent: "FLARE",
    purpose:
      "Owned platform. Founding Desk home, Ask Galaxy intake, trust room, no-bet library, free picks. The conversion hub.",
    priority: 1,
    blockedOn: null,
    metrics: [
      {
        label: "Monthly visitors",
        value: null,
        note: "unknown — wire an analytics provider (e.g. Plausible, Vercel Analytics)",
      },
      {
        label: "Ask Galaxy submissions",
        value: null,
        note: "real count available at /cockpit/customer-proof (DB-backed)",
      },
      {
        label: "Email signups",
        value: null,
        note: "real count available at /cockpit/customer-proof (DB-backed)",
      },
    ],
  },
  {
    id: "direct-outreach",
    name: "Direct outreach",
    role: "acquisition",
    status: "not_started",
    ownerAgent: "FLARE",
    purpose:
      "DM-based 1:1 outreach to potential Founding Desk members, creators, sponsors, and community leads. High-leverage before audience exists.",
    priority: 7,
    blockedOn: null,
    metrics: [
      {
        label: "Outreach sent (last 30 days)",
        value: null,
        note: "unknown — not yet instrumented",
      },
      {
        label: "Responses",
        value: null,
        note: "unknown — not yet instrumented",
      },
    ],
  },
];

// ── Labels ────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<ChannelRole, string> = {
  acquisition: "Acquisition",
  owned: "Owned",
  trust: "Trust / authority",
};

export const STATUS_LABELS: Record<ChannelStatus, string> = {
  not_started: "Not started",
  building: "Building",
  active: "Active",
};
