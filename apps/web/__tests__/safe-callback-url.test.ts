import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";

/**
 * Open-redirect guard for the sign-in callbackUrl.
 *
 * The already-signed-in branch of /auth/signin passes this value straight to
 * Next's redirect(), so anything that escapes same-origin is a live open
 * redirect. These cases pin the parser-based guard against the classic bypasses.
 */
describe("safeCallbackUrl", () => {
  it("passes through clean same-origin paths", () => {
    expect(safeCallbackUrl("/today")).toBe("/today");
    expect(safeCallbackUrl("/")).toBe("/");
  });

  it("preserves query and hash on same-origin paths", () => {
    expect(safeCallbackUrl("/board?sport=nfl#top")).toBe("/board?sport=nfl#top");
  });

  it("falls back to /dashboard for empty/missing input", () => {
    expect(safeCallbackUrl(undefined)).toBe("/dashboard");
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
  });

  it("rejects absolute external URLs", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("http://evil.com/x")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/dashboard");
  });

  it("rejects the backslash bypass the naive guard missed", () => {
    // Browsers normalise `\` to `/`, so `/\evil.com` becomes `//evil.com`.
    expect(safeCallbackUrl("/\\evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("/\\/evil.com")).toBe("/dashboard");
  });

  it("rejects non-http(s) scheme URIs", () => {
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(safeCallbackUrl("data:text/html,<script>1</script>")).toBe("/dashboard");
  });
});
