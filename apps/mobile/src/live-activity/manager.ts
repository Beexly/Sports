import { createLiveActivity, type LiveActivity } from "expo-widgets";

import { SlateActivityLayout, STALE_AFTER_MS, type SlateActivityProps } from "./SlateActivity";

/**
 * Live Activity lifecycle.
 *
 * Wraps `expo-widgets` so the design rules are enforced in ONE place rather than
 * at each call site. Three rules, all of them about not letting a lock-screen
 * surface outlive its own truth:
 *
 *  1. **`staleDate` is always set.** Every start and every update passes one.
 *     iOS de-emphasises the activity when it passes without a refresh, which is
 *     the native form of the freshness stamp. A caller cannot omit it.
 *
 *  2. **`update` REFUSES to render a payload with no `lastRefresh`.** The
 *     activity's whole honesty depends on that field. Rather than render
 *     "Refreshed unknown ago", the update is rejected and the call site sees why.
 *
 *  3. **Only ONE activity is ever active.** Starting a second would put two
 *     contradictory slates on one lock screen. `start` ends the previous one
 *     first, and `end` is idempotent because the user can dismiss an activity
 *     from the lock screen and the OS will not tell us.
 *
 * WHAT IS DELIBERATELY ABSENT: there is no `updateFromPush` helper here. Push
 * updates go through APNs with a JWT signed by the server, and putting a client
 * stub next to the real path invites someone to implement the client half.
 */

const ACTIVITY_NAME = "SlateActivity";

/**
 * The factory. Module-level by design: `createLiveActivity` registers the layout
 * with the native module, and calling it per render would re-register.
 *
 * The `'widget'` directive is applied here — the layout stays a plain component
 * so it typechecks against the same React Native types as the rest of the app.
 */
const factory = createLiveActivity<SlateActivityProps>(ACTIVITY_NAME, SlateActivityLayout as never);

let current: LiveActivity<SlateActivityProps> | null = null;

export interface StartOptions {
  /** Deep link opened when the activity is tapped. Defaults to the board. */
  url?: string;
  /** Override the staleness window. Present for tests; production uses the default. */
  staleAfterMs?: number;
}

/** Whether an activity can be started at all. iOS 16.2+ and an enabled setting. */
export function isSupported(): boolean {
  try {
    return typeof factory?.start === "function";
  } catch {
    return false;
  }
}

/**
 * Start the slate activity, ending any previous one.
 *
 * Returns null when the platform cannot start one. A caller must handle null —
 * a Live Activity is a convenience, and an app that breaks because a lock-screen
 * widget could not start is an app that breaks for no reason.
 */
export async function startSlate(
  props: SlateActivityProps,
  options: StartOptions = {},
): Promise<string | null> {
  if (!isSupported()) return null;
  if (!hasFreshness(props)) {
    throw new Error(
      "startSlate: lastRefresh is required. A Live Activity without an age is a " +
        "number with no provenance, which is the thing this product refuses to print.",
    );
  }

  await endSlate();

  const staleDate = new Date(Date.now() + (options.staleAfterMs ?? STALE_AFTER_MS));
  const activity = factory.start(props, options.url ?? "gse://board", staleDate);
  current = activity;
  return safeId(activity);
}

/**
 * Update an active activity.
 *
 * Throws rather than rendering a payload with no freshness field, so the failure
 * is loud at the call site instead of quiet on a lock screen.
 */
export async function updateSlate(props: SlateActivityProps): Promise<void> {
  if (!current) return;
  if (!hasFreshness(props)) {
    throw new Error("updateSlate: lastRefresh is required; refusing to render an undated payload.");
  }
  await current.update(props, new Date(Date.now() + STALE_AFTER_MS));
}

/**
 * End the activity.
 *
 * Idempotent, and it swallows a native failure: the user may already have
 * dismissed the activity from the lock screen, in which case ending it errors and
 * that error means the desired state is already true.
 */
export async function endSlate(): Promise<void> {
  if (!current) return;
  const activity = current;
  current = null;
  try {
    // `default` keeps it on the lock screen for the system's own window after
    // ending, which is right: a user who just glanced at it should not have it
    // vanish mid-read.
    await activity.end("default");
  } catch {
    // Already dismissed by the user, or the extension is gone. Both mean done.
  }
}

/** The push token, if the activity is live and push is configured. */
export async function slatePushToken(): Promise<string | null> {
  if (!current) return null;
  try {
    return await current.getPushToken();
  } catch {
    return null;
  }
}

/** All instances the OS believes are live, including ones this process did not start. */
export function activeSlateIds(): string[] {
  try {
    return factory.getInstances().map(safeId).filter((id): id is string => id !== null);
  } catch {
    return [];
  }
}

function hasFreshness(props: SlateActivityProps): boolean {
  return typeof props.lastRefresh === "string" && props.lastRefresh.length > 0;
}

function safeId(activity: LiveActivity<SlateActivityProps>): string | null {
  try {
    return activity.getId();
  } catch {
    return null;
  }
}

export { ACTIVITY_NAME };
