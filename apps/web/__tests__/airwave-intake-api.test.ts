import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Route is ADMIN-gated (lib/auth/require-admin). Mock the session so the happy
// path exercises the intake proof, and assert the gate itself separately.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

const ORIGINAL_ENV = { ...process.env };

async function callRoute(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/airwave/intake-readiness/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/airwave/intake-readiness", () => {
  beforeEach(() => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    authMock.mockReset();
    vi.resetModules();
  });

  it("returns read-only intake proof without leaking local file values", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-airwave-intake-route-"));
    const file = join(dir, "owner-private-transcripts.tsv");
    writeFileSync(
      file,
      [
        "aired_at_ct\tshow\tsegment\tspeaker\tparaphrased_claim\tsport\tentity\tclaim_type\tconfidence\trights_status\tsource_pointer\toperator_status",
        "2026-06-05 08:15\tGalaxy AM\tH1\tHost\tRole note\tNFL\tSmith\trole\tlean\towned\tprivate://clip\tapproved",
      ].join("\n"),
      "utf8",
    );

    try {
      process.env["AIRWAVE_ENABLED"] = "true";
      process.env["AIRWAVE_TRANSCRIPT_IMPORT_ENABLED"] = "true";
      process.env["AIRWAVE_TRANSCRIPT_FILE_PATH"] = file;

      const { status, body } = await callRoute();

      expect(status).toBe(200);
      expect(body["success"]).toBe(true);

      const data = body["data"] as Record<string, unknown>;
      const source = data["source"] as Record<string, unknown>;
      const rows = data["rows"] as Record<string, unknown>;
      const policy = data["policy"] as Record<string, unknown>;

      expect(source["status"]).toBe("review-ready");
      expect(source["fileKind"]).toBe(".tsv");
      expect(rows["reviewReady"]).toBe(1);
      expect(policy["writesDatabase"]).toBe(false);
      expect(policy["autoPublishes"]).toBe(false);

      const json = JSON.stringify(body);
      expect(json).not.toContain(file);
      expect(json).not.toContain("owner-private-transcripts");
      expect(json).not.toContain("Role note");
      expect(json).not.toContain("private://clip");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects non-admin callers with 403 and never leaks the local file path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-airwave-intake-route-403-"));
    const file = join(dir, "owner-private-transcripts.tsv");
    writeFileSync(file, "header\nvalue\n", "utf8");

    try {
      process.env["AIRWAVE_TRANSCRIPT_FILE_PATH"] = file;
      authMock.mockResolvedValue(null);

      const { status, body } = await callRoute();

      expect(status).toBe(403);
      expect(body["success"]).toBeUndefined();
      expect(body["data"]).toBeUndefined();
      const json = JSON.stringify(body);
      expect(json).not.toContain(file);
      expect(json).not.toContain("owner-private-transcripts");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
