/**
 * Notification formatting utilities — pure, zero dependencies.
 *
 * Alert templates, push notification payloads, email subject lines,
 * SMS/short-form messages, and notification priority logic for
 * sports picks, odds changes, and subscription events.
 */

export type NotificationChannel = "push" | "email" | "sms" | "in-app";

export type NotificationPriority = "critical" | "high" | "normal" | "low";

export type NotificationEvent =
  | "new_pick"
  | "pick_result"
  | "odds_change"
  | "line_move"
  | "subscription_welcome"
  | "subscription_renewal"
  | "subscription_expiring"
  | "trial_ending"
  | "account_alert";

export interface NotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly priority: NotificationPriority;
  readonly channel: NotificationChannel;
  readonly data?: Record<string, string>;
}

export interface PickNotification {
  readonly sport: string;
  readonly game: string;            // e.g., "Chiefs vs Ravens"
  readonly pick: string;            // e.g., "Chiefs -3.5"
  readonly confidence: number;      // 0-100
  readonly tier: "signal" | "edge" | "sharp" | "apex";
  readonly odds: string;            // e.g., "-110"
}

export interface OddsChangeNotification {
  readonly game: string;
  readonly pick: string;
  readonly oldOdds: string;
  readonly newOdds: string;
  readonly direction: "favorable" | "unfavorable" | "neutral";
}

// ─── Pick alerts ─────────────────────────────────────────────────────────────

/**
 * Short title for a new pick alert.
 * "New Edge Pick: NFL"
 */
export function pickAlertTitle(pick: PickNotification): string {
  const tier = pick.tier.charAt(0).toUpperCase() + pick.tier.slice(1);
  return `New ${tier} Pick: ${pick.sport}`;
}

/**
 * Body text for a pick notification, adapted to channel.
 * push/sms (short): "{game} → {pick} ({odds})"
 * email/in-app (long): multi-line with confidence
 */
export function pickAlertBody(pick: PickNotification, channel: NotificationChannel): string {
  if (channel === "push" || channel === "sms") {
    return `${pick.game} → ${pick.pick} (${pick.odds})`;
  }
  return `${pick.game}\nPick: ${pick.pick} at ${pick.odds}\nConfidence: ${pick.confidence}%`;
}

// ─── Odds change alerts ───────────────────────────────────────────────────────

/**
 * Title for an odds change alert.
 * direction: "Improved" | "Worsened" | "Changed"
 */
export function oddsChangeTitle(change: OddsChangeNotification): string {
  const directionLabel =
    change.direction === "favorable"
      ? "Improved"
      : change.direction === "unfavorable"
        ? "Worsened"
        : "Changed";
  return `Odds ${directionLabel} for ${change.pick}`;
}

/**
 * Body text for an odds change alert, adapted to channel.
 * short (push/sms): "{game}: {pick} {oldOdds} → {newOdds}"
 * long (email/in-app): multi-line with direction label
 */
export function oddsChangeBody(change: OddsChangeNotification, channel: NotificationChannel): string {
  if (channel === "push" || channel === "sms") {
    return `${change.game}: ${change.pick} ${change.oldOdds} → ${change.newOdds}`;
  }
  const directionLabel =
    change.direction === "favorable"
      ? "improved"
      : change.direction === "unfavorable"
        ? "worsened"
        : "neutral";
  return `${change.game}\n${change.pick}: ${change.oldOdds} → ${change.newOdds}\nLine ${directionLabel}`;
}

// ─── Result alerts ────────────────────────────────────────────────────────────

/**
 * Result notification title.
 * win: "✓ {pick} — Won"
 * loss: "✗ {pick} — Loss"
 * push: "↔ {pick} — Push"
 */
export function resultTitle(pick: string, result: "win" | "loss" | "push"): string {
  if (result === "win") return `✓ ${pick} — Won`;
  if (result === "loss") return `✗ ${pick} — Loss`;
  return `↔ ${pick} — Push`;
}

/**
 * Result notification body, adapted to channel.
 * short (push/sms): "{emoji} {result text} · {sign}{|profit|}u"
 * long (email/in-app): full lines
 */
