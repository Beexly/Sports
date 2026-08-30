"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Web Push opt-in — client-side subscribe/unsubscribe state machine.
 *
 * Honest by construction: every state reflects a REAL browser/permission
 * fact, never an assumed or optimistic one.
 *   - "unsupported"  — this browser has no serviceWorker/PushManager/
 *                       Notification API. Nothing this hook can do.
 *   - "unconfigured" — NEXT_PUBLIC_VAPID_PUBLIC_KEY isn't set (the founder
 *                       hasn't provisioned VAPID keys yet). The button this
 *                       hook backs must not claim push works.
 *   - "denied"       — the user has already denied notification permission
 *                       (or Notification.permission === "denied" at mount).
 *                       Browsers do not let script re-prompt after a deny;
 *                       the user must change it in browser settings.
 *   - "default"       — supported + configured + not yet subscribed.
 *   - "subscribing"   — permission prompt / registration / server POST in
 *                       flight.
 *   - "subscribed"    — the server confirmed the subscription was stored.
 *   - "error"         — a real failure (network, server, browser API) —
 *                       never silently swallowed into a fake "subscribed".
 *
 * No motion/animation anywhere in this hook or its consuming UI — this
 * codebase's established doctrine (see e.g. components/ui/count-up.tsx's
 * `prefers-reduced-motion` handling) is to never animate a state the user
 * hasn't asked to see move; a permission/subscription flow is exactly that
 * kind of state, so it renders as plain, static text/controls.
 */

export type PushSubscriptionStatus =
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "default"
  | "subscribing"
  | "subscribed"
  | "error";

export interface UsePushSubscriptionResult {
  readonly status: PushSubscriptionStatus;
  readonly error: string | null;
  readonly subscribe: () => Promise<void>;
  readonly unsubscribe: () => Promise<void>;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function getVapidPublicKey(): string | undefined {
  return process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
}

/** Converts the URL-safe base64 VAPID public key into the Uint8Array shape
 *  `PushManager.subscribe`'s `applicationServerKey` requires. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function initialStatus(): PushSubscriptionStatus {
  if (!isPushSupported()) return "unsupported";
  if (!getVapidPublicKey()) return "unconfigured";
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return "denied";
  return "default";
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [status, setStatus] = useState<PushSubscriptionStatus>("default");
  const [error, setError] = useState<string | null>(null);

  // Resolved after mount so SSR (no `window`/`Notification`) and the first
  // client render agree, then immediately corrected to the real browser
  // state — never claims support/config that may not be there.
  useEffect(() => {
    setStatus(initialStatus());
  }, []);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      setStatus("unconfigured");
      return;
    }

    setStatus("subscribing");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's DOM lib types `applicationServerKey` against a non-shared
        // `ArrayBufferView<ArrayBuffer>`, while @types/node's global
        // `Uint8Array` is generic over `ArrayBufferLike` (which includes
        // `SharedArrayBuffer`) — a real type mismatch between the two lib
        // definitions, not an unsafe cast: this Uint8Array is always backed
        // by a plain `ArrayBuffer` (built byte-by-byte above), never shared.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) {
        throw new Error(`Server rejected the subscription (HTTP ${res.status}).`);
      }

      setStatus("subscribed");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      if (!isPushSupported()) return;
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("default");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  return { status, error, subscribe, unsubscribe };
}
