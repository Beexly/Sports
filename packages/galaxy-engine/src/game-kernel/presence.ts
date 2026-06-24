import type { DistrictReputationDef, GhostPresenceDef } from "./types.js";

export const GHOST_PRESENCE: readonly GhostPresenceDef[] = [
  { id: "ghost-rival", label: "Ghost Rival", role: "practice route", disclosedAs: "ghost", path: [{ x: 2.4, y: 0, z: 0.6 }, { x: 4.8, y: 0, z: 4.8 }, { x: 0.8, y: 0, z: 5.6 }], dialogue: "Ghost route active. I am not a live player." },
  { id: "ai-scout", label: "AI Scout", role: "context walker", disclosedAs: "ai", path: [{ x: -4.8, y: 0, z: -2.2 }, { x: -2.4, y: 0, z: -5.2 }], dialogue: "Scout route checking context." },
  { id: "ai-collector", label: "AI Collector", role: "vault loop", disclosedAs: "ai", path: [{ x: 4.7, y: 0, z: -2.2 }, { x: 3.1, y: 0, z: -3.8 }], dialogue: "Collection route is fictional and account-bound." },
  { id: "ai-crew-recruiter", label: "AI Crew Recruiter", role: "crew board", disclosedAs: "ai", path: [{ x: -4.1, y: 0, z: 3.8 }, { x: -5.7, y: 0, z: 5.1 }], dialogue: "Crew lanes are open for earned contribution." },
  { id: "ai-sharp", label: "AI Sharp", role: "proof route", disclosedAs: "ai", path: [{ x: -2.7, y: 0, z: -4.8 }, { x: -5.1, y: 0, z: -2.4 }], dialogue: "Proof first. Confidence second." },
  { id: "ai-grinder", label: "AI Grinder", role: "blacktop loop", disclosedAs: "ai", path: [{ x: 4.1, y: 0, z: 3.8 }, { x: 5.9, y: 0, z: 4.6 }], dialogue: "Short reps build repeatable discipline." },
  { id: "ai-broadcaster", label: "AI Broadcaster", role: "Beat route", disclosedAs: "ai", path: [{ x: 1.3, y: 0, z: -5.2 }, { x: 2.7, y: 0, z: -4.7 }], dialogue: "The Beat is carrying the active weather route." },
];

export const DISTRICT_REPUTATION: readonly DistrictReputationDef[] = [
  { districtId: "war-room", label: "War Room Rep", startingReputation: 5, earnedByQuestIds: ["first-signal", "inspect-proof-kiosk"] },
  { districtId: "vault", label: "Vault Rep", startingReputation: 3, earnedByQuestIds: ["claim-rookie-signal-card", "track-card-heat"] },
  { districtId: "crew-hall", label: "Crew Hall Rep", startingReputation: 2, earnedByQuestIds: ["join-the-crew-board", "choose-crew-role"] },
  { districtId: "blacktop", label: "Blacktop Rep", startingReputation: 2, earnedByQuestIds: ["run-the-blacktop"] },
  { districtId: "depths", label: "Depths Rep", startingReputation: 1, earnedByQuestIds: ["face-the-public-trap"] },
  { districtId: "war-room", label: "Proof Rep", startingReputation: 4, earnedByQuestIds: ["learn-proof-stamp", "inspect-proof-kiosk"] },
  { districtId: "season-gate", label: "Season Gate Rep", startingReputation: 2, earnedByQuestIds: ["check-the-season-gate", "open-daily-route"] },
];
