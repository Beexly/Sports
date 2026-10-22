import subprocess
import json

payload = {
    "state": (
        "NFL Week 4 MNF: Atlanta Falcons (1-2) at New Orleans Saints (1-2). "
        "Consensus Lines: Saints -1.5 (-108), Falcons +1.5 (-112), Total 47.5 (-110), Saints ML -120, Falcons ML +100. "
        "GSE Engine Action Score on Atlanta +1.5: 78.1/100, Decision: PLAY, Confidence: 80.2%, Probability Edge: +3.77%, No-Bet Strength: 1.92. "
        "Saints Inactives (Official): DE Carl Granderson OUT, LB Kaden Elliss (leading tackler) OUT, LB Anfernee Jennings OUT, TE Noah Fant (3 of Shough's 8 TDs) OUT. LB Pete Werner active. "
        "Falcons Inactives (Official): CB1 A.J. Terrell Jr. on IR. CJ Henderson starting. Divine Deablo and Samson Ebukam active. "
        "Schemes: Saints are pure pass-heavy under Tyler Shough (44 att/gm, 305.7 YPG, 8 TD, 3 INT); Chris Olave has 27 catches, 375 yds; Juwan Johnson has 15 catches, 3 TDs (2 last week); Alvin Kamara has only 12 receiving yards on the season; Etienne on IR. "
        "Falcons: Michael Penix Jr. returned W3 in 35-14 win; Bijan Robinson has 349 rush yds (194 yds on 29 carries in W3); Drake London had 9 catches for 194 yds in W3; Kyle Pitts has only 2 catches for 20 yds on 6 targets all season."
    ),
    "questions": [
        {
            "id": "falcons_spread_decision",
            "type": "choice",
            "instructions": "Determine the proper betting action on Atlanta Falcons +1.5 based on GSE engine score (78.1) and Saints front-7 inactives.",
            "criteria": {
                "play": "Execute bet on Atlanta +1.5 / ML +100 due to trench mismatch and positive edge",
                "pass": "Pass on Atlanta due to Superdome home field advantage"
            }
        },
        {
            "id": "olave_7plus_receptions",
            "type": "noul",
            "instructions": "Chris Olave will record 7 or more receptions tonight given 9.0 rec/gm average, Shough pass volume, and A.J. Terrell on IR."
        },
        {
            "id": "pitts_fade_certainty",
            "type": "noul",
            "instructions": "Kyle Pitts Over 28.5 receiving yards is a public trap that should be faded based on 2 catches in 3 games and heavy inline blocking usage."
        },
        {
            "id": "juwan_johnson_td_value",
            "type": "score",
            "instructions": "Evaluate the mathematical expected value of Juwan Johnson Anytime TD at +230 to +250 with Noah Fant officially inactive.",
            "criteria": [
                "Negative EV",
                "Neutral EV",
                "High Positive EV"
            ]
        },
        {
            "id": "gse_card_governance",
            "type": "score",
            "instructions": "Rate the governance and gate compliance of this betting card across all 10 GSE gates and 8 mathematical equations.",
            "criteria": [
                "Substandard",
                "Compliant",
                "Institutional Quant Grade"
            ]
        }
    ]
}

print("=== SENDING STATE AND QUESTIONS TO JEV ASK ===")
proc = subprocess.run(
    ["jev", "ask"],
    input=json.dumps(payload),
    text=True,
    capture_output=True,
    shell=True
)

if proc.returncode != 0:
    print(f"Jev error (exit {proc.returncode}): {proc.stderr}")
else:
    result = json.loads(proc.stdout)
    print(json.dumps(result, indent=2))
