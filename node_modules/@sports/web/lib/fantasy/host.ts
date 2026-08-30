/**
 * The Studio Host. Galaxy Studios' branded virtual presenter.
 *
 * A magnetic, credible on-air personality: sharp, warm, quick, and genuinely
 * knowledgeable. The draw is charisma + credibility, not objectification, so she
 * appeals to the whole audience and reads like a real, beloved employee instead
 * of a bot. She fronts the broadcast: cold open, breaking news from the field,
 * the waiver wire from the clubhouse, scheme watch from the practice facility,
 * the edge of the week, and a sign-off. Switching scenes like a real reporter on
 * location.
 *
 * DOCTRINE: this generates SCRIPTS. Text drafts for a human to review and
 * produce. It does not generate AI-likeness video, post autonomously, or reply to
 * real people on its own; every broadcast carries an AI-presenter disclosure.
 * Pure, deterministic, illustrative.
 */

import { rankWire, type SignalType } from "../news/impact";
import { DEMO_WIRE } from "../news/wire";
import { generateWeeklyBrief } from "./studio";
import { scanText, type SafetyVerdict } from "../safety/content-safety";

export type Persona = {
  readonly name: string;
  readonly handle: string;
  readonly role: string;
  readonly tagline: string;
  /** how she sounds. The voice rules that drive every script */
  readonly voice: readonly string[];
  readonly values: readonly string[];
  /** the AI tells the writing must never have */
  readonly avoids: readonly string[];
  readonly signOn: string;
  readonly signOff: string;
};

/** The default brand persona. Swappable. The brand owns the bible. */
export const NOVA: Persona = {
  name: "Nova",
  handle: "@NovaOnTheEdge",
  role: "Galaxy Sports Edge field anchor",
  tagline: "Your edge, brought in from the field.",
  voice: [
    "Sharp and quick. Short, punchy sentences with real football detail.",
    "Warm and a little playful; talks to the audience like smart friends, never down to them.",
    "Confident from credibility, not hype. She earns the call with the why.",
    "Inclusive: writes for every fan, not a demographic.",
    "Specific over generic. Names, roles, numbers, not vibes.",
  ],
  values: [
    "Credibility first. Never overclaims, never sells certainty.",
    "Respect the audience's intelligence and their bankroll.",
    "Make the smart call sound better than the loud one.",
  ],
  avoids: [
    "AI tells: 'as an AI', 'in conclusion', 'delve', 'in the world of', robotic hedging.",
    "Certainty slang and overclaiming. Never sells a result as a foregone conclusion.",
    "Cheesy or objectifying framing. The draw is the read, not the pose.",
  ],
  signOn: "You're with Galaxy Studios. I'm Nova.",
  signOff: "Make the smart call, not the loud one. I'm Nova. I'll see you on the edge.",
};

/**
 * The desk co-anchor. Orion holds the studio while Nova works the field, the
 * steady, analytical counterweight who frames the market and the math. Two
 * reporters trading segments give the broadcast its newsroom rhythm.
 */
export const ORION: Persona = {
  name: "Orion",
  handle: "@OrionAtTheDesk",
  role: "Galaxy Sports Edge desk anchor",
  tagline: "The market read, from the desk.",
  voice: [
    "Measured and precise. He slows the room down and frames the number.",
    "Analytical, never dry; he makes the math feel like the story.",
    "Sets up Nova's field reports and lands the takeaway.",
    "Plain over jargon. Defines the term, then uses it.",
    "Even-handed. Names the risk on every call.",
  ],
  values: [
    "Process over outcome. The right read survives a bad beat.",
    "Show the work. Every claim has a receipt.",
    "Calm is a feature. No manufactured urgency.",
  ],
  avoids: [
    "AI tells: 'as an AI', 'in conclusion', 'delve', robotic hedging.",
    "Hype and certainty slang. He never sells a result as decided.",
    "Talking past the audience. The desk explains, it doesn't lecture.",
  ],
  signOn: "At the desk, I'm Orion.",
  signOff: "That's the read from the desk. I'm Orion. Nova, bring us home.",
};

