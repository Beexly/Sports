"use client";

import { useEffect, useState } from "react";
import {
  formatLocalTime,
  isRealInstant,
  type LocalTimeFormat,
} from "@/lib/time/local-time";

/**
 * LocalTime — every published timestamp, on the VIEWER's clock.
 *
 * The board's timestamps used to be formatted during SERVER render with
 * `toLocaleString("en-US", …)` and no `timeZone`. Nothing sets `TZ` for the
 * Node runtime, so the server's zone is UTC and every visitor was handed the
 * UTC wall clock: a 1:00 PM ET kickoff read "Sun, Sep 7, 5:00 PM UTC". There
 * was no flash and no hydration warning — it was simply, quietly wrong for
 * essentially the whole audience, on the number a bettor most needs correct.
 *
 * So only the ISO instant crosses the server/client boundary and the wall clock
 * is resolved after mount, against the viewer's own zone. This mirrors
 * `components/picks/line-freshness-badge.tsx`, which already refuses to render a
 * value it cannot yet compute honestly.
 *
 * Pre-hydration we render a skeleton, never a formatted time: a wrong time that
 * later corrects itself is worse than a placeholder, because a bettor who
 * glanced once carries the wrong number away. The `<time dateTime>` attribute
 * always carries the exact instant, so crawlers and assistive tech get the truth
 * from the very first byte even while the visible text is still deferred.
 *
 * This is a small CLIENT leaf on purpose. The cards and pages that use it stay
 * SERVER components; only the timestamp itself ships to the browser.
 */
export interface LocalTimeProps {
  /** ISO-8601 instant. The only value that crosses the boundary. */
  iso: string;
  /** Which named preset to render. */
  format: LocalTimeFormat;
  /**
   * Accessible name prefix, e.g. "Kickoff". Required: a bare time string is
   * meaningless to a screen-reader user, and the meaning must not depend on
   * where the time happens to sit on the card.
   */
  label: string;
  className?: string;
}

/**
 * Skeleton widths, per preset. Sized to the string each preset produces so the
 * line does not jump when the real time lands.
 */
const SKELETON_WIDTH: Record<LocalTimeFormat, string> = {
  kickoff: "w-[10.5rem]",
  "date-long": "w-[12rem]",
  clock: "w-[5.5rem]",
  stamp: "w-[8.5rem]",
};

export function LocalTime({
  iso,
  format,
  label,
  className,
}: LocalTimeProps): JSX.Element | null {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(formatLocalTime(iso, format));
  }, [iso, format]);

  // No fabricated timestamps: an unparseable instant renders nothing at all.
  if (!isRealInstant(iso)) return null;

  if (text === null) {
    // Server render and the first client render both land here, so the markup
    // matches exactly and there is no hydration mismatch to warn about.
    return (
      <time dateTime={iso} className={className} data-localtime="pending">
        <span className="sr-only">{label}: loading local time</span>
        <span
          aria-hidden="true"
          className={`inline-block h-[1em] max-w-full animate-pulse rounded bg-titanium align-middle ${SKELETON_WIDTH[format]}`}
        />
      </time>
    );
  }

  return (
    <time dateTime={iso} className={className} data-localtime="resolved">
      <span className="sr-only">{label}: </span>
      {text}
    </time>
  );
}
