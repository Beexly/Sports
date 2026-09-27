/**
 * Week 3 DK Sun–Mon optimizer harness — LOCAL ONLY.
 * Parses the real DK salary CSV, builds DfsPlayer[] with documented projections,
 * runs Garrett's REAL optimizer (generateLineups / optimizeOne), validates output,
 * writes lineups.json + REPORT.md. Nothing is committed, published, or entered.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { generateLineups, optimizeOne, metrics } from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-optimizer";
import type { OptOpts, Lineup } from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-optimizer";
import { SALARY_CAP, DFS_SLOTS } from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-slate";
import type { DfsPlayer, DfsPos } from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-slate";
import { validateLineup, validateOptimizerInput } from "/home/hatch/workspace/vendor/Sports/apps/web/lib/fantasy/dfs-lineup-validation";
import {
  applyConstructionRules,
  hasTeFlex,
  isDoubleStacked,
  stackMates,
  stackMateCount,
  type AppliedRules,
} from "./construction-rules";

const HERE = "/home/hatch/workspace/dfs-week3";
const CSV = "/home/hatch/workspace/vendor/Sports/docs/research/2026-09-24/full-tables/dk-sunmon-slate-salaries-week3.csv";

// ---------------------------------------------------------------------------
// 1. Parse CSV
// ---------------------------------------------------------------------------
type Row = Record<string, string>;
function parseCsv(p: string): Row[] {
  let text = fs.readFileSync(p, "utf-8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const header = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    // CSV is simple: no quoted commas in these columns (Name+ID has parens, no commas)
    const cells = line.split(",");
    const r: Row = {};
    header.forEach((h, i) => (r[h.trim()] = (cells[i] ?? "").trim()));
    return r;
  });
}
const rows = parseCsv(CSV);
console.log(`CSV rows: ${rows.length}`);

// ---------------------------------------------------------------------------
// 2. Props table — confirmed lines from week3-props-ownership.md (2026-09-25)
//    Keyed by DK CSV id. tdProb derived from American odds (documented formula).
// ---------------------------------------------------------------------------
type Props = {
  recYds?: number; rec?: number; rushYds?: number;
  passYds?: number; passTD?: number; tdProb?: number;
  src: string;
};
const plus = (o: number) => 100 / (o + 100);
const minus = (o: number) => Math.abs(o) / (Math.abs(o) + 100);
const PROPS: Record<string, Props> = {
  "44248628": { recYds: 36.5, rec: 3.5, tdProb: plus(250), src: "ScoresAndOdds 6-book board (bet365 35.5 … DK 37.5), TD +225–+280 → +250 mid" }, // Gadsden
  "44248608": { recYds: 46.5, rec: 4.5, tdProb: plus(140), src: "Action Network player page (rec 46.5, receptions 4.5); TD +135–+146 → +140 mid" }, // Andrews
  "44247706": { rushYds: 72, recYds: 15.5, rec: 2.0 /* assumption: 3 rec Wk1, 2 rec Wk2 (usage lane) */, tdProb: minus(130), src: "Action Network (rush 72.5, TD -130); Bleacher Nation 9/24 (rec yds 15.5)" }, // Hubbard
  "44248620": { recYds: 34.5, rec: 3.5, tdProb: plus(355), src: "Action Network player page (receptions 3.5, yards 34.5, TD +355)" }, // Freiermuth
  "44248590": { rec: 7.5, recYds: 7.5 * 8.0 /* assumption: 136 yds/17 rec Wk1–2 (usage lane) */, tdProb: plus(186), src: "Action Network (receptions 7.5, TD +186); yards estimated, no confirmed line" }, // McBride
  "44248026": { recYds: 91, rec: 6.5, tdProb: minus(102), src: "Action Network (91 yds, TD -102); BetMGM (6.5 rec)" }, // JSN
  "44247672": { rushYds: 87, recYds: 38.5, rec: 4.5, tdProb: minus(332), src: "BetMGM 9/24 (rush 86.5, rec 38.5, receptions 4.5); Action Network (rush 87.5, TD -332)" }, // Gibbs
  "44247572": { passYds: 240, passTD: 1.5, rushYds: 33.8, src: "BetMGM (pass 241.5, TD 1.5, rush 35.5); Bleacher Nation 9/24 (238.5/1.5/32.5) → mids" }, // Allen
  "44248170": { recYds: 24.5, rec: 3.5, tdProb: 0.15 /* assumption: 0 TD through 2 games */, src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // K. Raymond
  "44248074": { recYds: 32.5, rec: 3.5, tdProb: plus(350), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // Burden
  "44248598": { recYds: 31.5, rec: 3.5, tdProb: plus(400), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // Loveland
  "44248086": { recYds: 25.5, rec: 2.5, tdProb: plus(480), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // Odunze
  "44248134": { recYds: 23.5, rec: 2.5, tdProb: plus(480), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // Lemon
  "44248040": { recYds: 72.5, rec: 5.5, tdProb: plus(175), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // DeVonta Smith
  "44248148": { recYds: 41.5, rec: 3.5, tdProb: plus(330), src: "NBC Sports Philadelphia Eagles–Bears betting guide" }, // Wicks
};

// ---------------------------------------------------------------------------
// 3. Exclusions — status IR/OUT/D outright; Q case-by-case per week3-injuries.md
// ---------------------------------------------------------------------------
const Q_EXCLUDE = new Set([
  "44248592", // Brock Bowers — DNP Friday
  "44248044", // Zay Flowers — lean out
  "44247605", // Tyson Bagent — concussion protocol, unlikely
  "44248070", // DJ Moore (BUF) — questionable at best (the [Q] is Buffalo's)
  "44247622", // Aidan O'Connell — personal, out
  "44248624", // Chig Okonkwo — longshot
  "44247760", // Rico Dowdle — trending out
  "44247750", // Tyjae Spears — likely game-time decision
  "44247732", // Kyle Monangai — consecutive DNPs, doubted
]);

// Role/weather adjustments (documented in PROVENANCE.md)
const ROLE_MULT: Record<string, number> = {
  "44248170": 1.15, // Kalif Raymond — Keenum safety-blanket archetype
  "44247700": 1.10, // D'Andre Swift — checkdown role
  "44248074": 0.90, // Luther Burden III — downfield/garbage-time
  "44248086": 0.90, // Rome Odunze — downfield tied to Williams
  "44248620": 1.10, // Pat Freiermuth — CIN weak vs TEs
  "44248608": 1.10, // Mark Andrews — DAL soft vs TEs
};
const WX_PASS_DOWNGRADE: Record<string, number> = {
  // game key "AWAY@HOME" -> multiplier for QB/WR/TE (week3-venues-weather.md, 9/25 ~2:35pm CT)
  "TEN@NYG": 0.90, "SEA@WAS": 0.95, "LAC@BUF": 0.95, "LAR@DEN": 0.95,
};
const WX_DST_BONUS: Record<string, number> = { "TEN@NYG": 1.5 };

// Ownership proxy — SI Sunday-main numbers (DIFFERENT pool, labeled PROXY)
const SI_PROXY: Record<string, number> = {
  "44247581": 0.058, // Drake Maye
  "44247692": 0.068, // Chase Brown
  "44248112": 0.088, // Marvin Harrison Jr.
  "44248594": 0.061, // Dalton Kincaid
  "44248106": 0.082, // Jordan Addison
  "44248148": 0.028, // Dontayvion Wicks
  "44247575": 0.051, // Dak Prescott (10.2% combined w/ Lamb, split)
  "44248032": 0.051, // CeeDee Lamb
};
const BUZZ_UP = new Set(["44247572","44247672","44248030","44247580","44247696","44248606","44248590","44247590","44247589","44248068","44248056","44247686","44248038"]); // Allen,Gibbs,ASB,Mahomes,Hall,Kelce,McBride,Shough,Stroud,McConkey,GWilson,Cook,Olave
const PIVOT_DOWN = new Set(["44247577","44247595","44247688","44248608"]); // Purdy,Kyler,Hampton,Andrews

// ---------------------------------------------------------------------------
// 4. Build DfsPlayer[]
// ---------------------------------------------------------------------------
function propsImplied(p: Props, pos: DfsPos): number {
  if (pos === "QB") {
    return p.passYds! / 25 + p.passTD! * 4 + (p.rushYds ?? 0) / 10 - 0.8; // -0.8 INT assumption
  }
  return (p.recYds ?? 0) / 10 + (p.rec ?? 0) * 1 + (p.rushYds ?? 0) / 10 + (p.tdProb ?? 0) * 6;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function buildSlate(): { slate: DfsPlayer[]; excluded: { id: string; name: string; reason: string }[] } {
  const slate: DfsPlayer[] = [];
  const excluded: { id: string; name: string; reason: string }[] = [];
  for (const r of rows) {
    const id = r["ID"]!, name = r["Name"]!, pos = r["Position"]! as DfsPos;
    const salary = parseInt(r["Salary"]!, 10);
    const appgRaw = r["AvgPointsPerGame"]!;
    const appg = appgRaw === "" ? 0 : parseFloat(appgRaw);
    const status = r["Status"]!;
    const team = r["TeamAbbrev"]!;
    const gameKey = r["Game Info"]!.split(" ")[0]!;
    const [away, home] = gameKey.split("@");
    const opp = team === home ? away! : team === away ? home! : "UNK";
    const dispName = pos === "DST" ? `${team} DST` : name;
    const pid = pos === "DST" ? `dst-${team}` : id;

    if (status === "IR" || status === "OUT" || status === "D") {
      excluded.push({ id: pid, name: dispName, reason: `DK status ${status}` });
      continue;
    }
    if (Q_EXCLUDE.has(id)) {
      excluded.push({ id: pid, name: dispName, reason: "Q but research verdict = lean out / unlikely" });
      continue;
    }

    let proj: number;
    const pr = PROPS[id];
    if (pos === "QB" && id === "44247613") {
      // Case Keenum — no lines; FantasyPros projection (props-ownership.md §2.9)
      proj = 200.3 / 25 + 1.0 * 4 + 9.1 / 10 - 0.8;
    } else if (pr && (pr.passYds !== undefined || pr.recYds !== undefined || pr.rushYds !== undefined)) {
      proj = 0.6 * appg + 0.4 * propsImplied(pr, pos);
    } else {
      proj = appg;
    }

    // Weather
    if ((pos === "QB" || pos === "WR" || pos === "TE") && WX_PASS_DOWNGRADE[gameKey]) {
      proj *= WX_PASS_DOWNGRADE[gameKey]!;
    }
    if (pos === "DST" && WX_DST_BONUS[gameKey]) proj += WX_DST_BONUS[gameKey]!;
    // Role
    if (ROLE_MULT[id]) proj *= ROLE_MULT[id]!;

    proj = r2(proj);
    let floor: number, ceiling: number;
    if (pos === "DST") { floor = r2(proj * 0.3); ceiling = r2(proj * 2.2); }
    else if (id === "44247613") { floor = r2(proj * 0.6); ceiling = r2(proj * 1.5); }
    else if (pos === "QB") { floor = r2(proj * 0.6); ceiling = r2(proj * 1.7); }
    else { floor = r2(proj * 0.55); ceiling = r2(proj * 1.7); }

    // Ownership PROXY
    let own: number;
    if (SI_PROXY[id] !== undefined) own = SI_PROXY[id]!;
    else if (pos === "DST") own = 0.05 + (0.10 * (salary - 2000)) / 1800;
    else own = 0.03 + (0.22 * (salary - 2500)) / 6300;
    if (BUZZ_UP.has(id) && SI_PROXY[id] === undefined) own += 0.05;
    if (PIVOT_DOWN.has(id) && SI_PROXY[id] === undefined) own -= 0.02;
    own = Math.min(0.3, Math.max(0.015, own));
    own = r2(own);

    if (!Number.isFinite(salary) || !Number.isFinite(proj) || !Number.isFinite(floor) || !Number.isFinite(ceiling) || !Number.isFinite(own)) {
      throw new Error(`non-finite value for ${dispName} (${pid}) — refusing`);
    }
    slate.push({ id: pid, name: dispName, pos, team, opp, salary, proj, floor, ceiling, own });
  }
  return { slate, excluded };
}

const { slate, excluded } = buildSlate();
console.log(`Slate: ${slate.length} players | Excluded: ${excluded.length}`);

// Validate input (duplicate athletes etc.)
const baseOpts: OptOpts = { mode: "gpp", stack: true, locks: new Set<string>(), excludes: new Set<string>() };
const inputIssues = validateOptimizerInput(baseOpts, slate);
if (inputIssues.length) {
  console.error("INPUT ISSUES:", inputIssues);
  throw new Error("slate input failed validation");
}

// ---------------------------------------------------------------------------
// 5. Runs — the REAL optimizer, then harness construction rules (v2)
// ---------------------------------------------------------------------------
function describeStack(lu: Lineup): { team: string | null; mates: string[]; bringBack: string | null } {
  const qb = lu.find((p) => p.pos === "QB")!;
  const mates = stackMates(lu).map((p) => `${p.name} (${p.pos})`);
  const bb = lu.find((p) => p.team === qb.opp && p.id !== qb.id && p.pos !== "DST");
  return { team: qb.team, mates, bringBack: bb ? `${bb.name} (${bb.pos}, ${bb.team})` : null };
}

function check(lu: Lineup, label: string): void {
  const issues = validateLineup(lu, baseOpts, slate);
  if (issues.length) throw new Error(`${label} FAILED validation: ${JSON.stringify(issues, null, 2)}`);
}

type RuleStats = {
  total: number;
  doubleBefore: number; doubleAfter: number;
  teFlexBefore: number; teFlexAfter: number;
  repaired: number; thinFallback: number; degenerateKeep: number;
};
const ruleStats: RuleStats = {
  total: 0, doubleBefore: 0, doubleAfter: 0,
  teFlexBefore: 0, teFlexAfter: 0,
  repaired: 0, thinFallback: 0, degenerateKeep: 0,
};

/**
 * Apply GPP/leverage construction rules to engine output, then validate,
 * dedupe (repair can converge two lineups), and recompute exposure.
 */
function finalizeBatch(
  label: string, mode: "gpp" | "leverage", raw: Lineup[],
): {
  lineups: Lineup[];
  applied: AppliedRules[];
  exposure: { id: string; name: string; pos: DfsPos; count: number; pct: number }[];
} {
  const seen = new Set<string>();
  const lineups: Lineup[] = [];
  const applied: AppliedRules[] = [];
  for (const lu of raw) {
    ruleStats.total++;
    if (isDoubleStacked(lu)) ruleStats.doubleBefore++;
    if (hasTeFlex(lu)) ruleStats.teFlexBefore++;
    const ar = applyConstructionRules(lu, slate, baseOpts, mode);
    if (ar.doubleStacked) ruleStats.doubleAfter++;
    if (ar.teFlex) ruleStats.teFlexAfter++;
    if (ar.notes.length) ruleStats.repaired++;
    if (ar.thinTeamFallback) ruleStats.thinFallback++;
    if (ar.degenerateTeFlexKeep) ruleStats.degenerateKeep++;
    const key = ar.lineup.map((p) => p.id).sort().join(",");
    if (seen.has(key)) continue; // repair converged two lineups; keep first
    seen.add(key);
    lineups.push(ar.lineup);
    applied.push(ar);
  }
  lineups.forEach((l, i) => check(l, `${label}[${i}]`));
  const usage = new Map<string, number>();
  for (const lu of lineups) for (const p of lu) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
  const byId = new Map(slate.map((p) => [p.id, p]));
  const exposure = [...usage.entries()]
    .map(([id, c]) => {
      const p = byId.get(id)!;
      return { id, name: p.name, pos: p.pos, count: c, pct: Math.round((c / Math.max(1, lineups.length)) * 100) };
    })
    .sort((a, b) => b.count - a.count);
  return { lineups, applied, exposure };
}

console.log("Run 1: optimizeOne (gpp, stack) — single best…");
const t0 = Date.now();
const bestRaw = optimizeOne(baseOpts, () => 0, 60, slate, 400_000);
console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (!bestRaw) throw new Error("optimizeOne returned null — no feasible lineup (this should not happen)");
const bestF = finalizeBatch("single-best", "gpp", [bestRaw]);
const best = bestF.lineups[0]!;
const bestApplied = bestF.applied[0]!;

console.log("Run 2: generateLineups gpp ×20…");
const t1 = Date.now();
const gppRaw = generateLineups({ ...baseOpts, mode: "gpp" }, 20, 0.6, slate);
console.log(`  done in ${((Date.now() - t1) / 1000).toFixed(1)}s — ${gppRaw.lineups.length}/${gppRaw.requested} (partial=${gppRaw.partial})`);
if (!gppRaw.lineups.length) throw new Error("generateLineups gpp returned zero lineups");
const gppF = finalizeBatch("gpp", "gpp", gppRaw.lineups.map((l) => l.players));

console.log("Run 3: generateLineups leverage ×20…");
const t2 = Date.now();
const levRaw = generateLineups({ ...baseOpts, mode: "leverage" }, 20, 0.6, slate);
console.log(`  done in ${((Date.now() - t2) / 1000).toFixed(1)}s — ${levRaw.lineups.length}/${levRaw.requested} (partial=${levRaw.partial})`);
if (!levRaw.lineups.length) throw new Error("generateLineups leverage returned zero lineups");
const levF = finalizeBatch("lev", "leverage", levRaw.lineups.map((l) => l.players));

console.log(
  `Rules v2: double-stack ${ruleStats.doubleBefore}/${ruleStats.total} → ${ruleStats.doubleAfter}/${ruleStats.total}; ` +
  `TE-FLEX ${ruleStats.teFlexBefore}/${ruleStats.total} → ${ruleStats.teFlexAfter}/${ruleStats.total}; ` +
  `repaired ${ruleStats.repaired}; thin-fallbacks ${ruleStats.thinFallback}; degenerate-keeps ${ruleStats.degenerateKeep}`,
);

// ---------------------------------------------------------------------------
// 6. Outputs
// ---------------------------------------------------------------------------
type OutLineup = {
  label: string; mode: string;
  salary: number; proj: number; ceiling: number; totalOwnProxyPts: number;
  leverageScore: number; stackTeam: string | null; stackMates: string[]; bringBack: string | null;
  stackMateCount: number; doubleStacked: boolean; teFlex: boolean; ruleNotes: string[];
  valid: true;
  players: { slot: string; name: string; pos: DfsPos; team: string; opp: string; salary: number; proj: number; ceiling: number; ownProxy: number }[];
};
function toOut(label: string, mode: string, lu: Lineup, ar: AppliedRules): OutLineup {
  const m = metrics(lu);
  const st = describeStack(lu);
  return {
    label, mode,
    salary: m.salary, proj: m.proj, ceiling: m.ceiling,
    totalOwnProxyPts: m.totalOwn, leverageScore: m.leverageScore,
    stackTeam: st.team, stackMates: st.mates, bringBack: st.bringBack,
    stackMateCount: stackMateCount(lu),
    doubleStacked: ar.doubleStacked, teFlex: ar.teFlex, ruleNotes: ar.notes,
    valid: true,
    players: lu.map((p, i) => ({
      slot: String(DFS_SLOTS[i]), name: p.name, pos: p.pos, team: p.team, opp: p.opp,
      salary: p.salary, proj: p.proj, ceiling: p.ceiling, ownProxy: p.own,
    })),
  };
}
const out = {
  generatedAt: new Date().toISOString(),
  slateSize: slate.length,
  excludedCount: excluded.length,
  salaryCap: SALARY_CAP,
  note: "All ownership values are PROXY (no public Sun–Mon ownership exists). See PROVENANCE.md.",
  constructionRules: {
    version: "v2 (harness-applied post-hoc repair; see construction-rules.ts)",
    doubleStack: { before: ruleStats.doubleBefore, after: ruleStats.doubleAfter, total: ruleStats.total },
    teFlex: { before: ruleStats.teFlexBefore, after: ruleStats.teFlexAfter, total: ruleStats.total },
    repairedLineups: ruleStats.repaired,
    thinTeamFallbacks: ruleStats.thinFallback,
    degenerateTeFlexKeeps: ruleStats.degenerateKeep,
    enginePatch: "engine-patch-double-stack-te-flex.patch (for the coding agent to apply to the real engine)",
  },
  singleBest: toOut("single-best", "gpp", best, bestApplied),
  gppLineups: gppF.lineups.map((l, i) => toOut(`gpp-${i + 1}`, "gpp", l, gppF.applied[i]!)),
  leverageLineups: levF.lineups.map((l, i) => toOut(`lev-${i + 1}`, "leverage", l, levF.applied[i]!)),
  exposure: {
    gpp: gppF.exposure.slice(0, 25),
    leverage: levF.exposure.slice(0, 25),
  },
  excluded,
};
fs.writeFileSync(path.join(HERE, "lineups.json"), JSON.stringify(out, null, 2));
console.log("wrote lineups.json");

// Markdown report
const L: string[] = [];
L.push(`# Week 3 DK Sun–Mon Optimizer Run — ${new Date().toISOString().slice(0, 10)}`);
L.push(``);
L.push(`> LOCAL ONLY — never committed, published, or entered. All ownership = PROXY (no public Sun–Mon ownership exists). Full methodology: PROVENANCE.md.`);
L.push(``);
L.push(`- Slate: **${slate.length}** eligible players (767 DK rows − ${excluded.length} injury/status exclusions)`);
L.push(`- Engine: Garrett's real \`dfs-optimizer.ts\` — \`optimizeOne\` (exact) + \`generateLineups\` (gpp ×${gppRaw.lineups.length}, leverage ×${levRaw.lineups.length}, 60% max exposure, stacking ON)`);
L.push(`- Construction rules v2 (harness-applied, GPP/leverage only — \`construction-rules.ts\`): double-stack (QB + ≥2 same-team WR/TE/RB) enforced via objective-ordered repair; TE excluded from FLEX via repair. Thin QB teams fall back to single stack; degenerate TE-FLEX keeps are flagged.`);
L.push(`- Before → after (engine output, ${ruleStats.total} lineups): double-stack **${ruleStats.doubleBefore} → ${ruleStats.doubleAfter}**; TE-in-FLEX **${ruleStats.teFlexBefore} → ${ruleStats.teFlexAfter}**; repaired ${ruleStats.repaired}; thin-team fallbacks ${ruleStats.thinFallback}; degenerate TE-FLEX keeps ${ruleStats.degenerateKeep}.`);
L.push(`- Final portfolio after repair+dedup: **${gppF.lineups.length}** gpp + **${levF.lineups.length}** leverage + 1 single-best.`);
L.push(`- Validation: every final lineup passed \`validateLineup\` (9-man, positional slots, ≤$${SALARY_CAP.toLocaleString()}, no dupes/excludes, stack satisfied)`);
L.push(``);
const fmtLu = (o: OutLineup) => {
  const rows = o.players.map((p) => `| ${p.slot} | ${p.name} | ${p.team} vs ${p.opp} | $${p.salary.toLocaleString()} | ${p.proj} | ${p.ceiling} | ${(p.ownProxy * 100).toFixed(1)}% |`).join("\n");
  return [
    `## ${o.label} (${o.mode})`,
    ``,
    `- Salary: **$${o.salary.toLocaleString()}** (left $${(SALARY_CAP - o.salary).toLocaleString()}) · Proj **${o.proj}** · Ceiling **${o.ceiling}** · Proxy own **${o.totalOwnProxyPts}** pts · Leverage ${o.leverageScore}`,
    `- Stack: ${o.stackTeam} — ${o.stackMates.length ? o.stackMates.join(" + ") : "NONE"} (mates=${o.stackMateCount}, double=${o.doubleStacked ? "YES" : "NO"})${o.teFlex ? " · TE-IN-FLEX (degenerate keep)" : ""}${o.bringBack ? ` · Bring-back: ${o.bringBack}` : " · No bring-back"}`,
    ``,
    `| Slot | Player | Game | Salary | Proj | Ceil | Own* |`,
    `|---|---|---|---|---|---|---|`,
    rows,
    ``,
  ].join("\n");
};
L.push(fmtLu(out.singleBest));
for (const o of out.gppLineups) L.push(fmtLu(o));
for (const o of out.leverageLineups) L.push(fmtLu(o));
L.push(`## Exposure (top 25 per batch)`);
L.push(``);
for (const [k, arr] of [["gpp", out.exposure.gpp], ["leverage", out.exposure.leverage]] as const) {
  L.push(`### ${k}`);
  L.push(arr.map((e: { name: string; pos: DfsPos; count: number; pct: number }) => `- ${e.name} (${e.pos}): ${e.count}/${k === "gpp" ? out.gppLineups.length : out.leverageLineups.length} = ${e.pct}%`).join("\n"));
  L.push(``);
}
L.push(`## Exclusions (${excluded.length})`);
L.push(excluded.slice(0, 40).map((e) => `- ${e.name}: ${e.reason}`).join("\n"));
L.push(`…plus ${excluded.length - 40} more in lineups.json`);
L.push(``);
L.push(`*Own = ownership PROXY, not a real projection.`);
fs.writeFileSync(path.join(HERE, "REPORT.md"), L.join("\n"));
console.log("wrote REPORT.md");
console.log("ALL CHECKS PASSED");
