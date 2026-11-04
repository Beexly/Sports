"""Family Shield 30-Day Emergency Food Buffer Calculator.

Operationalizes:
- AM-08: 3-Tier 30-Day Food Stockpile for a Family of 4 priced against Texas H-E-B / Costco bulk SKUs.
- Calorie target: 2,000 kcal/person/day = 240,000 kcal total for 30 days.
- Protein target: 60g/person/day = 7,200g total for 30 days.
- Water target: 1 gallon/person/day = 120 gallons.
"""

from __future__ import annotations

import json
from typing import Any, Dict

TIERS = {
    "TIER_1_SURVIVAL": {
        "budget_target_usd": 300.0,
        "items": [
            {"item": "White Rice (50 lb bag, Costco)", "cost": 28.0, "kcal": 80000, "protein_g": 1600},
            {"item": "Pinto / Black Beans (25 lb bag, H-E-B)", "cost": 22.0, "kcal": 38000, "protein_g": 2400},
            {"item": "Rolled Oats (25 lb box, Costco)", "cost": 20.0, "kcal": 42000, "protein_g": 1500},
            {"item": "Peanut Butter (2x 48oz twin pack, Costco)", "cost": 24.0, "kcal": 32000, "protein_g": 1100},
            {"item": "Vegetable Oil (2x 3L, Costco)", "cost": 22.0, "kcal": 48000, "protein_g": 0},
            {"item": "Iodized Salt (4x 26oz, H-E-B)", "cost": 6.0, "kcal": 0, "protein_g": 0},
            {"item": "Multivitamins (Adult 300ct, Costco)", "cost": 18.0, "kcal": 0, "protein_g": 0},
            {"item": "Water Storage Drums / Cans (120 gal prep)", "cost": 150.0, "kcal": 0, "protein_g": 0},
        ]
    },
    "TIER_2_COMFORT": {
        "budget_target_usd": 600.0,
        "items": [
            {"item": "Tier 1 Base Pack", "cost": 290.0, "kcal": 240000, "protein_g": 6600},
            {"item": "Canned Tuna / Chicken (24x 5oz, Costco)", "cost": 36.0, "kcal": 7200, "protein_g": 1500},
            {"item": "Canned Diced Tomatoes / Sauce (24x 15oz, H-E-B)", "cost": 28.0, "kcal": 4800, "protein_g": 200},
            {"item": "Powdered Milk (Nido / Carnation 56oz, H-E-B)", "cost": 26.0, "kcal": 18000, "protein_g": 900},
            {"item": "Canned Green Beans / Corn (24pk, Costco)", "cost": 24.0, "kcal": 5000, "protein_g": 150},
            {"item": "Honey / Sugar (10 lb, Costco)", "cost": 22.0, "kcal": 16000, "protein_g": 0},
            {"item": "Coffee / Tea & Electrolytes Pack", "cost": 35.0, "kcal": 0, "protein_g": 0},
            {"item": "Spices & Seasonings Pack", "cost": 25.0, "kcal": 0, "protein_g": 0},
            {"item": "Propane Camping Stove + 4 Canisters", "cost": 85.0, "kcal": 0, "protein_g": 0},
        ]
    },
    "TIER_3_FORTRESS": {
        "budget_target_usd": 1000.0,
        "items": [
            {"item": "Tier 2 Comfort Pack", "cost": 551.0, "kcal": 291000, "protein_g": 9350},
            {"item": "Mountain House / ReadyWise Freeze-Dried Meals", "cost": 220.0, "kcal": 30000, "protein_g": 1200},
            {"item": "Gravity Water Filter (Berkey / Alexapure clone)", "cost": 140.0, "kcal": 0, "protein_g": 0},
            {"item": "First Aid Trauma Kit + Meds", "cost": 89.0, "kcal": 0, "protein_g": 0},
        ]
    }
}


def calculate_food_buffer_metrics(tier_name: str) -> Dict[str, Any]:
    """Calculate total cost, calories, and protein for a stockpile tier."""
    tier = TIERS.get(tier_name)
    if not tier:
        raise ValueError(f"Unknown tier: {tier_name}")
        
    total_cost = sum(item["cost"] for item in tier["items"])
    total_kcal = sum(item["kcal"] for item in tier["items"])
    total_protein = sum(item["protein_g"] for item in tier["items"])
    
    # 4 people x 30 days = 120 person-days
    daily_kcal_per_person = total_kcal / 120.0
    daily_protein_per_person = total_protein / 120.0
    
    return {
        "tier": tier_name,
        "total_cost_usd": round(total_cost, 2),
        "target_budget_usd": tier["budget_target_usd"],
        "total_calories": total_kcal,
        "daily_kcal_per_person": round(daily_kcal_per_person, 1),
        "total_protein_g": total_protein,
        "daily_protein_per_person_g": round(daily_protein_per_person, 1),
        "target_calories_met": total_kcal >= 240000,
        "target_protein_met": total_protein >= 7200,
        "item_count": len(tier["items"]),
    }


if __name__ == "__main__":
    for t in TIERS:
        m = calculate_food_buffer_metrics(t)
        print(f"=== {t} ===")
        print(f"  Cost: ${m['total_cost_usd']} (Budget: ${m['target_budget_usd']})")
        print(f"  Daily kcal/person: {m['daily_kcal_per_person']} (Met: {m['target_calories_met']})")
        print(f"  Daily protein/person: {m['daily_protein_per_person_g']}g (Met: {m['target_protein_met']})")
