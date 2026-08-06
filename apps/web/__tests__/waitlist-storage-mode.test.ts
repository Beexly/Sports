import { afterEach, describe, expect, it } from "vitest";
import { resolveWaitlistStorageMode } from "@/lib/gse/waitlist-store";

afterEach(() => {
  delete process.env.VERCEL;
});

describe("resolveWaitlistStorageMode", () => {
  it("returns one of the known modes", () => {
    delete process.env.VERCEL;
    const mode = resolveWaitlistStorageMode();
    expect(["postgres", "file", "unavailable"]).toContain(mode);
  });
});
