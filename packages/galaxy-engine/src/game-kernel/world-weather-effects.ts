import { SPORTS_WEATHER } from "../world/sports-weather.js";
import type { WeatherGameplayEffect } from "./types.js";

export const WEATHER_GAMEPLAY_EFFECTS: readonly WeatherGameplayEffect[] = SPORTS_WEATHER.map((weather) => ({
  weatherId: weather.id,
  lighting: `${weather.name} shifts Rookie Plaza accent lighting to ${weather.accent}.`,
  npcDialogueTone: `${weather.name} changes NPC route hints toward ${weather.affectedDistricts[0]}.`,
  questAvailability: ["open-daily-route", weather.id === "rookie_heat" ? "read-rookie-heat" : "inspect-proof-kiosk"],
  cardState: weather.cardPrompts[0] ?? "No card-state route today.",
  bossRotation: weather.bossRotation,
  districtPriority: weather.affectedDistricts,
  gsePrompt: weather.gsePrompt,
  broadcastEvent: `${weather.name} leads The Beat broadcast wall.`,
}));

export function weatherEffectFor(id: string): WeatherGameplayEffect | null {
  return WEATHER_GAMEPLAY_EFFECTS.find((effect) => effect.weatherId === id) ?? null;
}
