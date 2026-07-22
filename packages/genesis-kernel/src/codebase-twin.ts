/**
 * Codebase Twin v0 (docs/genesis/FIRST_BUILD_CONTRACT.md §8,
 * docs/genesis/CODEBASE_TWIN_SPEC.md §7-9). Pure function over the committed
 * evidence table (repo-evidence.ts) — no fs/git/network calls here, so the
 * snapshot is a deterministic function of its input with NO timestamp of its
 * own (unlike PlanReceipt, which stamps generatedAt outside its hash).
 */

import { canonicalHash } from "./canonical-json";
import type { CapabilityState, GenesisCapability } from "./contracts";

export interface CodebaseTwinCapabilitySnapshot {
  readonly id: string;
  readonly kind: GenesisCapability["kind"];
  readonly purpose: string;
  readonly owner: string;
  /**
   * The EFFECTIVE state used everywhere downstream. Forced to UNKNOWN when
   * the capability cites zero evidence — a declared state is not proof by
   * itself (Twin spec §10: "A document is not proof of implementation").
   */
  readonly effectiveState: CapabilityState;
  readonly declaredState: CapabilityState;
  readonly evidence: readonly string[];
}

export interface CollisionFinding {
  readonly collisionId: string;
  readonly capability: string;
  readonly artifacts: readonly string[];
  readonly semanticSimilarity: "LOW" | "MEDIUM" | "HIGH";
  readonly behavioralDifference: string;
  readonly risk: "LOW" | "MEDIUM" | "HIGH";
  readonly recommendedCanonicalOwner: string;
  readonly safeDisposition: string;
  readonly supportingEvidence: readonly string[];
}

export interface CodebaseTwinSnapshot {
  readonly capabilities: readonly CodebaseTwinCapabilitySnapshot[];
  readonly collisions: readonly CollisionFinding[];
  readonly twinHash: string;
}

function effectiveState(capability: GenesisCapability): CapabilityState {
  return capability.provenance.evidence.length === 0 ? "UNKNOWN" : capability.implementationState;
}

/**
 * Committed collision findings (docs/frontier/GENESIS_CONVERGENCE_MAP.md §3,
 * verdicts a/c/e — the routing-overlap, duplicate-registry, and
 * canonical-extension-point findings that are directly about capabilities
 * this Twin tracks). Evidence-backed, not pattern-matched — the same
 * discipline as repo-evidence.ts: a real finding cites real files, never
 * inferred from a keyword heuristic over 12 rows.
 */
const KNOWN_COLLISIONS: readonly CollisionFinding[] = [
  {
    collisionId: "routing-decision-overlap",
    capability: "model/provider routing",
    artifacts: [
      "apps/web/lib/claude-api/model-router.ts",
      "apps/web/lib/claude-api/provider-dispatch.ts",
      "apps/web/lib/claude-api/free-lane.ts",
      "PR #124 shadow AI Model Portfolio Router (STRANDED_BRANCH)",
    ],
    semanticSimilarity: "HIGH",
    behavioralDifference:
      "The three main-branch modules form a coherent layered stack today (tier -> provider -> lane). The stranded shadow portfolio router would sit above all three; no production conflict exists while it stays unrecovered.",
    risk: "MEDIUM",
    recommendedCanonicalOwner: "apps/web/lib/claude-api/provider-dispatch.ts (the wired dispatcher)",
    safeDisposition: "Recover #124's router (frontier W006) to CONSUME the existing three modules, never duplicate their decisions.",
    supportingEvidence: [
      "apps/web/lib/claude-api/provider-dispatch.ts: callClaude wired into all 7 generation surfaces",
      "docs/frontier/RECOVERY_MATRIX.md: #124 classified RECOVER, do not recreate (W006 substrate)",
    ],
  },
  {
    collisionId: "duplicate-source-rights-registry",
    capability: "source rights registry",
    artifacts: [
      "apps/web/lib/scraping/source-rights-registry.ts",
      "apps/web/lib/source-rights/source-rights-registry.ts",
    ],
    semanticSimilarity: "HIGH",
    behavioralDifference: "Two registries with overlapping purpose; canonical clearance-engine consumers reference the scraping/ copy.",
    risk: "HIGH",
    recommendedCanonicalOwner: "apps/web/lib/scraping/source-rights-registry.ts",
    safeDisposition: "Reconcile in a dedicated protected-zone slice (gse-red-team required) — NOT fixed by this shadow-only workstream.",
    supportingEvidence: ["apps/web/lib/scraping/clearance-engine.ts imports the scraping/ registry"],
  },
  {
    collisionId: "canonical-extension-point",
    capability: "canonical-json / deterministic hashing",
    artifacts: [
      "apps/web/lib/intelligence-playback/canonical-json.ts (stranded on claude/galaxy-sports-edge-pdcswh, not on main)",
      "packages/genesis-kernel/src/canonical-json.ts (this package's verbatim copy)",
    ],
    semanticSimilarity: "HIGH",
    behavioralDifference: "Identical algorithm, duplicated because packages/* cannot import apps/web and the reference copy is off-main.",
    risk: "LOW",
    recommendedCanonicalOwner: "apps/web/lib/intelligence-playback/canonical-json.ts (once its branch merges)",
    safeDisposition: "Unify into one shared package after the SportsIR/kernel work lands on main; both copies stay byte-identical until then.",
    supportingEvidence: ["docs/frontier/GENESIS_CONVERGENCE_MAP.md section 3.5"],
  },
];

export function buildCodebaseTwin(evidence: readonly GenesisCapability[]): CodebaseTwinSnapshot {
  const capabilities: CodebaseTwinCapabilitySnapshot[] = evidence
    .map((c) => ({
      id: c.id,
      kind: c.kind,
      purpose: c.purpose,
      owner: c.owner,
      effectiveState: effectiveState(c),
      declaredState: c.implementationState,
      evidence: c.provenance.evidence,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const collisions = [...KNOWN_COLLISIONS].sort((a, b) => (a.collisionId < b.collisionId ? -1 : 1));

  const twinHash = canonicalHash({ capabilities, collisions });

  return { capabilities, collisions, twinHash };
}
