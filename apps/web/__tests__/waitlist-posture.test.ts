import { describe, expect, it } from "vitest";
import { loadWaitlistPosture } from "@/lib/ops/waitlist-posture";

/**
 * The waitlist lock is a TWO-flag design: `loadWaitlistPosture` reports locked
 * only when GSE_WAITLIST_GATE_ENABLED *and* GSE_WAITLIST_BASIC_FORCE are "true".
 * Its own comment says why — "legacy gate alone is open" so the FOUNDING funnel
 * ships without a Vercel env click, and an intentional lock takes the second
 * flag.
 *
 * These tests set only the first flag, so posture correctly reported OPEN and
 * every locked-path assertion failed. Nothing about the second flag was covered,
 * which is exactly why the drift went unnoticed. Both are pinned below.
 */
describe("loadWaitlistPosture", () => {
  it("reports public open when gate unset", () => {
    const p = loadWaitlistPosture({});
    expect(p.gateEnabled).toBe(false);
    expect(p.publicPageOpen).toBe(true);
    expect(p.operatorHint).toMatch(/public/i);
  });

  it("stays OPEN when only GATE_ENABLED is set — the deliberate FOUNDING default", () => {
    // The invariant that was never covered. A single flag must NOT lock the
    // public funnel; if this ever starts reporting locked, the FOUNDING signup
    // path has silently shut behind a Basic Auth prompt.
    const p = loadWaitlistPosture({
      GSE_WAITLIST_GATE_ENABLED: "true",
      GSE_WAITLIST_BASIC_USER: "ops",
      GSE_WAITLIST_BASIC_PASSWORD: "secret",
    });
    expect(p.gateEnabled).toBe(false);
    expect(p.publicPageOpen).toBe(true);
  });

  it("reports locked when BOTH flags are true, with creds", () => {
    const p = loadWaitlistPosture({
      GSE_WAITLIST_GATE_ENABLED: "true",
      GSE_WAITLIST_BASIC_FORCE: "true",
      GSE_WAITLIST_BASIC_USER: "ops",
      GSE_WAITLIST_BASIC_PASSWORD: "secret",
    });
    expect(p.gateEnabled).toBe(true);
    expect(p.publicPageOpen).toBe(false);
    expect(p.basicAuthCredentialsConfigured).toBe(true);
    // The hint names the flag that actually re-opens the funnel. It used to say
    // GATE_ENABLED=false, which under the two-flag design is no longer the
    // instruction that works — unsetting BASIC_FORCE is.
    expect(p.operatorHint).toMatch(/BASIC_FORCE/);
  });

  it("flags incomplete creds when the gate is genuinely on", () => {
    const p = loadWaitlistPosture({
      GSE_WAITLIST_GATE_ENABLED: "true",
      GSE_WAITLIST_BASIC_FORCE: "true",
      GSE_WAITLIST_BASIC_USER: "ops",
    });
    expect(p.basicAuthCredentialsConfigured).toBe(false);
    expect(p.operatorHint).toMatch(/incomplete/i);
  });
});
