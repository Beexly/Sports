import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const read = (p: string) =>
  fs.readFileSync(path.join(repoRoot, "apps/web", p), "utf8");

const guard = read("lib/admin/guard.ts");
const compRoute = read("app/api/admin/users/[id]/comp/route.ts");
const roleRoute = read("app/api/admin/users/[id]/role/route.ts");

describe("Mission Control admin guard", () => {
  it("requires an ADMIN role and supports an audit writer", () => {
    expect(guard).toMatch(/role !== "ADMIN"/);
    expect(guard).toContain("status: 403");
    expect(guard).toContain("status: 401");
    expect(guard).toContain("operatorAuditLog.create");
  });
});

describe("comp control route", () => {
  it("is admin-gated and audited", () => {
    expect(compRoute).toContain("requireAdminApi");
    expect(compRoute).toMatch(/if \(!guard\.ok\) return guard\.response/);
    expect(compRoute).toContain("writeOperatorAudit");
  });
  it("only allows paid comp tiers (FREE is cleared via null, not comped)", () => {
    expect(compRoute).toMatch(/z\.enum\(\["PRO", "ELITE", "VIP"\]\)\.nullable\(\)/);
  });
});

describe("role control route", () => {
  it("is admin-gated and audited", () => {
    expect(roleRoute).toContain("requireAdminApi");
    expect(roleRoute).toMatch(/if \(!guard\.ok\) return guard\.response/);
    expect(roleRoute).toContain("writeOperatorAudit");
  });
  it("guards against self-lockout (can't change your own role)", () => {
    expect(roleRoute).toContain("cannot-change-own-role");
  });
});
