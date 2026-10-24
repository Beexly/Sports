import fs from "fs";
import path from "path";
const root = process.cwd();
const base = path.join(root, "docs", "command-center");
const lines = fs.readFileSync(path.join(base, "build-queue", "build-queue.jsonl"), "utf8").trim().split(/\r?\n/);
const ids = new Set();
let dup = 0;
let missingGate = 0;
let missingPromptFile = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  if (ids.has(row.id)) dup++;
  ids.add(row.id);
  if (!row.duplicate_check_status || !row.reason_not_duplicate || !row.relation_to_existing) missingGate++;
  if (!row.claude_prompt_file || !fs.existsSync(path.join(root, row.claude_prompt_file))) missingPromptFile++;
}
function countFiles(dir) {
  let count = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFiles(p);
    else count++;
  }
  return count;
}
console.log(JSON.stringify({
  command_center_files: countFiles(base),
  jsonl_rows: lines.length,
  duplicate_ids: dup,
  missing_duplicate_gate_fields: missingGate,
  missing_prompt_files: missingPromptFile,
  valid: dup === 0 && missingGate === 0 && missingPromptFile === 0
}, null, 2));
