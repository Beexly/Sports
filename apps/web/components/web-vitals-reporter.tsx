"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Reports Core Web Vitals to the first-party /api/vitals sink.
 *
 * Uses navigator.sendBeacon so a metric survives page unload — the only
 * reliable moment CLS and LCP finalize. Mounted once in the root layout,
 * renders nothing, sets no cookie, and sends no PII (only the pathname).
 */
export function WebVitalsReporter() {
  useEffect(() => {
    const report = (metric: Metric) => {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        path: window.location.pathname,
      });

      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/vitals", body);
      } else {
        void fetch("/api/vitals", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
      }
    };

    onCLS(report);
    onFCP(report);
    onINP(report);
    onLCP(report);
    onTTFB(report);
  }, []);

  return null;
}
