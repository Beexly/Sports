"use client";

import { useEffect } from "react";

const projectToken =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const identityStorageKey = "posthog_identified_user_id";
let initialized = false;

type AuthSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
};

async function sendPostHogCapture(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!projectToken || !host) return;
  try {
    await fetch(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: projectToken,
        event,
        distinct_id: distinctId,
        properties: {
          $lib: "posthog-js-lite-gse",
          ...properties,
        },
      }),
    });
  } catch {
    // Observability is strictly non-blocking.
  }
}

export function PostHogClientInit(): null {
  useEffect(() => {
    if (!projectToken || !host) return;
    if (initialized) return;
    initialized = true;
    void sendPostHogCapture("$pageview", "anonymous-browser-session", {
      $current_url: typeof window !== "undefined" ? window.location.href : "",
    });
  }, []);

  useEffect(() => {
    if (!projectToken || !host) return;

    let cancelled = false;

    async function identifyAuthenticatedUser() {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) return;

        const session = (await response.json()) as AuthSession;
        const user = session.user;
        if (cancelled) return;

        const previousUserId = sessionStorage.getItem(identityStorageKey);
        if (!user?.id) {
          if (previousUserId) {
            sessionStorage.removeItem(identityStorageKey);
          }
          return;
        }

        await sendPostHogCapture("$identify", user.id, {
          $set: {
            email: user.email ?? undefined,
            name: user.name ?? undefined,
            role: user.role ?? undefined,
          },
        });
        sessionStorage.setItem(identityStorageKey, user.id);
      } catch {
        // The session endpoint is best-effort for analytics and must not affect auth.
      }
    }

    void identifyAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
