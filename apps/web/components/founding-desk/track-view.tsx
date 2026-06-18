"use client";

/**
 * TrackView — fires a single analytics event on mount.
 *
 * A tiny client boundary so server-component pages can trigger analytics
 * without becoming client components themselves. Renders nothing visible.
 */

import { useEffect } from "react";
import { track, type AnalyticsEvent, type AnalyticsContext } from "@/lib/analytics/events";

interface TrackViewProps {
  event: AnalyticsEvent;
  context?: AnalyticsContext;
}

export function TrackView({ event, context = {} }: TrackViewProps) {
  useEffect(() => {
    track(event, context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
