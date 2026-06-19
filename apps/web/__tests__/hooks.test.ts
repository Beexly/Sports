import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useDebounce } from "@/lib/hooks/use-debounce";
import { useThrottle } from "@/lib/hooks/use-throttle";
import { usePrevious } from "@/lib/hooks/use-previous";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useClipboard } from "@/lib/hooks/use-clipboard";

// ---------------------------------------------------------------------------
// useDebounce
// ---------------------------------------------------------------------------
describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("returns updated value after delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } }
    );

    rerender({ value: "world" });
    expect(result.current).toBe("hello"); // not yet updated

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("world");
  });

  it("does NOT update before the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current).toBe("a");
  });

  it("cancels pending update when value changes before delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "first" } }
    );

    rerender({ value: "second" });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Change value again before the first debounce fires
    rerender({ value: "third" });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // "second" should never have been set
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("third");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// useThrottle
// ---------------------------------------------------------------------------
describe("useThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useThrottle("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("updates immediately on first change (leading edge)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: "a" } }
    );

    act(() => {
      rerender({ value: "b" });
    });

    expect(result.current).toBe("b");
  });

  it("does NOT update again until interval elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: "a" } }
    );

    // First change fires immediately
    act(() => {
      rerender({ value: "b" });
    });
    expect(result.current).toBe("b");

    // Second change within the interval should not fire yet
    act(() => {
      rerender({ value: "c" });
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("b");
  });

  it("updates after interval elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: "a" } }
    );

    // First change
    act(() => {
      rerender({ value: "b" });
    });
    expect(result.current).toBe("b");

    // Change within interval
    act(() => {
      rerender({ value: "c" });
    });

    // After the interval elapses, the latest value should be emitted
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("c");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 300),
      { initialProps: { value: 0 } }
    );

    act(() => {
      rerender({ value: 99 });
    });

    expect(result.current).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// usePrevious
// ---------------------------------------------------------------------------
describe("usePrevious", () => {
  it("returns undefined on first render", () => {
    const { result } = renderHook(() => usePrevious("hello"));
    expect(result.current).toBeUndefined();
  });

  it("returns the initial value on second render", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: "first" } }
    );

    rerender({ value: "second" });
    expect(result.current).toBe("first");
  });

  it("tracks subsequent updates correctly", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    rerender({ value: "c" });
    expect(result.current).toBe("b");

    rerender({ value: "d" });
    expect(result.current).toBe("c");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 2 });
    expect(result.current).toBe(1);
  });

  it("works with object values", () => {
    const objA = { id: 1 };
    const objB = { id: 2 };

    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: objA } }
    );

    rerender({ value: objB });
    expect(result.current).toBe(objA);
  });
});

// ---------------------------------------------------------------------------
// useLocalStorage
// ---------------------------------------------------------------------------
describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns initialValue when no stored value exists", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("sets and retrieves a value from localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "default"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(localStorage.getItem("test-key")).toBe(JSON.stringify("updated"));
  });

  it("remove() deletes the key and resets to initialValue", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("stored value");
    });
    expect(result.current[0]).toBe("stored value");

    act(() => {
      result.current[2](); // remove
    });

    expect(result.current[0]).toBe("initial");
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("handles invalid JSON gracefully by returning initialValue", () => {
    localStorage.setItem("bad-json-key", "{ not valid json }}}");

    const { result } = renderHook(() =>
      useLocalStorage("bad-json-key", "fallback")
    );

    expect(result.current[0]).toBe("fallback");
  });

  it("accepts an updater function (functional update)", () => {
    const { result } = renderHook(() => useLocalStorage("counter-key", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 10);
    });

    expect(result.current[0]).toBe(11);
  });

  it("initializes from existing localStorage value", () => {
    localStorage.setItem("pre-existing", JSON.stringify({ foo: "bar" }));

    const { result } = renderHook(() =>
      useLocalStorage("pre-existing", { foo: "default" })
    );

    expect(result.current[0]).toEqual({ foo: "bar" });
  });

  it("works with array values", () => {
    const { result } = renderHook(() =>
      useLocalStorage<number[]>("arr-key", [])
    );

    act(() => {
      result.current[1]([1, 2, 3]);
    });

    expect(result.current[0]).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// useMediaQuery
// ---------------------------------------------------------------------------
describe("useMediaQuery", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("returns the correct match value when matchMedia matches", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("returns false when matchMedia does not match", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery("(min-width: 1200px)"));
    expect(result.current).toBe(false);
  });

  it("updates when media query match changes", () => {
    const listeners: Array<(e: Partial<MediaQueryListEvent>) => void> = [];

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (_: string, listener: (e: Partial<MediaQueryListEvent>) => void) => {
          listeners.push(listener);
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListener = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener,
        dispatchEvent: vi.fn(),
      })),
    });

    const { unmount } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// useClipboard
