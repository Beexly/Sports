/**
 * THE SPEC'S PROJECTION RULE vs THE MAXIMALLY-CONFOUNDED ONE.
 *
 * The test asserts the spec's rule produces no MORE bidirected edges
 * than the pessimistic representative. That is a weak bound -- it
 * passes when the two agree. What matters is the SIZE of the
 * difference and, more importantly, WHICH edges differ.
 *
 * A bidirected edge is a hedge: it says the direction is not
 * identified, and it makes the ID algorithm fail. So an EXTRA
 * bidirected edge is a FALSE HEDGE, and a false hedge refuses a real
 * effect. The pessimistic representative makes every unresolved edge
 * bidirected, so on a clean chain with no latent confounder it
 * produces hedges the data do not support.
 *
 * This measures both projections on the same data and reports the
 * difference.
 *
 * Reproduce: node reconciliation/_verify_projection_rules.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "proj-"));
const script = join(dir, "probe.ts");

writeFileSync(
  script,
  `
import {
  discoverCausalStructure,
  discoverCausalStructurePessimistic,
} from "${root.replace(/\\/g, "/")}/packages/prediction-engine/src/causal/causal-discovery-pipeline.js";
import { mulberry32 } from "${root.replace(/\\/g, "/")}/packages/prediction-engine/src/causal/__tests__/test-prng.js";

function makeChain(n: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x0 = rand() - 0.5;
    const x1 = 0.8 * x0 + (rand() - 0.5) * 0.4;
    const x2 = 0.7 * x1 + 0.3 * x0 + (rand() - 0.5) * 0.4;
    rows.push([x0, x1, x2]);
  }
  return rows;
}

const data = makeChain(6000, 91);
const spec = discoverCausalStructure(data, { maxConditioningSetSize: 2 });
const pess = discoverCausalStructurePessimistic(data, { maxConditioningSetSize: 2 });

console.log(JSON.stringify({
  pagEdges: spec.pag.edges.length,
  specDirected: spec.admg.directed.map(([u, v]) => u + "->" + v),
  specBidirected: spec.admg.bidirected.map(([u, v]) => u + "<->" + v),
  pessDirected: pess.admg.directed.map(([u, v]) => u + "->" + v),
  pessBidirected: pess.admg.bidirected.map(([u, v]) => u + "<->" + v),
  decisions: spec.decisions.map((d) => ({
    edge: d.u + "-" + d.v,
    kind: d.kind,
    absW: d.absW === undefined ? null : Number(d.absW.toFixed(4)),
    residualZ: d.residualZ === undefined ? null : Number(d.residualZ.toFixed(3)),
    reason: d.reason,
  })),
}, null, 2));
`,
  "utf8",
);

const out = execFileSync("node", [join(root, "node_modules/tsx/dist/cli.mjs"), script], {
  encoding: "utf8",
  cwd: root,
});
const r = JSON.parse(out);

console.log("=== THE PAG ===");
console.log(`  ${r.pagEdges} edges`);

console.log("\n=== THE SPEC'S STAGE 3 (weights + residual covariance) ===");
console.log(`  directed   : ${r.specDirected.length ? r.specDirected.join(", ") : "(none)"}`);
console.log(`  bidirected : ${r.specBidirected.length ? r.specBidirected.join(", ") : "(none)"}`);

console.log("\n=== THE MAXIMALLY-CONFOUNDED REPRESENTATIVE ===");
console.log(`  directed   : ${r.pessDirected.length ? r.pessDirected.join(", ") : "(none)"}`);
console.log(`  bidirected : ${r.pessBidirected.length ? r.pessBidirected.join(", ") : "(none)"}`);

console.log("\n=== EVERY DECISION, WITH ITS REASON ===");
for (const d of r.decisions) {
  console.log(`  ${d.edge}  ${d.kind.padEnd(11)} |W|=${String(d.absW).padStart(8)}  |z|=${String(d.residualZ).padStart(8)}`);
  console.log(`      ${d.reason}`);
}

const specBi = r.specBidirected.length;
const pessBi = r.pessBidirected.length;
console.log(`\nVERDICT: spec bidirected ${specBi}, pessimistic bidirected ${pessBi}`);
if (pessBi > specBi) {
  console.log(`  the pessimistic rule adds ${pessBi - specBi} hedge(s) the data do not support`);
  console.log(`  each one is a FALSE HEDGE: it refuses an effect the data identify`);
} else if (pessBi === specBi) {
  console.log("  the two rules agree on this data -- the difference is not demonstrated here");
} else {
  console.log("  UNEXPECTED: the spec's rule produced MORE bidirected edges than the pessimistic one");
  process.exit(1);
}
