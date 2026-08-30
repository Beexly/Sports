/**
 * Academy LMS spine — tracks, modules, and mastery.
 *
 * Turns the Academy from a page into a curriculum: ordered tracks, each with
 * modules that map to a real, trainable surface on the floor. Completion is
 * persisted on-device (localStorage) so a learner's progress and mastery follow
 * them across visits. Pure + serializable here; the client panel owns the
 * storage. No fabricated certification, just an honest progress record.
 */

export interface AcademyModule {
  readonly id: string;
  readonly label: string;
  /** What the learner does to complete it. */
  readonly drill: string;
  /** In-page anchor (a wing) or route the module trains on. */
  readonly href: string;
}

export interface AcademyTrack {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly accent: "cyan" | "magenta" | "violet";
  readonly modules: readonly AcademyModule[];
}

export const ACADEMY_TRACKS: readonly AcademyTrack[] = [
  {
    id: "foundations",
    label: "Foundations",
    blurb: "Read a line, read a number, and learn when not to bet.",
    accent: "cyan",
    modules: [
      { id: "f-line", label: "Reading a line", drill: "Finish the line-reading lesson and pass its check.", href: "#courses" },
      { id: "f-confidence", label: "Confidence vs certainty", drill: "Complete the calibration lesson.", href: "#courses" },
      { id: "f-nobet", label: "The No-Bet discipline", drill: "Pass the restraint check.", href: "#courses" },
    ],
  },
  {
    id: "live-reps",
    label: "Live Reps",
    blurb: "Decide blind, get graded on process, and trade the close.",
    accent: "magenta",
    modules: [
      { id: "l-livefire", label: "Live Fire drill", drill: "Make a graded blind decision in Live Fire.", href: "#live-fire" },
      { id: "l-close", label: "Beat the Close", drill: "Play a full round of Beat the Close.", href: "#beat-the-close" },
      { id: "l-readout", label: "Read your grade", drill: "Review a process grade and the why behind it.", href: "#live-fire" },
    ],
  },
  {
    id: "mastery",
    label: "Film & Mastery",
    blurb: "Watch the film, then prove the read holds under pressure.",
    accent: "violet",
    modules: [
      { id: "m-film", label: "Film Room episode", drill: "Watch a filmed lesson (or its storyboard).", href: "#film-room" },
      { id: "m-gm", label: "GM Academy drills", drill: "Run a fantasy GM drill.", href: "/fantasy/academy" },
      { id: "m-check", label: "Mastery check", drill: "Clear a mixed check across every track.", href: "#courses" },
    ],
  },
];

export const ACADEMY_MODULE_IDS: readonly string[] = ACADEMY_TRACKS.flatMap((t) =>
  t.modules.map((m) => m.id),
);

export const ACADEMY_PROGRESS_KEY = "gse-academy-progress-v1";

/** Mastery summary computed from a set of completed module ids. */
export interface MasterySummary {
  readonly completed: number;
  readonly total: number;
  readonly pct: number;
  /** Per-track completed counts. */
  readonly byTrack: Readonly<Record<string, { completed: number; total: number }>>;
  /** Named tier for the current mastery percentage. */
  readonly tier: string;
}

export function masteryTier(pct: number): string {
  if (pct >= 100) return "Mastered";
  if (pct >= 67) return "Sharp";
  if (pct >= 34) return "Training";
  if (pct > 0) return "Rookie";
  return "Unranked";
}

/** Compute the mastery summary from a set of completed module ids. */
export function computeMastery(completed: ReadonlySet<string>): MasterySummary {
  const valid = new Set(ACADEMY_MODULE_IDS);
  const done = [...completed].filter((id) => valid.has(id));
  const total = ACADEMY_MODULE_IDS.length;
  const byTrack: Record<string, { completed: number; total: number }> = {};
  for (const track of ACADEMY_TRACKS) {
    const c = track.modules.filter((m) => completed.has(m.id)).length;
    byTrack[track.id] = { completed: c, total: track.modules.length };
  }
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);
  return { completed: done.length, total, pct, byTrack, tier: masteryTier(pct) };
}
