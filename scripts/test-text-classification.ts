import * as fs from "node:fs";

const content = fs.readFileSync("packages/prediction-engine/data/MIND_CORPUS_3000.jsonl", "utf8");
const lines = content.trim().split("\n");

let mappedCount = 0;
const fieldCounts: Record<string, number> = {};

for (const line of lines) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line);
  const text = `${rec.title || ""} ${rec.principle_or_feature || rec.principle_name || ""} ${rec.evidence_quote || ""} ${rec.how_it_influences_reasoning || ""}`.toLowerCase();

  const newFields = new Set<string>();

  if (/4th.*down|fourth.*down|romer|coach.*aggress|blame.*avoidance|go.*for.*it/i.test(text)) {
    newFields.add("coach_fourth_down_aggressiveness_pct");
  }
  if (/workload|acwr|gabbett|acute.*chronic|training.*load|fatigue.*spike|injury.*hazard|neuromuscular|tissue.*injury/i.test(text)) {
    newFields.add("acute_chronic_workload_ratio");
  }
  if (/acoustic|crowd.*noise|decibel|sound.*level|spl|false.*start|silent.*count|stadium.*noise/i.test(text)) {
    newFields.add("acoustic_crowd_spl_db");
  }
  if (/temperature|cold|freeze|freezing|sub.*zero|thermal.*drag|chill/i.test(text)) {
    newFields.add("ambient_temp_fahrenheit");
  }
  if (/wind|aerodynamic|crosswind|gust|drag.*coeff/i.test(text)) {
    newFields.add("wind_speed_mph");
  }
  if (/rest.*differential|bye.*week|short.*rest|short.*week|schedule.*rest/i.test(text)) {
    newFields.add("rest_differential_days");
  }
  if (/circadian|time.*zone|body.*clock|jet.*lag|travel.*fatigue/i.test(text)) {
    newFields.add("circadian_travel_timezones");
  }
  if (/pass.*rush|pocket.*strain|offensive.*line|pass.*protect|trench|blocker.*survival/i.test(text)) {
    newFields.add("ol_continuity_shared_snaps_pct");
  }
  if (/altitude|mile.*high|elevation|hypoxia/i.test(text)) {
    newFields.add("altitude_feet");
  }
  if (/steam|line.*move|velocity.*pts/i.test(text)) {
    newFields.add("market_steam_velocity_pts_hr");
  }
  if (/reverse.*line|rlm|handle.*diverg|sharp.*money|public.*ticket/i.test(text)) {
    newFields.add("reverse_line_movement_divergence_pct");
  }
  if (/referee|officiating|holding.*penalt|penalty.*rate|flag.*rate|crew.*penalt/i.test(text)) {
    newFields.add("officiating_crew_penalty_rate");
  }

  if (newFields.size > 0) {
    mappedCount++;
    for (const f of newFields) {
      fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    }
  }
}

console.log("Total records cleanly categorized:", mappedCount, "out of", lines.length);
console.log("New Field Counts:", fieldCounts);
