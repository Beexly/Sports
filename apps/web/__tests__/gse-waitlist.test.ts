import { describe, it, expect, afterEach } from "vitest";
import { promises as fs, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createElement } from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { WaitlistForm } from "@/components/gsn/waitlist-form";

import {
  validateWaitlistLead,
  runNoClaimGuard,
  hasNoPerformanceClaim,
} from "@/lib/gse/waitlist-validation";
import { createWaitlistStore, selectWaitlistStore } from "@/lib/gse/waitlist-store";
import {
  WAITLIST_COPY,
  ALL_WAITLIST_COPY_STRINGS,
  BACKTEST_TRANSPARENCY,
  BACKTEST_TRUTH,
} from "@/lib/gse/waitlist-copy";
import { track, isAnalyticsEvent } from "@/lib/analytics/events";
import {
  ALL_CONTENT_DRAFT_STRINGS,
  SOCIAL_POST_DRAFTS,
  RESEARCH_BRIEF_TOPICS,
} from "@/lib/gse/content-drafts";
import { POST } from "@/app/api/waitlist/route";
import WaitlistPage from "@/app/waitlist/page";

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

describe("waitlist page — render-level no-claim + backtest truth (C18)", () => {
  it("renders the honest backtest truth in the DOM", () => {
    const { container } = render(createElement(WaitlistPage));
    const text = container.textContent ?? "";
    expect(text).toContain("10,301");
    expect(text.toLowerCase()).toContain("does not beat naive");
  });

  it("the fully assembled page text is no-claim (scanner + perf check)", () => {
    const { container } = render(createElement(WaitlistPage));
    const text = container.textContent ?? "";
    const guard = runNoClaimGuard(text);
    expect(guard.ok, `assembled page blocked -> ${JSON.stringify(guard.flags)}`).toBe(true);
    expect(hasNoPerformanceClaim(text)).toBe(true);
    // never any pricing/Stripe on the public-safe page
    expect(/\$\d|\bstripe\b|\bpricing\b/i.test(text)).toBe(false);
  });
});

describe("backtest truth — code/doc drift guard (QA backtest)", () => {
  const docPath = path.resolve(__dirname, "..", "..", "..", "docs", "gse", "backtest-transparency.md");
  const doc = readFileSync(docPath, "utf8");

  it("the code constant matches the documented figures", () => {
    expect(BACKTEST_TRUTH.samples).toBe(10_301);
    expect(BACKTEST_TRUTH.modelMae).toBe(5.18);
    expect(BACKTEST_TRUTH.naiveMae).toBe(4.9999);
    expect(BACKTEST_TRUTH.beatsNaive).toBe(false);
  });

  it("the transparency doc still carries the honest figures (no silent spin)", () => {
    expect(doc).toContain("10,301");
    expect(doc).toContain("5.180");
    expect(doc).toContain("4.9999");
    expect(doc.toLowerCase()).toContain("beats naive");
    expect(doc.toLowerCase()).toContain("false");
  });
});

describe("email drafts — no-claim scan (QA no-claim)", () => {
  const emailFiles = ["confirmation-email.md", "follow-up-sequence.md"];
  for (const file of emailFiles) {
    it(`${file} passes the compliance scanner with 0 block flags`, () => {
      const text = readFileSync(
        path.resolve(__dirname, "..", "..", "..", "docs", "gse", file),
        "utf8",
      );
      const guard = runNoClaimGuard(text);
      expect(guard.ok, `blocked in ${file} -> ${JSON.stringify(guard.flags)}`).toBe(true);
    });
  }
});

