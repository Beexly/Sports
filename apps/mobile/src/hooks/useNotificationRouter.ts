import * as React from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

/**
 * Notification routing.
 *
 * The server sends exactly two notification classes, and this hook is written
 * against that contract rather than against a generic "open the app" handler:
 *
 *   settlement    — a pick the user follows has graded. Deep-links to the pick.
 *   line_movement — a followed pick's line moved past a threshold. Links to it.
 *
 * Anything else is IGNORED rather than routed to the home screen. A push that
 * lands the user somewhere generic teaches them the notification meant nothing,
 * which is how a permission granted in good faith decays into a permission
 * switched off.
 *
 * The handler covers BOTH cases that matter and are usually half-implemented:
 *   1. a tap while the app is running
 *   2. a COLD START from a notification — `getLastNotificationResponseAsync`
 *      is the only way to see that tap, and it is the one people forget.
 */

interface NotificationData {
  kind?: unknown;
  pickId?: unknown;
  gameId?: unknown;
}

export function useNotificationRouter(): void {
  const router = useRouter();

  const route = React.useCallback(
    (data: NotificationData | undefined) => {
      if (!data) return;
      const kind = typeof data.kind === "string" ? data.kind : null;
      const pickId = typeof data.pickId === "string" ? data.pickId : null;
      const gameId = typeof data.gameId === "string" ? data.gameId : null;

      if (kind === "settlement" && pickId) {
        router.push({ pathname: "/pick/[id]", params: { id: pickId } });
        return;
      }
      if (kind === "line_movement" && pickId) {
        router.push({ pathname: "/pick/[id]", params: { id: pickId } });
        return;
      }
      if (kind === "line_movement" && gameId) {
        router.push({ pathname: "/pick/[id]", params: { id: gameId } });
      }
      // Unknown kinds are deliberately dropped: see the header.
    },
    [router],
  );

  React.useEffect(() => {
    let cancelled = false;

    // (2) Cold start from a notification tap.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        route(response.notification.request.content.data as NotificationData);
      })
      .catch(() => {
        // No response history on a fresh install; nothing to route.
      });

    // (1) A tap while the app is already running.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      route(response.notification.request.content.data as NotificationData);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [route]);
}

/**
 * Whether a notification payload is one the app will act on. Exported so the
 * settings screen can explain the policy in the same terms the router applies
 * it, instead of paraphrasing.
 */
export function isRoutableNotification(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const kind = (data as NotificationData).kind;
  return kind === "settlement" || kind === "line_movement";
}