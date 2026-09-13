// Repoint node_modules/@sports/* junctions to this worktree's own packages.
// Root cause: the links pointed at the primary checkout C:/Users/Garrett/Sports,
// whose data-ingestion registry lacks espn-public-api.
const fs = require('fs');
const path = require('path');

const root = 'C:/Users/Garrett/Sports-live';
const scopeDir = path.join(root, 'node_modules/@sports');

// The 23 workspace packages/apps to link (mirrors `workspaces` in package.json):
const names = [
  'ai-council', 'compliance', 'crypto', 'data-ingestion', 'db', 'epistemic-twin',
  'feature-store', 'genesis-kernel', 'governed', 'ingestion-pipeline', 'ops',
  'partner-stack', 'phase-c', 'prediction-engine', 'quote-plane', 'stats-api',
  'types', 'util', 'web', 'worker-airwave-listener', 'worker-content-publishing',
  'worker-data-refresh', 'worker-pick-generation',
];

if (!fs.existsSync(scopeDir)) fs.mkdirSync(scopeDir, { recursive: true });

for (const name of names) {
  let rel;
  if (name === 'web') rel = 'apps/web';
  else if (name.startsWith('worker-')) rel = 'workers/' + name.slice('worker-'.length);
  else rel = 'packages/' + name;
  const target = path.join(root, rel);
  const link = path.join(scopeDir, name);
  if (!fs.existsSync(target)) {
    console.log('MISSING TARGET: ' + name + ' -> ' + rel);
    continue;
  }
  // Remove whatever is there now (broken junction / real dir / stale link).
  try {
    const st = fs.lstatSync(link);
    if (st.isSymbolicLink()) fs.unlinkSync(link);
    else if (st.isDirectory()) fs.rmSync(link, { recursive: true, force: true });
    else fs.unlinkSync(link);
  } catch (e) {
    if (e.code !== 'ENOENT') console.log('CLEANUP-FAIL ' + name + ': ' + e.message);
  }
  try {
    fs.symlinkSync(target, link, 'junction');
    // Verify it resolves:
    const ok = fs.existsSync(link);
    console.log((ok ? 'OK  ' : 'BROKEN ') + name + ' -> ' + rel);
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

// Final count + sample verify:
const entries = fs.readdirSync(scopeDir);
console.log('linked count:', entries.length);
console.log('data-ingestion resolves src/source-registry.ts:',
  fs.existsSync(path.join(scopeDir, 'data-ingestion/src/source-registry.ts')));