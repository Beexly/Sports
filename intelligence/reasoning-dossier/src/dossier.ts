// Dossier assembly + rendering. The markdown is rendered FROM the JSON twin
// so the two can never drift. The pipeline (not the model) owns the
// non-claims section, the provenance block, and inputs_not_relied_on.

import type { AnalystClient } from "./analyst.ts";
import { FenceError, findBannedKeys, STANDING_NON_CLAIMS, validateDossier } from "./fence.ts";
import { buildPrompt } from "./prompt.ts";
import {
  SECTION_IDS,
  type Claim,
  type Dossier,
  type DossierSections,
  type InputManifest,
  type Usage,
} from "./types.ts";

export const PIPELINE_ID = "reasoning-dossier";
export const PIPELINE_VERSION = "0.1.0";

type ModelSections = Omit<DossierSections, "non_claims">;

function parseModelSections(text: string): ModelSections {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const banned = findBannedKeys(parsed);
  if (banned.length > 0) {
    throw new FenceError(`analyst output failed the fence:\n- ${banned.join("\n- ")}`);
  }
  const out = {} as ModelSections;
  for (const id of SECTION_IDS) {
    if (id === "non_claims") continue;
    const claims = parsed[id];
    if (!Array.isArray(claims)) throw new Error(`analyst output is missing section "${id}"`);
    out[id] = claims.map((c) => {
      const claim = c as Claim;
      if (typeof claim.text !== "string" || !Array.isArray(claim.cites)) {
        throw new Error(`analyst claim in section "${id}" is malformed (needs text + cites[])`);
      }
      return { text: claim.text, cites: claim.cites.map(String) };
    });
  }
  return out;
}

function assemble(
  manifest: InputManifest,
  title: string,
  modelSections: ModelSections,
  provenance: Dossier["provenance"],
): Dossier {
  const gameEntryId = `game:${manifest.game_key}`;
  const sections: DossierSections = {
    ...modelSections,
    non_claims: STANDING_NON_CLAIMS.map((text) => ({ text, cites: [gameEntryId] })),
  };
  const cited = new Set<string>();
  for (const id of SECTION_IDS) for (const claim of sections[id]) claim.cites.forEach((c) => cited.add(c));
  const inputs_not_relied_on = manifest.entries
    .filter((e) => (e.kind === "fact" || e.kind === "shadow") && !cited.has(e.id))
    .map((e) => ({
      id: e.id,
      reason:
        e.kind === "shadow"
          ? "shadow lane returned no usable read for this game, or the analyst did not rely on it"
          : "present in the manifest but not relied on by any claim",
    }));
  const dossier: Dossier = {
    game_key: manifest.game_key,
    title,
    emission: "ZERO_OBJECT",
    sections,
    inputs_not_relied_on,
    provenance,
  };
  validateDossier(dossier, manifest);
  return dossier;
}

export async function generateDossier(
  manifest: InputManifest,
  title: string,
  client: AnalystClient,
  now: Date = new Date(),
): Promise<Dossier> {
  const prompt = buildPrompt(manifest);
  const response = await client.complete({ system: prompt.system, user: prompt.user });
  const sections = parseModelSections(response.text);
  return assemble(manifest, title, sections, {
    pipeline: PIPELINE_ID,
    pipeline_version: PIPELINE_VERSION,
    mode: "live-model",
    model_id: response.model_id,
    model_provider: "nous-portal",
    generated_at: now.toISOString(),
    prompt_sha256: prompt.sha256,
    input_manifest_sha256: manifest.sha256,
    usage: response.usage,
  });
}

/** Assemble a dossier from a raw analyst response captured out-of-band
 *  (e.g. through the Nous connector helper). Identical fence + provenance. */
export function dossierFromResponse(
  manifest: InputManifest,
  title: string,
  responseText: string,
  modelId: string,
  usage: Usage | null,
  now: Date = new Date(),
): Dossier {
  const prompt = buildPrompt(manifest);
  const sections = parseModelSections(responseText);
  return assemble(manifest, title, sections, {
    pipeline: PIPELINE_ID,
    pipeline_version: PIPELINE_VERSION,
    mode: "live-model",
    model_id: modelId,
    model_provider: "nous-portal",
    generated_at: now.toISOString(),
    prompt_sha256: prompt.sha256,
    input_manifest_sha256: manifest.sha256,
    usage,
  });
}

/** Deterministic fallback: sections derived mechanically from the manifest's
 *  template applications and honest empties. Marked PROVENANCE:
 *  template-filled — no live analyst call ran, and the dossier says so. */
