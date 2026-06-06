import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/media/readiness/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/media/readiness", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns media readiness without leaking env values or enabling publication", async () => {
    process.env["THE_ODDS_API_KEY"] = "secret-odds-value";
    process.env["AVATAR_TTS_VENDOR"] = "secret-vendor-value";

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    const policy = data["policy"] as Record<string, unknown>;
    const lanes = data["lanes"] as Array<Record<string, unknown>>;

    expect(policy["autoPublishes"]).toBe(false);
    expect(policy["postsToSocial"]).toBe(false);
    expect(policy["sendsUserComms"]).toBe(false);
    expect(policy["exposesSecretValues"]).toBe(false);
    expect(lanes.some((lane) => lane["key"] === "studio-assets")).toBe(true);
    expect(lanes.some((lane) => lane["key"] === "public-blog")).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret-odds-value");
    expect(JSON.stringify(body)).not.toContain("secret-vendor-value");
  });
});
