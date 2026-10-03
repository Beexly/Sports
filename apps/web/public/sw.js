/**
 * Web Push service worker — displays a notification for every push event.
 *
 * Minimal and honest by design: it does not cache anything, does not
 * intercept fetch, and does not add any offline/PWA behavior — its only
 * job is turning a push message into a system notification. The payload
 * is exactly what the server sent via web-push
 * (apps/web/lib/watchlist/channels/web-push-channel.ts):
 *   { title: string, body: string, url?: string }
 * A malformed/non-JSON payload falls back to a generic notification rather
 * than throwing and silently dropping the push.
 */

self.addEventListener("push", (event) => {
  let data = { title: "GalaxySportsEdge", body: "You have a new alert." };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        title: typeof parsed.title === "string" && parsed.title ? parsed.title : data.title,
        body: typeof parsed.body === "string" && parsed.body ? parsed.body : data.body,
        url: typeof parsed.url === "string" ? parsed.url : undefined,
      };
    }
  } catch {
    // Non-JSON or empty payload — fall back to the generic notification
    // above rather than dropping the push silently.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
