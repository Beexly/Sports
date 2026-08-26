/** Falsifier sweep — four signals over real NGS harness (prior-season → next-season). */
import * as fs from 'fs';
import { falsifyBind, type BacktestRow } from '../falsify.js';

type HarnessRow = { playerId: string; week: number; season: number; yacAboveExpected: number | null; avgExpectedYac: number | null; avgSeparation: number; targets: number };

const raw: HarnessRow[] = JSON.parse(fs.readFileSync('C:/Users/Garrett/Sports/data/nflverse/ngs_receiving_2021_2025_harness_rows.json', 'utf8'));

// Aggregate per player-season with targets >=20
const agg = new Map<string, Map<number, { sumYac: number; n: number; sumSep: number; sumExpYac: number; targets: number }>>();
for (const r of raw) {
  const p = agg.get(r.playerId) ?? new Map(); agg.set(r.playerId, p);
  if (!p.has(r.season)) p.set(r.season, { sumYac: 0, n: 0, sumSep: 0, sumExpYac: 0, targets: 0 });
  const s = p.get(r.season)!;
  s.sumYac += (r.yacAboveExpected ?? 0);
  s.n += 1;
  s.sumSep += r.avgSeparation;
  s.sumExpYac += (r.avgExpectedYac ?? 0);
  s.targets += r.targets;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)] ?? 0;
}

// Build season-level medians from players with targets >=20
const seasonValues = new Map<number, { yac: number[]; sep: number[]; expYac: number[]; targets: number[] }>();
for (const [pid, seasons] of agg) {
  for (const [season, s] of seasons) {
    if (s.targets < 20) continue;
    const y = s.sumYac / s.n; const sep = s.sumSep / s.n; const exp = s.sumExpYac / s.n;
    if (!seasonValues.has(season)) seasonValues.set(season, { yac: [], sep: [], expYac: [], targets: [] });
    const sv = seasonValues.get(season)!;
    sv.yac.push(y); sv.sep.push(sep); sv.expYac.push(exp); sv.targets.push(s.targets);
  }
}
const medians = new Map<number, { yac: number; sep: number; expYac: number; targets: number }>();
for (const [season, sv] of seasonValues) {
  medians.set(season, { yac: median(sv.yac), sep: median(sv.sep), expYac: median(sv.expYac), targets: median(sv.targets) });
}

function buildBind(name: string, getPrior: (s: { sumSep: number; n: number; sumExpYac: number; targets: number }) => number, getOutcome: (s: { sumSep: number; n: number; sumExpYac: number; targets: number }, med: number) => number, medKey: 'yac' | 'sep' | 'expYac' | 'targets'): { name: string; rows: BacktestRow[] } {
  const rows: BacktestRow[] = [];
  for (const [pid, seasons] of agg) {
    const list = [...seasons.keys()].sort((a,b)=>a-b);
    for (let i=0; i<list.length-1; i++) {
      const prev = list[i]!; const next = list[i+1]!;
      const prevS = seasons.get(prev)!; const nextS = seasons.get(next)!;
      if (prevS.targets < 20 || nextS.targets < 20 || prevS.n < 5 || nextS.n < 5) continue;
      if (next !== prev+1) continue;
      const priorVal = getPrior(prevS);
      const nextVal = getPrior(nextS);
      const med = medians.get(next)?.[medKey] ?? 0;
      const outcome = getOutcome(nextS, med);
      // Normalize signal to [0.01, 0.99] for modelProb
      const z = (priorVal - med) / Math.max(Math.abs(priorVal - med), 0.1);
      const modelProb = Math.max(0.01, Math.min(0.99, 0.5 + 0.45 * Math.tanh(z)));
      rows.push({ season: next, knownAtWeek: (prev-2020)*18, outcomeWeek: (next-2020)*18+1, outcome, modelProb, marketProb: 0.5 });
    }
  }
  return { name, rows };
}

const binds = [
  buildBind('avgSeparation→next-season avgSeparation', s=>s.sumSep/s.n, (s,med)=>s.sumSep/s.n > med ? 1 : 0, 'sep'),
  buildBind('avgExpectedYac→next-season avgExpectedYac', s=>s.sumExpYac/s.n, (s,med)=>s.sumExpYac/s.n > med ? 1 : 0, 'expYac'),
  buildBind('targets volume→next-season targets', s=>s.targets, (s,med)=>s.targets > med ? 1 : 0, 'targets'),
];

