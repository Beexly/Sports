"""
Stadium Microclimate & Environmental Aerodynamics Engine
========================================================
Physics-conditioned environmental adjustments for NFL game totals,
passing efficiency, and field goal distributions.

Features:
- Aerodynamic stadium geometry (Open-air, Dome, Retractable Roof)
- High-wind suppression: -0.18 pts/mph for sustained winds > 14.0 mph
- Passing air-yardage decay factor under atmospheric crosswinds
- Temperature / Dew Point / Relative Humidity thermal fatigue
- Field surface friction index (Natural Grass vs Artificial Turf)
"""

from __future__ import annotations
import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any


@dataclass(frozen=True)
class StadiumProfile:
    name: str
    city: str
    roof_type: str  # "dome", "open_air", "retractable"
    surface: str    # "grass", "turf"
    elevation_ft: float
    wind_swirl_factor: float  # Multiplier for stadium bowl aerodynamics
    baseline_temp_f: float


# Registry of NFL Stadiums and aerodynamic profiles
STADIUM_REGISTRY: Dict[str, StadiumProfile] = {
    "Buffalo": StadiumProfile(
        name="Highmark Stadium",
        city="Orchard Park, NY",
        roof_type="open_air",
        surface="turf",
        elevation_ft=600.0,
        wind_swirl_factor=1.25, # Swirling winds off Lake Erie
        baseline_temp_f=55.0
    ),
    "Chicago": StadiumProfile(
        name="Soldier Field",
        city="Chicago, IL",
        roof_type="open_air",
        surface="grass",
        elevation_ft=596.0,
        wind_swirl_factor=1.20, # Lake Michigan crosswinds
        baseline_temp_f=58.0
    ),
    "London": StadiumProfile(
        name="Tottenham Hotspur Stadium",
        city="London, UK",
        roof_type="open_air", # Partial canopy
        surface="turf",
        elevation_ft=45.0,
        wind_swirl_factor=0.90, # Enclosed bowl shields crosswinds
        baseline_temp_f=60.0
    ),
    "Tampa Bay": StadiumProfile(
        name="Raymond James Stadium",
        city="Tampa, FL",
        roof_type="open_air",
        surface="grass",
        elevation_ft=20.0,
        wind_swirl_factor=1.00,
        baseline_temp_f=84.0 # High thermal / humidity load
    ),
    "New York": StadiumProfile(
        name="MetLife Stadium",
        city="East Rutherford, NJ",
        roof_type="open_air",
        surface="turf",
        elevation_ft=7.0,
        wind_swirl_factor=1.15, # Meadowlands wind tunnels
        baseline_temp_f=62.0
    ),
    "Houston": StadiumProfile(
        name="NRG Stadium",
        city="Houston, TX",
        roof_type="retractable", # Default closed in humid heat
        surface="turf",
        elevation_ft=43.0,
        wind_swirl_factor=0.00, # Climate controlled when closed
        baseline_temp_f=72.0
    ),
    "Philadelphia": StadiumProfile(
        name="Lincoln Financial Field",
        city="Philadelphia, PA",
        roof_type="open_air",
        surface="grass",
        elevation_ft=10.0,
        wind_swirl_factor=1.10,
        baseline_temp_f=65.0
    ),
    "Baltimore": StadiumProfile(
        name="M&T Bank Stadium",
        city="Baltimore, MD",
        roof_type="open_air",
        surface="grass",
        elevation_ft=33.0,
        wind_swirl_factor=1.05,
        baseline_temp_f=66.0
    ),
    "Detroit": StadiumProfile(
        name="Ford Field",
        city="Detroit, MI",
        roof_type="dome", # Permanent dome
        surface="turf",
        elevation_ft=600.0,
        wind_swirl_factor=0.00, # 0 wind inside
        baseline_temp_f=72.0
    )
}

WIND_THRESHOLD_MPH = 14.0
WIND_TOTAL_DECAY_RATE = 0.18  # -0.18 points per mph above 14 mph
WIND_PASSING_YARDAGE_DECAY = 0.016  # 1.6% air-yardage shrinkage per mph > 14 mph


@dataclass(frozen=True)
class MicroclimateImpact:
    stadium: str
    roof_type: str
    effective_wind_mph: float
    effective_temp_f: float
    humidity_pct: float
    total_adjustment_pts: float
    passing_shrinkage_factor: float
    fg_distance_penalty_yds: float
    thermal_fatigue_index: float
    climate_regime: str  # "DOME_NEUTRAL", "CALM_FAIR", "HIGH_WIND_DECAY", "THERMAL_FATIGUE", "FREEZING_COLD"


