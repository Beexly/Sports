/**
 * The weekly NFL ritual — canonical Mon→Mon beat map (NFL House doctrine).
 *
 * Single source of truth for the week's shape: the /house rail renders it,
 * and content-automation jobs MUST take their daily beat from here rather
 * than carrying their own calendar. One module, one rhythm — the rail and
 * the pipeline can never drift apart.
 *
 * 2026-09-12: every beat now carries an ACTION and a CTA href so the rail
 * is a calendar a customer can act on, not a decorative strip. Founder:
 * "real calendar with alerts so that people can be alerted hey do your
 * waivers, hey set your lineups, hey this person is out."
 */

export interface RitualBeat {
  /** JS day index, 0 = Sunday … 6 = Saturday (Date#getUTCDay). */
  readonly dayIndex: number;
  readonly day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  readonly beat: string;
  /** Where the beat lands — existing surfaces/jobs only, no vaporware. */
  readonly surface: string;
  /**
   * The thing a customer should DO this day. One verb, one object.
   * Empty string when the beat is desk-side only (no customer action).
   */
  readonly action: string;
  /** Existing route the action deep-links to. Null when desk-side only. */
  readonly actionHref: string | null;
  /** Alert tier: "now" = do it today, "soon" = prep, "desk" = we handle it. */
  readonly urgency: "now" | "soon" | "desk";
}

export const WEEKLY_RITUAL: readonly RitualBeat[] = [
  {
    dayIndex: 1,
    day: "Mon",
    beat: "What we learned",
    surface: "journal + performance autopsies",
    action: "Read the week's record",
    actionHref: "/performance",
    urgency: "desk",
  },
  {
    dayIndex: 2,
    day: "Tue",
    beat: "Injury watch · the accountability pass",
    surface: "performance/losses (autopsies land here)",
    action: "Check who's out before waivers run",
    actionHref: "/fantasy/waivers",
    urgency: "now",
  },
  {
    dayIndex: 3,
    day: "Wed",
    beat: "Opening market read",
    surface: "observatory fair board",
    action: "Claim your waiver targets",
    actionHref: "/fantasy/waivers",
    urgency: "now",
  },
  {
    dayIndex: 4,
    day: "Thu",
    beat: "First edge board",
    surface: "picks board",
    action: "Set your lineup for the week",
    actionHref: "/fantasy/lineup",
    urgency: "now",
  },
  {
    dayIndex: 5,
    day: "Fri",
    beat: "The human read",
    surface: "journal (drafts Saturday: standing law, keep)",
    action: "Review Thursday's board",
    actionHref: "/board",
    urgency: "soon",
  },
  {
    dayIndex: 6,
    day: "Sat",
    beat: "Fantasy help · Parlay MRI",
    surface: "fantasy tools + parlay-mri",
    action: "Final lineup check + stacks",
    actionHref: "/fantasy/lineup",
    urgency: "now",
  },
  {
    dayIndex: 0,
    day: "Sun",
    beat: "Game day",
    surface: "the-beat / live surfaces",
    action: "Follow the live board",
    actionHref: "/board",
    urgency: "now",
  },
  {
    dayIndex: 1,
    day: "Mon",
    beat: "Final slate closeout",
    surface: "journal (night close)",
    action: "",
    actionHref: null,
    urgency: "desk",
  },
];

/**
 * The beat(s) for a given date (UTC). Monday carries two — the morning
 * learn-back and the night closeout — so this returns a list.
 */
export function beatsForDay(date: Date): readonly RitualBeat[] {
  const idx = date.getUTCDay();
  return WEEKLY_RITUAL.filter((b) => b.dayIndex === idx);
}

/** Today's customer-facing action, or null when the day is desk-side only. */
export function todayAction(date: Date = new Date()): RitualBeat | null {
  return beatsForDay(date).find((b) => b.action.length > 0 && b.actionHref) ?? null;
}
