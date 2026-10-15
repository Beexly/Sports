// Core types for the GSE reasoning-dossier pipeline (Layer 2 "brain" surface).
//
// A dossier is a stamped reasoning artifact about one game. It reasons about
// the game from stamped inputs; it never emits a pick, a probability, or a
// price. Emission stays ZERO_OBJECT (see fence.ts for the enforcement).
//
// Conventions:
// - Every input the analyst may rely on is a ManifestEntry with a stable id.
//   Claims cite entry ids; the fence rejects uncited or dangling claims.
// - A fact without a stamp is not an input. Stamp enforcement lives in
//   inputs.ts and mirrors the situational graph's fail-closed posture
//   (unstamped injury rows were refused there; they are refused here).

export interface Stamp {
  /** ISO-8601 instant the fact became knowable, or null for static facts. */
  at: string | null;
  kind: "as_of" | "captured_at" | "report" | "static";
  source_ref: string;
}

export type ManifestKind = "game" | "edge" | "line" | "fact" | "shadow" | "template";

export interface ManifestEntry {
  id: string;
  kind: ManifestKind;
  label: string;
  stamp: Stamp | null;
  source_ref: string;
  /** True when the entry may only be used qualitatively (shadow data). */
  qualitative_only?: boolean;
  payload: Record<string, unknown>;
}

export interface HonestEmpty {
  subject: string;
  missing: string[];
  reason: string;
}

export interface InputManifest {
  game_key: string;
  kickoff: string;
  /** Latest instant any input may be stamped at (point-in-time cutoff). */
  as_of_cutoff: string;
  entries: ManifestEntry[];
  honest_empty: HonestEmpty[];
  sha256: string;
}

/** Raw per-game input bundle, as assembled by an operator or an upstream job. */
export interface LineFact {
  book: string;
  favorite: string;
  /** Home-perspective spread (DEN +2.5 for tonight's game => 2.5). */
  spread_home: number;
  spread_price_home: number;
  spread_price_away: number;
  total: number;
  over_price: number;
  under_price: number;
  moneyline_home: number;
  moneyline_away: number;
  captured_at: string;
  source_ref: string;
}

export interface StampedFact {
  id: string;
  kind: string; // e.g. "injury_designations" | "weather" | "schedule"
  label: string;
  stamp: string; // ISO-8601, required
  source_ref: string;
  payload: Record<string, unknown>;
}

export interface AuthoredRead {
  template_id: string;
  text: string;
  stamp: string;
  source_ref: string;
  /** Named missing inputs that keep this read partial. */
  gaps: string[];
}

export interface ShadowRead {
  id: string;
  label: string;
  status: "AVAILABLE" | "NO_DATA_FOR_GAME";
  as_of: string;
  note: string;
}

export interface GameBundle {
  game_key: string;
  title: string;
  kickoff: string;
  as_of_cutoff: string;
  line: LineFact;
  facts: StampedFact[];
  authored_reads: AuthoredRead[];
  shadow_reads: ShadowRead[];
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  game: string;
  value: Record<string, unknown>;
  source: { kind: string; ref: string };
  as_of: string | null;
}

export interface GraphInstance {
  graph: string;
  version: string;
  generated_at: string;
  nodes: unknown[];
  edges: GraphEdge[];
  honest_empty: { edge_type: string; missing: string[]; reason: string; team?: string }[];
}

export interface Claim {
  text: string;
  cites: string[];
}

export const SECTION_IDS = [
  "situation",
  "personnel",
  "context_intangibles",
  "market_may_not_read",
  "what_would_change",
  "non_claims",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export type DossierSections = Record<SectionId, Claim[]>;

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
}

export interface Provenance {
  pipeline: string;
  pipeline_version: string;
  mode: "live-model" | "template-filled";
  model_id: string | null;
  model_provider: string | null;
  generated_at: string;
  prompt_sha256: string | null;
  input_manifest_sha256: string;
  usage: Usage | null;
}

export interface Dossier {
  game_key: string;
  title: string;
  emission: "ZERO_OBJECT";
  sections: DossierSections;
  inputs_not_relied_on: { id: string; reason: string }[];
  provenance: Provenance;
}
