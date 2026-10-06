import * as Haptics from "expo-haptics";

/**
 * Haptics, deliberately rare.
 *
 * The design contract's motion section is explicit that motion is for
 * "user-triggered state changes" and that data surfaces stay still. The same
 * logic governs touch feedback: a board that buzzes as it scrolls is a board
 * that has decided its content is not interesting enough on its own. So there
 * are exactly three haptic moments in this app:
 *
 *   selection()  — moving between board lanes, a tab change
 *   success()    — a settlement result arriving that the user was waiting on
 *   warning()    — a redaction or a withheld row, so the boundary is felt
 *
 * Everything else is silent. There is no `impactHeavy()` on a card tap.
 *
 * The wrapper exists so the preference can be honoured in ONE place. iOS also
 * gates these on the system Taptic setting, so a device with haptics off simply
 * does nothing — no error path is needed.
 */

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Lane changes, tab changes. The lightest available feedback. */
export function tapSelection(): void {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => {
    // Haptics are never load-bearing. A device without a Taptic Engine, or one
    // that refused, must not surface anything to the user.
  });
}

/** A settlement result or a successful refresh. */
export function tapSuccess(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A redaction boundary, or a row the engine withheld. */
export function tapWarning(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}