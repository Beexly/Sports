/**
 * grade-audit edge-case probe (READ-ONLY: imports product code, changes nothing).
 * Run: npx tsx handoff/grade-audit-probe.ts
 *
 * Every row is an edge case named by .claude/commands/grade-audit.md:
 *   push/void, half-win/half-loss, postponed/cancelled, settlement timing,
 *   timezone boundaries. "expected" is the sportsbook contract; "actual" is what
 * the shipped function returns. A row is a finding when they disagree.
 */
import { calculatePickResult, selectGradingLine } from "../packages/prediction-engine/src/settlement";

type Row = {
  case: string;
  family: string;
  expected: string;
  actual: string;
  agree: boolean;
};

const rows: Row[] = [];

function probe(
  family: string,
  name: string,
  expected: string,
  args: Parameters<typeof calculatePickResult>,
) {
  let actual: string;
  try {
    actual = calculatePickResult(...args);
  } catch (e) {
    actual = `THROW: ${e instanceof Error ? e.message.slice(0, 60) : String(e)}`;
  }
  rows.push({ case: name, family, expected, actual, agree: expected === actual });
}

// ── A. SPREAD push / cover, home line convention (-3.5 = home favoured) ──
const SP = (sel: string, line: number, hs: number, as: number) =>
  ["SPREAD", sel, line, "Home", hs, as, "americanfootball_nfl", "Away"] as const;

probe("spread-push", "home -3.5, home wins by 3 (margin 3) -> home cover -0.5 = LOSS", "LOSS", SP("Home", -3.5, 24, 21));
probe("spread-push", "home -3.0, home wins by 3 (margin 3) -> EXACT push", "PUSH", SP("Home", -3.0, 24, 21));
probe("spread-push", "home -3.0, home wins by 4 -> WIN", "WIN", SP("Home", -3.0, 25, 21));
probe("spread-push", "home -3.0, home loses by 3 -> EXACT push", "PUSH", SP("Home", -3.0, 20, 23));
probe("spread-push", "away +3.0, home loses by 3 -> EXACT push", "PUSH", SP("Away", -3.0, 20, 23));
probe("spread-push", "away +3.0, home loses by 4 -> WIN", "WIN", SP("Away", -3.0, 20, 24));
probe("spread-push", "home 0.0 pick'em, tie -> EXACT push", "PUSH", SP("Home", 0, 21, 21));
probe("spread-push", "home -0.5, tie -> LOSS (no push on half line)", "LOSS", SP("Home", -0.5, 21, 21));
probe("spread-push", "home +3.5 (underdog), home loses by 3 -> WIN", "WIN", SP("Home", 3.5, 18, 21));

// ── B. HALF-WIN / HALF-LOSS — Asian quarter lines ──
probe("half-line", "Asian -0.25 on a 0-0 draw -> HALF-LOSS (stake 0.5 on -0.5, 0.5 on 0)", "HALF_LOSS", SP("Home", -0.25, 21, 21));
probe("half-line", "Asian +0.25 on a 0-0 draw -> HALF-WIN", "HALF_WIN", SP("Home", 0.25, 21, 21));
probe("half-line", "Asian -0.75, home wins by 1 -> HALF-WIN (0.5 on -1, 0.5 on -0.5)", "HALF_WIN", SP("Home", -0.75, 22, 21));
probe("half-line", "Asian -0.25, home wins by 1 -> WIN", "WIN", SP("Home", -0.25, 22, 21));

// ── C. TOTAL push + Asian total lines ──
const TOT = (sel: string, line: number, hs: number, as: number) =>
  ["TOTAL", sel, line, "Home", hs, as, "baseball_mlb", "Away"] as const;
probe("total-push", "OVER 45.5, total 45 -> LOSS", "LOSS", TOT("OVER 45.5", 45.5, 22, 23));
probe("total-push", "OVER 45.0, total 45 -> EXACT push", "PUSH", TOT("OVER 45.0", 45.0, 22, 23));
probe("total-push", "UNDER 45.0, total 45 -> EXACT push", "PUSH", TOT("UNDER 45.0", 45.0, 22, 23));
probe("total-push", "Asian UNDER 45.25, total 45 -> HALF-WIN (0.5 U45, 0.5 U45.5)", "HALF_WIN", TOT("UNDER 45.25", 45.25, 22, 23));
probe("total-push", "Asian OVER 45.25, total 45 -> HALF-LOSS", "HALF_LOSS", TOT("OVER 45.25", 45.25, 22, 23));
probe("total-push", "selection 'under 45.5' lowercase -> still UNDER", "LOSS", TOT("under 45.5", 45.5, 22, 24));
probe("total-push", "selection 'Over 45.5' capitalised lowercase o -> still OVER", "WIN", TOT("Over 45.5", 45.5, 24, 22));

