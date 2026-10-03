"use client";

/**
 * PricingPageAnalytics — fires the inert `pricing_page_view` event on mount.
 *
 * The /pricing page is otherwise a Server Component (SEO-critical). This thin
 * client wrapper lets us emit the page-view signal from the client side without
 * restructuring the pricing page's data flow.
 *
 * `track()` is a pure no-op (returns the normalized payload, never hits the
 * network, never reads a vendor env var). The instrumentation exists so that
 * enabling an analytics sink later is config, not code.
 */

import { useEffect } from "react";
import { track } from "@/lib/analytics/events";

export function PricingPageAnalytics() {
  useEffect(() => {
    track("pricing_page_view");
  }, []);
  return null;
}
