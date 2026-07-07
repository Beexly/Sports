import type { GseContentPillar } from "./content-pillars";
import type { MediaPlatform } from "./platform-strategy";

export interface MediaCalendarSlot {
  readonly dayOfWeek: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  readonly platform: MediaPlatform;
  readonly pillar: GseContentPillar;
  readonly titlePattern: string;
  readonly primaryGoal: "reach" | "authority" | "conversion" | "partnership" | "retention";
}

export const DEFAULT_WEEKLY_MEDIA_CALENDAR: readonly MediaCalendarSlot[] = [
  { dayOfWeek: "MON", pillar: "loss_autopsy", platform: "youtube_long", primaryGoal: "authority", titlePattern: "Weekend Autopsy: [game/signal] taught us [lesson]" },
  { dayOfWeek: "MON", pillar: "loss_autopsy", platform: "youtube_short", primaryGoal: "reach", titlePattern: "One lesson from the weekend autopsy" },
  { dayOfWeek: "MON", pillar: "decision_psychology", platform: "instagram_reel", primaryGoal: "reach", titlePattern: "The decision trap from this slate" },
  { dayOfWeek: "TUE", pillar: "founder_build_log", platform: "linkedin", primaryGoal: "partnership", titlePattern: "GSE build log: what actually moved" },
  { dayOfWeek: "TUE", pillar: "partner_tool_review", platform: "x_thread", primaryGoal: "partnership", titlePattern: "Partner outreach and tool fit notes" },
  { dayOfWeek: "WED", pillar: "market_mirage", platform: "youtube_long", primaryGoal: "authority", titlePattern: "Market Mirage: why [public story] may be incomplete" },
  { dayOfWeek: "WED", pillar: "market_mirage", platform: "youtube_short", primaryGoal: "reach", titlePattern: "Line movement is a question, not proof" },
  { dayOfWeek: "WED", pillar: "no_bet_clinic", platform: "tiktok", primaryGoal: "reach", titlePattern: "Why GSE passed" },
  { dayOfWeek: "THU", pillar: "player_signal_lab", platform: "newsletter", primaryGoal: "conversion", titlePattern: "Player Signal Lab: role before box score" },
  { dayOfWeek: "THU", pillar: "player_signal_lab", platform: "instagram_carousel", primaryGoal: "authority", titlePattern: "Role signal checklist" },
  { dayOfWeek: "FRI", pillar: "board_meeting", platform: "newsletter", primaryGoal: "retention", titlePattern: "The GSE Board Meeting" },
  { dayOfWeek: "FRI", pillar: "board_meeting", platform: "youtube_short", primaryGoal: "reach", titlePattern: "What shipped, broke, or changed" },
  { dayOfWeek: "FRI", pillar: "no_bet_clinic", platform: "instagram_reel", primaryGoal: "reach", titlePattern: "No-bet clinic before the slate" },
  { dayOfWeek: "SAT", pillar: "no_bet_clinic", platform: "youtube_short", primaryGoal: "reach", titlePattern: "The smartest play may be no play" },
  { dayOfWeek: "SAT", pillar: "founder_build_log", platform: "x_thread", primaryGoal: "authority", titlePattern: "Founder note: pressure, proof, and progress" },
  { dayOfWeek: "SUN", pillar: "gse_lab", platform: "newsletter", primaryGoal: "conversion", titlePattern: "Batch scripts, thumbnails, and next board agenda" },
] as const;
