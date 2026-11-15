import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * /glass-ledger is retired and permanently redirects to /picks.
 * One record (/record), one published picks feed (/picks) - no second copy
 * of the ledger to drift.
 */

class RedirectSentinel extends Error {
  readonly target: string;
  constructor(target: string) {
    super(`NEXT_REDIRECT:${target}`);
    this.target = target;
  }
}

const redirectMock = vi.fn((target: string): never => {
  throw new RedirectSentinel(target);
});

vi.mock("next/navigation", () => ({
  redirect: (target: string) => redirectMock(target),
}));

import GlassLedgerRetiredPage from "@/app/glass-ledger/page";

afterEach(() => {
  vi.unstubAllEnvs();
  redirectMock.mockClear();
});

describe("/glass-ledger - retired redirect route", () => {
  it("calls redirect('/picks') when PUBLISH_LEDGER is unset", () => {
    vi.unstubAllEnvs();
    expect(() => GlassLedgerRetiredPage()).toThrow(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/picks");
  });

  it("calls redirect('/picks') even when PUBLISH_LEDGER=true", () => {
    vi.stubEnv("PUBLISH_LEDGER", "true");
    expect(() => GlassLedgerRetiredPage()).toThrow(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/picks");
  });

  it("contains no percent claims and no 'win rate' copy in source", () => {
    const src = readFileSync(join(process.cwd(), "app/glass-ledger/page.tsx"), "utf8");
    expect(src).not.toMatch(/\d+(\.\d+)?%/);
    expect(src.toLowerCase()).not.toContain("win rate");
  });
});
