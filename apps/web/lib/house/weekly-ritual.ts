/**
 * The weekly NFL ritual — canonical Mon→Mon beat map (NFL House doctrine).
 *
 * Single source of truth for the week's shape: the /house rail renders it,
 * and content-automation jobs MUST take their daily beat from here rather
 * than carrying their own calendar. One module, one rhythm — the rail and
 * the pipeline can never drift apart.
 */

export interface RitualBeat {
  /** JS day index, 0 = Sunday … 6 = Saturday (Date#getUTCDay). */
  readonly dayIndex: number;
  readonly day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  readonly beat: string;
  /** Where the beat lands — existing surfaces/jobs only, no vaporware. */
  readonly surface: string;
}

export const WEEKLY_RITUAL: readonly RitualBeat[] = [
  { dayIndex: 1, day: "Mon", beat: "What we learned", surface: "journal + performance autopsies" },
  { dayIndex: 2, day: "Tue", beat: "Injury watch · the accountability pass", surface: "performance/losses (autopsies land here)" },
  { dayIndex: 3, day: "Wed", beat: "Opening market read", surface: "observatory fair board" },
  { dayIndex: 4, day: "Thu", beat: "First edge board", surface: "picks board" },
  { dayIndex: 5, day: "Fri", beat: "The human read", surface: "journal (drafts Saturday: standing law, keep)" },
  { dayIndex: 6, day: "Sat", beat: "Fantasy help · Parlay MRI", surface: "fantasy tools + parlay-mri" },
  { dayIndex: 0, day: "Sun", beat: "Game day", surface: "the-beat / live surfaces" },
  { dayIndex: 1, day: "Mon", beat: "Final slate closeout", surface: "journal (night close)" },
];

/**
 * The beat(s) for a given date (UTC). Monday carries two — the morning
 * learn-back and the night closeout — so this returns a list.
 */
export function beatsForDay(date: Date): readonly RitualBeat[] {
  const idx = date.getUTCDay();
  return WEEKLY_RITUAL.filter((b) => b.dayIndex === idx);
}
