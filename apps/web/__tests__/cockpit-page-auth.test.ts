/**
 * G-1 — cockpit page-level auth, enforced by source scan.
 *
 * The cockpit layout gates the tree, but a page's RSC payload can be fetched
 * without the parent layout re-running, so EVERY cockpit page must carry its
 * own requireCockpitAdmin() call. The tree walk makes forgetting it a CI
 * failure, not a review hope; the unit half pins the helper's behavior.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<unknown>>(),
  redirect: vi.fn<(url: string) => never>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";

// ── Source scan: every cockpit page calls the guard ───────────────────────────

function collectPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectPages(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const cockpitDir = resolve(process.cwd(), "app/cockpit");
const pages = collectPages(cockpitDir);

describe("every cockpit page carries its own auth (G-1)", () => {
  it("found the cockpit page tree", () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
  });

  it.each(pages.map((p) => [p.slice(cockpitDir.length), p]))(
    "%s calls requireCockpitAdmin()",
    (_label, fullPath) => {
      const src = readFileSync(fullPath as string, "utf8");
      expect(src).toMatch(/from "@\/lib\/cockpit\/require-admin"/);
      expect(src).toMatch(/await requireCockpitAdmin\(\);/);
    },
  );
});

// ── Helper behavior ───────────────────────────────────────────────────────────

describe("requireCockpitAdmin", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.redirect.mockReset();
    // Real next/navigation redirect() throws; mirror that so execution stops.
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("bounces an unauthenticated visitor to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireCockpitAdmin()).rejects.toThrow(
      "REDIRECT:/auth/signin?callbackUrl=/cockpit",
    );
  });

  it("bounces an authenticated NON-admin to the public home", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "USER" } });
    await expect(requireCockpitAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("admits an ADMIN without redirecting", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "ADMIN" } });
    await expect(requireCockpitAdmin()).resolves.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
