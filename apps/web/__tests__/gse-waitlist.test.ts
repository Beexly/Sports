import { describe, it, expect, afterEach } from "vitest";
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { WaitlistForm } from "@/components/gsn/waitlist-form";

import {
  validateWaitlistLead,
  runNoClaimGuard,
  hasNoPerformanceClaim,
} from "@/lib/gse/waitlist-validation";
import { createWaitlistStore } from "@/lib/gse/waitlist-store";
import {
  WAITLIST_COPY,
  ALL_WAITLIST_COPY_STRINGS,
  BACKTEST_TRANSPARENCY,
  BACKTEST_TRUTH,
} from "@/lib/gse/waitlist-copy";
import { track, isAnalyticsEvent } from "@/lib/analytics/events";
import { POST } from "@/app/api/waitlist/route";

const VALID_LEAD = {
  fullName: "Jordan Rivers",
  email: "Jordan@Example.com",
  role: "operator",
  sportInterests: ["NFL"],
  consent: true,
};

const tmpFiles: string[] = [];
function tmpStorePath(tag: string): string {
  const p = path.join(os.tmpdir(), `gse-waitlist-test-${tag}-${process.pid}-${Date.now()}.json`);
  tmpFiles.push(p);
  return p;
}

afterEach(async () => {
  cleanup();
  await Promise.all(
    tmpFiles.splice(0).map((p) => fs.rm(p, { force: true }).catch(() => undefined)),
  );
  delete process.env.GSE_WAITLIST_STORE_PATH;
});

describe("waitlist validation", () => {
  it("accepts a valid lead and lowercases the email", () => {
    const result = validateWaitlistLead(VALID_LEAD);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jordan@example.com");
      expect(result.data.consent).toBe(true);
    }
  });

  it("rejects an invalid email", () => {
    const result = validateWaitlistLead({ ...VALID_LEAD, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBeTruthy();
  });

  it("requires at least one sport", () => {
    const result = validateWaitlistLead({ ...VALID_LEAD, sportInterests: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.sportInterests).toBeTruthy();
  });

  it("hard-gates on consent (false is rejected)", () => {
    const result = validateWaitlistLead({ ...VALID_LEAD, consent: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.consent).toBeTruthy();
  });

  it("rejects a non-object body", () => {
    const result = validateWaitlistLead("garbage");
    expect(result.success).toBe(false);
  });
});

describe("local-file waitlist store", () => {
  it("records a lead and de-duplicates by email", async () => {
    const store = createWaitlistStore(tmpStorePath("store"));
    const validated = validateWaitlistLead(VALID_LEAD);
    expect(validated.success).toBe(true);
    if (!validated.success) return;

    const first = await store.record(validated.data);
    expect(first).toEqual({ stored: true, duplicate: false });

    const second = await store.record(validated.data);
    expect(second).toEqual({ stored: false, duplicate: true });

    const all = await store.list();
    expect(all).toHaveLength(1);
    const [entry] = all;
    expect(entry).toBeDefined();
    expect(entry?.email).toBe("jordan@example.com");
    expect(entry?.reviewStatus).toBe("QUEUED");
    expect(entry?.consent).toBe(true);
  });

  it("returns an empty list when nothing has been recorded", async () => {
    const store = createWaitlistStore(tmpStorePath("empty"));
    expect(await store.list()).toEqual([]);
  });
});

describe("no-op analytics events", () => {
  it("registers the new waitlist events", () => {
    for (const name of [
      "waitlist_viewed",
      "waitlist_started",
      "waitlist_submitted",
      "waitlist_consent_blocked",
    ]) {
      expect(isAnalyticsEvent(name)).toBe(true);
    }
  });

  it("track is inert and returns the normalized payload", () => {
    const result = track("waitlist_submitted", { role: "operator" });
    expect(result).toEqual({ event: "waitlist_submitted", context: { role: "operator" } });
  });
});

describe("no-claim copy", () => {
  it("passes the platform compliance scanner with zero block flags", () => {
    for (const copy of ALL_WAITLIST_COPY_STRINGS) {
      const guard = runNoClaimGuard(copy);
      expect(guard.ok, `blocked copy: "${copy}" -> ${JSON.stringify(guard.flags)}`).toBe(true);
    }
  });

  it("contains no positive performance claim", () => {
    for (const copy of ALL_WAITLIST_COPY_STRINGS) {
      expect(hasNoPerformanceClaim(copy), `claim in: "${copy}"`).toBe(true);
    }
  });

  it("surfaces the honest backtest truth (beats naive = false)", () => {
    expect(BACKTEST_TRUTH.beatsNaive).toBe(false);
    expect(BACKTEST_TRANSPARENCY).toContain("10,301");
    expect(BACKTEST_TRANSPARENCY.toLowerCase()).toContain("does not beat naive");
  });

  it("never mentions pricing in waitlist copy", () => {
    for (const copy of ALL_WAITLIST_COPY_STRINGS) {
      expect(/\$\d|\bprice\b|\bpricing\b|\bstripe\b/i.test(copy)).toBe(false);
    }
  });
});

describe("POST /api/waitlist (local handler)", () => {
  function request(body: unknown): Request {
    return new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("queues a valid consented lead, then reports duplicates", async () => {
    process.env.GSE_WAITLIST_STORE_PATH = tmpStorePath("route");

    const ok = await POST(request(VALID_LEAD));
    expect(ok.status).toBe(200);
    const okBody = await ok.json();
    expect(okBody).toEqual({ ok: true, status: "queued" });

    const dup = await POST(request(VALID_LEAD));
    const dupBody = await dup.json();
    expect(dupBody).toEqual({ ok: true, status: "already_queued" });
  });

  it("rejects a submission without consent (422)", async () => {
    process.env.GSE_WAITLIST_STORE_PATH = tmpStorePath("route-consent");
    const res = await POST(request({ ...VALID_LEAD, consent: false }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors.consent).toBeTruthy();
  });

  it("rejects invalid JSON (400)", async () => {
    process.env.GSE_WAITLIST_STORE_PATH = tmpStorePath("route-bad");
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("copy field coverage", () => {
  it("exposes every form field label", () => {
    expect(Object.keys(WAITLIST_COPY.fields)).toEqual([
      "fullName",
      "email",
      "role",
      "sportInterests",
      "currentStack",
      "weakestProcess",
    ]);
  });
});

describe("waitlist form renders (DOM)", () => {
  it("renders the consent gate, email field, and submit button", () => {
    render(createElement(WaitlistForm));
    expect(screen.getByText(WAITLIST_COPY.consentLabel)).toBeTruthy();
    expect(screen.getByLabelText(WAITLIST_COPY.fields.email)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: WAITLIST_COPY.submitLabel }),
    ).toBeTruthy();
  });
});

describe("waitlist page (source-level)", () => {
  const pageSource = readFileSync(
    path.resolve(__dirname, "..", "app", "waitlist", "page.tsx"),
    "utf8",
  );

  it("is noindex and wires the form + backtest transparency", () => {
    expect(pageSource).toMatch(/index:\s*false/);
    expect(pageSource).toContain("WaitlistForm");
    expect(pageSource).toContain("BACKTEST_TRANSPARENCY");
  });
});
