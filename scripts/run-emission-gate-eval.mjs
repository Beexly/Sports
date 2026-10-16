import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fitStackingWeights, runGateArm, runEnsembleArm, runMarketOnlyArm, runPassAllArm, runEdgeThresholdArm, applyFrozenBars } from '../packages/prediction-engine/src/edge-lab/emission-gate-harness.ts';

const inPath = resolve('reports/emission-gate-eval-set-v2.jsonl');
const outPath = resolve('reports/emission-gate-eval-results-2026-10-16.md');
const raw = readFileSync(inPath,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));

// Build HarnessRows
function toHarnessRow(r){
  return {
    rowId: r.rowId,
    gameKey: r.gameKey,
    market: r.market,
    baseSignals: r.baseSignals,
    marketPrior: r.marketPrior,
    outcome: r.outcome,
    units: r.units,
    period: r.period,
    tier: r.tier,
  };
}
const rows = raw.map(toHarnessRow);
console.log(`Loaded ${rows.length} rows. Markets: ${JSON.stringify(rows.reduce((a,r)=>(a[r.market]=(a[r.market]||0)+1,a),{}))}`);

// Split: calibration = earliest 50% by period, test = latest 50%
// For this prod set, use sorted by gameKey/period
const sorted = [...rows].sort((a,b)=> String(a.period).localeCompare(String(b.period)) || String(a.rowId).localeCompare(String(b.rowId)));
const mid = Math.floor(sorted.length/2);
const calibRows = sorted.slice(0, mid);
const testRows = sorted.slice(mid);
console.log(`Calib ${calibRows.length}, Test ${testRows.length}`);

// Fit weights on calib
const weights = fitStackingWeights(calibRows, {splitLabel:'calib-50pct', lambda:1e-3});
console.log(`Weights: ${JSON.stringify(weights.weights)} converged=${weights.converged} iters=${weights.iterations}`);

// Run arms on test block
const gate = runGateArm(testRows, weights, {threshold:0.03, abstainBand:0.01});
const ensemble = runEnsembleArm(testRows, {marketBlend:0.5, edgeThreshold:0});
const marketOnly = runMarketOnlyArm(testRows);
const passAll = runPassAllArm(testRows);
const edgeThr = runEdgeThresholdArm(testRows, 0);

function fmtMetrics(m){
  return `n=${m.n} cov=${(m.coverage*100).toFixed(1)}% meanUnits=${m.meanUnits?.toFixed(4)??'null'} CI=${m.meanUnitsCi95?`[${m.meanUnitsCi95[0].toFixed(4)},${m.meanUnitsCi95[1].toFixed(4)}]`:''} winRate=${m.winRate!=null?(m.winRate*100).toFixed(1)+'%':'null'} brier=${m.brier?.toFixed(4)??'null'} logLoss=${m.logLoss?.toFixed(4)??'null'} ece=${m.ece?.toFixed(4)??'null'} auc=${m.auc?.toFixed(4)??'null'} dup=${(m.duplicationRate*100).toFixed(1)}% falsePass=${m.falsePass?.toFixed(3)??'null'} falseReject=${m.falseReject?.toFixed(3)??'null'}`;
}
for(const arm of [gate, ensemble, marketOnly, passAll, edgeThr]){
  console.log(`\n=== ${arm.arm} ===`);
  console.log(fmtMetrics(arm.metrics));
  if(arm.metrics.reliability) console.log(' reliability:', JSON.stringify(arm.metrics.reliability));
  console.log(' notes:', arm.notes.join('; '));
}

const gateVerdict = applyFrozenBars(gate, marketOnly.metrics, {games: new Set(testRows.map(r=>r.gameKey)).size});
console.log(`\nGATE VERDICT: ${gateVerdict.verdict}`);
for(const l of gateVerdict.lines) console.log(`  ${l.pass===true?'PASS':l.pass===false?'FAIL':'NULL'} ${l.bar}: ${l.measured}`);
for(const k of gateVerdict.kills) console.log(`  KILL: ${k}`);

// Write scorecard
let md = `# Emission Gate Eval — 2026-10-16\n\n> Frozen protocol: jev-emission-gate-eval-protocol-2026-10-16.md\n> Dataset: emission-gate-eval-set-v2.jsonl — ${rows.length} settled prod picks (period ${sorted[0].period}→${sorted[sorted.length-1].period}), split calib ${calibRows.length} / test ${testRows.length} (temporal 50/50).\n> Weights fitted on calib only; scored on test block. PROXY-CLV where noted.\n\n## Arms (test block, n=${testRows.length})\n\n| Arm | n | Cov | MeanUnits | 95%CI | WinRate | Brier | LogLoss | ECE | AUC | Dup | FalsePass | FalseReject |\n|-----|---|-----|-----------|-------|---------|-------|---------|-----|-----|-----|-----------|-------------|\n`;
for(const arm of [gate, ensemble, marketOnly, passAll, edgeThr]){
  const m=arm.metrics;
  const ci=m.meanUnitsCi95?`[${m.meanUnitsCi95[0].toFixed(4)},${m.meanUnitsCi95[1].toFixed(4)}]`:'—';
  md+=`| ${arm.arm} | ${m.n} | ${(m.coverage*100).toFixed(1)}% | ${m.meanUnits?.toFixed(4)??'—'} | ${ci} | ${m.winRate!=null?(m.winRate*100).toFixed(1)+'%':'—'} | ${m.brier?.toFixed(4)??'—'} | ${m.logLoss?.toFixed(4)??'—'} | ${m.ece?.toFixed(4)??'—'} | ${m.auc?.toFixed(4)??'—'} | ${(m.duplicationRate*100).toFixed(1)}% | ${m.falsePass?.toFixed(3)??'—'} | ${m.falseReject?.toFixed(3)??'—'} |\n`;
}
md+=`\n## Weights (harness artifact, calib n=${weights.nRows})\n\n\`\`\`json\n${JSON.stringify(weights,null,2)}\n\`\`\`\n\n## Frozen Bars — Gate Arm\n\n| Bar | Measured | Pass |\n|-----|----------|------|\n`;
for(const l of gateVerdict.lines) md+=`| ${l.bar} | ${l.measured} | ${l.pass===true?'✅':l.pass===false?'❌':'—'} |\n`;
md+=`\n**Verdict: ${gateVerdict.verdict}**\n\n`;
if(gateVerdict.kills.length) md+=`Kills:\n${gateVerdict.kills.map(k=>`- ${k}`).join('\n')}\n\n`;
if(gateVerdict.notes.length) md+=`Notes:\n${gateVerdict.notes.map(n=>`- ${n}`).join('\n')}\n\n`;

for(const arm of [gate, ensemble, marketOnly, passAll, edgeThr]){
  md+=`\n### ${arm.arm} — reliability (${arm.metrics.reliability?.length??0} bins)\n\n`;
  if(arm.metrics.reliability) for(const b of arm.metrics.reliability) md+=`- ${b.bin}: n=${b.n} meanP=${b.meanP.toFixed(3)} winRate=${b.winRate.toFixed(3)} gap=${b.gap.toFixed(3)}\n`;
  md+=`\nNotes: ${arm.notes.join('; ')}\n`;
}

md+=`\n---\n*Generated ${new Date().toISOString()} by hermes on Windows host. No MODEL_VERSION change.*\n`;

// Ensure dir exists
import { mkdirSync as mk } from 'node:fs';
try{ mk(dirname(outPath), {recursive:true}); }catch{}
writeFileSync(outPath, md, 'utf8');
console.log(`\nWrote ${outPath}`);
