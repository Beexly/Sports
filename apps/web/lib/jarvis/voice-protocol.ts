/**
 * Jarvis Voice Protocol — design + honest status for the voice interface.
 *
 * Pure functions, no I/O, no audio APIs. STT/TTS are NOT wired; this module
 * defines the command grammar, privacy rules, and approval boundaries so the
 * console can render the truth and the wiring step is unambiguous.
 *
 * Hard rules:
 *   - No persistent audio storage. Ever.
 *   - Every write-shaped command requires the approval phrase before action.
 *   - "Read back before action": Jarvis must read the proposed action back
 *     as text before anything executes.
 */

import { redactSecretsFromText } from "./scribe";

export type WakeMode = "PUSH_TO_TALK" | "MANUAL_CLICK" | "FUTURE_WAKE_WORD";

export type STTStatus =
  | "NOT_WIRED"
  | "BROWSER_AVAILABLE"
  | "FUTURE_WHISPER"
  | "FUTURE_EXTERNAL";

export type TTSStatus =
  | "NOT_WIRED"
  | "BROWSER_AVAILABLE"
  | "FUTURE_PIPER"
  | "FUTURE_EXTERNAL";

export type VoiceCommandIntent =
  | "summarize-galaxy"
  | "what-needs-decision"
  | "summarize-today"
  | "prepare-prompt"
  | "write-to-scribe"
  | "agents-status"
  | "what-changed"
  | "what-is-blocked"
  | "draft-next-task"
  | "read-back-risk";

export interface VoiceCommand {
  readonly intent: VoiceCommandIntent;
  readonly phrase: string;
  readonly requiresApproval: boolean;
  readonly safe: boolean; // read-only = safe; write = requires approval first
  readonly mappedJarvisIntent?: string; // maps to an Ask Jarvis intent if applicable
}

export interface VoiceProtocolStatus {
  readonly wakeMode: WakeMode;
  readonly sttStatus: STTStatus;
  readonly ttsStatus: TTSStatus;
  readonly browserSpeechAvailable: boolean;
  readonly isActive: boolean; // false until wired
  readonly privacyRules: readonly string[];
  readonly approvalPhrase: string;
  readonly supportedCommands: readonly VoiceCommand[];
  readonly unsafePatterns: readonly string[];
}

// ─── Command grammar ──────────────────────────────────────────────────────────

export const VOICE_COMMANDS: readonly VoiceCommand[] = [
  {
    intent: "summarize-galaxy",
    phrase: "Jarvis, summarize the galaxy.",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "summarize-galaxy",
  },
  {
    intent: "what-needs-decision",
    phrase: "Jarvis, what needs my decision?",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "decisions",
  },
  {
    intent: "summarize-today",
    phrase: "Jarvis, summarize today.",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "today",
  },
  {
    intent: "prepare-prompt",
    phrase: "Jarvis, prepare the next prompt.",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "prepare-next-prompt",
  },
  {
    intent: "write-to-scribe",
    phrase: "Jarvis, write this to the scribe.",
    requiresApproval: true,
    safe: false,
  },
  {
    intent: "agents-status",
    phrase: "Jarvis, what are the agents doing?",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "what-are-agents-doing",
  },
  {
    intent: "what-changed",
    phrase: "Jarvis, what changed?",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "today",
  },
  {
    intent: "what-is-blocked",
    phrase: "Jarvis, what is blocked?",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "what-is-blocked-os",
  },
  {
    intent: "draft-next-task",
    phrase: "Jarvis, draft the next task.",
    requiresApproval: true,
    safe: false,
  },
  {
    intent: "read-back-risk",
    phrase: "Jarvis, read back the risk.",
    requiresApproval: false,
    safe: true,
    mappedJarvisIntent: "blocked",
  },
];

const PRIVACY_RULES: readonly string[] = [
  "No persistent audio storage — audio is never written to disk or database.",
  "Transcripts are held in memory for the session only and redacted for secrets.",
  "Approval phrase required before any write action: 'Confirm and execute'.",
  "Read back before action: every proposed action is shown as text first.",
  "Recording only while push-to-talk is held — no always-on listening.",
];

const UNSAFE_PATTERNS: readonly string[] = [
  "deploy",
  "publish",
  "send email",
  "delete",
  "drop table",
  "change price",
  "post to",
];

// ─── Functions ────────────────────────────────────────────────────────────────

// Returns the honest voice posture: nothing wired, manual click only, inactive.
export function buildVoiceProtocolStatus(): VoiceProtocolStatus {
  return {
    wakeMode: "MANUAL_CLICK",
    sttStatus: "NOT_WIRED",
    ttsStatus: "NOT_WIRED",
    browserSpeechAvailable: false, // feature detection happens client-side
    isActive: false,
    privacyRules: PRIVACY_RULES,
    approvalPhrase: "Confirm and execute",
    supportedCommands: VOICE_COMMANDS,
    unsafePatterns: UNSAFE_PATTERNS,
  };
}

/** Keyword sets per intent, matched against a lowercased transcript. */
const INTENT_KEYWORDS: readonly { intent: VoiceCommandIntent; keywords: readonly string[] }[] = [
  { intent: "summarize-galaxy", keywords: ["summarize the galaxy", "galaxy summary", "summarize galaxy"] },
  { intent: "what-needs-decision", keywords: ["needs my decision", "need my decision", "what needs a decision"] },
  { intent: "summarize-today", keywords: ["summarize today", "today's summary", "how was today"] },
  { intent: "prepare-prompt", keywords: ["prepare the next prompt", "prepare a prompt", "next prompt"] },
  { intent: "write-to-scribe", keywords: ["write this to the scribe", "write to the scribe", "scribe this"] },
  { intent: "agents-status", keywords: ["agents doing", "agent status", "agents status"] },
  { intent: "what-changed", keywords: ["what changed", "what has changed"] },
  { intent: "what-is-blocked", keywords: ["what is blocked", "what's blocked", "blockers"] },
  { intent: "draft-next-task", keywords: ["draft the next task", "draft next task", "draft a task"] },
  { intent: "read-back-risk", keywords: ["read back the risk", "read the risk", "risk readback"] },
];

// Maps a raw transcript to a supported voice command, or null if unrecognized.
export function classifyVoiceCommand(transcript: string): VoiceCommand | null {
  const text = redactTranscript(transcript).toLowerCase();
  for (const { intent, keywords } of INTENT_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) {
      return VOICE_COMMANDS.find((c) => c.intent === intent) ?? null;
    }
  }
  return null;
}

// True when the command must be confirmed with the approval phrase before running.
export function requiresApprovalConfirmation(command: VoiceCommand): boolean {
  return command.requiresApproval || !command.safe;
}

// Removes potential secret material from voice input before it is held or shown.
export function redactTranscript(transcript: string): string {
  return redactSecretsFromText(transcript);
}
