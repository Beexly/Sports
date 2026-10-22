import re
import json
from pathlib import Path

def extract_signals():
    p1 = Path(r"C:\Users\Garrett\Sports\packages\ingestion-pipeline\src\signal-registry-definitions.ts")
    p2 = Path(r"C:\Users\Garrett\Sports\packages\ingestion-pipeline\src\signal-registry-extensions.ts")
    
    t1 = p1.read_text(encoding="utf-8")
    t2 = p2.read_text(encoding="utf-8")
    
    # Replace SKELLAM_COVER_SOURCE with "skellam_cover"
    t1 = t1.replace("id: SKELLAM_COVER_SOURCE", 'id: "skellam_cover"')
    
    # Find all signal definition blocks
    # In definitions.ts:
    # export const ...Signal: SignalDefinition = { ... };
    # BLOCKED_SIGNALS: readonly SignalDefinition[] = [ ... ];
    # In extensions.ts:
    # export const ...Signal: SignalDefinition = { ... };
    
    def parse_blocks(text):
        signals = []
        # Match objects with id: "..."
        # Pattern to capture each object literal containing id: "..."
        pattern = re.compile(r'{\s*id:\s*"([^"]+)",(.*?)(?=^\s*\{|^\s*export const|^\s*\];|\Z)', re.MULTILINE | re.DOTALL)
        for m in pattern.finditer(text):
            sig_id = m.group(1)
            body = m.group(2)
            
            label_m = re.search(r'label:\s*"([^"]+)"', body)
            cat_m = re.search(r'category:\s*"([^"]+)"', body)
            fam_m = re.search(r'family:\s*"([^"]+)"', body)
            kind_m = re.search(r'outputKind:\s*"([^"]+)"', body)
            sports_m = re.search(r'validSports:\s*\[(.*?)\]', body, re.DOTALL)
            owner_m = re.search(r'owner:\s*"([^"]+)"', body)
            deps_m = re.search(r'dataDependencies:\s*\[(.*?)\]', body, re.DOTALL)
            status_m = re.search(r'activationStatus:\s*"([^"]+)"', body)
            weight_m = re.search(r'trustWeight:\s*([0-9.]+)', body)
            task_m = re.search(r'acquisitionTask:\s*(null|"([^"]+)")', body)
            reason_m = re.search(r'blockedReason:\s*(null|"([^"]+)")', body)
            
            valid_sports = []
            if sports_m:
                valid_sports = re.findall(r'"([^"]+)"', sports_m.group(1))
                
            deps = []
            if deps_m:
                deps = re.findall(r'"([^"]+)"', deps_m.group(1))
                
            sig = {
                "id": sig_id,
                "label": label_m.group(1) if label_m else "",
                "category": cat_m.group(1) if cat_m else "",
                "family": fam_m.group(1) if fam_m else "",
                "output_kind": kind_m.group(1) if kind_m else "",
                "valid_sports": valid_sports,
                "owner": owner_m.group(1) if owner_m else "",
                "data_dependencies": deps,
                "activation_status": status_m.group(1) if status_m else "",
                "trust_weight": float(weight_m.group(1)) if weight_m else 0.0,
                "acquisition_task": task_m.group(2) if task_m and task_m.group(2) else None,
                "blocked_reason": reason_m.group(2) if reason_m and reason_m.group(2) else None,
            }
            signals.append(sig)
        return signals

    sigs1 = parse_blocks(t1)
    sigs2 = parse_blocks(t2)
    
    print(f"File 1 signals: {len(sigs1)}")
    for s in sigs1:
        print(f"  {s['id']}: status={s['activation_status']}, weight={s['trust_weight']}, fam={s['family']}, cat={s['category']}")
        
    print(f"File 2 signals: {len(sigs2)}")
    for s in sigs2:
        print(f"  {s['id']}: status={s['activation_status']}, weight={s['trust_weight']}, fam={s['family']}, cat={s['category']}")
        
    all_sigs = sigs1 + sigs2
    print(f"Total signals found: {len(all_sigs)}")
    
    with open(r"C:\Users\Garrett\Sports\.agents\teamwork\worker_m1\extracted_signals.json", "w") as fp:
        json.dump(all_sigs, fp, indent=2)

if __name__ == "__main__":
    extract_signals()
