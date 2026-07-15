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

describe("every cockpit page carries its own auth", () => {
  it("finds the expected cockpit page tree", () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
  });

  it.each(pages.map((page) => [page.slice(cockpitDir.length), page]))(
    "%s calls requireCockpitAdmin()",
    (_label, fullPath) => {
      const source = readFileSync(fullPath as string, "utf8");
      expect(source).toMatch(/from "@\/lib\/cockpit\/require-admin"/);
      expect(source).toMatch(/await requireCockpitAdmin\(\);/);
    },
  );
});

describe("requireCockpitAdmin", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.redirect.mockReset();
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
  });

  it("redirects an unauthenticated visitor to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireCockpitAdmin()).rejects.toThrow(
      "REDIRECT:/auth/signin?callbackUrl=/cockpit",
    );
  });

  it("redirects an authenticated non-admin to the public home", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "USER" } });
    await expect(requireCockpitAdmin()).rejects.toThrow("REDIRECT:/");
  });

  it("admits an admin without redirecting", async () => {
    mocks.auth.mockResolvedValue({ user: { role: "ADMIN" } });
    await expect(requireCockpitAdmin()).resolves.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
