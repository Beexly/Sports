export type VaultEmailScheduleItem = {
  templateId: string;
  dayOffset: number;
  requiresActiveMembership: boolean;
};

export const vaultWelcomeEmailSchedule: VaultEmailScheduleItem[] = [
  { templateId: "vault-welcome-day-0", dayOffset: 0, requiresActiveMembership: true },
  { templateId: "vault-welcome-day-1", dayOffset: 1, requiresActiveMembership: true },
  { templateId: "vault-welcome-day-3", dayOffset: 3, requiresActiveMembership: true },
  { templateId: "vault-welcome-day-7", dayOffset: 7, requiresActiveMembership: true },
  { templateId: "vault-welcome-day-14", dayOffset: 14, requiresActiveMembership: true },
];

export const vaultRenewalEmailSchedule: VaultEmailScheduleItem[] = [
  {
    templateId: "vault-renewal-30-day-warning",
    dayOffset: -30,
    requiresActiveMembership: true,
  },
];
