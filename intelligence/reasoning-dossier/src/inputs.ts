// Input assembly + stamp enforcement.
//
// Fail-closed rules (mirroring the situational graph's discipline):
// - The archived line must carry captured_at; an unstamped line is refused.
// - Every fact must carry a parseable stamp at or before kickoff (PIT).
//   Unstamped injury designations are refused — the graph honest-emptied
//   injury_burden for exactly this reason; the dossier bundle instead
//   supplies designations with the stamped report pull they came from.
// - A graph edge must carry as_of unless its source is static reference
//   data (timeless geographic fact), in which case the stamp is "static".
// - Shadow reads are qualitative-only by construction; a shadow read that
//   does not declare qualitative use is refused.

import { createHash } from "node:crypto";
import type {
  GameBundle,
  GraphInstance,
  HonestEmpty,
  InputManifest,
  ManifestEntry,
} from "./types.ts";
import { REASONING_TEMPLATES, type TemplateStatus } from "./templates.ts";

export class StampError extends Error {}

function isIsoInstant(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Canonical JSON (sorted keys) so manifest hashes are stable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

// Source kinds whose facts are fixed reference data, knowable at any time:
// venue geography (venue_static) and the published fixture schedule
// (schedule topology: participation, hosting, week, Thursday state). The
// graph builder stamps anything that depends on games being played (rest
// states, derived composites, authored reads) — those kinds are NOT in this
// set, and an unstamped edge of any other kind is refused.
const STATIC_SOURCE_KINDS = new Set(["venue_static", "schedule"]);

export function buildManifest(bundle: GameBundle, graph: GraphInstance): InputManifest {
  const kickoffMs = Date.parse(bundle.kickoff);
  if (!isIsoInstant(bundle.kickoff)) throw new StampError(`bundle kickoff is not an ISO instant: ${bundle.kickoff}`);
  const entries: ManifestEntry[] = [];
  const honestEmpty: HonestEmpty[] = [];

  entries.push({
    id: `game:${bundle.game_key}`,
    kind: "game",
    label: bundle.title,
    stamp: { at: bundle.kickoff, kind: "as_of", source_ref: "game bundle" },
    source_ref: "game bundle",
    payload: { game_key: bundle.game_key, kickoff: bundle.kickoff },
  });

  // --- Layer 1: the archived line. Respected as the starting point; the
  // dossier reasons about the game, it never re-prices it. ---
  if (!isIsoInstant(bundle.line.captured_at)) {
    throw new StampError("archived line carries no captured_at stamp — refused");
  }
  if (Date.parse(bundle.line.captured_at) > kickoffMs) {
    throw new StampError("archived line was captured after kickoff — refused (PIT)");
  }
  entries.push({
    id: "line:archived",
    kind: "line",
    label: `Archived line (${bundle.line.book}, captured ${bundle.line.captured_at})`,
    stamp: { at: bundle.line.captured_at, kind: "captured_at", source_ref: bundle.line.source_ref },
    source_ref: bundle.line.source_ref,
    payload: { ...bundle.line },
  });

  // --- Situational graph edges ---
  for (const edge of graph.edges) {
    if (edge.game !== bundle.game_key) continue;
    let stamp: ManifestEntry["stamp"];
    if (edge.as_of !== null && edge.as_of !== undefined) {
      if (!isIsoInstant(edge.as_of) && Number.isNaN(Date.parse(edge.as_of))) {
        throw new StampError(`edge ${edge.id} carries an unparseable as_of: ${edge.as_of}`);
      }
      stamp = { at: edge.as_of, kind: "as_of", source_ref: edge.source.ref };
    } else if (STATIC_SOURCE_KINDS.has(edge.source.kind)) {
      stamp = { at: null, kind: "static", source_ref: edge.source.ref };
    } else {
      throw new StampError(
        `edge ${edge.id} (type ${edge.type}) has no as_of stamp and is not static reference data — refused`,
      );
    }
    entries.push({
      id: `edge:${edge.id}`,
      kind: "edge",
      label: `${edge.type}: ${edge.from} -> ${edge.to}`,
      stamp,
      source_ref: edge.source.ref,
      payload: { type: edge.type, from: edge.from, to: edge.to, value: edge.value },
    });
  }
  for (const he of graph.honest_empty) {
    honestEmpty.push({
      subject: `graph edge type ${he.edge_type}${he.team ? ` (${he.team})` : ""}`,
      missing: he.missing,
      reason: he.reason,
    });
  }

  // --- Stamped facts (injuries, weather, schedule, ...) ---
  for (const fact of bundle.facts) {
    if (!isIsoInstant(fact.stamp)) {
      throw new StampError(`fact ${fact.id} carries no valid stamp — refused`);
    }
    if (Date.parse(fact.stamp) > kickoffMs) {
      throw new StampError(`fact ${fact.id} is stamped after kickoff — refused (PIT)`);
    }
    entries.push({
      id: fact.id,
      kind: "fact",
      label: fact.label,
      stamp: { at: fact.stamp, kind: "report", source_ref: fact.source_ref },
      source_ref: fact.source_ref,
      payload: { fact_kind: fact.kind, ...fact.payload },
    });
  }

  // --- Authored reads (Layer 2 judgments, recorded — never generated here) ---
  for (const read of bundle.authored_reads) {
    if (!isIsoInstant(read.stamp)) {
      throw new StampError(`authored read for template ${read.template_id} carries no valid stamp — refused`);
    }
    entries.push({
      id: `read:${read.template_id}`,
      kind: "fact",
      label: `Authored read: ${read.template_id}`,
      stamp: { at: read.stamp, kind: "report", source_ref: read.source_ref },
      source_ref: read.source_ref,
      payload: { template_id: read.template_id, text: read.text, gaps: read.gaps },
    });
  }

  // --- Shadow ledger reads: qualitative only, internal only. ---
  for (const shadow of bundle.shadow_reads) {
    if (!isIsoInstant(shadow.as_of)) {
      throw new StampError(`shadow read ${shadow.id} carries no valid as_of — refused`);
    }
    entries.push({
      id: shadow.id,
      kind: "shadow",
      label: shadow.label,
      stamp: { at: shadow.as_of, kind: "as_of", source_ref: "shadow ledger" },
      source_ref: "shadow ledger",
      qualitative_only: true,
      payload: { status: shadow.status, note: shadow.note },
    });
  }

  // --- Template applications ---
  const hasFactKind = (kind: string) => bundle.facts.some((f) => f.kind === kind);
  const hasRead = (templateId: string) => bundle.authored_reads.some((r) => r.template_id === templateId);
  const hasEdgeType = (type: string) => graph.edges.some((e) => e.type === type && e.game === bundle.game_key);

  for (const template of REASONING_TEMPLATES) {
    const missing: string[] = [];
    for (const need of template.needs) {
      if (need === "weather_fact" && !hasFactKind("weather")) missing.push("stamped weather fact");
      if (need === "schedule_facts" && !hasFactKind("schedule")) missing.push("schedule facts");
      if (need === "injury_facts" && !hasFactKind("injury_designations")) missing.push("stamped injury designations");
      if (need === "authored_read" && !hasRead(template.id)) missing.push(`authored ${template.id} read`);
      if (need === "composite_edge" && !hasEdgeType("altitude_short_week")) missing.push("altitude_short_week graph edge");
    }
    let status: TemplateStatus;
    const gaps: string[] = [];
    if (missing.length > 0) {
      status = "NO_INPUT";
      honestEmpty.push({
        subject: `template ${template.id}`,
        missing,
        reason: "template input contract unmet — recorded as a gap, never filled by invention",
      });
    } else {
      const read = bundle.authored_reads.find((r) => r.template_id === template.id);
      if (read && read.gaps.length > 0) gaps.push(...read.gaps);
      if (template.id === "weather-scale") {
        gaps.push("feature-store residual scale not computed — qualitative surface only");
      }
      status = gaps.length > 0 ? "APPLIED_PARTIAL" : "APPLIED";
    }
    entries.push({
      id: `template:${template.id}`,
      kind: "template",
      label: `Template: ${template.name}`,
      stamp: { at: bundle.as_of_cutoff, kind: "as_of", source_ref: "ingestion ledger (stamped reasoning templates)" },
      source_ref: template.ledger_row,
      payload: { status, gaps, guidance: template.guidance },
    });
  }

  const manifestWithoutHash: Omit<InputManifest, "sha256"> = {
    game_key: bundle.game_key,
    kickoff: bundle.kickoff,
    as_of_cutoff: bundle.as_of_cutoff,
    entries,
    honest_empty: honestEmpty,
  };
  return { ...manifestWithoutHash, sha256: sha256(canonicalJson(manifestWithoutHash)) };
}
