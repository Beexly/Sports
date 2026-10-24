import fetch from 'node-fetch';

async function verifyAll() {
  console.log('=== VERIFYING LIVE PRODUCTION: https://www.galaxysportsedge.com ===\n');

  // 1. NCAAF picks
  console.log('1. Checking NCAAF picks...');
  const ncaafRes = await fetch('https://www.galaxysportsedge.com/api/picks?sport=NCAAF');
  const ncaafData = await ncaafRes.json();
  const ncaafPicks = ncaafData.data || [];
  console.log(`NCAAF Picks Count: ${ncaafPicks.length}`);
  const ncaafSpreads = ncaafPicks.filter(p => p.pickType === 'SPREAD');
  const ncaafTotals = ncaafPicks.filter(p => p.pickType === 'TOTAL');
  console.log(`- Spreads: ${ncaafSpreads.length}, Totals: ${ncaafTotals.length}`);
  if (ncaafPicks.length > 0) {
    const sample = ncaafPicks[0];
    console.log(`- Sample Pick: ${sample.selection} | Line: ${sample.line} | BookCount: ${sample.bookmakerCount} | Price: ${sample.price}`);
    console.log(`- Confidence: ${sample.confidence} | EdgeScore: ${sample.edgeScore}`);
    console.log(`- Factors: ${sample.factorBreakdown ? Object.keys(sample.factorBreakdown).length : null}`);
    console.log(`- Continuity: ${JSON.stringify(sample.continuityDeltas)}`);
    console.log(`- Injury: ${JSON.stringify(sample.injuryEvidence)}`);
    console.log(`- Reasoning: ${sample.reasoningTrace ? sample.reasoningTrace.slice(0, 80) + '...' : null}`);
  }

  // 2. NFL picks
  console.log('\n2. Checking NFL picks...');
  const nflRes = await fetch('https://www.galaxysportsedge.com/api/picks?sport=NFL');
  const nflData = await nflRes.json();
  const nflPicks = nflData.data || [];
  console.log(`NFL Picks Count: ${nflPicks.length}`);
  const nflSpreads = nflPicks.filter(p => p.pickType === 'SPREAD');
  const nflTotals = nflPicks.filter(p => p.pickType === 'TOTAL');
  console.log(`- Spreads: ${nflSpreads.length}, Totals: ${nflTotals.length}`);
  if (nflPicks.length > 0) {
    const sample = nflPicks[0];
    console.log(`- Sample Pick: ${sample.selection} | Line: ${sample.line} | BookCount: ${sample.bookmakerCount} | Price: ${sample.price}`);
    console.log(`- Confidence: ${sample.confidence} | EdgeScore: ${sample.edgeScore}`);
    console.log(`- Factors: ${sample.factorBreakdown ? Object.keys(sample.factorBreakdown).length : null}`);
    console.log(`- Continuity: ${JSON.stringify(sample.continuityDeltas)}`);
    console.log(`- Injury: ${JSON.stringify(sample.injuryEvidence)}`);
    console.log(`- Reasoning: ${sample.reasoningTrace ? sample.reasoningTrace.slice(0, 80) + '...' : null}`);
  }

  // 3. /picks page HTML
  console.log('\n3. Checking /picks page...');
  const picksHtml = await fetch('https://www.galaxysportsedge.com/picks').then(r => r.text());
  const hasLocked = picksHtml.includes('LockedValue') || picksHtml.includes('unlocks on Pro');
  const hasConfBadge = picksHtml.includes('Conf.') || picksHtml.includes('/100');
  console.log(`- Contains LockedValue / teaser lock copy: ${hasLocked}`);
  console.log(`- Contains Confidence badge / scores: ${hasConfBadge}`);

  // 4. /fantasy/dfs page HTML
  console.log('\n4. Checking /fantasy/dfs page...');
  const dfsHtml = await fetch('https://www.galaxysportsedge.com/fantasy/dfs').then(r => r.text());
  const hasDkClassic = dfsHtml.includes('DraftKings Classic');
  const hasRealSalaries = /\$[0-9],[0-9]{3}/.test(dfsHtml);
  const salaryMatches = dfsHtml.match(/\$[0-9],[0-9]{3}/g) || [];
  console.log(`- Contains DraftKings Classic header: ${hasDkClassic}`);
  console.log(`- Real dollar salaries found: ${hasRealSalaries} (${salaryMatches.slice(0, 5).join(', ')}...)`);
  console.log(`- Contains "Salaries reflect current 2026 NFL Week 7 DraftKings pricing": ${dfsHtml.includes('Salaries reflect current 2026 NFL Week 7 DraftKings pricing')}`);

  // 5. /optimizer page HTML
  console.log('\n5. Checking /optimizer page...');
  const optHtml = await fetch('https://www.galaxysportsedge.com/optimizer').then(r => r.text());
  const hasSampleText = optHtml.includes('Sample players until a licensed projections feed is connected');
  const hasRealText = optHtml.includes('Real active NFL player projections') || optHtml.includes('Live graded pool: real active NFL player projections');
  console.log(`- Contains old sample disclaimer: ${hasSampleText}`);
  console.log(`- Contains real active player projections copy: ${hasRealText}`);

  // 6. /the-beat page HTML
  console.log('\n6. Checking /the-beat page...');
  const beatHtml = await fetch('https://www.galaxysportsedge.com/the-beat').then(r => r.text());
  const hasRobotText = beatHtml.includes('never a robotic voice in your ear');
  const hasNewsroomText = beatHtml.includes('Live newsroom transmission');
  console.log(`- Contains old robotic voice text: ${hasRobotText}`);
  console.log(`- Contains newsroom transmission copy: ${hasNewsroomText}`);

  // 7. Homepage HTML
  console.log('\n7. Checking Homepage...');
  const homeHtml = await fetch('https://www.galaxysportsedge.com/').then(r => r.text());
  const homeSample = homeHtml.includes('Calibration sample building') || homeHtml.includes('Building our graded sample');
  const homeRecord = homeHtml.includes('Settled & Calibrated Record') || homeHtml.includes('Graded against closing market lines') || homeHtml.includes('Every number ships with its record');
  console.log(`- Contains old calibration sample building text: ${homeSample}`);
  console.log(`- Contains Settled & Calibrated Record: ${homeRecord}`);
  console.log(`- Graded picks stat value: ${homeHtml.match(/Graded picks[\s\S]{1,100}?<\/dd>/)?.[0] || 'not matched'}`);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verifyAll().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
