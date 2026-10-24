// Scratch probe: dump raw MCP responses for browser_extract after the fix.
// Not a test. Prints each response so the payload shape is visible.
const { spawn } = require('child_process');

const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const SERVER = 'C:\\Users\\Garrett\\WebOperator\\weboperator-bridge\\mcp-server.js';

const child = spawn(NODE, [SERVER], {
  env: { ...process.env, WEBOPERATOR_BRIDGE_HOST: '127.0.0.1', WEBOPERATOR_BRIDGE_PORT: '8765' },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
child.stdout.on('data', (c) => {
  buf += c.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    if (m.id === 3 || m.id === 4) {
      const t = (m.result?.content || []).map((x) => x.text || '').join('');
      console.log('--- id', m.id, '| isError:', m.result && m.result.isError, '| len:', t.length);
      console.log(t.slice(0, 400));
    }
  }
});
child.stderr.on('data', (c) => process.stderr.write('[srv] ' + c));

const ask = (id, method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
ask(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dbg', version: '1' } });
setTimeout(() => {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  ask(3, 'tools/call', { name: 'browser_extract', arguments: { instruction: 'transcribe pick rows' } });
  ask(4, 'tools/call', { name: 'browser_extract', arguments: { refs: 'visible' } });
}, 500);
setTimeout(() => process.exit(0), 50_000);
