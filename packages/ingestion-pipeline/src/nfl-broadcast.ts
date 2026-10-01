/**
 * Classify an NFL kickoff from the clock in America/New_York.
 * Thursday/Sunday/Monday night windows are the standalone broadcasts the
 * primetime kernel names. A kickoff that matches none of them is null.
 * Null is not "international." We do not have a venue country, so we do not
 * invent one.
 */
export type NflBroadcastWindow =
  | "TNF_PRIMETIME"
  | "SNF_PRIMETIME"
  | "MNF_PRIMETIME"
  | "REGIONAL_SUNDAY_EARLY"
  | "REGIONAL_SUNDAY_LATE";

export function classifyNflBroadcast(kickoff: Date): NflBroadcastWindow | null {
  if (!(kickoff instanceof Date) || Number.isNaN(kickoff.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(kickoff)
      .map((p) => [p.type, p.value]),
  );
  const weekday = parts.weekday;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (!Number.isFinite(minutes)) return null;
  if (weekday === "Thu" && minutes >= 19 * 60) return "TNF_PRIMETIME";
  if (weekday === "Sun" && minutes >= 19 * 60 + 30) return "SNF_PRIMETIME";
  if (weekday === "Sun" && minutes >= 16 * 60) return "REGIONAL_SUNDAY_LATE";
  if (weekday === "Sun" && minutes >= 12 * 60) return "REGIONAL_SUNDAY_EARLY";
  if (weekday === "Mon" && minutes >= 19 * 60) return "MNF_PRIMETIME";
  return null;
}

export function isStandalonePrimetime(window: NflBroadcastWindow | null): boolean {
  return window === "TNF_PRIMETIME" || window === "SNF_PRIMETIME" || window === "MNF_PRIMETIME";
}
