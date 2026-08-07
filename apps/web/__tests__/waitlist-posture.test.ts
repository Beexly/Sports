import { describe, expect, it } from "vitest";
import { loadWaitlistPosture } from "@/lib/ops/waitlist-posture";

describe("loadWaitlistPosture", () => {
  it("reports public open when gate unset", () => {
    const p = loadWaitlistPosture({});
    expect(p.gateEnabled).toBe(false);
    expect(p.publicPageOpen).toBe(true);
    expect(p.operatorHint).toMatch(/public/i);
  });

  it("reports locked when gate true with creds", () => {
    const p = loadWaitlistPosture({
      GSE_WAITLIST_GATE_ENABLED: "true",
      GSE_WAITLIST_BASIC_USER: "ops",
      GSE_WAITLIST_BASIC_PASSWORD: "secret",
    });
    expect(p.gateEnabled).toBe(true);
    expect(p.publicPageOpen).toBe(false);
    expect(p.basicAuthCredentialsConfigured).toBe(true);
    expect(p.operatorHint).toMatch(/GATE_ENABLED=false/);
  });

  it("flags incomplete creds when gate on", () => {
    const p = loadWaitlistPosture({
      GSE_WAITLIST_GATE_ENABLED: "true",
      GSE_WAITLIST_BASIC_USER: "ops",
    });
    expect(p.basicAuthCredentialsConfigured).toBe(false);
    expect(p.operatorHint).toMatch(/incomplete/i);
  });
});
