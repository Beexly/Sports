# Family Shield Action Pack & Emergency Resilience Protocol

**Date:** 2026-11-04  
**Operationalized From:** Sweeps `2026-11-04-AM (1).md` (AM-08), `2026-10-30-MIDDAY-IG50.md` (MID-15), `2026-11-04-AM.md` (F7).  
**Target:** 4-person Texas household resilience (Austin/Central Texas H-E-B / Costco baseline).

---

## 1. 30-Day Food & Water Stockpile Matrix (AM-08)

Target: 4 people × 30 days = 120 person-days.
- **Calorie Floor:** 2,000 kcal / person / day (240,000 kcal total).
- **Protein Floor:** 60g / person / day (7,200g total).
- **Water Floor:** 1 gal / person / day (120 gallons).

| Tier | Cost (Texas H-E-B / Costco) | Daily kcal / person | Daily Protein / person | Key Components |
|---|---|---|---|---|
| **Tier 1 (Survival)** | **$290.00** (Budget $300) | 2,000 kcal | 55.0g | 50 lb Rice, 25 lb Beans, 25 lb Oats, Peanut Butter, Veg Oil, Salt, Multivitamins, 120 gal water storage |
| **Tier 2 (Comfort)** | **$571.00** (Budget $600) | 2,425 kcal | 77.9g | Tier 1 Base + Canned Tuna/Chicken (24 pk), Canned Tomatoes, Powdered Milk, Canned Veggies, Honey/Sugar, Coffee/Electrolytes, Propane Camping Stove |
| **Tier 3 (Fortress)** | **$1,000.00** (Budget $1,000) | 2,675 kcal | 87.9g | Tier 2 + Mountain House Freeze-Dried Meals, Gravity Water Filter (Berkey/Alexapure clone), Trauma First Aid Kit |

*Calculator tool:* `python scripts/ops/family_shield_food_buffer_calculator.py`

---

## 2. Family Anti-Voice-Clone & Kidnap Scam Protocol (MID-15)

In an era of sub-second zero-shot voice cloning (XTTS / ElevenLabs / VoiceCraft):

1. **The Shared Challenge-Word:**
   - Establish a memorable, unguessable two-word family passphrase (e.g., childhood street + obscure color).
   - Rule: Any caller claiming an emergency, hospital stay, arrest, or urgent wire request MUST state the challenge-word upon request.
   - If the caller cannot produce the exact passphrase: **Immediate Hang-Up**.
2. **Out-of-Band Callback Verification:**
   - Never use the number provided by an incoming panic call.
   - Hang up and call the family member's known direct mobile, spouse, or workplace directly.
3. **Financial Gate:**
   - Zero emergency money transfers via crypto, gift cards, or wire without two-party physical or video verification.

---

## 3. Local Offline Home Node & Communication Backbone (F7)

- **Dedicated Closet PC / Mini-PC:** Low-power x86 or ARM node running Proxmox / Ubuntu LTS.
- **Offline Knowledge & Medical Spine:** Local Kiwix mirror of Wikipedia, OpenStreetMap, and emergency medical guides.
- **Local Mesh Comms:** GMRS / FRS two-way handheld radios with fresh NiMH batteries and solar recharge capability.
