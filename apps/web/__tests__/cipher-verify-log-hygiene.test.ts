/**
 * /api/cipher/verify must never write a raw client IP to the log store.
 *
 * THE BUG
 * -------
 * On every solve the route logged `· ip ${ip}` — and the comment directly above
 * it read "No PII, no grant performed here", which was factually wrong: an IP
 * address is personal data under GDPR Art. 4(1) (Breyer, C-582/14) and is
 * "personal information" under CCPA §1798.140(v)(1)(A). Vercel retains stdout
 * for the whole log-retention window, so this was an undeclared PII sink on a
 * public, unauthenticated endpoint.
 *
 * THE INVARIANT
 * -------------
 * The solve line still exists (an operator has to fulfil the reward by hand and
 * needs to see repeat sources), but it carries only the peppered SHA-256
 * fingerprint the rate limiter already keys on, truncated. No IP-shaped token
 * may appear anywhere in anything the route logs.
 *
 * `getCipherStatus` is time-of-week dependent, so it is stubbed to hold week 1
 * open; `getChapterByWeek` / `normalizeAnswer` stay real, and the answer below
 * is the real shard assembly whose SHA-256 is week 1's stored `answerHash`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/cipher/cipher", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cipher/cipher")>();
  return {
    ...actual,
    getCipherStatus: () => ({
      chapter: actual.getChapterByWeek(1)!,
      state: "live" as const,
      msRemaining: 60_000,
      boundaryISO: new Date(Date.now() + 60_000).toISOString(),
    }),
  };
});

import { POST } from "@/app/api/cipher/verify/route";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { fingerprintClientKey } from "@/lib/api/public-form-rate-limit";
import type { NextRequest } from "next/server";

/** shard 01 + 02 + 03 for week 1, normalized. */
const WEEK_1_ANSWER = "vela7c9dusk";

/** Anything that reads as an IPv4 or a multi-group IPv6 literal. */
const IP_SHAPED = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b(?:[0-9a-f]{0,4}:){2,}[0-9a-f]{0,4}\b/i;

let ipSeq = 0;
function nextClientIp(): string {
  return `198.51.100.${(ipSeq++ % 200) + 20}`;
}

function solveRequest(ip: string, answer = WEEK_1_ANSWER): NextRequest {
  return new Request("http://localhost/api/cipher/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ week: 1, answer }),
  }) as NextRequest;
}

let logs: string[] = [];
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRateLimits();
  logs = [];
  infoSpy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  });
});

afterEach(() => {
  infoSpy.mockRestore();
});

describe("POST /api/cipher/verify — log hygiene", () => {
  it("logs the solve without the client IP in any form", async () => {
    const ip = nextClientIp();
    const res = await POST(solveRequest(ip));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, correct: true, week: 1 });

    const line = logs.join("\n");
    expect(line).toContain("[cipher] week 1 solved");
    // The specific address, and anything else IP-shaped.
    expect(line).not.toContain(ip);
    expect(line).not.toMatch(IP_SHAPED);
    // …and the old field name is gone, not merely reordered.
    expect(line).not.toMatch(/·\s*ip\s/);
  });

  it("logs a stable, non-reversible fingerprint an operator can still correlate", async () => {
    const ip = nextClientIp();
    await POST(solveRequest(ip));
    const first = logs.join("\n");
    logs = [];
    resetRateLimits();
    await POST(solveRequest(ip));
    const second = logs.join("\n");

    const expected = fingerprintClientKey(ip).slice(0, 12);
    expect(first).toContain(`ipFingerprint ${expected}`);
    // Same source → same token, so repeat solves are still correlatable.
    expect(second).toContain(`ipFingerprint ${expected}`);
    // Peppered SHA-256: the token cannot be turned back into the address.
    expect(expected).not.toContain(ip);
    expect(expected).toMatch(/^[0-9a-f]{12}$/);
  });

  it("gives a different source a different fingerprint", async () => {
    const a = nextClientIp();
    const b = nextClientIp();
    expect(fingerprintClientKey(a).slice(0, 12)).not.toBe(fingerprintClientKey(b).slice(0, 12));
  });

  it("the route source no longer claims the log is PII-free", () => {
    // The comment above the log line used to assert "No PII, no grant performed
    // here" while logging an IP. Assert at RUNTIME (apps/web/tsconfig.json
    // excludes **/*.test.ts, so nothing here is type-checked).
    const src = readFileSync(
      resolve(__dirname, "..", "app", "api", "cipher", "verify", "route.ts"),
      "utf8",
    );
    expect(src).not.toContain("No PII");
    expect(src).toContain("personal identifier");
    // No template literal interpolating the raw ip into a log line.
    expect(src).not.toMatch(/ip \$\{ip\}/);
  });
});
