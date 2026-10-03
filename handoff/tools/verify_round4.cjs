const fs = require('fs');
const { execSync } = require('child_process');

function gitLogOneline(hash) {
  try {
    return execSync(`git log --oneline -1 ${hash.slice(0,7)}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch(e) {
    return '';
  }
}

const queue = fs.readFileSync('handoff/SPRINT_QUEUE.md', 'utf8');
const lines = queue.split('\n');

const results = [];

for (const line of lines) {
  const m = line.match(/^(### P[0-9.]+-[0-9A-Za-z]+.*?STATUS: (DONE|BLOCKED|TODO|DOING)).*$/i);
  if (!m) continue;
  const taskLine = line.trim();
  const taskMatch = taskLine.match(/### (P[0-9.]+-[0-9A-Za-z]+)/);
  if (!taskMatch) continue;
  const taskId = taskMatch[1];
  const phaseNum = parseFloat(taskId.split('-')[0].replace('P',''));
  if (phaseNum >= 10 || phaseNum === 9.5) continue;
  
  const status = m[1];
  
  let commit = null;
  let cm = taskLine.match(/\(commit ([0-9a-f]+)/i);
  if (cm) commit = cm[1];
  cm = taskLine.match(/·\s*COMMIT\s+([0-9a-f]+)/i);
  if (cm) commit = cm[1];
  if (!commit) {
    cm = taskLine.match(/\bcommit\s+([0-9a-f]{7,40})\b/i);
    if (cm) commit = cm[1];
  }
  
  results.push({ taskId, status, commit });
}

const verified = [];
const noCommit = [];
const unresolvable = [];

for (const r of results) {
  if (r.status === 'BLOCKED') {
    noCommit.push({ ...r, note: 'BLOCKED (no commit expected)' });
    continue;
  }
  if (!r.commit) {
    noCommit.push({ ...r, note: 'DONE but no commit cited on task line' });
    continue;
  }
  const out = gitLogOneline(r.commit);
  if (out) {
    verified.push({ ...r, resolved: out.split('\n')[0] });
  } else {
    unresolvable.push({ ...r, error: 'does not resolve on branch' });
  }
}

const now = new Date().toISOString();
console.log('=== P10-01 Round 4 — Phase 0-9 DONE task commit-hash verification ===');
console.log('Working dir: C:/Users/Garrett/Sports');
console.log('HEAD: ' + execSync('git rev-parse --short HEAD', {encoding:'utf8'}).trim());
console.log('Date: ' + new Date().toISOString().slice(0,10));
console.log('Total Phase 0-9 task lines parsed: ' + results.length);
console.log('Commit hashes resolved: ' + verified.length);
console.log('No commit (BLOCKED or uncited): ' + noCommit.length);
for (const n of noCommit) console.log('  - ' + n.taskId + ' ' + n.status + ': ' + n.note + (n.commit ? ' (cited: '+n.commit+')' : ''));
console.log('Unresolvable hashes: ' + unresolvable.length);
for (const u of unresolvable) console.log('  - ' + u.taskId + ': ' + u.commit + ' -> ' + u.error);
console.log('');
console.log('=== VERIFIED hashes (taskId -> commit subject) ===');
for (const v of verified) console.log('  ' + v.taskId + ' -> ' + v.commit.slice(0,7) + ' ' + v.resolved);
