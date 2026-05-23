export type ProviderHeartbeatKey =
  | "stripe_webhook"
  | "transactional_email"
  | "discord_bot"
  | "private_storage"
  | "analytics_ingestion";

export type ProviderHeartbeatConfig = {
  key: ProviderHeartbeatKey;
  label: string;
  maxStaleMinutes: number;
};

export type ProviderHeartbeatInput = ProviderHeartbeatConfig & {
  lastOkAt: string | null;
};

export type ProviderHeartbeat = ProviderHeartbeatInput & {
  ageMinutes: number | null;
  status: "healthy" | "stale" | "unconfigured";
};

export const providerHeartbeatConfig: readonly ProviderHeartbeatConfig[] = [
  {
    key: "stripe_webhook",
    label: "Stripe webhook receipt",
    maxStaleMinutes: 60,
  },
  {
    key: "transactional_email",
    label: "Transactional email provider",
    maxStaleMinutes: 60,
  },
  {
    key: "discord_bot",
    label: "Discord bot permissions",
    maxStaleMinutes: 60,
  },
  {
    key: "private_storage",
    label: "Private storage access",
    maxStaleMinutes: 24 * 60,
  },
  {
    key: "analytics_ingestion",
    label: "Analytics ingestion",
    maxStaleMinutes: 24 * 60,
  },
];

const MINUTE_MS = 60_000;

function getAgeMinutes(lastOkAt: string, now: Date) {
  const lastOkTime = new Date(lastOkAt).getTime();
  if (!Number.isFinite(lastOkTime)) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - lastOkTime) / MINUTE_MS));
}

export function getProviderHeartbeat(
  input: ProviderHeartbeatInput,
  now = new Date(),
): ProviderHeartbeat {
  if (!input.lastOkAt) {
    return {
      ...input,
      ageMinutes: null,
      status: "unconfigured",
    };
  }

  const ageMinutes = getAgeMinutes(input.lastOkAt, now);

  if (ageMinutes === null) {
    return {
      ...input,
      ageMinutes,
      status: "unconfigured",
    };
  }

  return {
    ...input,
    ageMinutes,
    status: ageMinutes > input.maxStaleMinutes ? "stale" : "healthy",
  };
}

export function listProviderHeartbeats(
  inputs: readonly ProviderHeartbeatInput[],
  now = new Date(),
) {
  return inputs.map((input) => getProviderHeartbeat(input, now));
}
