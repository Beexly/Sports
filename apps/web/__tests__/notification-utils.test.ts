import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  pickAlertTitle,
  pickAlertBody,
  oddsChangeTitle,
  oddsChangeBody,
  resultTitle,
  resultBody,
  subscriptionTitle,
  subscriptionBody,
  buildNotificationPayload,
  priorityOrder,
  formatNotificationTime,
  truncateBody,
  groupNotifications,
} from "@/lib/utils/notification-utils";
import type {
  PickNotification,
  OddsChangeNotification,
  NotificationChannel,
  NotificationPriority,
} from "@/lib/utils/notification-utils";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NFL_EDGE_PICK: PickNotification = {
  sport: "NFL",
  game: "Chiefs vs Ravens",
  pick: "Chiefs -3.5",
  confidence: 72,
  tier: "edge",
  odds: "-110",
};

const NBA_APEX_PICK: PickNotification = {
  sport: "NBA",
  game: "Lakers vs Celtics",
  pick: "Lakers ML",
  confidence: 88,
  tier: "apex",
  odds: "+140",
};

const MLB_SIGNAL_PICK: PickNotification = {
  sport: "MLB",
  game: "Yankees vs Red Sox",
  pick: "Yankees -1.5",
  confidence: 55,
  tier: "signal",
  odds: "-120",
};

const NHL_SHARP_PICK: PickNotification = {
  sport: "NHL",
  game: "Oilers vs Flames",
  pick: "Oilers ML",
  confidence: 81,
  tier: "sharp",
  odds: "-115",
};

const FAVORABLE_ODDS_CHANGE: OddsChangeNotification = {
  game: "Chiefs vs Ravens",
  pick: "Chiefs -3.5",
  oldOdds: "-120",
  newOdds: "-105",
  direction: "favorable",
};

const UNFAVORABLE_ODDS_CHANGE: OddsChangeNotification = {
  game: "Lakers vs Celtics",
  pick: "Lakers ML",
  oldOdds: "+120",
  newOdds: "+100",
  direction: "unfavorable",
};

const NEUTRAL_ODDS_CHANGE: OddsChangeNotification = {
  game: "Yankees vs Red Sox",
  pick: "Yankees -1.5",
  oldOdds: "-110",
  newOdds: "-110",
  direction: "neutral",
};

// ─── pickAlertTitle ───────────────────────────────────────────────────────────

describe("pickAlertTitle", () => {
  it("formats edge tier for NFL", () => {
    expect(pickAlertTitle(NFL_EDGE_PICK)).toBe("New Edge Pick: NFL");
  });

  it("formats apex tier for NBA", () => {
    expect(pickAlertTitle(NBA_APEX_PICK)).toBe("New Apex Pick: NBA");
  });

  it("formats signal tier for MLB", () => {
    expect(pickAlertTitle(MLB_SIGNAL_PICK)).toBe("New Signal Pick: MLB");
  });

  it("formats sharp tier for NHL", () => {
    expect(pickAlertTitle(NHL_SHARP_PICK)).toBe("New Sharp Pick: NHL");
  });

  it("capitalizes tier correctly", () => {
    const title = pickAlertTitle({ ...NFL_EDGE_PICK, tier: "signal" });
    expect(title).toMatch(/^New Signal Pick:/);
  });

  it("includes the sport in the title", () => {
    const title = pickAlertTitle({ ...NFL_EDGE_PICK, sport: "NCAAB" });
    expect(title).toContain("NCAAB");
  });
});

// ─── pickAlertBody ────────────────────────────────────────────────────────────