class StadiumMicroclimateEngine:
    """
    Environmental aerodynamics and stadium microclimate engine.
    Calculates physically grounded adjustments to points, pass EPA, and player props.
    """

    @classmethod
    def get_stadium_profile(cls, venue: str) -> StadiumProfile:
        """Looks up stadium profile by city or team name, defaulting to open-air neutral."""
        for key, profile in STADIUM_REGISTRY.items():
            if key.lower() in venue.lower() or profile.name.lower() in venue.lower():
                return profile
        return StadiumProfile(
            name=venue,
            city="Unknown",
            roof_type="open_air",
            surface="turf",
            elevation_ft=500.0,
            wind_swirl_factor=1.0,
            baseline_temp_f=65.0
        )

    @classmethod
    def evaluate_microclimate(
        cls,
        venue: str,
        wind_mph: float = 5.0,
        temp_f: float = 68.0,
        humidity_pct: float = 50.0,
        precip_type: str = "none",  # "none", "rain", "snow"
        roof_forced_closed: bool = False
    ) -> MicroclimateImpact:
        """
        Computes the complete microclimate impact vector for a game venue.
        """
        profile = cls.get_stadium_profile(venue)

        # Domes and closed retractable roofs eliminate all atmospheric wind and precipitation
        if profile.roof_type == "dome" or (profile.roof_type == "retractable" and (roof_forced_closed or temp_f > 82.0 or wind_mph > 15.0)):
            return MicroclimateImpact(
                stadium=profile.name,
                roof_type="dome",
                effective_wind_mph=0.0,
                effective_temp_f=72.0,
                humidity_pct=45.0,
                total_adjustment_pts=0.0,
                passing_shrinkage_factor=1.0,
                fg_distance_penalty_yds=0.0,
                thermal_fatigue_index=0.0,
                climate_regime="DOME_NEUTRAL"
            )

        # Open-air aerodynamics
        effective_wind = wind_mph * profile.wind_swirl_factor

        # 1. High-wind point reduction (-0.18 pts/mph above 14 mph)
        excess_wind = max(0.0, effective_wind - WIND_THRESHOLD_MPH)
        wind_pts_reduction = -WIND_TOTAL_DECAY_RATE * excess_wind

        # 2. Passing yardage shrinkage factor
        passing_shrinkage = max(0.70, 1.0 - (WIND_PASSING_YARDAGE_DECAY * excess_wind))

        # 3. Cold weather penalty (< 32F reduces scoring by 1.5 pts and stiffens ball)
        cold_pts = -1.5 if temp_f < 32.0 else (-0.75 if temp_f < 40.0 else 0.0)
        fg_penalty = 3.5 if temp_f < 32.0 else (1.5 if temp_f < 45.0 else 0.0)
        if effective_wind > 16.0:
            fg_penalty += (effective_wind - 16.0) * 0.4

        # 4. Precipitation impact
        precip_pts = -2.5 if precip_type == "snow" else (-1.5 if precip_type == "rain" else 0.0)

        # 5. Thermal heat/humidity fatigue (e.g. Tampa Bay early afternoon)
        heat_index = temp_f + 0.05 * humidity_pct if temp_f > 75.0 else temp_f
        thermal_fatigue = max(0.0, (heat_index - 82.0) / 10.0) if heat_index > 82.0 else 0.0
        # High heat increases fourth-quarter scoring slightly but depresses deep passing pace
        thermal_pts = -0.5 if thermal_fatigue > 1.0 else 0.0

        total_adj = wind_pts_reduction + cold_pts + precip_pts + thermal_pts

        # Determine qualitative regime
        if excess_wind > 0.0:
            regime = "HIGH_WIND_DECAY"
        elif thermal_fatigue > 0.8:
            regime = "THERMAL_FATIGUE"
        elif temp_f < 35.0:
            regime = "FREEZING_COLD"
        else:
            regime = "CALM_FAIR"

        return MicroclimateImpact(
            stadium=profile.name,
            roof_type=profile.roof_type,
            effective_wind_mph=round(effective_wind, 1),
            effective_temp_f=round(temp_f, 1),
            humidity_pct=round(humidity_pct, 1),
            total_adjustment_pts=round(total_adj, 2),
            passing_shrinkage_factor=round(passing_shrinkage, 3),
            fg_distance_penalty_yds=round(fg_penalty, 1),
            thermal_fatigue_index=round(thermal_fatigue, 2),
            climate_regime=regime
        )

    @classmethod
    def condition_game_total(cls, base_total: float, impact: MicroclimateImpact) -> float:
        """Applies microclimate adjustment to baseline market game total."""
        return max(24.0, round(base_total + impact.total_adjustment_pts, 1))

    @classmethod
    def condition_player_passing_yards(cls, base_yards: float, impact: MicroclimateImpact) -> float:
        """Applies environmental aerodynamic shrinkage to QB passing yardage projection."""
        return max(80.0, round(base_yards * impact.passing_shrinkage_factor, 1))