export function resultBody(
  pick: string,
  result: "win" | "loss" | "push",
  profit: number,
  channel: NotificationChannel,
): string {
  const absProfit = Math.abs(profit).toFixed(2);

  let emoji: string;
  let resultText: string;
  let profitStr: string;

  if (result === "win") {
    emoji = "✓";
    resultText = "Won";
    profitStr = `+${absProfit}u`;
  } else if (result === "loss") {
    emoji = "✗";
    resultText = "Loss";
    profitStr = `-${absProfit}u`;
  } else {
    emoji = "↔";
    resultText = "Push";
    profitStr = `0.00u`;
  }

  if (channel === "push" || channel === "sms") {
    return `${emoji} ${resultText} · ${profitStr}`;
  }

  return `${pick}\nResult: ${resultText}\nProfit: ${profitStr}`;
}

// ─── Subscription alerts ──────────────────────────────────────────────────────

/**
 * Subscription event title.
 * welcome: "Welcome to {tier}!"
 * renewal: "Your {tier} subscription renewed"
 * expiring: "Your {tier} subscription is expiring soon"
 * trial_ending: "Your {tier} trial ends soon"
 */
export function subscriptionTitle(
  event: "welcome" | "renewal" | "expiring" | "trial_ending",
  tier: string,
): string {
  const t = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (event === "welcome") return `Welcome to ${t}!`;
  if (event === "renewal") return `Your ${t} subscription renewed`;
  if (event === "expiring") return `Your ${t} subscription is expiring soon`;
  return `Your ${t} trial ends soon`;
}

/**
 * Subscription event body.
 * welcome: "Your {tier} subscription is now active. Get access to all picks."
 * renewal: "Your {tier} subscription has been renewed. Thanks for staying with us!"
 * expiring: dynamic with optional daysLeft
 * trial_ending: dynamic with optional daysLeft
 */
export function subscriptionBody(
  event: "welcome" | "renewal" | "expiring" | "trial_ending",
  tier: string,
  daysLeft?: number,
): string {
  const t = tier.charAt(0).toUpperCase() + tier.slice(1);

  if (event === "welcome") {
    return `Your ${t} subscription is now active. Get access to all picks.`;
  }
  if (event === "renewal") {
    return `Your ${t} subscription has been renewed. Thanks for staying with us!`;
  }
  if (event === "expiring") {
    if (daysLeft !== undefined) {
      return `Your ${t} subscription expires in ${daysLeft} days.`;
    }
    return `Your ${t} subscription is expiring soon.`;
  }
  // trial_ending
  if (daysLeft !== undefined) {
    return `Your ${t} trial ends in ${daysLeft} days. Subscribe to keep access.`;
  }
  return `Your ${t} trial is ending soon. Subscribe to keep access.`;
}

// ─── Full payload builder ─────────────────────────────────────────────────────

/**
 * Build a full notification payload for an event, using context fields.
 *
 * Context keys consumed per event:
 *   new_pick:             sport, game, pick, odds, confidence, tier
 *   odds_change:          game, pick, oldOdds, newOdds, direction
 *   pick_result:          pick, result ("win"|"loss"|"push"), profit (numeric string)
 *   subscription_*:       tier, daysLeft (optional)
 *   account_alert:        message
 */
