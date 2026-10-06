import type { FieldSnap } from "@/lib/field";

export type DriftRow = { week: string; ttt: number; attempts: number; delta: number };

export function fieldArithmetic(
  snap: FieldSnap,
  watsonWeeks: readonly { week: string; ttt: string; attempts: string }[],
) {
  const rows = snap.passers;
  const n = rows.length;
  if (!n) return null;
  const attempts = rows.reduce((sum, row) => sum + row.att, 0);
  const weighted = attempts > 0 ? rows.reduce((sum, row) => sum + row.ttt * row.att, 0) / attempts : null;
  const mean = rows.reduce((sum, row) => sum + row.ttt, 0) / n;
  const sorted = [...rows].map((row) => row.ttt).sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(n - 1, Math.max(0, Math.round((n - 1) * p)))];
  const lineRows = snap.ol.reduce((sum, row) => sum + row.ol, 0);
  const lineOut = snap.ol.reduce((sum, row) => sum + row.out, 0);
  const season = watsonWeeks.find((row) => row.week === "0");
  const seasonTtt = season ? Number(season.ttt) : null;
  const drift: DriftRow[] =
    seasonTtt === null || !Number.isFinite(seasonTtt)
      ? []
      : watsonWeeks
          .filter((row) => row.week !== "0")
          .map((row) => ({
            week: row.week,
            ttt: Number(row.ttt),
            attempts: Number(row.attempts),
            delta: Number(row.ttt) - seasonTtt,
          }));
  const belowFixture = sorted.filter((value) => value <= 2.1).length;
  return {
    n,
    attempts,
    weighted,
    mean,
    q1: at(0.25),
    q3: at(0.75),
    lineRows,
    lineOut,
    reporting: snap.ol.length,
    nullTeams: snap.nullTeams.length,
    drift,
    seasonTtt,
    belowFixture,
  };
}

/** What each public file is allowed to say. Grain is the contract. */
export const CATALOG = [
  {
    file: "injuries_2026.csv.gz",
    grain: "player × team × week",
    may: "Cite a row that exists. Cleveland week 4 has two Out linemen.",
    mayNot: "Read a missing team as healthy. Pittsburgh week 4 is null.",
  },
  {
    file: "ngs_passing.csv.gz",
    grain: "player × week, week 0 = season",
    may: "Name a time-to-throw prior, with its attempts.",
    mayNot: "Write the mean into a snap. CPOE and air yards are not admitted features.",
  },
  {
    file: "ngs_2024_passing.csv.gz",
    grain: "none — 616 bytes",
    may: "Confirm it is a stub.",
    mayNot: "Use it.",
  },
  {
    file: "schedules spread_line",
    grain: "one number per game",
    may: "Know a spread exists.",
    mayNot: "Count it as a bet and a close. Closing-line value needs two timestamps.",
  },
  {
    file: "Big Data Bowl tracking",
    grain: "historical frames, game_id + play_id",
    may: "Show what a play-level release looks like, on old competitions.",
    mayNot: "Fill the 2026 public play-level cell. Kaggle has no keyless search from this console.",
  },
] as const;
