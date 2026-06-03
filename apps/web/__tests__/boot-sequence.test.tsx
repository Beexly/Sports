import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { BootSequence } from "@/components/intro/boot-sequence";

/**
 * BootSequence — the cinematic entrance.
 *
 * Guards the behavior that matters: it plays once per session, respects
 * reduced-motion (no overlay, no sound), the ENTER gate only arms after the
 * boot telemetry runs, dismissing sets the session flag, and the mute
 * preference persists.
 */

function mockMatchMedia(reduced: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduced,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("BootSequence", () => {
  it("renders nothing and marks booted under reduced-motion", () => {
    mockMatchMedia(true);
    const { container } = render(<BootSequence />);
    expect(container).toBeEmptyDOMElement();
    expect(window.sessionStorage.getItem("gse-booted")).toBe("1");
  });

  it("does not replay once the session has already booted", () => {
    window.sessionStorage.setItem("gse-booted", "1");
    mockMatchMedia(false);
    const { container } = render(<BootSequence />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the overlay with the ENTER gate disabled until telemetry finishes", () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    render(<BootSequence />);

    expect(screen.getByTestId("boot-sequence")).toBeInTheDocument();
    const enter = screen.getByTestId("boot-enter");
    expect(enter).toBeDisabled();

    // Run the boot telemetry to completion → ENTER arms.
    act(() => {
      vi.advanceTimersByTime(520 * 6);
    });
    expect(screen.getByTestId("boot-enter")).not.toBeDisabled();
  });

  it("dismisses and sets the session flag when ENTER is pressed", () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    render(<BootSequence />);

    act(() => {
      vi.advanceTimersByTime(520 * 6);
    });
    fireEvent.click(screen.getByTestId("boot-enter"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByTestId("boot-sequence")).toBeNull();
    expect(window.sessionStorage.getItem("gse-booted")).toBe("1");
  });

  it("skips immediately and persists the mute preference", () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    render(<BootSequence />);

    fireEvent.click(screen.getByTestId("boot-mute"));
    expect(window.localStorage.getItem("gse-sound-muted")).toBe("1");

    fireEvent.click(screen.getByTestId("boot-skip"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("boot-sequence")).toBeNull();
    expect(window.sessionStorage.getItem("gse-booted")).toBe("1");
  });
});
