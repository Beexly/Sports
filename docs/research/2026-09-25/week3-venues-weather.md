# Week 3 DFS Deep Dive — LANE A: Venues + Weather

Slate: DraftKings NFL $15K Sun-Mon Special, Sun 9/27 – Mon 9/28, 2026. All times CT unless noted.

## Data provenance
- **Weather source:** Open-Meteo hourly forecast API (default model blend), pulled **Fri 9/25/2026 ~2:35pm CT**. Fields: temp (°F), precipitation probability, precipitation (in), WMO weathercode, wind speed/direction and gusts (mph) at 10m.
- **Stadium facts:** cross-checked via web 9/25/2026 — NBC Sports stadium surface roundup (~Aug 2026), Sporting News 2026 turf list, Bills official site + Reuters (new Highmark Stadium), dallascowboys.com + ESPN (Maracanã), clevelandbrowns.com (Huntington Bank Field).
- **Caveat:** forecasts are 2–3 days out and WILL shift. Recheck Saturday evening and again Sunday morning. Roof positions for retractable-roof venues are unverified unless noted.

## Flag summary (wind 15+ mph sustained, heavy rain, or both)

| Game | Flag | Detail |
|---|---|---|
| TEN@NYG | ⚠️ WET + WINDY | Rain likely all game (ppop ~92%, ~0.15"), gusts to 31 mph. Confirms DK's preliminary rain call — independently verified. |
| SEA@WAS | ⚠️ WATCH | Drizzle/light rain likely (ppop ~60%, ~0.12"), gusts to 30 mph. Borderline. |
| LAC@BUF | ⚠️ WIND | Sustained 15–17 mph, gusts 22 mph, dry. New open-air stadium (canopy covers seats, field exposed). Kicking concern. |
| LAR@DEN | ⚠️ WIND (early) | 22 mph sustained at 6pm MT, gusts 26 mph; drops sharply after ~7pm MT. Early-window kicking concern. |

All other games: no weather flags. CAR@CLE is breezy (13 mph, gusts 18) but below the flag threshold.

---

## Sunday 12:00pm CT games (all 1:00pm ET local)

### KC@MIA — Hard Rock Stadium, Miami Gardens, FL
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (ET):** 1pm 90°F clear, wind 9mph; 2pm 90°F mainly clear, 8mph; 3pm 89°F partly cloudy, 7mph; 4pm 88°F overcast, 6mph; 5pm 88°F overcast, 6mph. Ppop ≤9%, no rain.
- **Verdict:** hot, calm, dry. No flag.

### NYJ@DET — Ford Field, Detroit, MI
- **Roof:** fixed dome. **Surface:** turf. **Weather: N/A (enclosed).**

### CAR@CLE — Huntington Bank Field, Cleveland, OH
- **Roof:** open-air. **Surface:** natural grass. (Naming-rights deal 9/3/2024; name applies to current lakefront stadium and any future Brook Park stadium.)
- **Hourly (ET):** 1pm 69°F overcast, wind 13mph; 2pm 68°F overcast, 12mph; 3pm 67°F overcast, 11mph; 4pm 66°F overcast, 11mph; 5pm 66°F overcast, 10mph. Ppop 0%, no rain. Gusts to 18mph.
- **Verdict:** breezy but below flag threshold. No flag.

### HOU@IND — Lucas Oil Stadium, Indianapolis, IN
- **Roof:** retractable. **Surface:** turf. **Weather: N/A if closed.**
- **Roof position unverified** — typically open in September when weather permits; no official word found as of 9/25. If open, Indianapolis outdoor conditions apply (recheck if roof news breaks).

### TEN@NYG — MetLife Stadium, East Rutherford, NJ
- **Roof:** open-air. **Surface:** turf. (Temporary World Cup grass removed; turf for NFL season per NBC Sports.)
- **Hourly (ET):**

| Time | Temp | Cond | Ppop | Rain | Wind | Gust |
|---|---|---|---|---|---|---|
| 1pm | 65°F | Light drizzle | 91% | 0.01" | 14 mph ENE | 31 mph |
| 2pm | 65°F | Light drizzle | 91% | 0.01" | 12 mph ENE | 27 mph |
| 3pm | 64°F | Light drizzle | 92% | 0.02" | 11 mph NE | 23 mph |
| 4pm | 63°F | Light showers | 92% | 0.08" | 13 mph NE | 24 mph |
| 5pm | 61°F | Heavy drizzle | 92% | 0.04" | 15 mph NE | 28 mph |

- **Verdict:** ⚠️ **WET + WINDY.** Rain likely throughout (~0.15" total), gusts 23–31 mph. Passing/kicking downgrade for both sides. This independently confirms the preliminary rain DK showed.

### SEA@WAS — Northwest Stadium, Landover, MD
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (ET):**

| Time | Temp | Cond | Ppop | Rain | Wind | Gust |
|---|---|---|---|---|---|---|
| 1pm | 63°F | Overcast | 59% | 0.00" | 11 mph NNW | 27 mph |
| 2pm | 61°F | Light drizzle | 59% | 0.01" | 12 mph NNW | 29 mph |
| 3pm | 59°F | Drizzle | 62% | 0.03" | 12 mph NNW | 29 mph |
| 4pm | 59°F | Light rain | 62% | 0.05" | 13 mph NNW | 30 mph |
| 5pm | 59°F | Drizzle | 62% | 0.03" | 13 mph NNW | 30 mph |

- **Verdict:** ⚠️ **WATCH.** Wet-dominant game (~0.12" total, ppop ~60%), gusts to 30 mph. Borderline flag — could matter for kicking; recheck Saturday.

### LAC@BUF — Highmark Stadium (NEW), Orchard Park, NY
- **Roof:** open-air with canopy over ~64% of seats — **playing field fully exposed**. **Surface:** natural grass (heated; Bills switched from turf to grass in the new building). First season in the new stadium (opened summer 2026; 2026-09-17 home opener vs DET was Week 2).
- **Hourly (ET):**

| Time | Temp | Cond | Ppop | Rain | Wind | Gust |
|---|---|---|---|---|---|---|
| 1pm | 67°F | Clear | 1% | 0.00" | 15 mph NNE | 21 mph |
| 2pm | 67°F | Partly cloudy | 1% | 0.00" | 17 mph NNE | 21 mph |
| 3pm | 64°F | Overcast | 9% | 0.00" | 15 mph NNE | 20 mph |
| 4pm | 62°F | Overcast | 9% | 0.00" | 15 mph NNE | 20 mph |
| 5pm | 58°F | Light drizzle | 9% | 0.01" | 13 mph NE | 22 mph |

- **Verdict:** ⚠️ **WIND.** Sustained 15–17 mph out of the NNE, gusts 20–22 mph, dry. Kicking downgrade; mild passing effect. New-stadium wind patterns unverified (first season).

### NE@JAX — EverBank Stadium, Jacksonville, FL
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (ET):** 1pm 90°F clear, wind 8mph; 2pm 90°F mainly clear, 7mph; 3pm 89°F partly cloudy, 6mph; 4pm 88°F overcast, 6mph; 5pm 87°F overcast, 6mph. Ppop 0%, no rain.
- **Verdict:** hot, calm, dry. No flag.

### CIN@PIT — Acrisure Stadium, Pittsburgh, PA
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (ET):** 1pm 72°F overcast, wind 11mph; 2pm 71°F overcast, 10mph; 3pm 70°F overcast, 9mph; 4pm 69°F overcast, 9mph; 5pm 69°F overcast, 8mph. Ppop ≤3%, no rain. Gusts to 17mph.
- **Verdict:** calm, dry. No flag.

---

## Sunday 3:05pm CT games

### MIN@TB — Raymond James Stadium, Tampa, FL (4:05pm ET)
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (ET):** 4pm 86°F overcast, wind 8mph; 5pm 84°F overcast, 7mph; 6pm 82°F overcast, 6mph; 7pm 81°F overcast, 6mph; 8pm 80°F overcast, 5mph. Ppop 0%, no rain.
- **Verdict:** warm, calm, dry. No flag.

### ARI@SF — Levi's Stadium, Santa Clara, CA (2:05pm PT)
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (PT):** 2pm 74°F clear, wind 12mph; 3pm 73°F clear, 11mph; 4pm 72°F clear, 10mph; 5pm 70°F clear, 9mph; 6pm 68°F clear, 8mph. Ppop ≤2%, no rain.
- **Verdict:** ideal. No flag.

---

## Sunday 3:25pm CT games

### LV@NO — Caesars Superdome, New Orleans, LA (3:25pm CT)
- **Roof:** fixed dome. **Surface:** turf. **Weather: N/A (enclosed).**

### BAL@DAL — Maracanã, Rio de Janeiro, Brazil (5:25pm BRT)
- **Roof:** open-air. **Surface:** natural grass. (NFL's first game in Rio; Cowboys designated home team; 3:25pm CT / 4:25pm ET kickoff on CBS. ~78,000 capacity.)
- **Hourly (BRT):** 5pm 71°F overcast, wind 6mph; 6pm 71°F overcast, 5mph; 7pm 70°F light drizzle, 5mph; 8pm 70°F overcast, 5mph; 9pm 70°F overcast, 5mph. Ppop ≤2%, no meaningful rain. Gusts to 15mph.
- **Verdict:** mild, calm. No flag. (Southern-hemisphere late-September evening; no heat/humidity concern per this forecast.)

---

## Sunday 7:20pm CT game

### LAR@DEN — Empower Field at Mile High, Denver, CO (6:20pm MT)
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (MT):**

| Time | Temp | Cond | Ppop | Rain | Wind | Gust |
|---|---|---|---|---|---|---|
| 6pm | 80°F | Overcast | 0% | 0.00" | 22 mph SSE | 26 mph |
| 7pm | 78°F | Overcast | 1% | 0.00" | 13 mph SSW | 22 mph |
| 8pm | 74°F | Light drizzle | 1% | 0.01" | 7 mph NNW | 8 mph |
| 9pm | 68°F | Light drizzle | 1% | 0.00" | 11 mph N | 14 mph |
| 10pm | 68°F | Light drizzle | 1% | 0.00" | 6 mph N | 8 mph |

- **Verdict:** ⚠️ **WIND (early window).** 22 mph sustained with 26 mph gusts at kickoff, dropping sharply after ~7pm MT. First-quarter/early kicking and deep passing affected; conditions improve markedly in the second half. Dry throughout.

---

## Monday 7:15pm CT game

### PHI@CHI — Soldier Field, Chicago, IL (7:15pm CT)
- **Roof:** open-air. **Surface:** natural grass.
- **Hourly (CT):** 7pm 64°F partly cloudy, wind 5mph; 8pm 64°F partly cloudy, 5mph; 9pm 63°F overcast, 5mph; 10pm 63°F overcast, 4mph; 11pm 62°F clear, 4mph. Ppop 0%, no rain.
- **Verdict:** calm, dry, cool. No flag.

---

## Recheck schedule
- Forecasts pulled Fri 9/25 ~2:35pm CT. **Recheck Sat 9/26 evening** (model convergence) and **Sun 9/27 morning** (game-day). Priority rechecks: TEN@NYG (rain timing/amounts), SEA@WAS (does the drizzle verify?), LAC@BUF + LAR@DEN (wind), Lucas Oil roof status if news breaks.
