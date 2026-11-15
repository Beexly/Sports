import { readFileSync } from "node:fs";
import { verifySeal } from "../../packages/prediction-engine/src/evidence/manifest-hash.js";

const path = "docs/engine/research/2026-11-12/sealed-shadow-WSH-NYG-2026-11-12.json";
const j = JSON.parse(readFileSync(path, "utf8")) as {
  manifest: { hash: string; canonical: string; codeVersion: string; sealedAt: string };
  outputs: { verdict: string; publishable: boolean; posterior: number; marketPrior: number };
  bundle: { jev: { status: string; value?: { contentHash: string; emissionWeight: number; label: string } } };
};

process.stdout.write(`file            ${path}\n`);
process.stdout.write(`manifest hash   ${j.manifest.hash}\n`);
process.stdout.write(`re-derives      ${verifySeal(j.manifest.canonical, j.manifest.hash)}\n`);
process.stdout.write(`codeVersion     ${j.manifest.codeVersion}\n`);
process.stdout.write(`sealedAt        ${j.manifest.sealedAt}\n`);
process.stdout.write(`verdict         ${j.outputs.verdict}\n`);
process.stdout.write(`publishable     ${j.outputs.publishable}\n`);
process.stdout.write(`posterior       ${j.outputs.posterior}\n`);
process.stdout.write(`marketPrior     ${j.outputs.marketPrior}\n`);
process.stdout.write(`jev status      ${j.bundle.jev.status}\n`);
process.stdout.write(`jev contentHash ${j.bundle.jev.value?.contentHash ?? "n/a"}\n`);
process.stdout.write(`jev weight      ${j.bundle.jev.value?.emissionWeight ?? "n/a"}\n`);
process.stdout.write(`jev label       ${j.bundle.jev.value?.label ?? "n/a"}\n`);