export type Scene = "studio" | "sideline" | "practice" | "clubhouse" | "draft" | "community" | "office";

export const SCENES: Record<Scene, { readonly label: string; readonly setting: string; readonly accent: string }> = {
  studio: { label: "Studio desk", setting: "the Galaxy Studios desk", accent: "#00E5FF" },
  sideline: { label: "Sideline", setting: "field level, warmups behind her", accent: "#FF38C7" },
  practice: { label: "Practice facility", setting: "the practice facility", accent: "#7B61FF" },
  clubhouse: { label: "Clubhouse", setting: "the clubhouse", accent: "#F5F7FF" },
  draft: { label: "Draft floor", setting: "the draft floor", accent: "#00E5FF" },
  community: { label: "In the community", setting: "out with the fans", accent: "#7B61FF" },
  office: { label: "Front office", setting: "the front office", accent: "#9fb3c8" },
};

/** Where the top story is reported FROM, by what kind of news it is. */
function sceneForSignal(signal: SignalType): Scene {
  switch (signal) {
    case "injury-out": case "injury-return": case "weather": return "sideline";
    case "role-up": case "role-down": case "depth-chart": case "scheme": return "practice";
    case "trade": case "suspension": return "office";
  }
}

/** A minimal, serializable reporter tag for a segment (who delivers it). */
export type ReporterTag = {
  readonly name: string;
  readonly role: string;
  /** Single-letter mark for the on-stage avatar. */
  readonly initial: string;
};

export type Segment = {
  readonly id: string;
  readonly scene: Scene;
  readonly kicker: string;
  /** the host's spoken script for this segment */
  readonly script: string;
  /** production note for what's on screen */
  readonly broll: string;
  /** which reporter delivers this segment (Nova in the field, Orion at the desk) */
  readonly reporter: ReporterTag;
};

function reporterTag(p: Persona): ReporterTag {
  return { name: p.name, role: p.role, initial: p.name.charAt(0).toUpperCase() };
}

export type Broadcast = {
  readonly persona: Persona;
  readonly week: number;
  readonly title: string;
  readonly coldOpen: string;
  readonly segments: readonly Segment[];
  readonly signOff: string;
  readonly disclosure: string;
  readonly plaintext: string;
};

export const HOST_DISCLOSURE =
  "Nova and Orion are Galaxy Sports Edge's synthetic presenters. Their scripts are AI-generated and human-reviewed before anything is published; they do not post or reply on their own.";

// ─────────────── publish-readiness pipeline (enforced doctrine) ───────────────

/** What a real publish requires. Set by the operator, never by the AI. */
export type PublishContext = {
  /** a licensed or consented likeness is on file (required for any avatar/video render) */
  readonly likenessConsentOnFile: boolean;
  /** the human who reviewed and approved this specific broadcast */
  readonly humanApprover?: string;
};

export type PublishGate = { readonly id: string; readonly label: string; readonly passed: boolean; readonly note: string };
export type PublishReadiness = { readonly ready: boolean; readonly gates: readonly PublishGate[]; readonly safety: SafetyVerdict };

/**
 * Gate a broadcast before it could ever publish: disclosure present, brand-safety
 * pass, likeness consent on file, and a named human approver. Defaults fail the
 * consent and human gates, so nothing is ever publish-ready autonomously.
 */
export function assessPublishReadiness(broadcast: Broadcast, ctx: PublishContext = { likenessConsentOnFile: false }): PublishReadiness {
  const safety = scanText(broadcast.plaintext);
  const gates: PublishGate[] = [
    { id: "disclosure", label: "AI-presenter disclosure present", passed: broadcast.disclosure.length > 0, note: "Every broadcast must disclose the synthetic presenter." },
    { id: "safety", label: "Brand-safety check passed", passed: safety.verdict === "safe", note: safety.verdict === "safe" ? "No flagged content." : `Flagged: ${safety.categories.join(", ") || "borderline"}.` },
    { id: "consent", label: "Likeness license / consent on file", passed: ctx.likenessConsentOnFile, note: "A licensed or consented likeness is required before any avatar or video render." },
    { id: "human", label: "Human approver signed off", passed: Boolean(ctx.humanApprover), note: ctx.humanApprover ? `Approved by ${ctx.humanApprover}.` : "A human must review and approve before publish." },
  ];
  return { ready: gates.every((g) => g.passed), gates, safety: safety.verdict };
}

