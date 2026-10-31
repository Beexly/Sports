from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "higgsfield"
EXPECTED = {
    "hero-sideline",
    "field-chalk",
    "stats-desk",
    "empty-grandstand",
    "chain-marker-portrait",
    "football-seams-portrait",
    "contact-sheet-square",
    "paper-grain-square",
}

manifest_path = ASSETS / "manifest.json"
assert manifest_path.exists(), "Asset manifest is missing"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
reviewed = {item["name"] for item in manifest["assets"] if item.get("reviewed") is True}
missing = EXPECTED - reviewed
assert not missing, f"Assets not reviewed: {sorted(missing)}"
for name in EXPECTED:
    asset_path = ASSETS / f"{name}.webp"
    assert asset_path.exists(), f"Missing toned asset: {name}.webp"
    item = next(item for item in manifest["assets"] if item["name"] == name)
    expected_hash = item.get("sha256")
    assert expected_hash, f"Missing SHA-256 for {name}"
    actual_hash = hashlib.sha256(asset_path.read_bytes()).hexdigest()
    assert actual_hash == expected_hash, f"Asset content/provenance mismatch: {name}"
print(f"Validated {len(EXPECTED)} reviewed assets with SHA-256 provenance")
