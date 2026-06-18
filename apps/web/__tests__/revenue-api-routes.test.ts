/**
 * API route tests for newsletter/subscribe and ask-galaxy/submit.
 *
 * Asserts:
 * 1. Zod validation rejects invalid bodies (missing/bad email, missing required
 *    fields) with a 4xx JSON response.
 * 2. When the DB write throws, the handler returns an honest error (503 JSON
 *    with ok:false) and does NOT throw / does NOT return a fake {ok:true}.
 * 3. A valid body is accepted by the schema (happy path to DB success).
 *
 * No real DB or network. The POST handlers are called directly with a Request
 * object, matching the executed-handler pattern used by the rest of the suite.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Shared DB mock ────────────────────────────────────────────────────────────

const mockDb = {
  newsletterSubscriber: {
    upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  },
  askGalaxySubmission: {
    create: vi.fn<(args: unknown) => Promise<unknown>>(),
  },
};

vi.mock("@sports/db", () => ({
  db: mockDb,
}));

// ── Helper: build a NextRequest-compatible Request ────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeBadJsonRequest(): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-valid-json{{{",
  });
}

// ── /api/newsletter/subscribe ─────────────────────────────────────────────────

describe("POST /api/newsletter/subscribe — Zod validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when body is missing email entirely", async () => {
    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({ source: "test" }) as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
    expect(typeof body["error"]).toBe("string");
  });

  it("returns 400 when email is not a valid email address", async () => {
    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({ email: "not-an-email" }) as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeBadJsonRequest() as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when body is an empty object", async () => {
    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });
});

describe("POST /api/newsletter/subscribe — DB error → honest 503, never fake success", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 503 with ok:false when DB write throws — does NOT return ok:true", async () => {
    mockDb.newsletterSubscriber.upsert.mockRejectedValue(
      new Error("DB connection lost")
    );

    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ email: "test@example.com", source: "newsletter-page" }) as any
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
    // Must never return a fake success
    expect(body["ok"]).not.toBe(true);
    expect(typeof body["error"]).toBe("string");
  });

  it("does not throw an unhandled error when DB is down", async () => {
    mockDb.newsletterSubscriber.upsert.mockRejectedValue(
      new Error("Unexpected DB failure")
    );

    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      POST(makeRequest({ email: "user@example.com" }) as any)
    ).resolves.toBeDefined();
  });
});

describe("POST /api/newsletter/subscribe — happy path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with ok:true on successful DB upsert", async () => {
    mockDb.newsletterSubscriber.upsert.mockResolvedValue({ id: "sub-1" });

    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ email: "valid@example.com" }) as any
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(true);
  });

  it("accepts valid email + optional source field", async () => {
    mockDb.newsletterSubscriber.upsert.mockResolvedValue({ id: "sub-2" });

    const { POST } = await import(
      "../app/api/newsletter/subscribe/route"
    );
    const res = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeRequest({ email: "user@domain.com", source: "homepage" }) as any
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(true);
  });
});

// ── /api/ask-galaxy/submit ────────────────────────────────────────────────────

describe("POST /api/ask-galaxy/submit — Zod validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when email is missing", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        matchup: "Chiefs vs Eagles",
        considering: "I want to bet the spread",
        // no email
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when email is invalid", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "not-an-email",
        matchup: "Chiefs vs Eagles",
        considering: "I want to understand the spread",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when matchup is missing", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        // no matchup
        considering: "I want to understand the spread better.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when considering is missing", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        matchup: "Chiefs vs Eagles",
        // no considering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when body is empty object", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeBadJsonRequest() as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when matchup is too short (< 3 chars)", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        matchup: "AB",
        considering: "Some longer consideration text here.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });

  it("returns 400 when considering is too short (< 5 chars)", async () => {
    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        matchup: "Chiefs vs Eagles",
        considering: "Hi",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
  });
});

describe("POST /api/ask-galaxy/submit — DB error → honest 503, never fake success", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const VALID_BODY = {
    email: "user@example.com",
    matchup: "Chiefs vs Eagles",
    considering: "I want to understand the line movement before this game.",
  };

  it("returns 503 with ok:false when DB create throws — does NOT return ok:true", async () => {
    mockDb.askGalaxySubmission.create.mockRejectedValue(
      new Error("DB connection lost")
    );

    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(makeRequest(VALID_BODY) as any);

    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(false);
    expect(body["ok"]).not.toBe(true);
    expect(typeof body["error"]).toBe("string");
  });

  it("does not throw an unhandled error when DB is down", async () => {
    mockDb.askGalaxySubmission.create.mockRejectedValue(
      new Error("Unexpected failure")
    );

    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      POST(makeRequest(VALID_BODY) as any)
    ).resolves.toBeDefined();
  });
});

describe("POST /api/ask-galaxy/submit — happy path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 201 with ok:true and id when DB create succeeds", async () => {
    mockDb.askGalaxySubmission.create.mockResolvedValue({ id: "submission-abc-123" });

    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        matchup: "Chiefs vs Eagles",
        considering: "I want to understand the line movement before this game.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(true);
    expect(body["id"]).toBe("submission-abc-123");
  });

  it("accepts all optional fields (name, sport, league, reasoning, trustNeed, contactConsent)", async () => {
    mockDb.askGalaxySubmission.create.mockResolvedValue({ id: "sub-xyz" });

    const { POST } = await import(
      "../app/api/ask-galaxy/submit/route"
    );
    const res = await POST(
      makeRequest({
        email: "user@example.com",
        matchup: "Bills vs Dolphins",
        considering: "I have been tracking the line and it moved toward Bills.",
        name: "John Doe",
        sport: "NFL",
        league: "NFL",
        reasoning: "Bills have a strong defense this week.",
        trustNeed: "I want to know if the sharp money is on Bills.",
        contactConsent: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body["ok"]).toBe(true);
    expect(body["id"]).toBe("sub-xyz");
  });
});