export function buildBroadcast(persona: Persona = NOVA): Broadcast {
  const brief = generateWeeklyBrief();
  const week = brief.week;
  const wire = rankWire(DEMO_WIRE);
  const top = wire[0]!;
  const topScene = sceneForSignal(top.item.signal);

  // Two reporters trade segments: Nova works the field, Orion holds the desk.
  const field = reporterTag(persona);
  const desk = reporterTag(ORION);

  const coldOpen = `${persona.signOn} Week ${week} is loaded. Orion's at the desk; let's get you the edge before everybody else does.`;

  const segments: Segment[] = [];

  // 1. Top story. From the field, Nova
  segments.push({
    id: "seg-top",
    scene: topScene,
    kicker: "Top story",
    script: `We start from ${SCENES[topScene].setting}. ${top.item.headline}. Here's what it means for you: ${top.action}`,
    broll: `${SCENES[topScene].label}. Lower-third with the player and the fantasy/market delta.`,
    reporter: field,
  });

  // 2. Waiver wire. From the clubhouse, Nova
  const waiverSection = brief.sections.find((s) => s.heading.startsWith("Waiver"));
  segments.push({
    id: "seg-waivers",
    scene: "clubhouse",
    kicker: "Waiver wire",
    script: `To the clubhouse. Where your week is quietly won. Top of the board: ${waiverSection?.items[0] ?? "no must-adds this week."} Spend where the upside is, not where the points were.`,
    broll: "Clubhouse. Animated FAAB bids ticking up next to each name.",
    reporter: field,
  });

  // 3. Scheme watch. From the practice facility, Nova
  const schemeSection = brief.sections.find((s) => s.heading.startsWith("Scheme"));
  segments.push({
    id: "seg-scheme",
    scene: "practice",
    kicker: "Scheme watch",
    script: `Out at the practice facility, one change is re-pricing a whole offense. ${schemeSection?.items[0] ?? ""} Watch the ripple before the market does. Orion, what does that do to the number?`,
    broll: "Practice facility. Arrows rising/falling over the affected players.",
    reporter: field,
  });

  // 4. The edge. DFS & pick'em from the desk, Orion
  const dfsSection = brief.sections.find((s) => s.heading.startsWith("DFS"));
  const propSection = brief.sections.find((s) => s.heading.startsWith("Pick"));
  segments.push({
    id: "seg-edge",
    scene: "studio",
    kicker: "The edge of the week",
    script: `${ORION.signOn} Here's where the math lands. In DFS: ${dfsSection?.items[0] ?? ""} And the pick'em our model likes most: ${propSection?.items[0] ?? ""} Read the risk, then decide.`,
    broll: "Studio desk. Split screen, leverage dial and the prop distribution.",
    reporter: desk,
  });

  const signOff = persona.signOff;

  const plaintext = [
    `GALAXY STUDIOS. THE GALAXY BRIEF · WEEK ${week}`,
    `Anchors: ${persona.name} (${persona.role}) · ${ORION.name} (${ORION.role})`,
    "",
    `[COLD OPEN · ${SCENES.studio.label}]`,
    coldOpen,
    "",
    ...segments.flatMap((s) => [`[${s.kicker.toUpperCase()} · ${SCENES[s.scene].label} · ${s.reporter.name}]`, s.script, `(B-roll: ${s.broll})`, ""]),
    `[SIGN-OFF · ${SCENES.studio.label}]`,
    signOff,
    "",
    `,  ${HOST_DISCLOSURE}`,
  ].join("\n");

  return {
    persona,
    week,
    title: `The Galaxy Brief. Week ${week}, with ${persona.name}`,
    coldOpen,
    segments,
    signOff,
    disclosure: HOST_DISCLOSURE,
    plaintext,
  };
}
