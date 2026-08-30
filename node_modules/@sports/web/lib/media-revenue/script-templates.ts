import type { GseContentPillar } from "./content-pillars";
import type { MediaPlatform } from "./platform-strategy";

export type ScriptTemplateId =
  | "market_mirage_short"
  | "no_bet_clinic_short"
  | "loss_autopsy_long"
  | "gse_lab_founder_build"
  | "player_signal_lab"
  | "weekly_board_meeting"
  | "sports_data_business"
  | "decision_psychology_short";

export interface ScriptSegment {
  readonly label: string;
  readonly targetDurationSeconds: number;
  readonly purpose: string;
  readonly templateText: string;
  readonly evidenceRequired: boolean;
}

export interface ScriptTemplate {
  readonly id: ScriptTemplateId;
  readonly pillar: GseContentPillar;
  readonly recommendedPlatforms: readonly MediaPlatform[];
  readonly segments: readonly ScriptSegment[];
  readonly complianceNotes: readonly string[];
}

function segment(label: string, targetDurationSeconds: number, purpose: string, templateText: string, evidenceRequired: boolean): ScriptSegment {
  return { evidenceRequired, label, purpose, targetDurationSeconds, templateText };
}

export const SCRIPT_TEMPLATES: Readonly<Record<ScriptTemplateId, ScriptTemplate>> = {
  decision_psychology_short: {
    complianceNotes: ["Educational only.", "Do not provide personalized betting advice."],
    id: "decision_psychology_short",
    pillar: "decision_psychology",
    recommendedPlatforms: ["youtube_short", "tiktok", "instagram_reel"],
    segments: [
      segment("Hook", 4, "Name the decision trap.", "The brain wants action. The model wants evidence.", false),
      segment("Lesson", 32, "Explain the failure mode.", "Show the bias, the cost, and the calmer decision rule.", true),
      segment("CTA", 6, "Move to owned audience.", "Save this before the next slate.", false),
    ],
  },
  gse_lab_founder_build: {
    complianceNotes: ["Do not call draft systems live.", "Do not expose secrets, private dashboards, or credentials."],
    id: "gse_lab_founder_build",
    pillar: "gse_lab",
    recommendedPlatforms: ["youtube_long", "linkedin", "x_thread"],
    segments: [
      segment("Human hook", 20, "Open with pressure and discipline.", "I am building a sports AI that is allowed to say no.", false),
      segment("What I am building", 60, "State the system slice.", "Today the work was about evidence, not louder picks.", false),
      segment("What broke or shipped", 120, "Show concrete proof.", "Walk through the artifact, test, or blocker.", true),
      segment("Why it matters", 60, "Tie build work to trust.", "Sports prediction should be audited, not shouted.", true),
      segment("CTA", 20, "Invite follow or waitlist.", "Follow the build and join the newsletter for board notes.", false),
    ],
  },
  loss_autopsy_long: {
    complianceNotes: ["Use settled evidence.", "No cherry-picked record claims.", "Include what does not change."],
    id: "loss_autopsy_long",
    pillar: "loss_autopsy",
    recommendedPlatforms: ["youtube_long", "newsletter"],
    segments: [
      segment("What we believed", 90, "Restate the original thesis.", "Here is the original read and evidence state.", true),
      segment("What happened", 120, "Describe outcome without spin.", "Show the settled result and key context.", true),
      segment("What failed", 180, "Separate model issue from variance.", "Identify stale data, wrong weight, or variance.", true),
      segment("Variance vs process", 120, "Teach the distinction.", "A bad outcome is not always a bad process, but sometimes it is.", true),
      segment("What changes", 90, "Commit to adjustment or no adjustment.", "Name the next review action.", true),
      segment("CTA", 30, "Point to journal or newsletter.", "Read the board notes for the full audit trail.", false),
    ],
  },
  market_mirage_short: {
    complianceNotes: ["No market-beating claim without evidence.", "Do not imply line movement alone is edge."],
    id: "market_mirage_short",
    pillar: "market_mirage",
    recommendedPlatforms: ["youtube_short", "tiktok", "instagram_reel"],
    segments: [
      segment("Hook", 3, "Create pattern interrupt.", "Everyone is reading this line wrong.", false),
      segment("Setup", 5, "Name the public story.", "The obvious read is not always the signal.", true),
      segment("Evidence", 17, "Show the actual signal question.", "Use freshness, consensus, and movement quality.", true),
      segment("Interpretation", 20, "Explain why it matters.", "Line movement can be noise when context is stale.", true),
      segment("Takeaway", 10, "Make the lesson portable.", "Movement is a question, not proof.", false),
      segment("CTA", 5, "Move to owned audience.", "Join the board notes for the full read.", false),
    ],
  },
  no_bet_clinic_short: {
    complianceNotes: ["No personalized betting advice.", "Frame pass as decision discipline."],
    id: "no_bet_clinic_short",
    pillar: "no_bet_clinic",
    recommendedPlatforms: ["youtube_short", "tiktok", "instagram_reel"],
    segments: [
      segment("Hook", 4, "Lead with refusal logic.", "The smartest play may be no play.", false),
      segment("Evidence", 25, "Name the blocker.", "Stale data, model disagreement, or market risk blocks action.", true),
      segment("Lesson", 20, "Explain what would need to change.", "A better price or cleaner source state would reopen it.", true),
      segment("CTA", 8, "Reinforce no-bet thesis.", "Save the checklist before the next slate.", false),
    ],
  },
  player_signal_lab: {
    complianceNotes: ["Use cleared player data.", "Separate role from projection.", "No unsupported prop advice."],
    id: "player_signal_lab",
    pillar: "player_signal_lab",
    recommendedPlatforms: ["youtube_short", "instagram_carousel", "newsletter"],
    segments: [
      segment("Box score claim", 12, "Show the surface read.", "The box score says one thing.", true),
      segment("Hidden signal", 35, "Explain role or difficulty.", "Role, depth, or difficulty tells a different story.", true),
      segment("Evidence", 45, "Show source-backed context.", "Use target quality, route role, and source freshness.", true),
      segment("Failure mode", 20, "Avoid overclaiming.", "This is a signal, not a guarantee.", true),
      segment("Takeaway", 15, "Make it actionable as learning.", "Watch role before chasing points.", false),
    ],
  },
  sports_data_business: {
    complianceNotes: ["Do not advise ToS violations.", "Separate access, rights, and intelligence."],
    id: "sports_data_business",
    pillar: "sports_data_business",
    recommendedPlatforms: ["linkedin", "youtube_long", "newsletter"],
    segments: [
      segment("Hook", 20, "State the business misconception.", "Raw sports data is not intelligence.", false),
      segment("Problem", 90, "Explain source and rights complexity.", "The expensive part is reliability, permission, and freshness.", true),
      segment("GSE tie", 120, "Show repo-level governance.", "Walk through gates, registry, or evidence docs.", true),
      segment("Partner ask", 30, "Invite the right conversation.", "Data partners should care about trust surfaces, not hype.", false),
    ],
  },
  weekly_board_meeting: {
    complianceNotes: ["Separate shipped, planned, and blocked work.", "Sponsors cannot influence editorial conclusions."],
    id: "weekly_board_meeting",
    pillar: "board_meeting",
    recommendedPlatforms: ["youtube_long", "podcast", "newsletter"],
    segments: [
      segment("What shipped", 240, "Show real progress.", "Name committed artifacts and tests.", true),
      segment("What broke", 180, "Make blockers useful.", "Explain failures without hiding them.", true),
      segment("What the model learned", 180, "Connect learning to governance.", "Describe evidence changes without unsupported performance claims.", true),
      segment("What we passed on", 120, "Reinforce no-bet discipline.", "Name refused claims or unsafe ideas.", true),
      segment("Content coming", 60, "Preview next media pieces.", "List drafts, not promises.", false),
      segment("Partner ask", 60, "Invite aligned sponsors.", "State categories and independence boundaries.", false),
    ],
  },
} as const;