describe("form a11y — required-field semantics", () => {
  it("marks the email and consent gates aria-required", () => {
    render(createElement(WaitlistForm));
    const email = screen.getByLabelText(WAITLIST_COPY.fields.email);
    expect(email.getAttribute("aria-required")).toBe("true");
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

describe("validation hardening — oversized inputs (A5)", () => {
  it("rejects an over-long name (>120)", () => {
    const r = validateWaitlistLead({ ...VALID_LEAD, fullName: "x".repeat(121) });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.errors.fullName).toBeTruthy();
  });

  it("rejects an over-long free-text field (>2000)", () => {
    const r = validateWaitlistLead({ ...VALID_LEAD, currentStack: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });
});

describe("store concurrency (per-file write lock)", () => {
  it("does not lose leads under concurrent record() calls", async () => {
    const store = createWaitlistStore(tmpStorePath("concurrency"));
    const lead = (n: number) => {
      const r = validateWaitlistLead({ ...VALID_LEAD, email: `user${n}@example.com` });
      if (!r.success) throw new Error("fixture invalid");
      return r.data;
    };
    await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map((n) => store.record(lead(n))));
    expect(await store.list()).toHaveLength(8);
  });
});

describe("store selector (A1)", () => {
  it("selectWaitlistStore returns a working store at the configured path", async () => {
    const p = tmpStorePath("selector");
    process.env.GSE_WAITLIST_STORE_PATH = p;
    const store = selectWaitlistStore();
    const v = validateWaitlistLead(VALID_LEAD);
    expect(v.success).toBe(true);
    if (v.success) {
      await store.record(v.data);
      expect(await store.list()).toHaveLength(1);
    }
  });
});

describe("waitlist form wiring (source-level: A2 + A7)", () => {
  const formSource = readFileSync(
    path.resolve(__dirname, "..", "components", "gsn", "waitlist-form.tsx"),
    "utf8",
  );
  it("fires waitlist_viewed on mount via useEffect", () => {
    expect(formSource).toMatch(/useEffect\(/);
    expect(formSource).toContain('track("waitlist_viewed")');
  });
  it("includes an off-screen honeypot field", () => {
    expect(formSource).toContain("honeypot");
    expect(formSource).toContain("aria-hidden");
  });
});

describe("form a11y — error association (A6)", () => {
  it("sets aria-invalid + aria-describedby on a field after a failed submit", async () => {
    render(createElement(WaitlistForm));
    fireEvent.click(screen.getByRole("button", { name: WAITLIST_COPY.submitLabel }));
    const emailInput = screen.getByLabelText(WAITLIST_COPY.fields.email);
    await waitFor(() => expect(emailInput.getAttribute("aria-invalid")).toBe("true"));
    expect(emailInput.getAttribute("aria-describedby")).toBe("wl-email-error");
  });
});

describe("content drafts — CI no-claim scan (D19/D20)", () => {
  it("has 15 social drafts + 10 brief topics", () => {
    expect(SOCIAL_POST_DRAFTS).toHaveLength(25);
    expect(RESEARCH_BRIEF_TOPICS).toHaveLength(10);
  });

  it("every content draft passes the platform compliance scanner (0 block flags)", () => {
    for (const text of ALL_CONTENT_DRAFT_STRINGS) {
      const guard = runNoClaimGuard(text);
      expect(guard.ok, `blocked: "${text}" -> ${JSON.stringify(guard.flags)}`).toBe(true);
    }
  });

  it("every content draft is free of positive performance claims", () => {
    for (const text of ALL_CONTENT_DRAFT_STRINGS) {
      expect(hasNoPerformanceClaim(text), `claim in: "${text}"`).toBe(true);
    }
  });
});

describe("honeypot anti-spam (route: A7)", () => {
  function request(body: unknown): Request {
    return new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("silently drops a submission with the honeypot filled (stores nothing)", async () => {
    const p = tmpStorePath("honeypot");
    process.env.GSE_WAITLIST_STORE_PATH = p;
    const res = await POST(request({ ...VALID_LEAD, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "queued" });
    const store = createWaitlistStore(p);
    expect(await store.list()).toHaveLength(0);
  });

  it("stores normally when the honeypot is empty", async () => {
    const p = tmpStorePath("honeypot-empty");
    process.env.GSE_WAITLIST_STORE_PATH = p;
    const res = await POST(request({ ...VALID_LEAD, website: "" }));
    expect(await res.json()).toEqual({ ok: true, status: "queued" });
    const store = createWaitlistStore(p);
    expect(await store.list()).toHaveLength(1);
  });
});