describe("pickAlertBody", () => {
  it("push format is short: game → pick (odds)", () => {
    expect(pickAlertBody(NFL_EDGE_PICK, "push")).toBe(
      "Chiefs vs Ravens → Chiefs -3.5 (-110)",
    );
  });

  it("sms format matches push format", () => {
    expect(pickAlertBody(NFL_EDGE_PICK, "sms")).toBe(
      pickAlertBody(NFL_EDGE_PICK, "push"),
    );
  });

  it("email format includes game, pick, confidence", () => {
    const body = pickAlertBody(NFL_EDGE_PICK, "email");
    expect(body).toContain("Chiefs vs Ravens");
    expect(body).toContain("Chiefs -3.5 at -110");
    expect(body).toContain("Confidence: 72%");
  });

  it("in-app format matches email format", () => {
    expect(pickAlertBody(NBA_APEX_PICK, "in-app")).toBe(
      pickAlertBody(NBA_APEX_PICK, "email"),
    );
  });

  it("email body is multiline", () => {
    const body = pickAlertBody(NFL_EDGE_PICK, "email");
    expect(body.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("push body is single line", () => {
    const body = pickAlertBody(NFL_EDGE_PICK, "push");
    expect(body.includes("\n")).toBe(false);
  });
});

// ─── oddsChangeTitle ──────────────────────────────────────────────────────────

describe("oddsChangeTitle", () => {
  it("favorable direction → Improved", () => {
    expect(oddsChangeTitle(FAVORABLE_ODDS_CHANGE)).toBe(
      "Odds Improved for Chiefs -3.5",
    );
  });

  it("unfavorable direction → Worsened", () => {
    expect(oddsChangeTitle(UNFAVORABLE_ODDS_CHANGE)).toBe(
      "Odds Worsened for Lakers ML",
    );
  });

  it("neutral direction → Changed", () => {
    expect(oddsChangeTitle(NEUTRAL_ODDS_CHANGE)).toBe(
      "Odds Changed for Yankees -1.5",
    );
  });

  it("includes the pick name in the title", () => {
    const change: OddsChangeNotification = {
      ...FAVORABLE_ODDS_CHANGE,
      pick: "Ravens +3.5",
    };
    expect(oddsChangeTitle(change)).toContain("Ravens +3.5");
  });
});

// ─── oddsChangeBody ───────────────────────────────────────────────────────────

describe("oddsChangeBody", () => {
  it("push: short format with game and arrows", () => {
    expect(oddsChangeBody(FAVORABLE_ODDS_CHANGE, "push")).toBe(
      "Chiefs vs Ravens: Chiefs -3.5 -120 → -105",
    );
  });

  it("sms: matches push format", () => {
    expect(oddsChangeBody(FAVORABLE_ODDS_CHANGE, "sms")).toBe(
      oddsChangeBody(FAVORABLE_ODDS_CHANGE, "push"),
    );
  });

  it("email: multiline with direction label", () => {
    const body = oddsChangeBody(FAVORABLE_ODDS_CHANGE, "email");
    expect(body).toContain("Chiefs vs Ravens");
    expect(body).toContain("Chiefs -3.5: -120 → -105");
    expect(body).toContain("improved");
  });

  it("in-app: matches email format", () => {
    expect(oddsChangeBody(UNFAVORABLE_ODDS_CHANGE, "in-app")).toBe(
      oddsChangeBody(UNFAVORABLE_ODDS_CHANGE, "email"),
    );
  });

  it("unfavorable direction → worsened in email body", () => {
    const body = oddsChangeBody(UNFAVORABLE_ODDS_CHANGE, "email");
    expect(body).toContain("worsened");
  });

  it("neutral direction → neutral in email body", () => {
    const body = oddsChangeBody(NEUTRAL_ODDS_CHANGE, "email");
    expect(body).toContain("neutral");
  });
});

// ─── resultTitle ──────────────────────────────────────────────────────────────

describe("resultTitle", () => {
  it("win has checkmark emoji prefix", () => {
    expect(resultTitle("Chiefs -3.5", "win")).toBe("✓ Chiefs -3.5 — Won");
  });

  it("loss has X emoji prefix", () => {
    expect(resultTitle("Lakers ML", "loss")).toBe("✗ Lakers ML — Loss");
  });

  it("push has arrows emoji prefix", () => {
    expect(resultTitle("Yankees -1.5", "push")).toBe("↔ Yankees -1.5 — Push");
  });

  it("includes the pick name in all result types", () => {
    const pick = "Oilers ML";
    expect(resultTitle(pick, "win")).toContain(pick);
    expect(resultTitle(pick, "loss")).toContain(pick);
    expect(resultTitle(pick, "push")).toContain(pick);
  });
});

// ─── resultBody ───────────────────────────────────────────────────────────────

describe("resultBody", () => {
  it("push win: short with positive profit", () => {
    expect(resultBody("Chiefs -3.5", "win", 1.91, "push")).toBe("✓ Won · +1.91u");
  });

  it("push loss: short with negative profit", () => {
    expect(resultBody("Chiefs -3.5", "loss", 1.00, "push")).toBe("✗ Loss · -1.00u");
  });

  it("push push: zero profit", () => {
    expect(resultBody("Chiefs -3.5", "push", 0, "push")).toBe("↔ Push · 0.00u");
  });

  it("sms matches push format", () => {
    expect(resultBody("Chiefs -3.5", "win", 1.91, "sms")).toBe(
      resultBody("Chiefs -3.5", "win", 1.91, "push"),
    );
  });

  it("email win: multiline with Win and profit", () => {
    const body = resultBody("Chiefs -3.5", "win", 1.91, "email");
    expect(body).toContain("Chiefs -3.5");
    expect(body).toContain("Result: Won");
    expect(body).toContain("Profit: +1.91u");
  });

  it("email loss: multiline with Loss and negative profit", () => {
    const body = resultBody("Lakers ML", "loss", 1.00, "email");
    expect(body).toContain("Result: Loss");
    expect(body).toContain("Profit: -1.00u");
  });

  it("email push: multiline with Push and zero profit", () => {
    const body = resultBody("Yankees -1.5", "push", 0, "email");
    expect(body).toContain("Result: Push");
    expect(body).toContain("Profit: 0.00u");
  });

  it("in-app matches email format", () => {
    expect(resultBody("Oilers ML", "win", 2.5, "in-app")).toBe(
      resultBody("Oilers ML", "win", 2.5, "email"),
    );
  });

  it("formats profit to 2 decimal places", () => {
    const body = resultBody("Pick", "win", 1.9, "push");
    expect(body).toContain("1.90u");
  });

  it("push loss profit is always negative regardless of profit sign", () => {
    const body = resultBody("Pick", "loss", -1.5, "push");
    expect(body).toContain("-1.50u");
  });
});

// ─── subscriptionTitle ────────────────────────────────────────────────────────

describe("subscriptionTitle", () => {
  it("welcome event", () => {
    expect(subscriptionTitle("welcome", "pro")).toBe("Welcome to Pro!");
  });

  it("renewal event", () => {
    expect(subscriptionTitle("renewal", "elite")).toBe("Your Elite subscription renewed");
  });

  it("expiring event", () => {
    expect(subscriptionTitle("expiring", "pro")).toBe("Your Pro subscription is expiring soon");
  });

  it("trial_ending event", () => {
    expect(subscriptionTitle("trial_ending", "pro")).toBe("Your Pro trial ends soon");
  });

  it("capitalizes tier correctly for already-uppercase input", () => {
    expect(subscriptionTitle("welcome", "PRO")).toBe("Welcome to PRO!");
  });

  it("capitalizes first letter of lowercase tier", () => {
    expect(subscriptionTitle("renewal", "elite")).toContain("Elite");
  });

  it("welcome ends with exclamation mark", () => {
    expect(subscriptionTitle("welcome", "pro")).toMatch(/!$/);
  });

  it("renewal does not end with exclamation mark", () => {
    expect(subscriptionTitle("renewal", "pro")).not.toMatch(/!$/);
  });
});

// ─── subscriptionBody ─────────────────────────────────────────────────────────

describe("subscriptionBody", () => {
  it("welcome body confirms subscription active", () => {
    const body = subscriptionBody("welcome", "pro");
    expect(body).toContain("Pro");
    expect(body).toContain("active");
    expect(body).toContain("picks");
  });

  it("renewal body confirms renewal and thanks user", () => {
    const body = subscriptionBody("renewal", "elite");
    expect(body).toContain("renewed");
    expect(body).toContain("Elite");
  });

  it("expiring body with daysLeft includes days count", () => {
    const body = subscriptionBody("expiring", "pro", 7);
    expect(body).toContain("7 days");
    expect(body).toContain("Pro");
  });

  it("expiring body without daysLeft uses generic message", () => {
    const body = subscriptionBody("expiring", "pro");
    expect(body).toContain("expiring soon");
    expect(body).not.toContain("undefined");
  });

  it("trial_ending body with daysLeft includes days and subscribe CTA", () => {
    const body = subscriptionBody("trial_ending", "pro", 3);
    expect(body).toContain("3 days");
    expect(body).toContain("Subscribe");
  });

  it("trial_ending body without daysLeft uses generic message", () => {
    const body = subscriptionBody("trial_ending", "pro");
    expect(body).toContain("ending soon");
    expect(body).not.toContain("undefined");
  });

  it("tier name is capitalized in body text", () => {
    const body = subscriptionBody("welcome", "elite");
    expect(body).toContain("Elite");
  });
});

// ─── buildNotificationPayload ─────────────────────────────────────────────────

describe("buildNotificationPayload", () => {
  it("new_pick apex tier → high priority", () => {
    const payload = buildNotificationPayload(
      "new_pick",
      { sport: "NBA", game: "Lakers vs Celtics", pick: "Lakers ML", odds: "+140", confidence: "88", tier: "apex" },
      "push",
    );
    expect(payload.priority).toBe("high");
  });

  it("new_pick sharp tier → high priority", () => {
    const payload = buildNotificationPayload(
      "new_pick",
      { sport: "NHL", game: "Oilers vs Flames", pick: "Oilers ML", odds: "-115", confidence: "81", tier: "sharp" },
      "push",
    );
    expect(payload.priority).toBe("high");
  });

  it("new_pick edge tier → normal priority", () => {
    const payload = buildNotificationPayload(
      "new_pick",
      { sport: "NFL", game: "Chiefs vs Ravens", pick: "Chiefs -3.5", odds: "-110", confidence: "72", tier: "edge" },
      "push",
    );
    expect(payload.priority).toBe("normal");
  });

  it("new_pick signal tier → normal priority", () => {
    const payload = buildNotificationPayload(
      "new_pick",
      { sport: "MLB", game: "Yankees vs Red Sox", pick: "Yankees -1.5", odds: "-120", confidence: "55", tier: "signal" },
      "email",
    );
    expect(payload.priority).toBe("normal");
  });

  it("odds_change favorable → high priority", () => {
    const payload = buildNotificationPayload(
      "odds_change",
      { game: "Chiefs vs Ravens", pick: "Chiefs -3.5", oldOdds: "-120", newOdds: "-105", direction: "favorable" },
      "push",
    );
    expect(payload.priority).toBe("high");
  });

  it("odds_change unfavorable → normal priority", () => {
    const payload = buildNotificationPayload(
      "odds_change",
      { game: "Chiefs vs Ravens", pick: "Chiefs -3.5", oldOdds: "-105", newOdds: "-120", direction: "unfavorable" },
      "push",
    );
    expect(payload.priority).toBe("normal");
  });

  it("pick_result win → normal priority", () => {
    const payload = buildNotificationPayload(
      "pick_result",
      { pick: "Chiefs -3.5", result: "win", profit: "1.91" },
      "push",
    );
    expect(payload.priority).toBe("normal");
  });

  it("pick_result loss → low priority", () => {
    const payload = buildNotificationPayload(
      "pick_result",
      { pick: "Chiefs -3.5", result: "loss", profit: "1.00" },
      "push",
    );
    expect(payload.priority).toBe("low");
  });

  it("subscription_welcome → normal priority", () => {
    const payload = buildNotificationPayload("subscription_welcome", { tier: "pro" }, "email");
    expect(payload.priority).toBe("normal");
  });

  it("subscription_renewal → normal priority", () => {
    const payload = buildNotificationPayload("subscription_renewal", { tier: "elite" }, "email");
    expect(payload.priority).toBe("normal");
  });

  it("subscription_expiring → high priority", () => {
    const payload = buildNotificationPayload("subscription_expiring", { tier: "pro", daysLeft: "5" }, "email");
    expect(payload.priority).toBe("high");
  });

  it("trial_ending → high priority", () => {
    const payload = buildNotificationPayload("trial_ending", { tier: "pro", daysLeft: "3" }, "push");
    expect(payload.priority).toBe("high");
  });

  it("account_alert → critical priority", () => {
    const payload = buildNotificationPayload("account_alert", { message: "Suspicious login detected" }, "push");
    expect(payload.priority).toBe("critical");
  });

  it("account_alert uses message from context", () => {
    const payload = buildNotificationPayload("account_alert", { message: "Suspicious login detected" }, "push");
    expect(payload.body).toBe("Suspicious login detected");
  });

  it("account_alert falls back to default message when no context message", () => {
    const payload = buildNotificationPayload("account_alert", {}, "push");
    expect(payload.body).toBe("Action required on your account");
  });

  it("payload includes channel", () => {
    const payload = buildNotificationPayload("account_alert", { message: "Test" }, "sms");
    expect(payload.channel).toBe("sms");
  });

  it("payload title is non-empty string", () => {
    const payload = buildNotificationPayload("account_alert", {}, "push");
    expect(typeof payload.title).toBe("string");
    expect(payload.title.length).toBeGreaterThan(0);
  });

  it("new_pick payload title matches pickAlertTitle format", () => {
    const payload = buildNotificationPayload(
      "new_pick",
      { sport: "NFL", game: "Chiefs vs Ravens", pick: "Chiefs -3.5", odds: "-110", confidence: "72", tier: "edge" },
      "push",
    );
    expect(payload.title).toBe("New Edge Pick: NFL");
  });

  it("line_move treated as odds_change", () => {
    const payload = buildNotificationPayload(
      "line_move",
      { game: "Chiefs vs Ravens", pick: "Chiefs -3.5", oldOdds: "-120", newOdds: "-105", direction: "favorable" },
      "push",
    );
    expect(payload.priority).toBe("high");
    expect(payload.title).toContain("Improved");
  });
});

// ─── priorityOrder ────────────────────────────────────────────────────────────

describe("priorityOrder", () => {
  it("critical has lowest order number (0)", () => {
    expect(priorityOrder("critical")).toBe(0);
  });

  it("high has order number 1", () => {
    expect(priorityOrder("high")).toBe(1);
  });

  it("normal has order number 2", () => {
    expect(priorityOrder("normal")).toBe(2);
  });

  it("low has highest order number (3)", () => {
    expect(priorityOrder("low")).toBe(3);
  });

  it("priorities sort correctly using priorityOrder", () => {
    const priorities: NotificationPriority[] = ["low", "critical", "normal", "high"];
    const sorted = [...priorities].sort((a, b) => priorityOrder(a) - priorityOrder(b));
    expect(sorted).toEqual(["critical", "high", "normal", "low"]);
  });

  it("critical < high < normal < low as numbers", () => {
    expect(priorityOrder("critical")).toBeLessThan(priorityOrder("high"));
    expect(priorityOrder("high")).toBeLessThan(priorityOrder("normal"));
    expect(priorityOrder("normal")).toBeLessThan(priorityOrder("low"));
  });
});

// ─── formatNotificationTime ───────────────────────────────────────────────────

describe("formatNotificationTime", () => {
  it("returns 'Just now' for timestamp 0 seconds ago", () => {
    const now = Date.now();
    expect(formatNotificationTime(now)).toBe("Just now");
  });

  it("returns 'Just now' for timestamp 30 seconds ago", () => {
    const ts = Date.now() - 30 * 1000;
    expect(formatNotificationTime(ts)).toBe("Just now");
  });

  it("returns 'Just now' for timestamp 59 seconds ago", () => {
    const ts = Date.now() - 59 * 1000;
    expect(formatNotificationTime(ts)).toBe("Just now");
  });

  it("returns '{n}m ago' for timestamp 5 minutes ago", () => {
    const ts = Date.now() - 5 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("5m ago");
  });

  it("returns '{n}m ago' for timestamp 59 minutes ago", () => {
    const ts = Date.now() - 59 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("59m ago");
  });

  it("returns '{n}h ago' for timestamp 2 hours ago", () => {
    const ts = Date.now() - 2 * 60 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("2h ago");
  });

  it("returns '{n}h ago' for timestamp 23 hours ago", () => {
    const ts = Date.now() - 23 * 60 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("23h ago");
  });

  it("returns '{n}d ago' for timestamp 1 day ago", () => {
    const ts = Date.now() - 1 * 24 * 60 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("1d ago");
  });

  it("returns '{n}d ago' for timestamp 6 days ago", () => {
    const ts = Date.now() - 6 * 24 * 60 * 60 * 1000;
    expect(formatNotificationTime(ts)).toBe("6d ago");
  });

  it("returns ISO date string for timestamp 8 days ago", () => {
    const ts = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const result = formatNotificationTime(ts);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("ISO fallback is exactly 10 characters", () => {
    const ts = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(formatNotificationTime(ts)).toHaveLength(10);
  });
});

// ─── truncateBody ─────────────────────────────────────────────────────────────

describe("truncateBody", () => {
  it("sms: does not truncate body within 160 chars", () => {
    const body = "A".repeat(160);
    expect(truncateBody(body, "sms")).toBe(body);
  });

  it("sms: truncates body over 160 chars and appends ...", () => {
    const body = "A".repeat(161);
    const result = truncateBody(body, "sms");
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(160);
  });

  it("sms: truncated result is exactly 160 chars", () => {
    const body = "B".repeat(200);
    expect(truncateBody(body, "sms")).toHaveLength(160);
  });

  it("push: does not truncate body within 100 chars", () => {
    const body = "C".repeat(100);
    expect(truncateBody(body, "push")).toBe(body);
  });

  it("push: truncates body over 100 chars and appends ...", () => {
    const body = "C".repeat(101);
    const result = truncateBody(body, "push");
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(100);
  });

  it("push: truncated result is exactly 100 chars", () => {
    const body = "D".repeat(200);
    expect(truncateBody(body, "push")).toHaveLength(100);
  });

  it("email: no limit — returns as-is", () => {
    const body = "E".repeat(500);
    expect(truncateBody(body, "email")).toBe(body);
  });

  it("in-app: no limit — returns as-is", () => {
    const body = "F".repeat(500);
    expect(truncateBody(body, "in-app")).toBe(body);
  });

  it("short body passes through sms without change", () => {
    const body = "Hello!";
    expect(truncateBody(body, "sms")).toBe("Hello!");
  });

  it("short body passes through push without change", () => {
    const body = "Hello!";
    expect(truncateBody(body, "push")).toBe("Hello!");
  });
});

// ─── groupNotifications ───────────────────────────────────────────────────────

describe("groupNotifications", () => {
  it("returns all-zero counts for empty array", () => {
    const result = groupNotifications([]);
    expect(result).toEqual({ critical: 0, high: 0, normal: 0, low: 0 });
  });

  it("counts a single critical notification", () => {
    const result = groupNotifications([{ event: "account_alert", priority: "critical" }]);
    expect(result.critical).toBe(1);
    expect(result.high).toBe(0);
    expect(result.normal).toBe(0);
    expect(result.low).toBe(0);
  });

  it("counts multiple notifications of the same priority", () => {
    const result = groupNotifications([
      { event: "new_pick", priority: "high" },
      { event: "odds_change", priority: "high" },
      { event: "new_pick", priority: "high" },
    ]);
    expect(result.high).toBe(3);
    expect(result.critical).toBe(0);
    expect(result.normal).toBe(0);
    expect(result.low).toBe(0);
  });

  it("counts mixed priorities correctly", () => {
    const result = groupNotifications([
      { event: "account_alert", priority: "critical" },
      { event: "new_pick", priority: "high" },
      { event: "new_pick", priority: "high" },
      { event: "pick_result", priority: "normal" },
      { event: "pick_result", priority: "low" },
      { event: "pick_result", priority: "low" },
      { event: "pick_result", priority: "low" },
    ]);
    expect(result.critical).toBe(1);
    expect(result.high).toBe(2);
    expect(result.normal).toBe(1);
    expect(result.low).toBe(3);
  });

  it("all 4 priority keys are always present in result", () => {
    const result = groupNotifications([{ event: "new_pick", priority: "normal" }]);
    expect("critical" in result).toBe(true);
    expect("high" in result).toBe(true);
    expect("normal" in result).toBe(true);
    expect("low" in result).toBe(true);
  });

  it("total count matches input length", () => {
    const notifications = [
      { event: "account_alert" as const, priority: "critical" as const },
      { event: "new_pick" as const, priority: "high" as const },
      { event: "pick_result" as const, priority: "normal" as const },
      { event: "pick_result" as const, priority: "low" as const },
    ];
    const result = groupNotifications(notifications);
    const total = result.critical + result.high + result.normal + result.low;
    expect(total).toBe(notifications.length);
  });
});