console.log('=== FALSIFIER SWEEP ===');
for (const b of binds) {
  console.log(`\n--- ${b.name}: n=${b.rows.length} ---`);
  const out = falsifyBind(b.rows, { minN: 100, seed: 42 });
  console.log('leakage:', out.leakage.verdict, '|', out.leakage.detail);
  console.log('shuffle:', out.shuffle.verdict, '|', out.shuffle.detail);
  console.log('split:', out.split.verdict, '|', out.split.detail);
  console.log('multiplicity:', out.multiplicity.verdict, '|', out.multiplicity.detail);
  console.log('OVERALL:', out.overall.verdict, '|', out.overall.reason);
}

// Combined z-score→next-season YACoe (if cheap)
console.log(`\n--- combined z-score→next-season YACoe ---`);
// Compute z-scores per season across players (targets>=20)
const zRows: BacktestRow[] = [];
for (const [pid, seasons] of agg) {
  const list = [...seasons.keys()].sort((a,b)=>a-b);
  for (let i=0; i<list.length-1; i++) {
    const prev = list[i]!; const next = list[i+1]!;
    const prevS = seasons.get(prev)!; const nextS = seasons.get(next)!;
    if (prevS.targets < 20 || nextS.targets < 20 || prevS.n < 5 || nextS.n < 5) continue;
    if (next !== prev+1) continue;
    // Combined z across separation, expectedYac, targets (prior vs season mean/std)
    const seasonVals = seasonValues.get(prev);
    if (!seasonVals) continue;
    const meanSep = seasonVals.sep.reduce((a,b)=>a+b,0)/seasonVals.sep.length || 1;
    const stdSep = Math.sqrt(seasonVals.sep.reduce((a,b)=>a+(b-meanSep)**2,0)/Math.max(seasonVals.sep.length-1,1)) || 1;
    const meanExp = seasonVals.expYac.reduce((a,b)=>a+b,0)/seasonVals.expYac.length || 1;
    const stdExp = Math.sqrt(seasonVals.expYac.reduce((a,b)=>a+(b-meanExp)**2,0)/Math.max(seasonVals.expYac.length-1,1)) || 1;
    const meanTg = seasonVals.targets.reduce((a,b)=>a+b,0)/seasonVals.targets.length || 1;
    const stdTg = Math.sqrt(seasonVals.targets.reduce((a,b)=>a+(b-meanTg)**2,0)/Math.max(seasonVals.targets.length-1,1)) || 1;
    const sepZ = (prevS.sumSep/prevS.n - meanSep)/stdSep;
    const expZ = (prevS.sumExpYac/prevS.n - meanExp)/stdExp;
    const tgZ = (prevS.targets - meanTg)/stdTg;
    const combinedZ = (sepZ + expZ + tgZ) / 3;
    const nextMeanYac = nextS.sumYac / nextS.n;
    const seasonYacVals = seasonValues.get(next)?.yac ?? [];
    const seasonYacMed = median(seasonYacVals);
    const modelProb = Math.max(0.01, Math.min(0.99, 0.5 + 0.45*Math.tanh(combinedZ)));
    zRows.push({ season: next, knownAtWeek: (prev-2020)*18, outcomeWeek: (next-2020)*18+1, outcome: nextMeanYac > seasonYacMed ? 1 : 0, modelProb, marketProb: 0.5 });
  }
}
console.log(`combined z-score: n=${zRows.length}`);
if (zRows.length > 0) {
  const out = falsifyBind(zRows, { minN: 100, seed: 42 });
  console.log('leakage:', out.leakage.verdict, '|', out.leakage.detail);
  console.log('shuffle:', out.shuffle.verdict, '|', out.shuffle.detail);
  console.log('split:', out.split.verdict, '|', out.split.detail);
  console.log('multiplicity:', out.multiplicity.verdict, '|', out.multiplicity.detail);
  console.log('OVERALL:', out.overall.verdict, '|', out.overall.reason);
} else {
  console.log('STARVED: n=0 < minN=100');
}
