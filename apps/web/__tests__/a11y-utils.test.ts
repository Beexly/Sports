/**
 * Tests for accessibility utility library.
 * Covers: aria-helpers, keyboard utils.
 */

import { describe, it, expect, vi } from "vitest";
import {
  ariaId,
  ariaDescribedBy,
  ariaLabelledBy,
  liveRegionProps,
  ariaExpanded,
  ariaPressed,
  ariaSelected,
  ariaChecked,
  srOnly,
} from "@/lib/a11y/aria-helpers";
import { isKey, isActivationKey, createRovingTabIndex, Keys } from "@/lib/a11y/keyboard";

// ──────────────────────────────────────────────────────────────────────────────
// ariaId
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaId", () => {
  it("returns a string containing the given prefix", () => {
    const id = ariaId("modal");
    expect(id).toMatch(/^a11y-modal-\d+$/);
  });

  it("uses default prefix when none is supplied", () => {
    const id = ariaId();
    expect(id).toMatch(/^a11y-id-\d+$/);
  });

  it("generates unique IDs on successive calls", () => {
    const a = ariaId("btn");
    const b = ariaId("btn");
    expect(a).not.toBe(b);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaDescribedBy
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaDescribedBy", () => {
  it("filters out undefined values", () => {
    expect(ariaDescribedBy("hint", undefined)).toBe("hint");
  });

  it("filters out null values", () => {
    expect(ariaDescribedBy(null, "error")).toBe("error");
  });

  it("returns undefined when all values are falsy", () => {
    expect(ariaDescribedBy(undefined, null)).toBeUndefined();
  });

  it("returns a single id as-is", () => {
    expect(ariaDescribedBy("hint-text")).toBe("hint-text");
  });

  it("joins multiple ids with a space", () => {
    expect(ariaDescribedBy("id-a", "id-b", "id-c")).toBe("id-a id-b id-c");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaLabelledBy
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaLabelledBy", () => {
  it("filters out undefined values", () => {
    expect(ariaLabelledBy(undefined, "label-id")).toBe("label-id");
  });

  it("filters out null values", () => {
    expect(ariaLabelledBy(null, "title-id")).toBe("title-id");
  });

  it("returns undefined when all values are falsy", () => {
    expect(ariaLabelledBy(undefined, null)).toBeUndefined();
  });

  it("joins multiple ids with a space", () => {
    expect(ariaLabelledBy("title", "subtitle")).toBe("title subtitle");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// liveRegionProps
// ──────────────────────────────────────────────────────────────────────────────

describe("liveRegionProps", () => {
  it("returns role=status for polite politeness", () => {
    const props = liveRegionProps("polite");
    expect(props.role).toBe("status");
    expect(props["aria-live"]).toBe("polite");
    expect(props["aria-atomic"]).toBe("true");
  });

  it("returns role=alert for assertive politeness", () => {
    const props = liveRegionProps("assertive");
    expect(props.role).toBe("alert");
    expect(props["aria-live"]).toBe("assertive");
  });

  it("defaults to polite when no argument is given", () => {
    const props = liveRegionProps();
    expect(props["aria-live"]).toBe("polite");
    expect(props.role).toBe("status");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaExpanded
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaExpanded", () => {
  it('returns "true" when isOpen is true', () => {
    expect(ariaExpanded(true)).toEqual({ "aria-expanded": "true" });
  });

  it('returns "false" when isOpen is false', () => {
    expect(ariaExpanded(false)).toEqual({ "aria-expanded": "false" });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaPressed
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaPressed", () => {
  it('returns "mixed" for mixed state', () => {
    expect(ariaPressed("mixed")).toEqual({ "aria-pressed": "mixed" });
  });

  it('returns "true" when pressed', () => {
    expect(ariaPressed(true)).toEqual({ "aria-pressed": "true" });
  });

  it('returns "false" when not pressed', () => {
    expect(ariaPressed(false)).toEqual({ "aria-pressed": "false" });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaChecked
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaChecked", () => {
  it('returns "true" when checked', () => {
    expect(ariaChecked(true)).toEqual({ "aria-checked": "true" });
  });

  it('returns "false" when unchecked', () => {
    expect(ariaChecked(false)).toEqual({ "aria-checked": "false" });
  });

  it('returns "mixed" for indeterminate state', () => {
    expect(ariaChecked("mixed")).toEqual({ "aria-checked": "mixed" });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// srOnly
// ──────────────────────────────────────────────────────────────────────────────

describe("srOnly", () => {
  it('returns an object with position: "absolute"', () => {
    const styles = srOnly();
    expect(styles.position).toBe("absolute");
  });

  it("returns 1px width and height", () => {
    const styles = srOnly();
    expect(styles.width).toBe("1px");
    expect(styles.height).toBe("1px");
  });

  it("has overflow hidden and clipping rect", () => {
    const styles = srOnly();
    expect(styles.overflow).toBe("hidden");
    expect(styles.clip).toBe("rect(0,0,0,0)");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isKey
// ──────────────────────────────────────────────────────────────────────────────

describe("isKey", () => {
  it("returns true when event key matches", () => {
    expect(isKey({ key: "Enter" }, Keys.ENTER)).toBe(true);
  });

  it("returns false when event key does not match", () => {
    expect(isKey({ key: "Escape" }, Keys.ENTER)).toBe(false);
  });

  it("matches Space key correctly", () => {
    expect(isKey({ key: " " }, Keys.SPACE)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// isActivationKey
// ──────────────────────────────────────────────────────────────────────────────

describe("isActivationKey", () => {
  it("returns true for Enter key", () => {
    expect(isActivationKey({ key: "Enter" })).toBe(true);
  });

  it("returns true for Space key", () => {
    expect(isActivationKey({ key: " " })).toBe(true);
  });

  it("returns false for Escape key", () => {
    expect(isActivationKey({ key: "Escape" })).toBe(false);
  });

  it("returns false for ArrowDown key", () => {
    expect(isActivationKey({ key: "ArrowDown" })).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// createRovingTabIndex
// ──────────────────────────────────────────────────────────────────────────────

describe("createRovingTabIndex", () => {
  it("starts at index 0 by default", () => {
    const handlers = createRovingTabIndex({ itemCount: 5 });
    expect(handlers.activeIndex).toBe(0);
  });

  it("respects initialIndex parameter", () => {
    const handlers = createRovingTabIndex({ itemCount: 5, initialIndex: 2 });
    expect(handlers.activeIndex).toBe(2);
  });

  it("moves to next item on ArrowDown", () => {
    const onChange = vi.fn();
    const handlers = createRovingTabIndex({ itemCount: 3, onChange });
    handlers.onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("wraps around at end when loop=true", () => {
    const handlers = createRovingTabIndex({ itemCount: 3, initialIndex: 2, loop: true });
    handlers.onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(0);
  });

  it("does not wrap when loop=false", () => {
    const handlers = createRovingTabIndex({ itemCount: 3, initialIndex: 2, loop: false });
    handlers.onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(2);
  });

  it("moves to prev item on ArrowUp", () => {
    const handlers = createRovingTabIndex({ itemCount: 3, initialIndex: 2 });
    handlers.onKeyDown({ key: "ArrowUp", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(1);
  });

  it("moves to first item on Home key", () => {
    const handlers = createRovingTabIndex({ itemCount: 5, initialIndex: 3 });
    handlers.onKeyDown({ key: "Home", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(0);
  });

  it("moves to last item on End key", () => {
    const handlers = createRovingTabIndex({ itemCount: 5, initialIndex: 0 });
    handlers.onKeyDown({ key: "End", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(4);
  });

  it("setActiveIndex updates the active index", () => {
    const handlers = createRovingTabIndex({ itemCount: 5 });
    handlers.setActiveIndex(3);
    expect(handlers.activeIndex).toBe(3);
  });

  it("horizontal orientation responds to ArrowRight", () => {
    const handlers = createRovingTabIndex({ itemCount: 3, orientation: "horizontal" });
    handlers.onKeyDown({ key: "ArrowRight", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(1);
  });

  it("horizontal orientation ignores ArrowDown", () => {
    const handlers = createRovingTabIndex({ itemCount: 3, orientation: "horizontal" });
    handlers.onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() });
    expect(handlers.activeIndex).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Keys constants
// ──────────────────────────────────────────────────────────────────────────────

describe("Keys constants", () => {
  it("all Keys values are strings", () => {
    for (const value of Object.values(Keys)) {
      expect(typeof value).toBe("string");
    }
  });

  it("Keys.ENTER is 'Enter'", () => {
    expect(Keys.ENTER).toBe("Enter");
  });

  it("Keys.SPACE is a single space character", () => {
    expect(Keys.SPACE).toBe(" ");
  });

  it("Keys.ESCAPE is 'Escape'", () => {
    expect(Keys.ESCAPE).toBe("Escape");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ariaSelected
// ──────────────────────────────────────────────────────────────────────────────

describe("ariaSelected", () => {
  it('returns "true" when selected', () => {
    expect(ariaSelected(true)).toEqual({ "aria-selected": "true" });
  });

  it('returns "false" when not selected', () => {
    expect(ariaSelected(false)).toEqual({ "aria-selected": "false" });
  });
});
