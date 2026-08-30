/**
 * Cockpit status-style helpers — shared map from Jarvis status enum
 * values to Tailwind class strings.
 *
 * Pure functions. No DOM, no React. Consumed by both server and client
 * components so the cockpit's visual language stays consistent across
 * pages.
 */

import type { JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";

// Maps a launch status to its human label and visual tone.
// Tones use the brand SEMANTIC palette (verify = ready, caution = warn,
// alert = blocked, ion/titanium = unknown) so the cockpit stays on-brand and
// AA-legible on the dark surfaces (verify/caution/alert all pass AA on carbon).
export function launchStatusStyle(status: JarvisLaunchStatus): { label: string; tone: string } {
  switch (status) {
    case "LAUNCH_READY":
      return { label: "LAUNCH READY", tone: "bg-verify/10 text-verify ring-verify/40" };
    case "LAUNCH_READY_PENDING_EXTERNAL_CONFIG":
      return {
        label: "LAUNCH READY · pending external config",
        tone: "bg-caution/10 text-caution ring-caution/40",
      };
    case "NOT_READY_DATA":
      return { label: "NOT READY · data", tone: "bg-alert/10 text-alert ring-alert/40" };
    case "NOT_READY_VALIDATION":
      return {
        label: "NOT READY · validation",
        tone: "bg-caution/20 text-caution ring-caution/50",
      };
    case "NOT_READY_SAFETY":
      return { label: "NOT READY · safety", tone: "bg-alert/20 text-alert ring-alert/50" };
    case "UNKNOWN":
    default:
      return { label: "UNKNOWN", tone: "bg-titanium text-ion-2 ring-mineral" };
  }
}

// Maps sectional health to a text-color tone.
export function healthTone(h: JarvisHealth): string {
  switch (h) {
    case "GREEN":
      return "text-verify";
    case "AMBER":
      return "text-caution";
    case "RED":
      return "text-alert";
    case "UNKNOWN":
    default:
      return "text-ion-3";
  }
}

/** Background variant of healthTone for badge-style chips. */
export function healthBadgeTone(h: JarvisHealth): string {
  switch (h) {
    case "GREEN":
      return "bg-verify/10 text-verify";
    case "AMBER":
      return "bg-caution/10 text-caution";
    case "RED":
      return "bg-alert/10 text-alert";
    case "UNKNOWN":
    default:
      return "bg-titanium text-ion-2";
  }
}
