/**
 * ARIA attribute helpers — pure utilities for accessible React components.
 * Zero dependencies.
 */

import type { CSSProperties } from "react";

let counter = 0;

/**
 * Generate a unique ARIA ID with an optional prefix.
 * Uses an incrementing counter to ensure uniqueness across renders.
 */
export function ariaId(prefix?: string): string {
  return `a11y-${prefix ?? "id"}-${counter++}`;
}

/**
 * Build aria-describedby string from multiple optional IDs.
 * Filters out undefined and null values.
 * Returns undefined if no valid IDs are provided.
 */
export function ariaDescribedBy(
  ...ids: Array<string | undefined | null>
): string | undefined {
  const valid = ids.filter((id): id is string => id != null && id.length > 0);
  return valid.length > 0 ? valid.join(" ") : undefined;
}

/**
 * Build aria-labelledby string from multiple optional IDs.
 * Filters out undefined and null values.
 * Returns undefined if no valid IDs are provided.
 */
export function ariaLabelledBy(
  ...ids: Array<string | undefined | null>
): string | undefined {
  const valid = ids.filter((id): id is string => id != null && id.length > 0);
  return valid.length > 0 ? valid.join(" ") : undefined;
}

/**
 * Props for a live region (for screen reader announcements).
 * polite → role="status", assertive → role="alert"
 */
export function liveRegionProps(politeness: "polite" | "assertive" = "polite"): {
  "aria-live": "polite" | "assertive";
  "aria-atomic": "true";
  role: "status" | "alert";
} {
  return {
    "aria-live": politeness,
    "aria-atomic": "true",
    role: politeness === "assertive" ? "alert" : "status",
  };
}

/** Type-safe aria-expanded prop. */
export function ariaExpanded(isOpen: boolean): { "aria-expanded": "true" | "false" } {
  return { "aria-expanded": isOpen ? "true" : "false" };
}

/** Type-safe aria-pressed prop. */
export function ariaPressed(
  isPressed: boolean | "mixed"
): { "aria-pressed": "true" | "false" | "mixed" } {
  if (isPressed === "mixed") return { "aria-pressed": "mixed" };
  return { "aria-pressed": isPressed ? "true" : "false" };
}

/** Type-safe aria-selected prop. */
export function ariaSelected(isSelected: boolean): { "aria-selected": "true" | "false" } {
  return { "aria-selected": isSelected ? "true" : "false" };
}

/** Type-safe aria-checked prop (supports tri-state). */
export function ariaChecked(
  value: boolean | "mixed"
): { "aria-checked": "true" | "false" | "mixed" } {
  if (value === "mixed") return { "aria-checked": "mixed" };
  return { "aria-checked": value ? "true" : "false" };
}

/**
 * Visually hidden but accessible text (for screen readers).
 * Returns a CSSProperties object that visually hides an element
 * while keeping it accessible to assistive technologies.
 */
export function srOnly(): CSSProperties {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: "0",
  };
}
