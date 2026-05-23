export type VaultEmailScheduleItem = {
  templateId: string;
  dayOffset: number;
  anchor: "joined_at" | "renewal_at";
  requiresActiveMembership: boolean;
  skipWhenEngagementHealthy?: boolean;
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
