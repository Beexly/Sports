from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]
TARGET = Path(r"C:\Users\Garrett\gse-hero-r3f\design-system\redline-ledger")
REQUIRED = [
    "README.md",
    "DESIGN.md",
    "VISUAL_PHILOSOPHY.md",
    "tokens.css",
    "docs/gse-redline-design.md",
    "docs/superpowers/plans/2026-10-30-gse-redline.md",
    "reviews/browser-audit.json",
    "reviews/social-contact-sheet.png",
    "reviews/AUDIT.md",
    "reviews/VERIFICATION.md",
    "reviews/FINAL_REVIEW.md",
    "scripts/audit.mjs",
    "scripts/visual-audit.mjs",
    "scripts/validate_assets.py",
    "scripts/validate_exports.py",
    "site/package.json",
    "site/src/App.tsx",
    "site/src/social.tsx",
    "assets/higgsfield/manifest.json",
    "assets/social/gse-redline-story.mp4",
]
for relative in REQUIRED:
    assert (TARGET / relative).exists(), f"Package is not self-contained: missing {relative}"
for relative in ["README.md", "scripts/generate_assets.ps1", "scripts/generate_rescues.ps1"]:
    text = (TARGET / relative).read_text(encoding="utf-8")
    assert "GSE-Overnight" not in text, f"Standalone path leaked into package: {relative}"
assert not list((TARGET / "assets" / "higgsfield").glob("*.png")), "Rejected original PNG found in package"
print(f"Validated self-contained package at {TARGET}")
