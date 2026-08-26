/**
 * /api/waitlist must not be an email-enumeration oracle.
 *
 * THE BUG
 * -------
 * The handler answered `{ ok: true, status: duplicate ? "already_queued" :
 * "queued" }`. Anyone could POST an address and read off the response whether
 * that address was already on the founding waitlist — and, when it was not, the
 * probe SILENTLY ENROLLED it, so the oracle was also a write. Combined with the
 * forgeable rate-limit key (see client-ip-forgery-rate-limit.test.ts) it
 * enumerated at scale.
 *
 * THE INVARIANT
 * -------------
 * A new address and an existing address must produce a BYTE-IDENTICAL response:
 * same status, same body text, same `content-type`. The `duplicate` distinction
 * survives server-side and still gates the outbound Resend welcome email — it
 * just never leaves the process.
 *
 * The welcome-email module is mocked, so no test in this file can send mail.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

// `vi.mock` is hoisted above the imports, so the spy must be too.
const { sendWaitlistWelcomeEmail } = vi.hoisted(() => ({
  sendWaitlistWelcomeEmail: vi.fn(async () => ({
    sent: false as const,
    detail: "mocked",
    classification: "not_configured" as const,
  })),
}));

vi.mock("@/lib/gse/waitlist-welcome-email", () => ({
  sendWaitlistWelcomeEmail,
  isWaitlistWelcomeEmailEnabled: () => false,
}));

import { POST } from "@/app/api/waitlist/route";
import { createWaitlistStore } from "@/lib/gse/waitlist-store";
import { resetRateLimits } from "@/lib/api/rate-limit";

const LEAD = {
  fullName: "Wren Alvarez",
  email: "wren@example.com",
  role: "operator",
  sportInterests: ["NFL"],
  consent: true,
} as const;

// One distinct client per POST: the public-form limiter is 5/60s per IP and is
// durable Postgres in CI, where resetRateLimits() cannot clear a bucket.
let ipSeq = 0;
function nextClientIp(): string {
  return `203.0.113.${(ipSeq++ % 200) + 20}`;
}

const tmpFiles: string[] = [];
function tmpStorePath(tag: string): string {
  const p = path.join(
    os.tmpdir(),
    `gse-waitlist-oracle-${tag}-${process.pid}-${Date.now()}-${ipSeq}.json`,
  );
  tmpFiles.push(p);
  return p;
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": nextClientIp() },
    body: JSON.stringify(body),
  });
}

/** Everything an attacker can observe about one response. */
async function observable(res: Response): Promise<{
  status: number;
  contentType: string | null;
  text: string;
}> {
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    text: await res.text(),
  };
}

beforeEach(() => {
  resetRateLimits();
  sendWaitlistWelcomeEmail.mockClear();
});

afterEach(async () => {
  for (const f of tmpFiles.splice(0)) {
    await fs.rm(f, { force: true });
  }
});

describe("POST /api/waitlist — no email-enumeration oracle", () => {
  it("answers a NEW address and an EXISTING address byte-identically", async () => {
    const storePath = tmpStorePath("identical");
    process.env.GSE_WAITLIST_STORE_PATH = storePath;

    const first = await observable(await POST(request(LEAD)));
    const second = await observable(await POST(request(LEAD)));

    expect(first.status).toBe(200);
    expect(second).toEqual(first);
    // Pin the shape too, so a future change cannot re-introduce the tell by
    // renaming the field rather than by branching on it.
    expect(JSON.parse(first.text)).toEqual({ ok: true, status: "queued" });
    expect(first.text).not.toContain("already");
    expect(second.text).not.toContain("already");
  });

  it("still recognises the duplicate server-side: one row, one welcome email", async () => {
    const storePath = tmpStorePath("dedupe");
    process.env.GSE_WAITLIST_STORE_PATH = storePath;

    await POST(request(LEAD));
    expect(sendWaitlistWelcomeEmail).toHaveBeenCalledTimes(1);

    await POST(request(LEAD));
    // The oracle is closed, but the dedupe is NOT: the second submission must
    // not insert a second row and must not trigger a second outbound email.
    expect(sendWaitlistWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(await createWaitlistStore(storePath).list()).toHaveLength(1);
  });

  it("is indistinguishable from the honeypot/too-fast silent drop", async () => {
    // The anti-bot paths already answered a flat `{ ok: true, status: "queued" }`.
    // If the duplicate branch differed from them, the oracle would simply move.
    const storePath = tmpStorePath("silent-drop");
    process.env.GSE_WAITLIST_STORE_PATH = storePath;

    const real = await observable(await POST(request(LEAD)));
    const dup = await observable(await POST(request(LEAD)));
    const honeypot = await observable(
      await POST(request({ ...LEAD, email: "other@example.com", website: "http://spam.example" })),
    );

    expect(dup.text).toBe(real.text);
    expect(honeypot.text).toBe(real.text);
    expect(honeypot.status).toBe(real.status);
  });
});
