/**
 * Distribution Sources — Workstream M channel lanes.
 *
 * Source: docs/revenue/revenue-operating-system.md, "Revenue lanes & priority order"
 * and "Workstream M — Revenue Operating System".
 *
 * HONESTY RULES (non-negotiable):
 * - All channels are status: "not_connected" until a real analytics integration exists.
 * - No follower counts, subscriber counts, or view counts — no metrics are fabricated.
 * - ownerAction describes the real external step the owner must take to activate the channel.
 *
 * This config is surface-ready for /cockpit/channels but does NOT edit that page.
 * No scraping is enabled. No extraction is enabled. This is config only.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type DistributionRole =
  | "acquisition"   // Top-of-funnel: drives new audience to the platform
  | "owned"         // Owned audience: immune to algorithm changes (email, RSS, Discord)
  | "trust";        // Authority building: long-form, deep engagement

/** Honest connection status — "not_connected" until a real analytics source is wired. */
export type DistributionStatus = "not_connected" | "connected";

export interface DistributionSource {
  readonly id: string;
  readonly label: string;
  /** What this channel does in the Workstream M flywheel */
  readonly role: DistributionRole;
  /**
   * Always "not_connected" until the channel is wired to a real analytics integration.
   * Do NOT set to "connected" without a real data source.
   */
  readonly status: DistributionStatus;
  /** The owner action that must happen before the channel can publish its first piece. */
  readonly ownerAction: string;
  /** Optional: the lane priority from the revenue doctrine (lower = higher priority). */
  readonly priority: number;
}

// ── Channel definitions ───────────────────────────────────────────────────────

export const DISTRIBUTION_SOURCES: readonly DistributionSource[] = [
  {
    id: "youtube",
    label: "YouTube",
    role: "trust",
    status: "not_connected",
    ownerAction:
      "Create a YouTube channel at youtube.com, then connect it to the cockpit " +
      "via a YouTube Data API v3 key (set YOUTUBE_API_KEY env var).",
    priority: 4,
  },
  {
    id: "tiktok",
    label: "TikTok",
    role: "acquisition",
    status: "not_connected",
    ownerAction:
      "Create a TikTok account at tiktok.com, then connect it via TikTok for " +
      "Developers (set TIKTOK_ACCESS_TOKEN env var).",
    priority: 5,
  },
  {
    id: "instagram",
    label: "Instagram",
    role: "acquisition",
    status: "not_connected",
    ownerAction:
      "Create an Instagram Business account at instagram.com, then connect it " +
      "via the Instagram Graph API (set INSTAGRAM_ACCESS_TOKEN env var).",
    priority: 5,
  },
  {
    id: "discord",
    label: "Discord",
    role: "owned",
    status: "not_connected",
    ownerAction:
      "Create a Discord server at discord.com, then add a bot with the " +
      "DISCORD_BOT_TOKEN env var to enable cockpit integration and member count reporting.",
    priority: 6,
  },
  {
    id: "telegram",
    label: "Telegram",
    role: "owned",
    status: "not_connected",
    ownerAction:
      "Create a Telegram channel or group via t.me, then connect it via the " +
      "Telegram Bot API (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID env vars).",
    priority: 6,
  },
  {
    id: "rss",
    label: "RSS / Syndication",
    role: "owned",
    status: "not_connected",
    ownerAction:
      "The RSS feed is generated from published picks and blog posts. Enable it " +
      "by deploying the /api/feed/rss route and confirming the output is valid " +
      "RSS 2.0. No external account required.",
    priority: 7,
  },
  {
    id: "newsletter",
    label: "Newsletter",
    role: "owned",
    status: "not_connected",
    ownerAction:
      "Choose an email provider (Resend, Buttondown, or ConvertKit), create an " +
      "account, and set the provider API key env var. Wire the subscriber list " +
      "to the /api/newsletter/subscribe route.",
    priority: 3,
  },
];

// ── Labels ────────────────────────────────────────────────────────────────────

export const DISTRIBUTION_ROLE_LABELS: Record<DistributionRole, string> = {
  acquisition: "Acquisition",
  owned: "Owned",
  trust: "Trust / authority",
};

export const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  not_connected: "Not connected",
  connected: "Connected",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns all channels sorted by priority (ascending = highest priority first). */
export function getDistributionSourcesByPriority(): readonly DistributionSource[] {
  return [...DISTRIBUTION_SOURCES].sort((a, b) => a.priority - b.priority);
}

/** Returns channels by role. */
export function getDistributionSourcesByRole(
  role: DistributionRole,
): readonly DistributionSource[] {
  return DISTRIBUTION_SOURCES.filter((s) => s.role === role);
}
