"use client";

import { usePushSubscription } from "@/lib/push/use-push-subscription";

/**
 * Elite real-time push alert opt-in — a small, static (no motion/animation)
 * control backing the "real-time email & push alerts" feature (CLAUDE.md's
 * tier table). Every state is honest: it never claims "subscribed" unless
 * the server actually confirmed the subscription, and it never hides an
 * unsupported-browser or permission-denied state behind a generic message
 * — the caller sees exactly why push isn't available when it isn't.
 *
 * Intentionally undecorated: no transitions, no loading spinners with
 * motion, no fade-ins. This mirrors the codebase's existing
 * `prefers-reduced-motion` doctrine (see components/ui/count-up.tsx) by
 * simply not introducing motion in the first place rather than needing a
 * media-query escape hatch.
 */
export function PushAlertOptIn(): JSX.Element | null {
  const { status, error, subscribe, unsubscribe } = usePushSubscription();

  if (status === "unsupported") {
    return (
      <p role="status" className="text-sm text-ion-3">
        Push alerts aren&apos;t supported in this browser.
      </p>
    );
  }

  if (status === "unconfigured") {
    // Founder hasn't provisioned VAPID keys yet — nothing to render that
    // wouldn't be a lie. Email alerts (if configured) are unaffected.
    return null;
  }

  if (status === "denied") {
    return (
      <p role="status" className="text-sm text-ion-3">
        Notifications are blocked for this site. Enable them in your browser
        settings to get real-time push alerts.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <div>
        <p role="status" className="text-sm">
          Push alerts are on for this device.
        </p>
        <button type="button" onClick={() => void unsubscribe()}>
          Turn off push alerts
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={status === "subscribing"}
      >
        {status === "subscribing" ? "Enabling…" : "Enable push alerts"}
      </button>
      {status === "error" && error ? (
        <p role="alert" className="text-sm text-alert">
          Couldn&apos;t enable push alerts: {error}
        </p>
      ) : null}
    </div>
  );
}
