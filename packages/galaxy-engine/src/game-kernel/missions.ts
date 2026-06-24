import type { MissionDef } from "./types.js";
import { getQuest } from "./quests.js";
import { routeForDistrict } from "./world-map.js";

const rewardForQuest = (questId: string) => getQuest(questId)?.rewards ?? null;

export const MISSIONS: readonly MissionDef[] = [
  { id: "mission-first-signal", title: "First Signal", cadence: "main", districtId: "academy", summary: "Talk to Coach Signal, answer a short sports-intelligence prompt, and claim the first card.", questIds: ["first-signal"], rewards: rewardForQuest("first-signal"), routeTarget: routeForDistrict("war-room") },
  { id: "mission-rookie-route", title: "Rookie Route", cadence: "daily", districtId: "stadium-gates", summary: "Follow today's sports-weather route across three Campus stops.", questIds: ["open-daily-route", "inspect-proof-kiosk", "visit-the-vault"], rewards: rewardForQuest("open-daily-route"), routeTarget: routeForDistrict("stadium-gates") },
  { id: "mission-vault-initiation", title: "Vault Initiation", cadence: "side", districtId: "vault", summary: "Inspect fictional card-state lessons and keep the collection rights-safe.", questIds: ["claim-rookie-signal-card", "track-card-heat"], rewards: rewardForQuest("track-card-heat"), routeTarget: routeForDistrict("vault") },
  { id: "mission-crew-first-lane", title: "Crew First Lane", cadence: "crew", districtId: "crew-hall", summary: "Meet the Crew Captain and choose a contribution lane.", questIds: ["join-the-crew-board", "choose-crew-role"], rewards: rewardForQuest("choose-crew-role"), routeTarget: routeForDistrict("crew-hall") },
  { id: "mission-depths-initiation", title: "Depths Initiation", cadence: "weekly", districtId: "depths", summary: "Route to the Depths and face the first bad-logic boss.", questIds: ["face-the-public-trap"], rewards: rewardForQuest("face-the-public-trap"), routeTarget: routeForDistrict("depths") },
  { id: "mission-weather-watch", title: "Sports Weather Watch", cadence: "weather", districtId: "war-room", summary: "Read the active weather and map how it changes the route.", questIds: ["read-rookie-heat", "mark-injury-fog", "check-market-whiplash"], rewards: rewardForQuest("read-rookie-heat"), routeTarget: routeForDistrict("war-room") },
  { id: "mission-blacktop-rep", title: "Blacktop Rep", cadence: "district", districtId: "blacktop", summary: "Run one quick decision drill and bring the lesson back to the profile.", questIds: ["run-the-blacktop"], rewards: rewardForQuest("run-the-blacktop"), routeTarget: routeForDistrict("blacktop") },
];
