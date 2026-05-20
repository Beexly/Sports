# push-now.ps1 — one-click launch push for PickPilot
#
# Right-click this file in File Explorer → "Run with PowerShell".
# Or from a PowerShell window: .\push-now.ps1
#
# It handles the stale .git lock, configures identity, stages all
# changes, commits, and pushes to the feature branch Vercel watches.
#
# If git push prompts for credentials, paste your GitHub Personal
# Access Token (https://github.com/settings/tokens — scope: repo)
# as the password. Username = your GitHub username.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== PickPilot launch-push ===" -ForegroundColor Cyan
Write-Host ""

# 1. Anchor to repo
Set-Location "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

# 2. Kill stale lock if present
if (Test-Path ".git\index.lock") {
    Write-Host "Removing stale .git\index.lock ..." -ForegroundColor Yellow
    Remove-Item ".git\index.lock" -Force
    Write-Host "  done" -ForegroundColor Green
}

# 3. Identity (idempotent)
git config user.email "pickpilotapp@gmail.com" | Out-Null
git config user.name  "Garrett Baxley"         | Out-Null
Write-Host "Identity: $(git config user.name) <$(git config user.email)>" -ForegroundColor DarkGray

# 4. Branch sanity
$branch = git branch --show-current
Write-Host "Current branch: $branch" -ForegroundColor DarkGray

# 5. Count changes
$staged   = (git status --short | Measure-Object).Count
Write-Host "Changes to commit: $staged" -ForegroundColor DarkGray

if ($staged -eq 0) {
    Write-Host ""
    Write-Host "Nothing to commit. Already up to date?" -ForegroundColor Yellow
    Write-Host "Running push anyway in case last push didn't reach origin..." -ForegroundColor DarkGray
} else {
    # 6. Stage everything (.gitignore protects secrets + VERCEL_ENV.txt + .launch-secrets/)
    Write-Host ""
    Write-Host "Staging..." -ForegroundColor Cyan
    git add -A

    # 7. Commit
    $msg = "Launch night: pickpilotapp.bet wiring, /about /press /observatory /vault, social row, SEO, OG image, logo assets, smoke test, automation + operator docs"
    Write-Host "Committing..." -ForegroundColor Cyan
    git commit -m $msg
}

# 8. Push
Write-Host ""
Write-Host "Pushing to origin/$branch ..." -ForegroundColor Cyan
git push origin $branch

# 9. Report
Write-Host ""
Write-Host "=== Push complete ===" -ForegroundColor Green
Write-Host "Latest commit on origin:" -ForegroundColor DarkGray
git log --oneline -1
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Vercel - Settings > Git > Production Branch = $branch (one-time)"
Write-Host "  2. Vercel - Settings > Environment Variables > Import VERCEL_ENV.txt"
Write-Host "  3. Vercel - Deployments > Redeploy (uncheck build cache)"
Write-Host "  4. When green: npm run smoke:prod"
Write-Host ""
Read-Host "Press Enter to close"
