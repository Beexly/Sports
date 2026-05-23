export type VaultMembershipStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "refunded"
  | "expired";

export type VaultMembershipSnapshot = {
  memberId: string;
  email: string;
  firstName?: string | null;
  discordUserId?: string | null;
  foundingNumber?: number | null;
  status: VaultMembershipStatus;
  paidThrough?: string | null;
};

export type VaultCheckoutMetadata = {
  firstName: string;
  discordUsername?: string;
  source?: string;
  referralCode?: string;
};

export type VaultCronJobName =
  | "vault-welcome-emails"
  | "vault-renewals"
  | "vault-discord-repair";

export type VaultApplicationSource =
  | "interview"
  | "elite"
  | "public"
  | "referral";

export type VaultApplicationInput = {
  firstName: string;
  email: string;
  freeformAnswer: string;
  source: VaultApplicationSource;
  referralCode?: string;
};

export type VaultSeatCount = {
  cap: number;
  filled: number;
  remaining: number;
  waitlistOpen: boolean;
};
