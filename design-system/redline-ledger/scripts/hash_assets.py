from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "higgsfield"
MANIFEST = ASSETS / "manifest.json"
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
for item in manifest["assets"]:
    asset_path = ASSETS / f"{item['name']}.webp"
    item["sha256"] = hashlib.sha256(asset_path.read_bytes()).hexdigest()
MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("Updated asset SHA-256 provenance")
