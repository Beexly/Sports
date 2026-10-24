import json

with open(r"C:\Users\Garrett\Sports\.agents\teamwork\worker_m1\extracted_signals.json") as f:
    sigs = json.load(f)

print(f"Loaded {len(sigs)} signals")
for i, s in enumerate(sigs):
    print(f"{i+1:2d}. {s['id']:35s} | cat={s['category']:20s} | fam={s['family']:15s} | kind={s['output_kind']:24s} | wt={s['trust_weight']:.2f} | st={s['activation_status']}")
