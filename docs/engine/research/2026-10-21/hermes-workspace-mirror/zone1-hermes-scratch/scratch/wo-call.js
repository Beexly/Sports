#!/usr/bin/env node
// Reusable WebOperator bridge caller.
//   node wo-call.js browser_snapshot
//   node wo-call.js browser_navigate '{"url":"https://example.com"}'
//   node wo-call.js browser_extract '{"instruction":"..."}'
// Talks MCP stdio -> bridge HTTP -> live Chrome extension.
const { spawn } = require('child_process');

const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const SERVER = 'C:\\Users\\Garrett\\WebOperator\\weboperator-bridge\\mcp-server.js';

const name = process.argv[2];
const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const TIMEOUT = Number(process.argv[4] || 60000);

if (!name) {
  console.error('usage: node wo-call.js <tool_name> [args_json] [timeout_ms]');
  process.exit(2);
}

const child = spawn(NODE, [SERVER], {
  env: { ...process.env, WEBOPERATOR_BRIDGE_HOST: '127.0.0.1', WEBOPERATOR_BRIDGE_PORT: '8765' },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
let done = false;
const finish = (code) => { if (!done) { done = true; child.kill(); process.exit(code); } };

child.stdout.on('data', (c) => {
  buf += c.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    if (m.id !== 2) continue;
    if (m.result?.isError) {
      const t = (m.result.content || []).map((x) => x.text || '').join('');
      console.error('TOOL_ERROR: ' + t.slice(0, 500));
      finish(1);
    }
    const text = (m.result?.content || []).map((x) => x.text || '').join('');
    process.stdout.write(text);
    finish(0);
  }
});
child.stderr.on('data', (c) => process.stderr.write('[srv] ' + c));

const t0 = Date.now();
while (!done && Date.now() - t0 < TIMEOUT) { spawn; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); }

// write requests after the wait loop is entered synchronously
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'wo-call', version: '1' } } }) + '\n');
setTimeout(() => {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }) + '\n');
}, 300);
