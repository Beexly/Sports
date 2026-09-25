/**
 * Fourth-down grader — decision-quality grades on 4th-down calls.
 *
 * Per-play metric: delta = WP(go) − WP(actual call).
 * Grade is decided by the gap between the optimal decision's win probability
 * and the win probability of what was actually called:
 *   A — optimal (actual call achieved the maximum WP among the options)
 *   B — within 1 percentage point of optimal
 *   C — between 1 and 3 percentage points of optimal
 *   D — worse than 3 percentage points of optimal
 *
 * Invalid / out-of-range / non-finite win probabilities yield `null`
 * (fail-closed; never imputed).
 *
 * Additive research module — not wired into any live prediction path.
 */

export type FourthDownCall = "go" | "punt" | "field-goal";

export type FourthDownGrade = "A" | "B" | "C" | "D";

export interface FourthDownPlay {
  playId: string;
  team: string;
  week: number;
  /** P(win) if the team goes for it. */
  wpGo: number;
  /** P(win) if the team punts. */
  wpPunt: number;
  /** P(win) if the team attempts a field goal. */
  wpFieldGoal: number;
  actualCall: FourthDownCall;
}

export interface FourthDownGradeRow {
  playId: string;
  team: string;
  week: number;
  actualCall: FourthDownCall;
  optimalCall: FourthDownCall;
  wpGo: number;
  wpActual: number;
  /** WP(go) − WP(actual call) — the module's headline metric. */
  wpGoMinusActual: number;
  /** WP(optimal) − WP(actual call); drives the letter grade. */
  optimalGap: number;
  grade: FourthDownGrade;
}

export interface TeamWeekAggregate {
  team: string;
  week: number;
  plays: number;
  avgWpGoMinusActual: number;
  avgOptimalGap: number;
  gradeCounts: Readonly<Record<FourthDownGrade, number>>;
  /** Share of graded plays that were the optimal call. */
  optimalRate: number;
}

function isProb(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

const CALLS: readonly FourthDownCall[] = ["go", "punt", "field-goal"];

function wpForCall(
  call: FourthDownCall,
  wpGo: number,
  wpPunt: number,
  wpFieldGoal: number,
): number | null {
  if (call === "go") return wpGo;
  if (call === "punt") return wpPunt;
  if (call === "field-goal") return wpFieldGoal;
  return null;
}

function gradeFromGap(gap: number): FourthDownGrade {
  // 1pp = 0.01 in probability units. Boundary counts as the better grade.
  if (gap <= 1e-9) return "A";
  if (gap <= 0.01) return "B";
  if (gap <= 0.03) return "C";
  return "D";
}

/**
 * Grade a single 4th-down decision. Returns `null` when any win probability
 * is missing, non-finite, or outside [0, 1], or when the actual call is not a
 * recognised option (fail-closed).
 */
export function gradeFourthDown(
  play: FourthDownPlay | null | undefined,
): FourthDownGradeRow | null {
  if (play == null) return null;
  const { wpGo, wpPunt, wpFieldGoal, actualCall } = play;
  if (!isProb(wpGo) || !isProb(wpPunt) || !isProb(wpFieldGoal)) return null;
  if (!CALLS.includes(actualCall)) return null;

  const wpActual = wpForCall(actualCall, wpGo, wpPunt, wpFieldGoal);
  if (wpActual === null) return null;

  // Optimal call = argmax WP; ties resolve to go, then punt, then field-goal.
  let optimalCall: FourthDownCall = "go";
  let bestWp = wpGo;
  if (wpPunt > bestWp) {
    optimalCall = "punt";
    bestWp = wpPunt;
  }
  if (wpFieldGoal > bestWp) {
    optimalCall = "field-goal";
    bestWp = wpFieldGoal;
  }

  const optimalGap = bestWp - wpActual;
  return {
    playId: play.playId,
    team: play.team,
    week: play.week,
    actualCall,
    optimalCall,
    wpGo,
    wpActual,
    wpGoMinusActual: wpGo - wpActual,
    optimalGap,
    grade: gradeFromGap(optimalGap),
  };
}

/**
 * Grade a batch, dropping plays that fail validation (fail-closed rows are
 * omitted, never imputed).
 */
export function gradeFourthDownPlays(
  plays: readonly (FourthDownPlay | null | undefined)[] | null | undefined,
): readonly FourthDownGradeRow[] {
  if (!Array.isArray(plays)) return [];
  const rows: FourthDownGradeRow[] = [];
  for (const p of plays) {
    const row = gradeFourthDown(p);
    if (row !== null) rows.push(row);
  }
  return rows;
}

/**
 * Team/week aggregates over already-validated grade rows.
 */
export function aggregateByTeamWeek(
  rows: readonly FourthDownGradeRow[] | null | undefined,
): readonly TeamWeekAggregate[] {
  if (!Array.isArray(rows)) return [];
  const buckets = new Map<string, FourthDownGradeRow[]>();
  for (const r of rows) {
    const key = `${r.team}\u0000${r.week}`;
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [r]);
    else bucket.push(r);
  }

  const out: TeamWeekAggregate[] = [];
  for (const bucket of buckets.values()) {
    const first = bucket[0];
    if (first === undefined) continue;
    const plays = bucket.length;
    let sumGoMinus = 0;
    let sumGap = 0;
    let optimal = 0;
    const gradeCounts: Record<FourthDownGrade, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const r of bucket) {
      sumGoMinus += r.wpGoMinusActual;
      sumGap += r.optimalGap;
      if (r.grade === "A") optimal += 1;
      gradeCounts[r.grade] += 1;
    }
    out.push({
      team: first.team,
      week: first.week,
      plays,
      avgWpGoMinusActual: sumGoMinus / plays,
      avgOptimalGap: sumGap / plays,
      gradeCounts,
      optimalRate: optimal / plays,
    });
  }

  out.sort((a, b) => {
    if (a.team !== b.team) return a.team < b.team ? -1 : 1;
    return a.week - b.week;
  });
  return out;
}

