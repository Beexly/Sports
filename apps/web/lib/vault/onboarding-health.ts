export type VaultOnboardingStep =
  | "payment_confirmed"
  | "member_created"
  | "discord_role_granted"
  | "welcome_email_sent"
  | "dashboard_viewed";

export type VaultOnboardingTimestamps = Partial<
  Record<VaultOnboardingStep, string>
>;

export type VaultOnboardingHealthInput = {
  checkoutSessionId: string;
  email: string;
  paidAt: string;
  timestamps: VaultOnboardingTimestamps;
};

export type VaultOnboardingMissingStep = {
  step: VaultOnboardingStep;
  severity: "repair" | "watch";
};

export type VaultOnboardingHealth = {
  checkoutSessionId: string;
  email: string;
  status: "complete" | "pending" | "repair_required";
  ageMinutes: number;
  missing: VaultOnboardingMissingStep[];
};

const REPAIR_AFTER_MINUTES = 15;
const DAY_ONE_WATCH_AFTER_MINUTES = 24 * 60;
const MINUTE_MS = 60_000;

const requiredRepairSteps: readonly VaultOnboardingStep[] = [
  "payment_confirmed",
  "member_created",
  "discord_role_granted",
  "welcome_email_sent",
];

function minutesSince(timestamp: string, now: Date): number {
  const started = new Date(timestamp).getTime();
  if (!Number.isFinite(started)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - started) / MINUTE_MS));
}

export function getVaultOnboardingHealth(
  input: VaultOnboardingHealthInput,
  now = new Date(),
): VaultOnboardingHealth {
  const ageMinutes = minutesSince(input.paidAt, now);
  const missing: VaultOnboardingMissingStep[] = [];

  for (const step of requiredRepairSteps) {
    if (!input.timestamps[step]) {
      missing.push({
        step,
        severity: ageMinutes >= REPAIR_AFTER_MINUTES ? "repair" : "watch",
      });
    }
  }

  if (
    !input.timestamps.dashboard_viewed &&
    ageMinutes >= DAY_ONE_WATCH_AFTER_MINUTES
  ) {
    missing.push({
      step: "dashboard_viewed",
      severity: "watch",
    });
  }

  const status = missing.some((step) => step.severity === "repair")
    ? "repair_required"
    : missing.length > 0
      ? "pending"
      : "complete";

  return {
    checkoutSessionId: input.checkoutSessionId,
    email: input.email,
    status,
    ageMinutes,
    missing,
  };
}

export function getOnboardingFailureRate(
  totalPaidMembers: number,
  repairRequiredMembers: number,
): number {
  if (totalPaidMembers <= 0 || repairRequiredMembers <= 0) {
    return 0;
  }

  return repairRequiredMembers / totalPaidMembers;
}
