export type VaultEmailScheduleItem = {
  templateId: string;
  dayOffset: number;
  anchor: "joined_at" | "renewal_at";
  requiresActiveMembership: boolean;
  skipWhenEngagementHealthy?: boolean;
};

export type VaultLifecycleEmailStatus =
  | "scheduled"
  | "sent"
  | "skipped"
  | "paused"
  | "failed";

export type VaultLifecycleEmailRow = {
  id: string;
  templateId: string;
  scheduledFor: string;
  status: VaultLifecycleEmailStatus;
  sentAt?: string | null;
  sendAttempts?: number | null;
};

export type VaultLifecycleEmailDeliveryDecision =
  | {
      status: "send";
      reason: "due";
      lifecycleEmailId: string;
      templateId: string;
    }
  | {
      status: "wait";
      reason: "not_due";
      lifecycleEmailId: string;
      templateId: string;
    }
  | {
      status: "skip";
      reason: "membership_inactive" | "engagement_healthy";
      lifecycleEmailId: string;
      templateId: string;
    }
  | {
      status: "hold";
      reason: "paused" | "max_attempts_reached" | "invalid_schedule" | "unknown_template";
      lifecycleEmailId: string;
      templateId: string;
    }
  | {
      status: "noop";
      reason: "already_sent" | "already_skipped";
      lifecycleEmailId: string;
      templateId: string;
    };

export const vaultWelcomeEmailSchedule: VaultEmailScheduleItem[] = [
  {
    templateId: "vault-welcome-day-0",
    dayOffset: 0,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-welcome-day-1",
    dayOffset: 1,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-welcome-day-3",
    dayOffset: 3,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-welcome-day-7",
    dayOffset: 7,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-welcome-day-14",
    dayOffset: 14,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
];

export const vaultRetentionEmailSchedule: VaultEmailScheduleItem[] = [
  {
    templateId: "vault-retention-day-30",
    dayOffset: 30,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-retention-day-60",
    dayOffset: 60,
    anchor: "joined_at",
    requiresActiveMembership: true,
    skipWhenEngagementHealthy: true,
  },
  {
    templateId: "vault-retention-day-90",
    dayOffset: 90,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-retention-day-180",
    dayOffset: 180,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-retention-day-335",
    dayOffset: 335,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-retention-day-365",
    dayOffset: 365,
    anchor: "joined_at",
    requiresActiveMembership: true,
  },
];

export const vaultRenewalEmailSchedule: VaultEmailScheduleItem[] = [
  {
    templateId: "vault-renewal-day-minus-35",
    dayOffset: -35,
    anchor: "renewal_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-renewal-day-minus-21",
    dayOffset: -21,
    anchor: "renewal_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-renewal-day-minus-7",
    dayOffset: -7,
    anchor: "renewal_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-renewed-day-0",
    dayOffset: 0,
    anchor: "renewal_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-not-renewed-day-0",
    dayOffset: 0,
    anchor: "renewal_at",
    requiresActiveMembership: false,
  },
  {
    templateId: "vault-renewed-day-14",
    dayOffset: 14,
    anchor: "renewal_at",
    requiresActiveMembership: true,
  },
  {
    templateId: "vault-not-renewed-day-30",
    dayOffset: 30,
    anchor: "renewal_at",
    requiresActiveMembership: false,
  },
];

export const vaultLifecycleEmailSchedule: VaultEmailScheduleItem[] = [
  ...vaultWelcomeEmailSchedule,
  ...vaultRetentionEmailSchedule,
  ...vaultRenewalEmailSchedule,
];

const DAY_MS = 86_400_000;

export function getEmailScheduledAt(anchorDate: string, dayOffset: number) {
  const anchorTime = new Date(anchorDate).getTime();

  if (!Number.isFinite(anchorTime)) {
    throw new Error(`Invalid email schedule anchor: ${anchorDate}`);
  }

  return new Date(anchorTime + dayOffset * DAY_MS).toISOString();
}

export function shouldSkipLifecycleEmail(
  item: VaultEmailScheduleItem,
  context: { membershipActive: boolean; engagementHealthy?: boolean },
) {
  if (item.requiresActiveMembership && !context.membershipActive) {
    return true;
  }

  if (item.skipWhenEngagementHealthy && context.engagementHealthy) {
    return true;
  }

  return false;
}

export function getLifecycleEmailScheduleItem(templateId: string) {
  return (
    vaultLifecycleEmailSchedule.find((item) => item.templateId === templateId) ??
    null
  );
}

export function getLifecycleEmailDeliveryDecision(
  row: VaultLifecycleEmailRow,
  context: {
    now?: Date;
    membershipActive: boolean;
    engagementHealthy?: boolean;
    maxAttempts?: number;
  },
): VaultLifecycleEmailDeliveryDecision {
  const base = {
    lifecycleEmailId: row.id,
    templateId: row.templateId,
  };

  if (row.status === "sent") {
    return {
      ...base,
      status: "noop",
      reason: "already_sent",
    };
  }

  if (row.status === "skipped") {
    return {
      ...base,
      status: "noop",
      reason: "already_skipped",
    };
  }

  if (row.status === "paused") {
    return {
      ...base,
      status: "hold",
      reason: "paused",
    };
  }

  const maxAttempts = context.maxAttempts ?? 3;
  if ((row.sendAttempts ?? 0) >= maxAttempts) {
    return {
      ...base,
      status: "hold",
      reason: "max_attempts_reached",
    };
  }

  const scheduleItem = getLifecycleEmailScheduleItem(row.templateId);
  if (!scheduleItem) {
    return {
      ...base,
      status: "hold",
      reason: "unknown_template",
    };
  }

  if (scheduleItem.requiresActiveMembership && !context.membershipActive) {
    return {
      ...base,
      status: "skip",
      reason: "membership_inactive",
    };
  }

  if (scheduleItem.skipWhenEngagementHealthy && context.engagementHealthy) {
    return {
      ...base,
      status: "skip",
      reason: "engagement_healthy",
    };
  }

  const scheduledTime = new Date(row.scheduledFor).getTime();
  if (!Number.isFinite(scheduledTime)) {
    return {
      ...base,
      status: "hold",
      reason: "invalid_schedule",
    };
  }

  const now = context.now ?? new Date();
  if (scheduledTime > now.getTime()) {
    return {
      ...base,
      status: "wait",
      reason: "not_due",
    };
  }

  return {
    ...base,
    status: "send",
    reason: "due",
  };
}