// --- Engine-facing API (handoff-suite contract) -----------------------------
export interface FourthDownApi {
  grade(input: { wpGo: number; wpActual: number } | null | undefined): { grade: FourthDownGrade; wpLost: number } | null;
  gradePlays(plays: readonly FourthDownPlay[]): FourthDownGradeRow[];
  aggregate(rows: readonly FourthDownGradeRow[]): TeamWeekAggregate[];
}
export function createFourthDownGrader(): FourthDownApi {
  return {
    grade(input) {
      if (input == null) return null;
      const { wpGo, wpActual } = input;
      if (!Number.isFinite(wpGo) || !Number.isFinite(wpActual)) return null;
      if (wpGo < 0 || wpGo > 1 || wpActual < 0 || wpActual > 1) return null;
      const wpLost = wpGo - wpActual;
      const absLost = Math.abs(wpLost);
      let grade: FourthDownGrade;
      if (absLost < 0.005) grade = "A";
      else if (absLost <= 0.01) grade = "B";
      else if (absLost <= 0.03) grade = "C";
      else grade = "D";
      return { grade, wpLost };
    },
    gradePlays(plays) {
      return plays.map((p) => {
        const wpCall = p.actualCall === 'go' ? p.wpGo : p.actualCall === 'punt' ? p.wpPunt : p.wpFieldGoal;
        const optimalCall = p.wpGo >= p.wpPunt && p.wpGo >= p.wpFieldGoal ? 'go' : p.wpPunt >= p.wpFieldGoal ? 'punt' : 'field-goal';
        const wpOptimal = optimalCall === 'go' ? p.wpGo : optimalCall === 'punt' ? p.wpPunt : p.wpFieldGoal;
        const gap = wpOptimal - wpCall;
        const absGap = Math.abs(gap);
        const grade = absGap < 0.005 ? 'A' : absGap <= 0.01 ? 'B' : absGap <= 0.03 ? 'C' : 'D';
        return { playId: p.playId, team: p.team, week: p.week, actualCall: p.actualCall, optimalCall, wpGo: p.wpGo, wpActual: wpCall, wpGoMinusActual: p.wpGo - wpCall, optimalGap: gap, grade };
      });
    },
    aggregate(rows) {
      const map = new Map<string, { team: string; week: number; rows: FourthDownGradeRow[] }>();
      for (const r of rows) {
        const key = r.team + "|" + String(r.week);
        const entry = map.get(key) ?? { team: r.team, week: r.week, rows: [] };
        entry.rows.push(r);
        map.set(key, entry);
      }
      return Array.from(map.values()).map((e) => {
        const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        let optimal = 0;
        let sumGap = 0;
        let sumOptGap = 0;
        for (const r of e.rows) {
          gradeCounts[r.grade] = (gradeCounts[r.grade] ?? 0) + 1;
          if (r.grade === "A") optimal += 1;
          sumGap += r.wpGoMinusActual;
          sumOptGap += r.optimalGap;
        }
        return {
          team: e.team,
          week: e.week,
          plays: e.rows.length,
          avgWpGoMinusActual: sumGap / e.rows.length,
          avgOptimalGap: sumOptGap / e.rows.length,
          gradeCounts: gradeCounts as { A: number; B: number; C: number; D: number },
          optimalRate: optimal / e.rows.length,
        };
      });
    },
  };
}
