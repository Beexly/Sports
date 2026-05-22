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
export function launchStatusStyle(status: JarvisLaunchStatus): { label: string; tone: string } {
  switch (status) {
    case "LAUNCH_READY":
      return { label: "LAUNCH READY", tone: "bg-green-900/50 text-green-300 ring-green-700/40" };
    case "LAUNCH_READY_PENDING_EXTERNAL_CONFIG":
      return {
        label: "LAUNCH READY · pending external config",
        tone: "bg-yellow-900/40 text-yellow-300 ring-yellow-700/40",
      };
    case "NOT_READY_DATA":
      return { label: "NOT READY · data", tone: "bg-red-900/40 text-red-300 ring-red-700/40" };
    case "NOT_READY_VALIDATION":
      return {
        label: "NOT READY · validation",
        tone: "bg-orange-900/40 text-orange-300 ring-orange-700/40",
      };
    case "NOT_READY_SAFETY":
      return { label: "NOT READY · safety", tone: "bg-red-900/60 text-red-200 ring-red-700/40" };
    case "UNKNOWN":
    default:
      return { label: "UNKNOWN", tone: "bg-gray-800 text-gray-300 ring-gray-700/40" };
  }
}

// Maps sectional health to a text-color tone.
export function healthTone(h: JarvisHealth): string {
  switch (h) {
    case "GREEN":
      return "text-green-400";
    case "AMBER":
      return "text-yellow-300";
    case "RED":
      return "text-red-400";
    case "UNKNOWN":
    default:
      return "text-gray-500";
  }
}

/** Background variant of healthTone for badge-style chips. */
export function healthBadgeTone(h: JarvisHealth): string {
  switch (h) {
    case "GREEN":
      return "bg-green-900/40 text-green-300";
    case "AMBER":
      return "bg-yellow-900/40 text-yellow-300";
    case "RED":
      return "bg-red-900/40 text-red-300";
    case "UNKNOWN":
    default:
      return "bg-gray-800 text-gray-400";
  }
}
