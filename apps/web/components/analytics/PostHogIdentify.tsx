"use client";

/**
 * Identifies the authenticated user in PostHog once per session.
 *
 * Receives stable user attributes from the server layout as props (no PII
 * in capture() properties — identity data lives here, on the person).
 * Calls posthog.reset() cleanup is handled at sign-out by the auth flow.
 */

import { useEffect } from "react";
import posthog from "posthog-js";

interface Props {
  readonly userId: string;
  readonly name?: string | null;
}

export function PostHogIdentify({ userId, name }: Props): null {
  useEffect(() => {
    posthog.identify(userId, {
      ...(name ? { name } : {}),
    });
  }, [userId, name]);

  return null;
}
