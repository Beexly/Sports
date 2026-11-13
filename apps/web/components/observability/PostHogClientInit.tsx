"use client";

/**
 * PostHog client bootstrap (WP-5 telemetry).
 *
 * Uses posthog-js via lib/telemetry/posthog-client with
 * person_profiles: "identified_only" (US cloud, project 516325). Token
 * resolution and the explicit opt-out gate live in lib/analytics/posthog-config
 * so they are unit-testable without a DOM.
 *
 * Identity: authenticated users are identified from /api/auth/session so
 * person profiles exist only for identified users. Sign-out resets identity.
 * Everything here is strictly non-blocking for auth and rendering.
 */

import { useEffect } from "react";
import {
  initPostHogClient,
  identifyPostHogUser,
  resetPostHogIdentity,
} from "@/lib/telemetry/posthog-client";

const identityStorageKey = "posthog_identified_user_id";

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
    // posthog-js captures $pageview itself (capture_pageview: true).
    initPostHogClient();
  }, []);

  useEffect(() => {
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
            resetPostHogIdentity();
          }
          return;
        }

        identifyPostHogUser(user.id, {
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