import subprocess
import json

payload = {
    "state": (
        "NFL MNF: Saints RB Alvin Kamara receptions line is 2.5. "
        "Saints throw 44 passes/game with Tyler Shough under Kellen Moore. "
        "Lead RB Travis Etienne Jr is on IR. Starting TE Noah Fant is OUT. "
        "Kamara had 5 catches on 6 targets in Week 2. "
        "Kamara is the undisputed 3rd down and 2-minute drill passing down back."
    ),
    "questions": [
        {
            "id": "kamara_over_2_5_rec",
            "type": "noul",
            "instructions": "Alvin Kamara will record 3 or more receptions tonight."
        }
    ]
}

proc = subprocess.run(["jev", "ask"], input=json.dumps(payload), text=True, capture_output=True, shell=True)
print(proc.stdout)
