"use client";

import { useEffect, type RefObject } from "react";

/**
 * The two halves of the modal focus contract that `role="dialog"` +
 * `aria-modal="true"` promise but do not deliver on their own.
 *
 * Declaring `aria-modal="true"` tells assistive tech that everything outside the
 * dialog is inert. The browser does not enforce that for the keyboard, so
 * without this hook:
 *
 *   - TRAP is missing: Tab walks straight out of the dialog into the page
 *     behind it, and the user is now typing into content their screen reader
 *     has just been told does not exist.
 *   - RESTORE is missing: on close, focus lands on <body>, so the next Tab
 *     restarts at the top of the document. On a long page (a 20-card picks
 *     board, the homepage) that means re-tabbing everything to get back to the
 *     control you opened the dialog from.
 *
 * Both are WCAG 2.1 AA failures (2.4.3 Focus Order). This hook is deliberately
 * additive: it does not open, close, render or style anything, and it does not
 * take over the Escape key — callers keep their own close semantics.
 *
 * Usage:
 *
 *     const dialogRef = useRef<HTMLDivElement>(null);
 *     useModalFocus(open, dialogRef, initialFocusRef);
 *     …
 *     {open && <div ref={dialogRef} role="dialog" aria-modal="true">…</div>}
 *
 * @param active       whether the dialog is currently mounted/open
 * @param dialogRef    the element carrying role="dialog"
 * @param initialFocus optional element to focus on open (defaults to the first
 *                     focusable descendant of the dialog)
 */
export function useModalFocus(
  active: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocus?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;

    // Whatever had focus when the dialog opened — normally the trigger, but not
    // necessarily (a dialog can be opened from anywhere focus happens to be).
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const activeEl = document.activeElement;
      const inside = activeEl instanceof Node && root.contains(activeEl);

      if (e.shiftKey) {
        if (!inside || activeEl === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);

    // Move focus into the dialog. Callers that already focus a specific control
    // pass it as `initialFocus`; otherwise take the first focusable descendant
    // so focus never sits outside a dialog that claims the page is inert.
    const target =
      initialFocus?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      null;
    target?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      // Hand focus back where it came from. Guarded on isConnected so a trigger
      // that unmounted while the dialog was open (a board refresh, a route
      // change) never throws here.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // `initialFocus` and `dialogRef` are stable useRef objects; re-running on
    // their identity would tear the listener down on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * Everything inside a dialog a Tab can land on, in document order. Deliberately
 * conservative — it does not try to detect visibility, because a dialog that is
 * open has all of its own controls rendered.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
