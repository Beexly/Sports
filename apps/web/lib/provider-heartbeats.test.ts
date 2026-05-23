import { describe, expect, it } from "vitest";
import {
  getProviderHeartbeat,
  listProviderHeartbeats,
  providerHeartbeatConfig,
} from "./provider-heartbeats";

describe("provider heartbeats", () => {
  it("marks recent provider checks healthy", () => {
    expect(
      getProviderHeartbeat(
        {
          key: "stripe_webhook",
          label: "Stripe webhook receipt",
          maxStaleMinutes: 60,
          lastOkAt: "2026-05-23T10:00:00.000Z",
        },
        new Date("2026-05-23T10:45:00.000Z"),
      ).status,
    ).toBe("healthy");
  });

  it("marks old provider checks stale", () => {
    const heartbeat = getProviderHeartbeat(
      {
        key: "discord_bot",
        label: "Discord bot permissions",
        maxStaleMinutes: 60,
        lastOkAt: "2026-05-23T10:00:00.000Z",
      },
      new Date("2026-05-23T11:01:00.000Z"),
    );

    expect(heartbeat.status).toBe("stale");
    expect(heartbeat.ageMinutes).toBe(61);
  });

  it("marks missing or invalid provider checks unconfigured", () => {
    expect(
      getProviderHeartbeat({
        key: "transactional_email",
        label: "Transactional email provider",
        maxStaleMinutes: 60,
        lastOkAt: null,
      }).status,
    ).toBe("unconfigured");

    expect(
      getProviderHeartbeat({
        key: "transactional_email",
        label: "Transactional email provider",
        maxStaleMinutes: 60,
        lastOkAt: "not-a-date",
      }).status,
    ).toBe("unconfigured");
  });

  it("tracks the launch-critical provider set", () => {
    expect(providerHeartbeatConfig.map((item) => item.key)).toEqual([
      "stripe_webhook",
      "transactional_email",
      "discord_bot",
      "private_storage",
      "analytics_ingestion",
    ]);

    expect(
      listProviderHeartbeats(
        providerHeartbeatConfig.map((item) => ({ ...item, lastOkAt: null })),
      ).every((item) => item.status === "unconfigured"),
    ).toBe(true);
  });
});
