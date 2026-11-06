"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
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

export function PostHogClientInit(): null {
  useEffect(() => {
    if (!projectToken) {
      if (process.env.NODE_ENV === "development") {
        throw new Error(
          "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
        );
      }
      return;
    }

    if (!host) {
      if (process.env.NODE_ENV === "development") {
        throw new Error(
          "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
        );
      }
      return;
    }

    if (initialized) return;
    initialized = true;

    posthog.init(projectToken, {
      api_host: host,
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
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
            posthog.reset();
            sessionStorage.removeItem(identityStorageKey);
          }
          return;
        }

        if (previousUserId && previousUserId !== user.id) {
          posthog.reset();
        }

        posthog.identify(user.id, {
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role ?? undefined,
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