// ── D. MONEYLINE: draw handling, three-way, the PUSH branch ──
const ML = (sel: string, hs: number, as: number, sport: string) =>
  ["MONEYLINE", sel, 0, "Home", hs, as, sport, "Away"] as const;
probe("moneyline", "soccer ML, 1-1 draw -> LOSS (three-way market)", "LOSS", ML("Home", 1, 1, "soccer_usa_mls"));
probe("moneyline", "nfl ML, tie -> PUSH (branch exists, unreachable in NFL)", "PUSH", ML("Home", 21, 21, "americanfootball_nfl"));
probe("moneyline", "away pick, away wins -> WIN", "WIN", ML("Away", 1, 3, "soccer_usa_mls"));
probe("moneyline", "away pick, home wins -> LOSS", "LOSS", ML("Away", 3, 1, "soccer_usa_mls"));
probe("moneyline", "MLB tie is impossible; branch would say PUSH", "PUSH", ML("Home", 0, 0, "baseball_mlb"));

// ── E. Side derivation: the prefix-collision inversions the header documents ──
probe("side-derivation", "home 'LA' vs away 'LAC', selection 'LAC ...' -> AWAY", "LOSS", ["MONEYLINE", "LAC Chargers", 0, "LA", 24, 21, "americanfootball_nfl", "LAC"] as const);
probe("side-derivation", "home 'Jets' vs away 'Jets Metro' -> 'Jets Metro' is AWAY", "WIN", ["MONEYLINE", "Jets Metro", 0, "Jets", 20, 24, "americanfootball_nfl", "Jets Metro"] as const);
probe("side-derivation", "neither side matches (renamed team) -> defaults AWAY", "WIN", ["MONEYLINE", "Miami Dolphins", 0, "Home", 1, 2, "americanfootball_nfl", "Away"] as const);

// ── F. The closed-union fall-through ──
probe("fall-through", "unknown pickType must THROW, never fabricate PUSH", "THROW", ["PROP" as never, "X", 0, "H", 1, 0, "s", "A"] as never);

// ── G. selectGradingLine: the ?? vs || decision ──
const lockCases: Array<[string, number | null, number, number]> = [
  ["locked pick'em 0 must NOT fall through to line", 0, -3.5, 0],
  ["locked line honoured", -3.5, -7, -3.5],
  ["null lock -> falls back to line", null, -7, -7],
  ["undefined lock -> falls back to line", undefined as unknown as number, -7, -7],
];

// ── report ──
const fams = [...new Set(rows.map((r) => r.family))];
console.log("=".repeat(78));
console.log("GRADE-AUDIT EDGE-CASE PROBE  (expected = sportsbook contract)");
console.log("=".repeat(78));
for (const f of fams) {
  console.log(`\n── ${f} ──`);
  for (const r of rows.filter((x) => x.family === f)) {
    console.log(`  ${r.agree ? "ok  " : "DIFF"}  ${r.case}`);
    if (!r.agree) console.log(`         expected ${r.expected} | actual ${r.actual}`);
  }
}
const diffs = rows.filter((r) => !r.agree);
console.log("\n" + "-".repeat(78));
console.log(`selectGradingLine probes:`);
for (const [name, clvLockLine, line, want] of lockCases) {
  const got = selectGradingLine({ clvLockLine, line });
  console.log(`  ${got === want ? "ok  " : "DIFF"}  ${name} -> ${got}`);
  if (got !== want) diffs.push({ case: name, family: "grading-line", expected: String(want), actual: String(got), agree: false });
}
console.log(`\nTOTAL ${rows.length + lockCases.length} probes, ${diffs.length} disagreement(s).`);
console.log(`MODEL: no HALF_WIN/HALF_LOSS result exists in PickResult; SettlementResult = ${"WIN|LOSS|PUSH"}`);
process.exit(0);
