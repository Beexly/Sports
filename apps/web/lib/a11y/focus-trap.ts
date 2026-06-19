/**
 * Focus trap utility — traps keyboard focus within a container element.
 *
 * Essential for accessible modals, drawers, and overlays.
 * Pure TypeScript, no dependencies.
 * Pattern: a11y-dialog (MIT, HugoGiraudel/a11y-dialog) re-implemented as a
 * composable utility function.
 */

/** All focusable element selectors. */
export const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
  "details > summary",
].join(", ");

export interface FocusTrapOptions {
  /** Called when Escape key is pressed while trap is active. */
  onEscape?: () => void;
  /** If true, return focus to this element when trap is released. */
  returnFocus?: boolean;
}

export interface FocusTrap {
  /** Activate the trap: set focus to first focusable element within container. */
  activate(): void;
  /** Release the trap: restore previous focus and remove listeners. */
  release(): void;
}

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  ).filter((el) => !el.closest("[inert]") && !el.hasAttribute("hidden"));
}

/**
 * Create a focus trap for the given container element.
 * Returns an object with activate() and release() methods.
 *
 * @param container - The element to trap focus within
 * @param options - Optional configuration
 */
export function createFocusTrap(
  container: HTMLElement,
  options?: FocusTrapOptions
): FocusTrap {
  const { onEscape, returnFocus = true } = options ?? {};
  let previouslyFocused: Element | null = null;

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onEscape?.();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      // Shift+Tab: if focus is on first element, wrap to last
      if (active === first) {
        event.preventDefault();
        last?.focus();
      }
    } else {
      // Tab: if focus is on last element, wrap to first
      if (active === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return {
    activate(): void {
      previouslyFocused = document.activeElement;
      const focusable = getFocusableElements(container);
      focusable[0]?.focus();
      document.addEventListener("keydown", handleKeyDown);
    },

    release(): void {
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocus && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    },
  };
}
