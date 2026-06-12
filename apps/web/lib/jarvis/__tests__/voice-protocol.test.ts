import { describe, it, expect } from "vitest";
import {
  VOICE_COMMANDS,
  buildVoiceProtocolStatus,
  classifyVoiceCommand,
  requiresApprovalConfirmation,
  redactTranscript,
} from "../voice-protocol";

describe("buildVoiceProtocolStatus", () => {
  it("returns isActive: false — voice is not wired", () => {
    const status = buildVoiceProtocolStatus();
    expect(status.isActive).toBe(false);
    expect(status.sttStatus).toBe("NOT_WIRED");
    expect(status.ttsStatus).toBe("NOT_WIRED");
    expect(status.wakeMode).toBe("MANUAL_CLICK");
    expect(status.browserSpeechAvailable).toBe(false);
  });

  it("declares the approval phrase and privacy rules", () => {
    const status = buildVoiceProtocolStatus();
    expect(status.approvalPhrase).toBe("Confirm and execute");
    expect(status.privacyRules.length).toBeGreaterThanOrEqual(4);
    expect(status.privacyRules.join(" ")).toMatch(/no persistent audio/i);
    expect(status.supportedCommands).toEqual(VOICE_COMMANDS);
  });
});

describe("voice command approval boundary", () => {
  it("commands that write require approval", () => {
    const writes = VOICE_COMMANDS.filter((c) => !c.safe);
    expect(writes.length).toBeGreaterThan(0);
    for (const command of writes) {
      expect(command.requiresApproval, `${command.intent} must require approval`).toBe(true);
      expect(requiresApprovalConfirmation(command)).toBe(true);
    }
  });

  it("read-only commands do not require approval", () => {
    const safe = VOICE_COMMANDS.find((c) => c.intent === "summarize-galaxy");
    expect(safe).toBeDefined();
    expect(requiresApprovalConfirmation(safe!)).toBe(false);
  });
});

describe("classifyVoiceCommand", () => {
  it("maps known phrases to commands", () => {
    expect(classifyVoiceCommand("Jarvis, what needs my decision?")?.intent).toBe(
      "what-needs-decision"
    );
    expect(classifyVoiceCommand("jarvis, summarize the galaxy")?.intent).toBe(
      "summarize-galaxy"
    );
    expect(classifyVoiceCommand("please write this to the scribe")?.intent).toBe(
      "write-to-scribe"
    );
  });

  it("returns null for unrecognized input", () => {
    expect(classifyVoiceCommand("order a pizza")).toBeNull();
  });
});

describe("redactTranscript", () => {
  it("removes secrets from voice input", () => {
    const redacted = redactTranscript("set the api key= sk-12345678901234 now");
    expect(redacted).not.toContain("sk-12345678901234");
    expect(redacted).toContain("[REDACTED]");
  });

  it("redacts password assignments", () => {
    const redacted = redactTranscript("my password=opensesame ok");
    expect(redacted).not.toContain("opensesame");
  });
});