export function buildNotificationPayload(
  event: NotificationEvent,
  context: Record<string, string>,
  channel: NotificationChannel,
): NotificationPayload {
  let title: string;
  let body: string;
  let priority: NotificationPriority;

  switch (event) {
    case "new_pick": {
      const pickNotif: PickNotification = {
        sport: context["sport"] ?? "",
        game: context["game"] ?? "",
        pick: context["pick"] ?? "",
        confidence: Number(context["confidence"] ?? 0),
        tier: (context["tier"] as PickNotification["tier"]) ?? "signal",
        odds: context["odds"] ?? "",
      };
      title = pickAlertTitle(pickNotif);
      body = pickAlertBody(pickNotif, channel);
      const t = pickNotif.tier;
      priority = t === "apex" || t === "sharp" ? "high" : "normal";
      break;
    }

    case "odds_change":
    case "line_move": {
      const changeNotif: OddsChangeNotification = {
        game: context["game"] ?? "",
        pick: context["pick"] ?? "",
        oldOdds: context["oldOdds"] ?? "",
        newOdds: context["newOdds"] ?? "",
        direction: (context["direction"] as OddsChangeNotification["direction"]) ?? "neutral",
      };
      title = oddsChangeTitle(changeNotif);
      body = oddsChangeBody(changeNotif, channel);
      priority = changeNotif.direction === "favorable" ? "high" : "normal";
      break;
    }

    case "pick_result": {
      const pick = context["pick"] ?? "";
      const result = (context["result"] as "win" | "loss" | "push") ?? "push";
      const profit = Number(context["profit"] ?? 0);
      title = resultTitle(pick, result);
      body = resultBody(pick, result, profit, channel);
      priority = result === "loss" ? "low" : "normal";
      break;
    }

    case "subscription_welcome": {
      const tier = context["tier"] ?? "Pro";
      title = subscriptionTitle("welcome", tier);
      body = subscriptionBody("welcome", tier);
      priority = "normal";
      break;
    }

    case "subscription_renewal": {
      const tier = context["tier"] ?? "Pro";
      title = subscriptionTitle("renewal", tier);
      body = subscriptionBody("renewal", tier);
      priority = "normal";
      break;
    }

    case "subscription_expiring": {
      const tier = context["tier"] ?? "Pro";
      const daysLeft = context["daysLeft"] !== undefined ? Number(context["daysLeft"]) : undefined;
      title = subscriptionTitle("expiring", tier);
      body = subscriptionBody("expiring", tier, daysLeft);
      priority = "high";
      break;
    }

    case "trial_ending": {
      const tier = context["tier"] ?? "Pro";
      const daysLeft = context["daysLeft"] !== undefined ? Number(context["daysLeft"]) : undefined;
      title = subscriptionTitle("trial_ending", tier);
      body = subscriptionBody("trial_ending", tier, daysLeft);
      priority = "high";
      break;
    }

    case "account_alert": {
      title = "Account Alert";
      body = context["message"] ?? "Action required on your account";
      priority = "critical";
      break;
    }

    default: {
      title = "Notification";
      body = context["message"] ?? "";
      priority = "normal";
      break;
    }
  }

  return {
    title,
    body,
    priority,
    channel,
    data: Object.keys(context).length > 0 ? { ...context } : undefined,
  };
}

// ─── Priority ordering ────────────────────────────────────────────────────────

/**
 * Return a numeric sort order for a priority.
 * critical=0, high=1, normal=2, low=3
 */
export function priorityOrder(priority: NotificationPriority): number {
  switch (priority) {
    case "critical": return 0;
    case "high": return 1;
    case "normal": return 2;
    case "low": return 3;
  }
}

// ─── Time formatting ──────────────────────────────────────────────────────────

/**
 * Human-readable relative time label for notification display.
 * "Just now" / "{n}m ago" / "{n}h ago" / "{n}d ago" / ISO date string
 */
export function formatNotificationTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = diffMs / 1000;
  const diffMin = diffSec / 60;
  const diffHour = diffMin / 60;
  const diffDay = diffHour / 24;

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffHour < 24) return `${Math.floor(diffHour)}h ago`;
  if (diffDay < 7) return `${Math.floor(diffDay)}d ago`;
  return new Date(timestamp).toISOString().slice(0, 10);
}

// ─── Body truncation ──────────────────────────────────────────────────────────

/**
 * Truncate body text for channel character constraints.
 * sms: max 160 chars
 * push: max 100 chars
 * email/in-app: no limit
 */
export function truncateBody(body: string, channel: NotificationChannel): string {
  if (channel === "sms") {
    if (body.length > 160) return body.slice(0, 157) + "...";
    return body;
  }
  if (channel === "push") {
    if (body.length > 100) return body.slice(0, 97) + "...";
    return body;
  }
  return body;
}

// ─── Notification grouping ────────────────────────────────────────────────────

/**
 * Count notifications by priority level.
 * Returns counts for all 4 priorities (0 for empty).
 */
export function groupNotifications(
  notifications: readonly { event: NotificationEvent; priority: NotificationPriority }[],
): Record<NotificationPriority, number> {
  const counts: Record<NotificationPriority, number> = {
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  };
  for (const n of notifications) {
    counts[n.priority]++;
  }
  return counts;
}
