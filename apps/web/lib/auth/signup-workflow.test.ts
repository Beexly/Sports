import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  sleep: vi.fn(),
  sendSignupEmail: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    user: {
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("@/lib/workflow", () => ({
  sleep: mocks.sleep,
}));

vi.mock("@/lib/auth/signup-email", () => ({
  sendSignupEmail: mocks.sendSignupEmail,
}));

import { handleUserSignup } from "./signup-workflow";

beforeEach(() => {
  mocks.upsert.mockReset().mockResolvedValue({ id: "user_123", email: "user@example.com" });
  mocks.sleep.mockReset().mockResolvedValue(undefined);
  mocks.sendSignupEmail.mockReset().mockResolvedValue(undefined);
});

describe("handleUserSignup", () => {
  it("creates or reuses user, sends both emails, and waits before onboarding email", async () => {
    const result = await handleUserSignup(" User@Example.com ");

    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      update: {},
      create: { email: "user@example.com" },
      select: { id: true, email: true },
    });
    expect(mocks.sendSignupEmail).toHaveBeenNthCalledWith(1, "user@example.com", "welcome");
    expect(mocks.sleep).toHaveBeenCalledWith("5s");
    expect(mocks.sendSignupEmail).toHaveBeenNthCalledWith(2, "user@example.com", "onboarding");
    expect(result).toEqual({ userId: "user_123", status: "onboarded" });
  });

  it("rejects invalid email input", async () => {
    await expect(handleUserSignup("not-an-email")).rejects.toThrow();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.sendSignupEmail).not.toHaveBeenCalled();
    expect(mocks.sleep).not.toHaveBeenCalled();
  });

  it("propagates email failures", async () => {
    mocks.sendSignupEmail.mockRejectedValueOnce(new Error("send failed"));

    await expect(handleUserSignup("user@example.com")).rejects.toThrow("send failed");
    expect(mocks.sendSignupEmail).toHaveBeenCalledTimes(1);
  });
});
