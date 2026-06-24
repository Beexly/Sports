export interface CinematicShotRule {
  readonly id: string;
  readonly label: string;
  readonly camera: "wide-establishing" | "low-power-angle" | "eye-level-vulnerability" | "slow-push" | "aerial-pullback" | "rack-focus" | "gameplay-pov";
  readonly lighting: "golden-hour" | "neon-night" | "teal-shadow" | "broadcast-glow" | "arena-flood";
  readonly appliesTo: "rookie-plaza" | "beat-wall" | "blacktop" | "depths" | "my-dynasty";
  readonly gameplayPurpose: string;
  readonly ipSafeConstraint: string;
}

export interface LaunchTeaserBeat {
  readonly id: string;
  readonly title: string;
  readonly durationSeconds: number;
  readonly shotRuleIds: readonly string[];
  readonly action: string;
  readonly onScreenText: string;
}

export const CINEMATIC_SHOT_RULES: readonly CinematicShotRule[] = [
  {
    id: "campus-breathes",
    label: "Slow establishing push",
    camera: "slow-push",
    lighting: "golden-hour",
    appliesTo: "rookie-plaza",
    gameplayPurpose: "Establish Rookie Plaza as the account-home floor before the player moves.",
    ipSafeConstraint: "Use Galaxy Campus geometry, no copied city, vehicle, brand, audio, or map assets.",
  },
  {
    id: "coach-power-angle",
    label: "Coach low-angle authority",
    camera: "low-power-angle",
    lighting: "broadcast-glow",
    appliesTo: "rookie-plaza",
    gameplayPurpose: "Make the first mentor interaction feel like a mission handoff.",
    ipSafeConstraint: "Original NPC silhouette and dialogue only.",
  },
  {
    id: "beat-ledger-rack",
    label: "Ledger rack focus",
    camera: "rack-focus",
    lighting: "teal-shadow",
    appliesTo: "beat-wall",
    gameplayPurpose: "Make source proof and route urgency readable as a spatial instrument.",
    ipSafeConstraint: "No real sportsbook or league marks; all pulse labels stay fictional or provenance-based.",
  },
  {
    id: "blacktop-pov-rep",
    label: "Blacktop gameplay POV",
    camera: "gameplay-pov",
    lighting: "arena-flood",
    appliesTo: "blacktop",
    gameplayPurpose: "Show Signal Sprint as playable skill repetition, not a menu card.",
    ipSafeConstraint: "Court, prompts, and player marks are original Galaxy assets.",
  },
  {
    id: "depths-danger-push",
    label: "Depths danger push",
    camera: "slow-push",
    lighting: "neon-night",
    appliesTo: "depths",
    gameplayPurpose: "Frame cognitive-bias bosses as PvM encounters.",
    ipSafeConstraint: "No named GTA missions, characters, weapons, city names, or UI sounds.",
  },
  {
    id: "dynasty-aerial-pullback",
    label: "Safehouse progress pullback",
    camera: "aerial-pullback",
    lighting: "golden-hour",
    appliesTo: "my-dynasty",
    gameplayPurpose: "Show the player account becoming permanent through earned progress.",
    ipSafeConstraint: "Original safehouse metaphor; no copied interiors or brand props.",
  },
];

export const LAUNCH_TEASER_BEATS: readonly LaunchTeaserBeat[] = [
  {
    id: "open-campus",
    title: "Rookie Plaza opens",
    durationSeconds: 4,
    shotRuleIds: ["campus-breathes"],
    action: "Camera pushes across the signal ring, district gates, and disclosed ghost routes.",
    onScreenText: "Build your dynasty from the floor.",
  },
  {
    id: "mission-handoff",
    title: "Coach Signal handoff",
    durationSeconds: 5,
    shotRuleIds: ["coach-power-angle"],
    action: "Coach Signal gives the player the First Signal route while the quest board pulses behind him.",
    onScreenText: "Proof first. Confidence second.",
  },
  {
    id: "beat-proof",
    title: "The Beat turns into an instrument",
    durationSeconds: 5,
    shotRuleIds: ["beat-ledger-rack"],
    action: "Broadcast rings, source ticks, urgency towers, and route trails animate in sequence.",
    onScreenText: "The city has a signal.",
  },
  {
    id: "blacktop-rep",
    title: "Signal Sprint rep",
    durationSeconds: 4,
    shotRuleIds: ["blacktop-pov-rep"],
    action: "Player moves on the Blacktop court and advances prompts with a tight input rhythm.",
    onScreenText: "Train the read.",
  },
  {
    id: "depths-boss",
    title: "Public Trap appears",
    durationSeconds: 5,
    shotRuleIds: ["depths-danger-push"],
    action: "The Public Trap boss card resolves from neon fog into value-choice buttons.",
    onScreenText: "Fight bad logic.",
  },
  {
    id: "dynasty-close",
    title: "My Dynasty pullback",
    durationSeconds: 4,
    shotRuleIds: ["dynasty-aerial-pullback"],
    action: "The safehouse wall shows quests, inventory, skills, reputation, and earned routes.",
    onScreenText: "Keep what you earn.",
  },
];
