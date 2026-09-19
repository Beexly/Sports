# NFL Weather Data Sources + Prop Impact Mapping Reference

## Purpose
Research guide for sourcing NFL game-day weather data and mapping how wind, precipitation, temperature, and venue type (dome/outdoor) impact **kicking props**, **passing props**, and **rushing props**. Compiled from NFLverse data, academic research, and industry analysis sources.

## Part 1: NFL Weather Data Sources

### 1.1 Primary Programmatic Data (Play-by-Play + Schedule)

| Source | Package/Tool | Weather Fields | Time Span | Notes |
|--------|-------------|----------------|-----------|-------|
| **nflreadr** (R) / **nfl_data_py** (Python) | load_schedules() | roof (outdoors/open/closed/dome), temp (deg F, outdoor only), wind (mph, outdoor only), surface | 2009-present | Game-level. Free, maintained by NFLverse. **Recommended starting point.** |
| **nflfastR** (R) / **nfl_data_py** (Python) | fast_scraper() / import_pbp() | weather (text), temp, wind, roof | 2009-present | Play-by-play level. Same source as nflreadr but at play granularity. |

**Data Dictionary (nflreadr schedules):**
- roof: outdoors, open (retractable open), closed (retractable closed), dome (fixed)
- temp: numeric, degrees Fahrenheit, only for roof=outdoors/open (NA for dome/closed)
- wind: numeric, mph, only for roof=outdoors/open (NA for dome/closed)
- surface: field surface type (grass, various synthetic turfs)

**Python example:**


### 1.2 Historical/Research Weather Datasets

| Source | Type | Weather Fields | Time Span | Access |
|--------|------|---------------|-----------|--------|
| ThompsonJamesBliss/WeatherData (GitHub) | Static CSV archive | Temperature, DewPoint, Humidity, Precipitation, WindSpeed, WindDirection, Pressure | 2000-2020 | Free: https://github.com/ThompsonJamesBliss/WeatherData |
| Meteostat API (v2) | Free weather API | temp, dew point, humidity, precipitation, wind speed, wind direction, pressure, gusts | Global, hourly+daily | Free registration (2,000 queries/day): https://api.meteostat.net/ |
| forrest-fan/nfl-weather-analysis (GitHub) | Analysis repo | Scrapes NFLWeather.com | Various | https://github.com/forrest-fan/nfl-weather-analysis |

### 1.3 Real-Time Forecast & Historical Lookup (Web)

| Source | Weather Fields | Notes |
|--------|---------------|-------|
| NFLWeather.com | Temp, wind speed, wind direction, precip prob, conditions | Micro-forecasts per stadium, updated 2x/hr. Historical DB. Free w/ citation. |
| Rotowire NFL Weather | Temp, precip %, wind speed/direction, hourly | Fantasy-focused, hourly breakout |
| Rotogrinders NFL Weather | Temp, precip, wind, total line | Daily fantasy + odds |
| Covers NFL Weather | Temp, wind, precip, conditions | Betting-focused |
| Visual Crossing Weather API | Full meteorological suite | Historical + forecast, paid/free tiers |
| National Weather Service API | Temp, wind, precip, alerts | US-only, free, no key |
| Pro-Football-Reference | Temp, wind (box scores) | Scrapable. Source for nflreadr |

### 1.4 Key Considerations
- Dome games: temp/wind set to 72F/0mph or NA. Filter by roof field.
- Wind direction matters: crosswinds harder than headwinds (see Section 3.1).
- Stadium azimuth available in ThompsonJamesBliss dataset (0=N, 90=E, 180=S, 270=W) to determine wind orientation.
- Data fusion: combine nflreadr with NFLWeather/Meteostat for humidity, dew point, pressure.

### Workflow Recommendation
1. nflreadr::load_schedules() for game-level temp/wind/roof
2. Supplement humidity/wind direction/precip from NFLWeather.com or Meteostat
3. Join to play-by-play via game_id
4. Historical: use ThompsonJamesBliss/WeatherData archive
5. Current/future: NFLWeather.com forecasts + weather.gov station data
