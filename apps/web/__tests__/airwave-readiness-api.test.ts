import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/airwave/readiness/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/airwave/readiness", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the Airwave control plane without leaking env values or enabling work", async () => {
    process.env["AIRWAVE_TRANSCRIPT_SHEET_ID"] = "secret-sheet-id";
    process.env["AIRWAVE_ENABLED"] = "false";

    const { status, body } = await callRoute();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);

    const data = body["data"] as Record<string, unknown>;
    const summary = data["summary"] as Record<string, unknown>;
    const policy = data["policy"] as Record<string, unknown>;
    const lanes = data["lanes"] as Array<Record<string, unknown>>;

    expect(summary["open"]).toBe(0);
    expect(policy["exposesSecretValues"]).toBe(false);
    expect(policy["capturesOnRequest"]).toBe(false);
    expect(policy["archivesRawAudio"]).toBe(false);
    expect(policy["autoPublishes"]).toBe(false);
    expect(lanes.some((lane) => lane["key"] === "transcript-spreadsheet")).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret-sheet-id");
  });
});
