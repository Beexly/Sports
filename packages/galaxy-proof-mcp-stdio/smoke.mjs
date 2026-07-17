// End-to-end MCP stdio smoke test: boot the server, list tools, and prove the
// trustless local verifier returns matches:true for a correctly-formed hash
// and matches:false for a tampered one.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const pickId = "smoke-pick-1";
const payload = "line=-3.5;entryOdds=-110;confidence=62";
const goodHash = sha256(`leaf:${pickId}:${payload}`);
const badHash = sha256("leaf:smoke-pick-1:TAMPERED");

const child = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});

let idc = 0;
function rpc(method, params) {
  const id = ++idc;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

const fail = (m) => { console.error("SMOKE FAIL:", m); child.kill(); process.exit(1); };

const init = await rpc("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "smoke", version: "0" },
});
if (!init.result) fail("initialize returned no result");
notify("notifications/initialized", {});

const tools = await rpc("tools/list", {});
const names = (tools.result?.tools ?? []).map((t) => t.name).sort();
const expected = [
  "audit_record_trustlessly", "get_openapi_contract", "get_record_summary",
  "get_verification_spec", "list_settled_receipts", "verify_receipt_local", "verify_receipt_via_api",
];
if (JSON.stringify(names) !== JSON.stringify(expected)) fail("tool set mismatch: " + names.join(","));

const good = await rpc("tools/call", { name: "verify_receipt_local", arguments: { pickId, payload, contentHash: goodHash } });
const goodBody = JSON.parse(good.result.content[0].text);
if (goodBody.matches !== true) fail("good hash did not verify");

const bad = await rpc("tools/call", { name: "verify_receipt_local", arguments: { pickId, payload, contentHash: badHash } });
const badBody = JSON.parse(bad.result.content[0].text);
if (badBody.matches !== false) fail("tampered hash falsely verified");

console.log("SMOKE PASS:");
console.log("  tools:", names.length, "->", names.join(", "));
console.log("  good hash matches:", goodBody.matches, "(" + goodBody.recomputedHash.slice(0, 16) + "...)");
console.log("  tampered hash matches:", badBody.matches);
child.kill();
process.exit(0);
