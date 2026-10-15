// CLI for the reasoning-dossier pipeline.
//
//   node src/run.ts --graph <instance.json> --bundle <bundle.json> --out <dir>
//       --prompt-only            print the analyst prompt (no model call)
//       --template-filled        deterministic fallback dossier (no model call)
//       --ingest <response.json> assemble from a captured analyst response:
//                                either the raw sections JSON, or the Nous
//                                connector helper envelope ({status, model,
//                                text|body, usage:{...,cost}})
//       --live                   call the Nous Portal analyst (NOUS_API_KEY)
//
// Dossiers are written only after the fence passes (validateDossier runs
// inside assembly). A failed fence writes nothing.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NousPortalAnalystClient } from "./analyst.ts";
import { dossierFromResponse, generateDossier, renderMarkdown, templateFilledDossier } from "./dossier.ts";
import { buildManifest } from "./inputs.ts";
import { buildPrompt } from "./prompt.ts";
import type { GameBundle, GraphInstance, Usage } from "./types.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const graphPath = arg("graph");
  const bundlePath = arg("bundle");
  const outDir = arg("out") ?? "dossiers";
  if (!graphPath || !bundlePath) {
    throw new Error("usage: run.ts --graph <instance.json> --bundle <bundle.json> --out <dir> [--prompt-only|--template-filled|--ingest <file>|--live]");
  }
  const graph = JSON.parse(readFileSync(graphPath, "utf8")) as GraphInstance;
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as GameBundle;
  const manifest = buildManifest(bundle, graph);

  if (flag("prompt-only")) {
    const prompt = buildPrompt(manifest);
    process.stdout.write(JSON.stringify({ manifest_sha256: manifest.sha256, prompt_sha256: prompt.sha256, system: prompt.system, user: prompt.user }, null, 2));
    process.stdout.write("\n");
    return;
  }

  let dossier;
  if (flag("template-filled")) {
    dossier = templateFilledDossier(manifest, bundle.title);
  } else if (arg("ingest")) {
    const raw = JSON.parse(readFileSync(arg("ingest")!, "utf8")) as Record<string, unknown>;
    let text: string;
    let modelId: string;
    let usage: Usage | null = null;
    const content = typeof raw.text === "string" ? raw.text : typeof raw.content === "string" ? raw.content : undefined;
    if (content !== undefined && typeof raw.model === "string") {
      // Nous connector helper envelope ({model, content|text, usage:{...,cost}}).
      text = content;
      modelId = raw.model;
      const u = raw.usage as Record<string, unknown> | undefined;
      if (u) {
        usage = {
          prompt_tokens: u.prompt_tokens as number | undefined,
          completion_tokens: u.completion_tokens as number | undefined,
          total_tokens: u.total_tokens as number | undefined,
          cost_usd: (u.cost ?? u.cost_usd) as number | undefined,
        };
      }
    } else {
      text = JSON.stringify(raw);
      modelId = arg("model") ?? "unknown";
    }
    dossier = dossierFromResponse(manifest, bundle.title, text, modelId, usage);
  } else if (flag("live")) {
    const model = arg("model") ?? "anthropic/claude-opus-5.5";
    dossier = await generateDossier(manifest, bundle.title, new NousPortalAnalystClient(model));
  } else {
    throw new Error("choose a mode: --prompt-only | --template-filled | --ingest <file> | --live");
  }

  mkdirSync(outDir, { recursive: true });
  const base = join(outDir, bundle.game_key);
  writeFileSync(`${base}.json`, JSON.stringify(dossier, null, 2));
  writeFileSync(`${base}.md`, renderMarkdown(dossier, manifest));
  process.stdout.write(
    `dossier written: ${base}.md + ${base}.json (mode=${dossier.provenance.mode}, model=${dossier.provenance.model_id ?? "none"}, manifest=${manifest.sha256.slice(0, 12)}…)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
