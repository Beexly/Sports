# CC-1 Copy Instructions for Codex

**Purpose**: Copy CC-1 docs/intelligence/ files into the primary clone so
Codex can commit them in isolation and return the SHA to Claude Code.

**Source** (this folder):
```
C:\Users\Garrett\Downloads\cc1-for-primary-clone\
```

**Destination** (primary clone):
```
C:\Users\Garrett\Sports\
```

---

## Step 1 — Copy files into primary clone

Run in PowerShell (as one block):

```powershell
# Create destination directories if they don't exist
New-Item -ItemType Directory -Force -Path "C:\Users\Garrett\Sports\docs\intelligence"
New-Item -ItemType Directory -Force -Path "C:\Users\Garrett\Sports\reports\agent-handoffs"

# Copy the 6 CC-1 docs/intelligence files
Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\ai-search-geo-strategy.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\design-experience-system.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\developer-innovation-layer.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\monetization-lanes.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\docs\intelligence\product-ecosystem.md" `
          "C:\Users\Garrett\Sports\docs\intelligence\"

# Copy the handoff reference doc
Copy-Item "C:\Users\Garrett\Downloads\cc1-for-primary-clone\reports\agent-handoffs\CODEX_CC1_HANDOFF.md" `
          "C:\Users\Garrett\Sports\reports\agent-handoffs\"

Write-Host "Copy complete"
```

---

## Step 2 — Verify files are present and untracked

```powershell
cd "C:\Users\Garrett\Sports"
git ls-files --others --exclude-standard docs/intelligence/
# Expected: 6 lines, all docs/intelligence/*.md
```

---

## Step 3 — Isolated commit (explicit paths only — never git add .)

```powershell
cd "C:\Users\Garrett\Sports"

git add `
  "docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md" `
  "docs/intelligence/ai-search-geo-strategy.md" `
  "docs/intelligence/design-experience-system.md" `
  "docs/intelligence/developer-innovation-layer.md" `
  "docs/intelligence/monetization-lanes.md" `
  "docs/intelligence/product-ecosystem.md"

# Verify only these 6 files are staged — must show exactly 6 docs/intelligence lines
git diff --name-only --cached

# If anything other than the 6 docs/intelligence files appears — abort:
# git reset HEAD

git commit -m "docs(intelligence): CC-1 product ecosystem and intelligence network doctrine"
git rev-parse HEAD
```

---

## Step 4 — Post-commit check

```powershell
# Verify only docs files in the commit
git diff --name-only HEAD~1..HEAD

# Expected: exactly 6 lines, all docs/intelligence/
# Must NOT contain: .ts .tsx .json .prisma .yml .css .js
git diff --name-only HEAD~1..HEAD | Select-String "\.(ts|tsx|json|prisma|yml|css|js)$"
# Expected: no output
```

---

## Step 5 — Return SHA to Claude Code

Post `git rev-parse HEAD` output so Claude Code can:
- Mark CC-1 complete in relay file
- Fill SHA into `docs/audits/cc2-pre-edit-declaration.md`
- Begin CC-2 (`docs/brain/` — 11 files)

---

## Files in this staging folder (7 total — no extras)

```
docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md   9,731 bytes
docs/intelligence/ai-search-geo-strategy.md                       6,677 bytes
docs/intelligence/design-experience-system.md                     6,668 bytes
docs/intelligence/developer-innovation-layer.md                   8,198 bytes
docs/intelligence/monetization-lanes.md                           6,845 bytes
docs/intelligence/product-ecosystem.md                           13,651 bytes
reports/agent-handoffs/CODEX_CC1_HANDOFF.md                       7,999 bytes
```

**DO NOT copy any other files from this folder into the primary clone.**
**DO NOT run `git add .` — explicit paths only.**
