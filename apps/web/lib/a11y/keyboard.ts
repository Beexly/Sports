/**
 * Keyboard navigation utilities for accessible components.
 * Zero dependencies.
 */

/** Common keyboard key constants. */
export const Keys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

export type Key = (typeof Keys)[keyof typeof Keys];

/** Check if a keyboard event matches a given key. */
export function isKey(event: { key: string }, key: Key): boolean {
  return event.key === key;
}

/** Check if an event is an activation event (Enter or Space). */
export function isActivationKey(event: { key: string }): boolean {
  return event.key === Keys.ENTER || event.key === Keys.SPACE;
}

/** Handlers returned by createRovingTabIndex. */
export interface RovingTabIndexHandlers {
  onKeyDown(event: { key: string; preventDefault(): void }): void;
  activeIndex: number;
  setActiveIndex(idx: number): void;
}

/**
 * Create a roving tabindex handler for a list of items.
 * Returns handlers for keyboard navigation within the list.
 *
 * Orientation determines which arrow keys move focus:
 *   - "vertical": ArrowUp / ArrowDown
 *   - "horizontal": ArrowLeft / ArrowRight
 *   - "both": all four arrow keys
 */
export function createRovingTabIndex(params: {
  itemCount: number;
  initialIndex?: number;
  orientation?: "horizontal" | "vertical" | "both";
  loop?: boolean;
  onChange?: (newIndex: number) => void;
}): RovingTabIndexHandlers {
  const {
    itemCount,
    initialIndex = 0,
    orientation = "vertical",
    loop = true,
    onChange,
  } = params;

  let activeIndex = initialIndex;

  function clamp(idx: number): number {
    if (loop) {
      if (idx < 0) return itemCount - 1;
      if (idx >= itemCount) return 0;
      return idx;
    }
    return Math.max(0, Math.min(itemCount - 1, idx));
  }

  function movePrev(): void {
    const next = clamp(activeIndex - 1);
    if (next !== activeIndex) {
      activeIndex = next;
      onChange?.(activeIndex);
    }
  }

  function moveNext(): void {
    const next = clamp(activeIndex + 1);
    if (next !== activeIndex) {
      activeIndex = next;
      onChange?.(activeIndex);
    }
  }

  function moveFirst(): void {
    if (activeIndex !== 0) {
      activeIndex = 0;
      onChange?.(activeIndex);
    }
  }

  function moveLast(): void {
    const last = itemCount - 1;
    if (activeIndex !== last) {
      activeIndex = last;
      onChange?.(activeIndex);
    }
  }

  const handlers: RovingTabIndexHandlers = {
    get activeIndex() {
      return activeIndex;
    },

    setActiveIndex(idx: number): void {
      const clamped = Math.max(0, Math.min(itemCount - 1, idx));
      activeIndex = clamped;
      onChange?.(activeIndex);
    },

    onKeyDown(event: { key: string; preventDefault(): void }): void {
      const usesVertical =
        orientation === "vertical" || orientation === "both";
      const usesHorizontal =
        orientation === "horizontal" || orientation === "both";

      switch (event.key) {
        case Keys.ARROW_UP:
          if (usesVertical) {
            event.preventDefault();
            movePrev();
          }
          break;
        case Keys.ARROW_DOWN:
          if (usesVertical) {
            event.preventDefault();
            moveNext();
          }
          break;
        case Keys.ARROW_LEFT:
          if (usesHorizontal) {
            event.preventDefault();
            movePrev();
          }
          break;
        case Keys.ARROW_RIGHT:
          if (usesHorizontal) {
            event.preventDefault();
            moveNext();
          }
          break;
        case Keys.HOME:
          event.preventDefault();
          moveFirst();
          break;
        case Keys.END:
          event.preventDefault();
          moveLast();
          break;
        default:
          break;
      }
    },
  };

  return handlers;
}
