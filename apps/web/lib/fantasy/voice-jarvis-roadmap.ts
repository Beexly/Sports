/**
 * Voice Jarvis roadmap data contract for Galaxy Sports Edge.
 * Defines the architecture, command taxonomy, intent resolution,
 * and privacy requirements for the live draft voice co-pilot.
 */

// ── Voice system types ────────────────────────────────────────────────────────

export type JarvisCommandIntent =
  | "WHO_SHOULD_I_DRAFT"
  | "PLAYER_INFO"
  | "OPPONENT_TENDENCY"
  | "ROSTER_HOLE"
  | "POSITIONAL_SCARCITY"
  | "TRADE_ANALYSIS"
  | "START_SIT"
  | "WAIVER_WIRE"
  | "INJURY_STATUS"
  | "STACK_ADVICE"
  | "HELP"
  | "UNKNOWN";

export type JarvisMode = "draft" | "in_season" | "dfs" | "research";
export type TranscriptPrivacy = "no_storage" | "session_only" | "user_opted_in";
export type SpeechEngine = "web_speech_api" | "whisper_local" | "whisper_api";
export type SynthesisEngine = "web_speech_synthesis" | "elevenlabs" | "openai_tts";

export interface JarvisConfig {
  mode: JarvisMode;
  transcriptPrivacy: TranscriptPrivacy;
  speechEngine: SpeechEngine;
  synthesisEngine: SynthesisEngine;
  wakeWord: string;
  maxLatencyMs: number;
  fallbackToText: boolean;
}

export interface ParsedJarvisCommand {
  rawTranscript: string;
  intent: JarvisCommandIntent;
  entities: Record<string, string>;
  confidence: number;
  followUpRequired: boolean;
}

export interface JarvisResponse {
  spokenText: string;
  displayCard: JarvisDisplayCard | null;
  action: JarvisAction | null;
  confidenceScore: number;
  sourceLabel: string;
}

export interface JarvisDisplayCard {
  title: string;
  primaryValue: string;
  secondaryValues: string[];
  urgencyLevel: "low" | "medium" | "high" | "critical";
  dataLabel: "REAL_TIME" | "MODELED" | "ILLUSTRATIVE";
}

export type JarvisAction =
  | { type: "QUEUE_PICK"; playerId: string }
  | { type: "SHOW_THESIS"; playerId: string }
  | { type: "SHOW_GENOME"; managerId: string }
  | { type: "OPEN_PAGE"; route: string };

// ── Command templates ─────────────────────────────────────────────────────────

export interface JarvisCommandTemplate {
  intent: JarvisCommandIntent;
  examplePhrases: string[];
  requiredEntities: string[];
  optionalEntities: string[];
  responseTemplate: string;
  fallbackResponse: string;
  maxResponseWords: number;
}

export const JARVIS_COMMAND_TEMPLATES: ReadonlyArray<JarvisCommandTemplate> = [
  {
    intent: "WHO_SHOULD_I_DRAFT",
    examplePhrases: [
      "Who should I draft?",
      "What's my best pick right now?",
      "Give me my top three options",
      "Who do I take at this slot?",
    ],
    requiredEntities: [],
    optionalEntities: ["position", "round"],
    responseTemplate:
      "Your top pick at {pick_slot} is {player_name}, {value_label} at ADP {adp}. {urgency_statement}. Bull case: {bull_thesis}.",
    fallbackResponse:
      "I need your current draft position to recommend. What pick are you on?",
    maxResponseWords: 60,
  },
  {
    intent: "PLAYER_INFO",
    examplePhrases: [
      "Tell me about {player}",
      "What's the situation with {player}?",
      "Is {player} worth taking here?",
      "What's {player}'s injury status?",
    ],
    requiredEntities: ["player_name"],
    optionalEntities: ["context"],
    responseTemplate:
      "{player_name} — projected {projection} points, ADP {adp}. {injury_flag}. {bull_bear_summary}.",
    fallbackResponse: "Which player would you like info on?",
    maxResponseWords: 50,
  },
  {
    intent: "OPPONENT_TENDENCY",
    examplePhrases: [
      "What will {manager} do next?",
      "Is {manager} going to take a quarterback?",
      "What's {manager}'s draft style?",
    ],
    requiredEntities: ["manager_name"],
    optionalEntities: ["position"],
    responseTemplate:
      "{manager_name} historically {tendency}. Based on their draft pattern, expect them to target {predicted_position} in the next {rounds} rounds.",
    fallbackResponse: "Which manager are you asking about?",
    maxResponseWords: 40,
  },
  {
    intent: "ROSTER_HOLE",
    examplePhrases: [
      "What's my biggest roster hole?",
      "Where am I weakest?",
      "What position should I target next?",
    ],
    requiredEntities: [],
    optionalEntities: [],
    responseTemplate:
      "Your biggest hole is {position}. You have {current_count} and need {target_count}. Priority: {urgency_label}.",
    fallbackResponse:
      "I don't have your current roster. Can you confirm your picks so far?",
    maxResponseWords: 35,
  },
  {
    intent: "POSITIONAL_SCARCITY",
    examplePhrases: [
      "How many quarterbacks are left?",
      "When does the tight end run happen?",
      "How scarce is running back right now?",
    ],
    requiredEntities: ["position"],
    optionalEntities: [],
    responseTemplate:
      "{position} scarcity: {tier1_count} top-tier available, {tier2_count} mid-tier. ADP suggests a run in rounds {run_start}–{run_end}.",
    fallbackResponse: "Which position do you want scarcity info for?",
    maxResponseWords: 40,
  },
  {
    intent: "INJURY_STATUS",
    examplePhrases: [
      "Is {player} injured?",
      "What's the injury report on {player}?",
      "Is {player} cleared to play?",
    ],
    requiredEntities: ["player_name"],
    optionalEntities: [],
    responseTemplate:
      "{player_name} injury status: {status}. {detail}. {draft_recommendation}.",
    fallbackResponse: "Which player's injury status do you need?",
    maxResponseWords: 35,
  },
  {
    intent: "HELP",
    examplePhrases: [
      "What can you do?",
      "Help",
      "What commands can I use?",
      "Hey Jarvis, help",
    ],
    requiredEntities: [],
    optionalEntities: [],
    responseTemplate:
      "I can help you draft. Ask me: who to pick, player info, opponent tendencies, your roster holes, positional scarcity, or injury status.",
    fallbackResponse:
      "I can help you draft. Ask me: who to pick, player info, opponent tendencies, or injury status.",
    maxResponseWords: 30,
  },
] as const;