export function templateFilledDossier(manifest: InputManifest, title: string, now: Date = new Date()): Dossier {
  const gameEntryId = `game:${manifest.game_key}`;
  const line = manifest.entries.find((e) => e.id === "line:archived");
  const templates = manifest.entries.filter((e) => e.kind === "template");
  const applied = templates.filter((t) => (t.payload as { status: string }).status !== "NO_INPUT");
  const noInput = templates.filter((t) => (t.payload as { status: string }).status === "NO_INPUT");
  const sections: ModelSections = {
    situation: [
      ...(line
        ? [
            {
              text: `The market's starting point, cited as-is: ${line.label}. This dossier reasons about the game from that point; it does not move it.`,
              cites: [line.id],
            },
          ]
        : []),
      ...applied.map((t) => ({
        text: `Template applied — ${t.label}: ${(t.payload as { guidance: string }).guidance}`,
        cites: [t.id, gameEntryId],
      })),
    ],
    personnel: manifest.entries
      .filter((e) => e.kind === "fact")
      .map((e) => ({ text: `Stamped input on record: ${e.label} (${e.source_ref}).`, cites: [e.id] })),
    context_intangibles: noInput.map((t) => ({
      text: `No input for ${t.label}: the template's input contract is unmet, so nothing is claimed through it.`,
      cites: [t.id],
    })),
    market_may_not_read: [
      {
        text: "Template-filled fallback: no analyst read was generated, so no market-tension read is offered. The gaps below are the whole content of this section.",
        cites: [gameEntryId],
      },
    ],
    what_would_change: manifest.honest_empty.map((he) => ({
      text: `${he.subject}: missing ${he.missing.join(", ")} — ${he.reason}. Supplying it would change what can be said here.`,
      cites: [gameEntryId],
    })),
  };
  return assemble(manifest, title, sections, {
    pipeline: PIPELINE_ID,
    pipeline_version: PIPELINE_VERSION,
    mode: "template-filled",
    model_id: null,
    model_provider: null,
    generated_at: now.toISOString(),
    prompt_sha256: null,
    input_manifest_sha256: manifest.sha256,
    usage: null,
  });
}

const SECTION_TITLES: Record<string, string> = {
  situation: "Situation",
  personnel: "Personnel",
  context_intangibles: "Context & intangibles",
  market_may_not_read: "What the market may not be reading",
  what_would_change: "What would change the read",
  non_claims: "Non-claims",
};

export function renderMarkdown(dossier: Dossier, manifest: InputManifest): string {
  const p = dossier.provenance;
  const lines: string[] = [];
  lines.push(`# Reasoning dossier — ${dossier.title}`);
  lines.push("");
  lines.push(`- Game key: \`${dossier.game_key}\` · Kickoff: ${manifest.kickoff}`);
  lines.push(`- Emission: **ZERO_OBJECT** · RVC: NOT_CLEARED · is_pick: false`);
  lines.push(
    p.mode === "live-model"
      ? `- PROVENANCE: live-model · model \`${p.model_id}\` via ${p.model_provider} · generated ${p.generated_at}`
      : `- PROVENANCE: template-filled (no live analyst call) · generated ${p.generated_at}`,
  );
  lines.push(`- Input manifest sha256: \`${p.input_manifest_sha256}\``);
  if (p.prompt_sha256) lines.push(`- Prompt sha256: \`${p.prompt_sha256}\``);
  if (p.usage) {
    lines.push(
      `- Analyst usage: ${p.usage.total_tokens ?? "?"} tokens` +
        (p.usage.cost_usd !== undefined ? ` · cost $${p.usage.cost_usd.toFixed(5)}` : ""),
    );
  }
  lines.push("");
  for (const id of SECTION_IDS) {
    lines.push(`## ${SECTION_TITLES[id]}`);
    lines.push("");
    for (const claim of dossier.sections[id]) {
      lines.push(`- ${claim.text} _[cites: ${claim.cites.join(", ")}]_`);
    }
    lines.push("");
  }
  if (dossier.inputs_not_relied_on.length > 0) {
    lines.push("## Inputs not relied on");
    lines.push("");
    for (const u of dossier.inputs_not_relied_on) lines.push(`- \`${u.id}\` — ${u.reason}`);
    lines.push("");
  }
  lines.push("## Honest empties (inputs the manifest could not supply)");
  lines.push("");
  for (const he of manifest.honest_empty) {
    lines.push(`- **${he.subject}** — missing: ${he.missing.join(", ")}. ${he.reason}`);
  }
  lines.push("");
  return lines.join("\n");
}
