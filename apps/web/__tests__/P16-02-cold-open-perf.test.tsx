import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * P16-02 VERIFY — cold-open data-saver respects + next/image hero still.
 *
 * The fix adds two performance safeguards:
 *  1. MontageEntrance skips the cinematic video on saveData or slow-2g/2g
 *     effectiveType so visitors on metered/slow connections are not forced to
 *     download ~4MB before reaching the page.
 *  2. GeneratedPlate (the homepage hero background) uses next/image instead of a
 *     raw <img> so the configured AVIF/WebP + responsive resizing engage.
 *
 * Tests for MontageEntrance use jsdom render + global stubs: the component
 * reads window.matchMedia, sessionStorage, and navigator.connection in its
 * mount effect. Tests for GeneratedPlate use a source-level check (mirrors
 * brand-kinetic-logo.test.ts pattern) because next/image's optimizer is not
 * available in jsdom and source presence is what proves the fix.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

// ── matchMedia stub ─────────────────────────────────────────────────────────

const makeMatchMedia = (overrides: Record<string, boolean> = {}) => {
  return (query: string) => ({
    matches: !!overrides[query],
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
};

// ── sessionStorage stub ─────────────────────────────────────────────────────

const makeSessionStorage = (initial: Record<string, string> = {}) => {
  let store = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
};

// ── MontageEntrance tests ───────────────────────────────────────────────────

// Mock the video's play method so the component doesn't error on unmount.
const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();

// jsdom's HTMLMediaElement.play() is not implemented (returns undefined,
// not a Promise). The component calls video.play().catch(...) — we must
// patch the prototype so it returns a real Promise. Done in beforeEach so
// it survives the per-test unstub/restore cycle.
beforeEach(() => {
  vi.stubGlobal("matchMedia", makeMatchMedia());
  const proto = window.HTMLMediaElement.prototype;
  vi.stubGlobal("HTMLMediaElement", window.HTMLMediaElement);
  proto.play = mockPlay;
  proto.pause = mockPause;
  mockPlay.mockClear();
  mockPause.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

beforeEach(() => {
  mockPlay.mockResolvedValue(undefined);
  mockPause.mockClear();
});

describe("P16-02 — MontageEntrance cold-open gating", () => {
  const montageSource = read("components/landing/montage-entrance.tsx");

  it("source contains saveData and effectiveType checks", () => {
    expect(montageSource).toContain("saveData");
    expect(montageSource).toContain("effectiveType");
  });

  it("renders nothing (no overlay) when prefers-reduced-motion is set", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia({ "(prefers-reduced-motion: reduce)": true }));
    vi.stubGlobal("sessionStorage", makeSessionStorage());

    const { MontageEntrance } = await import("@/components/landing/montage-entrance");
    const { container } = render(<MontageEntrance />);

    // No video element should be mounted — the component returns null early.
    expect(container.querySelector("video")).toBeNull();
    expect(container.innerHTML).not.toContain("gse-reveal");
  });

  it("renders nothing (no overlay) when saveData is true", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia());
    vi.stubGlobal("sessionStorage", makeSessionStorage());
    vi.stubGlobal("navigator", {
      ...globalThis.navigator,
      connection: { saveData: true, effectiveType: "4g" },
    });

    const { MontageEntrance } = await import("@/components/landing/montage-entrance");
    const { container } = render(<MontageEntrance />);

    expect(container.querySelector("video")).toBeNull();
  });

  it("renders nothing (no overlay) when effectiveType is slow-2g", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia());
    vi.stubGlobal("sessionStorage", makeSessionStorage());
    vi.stubGlobal("navigator", {
      ...globalThis.navigator,
      connection: { saveData: false, effectiveType: "slow-2g" },
    });

    const { MontageEntrance } = await import("@/components/landing/montage-entrance");
    const { container } = render(<MontageEntrance />);

    expect(container.querySelector("video")).toBeNull();
  });

  it("renders nothing (no overlay) when effectiveType is 2g", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia());
    vi.stubGlobal("sessionStorage", makeSessionStorage());
    vi.stubGlobal("navigator", {
      ...globalThis.navigator,
      connection: { saveData: false, effectiveType: "2g" },
    });

    const { MontageEntrance } = await import("@/components/landing/montage-entrance");
    const { container } = render(<MontageEntrance />);

    expect(container.querySelector("video")).toBeNull();
  });

  it("renders the video when saveData is false and effectiveType is 4g", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia());
    vi.stubGlobal("sessionStorage", makeSessionStorage());
    vi.stubGlobal("navigator", {
      ...globalThis.navigator,
      connection: { saveData: false, effectiveType: "4g" },
    });

    const { MontageEntrance } = await import("@/components/landing/montage-entrance");
    const { container } = render(<MontageEntrance />);

    // The overlay + video should be present for a capable visitor.
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/brand/gse-reveal.mp4");
    expect(container.querySelector("video")?.getAttribute("poster")).toBe("/brand/gse-reveal-poster.png");
  });
});

// ── GeneratedPlate / next/image tests ────────────────────────────────────────

describe("P16-02 — GeneratedPlate hero still uses next/image", () => {
  const plateSource = read("components/immersive/generated-plate.tsx");

  it("imports next/image", () => {
    expect(plateSource).toContain('import Image from "next/image"');
  });

  it("renders the still via <Image> not raw <img>", () => {
    // The eslint-disable for @next/next/no-img-element must be GONE — it was
    // only there to suppress the raw <img> lint, and next/image removes the need.
    expect(plateSource).not.toContain("@next/next/no-img-element");
    expect(plateSource).not.toMatch(/<img\b/);
  });

  it("uses fill + sizes + priority props on the Image so optimization engages", () => {
    expect(plateSource).toContain("fill");
    expect(plateSource).toContain('sizes="100vw"');
    expect(plateSource).toContain("priority={eager}");
  });

  it("next.config.mjs configures AVIF/WebP image formats", () => {
    const cfg = read("next.config.mjs");
    expect(cfg).toContain("image/avif");
    expect(cfg).toContain("image/webp");
  });
});
