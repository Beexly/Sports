/**
 * Static-config loader tests for the revenue module.
 *
 * Asserts structural correctness of channels, content-factory, creator-network,
 * sponsors, and affiliate-registry configs. Pure — no DB, no network.
 *
 * Key invariants:
 * - Arrays are non-empty where doctrine defines items; honestly empty where they
 *   haven't been populated yet (CREATORS, SPONSORS, AFFILIATE_PARTNERS).
 * - Every item has required fields (id, name, etc.).
 * - All metric `value` fields are null (unknown — not fabricated).
 * - Priorities and stages match the valid type union.
 */

import { describe, it, expect } from "vitest";

// ── channels ──────────────────────────────────────────────────────────────────

import {
  CHANNELS,
  ROLE_LABELS,
  STATUS_LABELS,
  type ChannelRole,
  type ChannelStatus,
} from "../lib/revenue/channels";

const VALID_ROLES: ChannelRole[] = ["acquisition", "owned", "trust"];
const VALID_STATUSES: ChannelStatus[] = ["not_started", "building", "active"];

describe("channels — structural correctness", () => {
  it("CHANNELS is non-empty", () => {
    expect(CHANNELS.length).toBeGreaterThan(0);
  });

  it("every channel has required string fields", () => {
    for (const ch of CHANNELS) {
      expect(typeof ch.id).toBe("string");
      expect(ch.id.length).toBeGreaterThan(0);
      expect(typeof ch.name).toBe("string");
      expect(ch.name.length).toBeGreaterThan(0);
      expect(typeof ch.ownerAgent).toBe("string");
      expect(typeof ch.purpose).toBe("string");
    }
  });

  it("every channel has a valid role", () => {
    for (const ch of CHANNELS) {
      expect(VALID_ROLES).toContain(ch.role);
    }
  });

  it("every channel has a valid status", () => {
    for (const ch of CHANNELS) {
      expect(VALID_STATUSES).toContain(ch.status);
    }
  });

  it("every channel has a numeric priority >= 1", () => {
    for (const ch of CHANNELS) {
      expect(typeof ch.priority).toBe("number");
      expect(ch.priority).toBeGreaterThanOrEqual(1);
    }
  });

  it("blockedOn is a string or null for every channel", () => {
    for (const ch of CHANNELS) {
      expect(ch.blockedOn === null || typeof ch.blockedOn === "string").toBe(true);
    }
  });

  it("all channel metric values are null (unknown — never fabricated)", () => {
    for (const ch of CHANNELS) {
      expect(ch.metrics.length).toBeGreaterThan(0);
      for (const m of ch.metrics) {
        expect(m.value).toBeNull();
        expect(typeof m.note).toBe("string");
        expect(m.note.length).toBeGreaterThan(0);
      }
    }
  });

  it("ROLE_LABELS covers every role", () => {
    for (const role of VALID_ROLES) {
      expect(typeof ROLE_LABELS[role]).toBe("string");
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it("STATUS_LABELS covers every status", () => {
    for (const status of VALID_STATUSES) {
      expect(typeof STATUS_LABELS[status]).toBe("string");
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

// ── content-factory ───────────────────────────────────────────────────────────

import {
  DERIVATIVE_OUTPUTS,
  RECURRING_FORMATS,
  OUTPUTS_PER_BRIEF,
  CATEGORY_LABELS,
  type OutputCategory,
} from "../lib/revenue/content-factory";

const VALID_CATEGORIES: OutputCategory[] = [
  "owned_media",
  "social_short",
  "social_video",
  "platform_audio",
  "conversion_cta",
  "revenue",
  "community",
  "product_insight",
];

describe("content-factory — structural correctness", () => {
  it("DERIVATIVE_OUTPUTS is non-empty", () => {
    expect(DERIVATIVE_OUTPUTS.length).toBeGreaterThan(0);
  });

  it("OUTPUTS_PER_BRIEF matches the actual array length", () => {
    expect(OUTPUTS_PER_BRIEF).toBe(DERIVATIVE_OUTPUTS.length);
  });

  it("every derivative output has required fields", () => {
    for (const out of DERIVATIVE_OUTPUTS) {
      expect(typeof out.label).toBe("string");
      expect(out.label.length).toBeGreaterThan(0);
      expect(typeof out.description).toBe("string");
      expect(out.description.length).toBeGreaterThan(0);
      expect(typeof out.ownerAgent).toBe("string");
      expect(out.ownerAgent.length).toBeGreaterThan(0);
    }
  });

  it("every derivative output has a valid category", () => {
    for (const out of DERIVATIVE_OUTPUTS) {
      expect(VALID_CATEGORIES).toContain(out.category);
    }
  });

  it("CATEGORY_LABELS covers every valid category", () => {
    for (const cat of VALID_CATEGORIES) {
      expect(typeof CATEGORY_LABELS[cat]).toBe("string");
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("RECURRING_FORMATS is non-empty and every format has name + description", () => {
    expect(RECURRING_FORMATS.length).toBeGreaterThan(0);
    for (const fmt of RECURRING_FORMATS) {
      expect(typeof fmt.name).toBe("string");
      expect(fmt.name.length).toBeGreaterThan(0);
      expect(typeof fmt.description).toBe("string");
      expect(fmt.description.length).toBeGreaterThan(0);
    }
  });
});

// ── creator-network ───────────────────────────────────────────────────────────

import {
  CREATOR_LANES,
  CREATORS,
  CONTRIBUTOR_OFFER,
  getRosterSummary,
  type CreatorLaneId,
} from "../lib/revenue/creator-network";

const VALID_LANE_IDS: CreatorLaneId[] = [
  "nfl",
  "cfb",
  "nba",
  "mlb",
  "fantasy",
  "dfs",
  "betting-education",
  "houston-local",
];

describe("creator-network — structural correctness", () => {
  it("CREATOR_LANES is non-empty and covers all expected lane IDs", () => {
    expect(CREATOR_LANES.length).toBeGreaterThan(0);
    const laneIds = CREATOR_LANES.map((l) => l.id);
    for (const id of VALID_LANE_IDS) {
      expect(laneIds).toContain(id);
    }
  });

  it("every creator lane has required fields", () => {
    for (const lane of CREATOR_LANES) {
      expect(typeof lane.id).toBe("string");
      expect(lane.id.length).toBeGreaterThan(0);
      expect(typeof lane.name).toBe("string");
      expect(typeof lane.description).toBe("string");
      expect(typeof lane.targetProfile).toBe("string");
    }
  });

  it("CREATORS is honestly empty at launch (no fabricated creators)", () => {
    expect(CREATORS).toHaveLength(0);
  });

  it("getRosterSummary returns honest zero counts when roster is empty", () => {
    const summary = getRosterSummary();
    expect(summary.totalCreators).toBe(0);
    // Every lane count is 0
    for (const id of VALID_LANE_IDS) {
      expect(summary.byLane[id]).toBe(0);
    }
    // Every status count is 0
    for (const status of ["prospect", "contacted", "active", "paused", "declined"] as const) {
      expect(summary.byStatus[status]).toBe(0);
    }
    expect(typeof summary.note).toBe("string");
    expect(summary.note.length).toBeGreaterThan(0);
  });

  it("CONTRIBUTOR_OFFER has a valid revenueSharePct and non-empty arrays", () => {
    expect(typeof CONTRIBUTOR_OFFER.revenueSharePct).toBe("number");
    expect(CONTRIBUTOR_OFFER.revenueSharePct).toBeGreaterThan(0);
    expect(CONTRIBUTOR_OFFER.assets.length).toBeGreaterThan(0);
    expect(CONTRIBUTOR_OFFER.complianceGuardrails.length).toBeGreaterThan(0);
  });
});

// ── sponsors ─────────────────────────────────────────────────────────────────

import {
  loadSponsorPipeline,
  PIPELINE_STAGES,
  STAGE_LABELS,
  SPONSOR_PRICING_TIERS,
  type SponsorStage,
} from "../lib/revenue/sponsors";

const VALID_STAGES: SponsorStage[] = [
  "lead",
  "contacted",
  "interested",
  "proposal_sent",
  "active",
  "declined",
];

describe("sponsors — structural correctness", () => {
  it("loadSponsorPipeline returns honest empty at launch (no fabricated sponsors)", () => {
    const summary = loadSponsorPipeline();
    expect(summary.total).toBe(0);
    expect(summary.sponsors).toHaveLength(0);
    expect(typeof summary.note).toBe("string");
  });

  it("byStage counts are all 0 when no sponsors exist", () => {
    const summary = loadSponsorPipeline();
    for (const stage of VALID_STAGES) {
      expect(summary.byStage[stage]).toBe(0);
    }
  });

  it("PIPELINE_STAGES is non-empty and covers all valid stages", () => {
    expect(PIPELINE_STAGES.length).toBeGreaterThan(0);
    for (const stage of VALID_STAGES) {
      expect(PIPELINE_STAGES).toContain(stage);
    }
  });

  it("STAGE_LABELS covers every stage", () => {
    for (const stage of VALID_STAGES) {
      expect(typeof STAGE_LABELS[stage]).toBe("string");
      expect(STAGE_LABELS[stage].length).toBeGreaterThan(0);
    }
  });

  it("SPONSOR_PRICING_TIERS is non-empty and every tier has required fields", () => {
    expect(SPONSOR_PRICING_TIERS.length).toBeGreaterThan(0);
    for (const tier of SPONSOR_PRICING_TIERS) {
      expect(typeof tier.name).toBe("string");
      expect(tier.name.length).toBeGreaterThan(0);
      expect(typeof tier.rangeUsdPerMonth).toBe("string");
      expect(typeof tier.description).toBe("string");
    }
  });
});

// ── affiliate-registry ────────────────────────────────────────────────────────

import {
  loadAffiliateRegistry,
  ACTIVATION_REQUIREMENTS,
  HIGH_RISK_CATEGORIES,
} from "../lib/revenue/affiliate-registry";

describe("affiliate-registry — structural correctness", () => {
  it("loadAffiliateRegistry returns honest empty at launch (no fabricated partners)", () => {
    const summary = loadAffiliateRegistry();
    expect(summary.total).toBe(0);
    expect(summary.active).toBe(0);
    expect(summary.pendingApproval).toBe(0);
    expect(summary.deferred).toBe(0);
    expect(summary.partners).toHaveLength(0);
  });

  it("compliancePosture is a non-empty string describing the gate", () => {
    const summary = loadAffiliateRegistry();
    expect(typeof summary.compliancePosture).toBe("string");
    expect(summary.compliancePosture.length).toBeGreaterThan(0);
  });

  it("honest empty note is returned when no partners exist", () => {
    const summary = loadAffiliateRegistry();
    expect(typeof summary.note).toBe("string");
    expect(summary.note.length).toBeGreaterThan(0);
  });

  it("ACTIVATION_REQUIREMENTS is non-empty and each item is a string", () => {
    expect(ACTIVATION_REQUIREMENTS.length).toBeGreaterThan(0);
    for (const req of ACTIVATION_REQUIREMENTS) {
      expect(typeof req).toBe("string");
      expect(req.length).toBeGreaterThan(0);
    }
  });

  it("HIGH_RISK_CATEGORIES includes sportsbook and casino", () => {
    expect(HIGH_RISK_CATEGORIES).toContain("sportsbook");
    expect(HIGH_RISK_CATEGORIES).toContain("casino");
  });
});