// ── Platform live sync posture ────────────────────────────────────────────────

export type SyncPermission =
  | "PERMITTED"
  | "CONDITIONAL_PERMISSION"
  | "NOT_PERMITTED"
  | "UNKNOWN"
  | "UNDER_REVIEW";

export interface DraftPlatformSyncPosture {
  platform: string;
  syncPermission: SyncPermission;
  method: string;
  rationale: string;
  legalNote: string;
  automationAllowed: boolean;
}

export const DRAFT_PLATFORM_POSTURES: ReadonlyArray<DraftPlatformSyncPosture> = [
  {
    platform: "Sleeper",
    syncPermission: "CONDITIONAL_PERMISSION",
    method: "Official API with user auth token",
    rationale: "Sleeper has a public API with explicit developer access. Must use user's own auth token; no credential storage on GSE servers.",
    legalNote: "Review current Sleeper API ToS before implementation. User must authorize explicitly.",
    automationAllowed: false,
  },
  {
    platform: "Yahoo Fantasy",
    syncPermission: "CONDITIONAL_PERMISSION",
    method: "Yahoo Fantasy API (OAuth2)",
    rationale: "Yahoo has an official Fantasy API. OAuth2 required; no scraping of Yahoo UI.",
    legalNote: "Yahoo API ToS prohibits automated draft actions. Data read is permitted; auto-pick submission is not.",
    automationAllowed: false,
  },
  {
    platform: "ESPN Fantasy",
    syncPermission: "NOT_PERMITTED",
    method: "No official API; scraping prohibited",
    rationale: "ESPN ToS explicitly prohibits automated access. No official API for external developers.",
    legalNote: "Do not scrape ESPN. Manual import only via CSV/screenshot upload.",
    automationAllowed: false,
  },
  {
    platform: "Fantrax",
    syncPermission: "UNDER_REVIEW",
    method: "No confirmed official API",
    rationale: "Fantrax has historically provided partial API access to select partners. Status unclear.",
    legalNote: "Complete vendor questionnaire before building any Fantrax integration.",
    automationAllowed: false,
  },
  {
    platform: "MFL (MyFantasyLeague)",
    syncPermission: "UNDER_REVIEW",
    method: "MFL has a documented API for paid subscribers",
    rationale: "MFL's API is pay-gated. Terms and redistribution rights need review.",
    legalNote: "Review MFL API license before building. Cannot redistribute data without permission.",
    automationAllowed: false,
  },
] as const;

// ── Privacy requirements ──────────────────────────────────────────────────────

export interface JarvisPrivacyRequirement {
  requirement: string;
  implementation: string;
  mandatory: boolean;
}

export const JARVIS_PRIVACY_REQUIREMENTS: ReadonlyArray<JarvisPrivacyRequirement> = [
  {
    requirement: "No persistent transcript storage without explicit opt-in",
    implementation: "Default: transcripts processed in-memory only, deleted after response. Opt-in: user can enable transcript history in settings.",
    mandatory: true,
  },
  {
    requirement: "Wake word detection runs locally",
    implementation: "Wake word ('Hey Jarvis' or equivalent) processed on-device before any network call.",
    mandatory: true,
  },
  {
    requirement: "Audio never sent to third parties without disclosure",
    implementation: "If using Whisper API, disclose in privacy settings. If using Web Speech API, disclose Chrome/browser sends audio to Google.",
    mandatory: true,
  },
  {
    requirement: "User data in prompts must be anonymized",
    implementation: "Manager names are hashed before sending to Claude API. Genome data sent as abstract traits, not PII.",
    mandatory: true,
  },
  {
    requirement: "GDPR right to deletion applies to voice interaction logs",
    implementation: "If user opts in to transcript storage, deletion request must clear all stored voice data.",
    mandatory: true,
  },
] as const;

// ── Default config ─────────────────────────────────────────────────────────────

export const DEFAULT_JARVIS_CONFIG: JarvisConfig = {
  mode: "draft",
  transcriptPrivacy: "session_only",
  speechEngine: "web_speech_api",
  synthesisEngine: "web_speech_synthesis",
  wakeWord: "Hey Jarvis",
  maxLatencyMs: 3000,
  fallbackToText: true,
} as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function permittedPlatforms(): DraftPlatformSyncPosture[] {
  return DRAFT_PLATFORM_POSTURES.filter(
    (p) => p.syncPermission === "PERMITTED" || p.syncPermission === "CONDITIONAL_PERMISSION"
  ) as DraftPlatformSyncPosture[];
}

export function blockedPlatforms(): DraftPlatformSyncPosture[] {
  return DRAFT_PLATFORM_POSTURES.filter(
    (p) => p.syncPermission === "NOT_PERMITTED"
  ) as DraftPlatformSyncPosture[];
}

export function templateByIntent(intent: JarvisCommandIntent): JarvisCommandTemplate | undefined {
  return JARVIS_COMMAND_TEMPLATES.find((t) => t.intent === intent);
}
