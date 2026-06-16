"use client";

import { useEffect, useState } from "react";

/**
 * A small, warm, time-aware greeting for the cockpit command bar.
 *
 * Honesty + correctness note: the time-of-day phrasing is derived from the
 * OWNER'S browser clock (not the server's UTC), so it is always accurate to
 * wherever they actually are. To avoid a hydration mismatch it renders the
 * stable "Welcome back" on the server + first client paint, then swaps to the
 * local-time greeting on mount. Both are warm, so the swap is seamless.
 */
function greetingFor(hour: number): string {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

export function CockpitGreeting() {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return <>{greeting ?? "Welcome back"}</>;
}