// ---------------------------------------------------------------------------
describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with copied=false and error=null", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("copy() sets copied=true", async () => {
    const { result } = renderHook(() => useClipboard(2000));

    await act(async () => {
      await result.current.copy("hello world");
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("after resetMs, copied resets to false", async () => {
    const { result } = renderHook(() => useClipboard(1000));

    await act(async () => {
      await result.current.copy("text");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("copied does NOT reset before resetMs", async () => {
    const { result } = renderHook(() => useClipboard(2000));

    await act(async () => {
      await result.current.copy("text");
    });

    act(() => {
      vi.advanceTimersByTime(1999);
    });

    expect(result.current.copied).toBe(true);
  });

  it("error is set when clipboard.writeText fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("text");
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe("Permission denied");
  });

  it("clears previous error on successful copy", async () => {
    // First fail
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Denied")),
      },
    });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("fail");
    });

    expect(result.current.error).toBe("Denied");

    // Now succeed
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    await act(async () => {
      await result.current.copy("success");
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("calls navigator.clipboard.writeText with the provided text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: { writeText },
    });

    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("specific text");
    });

    expect(writeText).toHaveBeenCalledWith("specific text");
  });

  it("uses default resetMs of 2000", async () => {
    const { result } = renderHook(() => useClipboard()); // default 2000ms

    await act(async () => {
      await result.current.copy("text");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Additional edge-case tests (to reach 40+ total)
// ---------------------------------------------------------------------------

describe("useDebounce (additional)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("works with boolean values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: false } }
    );

    rerender({ value: true });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it("works with object values", () => {
    const initial = { count: 0 };
    const updated = { count: 1 };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: initial } }
    );

    rerender({ value: updated });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual({ count: 1 });
  });
});

describe("useThrottle (additional)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles rapid successive changes — only emits leading and trailing", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: "a" } }
    );

    // First change fires immediately (leading)
    act(() => { rerender({ value: "b" }); });
    expect(result.current).toBe("b");

    // Rapid changes within cooldown — only latest queued for trailing
    act(() => { rerender({ value: "c" }); });
    act(() => { rerender({ value: "d" }); });
    act(() => { rerender({ value: "e" }); });

    // Still "b" during cooldown
    expect(result.current).toBe("b");

    // After interval, trailing fires with the last pending value
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe("e");
  });
});

describe("useLocalStorage (additional)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists boolean values correctly", () => {
    const { result } = renderHook(() => useLocalStorage("bool-key", false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("bool-key")).toBe("true");
  });

  it("different keys are independent", () => {
    const { result: resultA } = renderHook(() =>
      useLocalStorage("key-a", "valueA")
    );
    const { result: resultB } = renderHook(() =>
      useLocalStorage("key-b", "valueB")
    );

    act(() => {
      resultA.current[1]("changedA");
    });

    expect(resultA.current[0]).toBe("changedA");
    expect(resultB.current[0]).toBe("valueB");
  });
});

describe("usePrevious (additional)", () => {
  it("works with string values through multiple rerenders", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: "x" } }
    );

    expect(result.current).toBeUndefined();

    rerender({ value: "y" });
    expect(result.current).toBe("x");

    rerender({ value: "z" });
    expect(result.current).toBe("y");
  });
});
