// The fence. A dossier is a reasoning artifact, not a pick surface:
// - No pick / probability / odds keys anywhere in the JSON twin.
// - No pick-language in prose (banned phrases, derived from the discipline of
//   the WO-0 Layer-2 read: "will cover", "edge is", "take the", ...).
// - Shadow data never names its upstream source family; it is internal-only
//   and described only as "tracking shadow data".
// - Every factual claim cites at least one manifest entry, and every cite
//   resolves to a real entry (citation completeness, both directions for
//   claims; inputs the analyst ignored must be declared, not dropped).
// - Provenance is complete: mode, model id (live mode only), manifest hash,
//   generation timestamp.
// - Standing non-claims are always present, verbatim.

import type { Dossier, InputManifest } from "./types.ts";
import { SECTION_IDS } from "./types.ts";

export class FenceError extends Error {}

export const STANDING_NON_CLAIMS: string[] = [
  "This dossier makes no pick and no side.",
  "This dossier states no probability of any outcome.",
  "This dossier sets no price and adjusts no line; the archived line is the market's starting point, cited as-is.",
  "Emission is ZERO_OBJECT: nothing here is a betting object, and RVC remains NOT_CLEARED.",
  "Shadow data is used qualitatively only and is never named by source in any output.",
];

const BANNED_KEYS = new Set([
  "pick",
  "picks",
  "side",
  "winner",
  "probability",
  "probabilities",
  "win_probability",
  "winprobability",
  "odds",
  "price",
  "prices",
  "edge_value",
  "ev",
  "expected_value",
  "confidence",
  "projection",
  "projected_spread",
  "adjusted_line",
  "fair_price",
  "bet",
  "recommendation",
]);

const BANNED_PHRASES: string[] = [
  "will cover",
  "won't cover",
  "wont cover",
  "take the points",
  "lay the points",
  "take denver",
  "take seattle",
  "bet on",
  "bet the",
  "place a bet",
  "best bet",
  "lock of",
  "guaranteed to win",
  "should win",
  "will win tonight",
  "is the pick",
  "our pick",
  "the pick is",
  "probability of winning",
  "win probability",
  "percent chance",
  "% chance",
  "expected value",
  "positive ev",
  "next gen stats",
  "nextgenstats",
  "next-gen stats",
  // Standalone token only: surrounding spaces keep book names like
  // "DraftKings" from false-positiving (checkProse pads the text).
  " ngs ",
];

/** Banned-key scan, exported so the raw analyst output can be fenced at
 *  parse time too — a pick/probability key emitted by the model is a fence
 *  violation to reject loudly, not content to silently strip. */
export function findBannedKeys(value: unknown): string[] {
  const problems: string[] = [];
  walkKeys(value, "$", problems);
  return problems;
}

function walkKeys(value: unknown, path: string, problems: string[]): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkKeys(v, `${path}[${i}]`, problems));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (BANNED_KEYS.has(k.toLowerCase())) {
      problems.push(`banned key "${k}" at ${path}`);
    }
    walkKeys(v, `${path}.${k}`, problems);
  }
}

function checkProse(text: string, where: string, problems: string[]): void {
  const lower = ` ${text.toLowerCase()} `;
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) problems.push(`banned phrase "${phrase.trim()}" in ${where}`);
  }
}

export function validateDossier(dossier: Dossier, manifest: InputManifest): void {
  const problems: string[] = [];

  if (dossier.emission !== "ZERO_OBJECT") problems.push("emission is not ZERO_OBJECT");
  if (dossier.game_key !== manifest.game_key) problems.push("dossier game_key does not match manifest");

  walkKeys(dossier, "$", problems);

  const knownIds = new Set(manifest.entries.map((e) => e.id));
  const citedIds = new Set<string>();

  for (const sectionId of SECTION_IDS) {
    const claims = dossier.sections[sectionId];
    if (!Array.isArray(claims)) {
      problems.push(`section ${sectionId} is missing`);
      continue;
    }
    claims.forEach((claim, i) => {
      const where = `section ${sectionId} claim ${i}`;
      checkProse(claim.text, where, problems);
      if (!claim.cites || claim.cites.length === 0) {
        problems.push(`${where} carries no citation`);
      } else {
        for (const cite of claim.cites) {
          if (!knownIds.has(cite)) problems.push(`${where} cites unknown input "${cite}"`);
          citedIds.add(cite);
        }
      }
    });
  }

  // Every factual input (line / fact / shadow) must be either cited by a
  // claim or explicitly declared as not relied on. Silence is not allowed.
  const declaredUnused = new Set(dossier.inputs_not_relied_on.map((u) => u.id));
  for (const entry of manifest.entries) {
    if (entry.kind === "line" || entry.kind === "fact" || entry.kind === "shadow") {
      if (!citedIds.has(entry.id) && !declaredUnused.has(entry.id)) {
        problems.push(`input ${entry.id} is neither cited nor declared in inputs_not_relied_on`);
      }
    }
    if (declaredUnused.has(entry.id) && citedIds.has(entry.id)) {
      problems.push(`input ${entry.id} is both cited and declared not relied on`);
    }
  }
  for (const unused of dossier.inputs_not_relied_on) {
    if (!knownIds.has(unused.id)) problems.push(`inputs_not_relied_on names unknown input "${unused.id}"`);
    if (!unused.reason) problems.push(`inputs_not_relied_on entry ${unused.id} gives no reason`);
  }

  // Standing non-claims, verbatim.
  const nonClaimTexts = new Set(dossier.sections.non_claims.map((c) => c.text));
  for (const required of STANDING_NON_CLAIMS) {
    if (!nonClaimTexts.has(required)) problems.push(`standing non-claim missing: "${required}"`);
  }

  // Provenance completeness.
  const p = dossier.provenance;
  if (!p) {
    problems.push("provenance block missing");
  } else {
    if (!p.generated_at || Number.isNaN(Date.parse(p.generated_at))) problems.push("provenance.generated_at missing/invalid");
    if (p.input_manifest_sha256 !== manifest.sha256) problems.push("provenance.input_manifest_sha256 does not match manifest");
    if (p.mode === "live-model") {
      if (!p.model_id) problems.push("live-model dossier carries no model_id");
      if (!p.prompt_sha256) problems.push("live-model dossier carries no prompt_sha256");
    }
    if (p.mode === "template-filled" && p.model_id) {
      problems.push("template-filled dossier must not carry a model_id (no live call ran)");
    }
  }

  if (problems.length > 0) {
    throw new FenceError(`dossier failed the fence (${problems.length} problem(s)):\n- ${problems.join("\n- ")}`);
  }
}
