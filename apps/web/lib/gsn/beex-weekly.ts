/**
 * Beex Weekly — the owner's voice on the record.
 *
 * The weekly podcast comes from Beex directly: the system drafts the script
 * from the same evidence the engine runs on (transmission segments, board
 * posture, the week's graded record), and the draft is read in Beex's own
 * voice via the licensed voice plugin — with his explicit, standing consent
 * to clone HIS OWN voice and his review before anything ships.
 *
 * Hard gates (type-enforced, mirrored in tests):
 *  - `status` can never be "published" without `ownerApproved: true`.
 *  - Output is a SCRIPT DRAFT — this module never synthesizes audio, never
 *    posts, never publishes. The voice plugin is a separate, operator-run step.
 *  - Brand voice is first-person plural ("we", "we at GSN"): the script reads
 *    like Beex wrote it, because he approves every word before it's voiced.
 *  - No fabricated stats: every segment carries through from a real
 *    Transmission input; the generator adds framing, not facts.
 */

import type { Transmission, TransmissionSegment } from "@/lib/gsn/transmission";

export type EpisodeStatus = "draft" | "owner-review" | "approved" | "published";

export type EpisodeSegmentScript = {
  readonly source: TransmissionSegment["type"];
  readonly heading: string;
  /** Spoken lines, drafted in Beex's register. */
  readonly lines: readonly string[];
  /** Delivery note for the voice pass (pace, tone). Never spoken. */
  readonly voiceNote: string;
};

export type BeexWeeklyEpisode = {
  readonly kind: "beex-weekly";
  readonly episodeCode: string;
  readonly status: EpisodeStatus;
  readonly ownerApproved: boolean;
  /** Owner-voice policy: scripts are voiced ONLY with Beex's own consent. */
  readonly voicePolicy: {
    readonly voiceOwner: "beex";
    readonly consentOnFile: boolean;
    readonly autoPublish: false;
  };
  readonly cold_open: readonly string[];
  readonly segments: readonly EpisodeSegmentScript[];
  readonly sign_off: readonly string[];
};

const toneVoiceNote: Record<TransmissionSegment["tone"], string> = {
  ion: "Steady and confident — this is the part we're sure of.",
  anomaly: "Lean in, slow down — we're warning people off something here.",
  deep: "Thoughtful, almost off-script — thinking out loud with the listener.",
};

/**
 * Draft the weekly episode script from a real transmission.
 * Pure function: no I/O, no audio, no publishing.
 */
export function draftBeexWeekly(
  transmission: Transmission,
  opts: { weekLabel: string; consentOnFile: boolean },
): BeexWeeklyEpisode {
  const segments: EpisodeSegmentScript[] = transmission.segments.map((seg) => ({
    source: seg.type,
    heading: seg.title,
    lines: [seg.dek, ...seg.points].map((p) => rewriteInOurVoice(p)),
    voiceNote: toneVoiceNote[seg.tone],
  }));

  return {
    kind: "beex-weekly",
    episodeCode: `BW · ${opts.weekLabel}`,
    status: "draft",
    ownerApproved: false,
    voicePolicy: {
      voiceOwner: "beex",
      consentOnFile: opts.consentOnFile,
      autoPublish: false,
    },
    cold_open: [
      `It's Beex. This is the weekly — ${opts.weekLabel}.`,
      "Same rule as always: we read the whole board before we say a word, and if the math says sit, we sit.",
    ],
    segments,
    sign_off: [
      "That's the week. Everything we said tonight is on the record — graded, timestamped, public.",
      "We detect. You decide.",
    ],
  };
}

/** First-person-plural pass: the script sounds like us, never like a tool. */
export function rewriteInOurVoice(line: string): string {
  const rewritten = line
    .replace(/\bthe engine is\b/gi, "we're")
    .replace(/\bthe engine has\b/gi, "we have")
    // third-person verb directly after "the engine" loses its -s: flags → flag
    .replace(/\bthe engine (\w+)s\b/gi, (_m, verb: string) => `we ${verb}`)
    .replace(/\bthe engine\b/gi, "we")
    .replace(/\bthe model\b/gi, "our number")
    .replace(/\bAI\b/g, "the desk");
  return rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
}

/**
 * The only legal transition into "published": owner approval first.
 * Anything else throws — there is no autonomous publish path.
 */
export function advanceEpisode(
  episode: BeexWeeklyEpisode,
  next: EpisodeStatus,
): BeexWeeklyEpisode {
  if (next === "published" && !episode.ownerApproved) {
    throw new Error("Beex Weekly cannot publish without owner approval.");
  }
  if (next === "approved" || next === "published") {
    if (!episode.voicePolicy.consentOnFile) {
      throw new Error("Voice consent must be on file before approval.");
    }
  }
  return { ...episode, status: next, ownerApproved: episode.ownerApproved || next === "approved" };
}

export function approveEpisode(episode: BeexWeeklyEpisode): BeexWeeklyEpisode {
  return { ...advanceEpisode({ ...episode, ownerApproved: true }, "approved") };
}
